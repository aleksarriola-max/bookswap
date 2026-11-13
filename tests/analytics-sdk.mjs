import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import puppeteer from 'puppeteer';
import { BASE_PROPERTIES, EVENT_SCHEMAS } from '../src/lib/analyticsPolicy.js';

// Bundles the real analytics wrapper + posthog-js, runs it in headless Chrome, and inspects
// what actually leaves the browser. All network traffic is intercepted; nothing reaches PostHog.
const root = fileURLToPath(new URL('..', import.meta.url));
const INGEST = 'https://us.i.posthog.com';
const envDir = await mkdtemp(join(tmpdir(), 'bookswap-analytics-env-')); // never read the developer's .env.local
Object.assign(process.env, {
  VITE_POSTHOG_KEY: 'phc_test_token', VITE_POSTHOG_HOST: INGEST, VITE_POSTHOG_TEST_MODE: 'true',
  VITE_SUPABASE_URL: 'https://stub.supabase.test', VITE_SUPABASE_PUBLISHABLE_KEY: 'stub-key',
});
const harness = `
  import posthog from 'posthog-js';
  import { trackPageview, track } from '${root}src/lib/analytics.js';
  import { recordListingSelected, recordComparison } from '${root}src/lib/trackedActions.js';
  trackPageview(location.pathname);
  recordListingSelected({ id: 'book-1', title: 'Secret Title', ownerId: 'account-xyz', exchangeMode: 'exchange' }, { groupId: 'group-1' });
  recordListingSelected({ id: 'demo-1', isDemo: true, exchangeMode: 'sale' }, {});
  track('request_submitted', { listing_type: 'sale', bookTitle: 'Leaky Title', requesterOffer: 'free text offer', ownerId: 'account-xyz' });
  recordComparison('listing', 'less_effort');
  setTimeout(() => {
    document.body.innerHTML = '<button id="b">Click me</button><input id="i" value="typed secret">';
    document.getElementById('b').click(); document.getElementById('b').click(); document.getElementById('b').click();
    posthog.capture('listing_selected', { listing_type: 'sale', discovery_source: 'browse', note: 'Leaky note', $current_url: location.href });
    posthog.capture('$exception', { $exception_message: 'boom' });
    posthog.capture('custom_event', { anything: 1 });
    setTimeout(() => { throw new Error('uncaught boom'); });
    window.__done = true;
  }, 1500);
`;
const harnessDir = join(root, 'node_modules', '.cache', 'bookswap-analytics-test');
await mkdir(harnessDir, { recursive: true });
const entry = join(harnessDir, 'harness.js');
await writeFile(entry, harness);
const output = await build({
  root, envDir, configFile: false, logLevel: 'silent', mode: 'production',
  define: { 'process.env.NODE_ENV': '"production"' },
  build: { write: false, minify: false, lib: { entry, formats: ['iife'], name: 'Harness' } },
});
await rm(envDir, { recursive: true, force: true });
await rm(harnessDir, { recursive: true, force: true });
const script = output[0].output[0].code;
if (process.env.DEBUG_ANALYTICS) console.log('token in bundle:', script.includes('phc_test_token'), 'supabase stub:', script.includes('stub.supabase.test'));

const browser = await puppeteer.launch({ headless: true });
const requests = [];
const networkHits = [];
try {
  const page = await browser.newPage();
  if (process.env.DEBUG_ANALYTICS) { page.on('console', m => console.log('[console]', m.text())); page.on('request', r => console.log('[req]', r.url().slice(0, 100))); }
  page.on('pageerror', error => { if (!String(error.message).includes('uncaught boom')) console.error('[page error]', error.message); });
  // posthog-js drops events from bot user agents such as HeadlessChrome; present a normal desktop UA.
  await page.setUserAgent((await browser.userAgent()).replace('HeadlessChrome', 'Chrome'));
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    // Record the exact bytes posthog-js hands to the network (possibly gzipped) for inspection.
    window.__bodies = [];
    const originalFetch = window.fetch;
    window.fetch = async (input, init = {}) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('posthog')) {
        const bytes = init.body == null ? new Uint8Array() : new Uint8Array(await new Response(init.body).arrayBuffer());
        let binary = ''; bytes.forEach(byte => { binary += String.fromCharCode(byte); });
        window.__bodies.push({ url, body: btoa(binary) });
      }
      return originalFetch(input, init);
    };
  });
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = request.url();
    if (url === 'https://bookswap.test/harness.js') return request.respond({ contentType: 'text/javascript', body: script });
    if (url.startsWith('https://bookswap.test/')) return request.respond({ contentType: 'text/html', body: '<!doctype html><title>Handoff</title><script src="/harness.js"></script>' });
    if (url.startsWith(INGEST) || url.includes('posthog')) {
      const cors = { 'Access-Control-Allow-Origin': 'https://bookswap.test', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS' };
      if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers: cors });
      networkHits.push(url);
      return request.respond({ status: 200, headers: cors, contentType: 'application/json', body: '{"status":1}' });
    }
    return request.abort();
  });
  await page.goto('https://bookswap.test/handoff/req-123?code=SECRETCODE&utm_source=newsletter', { referer: 'https://referrer.example/page?x=1' });
  await page.waitForFunction('window.__done === true', { timeout: 10000 });
  await new Promise(resolve => setTimeout(resolve, 6000)); // posthog-js flushes its batch queue every few seconds
  for (const { url, body } of await page.evaluate(() => window.__bodies)) requests.push({ url, raw: Buffer.from(body, 'base64') });
} finally { await browser.close(); }

assert.ok(requests.length > 0, 'expected at least one PostHog request');
assert.equal(networkHits.length, requests.length, 'every PostHog network request was inspected (no beacon/XHR bypass)');
const events = requests.flatMap(({ url, raw }) => {
  assert.ok(!/\/(flags|decide|s)\/?(\?|$)/.test(new URL(url).pathname + '?'), `unexpected PostHog endpoint ${url}`);
  for (const secret of ['SECRETCODE', 'referrer.example', 'bookswap.test', 'req-123', 'newsletter']) assert.ok(!url.includes(secret), `request URL leaked ${secret}`);
  // posthog-js gzips batches when the browser supports it; decode either form.
  const text = raw[0] === 0x1f && raw[1] === 0x8b ? gunzipSync(raw).toString('utf8') : raw.toString('utf8');
  const parsed = JSON.parse(text.startsWith('data=') ? Buffer.from(decodeURIComponent(text.slice(5)), 'base64').toString('utf8') : text);
  return Array.isArray(parsed) ? parsed : parsed.batch || [parsed];
});
console.log(`Captured ${events.length} outgoing events: ${events.map(e => e.event).join(', ')}`);
const allowedBase = new Set([...BASE_PROPERTIES, 'test_mode', '$geoip_disable']);
for (const event of events) {
  assert.ok(EVENT_SCHEMAS[event.event], `unexpected event ${event.event}`);
  assert.deepEqual(Object.keys(event).filter(key => !['uuid', 'event', 'properties', 'timestamp'].includes(key)), [], `extra top-level keys on ${event.event}`);
  const allowed = new Set([...allowedBase, ...Object.keys(EVENT_SCHEMAS[event.event]), ...(event.event === '$pageview' ? ['$current_url', '$pathname'] : [])]);
  const extra = Object.keys(event.properties).filter(key => !allowed.has(key));
  assert.deepEqual(extra, [], `${event.event} carried non-allowlisted properties`);
  assert.equal(event.properties.test_mode, true);
  assert.equal(event.properties.$process_person_profile, false);
}
const serialized = JSON.stringify(events);
for (const secret of ['SECRETCODE', 'referrer.example', 'bookswap.test', 'req-123', 'newsletter', 'Secret Title', 'Leaky', 'free text', 'account-xyz', 'typed secret', 'Click me', 'boom', 'book-1', 'group-1']) {
  assert.ok(!serialized.includes(secret), `payload leaked "${secret}"`);
}
const byName = name => events.filter(event => event.event === name);
assert.equal(byName('$pageview').length, 1);
assert.equal(byName('$pageview')[0].properties.$current_url, '/handoff/:id');
assert.deepEqual(byName('listing_selected').map(e => e.properties.discovery_source).sort(), ['browse', 'group']);
assert.equal(byName('request_submitted').length, 1);
assert.equal(byName('comparison_submitted').length, 1);
const ids = new Set(events.map(e => e.properties.distinct_id));
assert.equal(ids.size, 1); assert.match([...ids][0], /^[0-9a-f-]{36}$/i, 'distinct_id is a random UUID');
if (process.env.SHOW_PAYLOAD) console.log(JSON.stringify(events, null, 2));
console.log('PASS: real posthog-js payload contains only allowlisted events and properties; no URLs, referrers, query strings, codes, IDs, or free text.');

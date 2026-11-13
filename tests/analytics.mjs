import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Policy: allowlist, route templates, config gating, and the one-time ledger.
const policy = await import('../src/lib/analyticsPolicy.js');
const { sanitizeCapture, buildEventProperties, routeTemplate, readAnalyticsConfig, createOnceLedger, createPosthogOptions } = policy;

assert.equal(readAnalyticsConfig({}), null);
assert.equal(readAnalyticsConfig({ VITE_POSTHOG_KEY: 'phc_x' }), null);
assert.equal(readAnalyticsConfig({ VITE_POSTHOG_HOST: 'https://us.i.posthog.com' }), null);
assert.deepEqual(readAnalyticsConfig({ VITE_POSTHOG_KEY: ' phc_x ', VITE_POSTHOG_HOST: 'https://eu.i.posthog.com/', VITE_POSTHOG_TEST_MODE: 'TRUE' }), { key: 'phc_x', host: 'https://eu.i.posthog.com', testMode: true });

const options = createPosthogOptions({ host: 'https://us.i.posthog.com', testMode: false });
for (const [name, value] of Object.entries({ autocapture: false, capture_pageview: false, capture_pageleave: false, disable_session_recording: true, capture_exceptions: false, capture_performance: false })) assert.equal(options[name], value, name);

assert.equal(routeTemplate('/handoff/abc-123?code=secret'), '/handoff/:id');
assert.equal(routeTemplate('/book/xyz/'), '/book/:id');
assert.equal(routeTemplate('/study-feedback'), '/study-feedback');
assert.equal(routeTemplate('/'), '/');
assert.equal(routeTemplate('/unknown/route'), null);

const sdkCapture = {
  uuid: 'u1', event: 'request_submitted', timestamp: new Date(),
  properties: {
    token: 'phc_x', distinct_id: '0192-random', $session_id: 's1', $lib: 'web', $lib_version: '1', $process_person_profile: false,
    listing_type: 'sale', bookTitle: 'Dune', requesterOffer: 'free text', ownerId: 'acct-1',
    $current_url: 'https://app.example/handoff/1?code=SECRET', $pathname: '/handoff/1', $referrer: 'https://ref.example', $referring_domain: 'ref.example',
    $host: 'app.example', $browser: 'Chrome', $os: 'Mac OS X', $screen_height: 900, $device_id: 'd1', $window_id: 'w1',
  },
  $set: { email: 'x@example.com' }, $set_once: { $initial_referrer: 'https://ref.example', $initial_current_url: 'https://app.example/?q=1' },
};
const cleaned = sanitizeCapture(sdkCapture, { testMode: true });
assert.deepEqual(Object.keys(cleaned).sort(), ['event', 'properties', 'timestamp', 'uuid']);
assert.deepEqual(cleaned.properties, { token: 'phc_x', distinct_id: '0192-random', $session_id: 's1', $lib: 'web', $lib_version: '1', $process_person_profile: false, listing_type: 'sale', test_mode: true, $geoip_disable: true });

const pageview = sanitizeCapture({ uuid: 'u2', event: '$pageview', properties: { token: 't', distinct_id: 'd', route: '/handoff/:id', $current_url: 'https://app.example/handoff/1?code=SECRET', title: 'Ctrl+Us' } });
assert.deepEqual(pageview.properties, { token: 't', distinct_id: 'd', route: '/handoff/:id', test_mode: false, $geoip_disable: true, $current_url: '/handoff/:id', $pathname: '/handoff/:id' });

for (const event of ['$autocapture', '$exception', '$pageleave', '$snapshot', '$web_vitals', '$identify', '$set', 'made_up']) assert.equal(sanitizeCapture({ event, properties: { token: 't' } }), null, event);
assert.equal(sanitizeCapture({ event: '$pageview', properties: { route: '/handoff/1' } }), null, 'raw paths are not route templates');
assert.equal(buildEventProperties('listing_published', { listing_type: 'sale', condition: 'Like new', book_count: 1 }), null);
assert.equal(buildEventProperties('listing_selected', { listing_type: 'gift', discovery_source: 'browse' }), null);
assert.equal(buildEventProperties('comparison_submitted', { task: 'listing', comparison: 'way less' }), null);
assert.deepEqual(buildEventProperties('availability_offered', { listing_type: 'exchange', slot_count: 3, slots: ['sat'] }), { listing_type: 'exchange', slot_count: 3 });

const memory = new Map();
const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
const ledger = createOnceLedger(storage);
assert.equal(ledger.claim('a'), true); assert.equal(ledger.claim('a'), false);
assert.equal(createOnceLedger(storage).claim('a'), false, 'ledger survives reloads');
assert.equal(createOnceLedger({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }).claim('x'), true);

// Tracked actions: real module, with the store and PostHog wrapper stubbed.
const sent = [];
const claimed = new Set();
const state = { books: [], requests: [], fail: new Set() };
const maybeFail = name => { if (state.fail.has(name)) throw new Error(`${name} failed`); };
globalThis.__stubs = {
  getBooks: () => state.books, getRequests: () => state.requests,
  addBook: async args => { maybeFail('addBook'); const book = { id: `b${state.books.length + 1}`, ...args }; state.books.push(book); return book; },
  createRequest: async args => { maybeFail('createRequest'); const existing = state.requests.find(r => r.bookId === args.bookId && r.requesterId === args.requesterId); if (existing) return existing; const request = { id: `r${state.requests.length + 1}`, status: 'pending', exchangeMode: state.books.find(b => b.id === args.bookId)?.exchangeMode, ...args }; state.requests.push(request); return request; },
  updateRequestStatus: async () => maybeFail('updateRequestStatus'),
  setRequestAvailability: async () => maybeFail('setRequestAvailability'),
  confirmSlot: async () => maybeFail('confirmSlot'),
  communityAction: async () => { maybeFail('completeHandoff'); return true; },
  track: (event, props) => { const properties = buildEventProperties(event, props); if (!properties) return false; sent.push({ event, properties }); return true; },
  trackOnce: (key, event, props) => { if (claimed.has(key) || !buildEventProperties(event, props)) return false; claimed.add(key); return globalThis.__stubs.track(event, props); },
};
const source = (await readFile(new URL('../src/lib/trackedActions.js', import.meta.url), 'utf8'))
  .replace(/^import \{([^}]+)\} from '\.\.\/store';/m, 'const {$1} = globalThis.__stubs;')
  .replace(/^import \{([^}]+)\} from '\.\/analytics';/m, 'const {$1} = globalThis.__stubs;');
const actions = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const events = () => sent.map(item => item.event);

// Failed saves emit nothing; the retry that succeeds emits exactly once.
const listing = { title: 'T', author: 'A', condition: 'Like new', exchangeMode: 'sale', askPrice: 5, bundleItems: ['One', 'Two'] };
state.fail.add('addBook');
await assert.rejects(() => actions.publishListing(listing));
assert.deepEqual(sent, []);
state.fail.delete('addBook');
const book = await actions.publishListing(listing);
assert.deepEqual(sent, [{ event: 'listing_published', properties: { listing_type: 'sale', condition: 'like_new', book_count: 2 } }]);
const demo = { id: 'demo', isDemo: true, exchangeMode: 'exchange' }; state.books.push(demo);

sent.length = 0;
state.fail.add('createRequest');
await assert.rejects(() => actions.submitRequest({ bookId: book.id, requesterId: 'reader' }));
state.fail.delete('createRequest');
const request = await actions.submitRequest({ bookId: book.id, requesterId: 'reader' });
await actions.submitRequest({ bookId: book.id, requesterId: 'reader' }); // server returns the existing request
assert.deepEqual(sent, [{ event: 'request_submitted', properties: { listing_type: 'sale' } }]);

for (const [name, run, event] of [
  ['updateRequestStatus', () => actions.acceptRequest(request), 'request_accepted'],
  ['setRequestAvailability', () => actions.offerAvailability({ ...request, status: 'accepted' }, ['sat', 'sun']), 'availability_offered'],
  ['confirmSlot', () => actions.confirmMeetup(request, 'sat', 'Library'), 'meetup_confirmed'],
  ['completeHandoff', () => actions.completeHandoff(request, { code: 'c' }), 'handoff_completed'],
]) {
  sent.length = 0;
  state.fail.add(name);
  await assert.rejects(run, undefined, `${name} should fail`);
  assert.deepEqual(sent, [], `failed ${name} emits nothing`);
  state.fail.delete(name);
  await run(); await run(); // success, then a retry (e.g. the follow-up chat message failed)
  assert.deepEqual(events(), [event], `${event} counted once`);
}
sent.length = 0;
await actions.offerAvailability({ ...request, id: 'r-other' }, ['sat', 'sun', 'mon_am']);
assert.deepEqual(sent[0].properties, { listing_type: 'sale', slot_count: 3 });

sent.length = 0;
assert.equal(actions.recordListingSelected(demo, {}), false);
actions.recordListingSelected(book, {}); actions.recordListingSelected(book, { groupId: 'g1' });
assert.deepEqual(sent.map(item => item.properties), [{ listing_type: 'sale', discovery_source: 'browse' }, { listing_type: 'sale', discovery_source: 'group' }]);
sent.length = 0;
actions.recordComparison('listing', 'less_effort'); actions.recordComparison('listing', 'less_effort'); actions.recordComparison('discovery', 'more_effort');
assert.deepEqual(sent.map(item => item.properties), [{ task: 'listing', comparison: 'less_effort' }, { task: 'discovery', comparison: 'more_effort' }]);

console.log('PASS: analytics allowlist, route templates, config gating, success-only capture, retry de-duplication, demo exclusion.');

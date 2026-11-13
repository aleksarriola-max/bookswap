// Analytics privacy policy. Pure functions only (no imports) so tests can load it in Node.
//
// Every outgoing PostHog event passes through sanitizeCapture() (wired as posthog-js
// `before_send`). It rebuilds the payload from an allowlist, so anything the SDK adds on
// its own (URLs, referrers, browser/device details, $set_once person data) is dropped.

const LISTING_TYPES = ['sale', 'exchange'];

// Allowed custom properties per event, with validators. Unknown events are never sent.
export const EVENT_SCHEMAS = {
  listing_published: {
    listing_type: LISTING_TYPES,
    condition: ['like_new', 'good', 'worn'],
    book_count: value => Number.isInteger(value) && value >= 1 && value <= 10,
  },
  listing_selected: { listing_type: LISTING_TYPES, discovery_source: ['browse', 'group'] },
  request_submitted: { listing_type: LISTING_TYPES },
  request_accepted: { listing_type: LISTING_TYPES },
  availability_offered: {
    listing_type: LISTING_TYPES,
    slot_count: value => Number.isInteger(value) && value >= 1 && value <= 12,
  },
  meetup_confirmed: { listing_type: LISTING_TYPES },
  handoff_completed: { listing_type: LISTING_TYPES },
  comparison_submitted: {
    task: ['listing', 'discovery'],
    comparison: ['less_effort', 'same_effort', 'more_effort'],
  },
  $pageview: { route: value => ROUTE_TEMPLATES.includes(value) },
};

// SDK properties that may leave the browser. distinct_id is the SDK's random anonymous
// browser ID (we never call identify), and $process_person_profile=false keeps PostHog from
// creating person profiles.
export const BASE_PROPERTIES = ['token', 'distinct_id', '$session_id', '$lib', '$lib_version', '$process_person_profile'];

export const ROUTE_TEMPLATES = [
  '/', '/book/:id', '/post', '/messages', '/messages/:id', '/my-books', '/reading',
  '/wishlist', '/community', '/handoff/:id', '/study-feedback',
];

const isAllowed = (rule, value) => typeof rule === 'function' ? rule(value) : rule.includes(value);

// Returns only the allowed, valid properties for an event, or null if the event is unknown
// or any required property is missing/invalid (so a bad call is dropped, not half-sent).
export function buildEventProperties(event, props = {}) {
  const schema = EVENT_SCHEMAS[event];
  if (!schema) return null;
  const result = {};
  for (const [name, rule] of Object.entries(schema)) {
    if (!isAllowed(rule, props[name])) return null;
    result[name] = props[name];
  }
  return result;
}

export function routeTemplate(pathname = '') {
  const path = String(pathname).split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  for (const template of ROUTE_TEMPLATES) {
    const a = template.split('/'), b = path.split('/');
    if (a.length === b.length && a.every((part, i) => part.startsWith(':') ? Boolean(b[i]) : part === b[i])) return template;
  }
  return null;
}

export function sanitizeCapture(capture, { testMode = false } = {}) {
  if (!capture || !EVENT_SCHEMAS[capture.event]) return null;
  const source = capture.properties || {};
  const custom = buildEventProperties(capture.event, source);
  if (!custom) return null;
  const properties = {};
  for (const name of BASE_PROPERTIES) if (source[name] !== undefined) properties[name] = source[name];
  Object.assign(properties, custom, { test_mode: Boolean(testMode), $geoip_disable: true });
  if (capture.event === '$pageview') { properties.$current_url = custom.route; properties.$pathname = custom.route; }
  // No $set / $set_once / $unset: nothing about the person is sent.
  return { uuid: capture.uuid, event: capture.event, properties, timestamp: capture.timestamp };
}

// Analytics is off unless both the token and ingest host are present.
export function readAnalyticsConfig(env = {}) {
  const key = String(env.VITE_POSTHOG_KEY || '').trim();
  const host = String(env.VITE_POSTHOG_HOST || '').trim().replace(/\/+$/, '');
  if (!key || !host) return null;
  return { key, host, testMode: String(env.VITE_POSTHOG_TEST_MODE || '').trim().toLowerCase() === 'true' };
}

export function createPosthogOptions(config) {
  return {
    api_host: config.host,
    persistence: 'localStorage',
    person_profiles: 'identified_only',
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    rageclick: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    enable_heatmaps: false,
    capture_exceptions: false,
    capture_performance: false,
    disable_session_recording: true,
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    disable_web_experiments: true,
    disable_external_dependency_loading: true,
    advanced_disable_flags: true,
    advanced_disable_feature_flags: true,
    advanced_disable_toolbar_metrics: true,
    save_referrer: false,
    save_campaign_params: false,
    mask_personal_data_properties: true,
    before_send: capture => sanitizeCapture(capture, { testMode: config.testMode }),
  };
}

// Remembers which one-time events were already sent from this browser, so retries,
// re-renders, and repeated server responses never double-count. Keys stay local.
export function createOnceLedger(storage, storageKey = 'bookswap_analytics_once', limit = 500) {
  let memory = [];
  const load = () => { try { const saved = JSON.parse(storage?.getItem(storageKey) || '[]'); return Array.isArray(saved) ? saved : memory; } catch { return memory; } };
  return {
    has: key => load().includes(key),
    claim(key) {
      const keys = load();
      if (keys.includes(key)) return false;
      memory = [...keys, key].slice(-limit);
      try { storage?.setItem(storageKey, JSON.stringify(memory)); } catch { /* memory fallback */ }
      return true;
    },
  };
}

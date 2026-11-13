import { cloudEnabled, isGuestMode } from './cloud';
import { buildEventProperties, createOnceLedger, createPosthogOptions, readAnalyticsConfig, routeTemplate } from './analyticsPolicy';

const config = readAnalyticsConfig(import.meta.env);
const ledger = createOnceLedger(typeof localStorage === 'undefined' ? null : localStorage);
let client = null;

export const analyticsConfigured = Boolean(config);

// Only signed-in accounts on the shared (Supabase) backend are tracked. Guest/local demo
// sessions never load PostHog at all.
export const isAnalyticsActive = () => Boolean(config) && cloudEnabled && !isGuestMode();

const loadClient = () => client ??= import('posthog-js').then(({ default: posthog }) => {
  posthog.init(config.key, createPosthogOptions(config));
  return posthog;
});

export function track(event, props) {
  if (!isAnalyticsActive()) return false;
  const properties = buildEventProperties(event, props);
  if (!properties) {
    if (import.meta.env.DEV) console.warn(`[analytics] dropped ${event}: properties failed the allowlist`);
    return false;
  }
  loadClient().then(posthog => posthog.capture(event, properties)).catch(() => {});
  return true;
}

// For outcomes of writes: the key (e.g. `request_accepted:<requestId>`) is recorded in this
// browser before sending, so a retried save or a re-render cannot count the action twice.
export function trackOnce(key, event, props) {
  if (!isAnalyticsActive() || !buildEventProperties(event, props)) return false;
  if (!ledger.claim(key)) return false;
  return track(event, props);
}

export const hasTracked = key => ledger.has(key);

export function trackPageview(pathname) {
  const route = routeTemplate(pathname);
  return route ? track('$pageview', { route }) : false;
}

import pricingPilot from '../../docs/pricing-pilot-results.json' with { type: 'json' };

const FORMAT_LABELS = { hardcover: 'Hardcover', softcover: 'Paperback' };

export function conditionFromChecks(checks = {}) {
  const serious = ['missingPages', 'waterDamage', 'looseBinding', 'odor'];
  if (serious.some(key => checks[key])) return 'Worn';
  const visibleWear = ['writing', 'coverWear', 'spineWear'];
  if (visibleWear.some(key => checks[key])) return 'Good';
  return 'Like new';
}

export function getPriceGuide({ isbn, format, condition }) {
  if (!isbn || !format || !condition) return { status: 'missing-details' };
  const edition = pricingPilot.editions.find(item => item.isbn === isbn);
  if (!edition || edition.condition !== condition || edition.format !== format) return { status: 'insufficient' };
  const sample = edition.itemSummary;
  if (sample.status !== 'research-sample' || sample.sellerCount < 5) return { status: 'insufficient', edition };
  return {
    status: 'sample',
    low: sample.q25,
    high: sample.q75,
    median: sample.median,
    sellerCount: sample.sellerCount,
    retrievedAt: pricingPilot.retrievedAt,
    sourceUrl: edition.sourceUrl,
    formatLabel: FORMAT_LABELS[edition.format] || edition.format,
  };
}

import assert from 'node:assert/strict';
import { conditionFromChecks, getPriceGuide } from '../src/lib/bookGuidance.js';

assert.equal(conditionFromChecks({}), 'Like new');
assert.equal(conditionFromChecks({ writing: true }), 'Good');
assert.equal(conditionFromChecks({ coverWear: true, waterDamage: true }), 'Worn');
assert.deepEqual(getPriceGuide({ isbn: '', format: 'softcover', condition: 'Good' }), { status: 'missing-details' });
const dune = getPriceGuide({ isbn: '9780441172719', format: 'softcover', condition: 'Good' });
assert.equal(dune.status, 'sample');
assert.equal(dune.sellerCount, 5);
assert.equal(dune.low, 4.48);
assert.equal(dune.high, 5.45);
assert.equal(getPriceGuide({ isbn: '9780441172719', format: 'hardcover', condition: 'Good' }).status, 'insufficient');
assert.equal(getPriceGuide({ isbn: '9780525559474', format: 'hardcover', condition: 'Good' }).status, 'insufficient');
console.log('PASS: condition guidance and edition/format/condition-matched price samples.');

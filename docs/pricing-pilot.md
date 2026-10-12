# Book-price pilot: first three editions

Retrieved October 11, 2026 through web search. Source pages were reported as crawled last month. These are cached asking-price observations, not current availability checks or completed sales. Production reuse permission remains unverified. Nothing in this pilot changes the app's listing prices.

| Exact edition, used Good | Named sellers sampled | Item-price median | Middle-half item range | Delivered median |
|---|---:|---:|---:|---:|
| [Dune, Ace softcover, ISBN 9780441172719](https://www.abebooks.com/book-search/isbn/9780441172719/) | 5 | $5.05 | $4.48–$5.45 | $5.45 |
| [Atomic Habits, Avery hardcover, ISBN 9780735211292](https://www.abebooks.com/book-search/isbn/9780735211292/) | 5 | $6.13 | $5.43–$6.17 | $9.47 |
| [The Midnight Library, Viking hardcover, ISBN 9780525559474](https://www.abebooks.com/book-search/isbn/9780525559474/) | 3 | Insufficient | Not calculated | Not calculated |

These figures summarize the selected observations only. They are not general valuations for those titles. The sample is small, drawn from one marketplace, and biased toward inexpensive visible offers. Atomic Habits' sampled regional Goodwill sellers may not all be independent organizations, and jacket completeness varies. Dune's Good-condition sample must not be applied directly to the Worn demo copy. The Midnight Library demo is Like new, while these observations are Good; no estimate should cross that condition boundary.

The item/shipping distinction is material: Atomic Habits' delivered median exceeds its item median by $3.34. Do not subtract that difference from a local price as a resale formula. Local demand, retailer services and actual negotiated prices remain unmeasured.

## Reproducible prototype

Observations and limitations are stored in `pricing-pilot.json`; calculated results are in `pricing-pilot-results.json`. Run:

```sh
node scripts/summarize-pricing-pilot.mjs --write
node tests/pricing-pilot.mjs
```

The calculator deduplicates named sellers, keeps shipping separate, computes linearly interpolated quartiles, and returns insufficient evidence below five offers. Tests cover these rules and malformed prices. It does not prove seller independence, verify condition or detect special editions; those remain manual research steps.

## Implementation implications

- Store an explicit ISBN on listings; a cover URL is not verified edition metadata.
- Keep cached research outside the production guide until freshness and reuse are verified.
- Require matching condition and format. Add jacket/access-code/collectible flags where relevant.
- Expand the sample across authorized sources and price levels, rather than selecting only cheapest offers.
- Show an asking-price comparison, not “true value.” Return no estimate for unsupported editions.
- A $300 ordinary-copy listing would be far above these sampled offers, but a warning must use a fresh, comparable guide rather than this cached research.
- Migration 004 implements sale/exchange listings and converts legacy gift/loan data to exchanges. The production database has been migrated; the Vercel frontend still needs a deployment before the live pages reflect the new marketplace.

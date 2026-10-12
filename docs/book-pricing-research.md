# Ctrl+Us book-pricing research

Research date: October 11, 2026. Initial market assumption: US, USD, physical books, local pickup. Confirm the market before implementation.

## Decision

Build an evidence-backed approximate asking-price guide, not an authoritative appraisal. A title alone is insufficient. Match edition, format, language and condition. Do not load invented prices into the app as market knowledge.

No unrestricted, free, production-ready used-book valuation API was verified in this research. The realistic zero-budget starting point is free edition lookup plus a small, manually researched comparison dataset. Automated pricing requires checking the provider's permission, access and retention rules.

The app's supported transactions are sales and book exchanges. Migration 004 converts legacy gift/loan listings to exchanges. This pricing research does not implement checkout or make app-provided appraisals.

## What the sources establish

| Source | Useful information | Limit and integration decision |
|---|---|---|
| [Open Library Search API](https://openlibrary.org/dev/docs/api/search) and [Books API](https://openlibrary.org/dev/docs/api/books) | Bibliographic lookup, editions, identifiers, covers | Use for identity. The documented metadata endpoints do not provide a used-price valuation. Respect the API's usage guidance. |
| [Google Books Volume reference](https://developers.google.com/books/docs/v1/reference/volumes) | Country-specific sale information, currency, list/retail price, `isEbook` | Check format before using any price. A digital offer is not a physical used-book comparable. Missing sale data means unavailable, not zero. |
| [AbeBooks valuation guide](https://www.abebooks.com/books/old-books-antique-appraising-pricing/book-values.shtml) and [condition guide](https://www.abebooks.com/books/rarebooks/collecting-guide/understanding-rare-books/guide-book-conditions.shtml) | Similar-copy asking prices can inform a rough value; edition and condition matter, including dust jackets | Good manual comparison source. Asking prices do not establish completed-sale value. No free automated access or reuse permission was verified. |
| [eBay Browse API](https://developer.ebay.com/api-docs/buy/static/api-browse.html) | Listing search by identifiers/keywords and item price information | Potential future offer source, not a guaranteed sold-price feed. Production access and permitted reuse must be established. |
| [eBay API guidance](https://www.developer.ebay.com/develop/guides/sell/using-ebay-restful-apis) and [API agreement](https://developer.ebay.com/join/api-license-agreement) | Some APIs are limited-release; terms constrain data use, including certain pricing and derived statistics | Do not assume sold-history access or general permission to build a valuation dataset. The agreement's price-model restriction specifically refers to items listed on eBay; do not broaden that wording into a blanket claim about all external apps. |
| [BookScouter's official app description](https://play.google.com/store/apps/details?id=com.BookScouter&hl=en-US) | Buyback and purchase-price comparison | Buyback is a vendor's acquisition offer, not the local peer-to-peer sale price. No free public integration was verified. |
| [National Park Service rare-book guide](https://www.nps.gov/articles/000/conserve-o-gram-19-1-rare-books.htm) | Scarcity, demand, condition, associations and physical features affect rarity | Signed, collectible and scarce copies need separate treatment rather than ordinary-book pricing. |

## Why title-wide averages fail

[ThriftBooks' browse page](https://www.thriftbooks.com/browse/) displays broad price spans for titles across its inventory. These spans cannot be treated as an exact-edition value. Similarly, the publisher's [Atomic Habits ISBN page](https://www.penguinrandomhouse.com/books/543993/atomic-habits-by-james-clear/9780735211292/) identifies one particular edition; it is not a used-sale dataset.

This research did not collect a sufficient, condition-matched sample to publish a real dollar valuation for any individual book. The $300 versus $20 example is a product scenario, not a researched appraisal.

## Proposed estimation policy (design choices, not measured market facts)

1. Identify the exact ISBN where possible. Normalize ISBN-10/13 equivalents. For books without an ISBN, require publisher, year, format and edition; label the match uncertain.
2. Gather comparable ordinary physical copies in the same currency and market. Record condition, seller, URL, observed date, availability, item price and shipping separately.
3. Exclude ebooks, audiobooks, rentals, bundles, signed/collectible copies, unrelated editions and placeholder/unavailable offers. Never treat our fictional seed books as transactions.
4. Deduplicate the same seller/offer across aggregators. Do not pool different conditions or price types. A single seller listing five copies is not five independent market observations.
5. Initially require at least five relevant offers from three independent sellers before computing a guide. These thresholds are conservative product choices to validate during a pilot.
6. Show the median as the reference and the 25th–75th percentile as the typical asking range. Explain that this is the middle half of observed offers, not a confidence interval or guaranteed sale range. Review suspected outliers; do not automatically erase high prices that could reflect a real edition difference.
7. Display new-copy retail offers separately as context. Keep buyback offers and confirmed sold prices separate. For local pickup, show item-price comparisons and distinguish delivered online prices; do not quietly subtract guessed shipping or retailer margins.
8. If data is sparse, stale or ambiguous, show “Not enough comparable prices” and source links. Never guess a value from a generic percentage of retail price or genre.

Suggested display: “Comparable asking prices: $X–$Y. Median $Z. Based on N offers, checked DATE. Same edition and condition. Shipping excluded.”

## Overpricing warning

For ordinary editions with adequate evidence, propose a non-blocking warning when the seller's price exceeds twice the observed upper quartile. This is an initial UX rule, not a proven fraud detector. If verified ordinary-copy comparisons cluster near $20, $300 would warrant a warning. Let users explain a signed or special edition and request manual review. Do not impose a universal $20 or $300 ceiling.

Exchange listings can show the guide as optional context; do not require equal cash value between trades. Payment and trade fulfillment remain separate product decisions.

## Data to retain

Each observation: ISBN/edition, format, language, condition, market, currency, source, source URL, seller identity or deduplication key, asking/sold/buyback/retail type, item price, shipping price or unknown, availability, observation timestamp, and reuse-permission basis.

Each computed guide: matched criteria, eligible observation IDs, seller count, median, quartiles, computation date, limitations, and policy version. Keep provenance so users and administrators can inspect why a warning appeared.

## Free school-project rollout

- Start with 10–20 exact editions already in the demo catalog. Manually inspect relevant physical-copy offers from multiple sellers; record URLs and dates. Verify permission before redistributing commercial source data beyond what is allowed.
- Keep the research sample clearly distinct from fictional demo content. If compliant price reuse cannot be established, provide external comparison links instead of an automated range.
- Pilot the guide with ordinary books; route textbooks with access codes, collectible copies and bundles to manual comparison. An expired/missing code can make a textbook offer incomparable.
- Recheck availability and prices before presentation, subject to source-specific retention requirements. Do not label old observations “live.”
- Later, use consented confirmed Ctrl+Us sale amounts as a separate internal source. Exclude cancelled requests, unconfirmed payments, giveaways, trades and demo activity. Monitor repeated-counterparty or suspicious records before using them as price evidence.

## Remaining work

Choose the supported market/currency; collect the edition-level sample; verify provider permissions/access; implement sale/exchange fields and remove loan flows; add the comparison service and warnings; test missing data, mismatched ISBNs, currencies, shipping, duplicates and collectible exceptions.

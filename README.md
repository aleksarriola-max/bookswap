# Ctrl+Us — neighborhood book exchange

React + Vite school project with nearby books, requests, chat, meetup scheduling,
wishlists, reader notes, and a satellite neighborhood map.

## Run locally

```sh
npm ci
npm run dev
```

Without Supabase environment variables, the app runs a local demo with sample
books. Data stays in the current browser. With Supabase configured, it uses real
accounts and shared data; sample books are not uploaded or seeded in the database.

## Free integrations

- **Open Library:** Post → Find your book searches title, author, or ISBN and fills
  in the title, author, ISBN, and available cover. Details remain editable. Search is
  user-triggered and cached in memory. [API documentation](https://openlibrary.org/developers/api).
- **Meetup places:** after an exchange is accepted and the requester offers times,
  the owner can find named cafés and libraries within 3 km, select one, and open it
  on OpenStreetMap. Results are cached for an hour. General suggestions remain
  available when the service is unavailable. [Overpass usage guidance](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html).
- **Maps:** Browse → Neighborhood map uses Esri World Imagery by default and
  OpenStreetMap for Street mode. Search, genre, condition, and radius filter the
  book pins. Imagery needs internet access and is not live. Keep provider credits.
  [Esri noncommercial terms](https://www.esri.com/en-us/legal/terms/web-site-service)
  and [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/).

## Supabase setup

1. Create a free Supabase project.
2. Run `supabase/schema.sql`, then migrations `002_community_features.sql`,
   `003_demo_preview.sql`, and `004_marketplace.sql`
   once in the project's SQL Editor. The initial script is for a
   new project; its transaction creates the tables, RLS policies, atomic write
   function, a public cover bucket (5 MB limit), and realtime publication entries.
3. Copy `.env.example` to `.env.local`. Set `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` using the project's URL and publishable or legacy
   anon key. **Never use a secret or service-role key in Vite.** Restart the dev server.
4. In Authentication → URL Configuration, set the Site URL to your deployed app
   and allow `http://localhost:5173/**` plus your deployed origin's `/**` as redirect URLs.
5. Keep email/password authentication and email confirmation enabled. Register an
   account, confirm your email, sign in, and choose your neighborhood. For a class
   demo with several signups, check Supabase's current email sending limits or
   configure your own SMTP provider.

Books are readable by signed-in users. Chats and requests are readable only by
their participants; wishlists only by their owner. All writes use a server function
that derives identity from the session, enforces ownership and status transitions,
and updates exchanges atomically. Public book coordinates are rounded to two
decimal places. Uploaded cover images are public; upload only book covers.
Realtime updates refresh the local cache, with a 15-second polling fallback.
The app waits for successful writes and surfaces failures without clearing forms.

Signing out does not delete cloud data. Local demo data is kept separate from cloud
data. Private request data means other users' received-book reputation counts are
not available; your own counts and public shared-book counts remain available.
Unused uploaded covers are not automatically removed. Wishlist matches appear in
the app; they do not send push notifications or email.

## Community features

- Listings are either for sale or for a book exchange. Exchange requests include
  the book offered; sales show an asking price and capture the agreed price when
  the verified handoff is completed. Payment is coordinated by the people in chat;
  the school prototype does not process payments.
- Condition uses a seller-confirmed guided checklist plus up to four compressed
  photos. The checklist suggests a grade from reported wear; it does not use AI
  or claim to inspect the photos.
- Price guidance only appears for an exact researched ISBN, print format, and
  condition with at least five active marketplace offers. It shows the middle
  range of asking prices, with source and date; it is not sold-price data. The
  current pilot covers only a few books, so most listings correctly say there is
  not enough comparable data yet.
- Browse separates real listings from the school preview. Fictional books cannot
  receive requests and do not count as community handoffs.
- Wishlist matches use title and optional author, including titles in bundles,
  within the selected radius. Matches respect groups and blocked readers.
- Post a bundle of up to 10 book titles as one sale or exchange listing; the whole
  bundle changes hands together. Sales record the agreed price at verified handoff.
- Create or join open campus/dorm groups under Groups. Group listings require
  membership to read or request. These are open groups, not verified school affiliations.
- After a meetup is confirmed, the owner generates a real QR link. The requester
  scans it with their phone camera and explicitly confirms receipt while signed in.
  Codes last 24 hours and are consumed once; old direct completion is disabled.
- A completed recipient can relist a book for sale or exchange. Its journey keeps the original
  neighborhood and adds each recipient's rounded coordinates. Legacy handoffs
  without coordinates remain in the written history.
- Community and group challenges count recorded handoffs this calendar month
  toward a goal of 50. Bundles count as one handoff, not one per contained title.
- Report a listing from its detail page. Reports are private to the reporter and
  project administrator, who reviews them through Supabase's reports table.
  Reports do not automatically hide listings. Blocking hides a reader's listings
  and rejects contact in both directions. Manage blocks and reports in Community;
  declining pending exchanges remains possible after blocking.

For an existing project, apply unapplied migrations in order: 002, 003, then 004.
Migration 004 changes legacy gift/loan listings into book exchanges without
inventing prices, adds sale and exchange details, and records agreed sale prices.
It preserves existing rows and revokes browser access to internal functions.

## School preview books

After migration 004, run `supabase/demo_seed.sql` in the Supabase SQL Editor as
the database administrator. First post a listing with your neighborhood location;
the seed uses that approximate area for 24 sample books from six fictional readers.
It includes sale and exchange listings, two bundles, and eight sample journey histories.
The fictional users have no email, password, or login identity. Demo requests are
disabled in the UI and database, and sample journeys do not count as real handoffs.
Rerunning the seed creates no duplicates and preserves existing listings.

## Vercel deployment

1. Import `aleksarriola-max/bookswap` into Vercel under the Hobby plan.
2. Use the Vite preset, `npm run build`, and output directory `dist` (already in
   `vercel.json`). Set the production branch to `master`.
3. Add the two public Supabase environment variables from above for Production
   and Preview. Deploy. These variables are included in the browser bundle, so only
   use the publishable/anon key. The database policies protect the data.
4. Add the deployed app URL to Supabase Authentication settings, then test with
   two accounts on separate devices: post, request, accept, message, offer a time,
   confirm a meetup, and complete the exchange.

Vercel Hobby is for personal, noncommercial projects. Check current free quotas
for Vercel and Supabase before scaling beyond the school demo.

## Validation

The personal shelf (`/reading`) stores favorites, reading status, page progress,
and private notes in browser localStorage, scoped to the signed-in account. It
does not sync across devices. Nearby discovery ranks available listings by genres
from favorites and the reading tracker; it excludes your own and already saved books.

```sh
npm run build
npm run lint
npm run test:backend
npm run test:community
npm run test:personal
npm run test:marketplace
```

The embedded Postgres tests run the actual database schema with stand-ins for
Supabase auth and storage infrastructure. They cover chat privacy, owner spoofing,
exchange transitions, notes, and cover upload permissions. They do not test the
hosted Supabase email delivery or realtime transport.

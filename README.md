# Active Sefton

Static rebuild of activeseftonfitness.co.uk — Astro 7 + React islands + Tailwind CSS 4, built for Netlify.

```bash
npm install
npm run images   # download venue photos + generate WebP variants into public/images/centers/
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
npm run check    # type-check .astro/.ts/.tsx
```

## Where things live

| What | File |
| --- | --- |
| Venues (address, hours, facilities, images) | `src/data/centers.json` |
| Weekly sessions | `src/data/timetable.json` |
| Top-of-page service notice | `src/data/notices.json` — change the `id` to re-show it to people who dismissed the last one |
| Colours / fonts | `tailwind.config.mjs` (loaded via `@config` in `src/styles/global.css`) |
| Booking URL and deep links | `BOOKING_URL` / `sessionBookingUrl()` in `src/lib/shared.ts`; each centre's booking code is `bookingSiteId` in `centers.json` |

## Notes

- Tailwind is wired through `@tailwindcss/vite`; `@astrojs/tailwind` is deprecated and doesn't support Astro 6+.
- Venue details, photos and timetables are taken from the live site. Timetables were transcribed by hand from each centre's published timetable images (dates are in each centre's `timetableNote`), so re-check them when the centres publish new sheets. Swimming lessons, club bookings, lake activities and pitch hire aren't included.
- **The service notice in `notices.json` is sample content** — replace it before launch.
- Netlify picks up `netlify.toml` (build `npm run build`, publish `dist`). Images are committed under `public/`, so the build doesn't need network access.
- **Book Session** buttons go as deep into the GladstoneGo booking portal as possible, for the session's next date:
  - **Straight to "Book now"** (`/book/details?…`) for sessions that have a `booking` reference in `timetable.json` (about 80% of them). That page shows live spaces and the price options, then checkout.
  - **Otherwise a filtered search** (`/book?siteId=…&activityGroupId=…&dateFrom=…`) for that centre and activity type from the session's start time, so it's the first result. This covers sessions that aren't bookable online as listed (e.g. flume sessions, Swim & Splash, Tots Dance) or that differ from the booking system's times.
  - The day tabs cover the next 8 dates (today through the same weekday next week), because bookings open a week ahead. Booking for a date opens at 6:30am seven days before; until then the button reads "Opens <day> 6:30am" and links to the search, which shows the opening time.
  - Links are built in the browser because they depend on today's date.
- Pool swims at Bootle, Dunes and Meadows (public, lane, adults-only, calm waters) come from the booking system, not the printed pool sheets: the sheets' long blocks like "Public Swim 6:30–12:00" are when the pool is open, not sessions. Aqua Fit, £2 swims, Swim & Splash, flume sessions and the kayak taster still come from the sheets.
- Sessions with `"payOnTheDay": true` in `timetable.json` (the £2 over-60s swims, the £2 swims at Dunes and the £2 under-16s swims at Bootle) show "Pay on the day" instead of a Book button.
- **Booking references go stale.** They were collected from the booking portal on `BOOKING_REFS_CHECKED` (`src/lib/shared.ts`). The portal's IDs change when a centre changes its timetable, and a stale ID lands on an empty search page, so 42 days after that date every button automatically falls back to the filtered search. Refresh the references (and bump the date) when timetables change.

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
- **Book Session** buttons deep-link into the GladstoneGo booking portal (`/book?siteId=…&activityGroupId=…&dateFrom=…&dateTo=…`): the session's centre and activity group on its next date, starting from its start time, so the session is the first result with live spaces and a "Book now" button. Links are built in the browser because they depend on today's date. A few sessions aren't bookable online (e.g. flume sessions, Swim & Splash, Tots Dance); those links still open the right centre, day and time, but the session itself won't be listed.

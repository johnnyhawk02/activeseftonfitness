// Constants, types and helpers with no data imports — safe for client islands.

export const BOOKING_URL = 'https://activesefton.gladstonego.cloud/book';

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type Day = (typeof DAYS)[number];

export const DAY_NAMES: Record<Day, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

export const CATEGORIES = ['Swimming', 'Group Fitness'] as const;
export type Category = (typeof CATEGORIES)[number];

export type Center = {
  id: string;
  name: string;
  shortName: string;
  /** Site code in the Gladstone booking system, e.g. "MLC". */
  bookingSiteId: string;
  town: string;
  image: string;
  imageAlt: string;
  summary: string;
  description: string;
  highlights: string[];
  amenities: string[];
  address: string;
  phone: string;
  hours: { days: string; open: string; close: string }[];
  hoursNote: string;
  timetableNote?: string;
  weekly: Record<Day, [string, string]>;
  sourceUrl: string;
};

export type SessionTag = 'Virtual' | 'Youth' | 'New' | 'Extra charge';

export type Session = {
  id: string;
  centerId: string;
  day: Day;
  start: string;
  end: string;
  title: string;
  category: Category;
  room: string;
  instructor: string | null;
  /** Live availability, where known. Real published timetables don't include it. */
  capacity?: number;
  spacesLeft?: number;
  status?: 'Available' | 'Filling Fast';
  tags?: SessionTag[];
  /** Short qualifier from the published timetable, e.g. "2.5 lanes" or "Families only". */
  note?: string;
  /** Not bookable online: pay at reception on the day. */
  payOnTheDay?: boolean;
  /** The matching slot in the booking system, for a link straight to its "Book now" page. */
  booking?: BookingRef;
};

export type BookingRef = {
  activityId: string;
  locationId: string;
  group: string;
  /** Local end time as the booking system stores it, e.g. "10:29:59". */
  end: string;
};

/**
 * When the booking references in timetable.json were collected. Booking-system IDs change when a
 * centre changes its timetable, and a stale ID lands on an empty search page — so after
 * BOOKING_REFS_MAX_AGE_DAYS links fall back to the (still useful) filtered search until refreshed.
 */
export const BOOKING_REFS_CHECKED = '2026-10-17';
const BOOKING_REFS_MAX_AGE_DAYS = 42;

export type MembershipPlan = {
  id: string;
  /** Id of the `groups` entry it's listed under. */
  group: string;
  name: string;
  /** Second line of the name, e.g. "Committed". */
  variant?: string;
  ages?: string;
  /** Pounds per month. */
  price: number;
  /** Pounds a year, paid upfront ("Annual" in the portal). Left out when it can't be paid yearly. */
  annualPrice?: number;
  minimumMonths: number;
  includes: string;
  /** Centre ids from centers.json the membership covers. */
  centres: string[];
  /** Who qualifies, for memberships that need proof. */
  eligibility?: string;
  /** The booking portal's codes for it; several when the portal splits it (concessions). */
  join: MembershipJoin[];
};

export type MembershipJoin = {
  /** Button label when a plan has more than one. */
  label?: string;
  /** Portal "member type" key, e.g. "Adult", "concession". */
  memberType: string;
  /** Portal membership group keys for paying monthly by Direct Debit, and yearly upfront. */
  monthly: string;
  annual?: string;
  /** When this option's yearly price differs from the plan's (Saver+). */
  annualPrice?: number;
  /** A yearly scheme fee charged on top of the monthly price, and included in `annualPrice` (Saver+, £15). */
  annualFee?: number;
};

export type Memberships = {
  sourceUrl: string;
  /** When prices were last copied from the live site. */
  checked: string;
  /** Where "Join online" goes before a home centre is chosen: the booking portal's centre picker. */
  joinUrl: string;
  portal: {
    membershipsUrl: string;
    /** When the portal codes in each plan's `join` were last checked. */
    checked: string;
    /** How to pay: the portal's "membership duration" keys (Direct Debit on the 1st or 17th, or yearly). */
    paymentOptions: { key: string; label: string }[];
  };
  phone: string;
  benefits: string[];
  groups: { id: string; title: string; intro: string }[];
  plans: MembershipPlan[];
};

/**
 * Deep link into the portal's join flow with the home centre, membership and way of paying already
 * chosen, so it opens on that membership's price with "Continue To Payment". The portal needs all four.
 * `payment` is a `paymentOptions` key: "DD1st", "DD17th" or "Annual".
 */
export function membershipJoinUrl(membershipsUrl: string, siteId: string, join: Pick<MembershipJoin, 'memberType' | 'monthly' | 'annual'>, payment: string) {
  // A plan with no yearly version only offers the Direct Debit choices; fall back to the 1st just in case.
  const yearly = payment === 'Annual' && join.annual;
  const params = new URLSearchParams({
    siteId,
    memberType: join.memberType,
    membershipDuration: yearly ? 'Annual' : payment === 'Annual' ? 'DD1st' : payment,
    groupTag: yearly ? join.annual! : join.monthly,
  });
  return `${membershipsUrl}?${params}`;
}

export type AppGuide = {
  id: string;
  title: string;
  /** Under public/, e.g. "/videos/app/login.mp4", with a poster frame beside it. */
  video: string;
  poster: string;
  points: string[];
};

export type AppInfo = {
  sourceUrl: string;
  checked: string;
  stores: { appStore: string; googlePlay: string };
  forgottenPasswordUrl: string;
  /** Completes "To have an account you need…". */
  accountNeeds: string[];
  guides: AppGuide[];
};

/**
 * What joining costs today when paying monthly by Direct Debit, as the booking portal works it out
 * (checked against its quotes on 2026-10-19). You pay a pro-rata for each day from today up to the day
 * before your first collection, at the monthly price × 12 ÷ 365. If that first collection is less than
 * 17 days away, the first full month is also paid today and Direct Debits start a month later.
 * `fee` is a yearly scheme fee charged on joining (Saver+, £15).
 */
export function monthlyJoinCost(monthly: number, collectionDay: 1 | 17, fee = 0, today = londonDateKey()) {
  const [y, m, d] = today.split('-').map(Number);
  const collection = new Date(Date.UTC(y, m - 1 + (d > collectionDay ? 1 : 0), collectionDay));
  const days = Math.round((collection.getTime() - Date.UTC(y, m - 1, d)) / 86_400_000);
  const proRata = Math.round(((monthly * 12) / 365) * days * 100) / 100;
  const firstMonthUpfront = days < 17;
  const firstDebit = firstMonthUpfront ? new Date(Date.UTC(collection.getUTCFullYear(), collection.getUTCMonth() + 1, collectionDay)) : collection;
  const lastProRataDay = addDays(collection.toISOString().slice(0, 10), -1);
  const total = Math.round((proRata + (firstMonthUpfront ? monthly : 0) + fee) * 100) / 100;
  return { total, proRata, days, lastProRataDay, firstMonthUpfront, firstDebit: firstDebit.toISOString().slice(0, 10) };
}

export type Notice = { id: string; tone: 'info' | 'warning'; message: string; link?: { label: string; href: string } };

/** `/images/centers/bootle.jpg` → srcset of the WebP variants written by scripts/download-images.mjs */
export function imageSrcSet(image: string) {
  const base = image.replace(/\.jpg$/, '');
  return `${base}-480.webp 480w, ${base}-960.webp 960w`;
}

/** 24h "07:30" → "7:30am" */
/** Booking-system activity group a session is listed under. */
export function bookingGroup(s: Session) {
  if (s.title === 'Kayak Taster') return 'MAINPOOL';
  if (s.title === 'Aqua Fit') return 'AQUACLASS';
  if (s.category === 'Swimming') return 'SWIMSESSIONS';
  if (s.tags?.includes('Virtual')) return 'VIRTUALCLASSES';
  return 'GROUPFITNESS';
}

const londonParts = (d: Date) =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
      .formatToParts(d)
      .map((p) => [p.type, Number(p.value)]),
  ) as Record<'year' | 'month' | 'day' | 'hour' | 'minute', number>;

/** UTC instant of a Europe/London wall-clock date ("2026-10-19") and time ("09:30" or "10:29:59"). */
function londonToUtc(date: string, time: string) {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi, sec = 0] = time.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi, sec);
  const p = londonParts(new Date(guess));
  const offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, sec) - guess;
  return new Date(guess - offset);
}

/** Today's date in London as "YYYY-MM-DD". */
export function londonDateKey(now = new Date()) {
  const p = londonParts(now);
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" plus n days. */
export function addDays(date: string, n: number) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Weekday key of a "YYYY-MM-DD" date. */
export function dayOfDate(date: string): Day {
  return DAYS[(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7];
}

/** London date ("YYYY-MM-DD") of the next time this weekday comes round, today included. */
function nextDate(day: Day, now: Date) {
  const diff = (DAYS.indexOf(day) - DAYS.indexOf(todayKey(now)) + 7) % 7;
  return addDays(londonDateKey(now), diff);
}

/** Online booking for a date opens 7 days before, at 6:30am London time. */
export function bookingOpensAt(date: string) {
  return londonToUtc(addDays(date, -7), '06:30');
}

const utcIso = (d: Date) => d.toISOString().replace('.000Z', 'Z');

/**
 * Deep link into the booking portal for the session on `onDate` (default: its next occurrence).
 * With a fresh booking reference it opens that slot's "Book now" page (price options, then checkout);
 * otherwise it opens the centre's search for that activity group, starting from the session's time,
 * so the session is the first result.
 */
export function sessionBookingUrl(s: Session, siteId: string, now = new Date(), onDate?: string) {
  const date = onDate ?? nextDate(s.day, now);
  const refsAgeDays = (now.getTime() - Date.parse(BOOKING_REFS_CHECKED)) / 86_400_000;
  // The details page bounces to an empty search before booking opens; the search shows "Opens …".
  const open = now >= bookingOpensAt(date);
  if (s.booking && open && refsAgeDays <= BOOKING_REFS_MAX_AGE_DAYS) {
    // Same parameters (and order) the portal itself uses for its "Book now" button.
    const details = new URLSearchParams({
      activityEndTime: utcIso(londonToUtc(date, s.booking.end)),
      activityGroupId: s.booking.group,
      activityId: s.booking.activityId,
      activityStartTime: utcIso(londonToUtc(date, s.start)),
      locationId: s.booking.locationId,
      siteId,
    });
    return `${BOOKING_URL}/details?${details}`;
  }
  const params = new URLSearchParams({
    siteId,
    activityGroupId: bookingGroup(s),
    dateFrom: utcIso(londonToUtc(date, s.start)),
    dateTo: date,
  });
  return `${BOOKING_URL}?${params}`;
}

export function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}

/** Today's weekday in UK time, as a Day key. */
export function todayKey(now = new Date()): Day {
  const name = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'Europe/London' }).format(now);
  return (DAYS as readonly string[]).includes(name) ? (name as Day) : 'Mon';
}

export type ClassIndexEntry = { title: string; category: Category; centerIds: string[]; count: number };

// Cross-island events. Islands hydrate independently, so these go through window.
export const EVT_PALETTE_OPEN = 'as:palette-open';
export const EVT_TIMETABLE_FILTER = 'as:timetable-filter';
export type TimetableFilterDetail = Partial<{ centre: string; category: string; day: Day; query: string }>;

export function openPalette() {
  window.dispatchEvent(new CustomEvent(EVT_PALETTE_OPEN));
}

/**
 * Ask the timetable to filter. The URL is updated as well, because the timetable island
 * hydrates on visibility and may not be listening yet — it reads the URL when it mounts.
 * A new query starts a fresh search: category and (unless given) centre are cleared.
 */
export function filterTimetable(detail: TimetableFilterDetail) {
  const url = new URL(location.href);
  const set = (k: string, v?: string) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
  if (detail.query !== undefined) {
    set('q', detail.query || undefined);
    set('category', detail.category);
    set('centre', detail.centre);
  } else {
    if (detail.centre) set('centre', detail.centre);
    if (detail.category) set('category', detail.category);
  }
  if (detail.day) set('day', detail.day);
  url.hash = 'timetable';
  history.replaceState(null, '', url);
  window.dispatchEvent(new CustomEvent(EVT_TIMETABLE_FILTER, { detail }));
}

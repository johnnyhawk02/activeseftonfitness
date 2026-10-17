import { useEffect, useMemo, useState, useId } from 'react';
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m } from 'framer-motion';
import { ChevronDown, Dumbbell, ExternalLink, Search, Trophy, Users, Waves, X } from 'lucide-react';
import {
  BOOKING_URL,
  CATEGORIES,
  DAYS,
  DAY_NAMES,
  EVT_TIMETABLE_FILTER,
  formatTime,
  sessionBookingUrl,
  todayKey,
  type Category,
  type Day,
  type Session,
  type SessionTag,
  type TimetableFilterDetail,
} from '../lib/shared';

type CentreOption = { id: string; name: string; shortName: string; bookingSiteId: string };

type Props = {
  sessions: Session[];
  centres: CentreOption[];
  /** On a venue page the timetable is fixed to that centre. */
  lockedCentre?: string;
};

const CATEGORY_ICONS: Record<Category, typeof Waves> = {
  Swimming: Waves,
  Gym: Dumbbell,
  'Group Fitness': Users,
  Sports: Trophy,
};

const londonNow = () =>
  new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Europe/London' }).format(new Date());

function matches(s: Session, centreName: string, tokens: string[]) {
  if (!tokens.length) return true;
  const hay = `${s.title} ${s.category} ${s.room} ${s.instructor ?? ''} ${s.tags?.join(' ') ?? ''} ${s.note ?? ''} ${centreName}`.toLowerCase();
  return tokens.every((t) => hay.includes(t));
}

export default function Timetable({ sessions, centres, lockedCentre }: Props) {
  const [query, setQuery] = useState('');
  const [centre, setCentre] = useState(lockedCentre ?? 'all');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [day, setDay] = useState<Day>('Mon');
  const [today, setToday] = useState<Day | null>(null);
  const [now, setNow] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const searchId = useId();

  const centreName = useMemo(() => Object.fromEntries(centres.map((c) => [c.id, c.name])), [centres]);
  const siteId = useMemo(() => Object.fromEntries(centres.map((c) => [c.id, c.bookingSiteId])), [centres]);
  // Deep links depend on today's date, so they're built after mount (the server render keeps the generic URL).
  const bookHref = (s: Session) => (now ? sessionBookingUrl(s, siteId[s.centerId]) : BOOKING_URL);
  const centreShort = useMemo(() => Object.fromEntries(centres.map((c) => [c.id, c.shortName])), [centres]);

  // Initial state from the URL (shareable filters), then listen for filter requests from other islands.
  useEffect(() => {
    const t = todayKey();
    setToday(t);
    setNow(londonNow());
    const tick = setInterval(() => setNow(londonNow()), 60_000);

    const apply = (d: TimetableFilterDetail) => {
      if (d.query !== undefined) setQuery(d.query);
      if (d.centre && !lockedCentre) setCentre(centres.some((c) => c.id === d.centre) ? d.centre : 'all');
      if (d.category) setCategory((CATEGORIES as readonly string[]).includes(d.category) ? (d.category as Category) : 'all');
      if (d.day && DAYS.includes(d.day)) setDay(d.day);
    };

    const p = new URLSearchParams(location.search);
    setDay(t);
    apply({
      query: p.get('q') ?? undefined,
      centre: p.get('centre') ?? undefined,
      category: p.get('category') ?? undefined,
      day: (p.get('day') as Day) ?? undefined,
    });

    const onFilter = (e: Event) => {
      const d = (e as CustomEvent<TimetableFilterDetail>).detail;
      // A palette/venue jump starts a fresh search rather than stacking on old filters.
      if (d.query !== undefined && !d.category) setCategory('all');
      if (d.centre === undefined && d.query !== undefined && !lockedCentre) setCentre('all');
      apply(d);
    };
    window.addEventListener(EVT_TIMETABLE_FILTER, onFilter);
    return () => {
      clearInterval(tick);
      window.removeEventListener(EVT_TIMETABLE_FILTER, onFilter);
    };
  }, [centres, lockedCentre]);

  // Keep the URL in step so filtered views can be shared or bookmarked.
  useEffect(() => {
    if (!today) return; // not mounted yet
    const url = new URL(location.href);
    const set = (k: string, v: string | null) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
    set('q', query.trim() || null);
    set('centre', !lockedCentre && centre !== 'all' ? centre : null);
    set('category', category !== 'all' ? category : null);
    set('day', day !== today ? day : null);
    if (url.href !== location.href) history.replaceState(null, '', url);
  }, [query, centre, category, day, today, lockedCentre]);

  // Published timetables carry no live availability; only show that column when some data has it.
  const hasAvailability = useMemo(() => sessions.some((s) => s.status), [sessions]);
  const categories = useMemo(() => CATEGORIES.filter((cat) => sessions.some((s) => s.category === cat)), [sessions]);

  const tokens = useMemo(() => query.toLowerCase().split(/\s+/).filter(Boolean), [query]);

  const filtered = useMemo(
    () =>
      sessions.filter(
        (s) =>
          (centre === 'all' || s.centerId === centre) &&
          (category === 'all' || s.category === category) &&
          matches(s, centreName[s.centerId] ?? '', tokens),
      ),
    [sessions, centre, category, tokens, centreName],
  );

  const dayCounts = useMemo(() => {
    const counts = Object.fromEntries(DAYS.map((d) => [d, 0])) as Record<Day, number>;
    for (const s of filtered) counts[s.day]++;
    return counts;
  }, [filtered]);

  const list = useMemo(() => filtered.filter((s) => s.day === day), [filtered, day]);

  const isPast = (s: Session) => day === today && now !== null && s.end <= now;
  const hasFilters = query.trim() !== '' || (!lockedCentre && centre !== 'all') || category !== 'all';

  const reset = () => {
    setQuery('');
    setCategory('all');
    if (!lockedCentre) setCentre('all');
  };

  // If the chosen day has nothing but another day does, offer a jump.
  const nextDayWithSessions = list.length === 0 ? DAYS.find((d) => dayCounts[d] > 0) : undefined;

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-soft">
          {/* Controls */}
          <div className="space-y-5 border-b border-neutral-200 p-4 sm:p-6">
            <div className="relative">
              <label htmlFor={searchId} className="sr-only">
                Filter sessions by name, room or instructor
              </label>
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted" />
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter: Spin, Lane Swim, Pilates…"
                autoComplete="off"
                className="w-full rounded-lg border border-neutral-300 bg-canvas py-3 pr-10 pl-10 text-base text-ink placeholder:text-muted focus:border-sage focus:bg-white focus:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-muted hover:bg-neutral-100 hover:text-ink"
                  aria-label="Clear search"
                >
                  <X aria-hidden className="size-4" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {!lockedCentre && (
                <FilterGroup label="Centre">
                  <Chip pressed={centre === 'all'} onClick={() => setCentre('all')}>
                    All centres
                  </Chip>
                  {centres.map((c) => (
                    <Chip key={c.id} pressed={centre === c.id} onClick={() => setCentre(c.id)}>
                      {c.shortName}
                    </Chip>
                  ))}
                </FilterGroup>
              )}
              <FilterGroup label="Activity">
                <Chip pressed={category === 'all'} onClick={() => setCategory('all')}>
                  All
                </Chip>
                {categories.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat];
                  return (
                    <Chip key={cat} pressed={category === cat} onClick={() => setCategory(cat)}>
                      <Icon aria-hidden className="size-3.5" />
                      {cat}
                    </Chip>
                  );
                })}
              </FilterGroup>
            </div>
          </div>

          {/* Day selector */}
          <div role="group" aria-label="Day" className="scrollbar-none flex overflow-x-auto border-b border-neutral-200 px-2 sm:px-4">
            {DAYS.map((d) => {
              const active = d === day;
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setDay(d);
                    setExpanded(null);
                  }}
                  className={`relative flex min-w-[4.25rem] flex-1 flex-col items-center gap-0.5 px-2 pt-3 pb-2.5 text-sm transition-colors ${
                    active ? 'font-semibold text-ink' : 'text-muted hover:text-ink'
                  }`}
                >
                  <span>
                    <span className="sr-only">{DAY_NAMES[d]}</span>
                    <span aria-hidden>{d}</span>
                  </span>
                  <span className={`text-[0.7rem] tabular-nums ${active ? 'text-sage' : 'text-muted'}`}>
                    {d === today ? 'Today · ' : ''}
                    {dayCounts[d]}
                    <span className="sr-only"> {dayCounts[d] === 1 ? 'session' : 'sessions'}</span>
                  </span>
                  {active && <m.span layoutId="day-underline" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-sage" />}
                </button>
              );
            })}
          </div>

          {/* Summary */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 text-sm sm:px-6" aria-live="polite">
            <p className="text-muted">
              <span className="font-semibold text-ink">{list.length}</span> {list.length === 1 ? 'session' : 'sessions'} on{' '}
              {DAY_NAMES[day]}
              {!lockedCentre && centre !== 'all' && <> at {centreName[centre]}</>}
            </p>
            {hasFilters && (
              <button type="button" onClick={reset} className="font-semibold text-sage underline underline-offset-4 hover:text-sage-hover">
                Clear filters
              </button>
            )}
          </div>

          {list.length === 0 ? (
            <div className="px-4 py-16 text-center sm:px-6">
              <p className="font-serif text-2xl text-ink">
                {hasFilters ? `Nothing matches on ${DAY_NAMES[day]}.` : `No sessions on ${DAY_NAMES[day]}.`}
              </p>
              <p className="mt-2 text-muted">
                {nextDayWithSessions ? (
                  <>
                    There {dayCounts[nextDayWithSessions] === 1 ? 'is' : 'are'} {dayCounts[nextDayWithSessions]} on{' '}
                    <button type="button" className="font-semibold text-sage underline underline-offset-4" onClick={() => setDay(nextDayWithSessions)}>
                      {DAY_NAMES[nextDayWithSessions]}
                    </button>
                    .
                  </>
                ) : (
                  'Try a different search or clear the filters.'
                )}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop: aligned schedule table */}
              <div className="hidden px-6 pt-2 pb-4 md:block">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">
                    Sessions on {DAY_NAMES[day]}. Book buttons open the booking portal in a new tab.
                  </caption>
                  <thead>
                    <tr className="border-b border-neutral-200 text-xs font-semibold tracking-wide text-muted uppercase">
                      <th scope="col" className="py-3 pr-4 font-semibold">Time</th>
                      <th scope="col" className="py-3 pr-4 font-semibold">Session</th>
                      {!lockedCentre && <th scope="col" className="py-3 pr-4 font-semibold">Centre</th>}
                      <th scope="col" className="py-3 pr-4 font-semibold">Room</th>
                      {hasAvailability && <th scope="col" className="py-3 pr-4 font-semibold">Availability</th>}
                      <th scope="col" className="py-3 text-right font-semibold"><span className="sr-only">Book</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((s) => {
                      const past = isPast(s);
                      return (
                        <tr key={s.id} className={`border-b border-neutral-100 last:border-0 ${past ? 'text-muted' : ''}`}>
                          <td className="py-4 pr-4 align-top whitespace-nowrap tabular-nums">
                            <span className="font-semibold text-ink">{formatTime(s.start)}</span>
                            <span className="block text-xs text-muted">to {formatTime(s.end)}</span>
                          </td>
                          <th scope="row" className="py-4 pr-4 align-top font-normal">
                            <span className={`block font-semibold ${past ? 'text-muted' : 'text-ink'}`}>{s.title}</span>
                            <span className="mt-0.5 block text-xs text-muted">
                              {s.category}
                              {s.instructor && <> · with {s.instructor}</>}
                              {s.note && <> · {s.note}</>}
                            </span>
                            <Tags tags={s.tags} />
                          </th>
                          {!lockedCentre && <td className="py-4 pr-4 align-top text-ink">{centreName[s.centerId]}</td>}
                          <td className="py-4 pr-4 align-top">
                            <RoomTag room={s.room} />
                          </td>
                          {hasAvailability && (
                            <td className="py-4 pr-4 align-top">{!past && <StatusBadge session={s} />}</td>
                          )}
                          <td className="py-3.5 text-right align-top">
                            <SessionAction session={s} past={past} centreName={centreName[s.centerId]} href={bookHref(s)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile: collapsible cards */}
              <ul className="space-y-2.5 p-4 md:hidden">
                {list.map((s) => {
                  const open = expanded === s.id;
                  const past = isPast(s);
                  const panelId = `session-${s.id}`;
                  return (
                    <li key={s.id} className={`overflow-hidden rounded-xl border ${open ? 'border-sage/40 bg-white' : 'border-neutral-200 bg-white'}`}>
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={panelId}
                        onClick={() => setExpanded(open ? null : s.id)}
                        className="flex w-full items-start gap-3.5 p-4 text-left"
                      >
                        <span className="w-16 shrink-0 tabular-nums">
                          <span className={`block font-semibold ${past ? 'text-muted' : 'text-ink'}`}>{formatTime(s.start)}</span>
                          <span className="block text-xs text-muted">{formatTime(s.end)}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block font-semibold ${past ? 'text-muted' : 'text-ink'}`}>{s.title}</span>
                          <span className="mt-0.5 block truncate text-sm text-muted">
                            {lockedCentre ? s.room : `${centreShort[s.centerId]} · ${s.room}`}
                          </span>
                        </span>
                        <ChevronDown aria-hidden className={`mt-1 size-5 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
                      </button>
                      {/* Book sits outside the toggle so it's always one tap away. */}
                      <div className="flex items-center gap-3 pr-4 pb-4 pl-[5.875rem]">
                        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                          {!past && <StatusBadge session={s} compact />}
                          <Tags tags={s.tags} inline />
                        </span>
                        <SessionAction session={s} past={past} centreName={centreName[s.centerId]} href={bookHref(s)} />
                      </div>
                      <AnimatePresence initial={false}>
                        {open && (
                          <m.div
                            id={panelId}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                          >
                            <div className="border-t border-neutral-100 px-4 pt-3 pb-4">
                              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <dt className="text-muted">Activity</dt>
                                <dd className="text-ink">{s.category}</dd>
                                <dt className="text-muted">Room</dt>
                                <dd><RoomTag room={s.room} /></dd>
                                {s.instructor && (
                                  <>
                                    <dt className="text-muted">Instructor</dt>
                                    <dd className="text-ink">{s.instructor}</dd>
                                  </>
                                )}
                                {s.note && (
                                  <>
                                    <dt className="text-muted">Note</dt>
                                    <dd className="text-ink">{s.note}</dd>
                                  </>
                                )}
                                {s.spacesLeft !== undefined && (
                                  <>
                                    <dt className="text-muted">Spaces</dt>
                                    <dd className="text-ink tabular-nums">
                                      {s.spacesLeft} of {s.capacity}
                                    </dd>
                                  </>
                                )}
                              </dl>
                            </div>
                          </m.div>
                        )}
                      </AnimatePresence>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </LazyMotion>
    </MotionConfig>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
      <span aria-hidden className="text-xs font-semibold tracking-[0.12em] text-muted uppercase sm:w-20 sm:shrink-0 sm:pt-2.5">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        pressed ? 'border-sage bg-sage text-white' : 'border-neutral-200 bg-white text-ink hover:border-neutral-400'
      }`}
    >
      {children}
    </button>
  );
}

function RoomTag({ room }: { room: string }) {
  return (
    <span className="inline-block rounded-md border border-neutral-200 bg-canvas px-2 py-0.5 text-xs font-medium whitespace-nowrap text-ink">
      {room}
    </span>
  );
}

function StatusBadge({ session, compact }: { session: Session; compact?: boolean }) {
  if (!session.status) {
    return compact ? null : <span className="text-xs text-muted">Check when booking</span>;
  }
  const filling = session.status === 'Filling Fast';
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          filling ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200' : 'bg-sage-50 text-sage ring-1 ring-sage-100'
        }`}
      >
        <span aria-hidden className={`size-1.5 rounded-full ${filling ? 'bg-amber-600' : 'bg-sage-hover'}`} />
        {session.status}
      </span>
      {!compact && (
        <span className="text-xs text-muted tabular-nums">
          {session.spacesLeft} {session.spacesLeft === 1 ? 'space' : 'spaces'} left
        </span>
      )}
    </span>
  );
}

const TAG_LABELS: Record<SessionTag, string> = {
  Virtual: 'Virtual',
  Youth: 'Youth friendly',
  New: 'New',
  'Extra charge': 'Extra charge',
};

function Tags({ tags, inline }: { tags?: SessionTag[]; inline?: boolean }) {
  if (!tags?.length) return null;
  return (
    <span className={inline ? 'contents' : 'mt-1.5 flex flex-wrap gap-1'}>
      {tags.map((t) => (
        <span
          key={t}
          className={`rounded px-1.5 py-px text-[0.68rem] font-semibold ${
            t === 'New' ? 'bg-sage text-white' : t === 'Extra charge' ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200' : 'bg-neutral-100 text-ink'
          }`}
        >
          {TAG_LABELS[t]}
        </span>
      ))}
    </span>
  );
}

function SessionAction({ session, past, centreName, href }: { session: Session; past: boolean; centreName: string; href: string }) {
  if (past) return <span className="text-xs text-muted">Finished</span>;
  if (session.payOnTheDay) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold whitespace-nowrap text-ink">
        Pay on the day
      </span>
    );
  }
  return <BookButton session={session} centreName={centreName} href={href} />;
}

function BookButton({ session, centreName, href }: { session: Session; centreName: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-sage px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-white hover:bg-sage-hover"
    >
      Book Session
      <span className="sr-only">
        : {session.title} at {centreName}, {DAY_NAMES[session.day]} {formatTime(session.start)} (opens in a new tab)
      </span>
      <ExternalLink aria-hidden className="size-3.5" />
    </a>
  );
}

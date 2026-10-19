import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, CornerDownLeft, ExternalLink, MapPin, Search, Users, Waves } from 'lucide-react';
import { BOOKING_URL, EVT_PALETTE_OPEN, filterTimetable, type Category, type ClassIndexEntry } from '../lib/shared';

type CentreItem = { id: string; name: string; shortName: string; town: string; highlights: string[] };

type Props = {
  centres: CentreItem[];
  classes: ClassIndexEntry[];
};

type Item = {
  key: string;
  group: 'Jump to' | 'Centres' | 'Classes & sessions';
  label: string;
  hint: string;
  icon: typeof Search;
  external?: boolean;
  run: () => void;
};

const CATEGORY_ICONS: Record<Category, typeof Waves> = {
  Swimming: Waves,
  'Group Fitness': Users,
};

declare global {
  interface Window {
    __asPaletteReady?: boolean;
    __asPaletteQueued?: boolean;
  }
}

/** Show a class in the timetable: in place on the home page, otherwise navigate there. */
function showInTimetable(query: string, centre?: string) {
  const timetable = document.getElementById('timetable');
  if (timetable && !timetable.dataset.locked) {
    filterTimetable({ query, centre });
    timetable.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    return;
  }
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (centre) params.set('centre', centre);
  const qs = params.toString();
  location.href = `/${qs ? `?${qs}` : ''}#timetable`;
}

export default function CommandPalette({ centres, classes }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);

  // Global triggers: ⌘K / Ctrl+K, "/", and clicks on [data-open-palette] (via the event in Layout).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      const el = e.target as HTMLElement;
      const typing = el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(EVT_PALETTE_OPEN, show);
    window.__asPaletteReady = true;
    if (window.__asPaletteQueued) {
      window.__asPaletteQueued = false;
      show();
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(EVT_PALETTE_OPEN, show);
      window.__asPaletteReady = false;
    };
  }, [show]);

  // Sync React state with the native modal dialog (which gives us focus trapping, Esc and an inert background).
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    const hit = (text: string) => tokens.every((t) => text.toLowerCase().includes(t));

    const centreItems: Item[] = centres
      .filter((c) => !q || hit(`${c.name} ${c.town} ${c.highlights.join(' ')}`))
      .map((c) => ({
        key: `centre-${c.id}`,
        group: 'Centres',
        label: c.name,
        hint: `${c.town} · ${c.highlights.slice(0, 3).join(', ')}`,
        icon: MapPin,
        run: () => (location.href = `/centres/${c.id}/`),
      }));

    const classItems: Item[] = classes
      .filter((c) => !q || hit(`${c.title} ${c.category}`))
      .slice(0, q ? 8 : 5)
      .map((c) => ({
        key: `class-${c.title}`,
        group: 'Classes & sessions',
        label: c.title,
        hint: `${c.category} · ${c.centerIds.length} ${c.centerIds.length === 1 ? 'centre' : 'centres'} · ${c.count} a week`,
        icon: CATEGORY_ICONS[c.category],
        run: () => showInTimetable(c.title, c.centerIds.length === 1 ? c.centerIds[0] : undefined),
      }));

    const jumpItems: Item[] = [
      {
        key: 'jump-timetable',
        group: 'Jump to',
        label: q ? `Search the timetable for “${query.trim()}”` : 'Today’s timetable',
        hint: 'All centres',
        icon: CalendarDays,
        run: () => showInTimetable(query.trim()),
      },
      {
        key: 'jump-book',
        group: 'Jump to',
        label: 'Book a session',
        hint: 'Opens the booking portal in a new tab',
        icon: ExternalLink,
        external: true,
        run: () => window.open(BOOKING_URL, '_blank', 'noopener,noreferrer'),
      },
    ].filter((i) => !q || i.key === 'jump-timetable' || hit(i.label)) as Item[];

    // With a query, the most specific results lead; with none, quick links come first.
    return q ? [...classItems, ...centreItems, ...jumpItems] : [...jumpItems, ...centreItems, ...classItems];
  }, [query, centres, classes]);

  useEffect(() => setActive(0), [query]);

  // Keep the highlighted option in view while arrowing through.
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (item: Item | undefined) => {
    if (!item) return;
    hide();
    item.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % Math.max(items.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + items.length) % Math.max(items.length, 1));
    } else if (e.key === 'Home') {
      setActive(0);
    } else if (e.key === 'End') {
      setActive(items.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(items[active]);
    }
  };

  const optionId = (i: number) => `palette-opt-${i}`;
  let lastGroup = '';

  return (
    <dialog
      ref={dialogRef}
      className="palette"
      aria-label="Search Active Sefton"
      onClose={hide}
      onClick={(e) => e.target === dialogRef.current && hide()}
    >
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4">
          <Search aria-hidden className="size-5 shrink-0 text-brand" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={items[active] ? optionId(active) : undefined}
            aria-autocomplete="list"
            aria-label="Search classes and centres"
            placeholder="Search classes, pools and centres…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            spellCheck={false}
            className="h-14 flex-1 bg-transparent text-base text-ink placeholder:text-muted focus:outline-none"
          />
          <button
            type="button"
            onClick={hide}
            className="rounded border border-neutral-300 px-1.5 py-0.5 text-[0.7rem] font-semibold text-muted hover:text-ink"
          >
            Esc
          </button>
        </div>

        <ul ref={listRef} id="palette-list" role="listbox" aria-label="Results" className="max-h-[min(60vh,28rem)] overflow-y-auto p-2">
          {items.length === 0 && <li className="px-3 py-10 text-center text-sm text-muted">No centres or classes match “{query}”.</li>}
          {items.map((item, i) => {
            const heading = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            const Icon = item.icon;
            const selected = i === active;
            return (
              <li key={item.key} role="presentation">
                {heading && (
                  <div role="presentation" className="px-3 pt-3 pb-1.5 text-[0.7rem] font-semibold tracking-[0.12em] text-muted uppercase">
                    {heading}
                  </div>
                )}
                <div
                  id={optionId(i)}
                  role="option"
                  aria-selected={selected}
                  data-index={i}
                  onMouseMove={() => setActive(i)}
                  onClick={() => choose(item)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 ${selected ? 'bg-brand-50' : ''}`}
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-md border ${
                      selected ? 'border-brand-100 bg-white text-brand' : 'border-neutral-200 bg-canvas text-muted'
                    }`}
                  >
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{item.label}</span>
                    <span className="block truncate text-xs text-muted">{item.hint}</span>
                  </span>
                  {selected &&
                    (item.external ? (
                      <ExternalLink aria-hidden className="size-4 text-brand" />
                    ) : (
                      <ArrowRight aria-hidden className="size-4 text-brand" />
                    ))}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="hidden items-center gap-4 border-t border-neutral-200 bg-canvas px-4 py-2.5 text-xs text-muted sm:flex">
          <span className="inline-flex items-center gap-1.5">
            <kbd className="rounded border border-neutral-300 bg-white px-1">↑</kbd>
            <kbd className="rounded border border-neutral-300 bg-white px-1">↓</kbd> to move
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="inline-flex rounded border border-neutral-300 bg-white px-1 py-0.5">
              <CornerDownLeft className="size-3" aria-hidden />
            </kbd>
            to open
          </span>
          <span className="ml-auto">Press / anywhere to search</span>
        </div>
      </div>
    </dialog>
  );
}

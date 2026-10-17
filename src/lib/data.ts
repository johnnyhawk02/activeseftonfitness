// Build-time data (JSON). Import from Astro components; islands receive what they need as props.
import centersJson from '../data/centers.json';
import timetableJson from '../data/timetable.json';
import noticesJson from '../data/notices.json';
import type { Center, Category, ClassIndexEntry, Notice, Session } from './shared';

export * from './shared';

export const centers = centersJson as Center[];
export const sessions = timetableJson as Session[];
export const notices = noticesJson as Notice[];

export const centerById = Object.fromEntries(centers.map((c) => [c.id, c])) as Record<string, Center>;

/** Index of distinct class titles, for the command palette. */
export function classIndex(): ClassIndexEntry[] {
  const map = new Map<string, { title: string; category: Category; centerIds: Set<string>; count: number }>();
  for (const s of sessions) {
    const entry = map.get(s.title) ?? { title: s.title, category: s.category, centerIds: new Set(), count: 0 };
    entry.centerIds.add(s.centerId);
    entry.count++;
    map.set(s.title, entry);
  }
  return [...map.values()]
    .map((e) => ({ ...e, centerIds: [...e.centerIds] }))
    .sort((a, b) => b.count - a.count);
}

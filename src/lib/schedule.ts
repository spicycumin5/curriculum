import { addDays, format, getISODay, parseISO } from "date-fns";
import type { Course, Meeting } from "./types";

export const WEEKDAYS = [
  { n: 1, key: "mon", short: "Mon", long: "Monday" },
  { n: 2, key: "tue", short: "Tue", long: "Tuesday" },
  { n: 3, key: "wed", short: "Wed", long: "Wednesday" },
  { n: 4, key: "thu", short: "Thu", long: "Thursday" },
  { n: 5, key: "fri", short: "Fri", long: "Friday" },
  { n: 6, key: "sat", short: "Sat", long: "Saturday" },
  { n: 7, key: "sun", short: "Sun", long: "Sunday" },
] as const;

export type DayKey = (typeof WEEKDAYS)[number]["key"];
export const DAY_KEYS = WEEKDAYS.map((d) => d.key) as [DayKey, ...DayKey[]];

export function dayKeyToNumber(key: DayKey): number {
  return WEEKDAYS.findIndex((d) => d.key === key) + 1;
}

export function dayNumberToKey(n: number): DayKey {
  return WEEKDAYS[n - 1].key;
}

/** "09:00:00" | "09:00" → "09:00" */
export function hhmm(t: string | null | undefined): string | null {
  return t ? t.slice(0, 5) : null;
}

/** "13:05" → "1:05 PM" */
export function formatTime(t: string | null | undefined): string | null {
  const v = hhmm(t);
  if (!v) return null;
  const [h, m] = v.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function formatTimeRange(start: string | null, end: string | null): string | null {
  const s = formatTime(start);
  const e = formatTime(end);
  if (s && e) return `${s} – ${e}`;
  return s ?? (e ? `until ${e}` : null);
}

function sortMeetings<T extends Pick<Meeting, "weekday" | "start_time">>(ms: T[]): T[] {
  return [...ms].sort((a, b) => a.weekday - b.weekday || (hhmm(a.start_time) ?? "").localeCompare(hhmm(b.start_time) ?? ""));
}

/** "Mon, Wed, Fri · 9:00 AM – 10:00 AM" or "Mon 9:00 AM; Thu 2:00 PM – 3:30 PM" */
export function summarizeSchedule(meetings: Pick<Meeting, "weekday" | "start_time" | "end_time">[]): string | null {
  if (meetings.length === 0) return null;
  const sorted = sortMeetings(meetings);
  const groups = new Map<string, number[]>();
  for (const m of sorted) {
    const key = formatTimeRange(m.start_time, m.end_time) ?? "";
    groups.set(key, [...(groups.get(key) ?? []), m.weekday]);
  }
  return [...groups.entries()]
    .map(([time, days]) => {
      const dayList = [...new Set(days)].map((d) => WEEKDAYS[d - 1].short).join(", ");
      return time ? `${dayList} · ${time}` : dayList;
    })
    .join("; ");
}

export function isoWeekday(iso: string): number {
  return getISODay(parseISO(iso));
}

export function courseActiveOn(course: Pick<Course, "start_date" | "end_date">, iso: string): boolean {
  return (!course.start_date || iso >= course.start_date) && (!course.end_date || iso <= course.end_date);
}

export interface Session {
  meetingId: string;
  courseId: string;
  courseTitle: string;
  color: string;
  date: string; // YYYY-MM-DD
  start: string | null; // HH:MM
  end: string | null;
  location: string | null;
}

type ScheduledCourse = Pick<Course, "id" | "title" | "color" | "start_date" | "end_date"> & { meetings: Meeting[] };

/** Class sessions on one date, sorted by start time (untimed first). */
export function sessionsOn(courses: ScheduledCourse[], iso: string): Session[] {
  const wd = isoWeekday(iso);
  const out: Session[] = [];
  for (const c of courses) {
    if (!courseActiveOn(c, iso)) continue;
    for (const m of c.meetings) {
      if (m.weekday !== wd) continue;
      out.push({
        meetingId: m.id,
        courseId: c.id,
        courseTitle: c.title,
        color: c.color,
        date: iso,
        start: hhmm(m.start_time),
        end: hhmm(m.end_time),
        location: m.location,
      });
    }
  }
  return out.sort((a, b) => (a.start ?? "").localeCompare(b.start ?? "") || a.courseTitle.localeCompare(b.courseTitle));
}

/** Sessions for each date in [from, to] inclusive. */
export function sessionsBetween(courses: ScheduledCourse[], from: string, to: string): Map<string, Session[]> {
  const map = new Map<string, Session[]>();
  for (let d = parseISO(from); format(d, "yyyy-MM-dd") <= to; d = addDays(d, 1)) {
    const iso = format(d, "yyyy-MM-dd");
    const s = sessionsOn(courses, iso);
    if (s.length) map.set(iso, s);
  }
  return map;
}

/** First date strictly after `after` (within 8 weeks) on which the course meets. */
export function nextSession(course: ScheduledCourse, after: string): Session | null {
  if (course.meetings.length === 0) return null;
  let d = addDays(parseISO(after), 1);
  for (let i = 0; i < 56; i++, d = addDays(d, 1)) {
    const s = sessionsOn([course], format(d, "yyyy-MM-dd"));
    if (s.length) return s[0];
  }
  return null;
}

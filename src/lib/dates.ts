import { differenceInCalendarDays, format, parseISO } from "date-fns";

/** Item deadline: its own due date, else its unit's. */
export function effectiveDue(
  item: { due_date: string | null },
  unit: { due_date: string | null },
): string | null {
  return item.due_date ?? unit.due_date ?? null;
}

/** Today's date (YYYY-MM-DD) in the given IANA time zone, falling back to UTC. */
export function todayISO(timeZone?: string, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/** Calendar days from today to due (negative = overdue). */
export function daysUntil(due: string, today: string): number {
  return differenceInCalendarDays(parseISO(due), parseISO(today));
}

export type DueStatus = "done" | "overdue" | "today" | "soon" | "later" | "none";

export function dueStatus(due: string | null, done: boolean, today: string, soonDays = 7): DueStatus {
  if (done) return "done";
  if (!due) return "none";
  const d = daysUntil(due, today);
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d <= soonDays) return "soon";
  return "later";
}

export function relativeDue(due: string, today: string): string {
  const d = daysUntil(due, today);
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  if (d === -1) return "1 day overdue";
  if (d < 0) return `${-d} days overdue`;
  return `Due in ${d} days`;
}

export function formatDate(iso: string, pattern = "EEE, MMM d"): string {
  return format(parseISO(iso), pattern);
}

export function formatRange(start: string | null, end: string | null): string | null {
  if (start && end) return `${formatDate(start, "MMM d, yyyy")} – ${formatDate(end, "MMM d, yyyy")}`;
  if (start) return `Starts ${formatDate(start, "MMM d, yyyy")}`;
  if (end) return `Ends ${formatDate(end, "MMM d, yyyy")}`;
  return null;
}

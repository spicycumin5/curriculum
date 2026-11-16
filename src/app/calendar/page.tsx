import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import Link from "next/link";
import { DeadlineList } from "@/components/DeadlineList";
import { dueStatus } from "@/lib/dates";
import { collectDeadlines, type Deadline } from "@/lib/progress";
import { getCourses } from "@/lib/queries";
import { requireUser } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";

const MAX_PER_CELL = 3;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string; course?: string }> }) {
  const { m, course: courseFilter } = await searchParams;
  const { supabase, user } = await requireUser();
  const [{ courses, done }, today] = await Promise.all([getCourses(supabase, user.id), getToday()]);

  const monthStart = startOfMonth(parseISO(m && /^\d{4}-\d{2}$/.test(m) ? `${m}-01` : today));
  const monthKey = format(monthStart, "yyyy-MM");
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 }),
  });

  const all = collectDeadlines(courses, done).filter((d) => !courseFilter || d.courseId === courseFilter);
  const byDay = new Map<string, Deadline[]>();
  for (const d of all) byDay.set(d.due, [...(byDay.get(d.due) ?? []), d]);
  const inMonth = all.filter((d) => d.due.startsWith(monthKey));

  const href = (month: string, course = courseFilter) => {
    const q = new URLSearchParams({ m: month });
    if (course) q.set("course", course);
    return `/calendar?${q}`;
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">{format(monthStart, "MMMM yyyy")}</h1>
        <div className="flex gap-1">
          <Link className="btn" href={href(format(addMonths(monthStart, -1), "yyyy-MM"))} aria-label="Previous month">←</Link>
          <Link className="btn" href={href(today.slice(0, 7))}>Today</Link>
          <Link className="btn" href={href(format(addMonths(monthStart, 1), "yyyy-MM"))} aria-label="Next month">→</Link>
        </div>
      </div>

      {courses.length > 1 && (
        <nav aria-label="Filter by course" className="flex flex-wrap gap-2">
          <Link href={href(monthKey, "")} className={`chip ${!courseFilter ? "border-ink text-ink" : ""}`}>All courses</Link>
          {courses.map((c) => (
            <Link key={c.id} href={href(monthKey, c.id)} className={`chip ${courseFilter === c.id ? "border-ink text-ink" : ""}`}>
              <span className="size-2 rounded-full" style={{ background: c.color }} aria-hidden />
              {c.title}
            </Link>
          ))}
        </nav>
      )}

      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-line bg-surface-2 text-center text-xs font-medium text-muted">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const iso = format(day, "yyyy-MM-dd");
            const entries = byDay.get(iso) ?? [];
            const outside = !iso.startsWith(monthKey);
            const isToday = iso === today;
            return (
              <div
                key={iso}
                className={`min-h-16 border-r border-b border-line p-1 sm:min-h-28 sm:p-1.5 [&:nth-child(7n)]:border-r-0 ${outside ? "bg-surface-2/50" : ""}`}
              >
                <div
                  className={`mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs ${
                    isToday ? "bg-accent font-semibold text-accent-ink" : outside ? "text-muted/60" : "text-muted"
                  }`}
                >
                  {format(day, "d")}
                </div>
                {/* Dots on phones, titles on larger screens */}
                <div className="flex flex-wrap gap-0.5 sm:hidden">
                  {entries.map((e) => (
                    <span key={`${e.kind}-${e.id}`} className={`size-1.5 rounded-full ${e.done ? "opacity-30" : ""}`} style={{ background: e.color }} />
                  ))}
                </div>
                <ul className="hidden gap-0.5 sm:grid">
                  {entries.slice(0, MAX_PER_CELL).map((e) => (
                    <li key={`${e.kind}-${e.id}`}>
                      <Link
                        href={`/courses/${e.courseId}`}
                        title={`${e.title} — ${e.courseTitle}`}
                        className={`block truncate rounded px-1 py-0.5 text-[11px] leading-tight ${
                          e.kind === "unit" ? "font-semibold" : ""
                        } ${e.done ? "line-through opacity-50" : dueStatus(e.due, false, today) === "overdue" ? "text-danger" : ""}`}
                        style={{ background: `color-mix(in srgb, ${e.color} 16%, transparent)`, borderLeft: `3px solid ${e.color}` }}
                      >
                        {e.title}
                      </Link>
                    </li>
                  ))}
                  {entries.length > MAX_PER_CELL && <li className="px-1 text-[11px] text-muted">+{entries.length - MAX_PER_CELL} more</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <section className="card p-5">
        <h2 className="mb-4 font-serif text-lg font-semibold">Agenda · {format(monthStart, "MMMM")}</h2>
        <DeadlineList deadlines={inMonth} today={today} empty="No deadlines this month." />
      </section>
    </div>
  );
}

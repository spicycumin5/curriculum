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
import { formatTime, sessionsBetween } from "@/lib/schedule";
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
  const visibleCourses = courseFilter ? courses.filter((c) => c.id === courseFilter) : courses;
  const sessions = sessionsBetween(visibleCourses, format(days[0], "yyyy-MM-dd"), format(days[days.length - 1], "yyyy-MM-dd"));

  const href = (month: string, course = courseFilter) => {
    const q = new URLSearchParams({ m: month });
    if (course) q.set("course", course);
    return `/calendar?${q}`;
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">{format(monthStart, "MMMM yyyy")}</h1>
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
        <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] border-b border-line bg-surface-2 text-center text-xs font-semibold text-muted">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-[repeat(7,minmax(0,1fr))]">
          {days.map((day) => {
            const iso = format(day, "yyyy-MM-dd");
            const entries = byDay.get(iso) ?? [];
            const classes = sessions.get(iso) ?? [];
            const outside = !iso.startsWith(monthKey);
            const isToday = iso === today;
            return (
              <div
                key={iso}
                className={`min-h-16 border-r border-b border-line p-1 sm:min-h-28 sm:p-1.5 [&:nth-child(7n)]:border-r-0 ${outside ? "bg-surface-2/50" : ""}`}
              >
                <div
                  className={`mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs ${
                    isToday ? "bg-highlight font-bold text-highlight-ink" : outside ? "text-muted/60" : "text-muted"
                  }`}
                >
                  {format(day, "d")}
                </div>
                {/* Dots on phones, titles on larger screens */}
                <div className="flex flex-wrap gap-0.5 sm:hidden">
                  {classes.map((s) => (
                    <span key={s.meetingId} className="size-1.5 rounded-full border" style={{ borderColor: s.color }} />
                  ))}
                  {entries.map((e) => (
                    <span key={`${e.kind}-${e.id}`} className={`size-1.5 rounded-full ${e.done ? "opacity-30" : ""}`} style={{ background: e.color }} />
                  ))}
                </div>
                {classes.length > 0 && (
                  <ul className="mb-0.5 hidden grid-cols-[minmax(0,1fr)] gap-0.5 sm:grid">
                    {classes.map((s) => (
                      <li key={s.meetingId} className="truncate text-[11px] leading-tight text-muted" title={`Class: ${s.courseTitle}`}>
                        <span className="mr-1 inline-block size-1.5 rounded-full border align-middle" style={{ borderColor: s.color }} aria-hidden />
                        {s.start ? `${formatTime(s.start)} ` : ""}
                        {s.courseTitle}
                      </li>
                    ))}
                  </ul>
                )}
                <ul className="hidden grid-cols-[minmax(0,1fr)] gap-0.5 sm:grid">
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

      <p className="-mt-3 flex flex-wrap gap-4 text-xs text-muted">
        <span><span className="mr-1 inline-block size-2 rounded-full border border-muted align-middle" aria-hidden />Class day</span>
        <span><span className="mr-1 inline-block h-2 w-3 border-l-[3px] border-muted bg-surface-2 align-middle" aria-hidden />Deadline</span>
        <Link href="/week" className="link">Open week view</Link>
      </p>

      <section className="card p-5">
        <h2 className="mb-4 font-serif text-lg font-semibold">Everything due in {format(monthStart, "MMMM")}</h2>
        <DeadlineList deadlines={inMonth} today={today} empty="No deadlines this month." />
      </section>
    </div>
  );
}

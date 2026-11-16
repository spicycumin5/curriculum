import { addDays, format, parseISO, startOfWeek } from "date-fns";
import Link from "next/link";
import { KindBadge } from "@/components/badges";
import { LocationText } from "@/components/schedule";
import { dueStatus } from "@/lib/dates";
import { collectDeadlines, type Deadline } from "@/lib/progress";
import { getCourses } from "@/lib/queries";
import { formatTimeRange, sessionsBetween } from "@/lib/schedule";
import { requireUser } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";

export default async function WeekPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const { supabase, user } = await requireUser();
  const [{ courses, done }, today] = await Promise.all([getCourses(supabase, user.id), getToday()]);

  const anchor = d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(parseISO(d).getTime()) ? d : today;
  const monday = startOfWeek(parseISO(anchor), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => format(addDays(monday, i), "yyyy-MM-dd"));
  const sessions = sessionsBetween(courses, days[0], days[6]);
  const deadlines = new Map<string, Deadline[]>();
  for (const dl of collectDeadlines(courses, done)) {
    if (dl.due >= days[0] && dl.due <= days[6]) deadlines.set(dl.due, [...(deadlines.get(dl.due) ?? []), dl]);
  }
  const classCount = [...sessions.values()].reduce((n, s) => n + s.length, 0);
  const href = (iso: string) => `/week?d=${iso}`;
  const noSchedule = courses.length > 0 && courses.every((c) => c.meetings.length === 0);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            {classCount} class{classCount === 1 ? "" : "es"} this week
          </p>
          <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Week of {format(monday, "MMMM d")}
          </h1>
        </div>
        <div className="flex gap-1">
          <Link className="btn" href={href(format(addDays(monday, -7), "yyyy-MM-dd"))} aria-label="Previous week">←</Link>
          <Link className="btn" href="/week">This week</Link>
          <Link className="btn" href={href(format(addDays(monday, 7), "yyyy-MM-dd"))} aria-label="Next week">→</Link>
        </div>
      </div>

      {noSchedule && (
        <p className="card p-4 text-sm text-muted">
          None of your courses have class days yet. Open a course, go to <span className="text-ink">People &amp; settings</span>, and add them under{" "}
          <span className="text-ink">Class schedule</span>.
        </p>
      )}

      <ol className="grid gap-3 lg:grid-cols-7 lg:gap-2">
        {days.map((iso) => {
          const daySessions = sessions.get(iso) ?? [];
          const dayDeadlines = deadlines.get(iso) ?? [];
          const isToday = iso === today;
          const empty = daySessions.length === 0 && dayDeadlines.length === 0;
          return (
            <li
              key={iso}
              className={`card flex flex-col gap-2 p-3 lg:min-h-64 ${isToday ? "border-ink/60 border-t-4 border-t-highlight" : ""} ${empty ? "bg-surface-2/60" : ""}`}
              aria-current={isToday ? "date" : undefined}
            >
              <div className="flex items-baseline justify-between lg:block">
                <p className="text-sm font-semibold text-muted">{format(parseISO(iso), "EEEE")}</p>
                <p className="font-serif text-lg font-semibold">
                  {isToday ? <span className="today-mark">{format(parseISO(iso), "MMM d")}</span> : format(parseISO(iso), "MMM d")}
                </p>
              </div>

              {daySessions.map((s) => (
                <Link
                  key={s.meetingId}
                  href={`/courses/${s.courseId}`}
                  className="block rounded-md p-2 text-sm hover:opacity-90"
                  style={{ background: `color-mix(in srgb, ${s.color} 16%, transparent)`, borderLeft: `3px solid ${s.color}` }}
                >
                  <span className="block text-[11px] font-medium text-muted">{formatTimeRange(s.start, s.end) ?? "Class"}</span>
                  <span className="block leading-snug font-semibold">{s.courseTitle}</span>
                  {s.location && (
                    <span className="block truncate text-xs text-muted">
                      <LocationText location={s.location} />
                    </span>
                  )}
                </Link>
              ))}

              {dayDeadlines.length > 0 && (
                <ul className="mt-auto grid gap-1 border-t border-line pt-2">
                  <li className="text-[11px] text-muted">Due</li>
                  {dayDeadlines.map((dl) => {
                    const overdue = dueStatus(dl.due, dl.done, today) === "overdue";
                    return (
                      <li key={`${dl.kind}-${dl.id}`} className="flex items-start gap-1.5 text-xs">
                        <span className="mt-1 size-2 shrink-0 rounded-full" style={{ background: dl.color }} aria-hidden />
                        <Link
                          href={`/courses/${dl.courseId}`}
                          title={`${dl.title} — ${dl.courseTitle}`}
                          className={`min-w-0 hover:underline ${dl.done ? "text-muted line-through" : overdue ? "text-danger" : ""} ${dl.kind === "unit" ? "font-semibold" : ""}`}
                        >
                          {dl.title}
                        </Link>
                        {dl.itemKind && (
                          <span className="ml-auto hidden xl:inline">
                            <KindBadge kind={dl.itemKind} />
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {empty && <p className="text-xs text-muted">Free day</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

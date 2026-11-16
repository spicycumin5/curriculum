import Link from "next/link";
import { DueLabel, KindBadge, RoleBadge } from "@/components/badges";
import { DeadlineList } from "@/components/DeadlineList";
import { ProgressBar } from "@/components/ui";
import { daysUntil, formatDate, relativeDue } from "@/lib/dates";
import { collectDeadlines, courseProgress, nextItems } from "@/lib/progress";
import { formatTimeRange, nextSession, sessionsOn, summarizeSchedule } from "@/lib/schedule";
import { LocationText } from "@/components/schedule";
import { getCourses } from "@/lib/queries";
import { requireUser } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const [{ courses, done }, today] = await Promise.all([getCourses(supabase, user.id), getToday()]);

  const open = collectDeadlines(courses, done).filter((d) => !d.done && d.kind === "item");
  const overdue = open.filter((d) => daysUntil(d.due, today) < 0);
  const todaysClasses = sessionsOn(courses, today);
  const nextClass = courses
    .map((c) => nextSession(c, today))
    .filter((s): s is NonNullable<typeof s> => !!s)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? "").localeCompare(b.start ?? ""))[0];
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const upcoming = open.filter((d) => {
    const n = daysUntil(d.due, today);
    return n >= 0 && n <= 7;
  });

  return (
    <div className="grid gap-8">
      <div>
        <p className="text-sm text-muted">{formatDate(today, "EEEE, MMMM d")}</p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Your courses</h1>
      </div>

      {courses.length > 0 && (
        <section aria-labelledby="today-h" className="card p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="today-h" className="font-serif text-xl font-semibold">Today&apos;s classes</h2>
            <Link href="/week" className="text-sm text-accent hover:underline">Week view →</Link>
          </div>
          {todaysClasses.length === 0 ? (
            <p className="text-sm text-muted">
              No classes scheduled today.
              {nextClass && (
                <>
                  {" "}Next up: <span className="text-ink">{nextClass.courseTitle}</span> on {formatDate(nextClass.date, "EEEE, MMM d")}
                  {nextClass.start && <> at {formatTimeRange(nextClass.start, null)}</>}.
                </>
              )}
              {!nextClass && courses.every((c) => c.meetings.length === 0) && (
                <> Set class days on a course (Settings → Class schedule) to build your weekly timetable.</>
              )}
            </p>
          ) : (
            <ol className="grid gap-3 md:grid-cols-2">
              {todaysClasses.map((s) => {
                const course = courseById.get(s.courseId)!;
                const todo = nextItems(course, done, 3);
                return (
                  <li key={s.meetingId} className="rounded-lg border border-line p-4" style={{ borderLeft: `4px solid ${s.color}` }}>
                    <p className="text-xs font-medium tracking-wide text-muted uppercase">
                      {formatTimeRange(s.start, s.end) ?? "Any time today"}
                    </p>
                    <Link href={`/courses/${s.courseId}`} className="font-serif text-lg font-semibold hover:underline">
                      {s.courseTitle}
                    </Link>
                    {s.location && (
                      <p className="text-sm text-muted">
                        <LocationText location={s.location} />
                      </p>
                    )}
                    {todo.length > 0 ? (
                      <ul className="mt-3 grid gap-1.5 text-sm">
                        <li className="text-xs text-muted">Up next</li>
                        {todo.map((t) => (
                          <li key={t.id} className="flex flex-wrap items-center gap-1.5">
                            <KindBadge kind={t.kind} />
                            <span className="min-w-0 truncate">{t.title}</span>
                            {t.due && (
                              <span className="text-xs">
                                <DueLabel due={t.due} done={false} today={today} />
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : course.units.some((u) => u.items.length > 0) ? (
                      <p className="mt-3 text-sm text-ok">Everything in this course is done 🎉</p>
                    ) : (
                      <p className="mt-3 text-sm text-muted">
                        No resources yet.{" "}
                        <Link href={`/courses/${s.courseId}?edit=1`} className="text-accent hover:underline">Add some</Link>
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      )}

      {courses.length === 0 ? (
        <div className="card grid justify-items-center gap-3 p-10 text-center">
          <h2 className="font-serif text-xl font-semibold">Start your first course</h2>
          <p className="max-w-md text-sm text-muted">
            Build one by hand, or ask Claude in Claude Code to draft a curriculum and import the JSON it writes into
            <code className="mx-1 rounded bg-surface-2 px-1">curricula/</code>.
          </p>
          <div className="flex gap-2">
            <Link href="/courses/new" className="btn btn-primary">New course</Link>
            <Link href="/courses/import" className="btn">Import JSON</Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          <section aria-label="Courses" className="grid content-start gap-4 sm:grid-cols-2">
            {courses.map((c) => {
              const p = courseProgress(c, done);
              const next = open.find((d) => d.courseId === c.id);
              return (
                <Link key={c.id} href={`/courses/${c.id}`} className="card group overflow-hidden transition-shadow hover:shadow-md">
                  <div className="h-1.5" style={{ background: c.color }} />
                  <div className="grid gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-serif text-lg leading-snug font-semibold break-words group-hover:underline">{c.title}</h2>
                      {c.role !== "owner" && <RoleBadge role={c.role} />}
                    </div>
                    <div className="grid gap-1">
                      <ProgressBar pct={p.pct} color={c.color} label={`${c.title} progress`} />
                      <p className="text-xs text-muted tabular-nums">
                        {p.completed}/{p.total} done · {c.units.length} unit{c.units.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    {c.meetings.length > 0 && <p className="truncate text-xs text-muted">🗓 {summarizeSchedule(c.meetings)}</p>}
                    <p className="truncate text-xs text-muted">
                      {next ? (
                        <>
                          Next: <span className="text-ink">{next.title}</span> · {relativeDue(next.due, today)}
                        </>
                      ) : p.total > 0 && p.completed === p.total ? (
                        "All done 🎉"
                      ) : (
                        "No upcoming deadlines"
                      )}
                    </p>
                  </div>
                </Link>
              );
            })}
          </section>

          <aside className="grid content-start gap-6">
            {overdue.length > 0 && (
              <section className="card border-danger/30 p-4">
                <h2 className="mb-3 text-sm font-semibold text-danger">Overdue ({overdue.length})</h2>
                <DeadlineList deadlines={overdue} today={today} empty="" />
              </section>
            )}
            <section className="card p-4">
              <h2 className="mb-3 text-sm font-semibold">Due in the next 7 days</h2>
              <DeadlineList deadlines={upcoming} today={today} empty="Nothing due this week." />
              <Link href="/calendar" className="mt-4 inline-block text-xs text-accent hover:underline">
                Open calendar →
              </Link>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

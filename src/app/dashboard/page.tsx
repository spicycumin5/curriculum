import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { DueLabel, KindBadge, RoleBadge } from "@/components/badges";
import { CourseBanner } from "@/components/CourseBanner";
import { DeadlineList } from "@/components/DeadlineList";
import { IconClock, IconPin } from "@/components/icons";
import { LocationText } from "@/components/schedule";
import { ProgressBar } from "@/components/ui";
import { courseCode } from "@/lib/course-style";
import { daysUntil, formatDate } from "@/lib/dates";
import { collectDeadlines, courseProgress, nextItems } from "@/lib/progress";
import { getCourses } from "@/lib/queries";
import { formatTimeRange, nextSession, sessionsOn, summarizeSchedule } from "@/lib/schedule";
import { requireUser } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const [{ courses, done }, today] = await Promise.all([getCourses(supabase, user.id), getToday()]);

  const open = collectDeadlines(courses, done).filter((d) => !d.done && d.kind === "item");
  const overdue = open.filter((d) => daysUntil(d.due, today) < 0);
  const upcoming = open.filter((d) => {
    const n = daysUntil(d.due, today);
    return n >= 0 && n <= 7;
  });
  const todaysClasses = sessionsOn(courses, today);
  const nextClass = courses
    .map((c) => nextSession(c, today))
    .filter((s): s is NonNullable<typeof s> => !!s)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? "").localeCompare(b.start ?? ""))[0];
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const firstName = ((user.user_metadata?.display_name as string | undefined) ?? "").split(" ")[0];

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">Dashboard</h1>
          <p className="mt-1 text-muted">
            {formatDate(today, "EEEE, MMMM d")}
            {firstName && `. Welcome back, ${firstName}.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/courses/import" className="btn">Import course</Link>
          <Link href="/courses/new" className="btn btn-primary">New course</Link>
          <form action={signOut} className="md:hidden">
            <button className="btn">Sign out</button>
          </form>
        </div>
      </header>

      {courses.length === 0 ? (
        <section className="card grid max-w-2xl gap-3 p-8">
          <h2 className="font-serif text-2xl font-semibold">Enroll in your first course</h2>
          <p className="text-muted">
            Create a course and give it weekly class days, or ask Claude in Claude Code to draft a whole curriculum and import the file it
            writes to <code className="rounded bg-surface-2 px-1">curricula/</code>.
          </p>
          <div className="flex gap-2">
            <Link href="/courses/new" className="btn btn-primary">New course</Link>
            <Link href="/courses/import" className="btn">Import a course file</Link>
          </div>
        </section>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1fr_19rem]">
          <div className="grid content-start gap-10">
            <section aria-labelledby="today-h">
              <h2 id="today-h" className="mb-3 font-serif text-xl font-semibold">
                Today&apos;s classes
              </h2>
              {todaysClasses.length === 0 ? (
                <p className="text-sm text-muted">
                  No class today.
                  {nextClass && (
                    <>
                      {" "}Your next one is <span className="font-semibold text-ink">{nextClass.courseTitle}</span> on{" "}
                      {formatDate(nextClass.date, "EEEE, MMM d")}
                      {nextClass.start && <> at {formatTimeRange(nextClass.start, null)}</>}.
                    </>
                  )}
                  {!nextClass && courses.every((c) => c.meetings.length === 0) && (
                    <> Give a course weekly class days in its settings to build your timetable.</>
                  )}
                </p>
              ) : (
                <ol className="grid gap-3">
                  {todaysClasses.map((s) => {
                    const course = courseById.get(s.courseId)!;
                    const todo = nextItems(course, done, 3);
                    return (
                      <li key={s.meetingId} className="card flex overflow-hidden">
                        <div className="notebook w-3 shrink-0" style={{ "--c": s.color } as React.CSSProperties} aria-hidden />
                        <div className="grid flex-1 gap-3 p-4 sm:grid-cols-[13rem_1fr]">
                          <div>
                            <p className="flex items-center gap-1.5 text-sm font-semibold">
                              <IconClock className="size-4 text-muted" />
                              {formatTimeRange(s.start, s.end) ?? "Any time today"}
                            </p>
                            <Link href={`/courses/${s.courseId}`} className="mt-1 block font-serif text-lg leading-tight font-semibold hover:underline">
                              {s.courseTitle}
                            </Link>
                            <p className="text-xs text-muted">{courseCode(s.courseTitle, s.courseId)}</p>
                            {s.location && (
                              <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                                <IconPin className="size-4" />
                                <LocationText location={s.location} />
                              </p>
                            )}
                          </div>
                          <div className="sm:border-l sm:border-line sm:pl-4">
                            {todo.length > 0 ? (
                              <>
                                <p className="mb-1 text-sm font-semibold">In class today</p>
                                <ul className="grid gap-1.5 text-sm">
                                  {todo.map((t) => (
                                    <li key={t.id} className="flex items-start gap-2">
                                      <span className="mt-0.5"><KindBadge kind={t.kind} /></span>
                                      <span className="min-w-0">
                                        {t.title}
                                        {t.due && (
                                          <span className="ml-2 text-xs">
                                            <DueLabel due={t.due} done={false} today={today} />
                                          </span>
                                        )}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </>
                            ) : course.units.some((u) => u.items.length > 0) ? (
                              <p className="text-sm text-ok">Every module item is complete.</p>
                            ) : (
                              <p className="text-sm text-muted">
                                No modules yet. <Link href={`/courses/${s.courseId}?edit=1`} className="link">Add one</Link>
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            <section aria-labelledby="courses-h">
              <h2 id="courses-h" className="mb-3 font-serif text-xl font-semibold">
                Courses <span className="font-sans text-base font-normal text-muted">({courses.length})</span>
              </h2>
              <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {courses.map((c) => {
                  const p = courseProgress(c, done);
                  const next = open.find((d) => d.courseId === c.id);
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/courses/${c.id}`}
                        className="card group flex h-full flex-col overflow-hidden transition-[border-color] hover:border-ink/40"
                      >
                        <CourseBanner id={c.id} title={c.title} color={c.color} />
                        <div className="flex flex-1 flex-col gap-3 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-serif text-lg leading-snug font-semibold break-words group-hover:underline">{c.title}</h3>
                            {c.role !== "owner" && <RoleBadge role={c.role} />}
                          </div>
                          {c.meetings.length > 0 && <p className="text-xs text-muted">{summarizeSchedule(c.meetings)}</p>}
                          <div className="mt-auto grid gap-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted">
                                {c.units.length} module{c.units.length === 1 ? "" : "s"}
                              </span>
                              <span className="font-semibold tabular-nums">{p.pct}%</span>
                            </div>
                            <ProgressBar pct={p.pct} color={c.color} label={`${c.title} progress`} />
                          </div>
                          <p className="truncate border-t border-line pt-2 text-xs text-muted">
                            {next ? (
                              <>
                                Next: <span className="text-ink">{next.title}</span>
                              </>
                            ) : p.total > 0 && p.completed === p.total ? (
                              "Course complete"
                            ) : (
                              "Nothing due"
                            )}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <aside className="grid content-start gap-8" aria-label="To do">
            {overdue.length > 0 && (
              <section className="panel border-danger">
                <h2 className="panel-title text-danger">Overdue</h2>
                <DeadlineList deadlines={overdue} today={today} empty="" />
              </section>
            )}
            <section className="panel">
              <h2 className="panel-title">To do</h2>
              <DeadlineList deadlines={upcoming} today={today} empty="Nothing due in the next 7 days." />
            </section>
            <section className="panel">
              <h2 className="panel-title">Plan ahead</h2>
              <div className="grid gap-2 text-sm">
                <Link href="/week" className="link">This week&apos;s timetable</Link>
                <Link href="/calendar" className="link">Calendar</Link>
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

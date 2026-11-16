import Link from "next/link";
import { RoleBadge } from "@/components/badges";
import { DeadlineList } from "@/components/DeadlineList";
import { ProgressBar } from "@/components/ui";
import { daysUntil, formatDate, relativeDue } from "@/lib/dates";
import { collectDeadlines, courseProgress } from "@/lib/progress";
import { getCourses } from "@/lib/queries";
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

  return (
    <div className="grid gap-8">
      <div>
        <p className="text-sm text-muted">{formatDate(today, "EEEE, MMMM d")}</p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Your courses</h1>
      </div>

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

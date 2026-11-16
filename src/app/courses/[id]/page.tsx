import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addItem,
  addUnit,
  deleteItem,
  deleteUnit,
  moveItem,
  moveUnit,
  toggleItem,
  updateItem,
  updateUnit,
} from "@/app/actions/courses";
import { RoleBadge, formatMinutes } from "@/components/badges";
import { AddItem, AddUnit, ItemRow, UnitEditor } from "@/components/course";
import { ProgressBar } from "@/components/ui";
import { effectiveDue, formatDate, formatRange } from "@/lib/dates";
import { courseProgress, unitProgress } from "@/lib/progress";
import { getCourses } from "@/lib/queries";
import { requireUser } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";
import { ROLE_RANK } from "@/lib/types";
import { formatTimeRange, nextSession, sessionsOn, summarizeSchedule } from "@/lib/schedule";

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase, user } = await requireUser();
  const [{ courses, done }, today] = await Promise.all([getCourses(supabase, user.id, id), getToday()]);
  const course = courses[0];
  if (!course) notFound();

  const canEdit = ROLE_RANK[course.role] >= ROLE_RANK.editor;
  const editing = canEdit && edit === "1";
  const overall = courseProgress(course, done);
  const totalMinutes = course.units.flatMap((u) => u.items).reduce((s, i) => s + (i.est_minutes ?? 0), 0);
  const range = formatRange(course.start_date, course.end_date);
  const schedule = summarizeSchedule(course.meetings);
  const todaysClass = sessionsOn([course], today)[0];
  const upcomingClass = todaysClass ?? nextSession(course, today);

  return (
    <div className="grid gap-6">
      <header className="card overflow-hidden">
        <div className="h-2" style={{ background: course.color }} />
        <div className="grid gap-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-serif text-3xl font-semibold tracking-tight break-words">{course.title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                <RoleBadge role={course.role} />
                {range && <span>{range}</span>}
                {totalMinutes > 0 && <span>· ~{formatMinutes(totalMinutes)} total</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canEdit && (
                <Link href={editing ? `/courses/${id}` : `/courses/${id}?edit=1`} className={`btn ${editing ? "btn-primary" : ""}`}>
                  {editing ? "Done editing" : "Edit"}
                </Link>
              )}
              <Link href={`/courses/${id}/settings`} className="btn">
                {course.role === "owner" ? "Settings & sharing" : "Course info"}
              </Link>
            </div>
          </div>
          {course.description && <p className="max-w-prose whitespace-pre-wrap text-muted">{course.description}</p>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-surface-2 px-3 py-2 text-sm">
            <span aria-hidden>🗓</span>
            {schedule ? (
              <>
                <span className="font-medium">{schedule}</span>
                {upcomingClass && (
                  <span className={todaysClass ? "font-medium text-accent" : "text-muted"}>
                    {todaysClass ? "Class today" : `Next class ${formatDate(upcomingClass.date)}`}
                    {upcomingClass.start && ` · ${formatTimeRange(upcomingClass.start, upcomingClass.end)}`}
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted">No weekly class days set.</span>
            )}
            {canEdit && (
              <Link href={`/courses/${id}/settings#schedule`} className="text-accent hover:underline">
                {schedule ? "Edit schedule" : "Set class days"}
              </Link>
            )}
          </div>
          <div className="grid gap-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Your progress</span>
              <span className="font-medium tabular-nums">
                {overall.completed}/{overall.total} · {overall.pct}%
              </span>
            </div>
            <ProgressBar pct={overall.pct} color={course.color} />
          </div>
        </div>
      </header>

      {course.units.length === 0 && !editing && (
        <div className="card p-8 text-center text-muted">
          <p>This course has no units yet.</p>
          {canEdit && (
            <Link href={`/courses/${id}?edit=1`} className="btn btn-primary mt-4">
              Add the first unit
            </Link>
          )}
        </div>
      )}

      <ol className="grid gap-4">
        {course.units.map((unit, ui) => {
          const p = unitProgress(unit, done);
          return (
            <li key={unit.id} className="card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium tracking-wider text-muted uppercase">Unit {ui + 1}</p>
                  <h2 className="font-serif text-xl font-semibold break-words">{unit.title}</h2>
                </div>
                <div className="text-right text-sm text-muted">
                  {unit.start_date && <span>{formatDate(unit.start_date, "MMM d")} → </span>}
                  {unit.due_date ? <span>due {formatDate(unit.due_date)}</span> : unit.start_date ? <span>…</span> : null}
                </div>
              </div>
              {unit.description && <p className="mt-1 text-sm whitespace-pre-wrap text-muted">{unit.description}</p>}
              {p.total > 0 && (
                <div className="mt-3 flex items-center gap-3">
                  <ProgressBar pct={p.pct} color={course.color} label={`${unit.title} progress`} />
                  <span className="shrink-0 text-xs text-muted tabular-nums">
                    {p.completed}/{p.total}
                  </span>
                </div>
              )}
              {editing && (
                <UnitEditor
                  unit={unit}
                  isFirst={ui === 0}
                  isLast={ui === course.units.length - 1}
                  edit={{
                    update: updateUnit.bind(null, unit.id),
                    remove: deleteUnit.bind(null, unit.id),
                    move: moveUnit.bind(null, unit.id),
                  }}
                />
              )}
              {unit.items.length > 0 && (
                <ul className="mt-2 divide-y divide-line">
                  {unit.items.map((item, ii) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      due={effectiveDue(item, unit)}
                      done={done.has(item.id)}
                      today={today}
                      color={course.color}
                      toggle={toggleItem.bind(null, item.id)}
                      isFirst={ii === 0}
                      isLast={ii === unit.items.length - 1}
                      edit={
                        editing
                          ? {
                              update: updateItem.bind(null, item.id),
                              remove: deleteItem.bind(null, item.id),
                              move: moveItem.bind(null, item.id),
                            }
                          : undefined
                      }
                    />
                  ))}
                </ul>
              )}
              {unit.items.length === 0 && !editing && <p className="mt-3 text-sm text-muted">No resources yet.</p>}
              {editing && <AddItem action={addItem.bind(null, unit.id)} />}
            </li>
          );
        })}
      </ol>

      {editing && <AddUnit action={addUnit.bind(null, course.id)} />}
    </div>
  );
}

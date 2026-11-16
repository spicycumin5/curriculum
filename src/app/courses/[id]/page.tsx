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
import { DueLabel, KindBadge, formatMinutes } from "@/components/badges";
import { AddItem, AddUnit, ItemRow, UnitEditor } from "@/components/course";
import { CourseHeader } from "@/components/CourseHeader";
import { IconChevron, IconClock, IconPin } from "@/components/icons";
import { LocationText } from "@/components/schedule";
import { ProgressBar } from "@/components/ui";
import { effectiveDue, formatDate } from "@/lib/dates";
import { courseProgress, nextItems, unitProgress } from "@/lib/progress";
import { getCourses } from "@/lib/queries";
import { formatTimeRange, nextSession, sessionsOn } from "@/lib/schedule";
import { requireUser } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";
import { ROLE_RANK } from "@/lib/types";

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
  const todaysClass = sessionsOn([course], today)[0];
  const upcomingClass = todaysClass ?? nextSession(course, today);
  const upNext = nextItems(course, done, 4);

  return (
    <div className="grid gap-6">
      <CourseHeader course={course} tab="modules" />

      {course.description && <p className="max-w-prose whitespace-pre-wrap text-muted">{course.description}</p>}

      <div className="grid gap-8 lg:grid-cols-[1fr_17rem]">
        <section aria-labelledby="modules-h" className="grid content-start gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="modules-h" className="font-serif text-2xl font-semibold">Modules</h2>
            {canEdit && (
              <Link href={editing ? `/courses/${id}` : `/courses/${id}?edit=1`} className={`btn ${editing ? "btn-primary" : ""}`}>
                {editing ? "Done editing" : "Edit modules"}
              </Link>
            )}
          </div>

          {course.units.length === 0 && !editing && (
            <div className="card grid justify-items-start gap-3 p-6">
              <p className="text-muted">This course has no modules yet. A module is a chunk of the course, usually one week, with its readings, videos and assignments.</p>
              {canEdit && (
                <Link href={`/courses/${id}?edit=1`} className="btn btn-primary">Add the first module</Link>
              )}
            </div>
          )}

          <ol className="grid gap-4">
            {course.units.map((unit, ui) => {
              const p = unitProgress(unit, done);
              const complete = p.total > 0 && p.completed === p.total;
              return (
                <li key={unit.id} className="card overflow-hidden">
                  <details open={!complete || editing} className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-3 border-b border-line bg-surface-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
                      <IconChevron className="size-4 text-muted transition-transform group-open:rotate-90" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted">Module {ui + 1}</p>
                        <h3 className="font-serif text-lg leading-snug font-semibold break-words">{unit.title}</h3>
                        <p className="flex flex-wrap gap-x-3 text-xs text-muted sm:hidden">
                          {unit.due_date && <DueLabel due={unit.due_date} done={complete} today={today} />}
                          {p.total > 0 && <span className={complete ? "font-semibold text-ok" : ""}>{complete ? "Complete" : `${p.completed} of ${p.total} done`}</span>}
                        </p>
                      </div>
                      <div className="hidden text-right text-xs text-muted sm:block">
                        {unit.due_date && (
                          <p>
                            <DueLabel due={unit.due_date} done={complete} today={today} />
                          </p>
                        )}
                        {p.total > 0 && (
                          <p className={complete ? "font-semibold text-ok" : ""}>
                            {complete ? "Complete" : `${p.completed} of ${p.total} done`}
                          </p>
                        )}
                      </div>
                    </summary>
                    {(unit.description || unit.start_date) && (
                      <div className="border-b border-line px-4 py-2 text-sm text-muted">
                        {unit.start_date && (
                          <p>
                            {formatDate(unit.start_date, "MMM d")}
                            {unit.due_date ? ` to ${formatDate(unit.due_date, "MMM d")}` : ""}
                          </p>
                        )}
                        {unit.description && <p className="whitespace-pre-wrap">{unit.description}</p>}
                      </div>
                    )}
                    {editing && (
                      <div className="border-b border-line px-4 pb-3">
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
                      </div>
                    )}
                    {unit.items.length > 0 ? (
                      <ul className="divide-y divide-line">
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
                    ) : (
                      !editing && <p className="px-4 py-3 text-sm text-muted">No items in this module yet.</p>
                    )}
                    {editing && (
                      <div className="px-4 pb-4">
                        <AddItem action={addItem.bind(null, unit.id)} />
                      </div>
                    )}
                  </details>
                </li>
              );
            })}
          </ol>

          {editing && <AddUnit action={addUnit.bind(null, course.id)} />}
        </section>

        <aside className="grid content-start gap-8" aria-label="Course overview">
          <section className="panel">
            <h2 className="panel-title">Your progress</h2>
            <p className="mb-2 font-serif text-3xl font-bold tabular-nums">
              {overall.pct}%
              <span className="ml-2 font-sans text-sm font-normal text-muted">
                {overall.completed} of {overall.total} items
              </span>
            </p>
            <ProgressBar pct={overall.pct} color={course.color} label="Course progress" />
            {totalMinutes > 0 && <p className="mt-2 text-xs text-muted">About {formatMinutes(totalMinutes)} of work in total.</p>}
          </section>

          <section className="panel">
            <h2 className="panel-title">{todaysClass ? "Class today" : "Next class"}</h2>
            {upcomingClass ? (
              <div className="grid gap-1 text-sm">
                <p className={todaysClass ? "font-semibold" : ""}>
                  {todaysClass ? <span className="today-mark">Today</span> : formatDate(upcomingClass.date, "EEEE, MMM d")}
                </p>
                {upcomingClass.start && (
                  <p className="flex items-center gap-1.5 text-muted">
                    <IconClock className="size-4" />
                    {formatTimeRange(upcomingClass.start, upcomingClass.end)}
                  </p>
                )}
                {upcomingClass.location && (
                  <p className="flex items-center gap-1.5 text-muted">
                    <IconPin className="size-4" />
                    <LocationText location={upcomingClass.location} />
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">No weekly class days set.</p>
            )}
            {canEdit && (
              <Link href={`/courses/${id}/settings#schedule`} className="link mt-2 inline-block text-sm">
                {course.meetings.length ? "Edit class schedule" : "Set class days"}
              </Link>
            )}
          </section>

          {upNext.length > 0 && (
            <section className="panel">
              <h2 className="panel-title">Up next</h2>
              <ul className="grid gap-2 text-sm">
                {upNext.map((t) => (
                  <li key={t.id} className="flex items-start gap-2">
                    <span className="mt-0.5"><KindBadge kind={t.kind} /></span>
                    <span className="min-w-0">
                      <span className="block leading-snug">{t.title}</span>
                      {t.due && (
                        <span className="text-xs">
                          <DueLabel due={t.due} done={false} today={today} />
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

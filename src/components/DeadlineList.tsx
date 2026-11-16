import Link from "next/link";
import { courseCode } from "@/lib/course-style";
import type { Deadline } from "@/lib/progress";
import { DueLabel, KindBadge } from "./badges";
import { IconOther } from "./icons";

/** LMS-style to-do list: type icon, title, course code, due status. */
export function DeadlineList({ deadlines, today, empty }: { deadlines: Deadline[]; today: string; empty: string }) {
  if (deadlines.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line">
      {deadlines.map((d) => (
        <li key={`${d.kind}-${d.id}`} className="flex gap-3 py-2.5">
          <span className="mt-0.5">{d.itemKind ? <KindBadge kind={d.itemKind} /> : <IconOther className="size-[18px] text-muted" />}</span>
          <div className="min-w-0 text-sm">
            <Link
              href={`/courses/${d.courseId}`}
              className={`block leading-snug font-semibold hover:underline ${d.done ? "text-muted line-through" : "text-accent"}`}
            >
              {d.title}
            </Link>
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full" style={{ background: d.color }} aria-hidden />
                {courseCode(d.courseTitle, d.courseId)}
              </span>
              <DueLabel due={d.due} done={d.done} today={today} />
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

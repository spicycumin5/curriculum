import Link from "next/link";
import type { Deadline } from "@/lib/progress";
import { DueLabel, KindBadge } from "./badges";

export function DeadlineList({ deadlines, today, empty }: { deadlines: Deadline[]; today: string; empty: string }) {
  if (deadlines.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="grid gap-3">
      {deadlines.map((d) => (
        <li key={`${d.kind}-${d.id}`} className="flex gap-3">
          <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: d.color }} aria-hidden />
          <div className="min-w-0 text-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              {d.itemKind && <KindBadge kind={d.itemKind} />}
              <Link href={`/courses/${d.courseId}`} className={`font-medium hover:underline ${d.done ? "text-muted line-through" : ""}`}>
                {d.title}
              </Link>
            </div>
            <p className="truncate text-xs text-muted">
              {d.courseTitle}
              {d.kind === "item" && <> · {d.unitTitle}</>}
            </p>
            <p className="text-xs">
              <DueLabel due={d.due} done={d.done} today={today} />
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

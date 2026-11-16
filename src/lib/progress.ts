import type { CourseWithContent, ItemKind, UnitWithItems } from "./types";
import { effectiveDue } from "./dates";

export interface Progress {
  total: number;
  completed: number;
  pct: number; // 0..100, integer
}

export function progressOf(itemIds: string[], done: ReadonlySet<string>): Progress {
  const total = itemIds.length;
  const completed = itemIds.filter((id) => done.has(id)).length;
  return { total, completed, pct: total === 0 ? 0 : Math.round((completed / total) * 100) };
}

export function unitProgress(unit: UnitWithItems, done: ReadonlySet<string>): Progress {
  return progressOf(unit.items.map((i) => i.id), done);
}

export function courseProgress(course: { units: UnitWithItems[] }, done: ReadonlySet<string>): Progress {
  return progressOf(course.units.flatMap((u) => u.items.map((i) => i.id)), done);
}

export interface Deadline {
  kind: "item" | "unit";
  id: string;
  title: string;
  due: string;
  done: boolean;
  courseId: string;
  courseTitle: string;
  color: string;
  unitTitle: string;
  itemKind?: ItemKind;
  url?: string | null;
}

/** Every dated item (effective due) plus every dated unit, across courses. */
export function collectDeadlines(courses: CourseWithContent[], done: ReadonlySet<string>): Deadline[] {
  const out: Deadline[] = [];
  for (const c of courses) {
    for (const u of c.units) {
      if (u.due_date) {
        const p = unitProgress(u, done);
        out.push({
          kind: "unit",
          id: u.id,
          title: `${u.title} (unit due)`,
          due: u.due_date,
          done: p.total > 0 && p.completed === p.total,
          courseId: c.id,
          courseTitle: c.title,
          color: c.color,
          unitTitle: u.title,
        });
      }
      for (const i of u.items) {
        const due = effectiveDue(i, u);
        if (!due) continue;
        out.push({
          kind: "item",
          id: i.id,
          title: i.title,
          due,
          done: done.has(i.id),
          courseId: c.id,
          courseTitle: c.title,
          color: c.color,
          unitTitle: u.title,
          itemKind: i.kind,
          url: i.url,
        });
      }
    }
  }
  return out.sort((a, b) => a.due.localeCompare(b.due) || a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title));
}

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CourseWithContent, Item, Meeting, Role, UnitWithItems } from "./types";

// item_progress is RLS-filtered to the current user, so a non-empty array = "I completed it".
// Embedding progress in the course query also avoids PostgREST's top-level row cap.
const COURSE_SELECT = `
  id, owner_id, title, description, color, start_date, end_date, created_at,
  course_members!inner(user_id, role),
  course_meetings(id, course_id, weekday, start_time, end_time, location),
  units(
    id, course_id, title, description, position, start_date, due_date,
    items(id, unit_id, title, kind, url, notes, est_minutes, due_date, position, item_progress(item_id))
  )
`;

type Row = Record<string, unknown>;

export interface CoursesResult {
  courses: CourseWithContent[];
  done: Set<string>;
}

/** Courses the user belongs to (optionally one), with units, items and the user's completed item ids. */
export async function getCourses(
  supabase: SupabaseClient,
  userId: string,
  courseId?: string,
): Promise<CoursesResult> {
  let q = supabase
    .from("courses")
    .select(COURSE_SELECT)
    .eq("course_members.user_id", userId)
    .order("created_at", { ascending: true });
  if (courseId) q = q.eq("id", courseId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const done = new Set<string>();
  const courses = (data ?? []).map((row: Row) => {
    const members = row.course_members as { role: Role }[];
    const units = ((row.units as Row[]) ?? [])
      .map((u) => {
        const items = ((u.items as Row[]) ?? [])
          .map((i) => {
            const { item_progress, ...item } = i as Row & { item_progress: unknown[] };
            if (Array.isArray(item_progress) && item_progress.length > 0) done.add(item.id as string);
            return item as unknown as Item;
          })
          .sort(byPosition);
        return { ...(u as object), items } as UnitWithItems;
      })
      .sort(byPosition);
    const { course_members: _m, units: _u, course_meetings, ...course } = row;
    const meetings = ((course_meetings as Meeting[]) ?? []).sort(
      (a, b) => a.weekday - b.weekday || (a.start_time ?? "").localeCompare(b.start_time ?? ""),
    );
    return { ...(course as object), role: members[0]?.role ?? "viewer", units, meetings } as CourseWithContent;
  });
  return { courses, done };
}

function byPosition(a: { position: number }, b: { position: number }) {
  return a.position - b.position;
}

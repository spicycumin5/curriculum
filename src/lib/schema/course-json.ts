import { z } from "zod";
import type { Course, UnitWithItems } from "../types";

/**
 * Course import/export format. Single source of truth for:
 *  - the in-app import page, the CLI importer (scripts/import-course.ts),
 *  - manual edit forms (item/unit/course field rules),
 *  - JSON that Claude writes into curricula/*.json.
 * Documented in docs/course-format.md.
 */

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Not a real date");

const optionalText = (max: number) => z.string().trim().max(max).nullish();

export const itemJson = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  kind: z.enum(["read", "watch", "do", "other"]).default("read"),
  url: z.url({ protocol: /^https?$/, error: "URL must start with http:// or https://" }).nullish(),
  notes: optionalText(5000),
  est_minutes: z.number().int().min(0).max(100000).nullish(),
  due_date: isoDate.nullish(),
});

export const unitJson = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    description: optionalText(5000),
    start_date: isoDate.nullish(),
    due_date: isoDate.nullish(),
    items: z.array(itemJson).max(500).default([]),
  })
  .refine((u) => !u.start_date || !u.due_date || u.due_date >= u.start_date, {
    message: "due_date must be on or after start_date",
    path: ["due_date"],
  });

export const courseJson = z
  .object({
    version: z.literal(1).optional(),
    title: z.string().trim().min(1, "Title is required").max(200),
    description: optionalText(5000),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #4f46e5")
      .nullish(),
    start_date: isoDate.nullish(),
    end_date: isoDate.nullish(),
    units: z.array(unitJson).max(200).default([]),
  })
  .refine((c) => !c.start_date || !c.end_date || c.end_date >= c.start_date, {
    message: "end_date must be on or after start_date",
    path: ["end_date"],
  });

export type CourseJson = z.infer<typeof courseJson>;
export type UnitJson = z.infer<typeof unitJson>;
export type ItemJson = z.infer<typeof itemJson>;

/** Human-readable list of validation problems, e.g. "units.2.items.0.url: URL must start with http..." */
export function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message));
}

export function parseCourseJson(text: string):
  | { ok: true; data: CourseJson }
  | { ok: false; errors: string[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, errors: [`Invalid JSON: ${(e as Error).message}`] };
  }
  const res = courseJson.safeParse(raw);
  return res.success ? { ok: true, data: res.data } : { ok: false, errors: formatIssues(res.error) };
}

/** Strip nulls/empties so exported files stay tidy and diff-friendly. */
function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== ""),
  ) as Partial<T>;
}

export function toCourseJson(course: Course, units: UnitWithItems[]) {
  return {
    version: 1 as const,
    ...compact({
      title: course.title,
      description: course.description,
      color: course.color,
      start_date: course.start_date,
      end_date: course.end_date,
    }),
    units: [...units]
      .sort((a, b) => a.position - b.position)
      .map((u) => ({
        ...compact({
          title: u.title,
          description: u.description,
          start_date: u.start_date,
          due_date: u.due_date,
        }),
        items: [...u.items]
          .sort((a, b) => a.position - b.position)
          .map((i) =>
            compact({
              title: i.title,
              kind: i.kind,
              url: i.url,
              notes: i.notes,
              est_minutes: i.est_minutes,
              due_date: i.due_date,
            }),
          ),
      })),
  };
}

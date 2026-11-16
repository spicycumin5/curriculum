import { describe, expect, it } from "vitest";
import { daysUntil, dueStatus, effectiveDue, relativeDue, todayISO } from "../dates";
import { collectDeadlines, courseProgress, progressOf } from "../progress";
import type { CourseWithContent } from "../types";

describe("dates", () => {
  it("item due date falls back to unit due date", () => {
    expect(effectiveDue({ due_date: "2026-12-01" }, { due_date: "2026-12-09" })).toBe("2026-12-01");
    expect(effectiveDue({ due_date: null }, { due_date: "2026-12-09" })).toBe("2026-12-09");
    expect(effectiveDue({ due_date: null }, { due_date: null })).toBeNull();
  });

  it("classifies due status", () => {
    const today = "2026-11-15";
    expect(dueStatus("2026-11-14", false, today)).toBe("overdue");
    expect(dueStatus("2026-11-15", false, today)).toBe("today");
    expect(dueStatus("2026-11-22", false, today)).toBe("soon");
    expect(dueStatus("2026-11-23", false, today)).toBe("later");
    expect(dueStatus("2026-11-01", true, today)).toBe("done");
    expect(dueStatus(null, false, today)).toBe("none");
  });

  it("describes relative due dates", () => {
    expect(relativeDue("2026-11-15", "2026-11-15")).toBe("Due today");
    expect(relativeDue("2026-11-16", "2026-11-15")).toBe("Due tomorrow");
    expect(relativeDue("2026-11-13", "2026-11-15")).toBe("2 days overdue");
    expect(daysUntil("2027-01-01", "2026-12-31")).toBe(1);
  });

  it("computes today in a time zone", () => {
    const instant = new Date("2026-11-16T03:00:00Z");
    expect(todayISO("UTC", instant)).toBe("2026-11-16");
    expect(todayISO("America/Los_Angeles", instant)).toBe("2026-11-15");
    expect(todayISO("Not/AZone", instant)).toBe("2026-11-16");
  });
});

describe("progress", () => {
  const course: CourseWithContent = {
    id: "c1",
    owner_id: "o",
    title: "C",
    description: null,
    color: "#000000",
    start_date: null,
    end_date: null,
    created_at: "",
    role: "owner",
    meetings: [],
    units: [
      {
        id: "u1",
        course_id: "c1",
        title: "U1",
        description: null,
        position: 0,
        start_date: null,
        due_date: "2026-11-20",
        items: [
          { id: "a", unit_id: "u1", title: "A", kind: "read", url: null, notes: null, est_minutes: null, due_date: null, position: 0 },
          { id: "b", unit_id: "u1", title: "B", kind: "do", url: null, notes: null, est_minutes: null, due_date: "2026-11-18", position: 1 },
        ],
      },
      {
        id: "u2",
        course_id: "c1",
        title: "U2",
        description: null,
        position: 1,
        start_date: null,
        due_date: null,
        items: [{ id: "c", unit_id: "u2", title: "C", kind: "watch", url: null, notes: null, est_minutes: null, due_date: null, position: 0 }],
      },
    ],
  };

  it("counts completion", () => {
    expect(progressOf([], new Set())).toEqual({ total: 0, completed: 0, pct: 0 });
    expect(courseProgress(course, new Set(["a"]))).toEqual({ total: 3, completed: 1, pct: 33 });
  });

  it("collects dated deadlines sorted by date, skipping undated items", () => {
    const d = collectDeadlines([course], new Set(["a", "b"]));
    expect(d.map((x) => [x.kind, x.id, x.due])).toEqual([
      ["item", "b", "2026-11-18"],
      ["item", "a", "2026-11-20"],
      ["unit", "u1", "2026-11-20"],
    ]);
    expect(d.find((x) => x.kind === "unit")?.done).toBe(true);
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCourseJson, toCourseJson } from "../schema/course-json";
import type { Course, UnitWithItems } from "../types";

const valid = {
  title: "Linear Algebra",
  start_date: "2026-12-01",
  end_date: "2027-01-31",
  units: [
    {
      title: "Vectors",
      due_date: "2026-12-08",
      items: [
        { title: "Watch ch. 1", kind: "watch", url: "https://example.com/v", est_minutes: 15 },
        { title: "Exercises" },
      ],
    },
  ],
};

describe("parseCourseJson", () => {
  it("accepts a valid course and applies defaults", () => {
    const res = parseCourseJson(JSON.stringify(valid));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.units[0].items[1].kind).toBe("read");
  });

  it("accepts a course with no units", () => {
    expect(parseCourseJson('{"title":"Empty"}').ok).toBe(true);
  });

  it("reports malformed JSON", () => {
    const res = parseCourseJson("{ nope");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors[0]).toMatch(/Invalid JSON/);
  });

  it.each([
    ["missing title", { ...valid, title: "" }, /title/],
    ["bad date", { ...valid, start_date: "2026-02-30" }, /start_date/],
    ["end before start", { ...valid, end_date: "2026-11-01" }, /end_date/],
    ["bad color", { ...valid, color: "red" }, /color/],
    ["unknown kind", { ...valid, units: [{ title: "U", items: [{ title: "x", kind: "listen" }] }] }, /units\.0\.items\.0\.kind/],
    ["javascript: url", { ...valid, units: [{ title: "U", items: [{ title: "x", url: "javascript:alert(1)" }] }] }, /url/],
    ["negative minutes", { ...valid, units: [{ title: "U", items: [{ title: "x", est_minutes: -5 }] }] }, /est_minutes/],
    ["unit due before start", { ...valid, units: [{ title: "U", start_date: "2026-12-10", due_date: "2026-12-01" }] }, /due_date/],
  ])("rejects %s", (_name, input, pattern) => {
    const res = parseCourseJson(JSON.stringify(input));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.join("\n")).toMatch(pattern);
  });

  it("validates the bundled example curriculum", () => {
    const res = parseCourseJson(readFileSync("curricula/example-linear-algebra.json", "utf8"));
    if (!res.ok) throw new Error(res.errors.join("\n"));
  });
});

describe("toCourseJson", () => {
  it("round-trips through the parser, ordered by position, without nulls", () => {
    const course: Course = {
      id: "c",
      owner_id: "o",
      title: "T",
      description: null,
      color: "#123456",
      start_date: "2026-12-01",
      end_date: null,
      created_at: "",
    };
    const units: UnitWithItems[] = [
      { id: "u2", course_id: "c", title: "Second", description: null, position: 1, start_date: null, due_date: null, items: [] },
      {
        id: "u1",
        course_id: "c",
        title: "First",
        description: "d",
        position: 0,
        start_date: null,
        due_date: "2026-12-05",
        items: [
          { id: "i2", unit_id: "u1", title: "B", kind: "do", url: null, notes: null, est_minutes: null, due_date: null, position: 1 },
          { id: "i1", unit_id: "u1", title: "A", kind: "read", url: "https://x.y", notes: null, est_minutes: 10, due_date: null, position: 0 },
        ],
      },
    ];
    const out = toCourseJson(course, units);
    expect(out.units.map((u) => u.title)).toEqual(["First", "Second"]);
    expect(out.units[0].items.map((i) => i.title)).toEqual(["A", "B"]);
    expect(out).not.toHaveProperty("description");
    expect(out).not.toHaveProperty("end_date");
    const res = parseCourseJson(JSON.stringify(out));
    expect(res.ok).toBe(true);
  });
});

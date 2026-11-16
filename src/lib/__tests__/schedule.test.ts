import { describe, expect, it } from "vitest";
import { nextItems } from "../progress";
import { parseCourseJson, toCourseJson } from "../schema/course-json";
import { formatTime, formatTimeRange, isoWeekday, nextSession, sessionsBetween, sessionsOn, summarizeSchedule } from "../schedule";
import type { Meeting, UnitWithItems } from "../types";

const meeting = (weekday: number, start: string | null = null, end: string | null = null, id = `m${weekday}${start}`): Meeting => ({
  id,
  course_id: "c",
  weekday,
  start_time: start ? `${start}:00` : null,
  end_time: end ? `${end}:00` : null,
  location: null,
});

const course = (meetings: Meeting[], start_date: string | null = null, end_date: string | null = null) => ({
  id: "c",
  title: "Rust",
  color: "#123456",
  start_date,
  end_date,
  meetings,
});

describe("time formatting", () => {
  it("formats 12-hour times", () => {
    expect(formatTime("00:05:00")).toBe("12:05 AM");
    expect(formatTime("09:00")).toBe("9:00 AM");
    expect(formatTime("12:30")).toBe("12:30 PM");
    expect(formatTime("23:59:00")).toBe("11:59 PM");
    expect(formatTime(null)).toBeNull();
  });

  it("formats ranges", () => {
    expect(formatTimeRange("09:00", "10:15")).toBe("9:00 AM – 10:15 AM");
    expect(formatTimeRange("09:00", null)).toBe("9:00 AM");
    expect(formatTimeRange(null, null)).toBeNull();
  });
});

describe("summarizeSchedule", () => {
  it("groups days with the same time", () => {
    expect(summarizeSchedule([meeting(5, "09:00", "10:00"), meeting(1, "09:00", "10:00"), meeting(3, "09:00", "10:00")])).toBe(
      "Mon, Wed, Fri at 9:00 AM – 10:00 AM",
    );
  });
  it("lists different times separately", () => {
    expect(summarizeSchedule([meeting(1, "09:00"), meeting(4, "14:00", "15:30")])).toBe("Mon at 9:00 AM; Thu at 2:00 PM – 3:30 PM");
  });
  it("handles untimed days and empty schedules", () => {
    expect(summarizeSchedule([meeting(2), meeting(4)])).toBe("Tue, Thu");
    expect(summarizeSchedule([])).toBeNull();
  });
});

describe("sessions", () => {
  // 2026-11-16 is a Monday
  it("knows ISO weekdays", () => {
    expect(isoWeekday("2026-11-16")).toBe(1);
    expect(isoWeekday("2026-11-22")).toBe(7);
  });

  it("finds sessions on a date, sorted by time", () => {
    const c = course([meeting(1, "14:00"), meeting(1, "09:00"), meeting(3, "09:00")]);
    expect(sessionsOn([c], "2026-11-16").map((s) => s.start)).toEqual(["09:00", "14:00"]);
    expect(sessionsOn([c], "2026-11-17")).toEqual([]);
  });

  it("respects the course start and end dates", () => {
    const c = course([meeting(1, "09:00")], "2026-11-20", "2026-12-07");
    expect(sessionsOn([c], "2026-11-16")).toEqual([]);
    expect(sessionsOn([c], "2026-11-23")).toHaveLength(1);
    expect(sessionsOn([c], "2026-12-07")).toHaveLength(1);
    expect(sessionsOn([c], "2026-12-14")).toEqual([]);
  });

  it("collects sessions for a week", () => {
    const c = course([meeting(1), meeting(3), meeting(5)]);
    const map = sessionsBetween([c], "2026-11-16", "2026-11-22");
    expect([...map.keys()]).toEqual(["2026-11-16", "2026-11-18", "2026-11-20"]);
  });

  it("finds the next session after a date", () => {
    const c = course([meeting(3, "10:00")], null, "2026-11-30");
    expect(nextSession(c, "2026-11-16")?.date).toBe("2026-11-18");
    expect(nextSession(c, "2026-11-18")?.date).toBe("2026-11-25");
    expect(nextSession(c, "2026-11-25")).toBeNull();
    expect(nextSession(course([]), "2026-11-16")).toBeNull();
  });
});

describe("schedule in course JSON", () => {
  it("accepts a schedule and rejects bad entries", () => {
    const ok = parseCourseJson(JSON.stringify({ title: "T", schedule: [{ day: "mon", start: "09:00", end: "10:00" }, { day: "thu" }] }));
    expect(ok.ok).toBe(true);
    for (const bad of [{ day: "monday" }, { day: "mon", start: "9am" }, { day: "mon", start: "10:00", end: "09:00" }]) {
      const res = parseCourseJson(JSON.stringify({ title: "T", schedule: [bad] }));
      expect(res.ok).toBe(false);
    }
  });

  it("exports meetings as a schedule that parses back", () => {
    const out = toCourseJson(
      { id: "c", owner_id: "o", title: "T", description: null, color: "#123456", start_date: null, end_date: null, created_at: "" },
      [],
      [meeting(3, "13:00", "14:00"), { ...meeting(1), location: "Library" }],
    );
    expect(out.schedule).toEqual([{ day: "mon", location: "Library" }, { day: "wed", start: "13:00", end: "14:00" }]);
    expect(parseCourseJson(JSON.stringify(out)).ok).toBe(true);
  });
});

describe("nextItems", () => {
  const units: UnitWithItems[] = [
    {
      id: "u1", course_id: "c", title: "U1", description: null, position: 0, start_date: null, due_date: "2026-11-20",
      items: [
        { id: "a", unit_id: "u1", title: "A", kind: "read", url: null, notes: null, est_minutes: null, due_date: null, position: 0 },
        { id: "b", unit_id: "u1", title: "B", kind: "do", url: null, notes: null, est_minutes: null, due_date: "2026-11-18", position: 1 },
      ],
    },
    {
      id: "u2", course_id: "c", title: "U2", description: null, position: 1, start_date: null, due_date: null,
      items: [{ id: "c", unit_id: "u2", title: "C", kind: "watch", url: null, notes: null, est_minutes: null, due_date: null, position: 0 }],
    },
  ];

  it("orders unfinished items by due date, undated last, skipping done ones", () => {
    expect(nextItems({ units }, new Set()).map((i) => i.id)).toEqual(["b", "a", "c"]);
    expect(nextItems({ units }, new Set(["b"]), 2).map((i) => i.id)).toEqual(["a", "c"]);
  });
});

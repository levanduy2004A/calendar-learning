import { describe, expect, it } from "vitest";
import {
  expandRecurrenceSchedule,
  isSubjectScheduledOn,
  matchesRecurrence,
  rangeBounds,
  subjectsOnDate,
} from "./schedules";
import type { SubjectSchedule } from "./types";

function schedule(partial: Partial<SubjectSchedule> & { subjectId: string }): SubjectSchedule {
  return {
    enabled: true,
    mode: "recurrence",
    pattern: "weekdays",
    weekdays: [0, 2, 4],
    range: "this_month",
    anchorDate: "2026-09-01",
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

describe("recurrence", () => {
  it("matches weekdays T2 T4 T6", () => {
    expect(matchesRecurrence("weekdays", [0, 2, 4], "2026-09-07", "2026-09-01")).toBe(true);
    expect(matchesRecurrence("weekdays", [0, 2, 4], "2026-09-08", "2026-09-01")).toBe(false);
    expect(matchesRecurrence("weekdays", [0, 2, 4], "2026-09-09", "2026-09-01")).toBe(true);
  });

  it("matches daily every day in range", () => {
    const s = schedule({ subjectId: "sub_a", pattern: "daily", range: "this_week" });
    const dates = expandRecurrenceSchedule(s, "2026-09-03");
    expect(dates.has("2026-09-01")).toBe(true);
    expect(dates.has("2026-09-06")).toBe(true);
    expect(dates.size).toBe(7);
  });

  it("respects until_date range end", () => {
    const { start, end } = rangeBounds("until_date", "2026-09-01", "2026-09-10");
    expect(start).toBe("2026-09-01");
    expect(end).toBe("2026-09-10");
    const s = schedule({
      subjectId: "sub_a",
      pattern: "daily",
      range: "until_date",
      untilDate: "2026-09-05",
    });
    const dates = expandRecurrenceSchedule(s, "2026-09-01");
    expect(dates.has("2026-09-05")).toBe(true);
    expect(dates.has("2026-09-06")).toBe(false);
  });

  it("manual dates only hit selected days", () => {
    const s = schedule({
      subjectId: "sub_a",
      mode: "manual",
      manualDates: ["2026-09-02", "2026-09-04", "2026-09-09"],
    });
    const state = {
      subjects: [{ id: "sub_a", name: "A", accent: "green" as const, icon: "book" as const, createdAt: 1 }],
      schedules: { sub_a: s },
    };
    expect(isSubjectScheduledOn(state, "sub_a", "2026-09-02", "2026-09-01")).toBe(true);
    expect(isSubjectScheduledOn(state, "sub_a", "2026-09-03", "2026-09-01")).toBe(false);
    expect(subjectsOnDate(state, "2026-09-09", "2026-09-01")).toHaveLength(1);
  });

  it("disabled schedule never assigns", () => {
    const s = schedule({ subjectId: "sub_a", enabled: false });
    const state = {
      subjects: [{ id: "sub_a", name: "A", accent: "green" as const, icon: "book" as const, createdAt: 1 }],
      schedules: { sub_a: s },
    };
    expect(isSubjectScheduledOn(state, "sub_a", "2026-09-01", "2026-09-01")).toBe(false);
  });
});

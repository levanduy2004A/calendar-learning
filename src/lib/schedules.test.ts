import { describe, expect, it } from "vitest";
import {
  canSaveSchedule,
  expandRecurrenceSchedule,
  finalizeRecurrenceSchedule,
  finalizeScheduleForSave,
  isRecurrenceScheduleValid,
  isScheduleExpiredOn,
  isSubjectScheduledOn,
  matchesRecurrence,
  rangeBounds,
  subjectsOnDate,
} from "./schedules";
import type { SubjectSchedule } from "./types";

function schedule(partial: Partial<SubjectSchedule> & { subjectId: string }): SubjectSchedule {
  return finalizeRecurrenceSchedule(
    {
      enabled: true,
      mode: "recurrence",
      pattern: "weekdays",
      weekdays: [0, 2, 4],
      range: "this_month",
      anchorDate: "2026-09-15",
      createdAt: 1,
      updatedAt: 1,
      ...partial,
    },
    partial.anchorDate ?? "2026-09-15",
  );
}

describe("recurrence", () => {
  it("matches weekdays T2 T4 T6", () => {
    expect(matchesRecurrence("weekdays", [0, 2, 4], "2026-09-07", "2026-09-01")).toBe(true);
    expect(matchesRecurrence("weekdays", [0, 2, 4], "2026-09-08", "2026-09-01")).toBe(false);
    expect(matchesRecurrence("weekdays", [0, 2, 4], "2026-09-09", "2026-09-01")).toBe(true);
    expect(matchesRecurrence("weekdays", [], "2026-09-07", "2026-09-01")).toBe(false);
  });

  it("freezes this_month at save — September save does not schedule October", () => {
    const saved = finalizeRecurrenceSchedule(
      {
        subjectId: "sub_a",
        enabled: true,
        mode: "recurrence",
        pattern: "weekdays",
        weekdays: [0, 2, 4],
        range: "this_month",
        anchorDate: "2026-09-15",
        createdAt: 1,
        updatedAt: 1,
      },
      "2026-09-15",
    );
    expect(saved.rangeStart).toBe("2026-09-01");
    expect(saved.rangeEnd).toBe("2026-09-30");

    const state = {
      subjects: [{ id: "sub_a", name: "A", accent: "green" as const, icon: "book" as const, createdAt: 1 }],
      schedules: { sub_a: saved },
    };
    expect(isSubjectScheduledOn(state, "sub_a", "2026-09-16")).toBe(true);
    expect(isSubjectScheduledOn(state, "sub_a", "2026-10-01")).toBe(false);
    expect(isScheduleExpiredOn(saved, "2026-10-01")).toBe(true);

    const septDates = expandRecurrenceSchedule(saved);
    expect(septDates.has("2026-10-01")).toBe(false);
    expect(septDates.has("2026-09-16")).toBe(true);
  });

  it("matches daily every day in frozen week range", () => {
    const s = schedule({
      subjectId: "sub_a",
      pattern: "daily",
      range: "this_week",
      anchorDate: "2026-09-03",
    });
    const dates = expandRecurrenceSchedule(s);
    expect(dates.has("2026-09-01")).toBe(true);
    expect(dates.has("2026-09-06")).toBe(true);
    expect(dates.size).toBe(7);
    expect(dates.has("2026-09-07")).toBe(false);
  });

  it("respects until_date range end frozen at save", () => {
    const { start, end } = rangeBounds("until_date", "2026-09-01", "2026-09-10");
    expect(start).toBe("2026-09-01");
    expect(end).toBe("2026-09-10");
    const s = finalizeRecurrenceSchedule(
      {
        subjectId: "sub_a",
        enabled: true,
        mode: "recurrence",
        pattern: "daily",
        range: "until_date",
        untilDate: "2026-09-05",
        anchorDate: "2026-09-01",
        createdAt: 1,
        updatedAt: 1,
      },
      "2026-09-01",
    );
    const dates = expandRecurrenceSchedule(s);
    expect(dates.has("2026-09-05")).toBe(true);
    expect(dates.has("2026-09-06")).toBe(false);
  });

  it("manual dates only hit selected days", () => {
    const s: SubjectSchedule = {
      subjectId: "sub_a",
      enabled: true,
      mode: "manual",
      manualDates: ["2026-09-02", "2026-09-04", "2026-09-09"],
      anchorDate: "2026-09-01",
      createdAt: 1,
      updatedAt: 1,
    };
    const state = {
      subjects: [{ id: "sub_a", name: "A", accent: "green" as const, icon: "book" as const, createdAt: 1 }],
      schedules: { sub_a: s },
    };
    expect(isSubjectScheduledOn(state, "sub_a", "2026-09-02")).toBe(true);
    expect(isSubjectScheduledOn(state, "sub_a", "2026-09-03")).toBe(false);
    expect(subjectsOnDate(state, "2026-09-09")).toHaveLength(1);
  });

  it("disabled schedule never assigns", () => {
    const s = schedule({ subjectId: "sub_a", enabled: false });
    const state = {
      subjects: [{ id: "sub_a", name: "A", accent: "green" as const, icon: "book" as const, createdAt: 1 }],
      schedules: { sub_a: s },
    };
    expect(isSubjectScheduledOn(state, "sub_a", "2026-09-15")).toBe(false);
  });
});

describe("weekday validation", () => {
  it("rejects weekdays pattern with zero chips", () => {
    const draft: SubjectSchedule = {
      subjectId: "sub_a",
      enabled: true,
      mode: "recurrence",
      pattern: "weekdays",
      weekdays: [],
      range: "this_month",
      anchorDate: "2026-09-01",
      createdAt: 1,
      updatedAt: 1,
    };
    expect(isRecurrenceScheduleValid(draft)).toBe(false);
    expect(canSaveSchedule(draft)).toBe(false);
    expect(finalizeScheduleForSave(draft, "2026-09-01")).toBeNull();
  });

  it("accepts weekdays pattern with at least one chip", () => {
    const draft: SubjectSchedule = {
      subjectId: "sub_a",
      enabled: true,
      mode: "recurrence",
      pattern: "weekdays",
      weekdays: [1],
      range: "this_month",
      anchorDate: "2026-09-01",
      createdAt: 1,
      updatedAt: 1,
    };
    expect(isRecurrenceScheduleValid(draft)).toBe(true);
    const saved = finalizeScheduleForSave(draft, "2026-09-01");
    expect(saved?.enabled).toBe(true);
    expect(saved?.rangeStart).toBe("2026-09-01");
  });
});

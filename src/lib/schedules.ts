import {
  addDays,
  daysInMonth,
  parseISODate,
  startOfWeekMonday,
  weekdayIndexMon0,
} from "./dates";
import type {
  AppState,
  RecurrencePattern,
  ScheduleRangeKind,
  Subject,
  SubjectSchedule,
} from "./types";

export function endOfWeekSunday(monday: string): string {
  return addDays(monday, 6);
}

export function endOfMonth(iso: string): string {
  const { y, m } = parseISODate(iso);
  const last = daysInMonth(y, m);
  return `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

export function endOfYear(iso: string): string {
  const { y } = parseISODate(iso);
  return `${y}-12-31`;
}

export function rangeBounds(
  range: ScheduleRangeKind,
  savedOn: string,
  untilDate?: string,
): { start: string; end: string } {
  switch (range) {
    case "this_week": {
      const start = startOfWeekMonday(savedOn);
      return { start, end: endOfWeekSunday(start) };
    }
    case "this_month":
      return {
        start: `${parseISODate(savedOn).y}-${String(parseISODate(savedOn).m).padStart(2, "0")}-01`,
        end: endOfMonth(savedOn),
      };
    case "this_year":
      return {
        start: `${parseISODate(savedOn).y}-01-01`,
        end: endOfYear(savedOn),
      };
    case "until_date":
      return {
        start: savedOn,
        end: untilDate && untilDate >= savedOn ? untilDate : savedOn,
      };
  }
}

export function matchesRecurrence(
  pattern: RecurrencePattern,
  weekdays: number[] | undefined,
  date: string,
  anchorDate: string,
): boolean {
  const anchor = parseISODate(anchorDate);
  const { m, d } = parseISODate(date);
  switch (pattern) {
    case "daily":
      return true;
    case "weekdays": {
      const set = new Set(weekdays ?? []);
      return set.size > 0 && set.has(weekdayIndexMon0(date));
    }
    case "monthly":
      return d === anchor.d;
    case "yearly":
      return m === anchor.m && d === anchor.d;
  }
}

export function isRecurrenceScheduleValid(schedule: SubjectSchedule): boolean {
  if (schedule.mode !== "recurrence") return true;
  if (schedule.pattern === "weekdays") {
    return (schedule.weekdays?.length ?? 0) > 0;
  }
  return true;
}

export function isManualScheduleValid(schedule: SubjectSchedule): boolean {
  if (schedule.mode !== "manual") return true;
  return (schedule.manualDates?.length ?? 0) > 0;
}

export function canSaveSchedule(schedule: SubjectSchedule): boolean {
  if (schedule.mode === "manual") return isManualScheduleValid(schedule);
  return isRecurrenceScheduleValid(schedule);
}

/** Freeze phạm vi at save time using the calendar week/month/year of savedOn. */
export function finalizeRecurrenceSchedule(
  schedule: SubjectSchedule,
  savedOn: string,
): SubjectSchedule {
  const range = schedule.range ?? "this_month";
  const { start, end } = rangeBounds(range, savedOn, schedule.untilDate);
  return {
    ...schedule,
    enabled: true,
    anchorDate: savedOn,
    rangeStart: start,
    rangeEnd: end,
    updatedAt: Date.now(),
  };
}

export function finalizeManualSchedule(
  schedule: SubjectSchedule,
  savedOn: string,
): SubjectSchedule {
  return {
    ...schedule,
    enabled: true,
    anchorDate: savedOn,
    updatedAt: Date.now(),
  };
}

export function finalizeScheduleForSave(
  schedule: SubjectSchedule,
  savedOn: string,
): SubjectSchedule | null {
  if (!canSaveSchedule(schedule)) return null;
  if (schedule.mode === "manual") {
    return finalizeManualSchedule(schedule, savedOn);
  }
  return finalizeRecurrenceSchedule(schedule, savedOn);
}

export function ensureScheduleRange(
  schedule: SubjectSchedule,
): SubjectSchedule {
  if (schedule.mode !== "recurrence") return schedule;
  if (schedule.rangeStart && schedule.rangeEnd) return schedule;
  const savedOn = schedule.anchorDate;
  const range = schedule.range ?? "this_month";
  const { start, end } = rangeBounds(range, savedOn, schedule.untilDate);
  return { ...schedule, rangeStart: start, rangeEnd: end };
}

function frozenRange(schedule: SubjectSchedule): { start: string; end: string } {
  const normalized = ensureScheduleRange(schedule);
  return {
    start: normalized.rangeStart!,
    end: normalized.rangeEnd!,
  };
}

export function datesInRange(start: string, end: string): string[] {
  const out: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

export function expandRecurrenceSchedule(schedule: SubjectSchedule): Set<string> {
  if (!schedule.enabled || schedule.mode !== "recurrence") return new Set();
  const pattern = schedule.pattern ?? "daily";
  const { start, end } = frozenRange(schedule);
  const dates = new Set<string>();
  for (const date of datesInRange(start, end)) {
    if (
      matchesRecurrence(pattern, schedule.weekdays, date, schedule.anchorDate)
    ) {
      dates.add(date);
    }
  }
  return dates;
}

export function expandManualSchedule(schedule: SubjectSchedule): Set<string> {
  if (!schedule.enabled || schedule.mode !== "manual") return new Set();
  return new Set(schedule.manualDates ?? []);
}

export function scheduledDatesForSubject(
  schedule: SubjectSchedule | undefined,
): Set<string> {
  if (!schedule || !schedule.enabled) return new Set();
  if (schedule.mode === "manual") return expandManualSchedule(schedule);
  return expandRecurrenceSchedule(schedule);
}

export function isDateInFrozenRange(schedule: SubjectSchedule, date: string): boolean {
  const { start, end } = frozenRange(schedule);
  return date >= start && date <= end;
}

export function isScheduleExpiredOn(schedule: SubjectSchedule, date: string): boolean {
  if (!schedule.enabled || schedule.mode !== "recurrence") return false;
  const { end } = frozenRange(schedule);
  return date > end;
}

export function isScheduleNotYetActiveOn(
  schedule: SubjectSchedule,
  date: string,
): boolean {
  if (!schedule.enabled || schedule.mode !== "recurrence") return false;
  const { start } = frozenRange(schedule);
  return date < start;
}

export function isSubjectScheduledOn(
  state: Pick<AppState, "schedules">,
  subjectId: string,
  date: string,
): boolean {
  const schedule = state.schedules[subjectId];
  if (!schedule?.enabled) return false;
  if (schedule.mode === "manual") {
    return (schedule.manualDates ?? []).includes(date);
  }
  if (!isDateInFrozenRange(schedule, date)) return false;
  const pattern = schedule.pattern ?? "daily";
  return matchesRecurrence(
    pattern,
    schedule.weekdays,
    date,
    schedule.anchorDate,
  );
}

export function subjectsOnDate(
  state: Pick<AppState, "subjects" | "schedules">,
  date: string,
): Subject[] {
  return state.subjects.filter((s) => isSubjectScheduledOn(state, s.id, date));
}

export function expiredSubjectsOnDate(
  state: Pick<AppState, "subjects" | "schedules">,
  date: string,
): Subject[] {
  return state.subjects.filter((s) => {
    const schedule = state.schedules[s.id];
    if (!schedule?.enabled) return false;
    if (schedule.mode === "manual") return false;
    return isScheduleExpiredOn(schedule, date);
  });
}

export function subjectDotsOnDate(
  state: Pick<AppState, "subjects" | "schedules">,
  date: string,
): Subject[] {
  return subjectsOnDate(state, date);
}

export function scheduleSummary(schedule: SubjectSchedule): string {
  if (schedule.mode === "manual") {
    const count = schedule.manualDates?.length ?? 0;
    return `${count} ngày đã chọn`;
  }
  const pattern = schedule.pattern ?? "daily";
  const range = schedule.range ?? "this_month";
  let patternLabel = "Mỗi ngày";
  if (pattern === "weekdays") {
    const days = (schedule.weekdays ?? [])
      .sort((a, b) => a - b)
      .map((i) => ["T2", "T3", "T4", "T5", "T6", "T7", "CN"][i])
      .join(" ");
    patternLabel = `Các thứ ${days}`;
  } else if (pattern === "monthly") {
    patternLabel = "Mỗi tháng";
  } else if (pattern === "yearly") {
    patternLabel = "Mỗi năm";
  }
  const { end } = frozenRange(schedule);
  const rangeLabel =
    range === "this_week"
      ? "tuần này"
      : range === "this_month"
        ? `đến hết tháng ${parseISODate(end).m}`
        : range === "this_year"
          ? "năm nay"
          : schedule.untilDate
            ? `đến ${parseISODate(schedule.untilDate).d}/${parseISODate(schedule.untilDate).m}`
            : "đến ngày";
  return `${patternLabel} · ${rangeLabel}`;
}

export function defaultRecurrenceSchedule(
  subjectId: string,
  anchorDate: string,
): SubjectSchedule {
  const now = Date.now();
  return finalizeRecurrenceSchedule(
    {
      subjectId,
      enabled: true,
      mode: "recurrence",
      pattern: "weekdays",
      weekdays: [0, 2, 4],
      range: "this_month",
      anchorDate,
      createdAt: now,
      updatedAt: now,
    },
    anchorDate,
  );
}

export function defaultManualSchedule(
  subjectId: string,
  anchorDate: string,
): SubjectSchedule {
  const now = Date.now();
  return {
    subjectId,
    enabled: true,
    mode: "manual",
    manualDates: [],
    anchorDate,
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeSchedules(
  schedules: Record<string, SubjectSchedule>,
): Record<string, SubjectSchedule> {
  const out: Record<string, SubjectSchedule> = {};
  for (const [id, schedule] of Object.entries(schedules)) {
    out[id] = ensureScheduleRange(schedule);
  }
  return out;
}

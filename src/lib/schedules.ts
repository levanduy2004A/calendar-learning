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
  anchorDate: string,
  untilDate?: string,
): { start: string; end: string } {
  switch (range) {
    case "this_week": {
      const start = startOfWeekMonday(anchorDate);
      return { start, end: endOfWeekSunday(start) };
    }
    case "this_month":
      return {
        start: `${parseISODate(anchorDate).y}-${String(parseISODate(anchorDate).m).padStart(2, "0")}-01`,
        end: endOfMonth(anchorDate),
      };
    case "this_year":
      return {
        start: `${parseISODate(anchorDate).y}-01-01`,
        end: endOfYear(anchorDate),
      };
    case "until_date":
      return {
        start: anchorDate,
        end: untilDate && untilDate >= anchorDate ? untilDate : anchorDate,
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
      return set.has(weekdayIndexMon0(date));
    }
    case "monthly":
      return d === anchor.d;
    case "yearly":
      return m === anchor.m && d === anchor.d;
  }
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

export function expandRecurrenceSchedule(
  schedule: SubjectSchedule,
  referenceDate: string,
): Set<string> {
  if (!schedule.enabled || schedule.mode !== "recurrence") return new Set();
  const pattern = schedule.pattern ?? "daily";
  const range = schedule.range ?? "this_month";
  const { start, end } = rangeBounds(range, referenceDate, schedule.untilDate);
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
  referenceDate: string,
): Set<string> {
  if (!schedule || !schedule.enabled) return new Set();
  if (schedule.mode === "manual") return expandManualSchedule(schedule);
  return expandRecurrenceSchedule(schedule, referenceDate);
}

export function isSubjectScheduledOn(
  state: Pick<AppState, "schedules">,
  subjectId: string,
  date: string,
  referenceDate: string,
): boolean {
  const schedule = state.schedules[subjectId];
  if (!schedule?.enabled) return false;
  if (schedule.mode === "manual") {
    return (schedule.manualDates ?? []).includes(date);
  }
  const pattern = schedule.pattern ?? "daily";
  const range = schedule.range ?? "this_month";
  const { start, end } = rangeBounds(
    range,
    referenceDate,
    schedule.untilDate,
  );
  if (date < start || date > end) return false;
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
  referenceDate: string,
): Subject[] {
  return state.subjects.filter((s) =>
    isSubjectScheduledOn(state, s.id, date, referenceDate),
  );
}

export function subjectDotsOnDate(
  state: Pick<AppState, "subjects" | "schedules">,
  date: string,
  referenceDate: string,
): Subject[] {
  return subjectsOnDate(state, date, referenceDate);
}

export function scheduleSummary(
  schedule: SubjectSchedule,
  subjectName: string,
  referenceDate: string,
): string {
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
  const rangeLabel =
    range === "this_week"
      ? "tuần này"
      : range === "this_month"
        ? `đến hết tháng ${parseISODate(referenceDate).m}`
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
  return {
    subjectId,
    enabled: true,
    mode: "recurrence",
    pattern: "weekdays",
    weekdays: [0, 2, 4],
    range: "this_month",
    anchorDate,
    createdAt: now,
    updatedAt: now,
  };
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

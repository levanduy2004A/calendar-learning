import type { DaypartId } from "./types";

export const VN_TZ = "Asia/Ho_Chi_Minh";

export function vnToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function parseISODate(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

export function addDays(iso: string, days: number): string {
  const { y, m, d } = parseISODate(iso);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function startOfWeekMonday(iso: string): string {
  const dow = weekdayIndexMon0(iso);
  return addDays(iso, -dow);
}

export function weekdayIndexMon0(iso: string): number {
  const { y, m, d } = parseISODate(iso);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return (js + 6) % 7;
}

export function currentDaypart(now = new Date()): DaypartId {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: VN_TZ,
      hour: "numeric",
      hour12: false,
    }).format(now),
  );
  const h = hour === 24 ? 0 : hour;
  if (h < 12) return "sang";
  if (h < 18) return "chieu";
  return "toi";
}

export function weekdayLong(iso: string): string {
  const names = [
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
    "Chủ nhật",
  ];
  return names[weekdayIndexMon0(iso)];
}

export function weekdayShort(iso: string): string {
  const names = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  return names[weekdayIndexMon0(iso)];
}

export function monthLabel(iso: string): string {
  const { m } = parseISODate(iso);
  return `Tháng ${m}`;
}

export function monthYearLabel(iso: string): string {
  const { y, m } = parseISODate(iso);
  return `Tháng ${m} ${y}`;
}

export function formatDayFull(iso: string): string {
  const { d, m, y } = parseISODate(iso);
  return `${weekdayLong(iso)} · ${d}/${m}/${y}`;
}

export function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

export function monthGrid(year: number, month1: number): (string | null)[] {
  const first = `${year}-${String(month1).padStart(2, "0")}-01`;
  const startPad = weekdayIndexMon0(first);
  const count = daysInMonth(year, month1);
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= count; d++) {
    cells.push(
      `${year}-${String(month1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    );
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

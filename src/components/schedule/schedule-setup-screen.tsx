"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft } from "lucide-react";
import { CtaButton } from "@/components/cta-button";
import { saveSubjectSchedule } from "@/lib/store";
import {
  defaultManualSchedule,
  defaultRecurrenceSchedule,
} from "@/lib/schedules";
import { addDays, monthGrid, monthYearLabel, parseISODate, vnToday } from "@/lib/dates";
import type {
  RecurrencePattern,
  ScheduleRangeKind,
  SubjectSchedule,
} from "@/lib/types";
import { WEEKDAY_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppState } from "@/hooks/use-app-state";

const PATTERNS: { id: RecurrencePattern; label: string }[] = [
  { id: "daily", label: "Mỗi ngày" },
  { id: "weekdays", label: "Các thứ" },
  { id: "monthly", label: "Mỗi tháng" },
  { id: "yearly", label: "Mỗi năm" },
];

const RANGES: { id: ScheduleRangeKind; label: string }[] = [
  { id: "this_week", label: "Tuần này" },
  { id: "this_month", label: "Tháng này" },
  { id: "this_year", label: "Năm nay" },
  { id: "until_date", label: "Đến ngày" },
];

function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-[14px] font-semibold ring-1 transition",
        active
          ? "bg-ink text-white ring-ink"
          : "bg-white text-ink ring-ink/12",
      )}
    >
      {children}
    </button>
  );
}

function TabSwitch({
  tab,
  onTab,
}: {
  tab: "lap" | "chon";
  onTab: (t: "lap" | "chon") => void;
}) {
  return (
    <div className="grid grid-cols-2 rounded-full bg-ink/8 p-1 text-[14px] font-semibold">
      <button
        type="button"
        onClick={() => onTab("lap")}
        className={cn(
          "rounded-full py-2",
          tab === "lap" ? "bg-ink text-white" : "text-ink/45",
        )}
      >
        Lặp
      </button>
      <button
        type="button"
        onClick={() => onTab("chon")}
        className={cn(
          "rounded-full py-2",
          tab === "chon" ? "bg-ink text-white" : "text-ink/45",
        )}
      >
        Chọn ngày
      </button>
    </div>
  );
}

export function ScheduleSetupScreen({ subjectId }: { subjectId: string }) {
  const { state } = useAppState();
  const router = useRouter();
  const subject = state.subjects.find((s) => s.id === subjectId);
  const today = vnToday();
  const existing = state.schedules[subjectId];

  const [tab, setTab] = useState<"lap" | "chon">(
    existing?.mode === "manual" ? "chon" : "lap",
  );
  const [pattern, setPattern] = useState<RecurrencePattern>(
    existing?.pattern ?? "weekdays",
  );
  const [weekdays, setWeekdays] = useState<number[]>(
    existing?.weekdays ?? [0, 2, 4],
  );
  const [range, setRange] = useState<ScheduleRangeKind>(
    existing?.range ?? "this_month",
  );
  const [untilDate, setUntilDate] = useState(existing?.untilDate ?? addDays(today, 30));
  const [manualDates, setManualDates] = useState<string[]>(
    existing?.manualDates ?? [],
  );
  const [monthCursor, setMonthCursor] = useState(today);

  const { y, m } = parseISODate(monthCursor);
  const cells = monthGrid(y, m);

  const toggleWeekday = (idx: number) => {
    setWeekdays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx].sort(),
    );
  };

  const toggleManualDate = (date: string) => {
    setManualDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date].sort(),
    );
  };

  const save = () => {
    if (!subject) return;
    const base: SubjectSchedule =
      tab === "lap"
        ? {
            ...defaultRecurrenceSchedule(subjectId, today),
            pattern,
            weekdays: pattern === "weekdays" ? weekdays : undefined,
            range,
            untilDate: range === "until_date" ? untilDate : undefined,
          }
        : {
            ...defaultManualSchedule(subjectId, today),
            manualDates,
          };
    if (existing) {
      base.createdAt = existing.createdAt;
      base.anchorDate = existing.anchorDate;
    }
    saveSubjectSchedule(base);
    router.push(`/cay/${subjectId}`);
  };

  const sortedManual = useMemo(
    () => [...manualDates].sort(),
    [manualDates],
  );

  if (!subject) {
    return (
      <div className="px-5 py-8 text-center">
        <p className="text-ink/50">Không tìm thấy môn.</p>
        <Link href="/cay" className="mt-4 inline-block underline">
          Về cây kỹ năng
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col px-5 pb-6 pt-4">
      <header className="mb-5">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-3 flex size-10 items-center justify-center rounded-full bg-white ring-1 ring-ink/10"
          aria-label="Quay lại"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="font-heading text-[26px] font-bold leading-tight">
          Lịch học · {subject.name}
        </h1>
        <p className="mt-1 text-[14px] text-ink/50">
          Gán môn vào ngày. Cây kỹ năng giữ nguyên.
        </p>
      </header>

      <TabSwitch tab={tab} onTab={setTab} />

      {tab === "lap" ? (
        <div className="mt-6 space-y-6">
          <section>
            <h2 className="mb-3 text-[15px] font-semibold">Lặp lại</h2>
            <div className="flex flex-wrap gap-2">
              {PATTERNS.map((p) => (
                <Chip
                  key={p.id}
                  active={pattern === p.id}
                  onClick={() => setPattern(p.id)}
                >
                  {p.label}
                </Chip>
              ))}
            </div>
          </section>

          {pattern === "weekdays" && (
            <section>
              <h2 className="mb-3 text-[15px] font-semibold">Khi chọn &quot;Các thứ&quot;</h2>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_LABELS.map((label, idx) => (
                  <Chip
                    key={label}
                    active={weekdays.includes(idx)}
                    onClick={() => toggleWeekday(idx)}
                  >
                    {label}
                  </Chip>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-[15px] font-semibold">Phạm vi</h2>
            <div className="flex flex-wrap gap-2">
              {RANGES.map((r) => (
                <Chip
                  key={r.id}
                  active={range === r.id}
                  onClick={() => setRange(r.id)}
                >
                  {r.label}
                </Chip>
              ))}
            </div>
            {range === "until_date" && (
              <input
                type="date"
                value={untilDate}
                onChange={(e) => setUntilDate(e.target.value)}
                className="mt-3 h-11 w-full rounded-[14px] bg-white px-3 text-[15px] ring-1 ring-ink/12"
              />
            )}
          </section>

          <div className="flex items-start gap-3 rounded-[20px] bg-white px-4 py-3.5 ring-1 ring-ink/8">
            <CalendarDays className="mt-0.5 size-5 shrink-0 text-ink/40" />
            <p className="text-[14px] leading-relaxed text-ink/60">
              Một ngày có thể nhiều môn.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">{monthYearLabel(monthCursor)}</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const nm = m - 1;
                  const y2 = nm < 1 ? y - 1 : y;
                  const m2 = nm < 1 ? 12 : nm;
                  setMonthCursor(`${y2}-${String(m2).padStart(2, "0")}-01`);
                }}
                className="rounded-full px-2 py-1 text-[13px] font-semibold text-ink/50"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => {
                  const nm = m + 1;
                  const y2 = nm > 12 ? y + 1 : y;
                  const m2 = nm > 12 ? 1 : nm;
                  setMonthCursor(`${y2}-${String(m2).padStart(2, "0")}-01`);
                }}
                className="rounded-full px-2 py-1 text-[13px] font-semibold text-ink/50"
              >
                ›
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-y-2 text-center">
            {WEEKDAY_LABELS.map((d) => (
              <div key={d} className="text-[11px] font-medium text-ink/40">
                {d}
              </div>
            ))}
            {cells.map((d, i) =>
              d ? (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleManualDate(d)}
                  className="flex flex-col items-center py-1"
                >
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full text-[14px] font-medium",
                      manualDates.includes(d) && "bg-ink text-white",
                    )}
                  >
                    {parseISODate(d).d}
                  </span>
                </button>
              ) : (
                <div key={`e-${i}`} />
              ),
            )}
          </div>

          <p className="text-[14px] text-ink/50">Bấm ngày để gán. Không lặp.</p>

          {sortedManual.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sortedManual.map((d) => {
                const { d: day, m: mon } = parseISODate(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleManualDate(d)}
                    className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold ring-1 ring-ink/12"
                  >
                    {day}/{mon}
                    <span className="text-ink/40">×</span>
                  </button>
                );
              })}
            </div>
          )}

          {sortedManual.length > 0 && (
            <button
              type="button"
              onClick={() => setManualDates([])}
              className="w-full rounded-[20px] bg-white py-3.5 text-[15px] font-semibold ring-1 ring-ink/12"
            >
              Xóa hết ngày đã chọn
            </button>
          )}
        </div>
      )}

      <div className="mt-auto space-y-3 pt-8">
        <CtaButton
          icon="none"
          onClick={save}
          disabled={tab === "chon" && manualDates.length === 0}
        >
          {tab === "lap" ? "Lưu lịch học" : "Lưu những ngày này"}
        </CtaButton>
        <button
          type="button"
          onClick={() => router.push(`/cay/${subjectId}`)}
          className="block w-full py-2 text-center text-[14px] font-medium text-ink/50 underline underline-offset-4"
        >
          Bỏ qua, gán sau
        </button>
      </div>
    </div>
  );
}

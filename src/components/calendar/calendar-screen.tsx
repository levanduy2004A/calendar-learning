"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { CtaButton } from "@/components/cta-button";
import { SubjectGlyph } from "@/components/subject-icon";
import { DaypartGlyph, Pill } from "@/components/ui-bits";
import { SubjectFilters } from "@/components/calendar/subject-filters";
import { useAppState } from "@/hooks/use-app-state";
import {
  addDays,
  currentDaypart,
  formatDayFull,
  monthGrid,
  monthLabel,
  monthYearLabel,
  parseISODate,
  startOfWeekMonday,
  vnToday,
  weekdayLong,
  weekdayShort,
} from "@/lib/dates";
import {
  completedIdsOn,
  countKinds,
  firstActionable,
  isDaypartEnabled,
  previewPlan,
  subjectIdForItem,
} from "@/lib/planner";
import { ACCENTS } from "@/lib/tokens";
import type { AccentId, DaypartId } from "@/lib/types";
import { DAYPART_LABEL, DAYPARTS } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CalendarScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const today = vnToday();
  const view = params.get("view") === "thang" ? "thang" : "tuan";
  const selected = params.get("date") || today;
  const filter = params.get("mon") || "all";

  const setQuery = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    router.replace(`/lich?${next.toString()}`);
  };

  return (
    <div className="flex min-h-full flex-col px-5 pb-4 pt-6">
      {view === "tuan" ? (
        <WeekView
          today={today}
          selected={selected}
          filter={filter}
          onSelectDate={(d) => setQuery({ date: d })}
          onView={() => setQuery({ view: "thang" })}
          onFilter={(id) => setQuery({ mon: id === "all" ? null : id })}
        />
      ) : (
        <MonthView
          today={today}
          selected={selected}
          filter={filter}
          onSelectDate={(d) => setQuery({ date: d })}
          onView={() => setQuery({ view: "tuan" })}
          onFilter={(id) => setQuery({ mon: id === "all" ? null : id })}
          onShiftMonth={(dir) => {
            const { y, m } = parseISODate(selected);
            const nm = m + dir;
            const y2 = nm < 1 ? y - 1 : nm > 12 ? y + 1 : y;
            const m2 = nm < 1 ? 12 : nm > 12 ? 1 : nm;
            setQuery({
              date: `${y2}-${String(m2).padStart(2, "0")}-01`,
            });
          }}
        />
      )}
    </div>
  );
}

function ViewToggle({
  view,
  onWeek,
  onMonth,
}: {
  view: "tuan" | "thang";
  onWeek: () => void;
  onMonth: () => void;
}) {
  return (
    <div className="flex rounded-full bg-ink/8 p-1 text-[13px] font-semibold">
      <button
        type="button"
        onClick={onWeek}
        className={cn(
          "rounded-full px-3 py-1",
          view === "tuan" ? "bg-white text-ink shadow-sm" : "text-ink/45",
        )}
      >
        Tuần
      </button>
      <button
        type="button"
        onClick={onMonth}
        className={cn(
          "rounded-full px-3 py-1",
          view === "thang" ? "bg-white text-ink shadow-sm" : "text-ink/45",
        )}
      >
        Tháng
      </button>
    </div>
  );
}

function slotAccents(
  state: ReturnType<typeof useAppState>["state"],
  date: string,
  filter: string,
): Record<DaypartId, AccentId | "empty" | "off"> {
  const plan = previewPlan(state, date);
  const result = {} as Record<DaypartId, AccentId | "empty" | "off">;
  for (const part of DAYPARTS) {
    if (!isDaypartEnabled(state, date, part)) {
      result[part] = "off";
      continue;
    }
    const first = plan.slots[part].find((e) => {
      if (filter === "all") return true;
      return subjectIdForItem(state, e.itemId) === filter;
    });
    if (!first) {
      result[part] = "empty";
      continue;
    }
    const item = state.items.find((i) => i.id === first.itemId);
    const node = item ? state.nodes.find((n) => n.id === item.nodeId) : undefined;
    const subject = node
      ? state.subjects.find((s) => s.id === node.subjectId)
      : undefined;
    if (filter !== "all" && subject?.id !== filter) {
      result[part] = "empty";
      continue;
    }
    result[part] = subject?.accent ?? "empty";
  }
  return result;
}

function TickBar({
  date,
  filter,
  vertical,
}: {
  date: string;
  filter: string;
  vertical?: boolean;
}) {
  const { state } = useAppState();
  const ticks = slotAccents(state, date, filter);
  return (
    <div className={cn("flex gap-[3px]", vertical && "flex-col")}>
      {DAYPARTS.map((p) => {
        const t = ticks[p];
        const color =
          t === "off" || t === "empty" ? "#D9D3C8" : ACCENTS[t].tick;
        return (
          <span
            key={p}
            className={cn(
              "rounded-full",
              vertical ? "h-[7px] w-[3px]" : "size-[7px]",
            )}
            style={{ background: color }}
          />
        );
      })}
    </div>
  );
}

function WeekView({
  today,
  selected,
  filter,
  onSelectDate,
  onView,
  onFilter,
}: {
  today: string;
  selected: string;
  filter: string;
  onSelectDate: (d: string) => void;
  onView: () => void;
  onFilter: (id: string) => void;
}) {
  const { state } = useAppState();
  const monday = startOfWeekMonday(selected);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const plan = previewPlan(state, selected);
  const kinds = countKinds(plan, state, filter);
  const nowPart = currentDaypart();
  const actionable = firstActionable(plan, state, selected, today, nowPart);
  const startItem = actionable
    ? state.items.find((i) => i.id === actionable.itemId)
    : undefined;

  return (
    <>
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="font-heading text-[34px] leading-tight font-bold">Lịch</h1>
          <p className="text-[14px] text-ink/45">{monthLabel(selected)}</p>
        </div>
        <ViewToggle view="tuan" onWeek={() => undefined} onMonth={onView} />
      </header>

      <SubjectFilters filter={filter} onFilter={onFilter} />

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const sel = d === selected;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelectDate(d)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-[16px] bg-white py-2",
                sel && "ring-1 ring-ink",
              )}
            >
              <span className="text-[12px] font-semibold">{weekdayShort(d)}</span>
              <TickBar date={d} filter={filter} vertical />
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[14px] font-medium">
        {weekdayLong(selected)} · {kinds.review} ôn, {kinds.learn} học mới
      </p>

      <div className="mt-4 flex flex-1 flex-col gap-3">
        {DAYPARTS.map((part) => (
          <WeekSlot key={part} date={selected} part={part} filter={filter} />
        ))}
      </div>

      <p className="mt-4 text-center text-[12px] text-ink/40">
        Lịch do app xếp từ cây và hàng ôn. Không kéo thả sự kiện.
      </p>

      <div className="mt-3">
        {selected === today && startItem ? (
          <CtaButton
            href={`/practice?itemId=${startItem.id}&date=${selected}&daypart=${actionable?.daypart}`}
          >
            Bắt đầu · {startItem.title}
          </CtaButton>
        ) : (
          <CtaButton href={`/?date=${selected}`} icon="none">
            Xem ngày này
          </CtaButton>
        )}
      </div>
    </>
  );
}

function WeekSlot({
  date,
  part,
  filter,
}: {
  date: string;
  part: DaypartId;
  filter: string;
}) {
  const { state } = useAppState();
  const plan = previewPlan(state, date);
  const enabled = isDaypartEnabled(state, date, part);
  const entries = plan.slots[part].filter((e) => {
    if (filter === "all") return true;
    return subjectIdForItem(state, e.itemId) === filter;
  });
  const entry = entries[0];
  const item = entry ? state.items.find((i) => i.id === entry.itemId) : undefined;
  const node = item ? state.nodes.find((n) => n.id === item.nodeId) : undefined;
  const subject = node
    ? state.subjects.find((s) => s.id === node.subjectId)
    : undefined;
  const tint =
    !enabled || !subject
      ? "#F3F0EA"
      : ACCENTS[subject.accent].bg;

  return (
    <Link
      href={`/?date=${date}`}
      className="flex overflow-hidden rounded-[20px] bg-white"
    >
      <div
        className="flex w-14 shrink-0 flex-col items-center justify-center gap-1"
        style={{ background: tint }}
      >
        <DaypartGlyph
          part={part}
          tone={!enabled ? "off" : part === "sang" ? "done" : "active"}
        />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3">
        {enabled && subject && item && entry ? (
          <>
            <SubjectGlyph icon={subject.icon} accent={subject.accent} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{
                    color: ACCENTS[subject.accent].ink,
                    background: ACCENTS[subject.accent].bg,
                  }}
                >
                  {entry.kind === "review" ? "Ôn lại" : "Học mới"}
                </span>
                <span className="text-[12px] text-ink/50">{subject.name}</span>
              </div>
              <p className="truncate text-[15px] font-semibold">{item.title}</p>
              {entries.length > 1 && (
                <p className="text-[12px] text-ink/45">+{entries.length - 1} đầu mục</p>
              )}
            </div>
          </>
        ) : (
          <p className="flex-1 text-[15px] text-ink/40">Không học</p>
        )}
        <ChevronRight className="size-4 text-ink/30" />
      </div>
    </Link>
  );
}

function MonthView({
  today,
  selected,
  filter,
  onSelectDate,
  onView,
  onFilter,
  onShiftMonth,
}: {
  today: string;
  selected: string;
  filter: string;
  onSelectDate: (d: string) => void;
  onView: () => void;
  onFilter: (id: string) => void;
  onShiftMonth: (dir: number) => void;
}) {
  const { state } = useAppState();
  const { y, m } = parseISODate(selected);
  const cells = monthGrid(y, m);

  return (
    <>
      <header className="mb-3 text-center">
        <h1 className="font-heading text-[28px] font-bold">Lịch</h1>
        <div className="mt-2 flex justify-center">
          <ViewToggle view="thang" onWeek={onView} onMonth={() => undefined} />
        </div>
        <div className="mt-3 flex items-center justify-center gap-4 text-[15px] font-semibold">
          <button type="button" onClick={() => onShiftMonth(-1)} aria-label="Tháng trước">
            <ChevronLeft className="size-5" />
          </button>
          {monthYearLabel(selected)}
          <button type="button" onClick={() => onShiftMonth(1)} aria-label="Tháng sau">
            <ChevronRight className="size-5" />
          </button>
        </div>
      </header>

      <SubjectFilters filter={filter} onFilter={onFilter} />

      <div className="grid grid-cols-7 gap-y-2 text-center">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
          <div key={d} className="text-[11px] font-medium text-ink/40">
            {d}
          </div>
        ))}
        {cells.map((d, i) =>
          d ? (
            <button
              key={d}
              type="button"
              onClick={() => onSelectDate(d)}
              className="flex flex-col items-center gap-1 py-1"
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-[14px] font-medium",
                  d === selected && "ring-1 ring-ink",
                  d === today && d !== selected && "font-bold",
                )}
              >
                {parseISODate(d).d}
              </span>
              <MonthTicks date={d} filter={filter} />
            </button>
          ) : (
            <div key={`e-${i}`} />
          ),
        )}
      </div>

      <div className="mt-4 rounded-[20px] bg-white p-4">
        <p className="mb-3 text-[15px] font-semibold">{formatDayFull(selected)}</p>
        <div className="space-y-3">
          {DAYPARTS.map((part) => (
            <MonthDaypart key={part} date={selected} part={part} filter={filter} />
          ))}
        </div>
        <div className="mt-4">
          <CtaButton href={`/?date=${selected}`} icon="chevron">
            Xem ngày này
          </CtaButton>
          <p className="mt-2 text-center text-[12px] text-ink/40">
            Ôn còn đổi. Khung tắt không xếp.
          </p>
        </div>
      </div>
    </>
  );
}

function MonthTicks({ date, filter }: { date: string; filter: string }) {
  const { state } = useAppState();
  const plan = previewPlan(state, date);
  const done = completedIdsOn(state.completions, date);
  return (
    <div className="flex gap-[3px]">
      {DAYPARTS.map((part) => {
        if (!isDaypartEnabled(state, date, part)) {
          return (
            <span key={part} className="size-[8px] rounded-full bg-[#E8E2D8]" />
          );
        }
        const entry = plan.slots[part].find((e) => {
          if (filter === "all") return true;
          return subjectIdForItem(state, e.itemId) === filter;
        });
        if (!entry) {
          return (
            <span key={part} className="size-[8px] rounded-full bg-[#E8E2D8]" />
          );
        }
        const item = state.items.find((i) => i.id === entry.itemId);
        const node = item && state.nodes.find((n) => n.id === item.nodeId);
        const subject = node && state.subjects.find((s) => s.id === node.subjectId);
        const color = subject ? ACCENTS[subject.accent].tick : "#E8E2D8";
        const checked = done.has(entry.itemId);
        return (
          <span
            key={part}
            className="flex size-[8px] items-center justify-center rounded-full"
            style={{ background: color }}
          >
            {checked && <Check className="size-[6px] text-white" strokeWidth={4} />}
          </span>
        );
      })}
    </div>
  );
}

function MonthDaypart({
  date,
  part,
  filter,
}: {
  date: string;
  part: DaypartId;
  filter: string;
}) {
  const { state } = useAppState();
  const plan = previewPlan(state, date);
  const enabled = isDaypartEnabled(state, date, part);
  const entries = plan.slots[part].filter((e) => {
    if (filter === "all") return true;
    return subjectIdForItem(state, e.itemId) === filter;
  });
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-semibold text-ink/45">
        {DAYPART_LABEL[part]}
      </p>
      {!enabled || entries.length === 0 ? (
        <p className="text-[14px] text-ink/40">Không học</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => {
            const item = state.items.find((i) => i.id === e.itemId);
            if (!item) return null;
            const node = state.nodes.find((n) => n.id === item.nodeId);
            const subject = node
              ? state.subjects.find((s) => s.id === node.subjectId)
              : undefined;
            if (!subject) return null;
            return (
              <div key={e.itemId} className="flex items-center gap-2">
                <SubjectGlyph icon={subject.icon} accent={subject.accent} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-ink/50">{subject.name}</p>
                  <p className="truncate text-[14px] font-semibold">{item.title}</p>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1"
                  style={{
                    color: ACCENTS[subject.accent].ink,
                    borderColor: ACCENTS[subject.accent].ink,
                  }}
                >
                  {e.kind === "review" ? "Ôn" : "Học mới"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { CtaButton } from "@/components/cta-button";
import { SubjectGlyph } from "@/components/subject-icon";
import { DaypartGlyph, KindTag } from "@/components/ui-bits";
import { SubjectFilters } from "@/components/calendar/subject-filters";
import { useAppState } from "@/hooks/use-app-state";
import {
  addDays,
  currentDaypart,
  formatDayFull,
  monthGrid,
  monthYearLabel,
  parseISODate,
  startOfWeekMonday,
  vnToday,
  weekdayLong,
  weekdayShort,
} from "@/lib/dates";
import {
  completedIdsOn,
  firstActionable,
  isDaypartEnabled,
  previewPlan,
  subjectIdForItem,
  subjectNamesOnDate,
} from "@/lib/planner";
import { subjectDotsOnDate } from "@/lib/schedules";
import { ACCENTS } from "@/lib/tokens";
import type { DaypartId } from "@/lib/types";
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
  const nowPart = currentDaypart();
  const actionable = firstActionable(plan, state, selected, today, nowPart);
  const startItem = actionable
    ? state.items.find((i) => i.id === actionable.itemId)
    : undefined;
  const daySubjects = subjectNamesOnDate(state, selected);

  return (
    <>
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="font-heading text-[34px] leading-tight font-bold">Lịch</h1>
        </div>
        <ViewToggle view="tuan" onWeek={() => undefined} onMonth={onView} />
      </header>

      <SubjectFilters filter={filter} onFilter={onFilter} />

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const sel = d === selected;
          const dots = subjectDotsOnDate(state, d).filter(
            (s) => filter === "all" || s.id === filter,
          );
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelectDate(d)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-[16px] py-2",
                sel ? "bg-white ring-1 ring-ink" : "bg-white/60",
              )}
            >
              <span className="text-[12px] font-semibold">{weekdayShort(d)}</span>
              <div className="flex min-h-[10px] gap-[3px]">
                {dots.map((s) => (
                  <span
                    key={s.id}
                    className="size-[7px] rounded-full"
                    style={{ background: ACCENTS[s.accent].tick }}
                  />
                ))}
              </div>
              <DaypartStatusRow date={d} filter={filter} />
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-[15px] font-semibold">
        {weekdayLong(selected)}
        {daySubjects ? ` · ${daySubjects}` : ""}
      </p>

      <div className="mt-4 flex flex-1 flex-col gap-4">
        {DAYPARTS.map((part) => (
          <WeekDaypartDetail key={part} date={selected} part={part} filter={filter} />
        ))}
      </div>

      <div className="mt-4">
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

function DaypartStatusRow({ date, filter }: { date: string; filter: string }) {
  const { state } = useAppState();
  const plan = previewPlan(state, date);
  const done = completedIdsOn(state.completions, date);
  const labels = ["S", "C", "T"] as const;
  const parts: DaypartId[] = ["sang", "chieu", "toi"];

  return (
    <div className="flex gap-1">
      {parts.map((part, i) => {
        const enabled = isDaypartEnabled(state, date, part);
        const entries = plan.slots[part].filter((e) => {
          if (filter === "all") return true;
          return subjectIdForItem(state, e.itemId) === filter;
        });
        const allDone =
          entries.length > 0 && entries.every((e) => done.has(e.itemId));
        return (
          <div key={part} className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] font-medium text-ink/35">{labels[i]}</span>
            <span
              className={cn(
                "flex size-4 items-center justify-center rounded-full text-[8px]",
                !enabled && "bg-ink/5",
                enabled && entries.length === 0 && "ring-1 ring-ink/15",
                enabled && entries.length > 0 && !allDone && "bg-ink/10",
                allDone && "bg-[#3F8F5A] text-white",
              )}
            >
              {allDone && <Check className="size-2.5" strokeWidth={3} />}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function WeekDaypartDetail({
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
  const done = completedIdsOn(state.completions, date);
  const entries = plan.slots[part].filter((e) => {
    if (filter === "all") return true;
    return subjectIdForItem(state, e.itemId) === filter;
  });

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <DaypartGlyph part={part} tone={enabled ? "active" : "off"} />
        <h3 className="text-[15px] font-semibold">{DAYPART_LABEL[part]}</h3>
      </div>
      {!enabled || entries.length === 0 ? (
        <div className="rounded-[20px] bg-white px-4 py-4 text-[14px] text-ink/40">
          Không học
        </div>
      ) : (
        <div className="overflow-hidden rounded-[20px] bg-white">
          {entries.map((entry, idx) => {
            const item = state.items.find((i) => i.id === entry.itemId);
            if (!item) return null;
            const node = state.nodes.find((n) => n.id === item.nodeId);
            const subject = node
              ? state.subjects.find((s) => s.id === node.subjectId)
              : undefined;
            if (!subject) return null;
            const complete = done.has(entry.itemId);
            return (
              <div key={entry.itemId}>
                {idx > 0 && <div className="mx-4 h-px bg-ink/8" />}
                <Link
                  href={
                    complete
                      ? "#"
                      : `/practice?itemId=${entry.itemId}&date=${date}&daypart=${part}`
                  }
                  className="flex items-center gap-3 px-4 py-3.5"
                >
                  <SubjectGlyph icon={subject.icon} accent={subject.accent} size="sm" />
                  <div className="min-w-0 flex-1">
                    <KindTag
                      kind={entry.kind}
                      subjectName={subject.name}
                      accentInk={ACCENTS[subject.accent].ink}
                    />
                    <p className="mt-0.5 truncate text-[15px] font-semibold">{item.title}</p>
                  </div>
                  <ChevronRight className="size-4 text-ink/30" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </section>
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
              <MonthDots date={d} filter={filter} />
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
            <WeekDaypartDetail key={part} date={selected} part={part} filter={filter} />
          ))}
        </div>
        <div className="mt-4">
          <CtaButton href={`/?date=${selected}`} icon="chevron">
            Xem ngày này
          </CtaButton>
        </div>
      </div>
    </>
  );
}

function MonthDots({
  date,
  filter,
}: {
  date: string;
  filter: string;
}) {
  const { state } = useAppState();
  const dots = subjectDotsOnDate(state, date).filter(
    (s) => filter === "all" || s.id === filter,
  );
  if (dots.length === 0) return <span className="h-[7px]" />;
  return (
    <div className="flex gap-[2px]">
      {dots.slice(0, 3).map((s) => (
        <span
          key={s.id}
          className="size-[6px] rounded-full"
          style={{ background: ACCENTS[s.accent].tick }}
        />
      ))}
    </div>
  );
}

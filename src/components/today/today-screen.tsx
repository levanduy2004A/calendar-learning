"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Check, ChevronRight } from "lucide-react";
import { CtaButton } from "@/components/cta-button";
import { SubjectGlyph } from "@/components/subject-icon";
import { DaypartGlyph, KindTag, Pill } from "@/components/ui-bits";
import { useAppState } from "@/hooks/use-app-state";
import { currentDaypart, formatDayFull, vnToday, weekdayLong } from "@/lib/dates";
import {
  completedIdsOn,
  enabledDayparts,
  firstActionable,
  hasAssignedSubjects,
  isDaypartEnabled,
  previewPlan,
} from "@/lib/planner";
import { resetEmpty, resetToDemo, toggleDaypart } from "@/lib/store";
import { ACCENTS } from "@/lib/tokens";
import type { DaypartId, PlannedEntry } from "@/lib/types";
import { DAYPART_LABEL, DAYPARTS } from "@/lib/types";
import { cn } from "@/lib/utils";

function entryContext(state: ReturnType<typeof useAppState>["state"], entry: PlannedEntry) {
  const item = state.items.find((i) => i.id === entry.itemId);
  if (!item) return null;
  const node = state.nodes.find((n) => n.id === item.nodeId);
  if (!node) return null;
  const subject = state.subjects.find((s) => s.id === node.subjectId);
  if (!subject) return null;
  return { item, node, subject };
}

export function TodayScreen() {
  const { state } = useAppState();
  const params = useSearchParams();
  const router = useRouter();
  const today = vnToday();
  const date = params.get("date") || today;
  const nowPart = currentDaypart();
  const assigned = hasAssignedSubjects(state, date);
  const plan = previewPlan(state, date);
  const done = completedIdsOn(state.completions, date);
  const isToday = date === today;
  const isFuture = date > today;
  const actionable = assigned
    ? firstActionable(plan, state, date, today, nowPart)
    : null;
  const startItem = actionable
    ? state.items.find((i) => i.id === actionable.itemId)
    : undefined;

  if (!assigned) {
    return (
      <div className="flex min-h-full flex-col px-5 pb-4 pt-6">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-[13px] font-medium text-ink/45">{weekdayLong(date)}</p>
            <h1 className="font-heading text-[34px] leading-tight font-bold tracking-tight">
              {isToday ? "Hôm nay" : weekdayLong(date)}
            </h1>
          </div>
          <Link
            href="/lich"
            className="mt-2 flex size-10 items-center justify-center rounded-full bg-white ring-1 ring-ink/10"
            aria-label="Mở lịch"
          >
            <CalendarDays className="size-5 text-ink/50" />
          </Link>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <div className="mb-6 text-ink/25" aria-hidden>
            <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
              <rect x="30" y="20" width="60" height="55" rx="8" stroke="currentColor" strokeWidth="2" />
              <path d="M30 35h60" stroke="currentColor" strokeWidth="2" />
              <circle cx="45" cy="28" r="2" fill="currentColor" />
              <circle cx="55" cy="28" r="2" fill="currentColor" />
              <path d="M15 75 Q20 65 25 75" stroke="currentColor" strokeWidth="2" />
              <path d="M95 75 Q100 65 105 75" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <h2 className="font-heading text-[26px] font-bold">Chưa gán môn hôm nay</h2>
          <p className="mt-3 max-w-[280px] text-[15px] leading-relaxed text-ink/50">
            Hôm nay chỉ hiện môn bạn đã xếp lịch. Cây vẫn còn, PDF không liên quan lịch.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <CtaButton icon="none" href="/cay">
            Gán lịch cho môn
          </CtaButton>
          <Link
            href="/cay"
            className="block py-2 text-center text-[14px] font-medium text-ink/50 underline underline-offset-4"
          >
            Xem cây kỹ năng
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col px-5 pb-4 pt-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-ink/45">{weekdayLong(date)}</p>
          <h1 className="font-heading text-[34px] leading-tight font-bold tracking-tight">
            {isToday ? "Hôm nay" : weekdayLong(date)}
          </h1>
          {!isToday && (
            <p className="text-[14px] text-ink/45">{formatDayFull(date).split(" · ")[1]}</p>
          )}
        </div>
        <div className="mt-2 flex gap-1.5">
          {DAYPARTS.map((part) => {
            const enabled = isDaypartEnabled(state, date, part);
            const slot = plan.slots[part];
            const allDone =
              enabled && slot.length > 0 && slot.every((e) => done.has(e.itemId));
            const active = isToday && enabled && part === nowPart;
            return (
              <Pill
                key={part}
                active={active}
                muted={!enabled}
                className={cn(
                  allDone && !active && "ring-[#3F8F5A]/40 text-[#2D6A3E]",
                )}
                onClick={() => toggleDaypart(date, part)}
              >
                {DAYPART_LABEL[part]}
              </Pill>
            );
          })}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5">
        {DAYPARTS.map((part) => (
          <DaypartSection
            key={part}
            part={part}
            date={date}
            isToday={isToday}
            nowPart={nowPart}
          />
        ))}
      </div>

      <div className="mt-6 space-y-2">
        {isToday && startItem ? (
          <CtaButton
            href={`/practice?itemId=${startItem.id}&date=${date}&daypart=${actionable?.daypart}`}
          >
            Bắt đầu · {startItem.title}
          </CtaButton>
        ) : isToday ? (
          <p className="flex h-14 items-center justify-center text-[15px] font-semibold text-ink/45">
            Hết việc hôm nay
          </p>
        ) : isFuture ? (
          <CtaButton icon="none" onClick={() => router.push("/")}>
            Về hôm nay
          </CtaButton>
        ) : (
          <CtaButton icon="none" onClick={() => router.push("/")}>
            Ngày đã qua
          </CtaButton>
        )}
        <p className="pt-1 text-center text-[11px] text-ink/35">
          <button type="button" className="underline-offset-2 hover:underline" onClick={resetToDemo}>
            Nạp dữ liệu mẫu
          </button>
          <span className="px-2">·</span>
          <button type="button" className="underline-offset-2 hover:underline" onClick={resetEmpty}>
            Bắt đầu trống
          </button>
        </p>
      </div>
    </div>
  );
}

function DaypartSection({
  part,
  date,
  isToday,
  nowPart,
}: {
  part: DaypartId;
  date: string;
  isToday: boolean;
  nowPart: DaypartId;
}) {
  const { state } = useAppState();
  const plan = previewPlan(state, date);
  const enabled = isDaypartEnabled(state, date, part);
  const done = completedIdsOn(state.completions, date);
  const slot = plan.slots[part];
  const allDone = slot.length > 0 && slot.every((e) => done.has(e.itemId));
  const isCurrent = isToday && enabled && part === nowPart;
  const tone = !enabled
    ? "off"
    : allDone
      ? "done"
      : isCurrent
        ? "active"
        : "idle";

  let status = "";
  if (!enabled) status = "";
  else if (allDone) status = " · xong";
  else if (isCurrent) status = " · đang diễn ra";

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <DaypartGlyph part={part} tone={tone} />
        <h2 className="text-[16px] font-semibold">
          {DAYPART_LABEL[part]}
          <span className="font-medium text-ink/45">{status}</span>
        </h2>
        <button
          type="button"
          onClick={() => toggleDaypart(date, part)}
          className="ml-auto text-[12px] font-medium text-ink/40"
        >
          {enabled ? "Tắt khung" : "Bật khung"}
        </button>
      </div>
      {!enabled ? (
        <div className="flex h-[84px] items-center justify-center rounded-[20px] border border-dashed border-ink/20 bg-ink/[0.02] text-[15px] text-ink/40">
          Không học
        </div>
      ) : slot.length === 0 ? (
        <div className="rounded-[20px] bg-white px-4 py-5 text-[14px] text-ink/45">
          {enabledDayparts(state, date).length === 0
            ? "Không học"
            : "Chưa có đầu mục từ môn đã gán."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[20px] bg-white">
          {slot.map((entry, idx) => {
            const ctx = entryContext(state, entry);
            if (!ctx) return null;
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
                  <SubjectGlyph icon={ctx.subject.icon} accent={ctx.subject.accent} />
                  <div className="min-w-0 flex-1">
                    <KindTag
                      kind={entry.kind}
                      subjectName={ctx.subject.name}
                      accentInk={ACCENTS[ctx.subject.accent].ink}
                    />
                    <p className="mt-1 truncate text-[16px] font-semibold leading-snug">
                      {ctx.item.title}
                    </p>
                  </div>
                  {complete ? (
                    <span className="flex size-7 items-center justify-center rounded-full bg-[#3F8F5A] text-white">
                      <Check className="size-4" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <ChevronRight className="size-5 text-ink/30" />
                  )}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

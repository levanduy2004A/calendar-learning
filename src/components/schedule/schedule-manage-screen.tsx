"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Power,
  Trash2,
} from "lucide-react";
import { CtaButton } from "@/components/cta-button";
import { SecondaryAction } from "@/components/ui-bits";
import {
  deleteSubjectSchedule,
  toggleScheduleEnabled,
} from "@/lib/store";
import { scheduleSummary } from "@/lib/schedules";
import { WEEKDAY_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppState } from "@/hooks/use-app-state";

export function ScheduleManageScreen({ subjectId }: { subjectId: string }) {
  const { state } = useAppState();
  const router = useRouter();
  const subject = state.subjects.find((s) => s.id === subjectId);
  const schedule = state.schedules[subjectId];

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

  const weekdayActive = new Set(
    schedule?.mode === "recurrence" && schedule.pattern === "weekdays"
      ? schedule.weekdays ?? []
      : [],
  );

  return (
    <div className="flex min-h-full flex-col px-5 pb-6 pt-4">
      <header className="relative mb-6 text-center">
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute left-5 flex size-10 items-center justify-center rounded-full bg-white ring-1 ring-ink/10"
          aria-label="Quay lại"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="font-heading text-[22px] font-bold">Lịch · {subject.name}</h1>
      </header>

      {schedule ? (
        <>
          <section className="mb-6">
            <h2 className="mb-3 text-[15px] font-semibold">Lịch hiện tại</h2>
            <div className="flex items-center gap-3 rounded-[20px] bg-white px-4 py-3.5 ring-1 ring-ink/8">
              <CalendarDays className="size-5 shrink-0 text-ink/40" />
              <p className="text-[14px] font-medium leading-snug">
                {scheduleSummary(schedule)}
              </p>
            </div>
            {schedule.mode === "recurrence" && schedule.pattern === "weekdays" && (
              <div className="mt-4 flex justify-between px-2">
                {WEEKDAY_LABELS.map((label, idx) => (
                  <div key={label} className="flex flex-col items-center gap-1.5">
                    <span className="text-[11px] font-medium text-ink/40">{label}</span>
                    <span
                      className={cn(
                        "size-3 rounded-full",
                        weekdayActive.has(idx) ? "bg-ink" : "ring-1 ring-ink/20",
                      )}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="mb-2 text-[15px] font-semibold">Thao tác</h2>

            <Link
              href={`/cay/${subjectId}/lich`}
              className="flex items-center gap-3 rounded-[20px] bg-white px-4 py-3.5 ring-1 ring-ink/8"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-ink/5">
                <Pencil className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Sửa lịch</p>
                <p className="text-[13px] text-ink/50">
                  Chỉnh sửa lịch học: chọn ngày lặp lại hoặc thời gian kết thúc.
                </p>
              </div>
              <ChevronRight className="size-5 text-ink/30" />
            </Link>

            <div className="flex items-center gap-3 rounded-[20px] bg-white px-4 py-3.5 ring-1 ring-ink/8">
              <span className="flex size-10 items-center justify-center rounded-full bg-ink/5">
                <Power className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Tắt lịch</p>
                <p className="text-[13px] text-ink/50">
                  Không học môn này trên lịch. Cây giữ nguyên.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={schedule.enabled}
                onClick={() => toggleScheduleEnabled(subjectId, !schedule.enabled)}
                className={cn(
                  "relative h-7 w-12 rounded-full transition",
                  schedule.enabled ? "bg-ink" : "bg-ink/15",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-6 rounded-full bg-white shadow transition",
                    schedule.enabled ? "left-[22px]" : "left-0.5",
                  )}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                deleteSubjectSchedule(subjectId);
                router.push(`/cay/${subjectId}`);
              }}
              className="flex w-full items-center gap-3 rounded-[20px] bg-[#FCEAEA] px-4 py-3.5 text-left ring-1 ring-[#E8B4B4]"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-white/70 text-[#B42318]">
                <Trash2 className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#B42318]">Xóa lịch môn</p>
                <p className="text-[13px] text-[#B42318]/70">
                  Không xóa cây kỹ năng hay tài liệu.
                </p>
              </div>
            </button>
          </section>
        </>
      ) : (
        <div className="rounded-[20px] bg-white px-4 py-8 text-center ring-1 ring-ink/8">
          <p className="text-[15px] text-ink/50">Chưa có lịch cho môn này.</p>
          <SecondaryAction href={`/cay/${subjectId}/lich`} className="mt-4">
            Gán lịch học
          </SecondaryAction>
        </div>
      )}

      <div className="mt-auto pt-8">
        <CtaButton
          icon="none"
          className="bg-white text-ink ring-1 ring-ink shadow-none"
          onClick={() => router.push(`/cay/${subjectId}`)}
        >
          Xong
        </CtaButton>
      </div>
    </div>
  );
}

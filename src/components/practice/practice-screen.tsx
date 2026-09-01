"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { CtaButton } from "@/components/cta-button";
import { useAppState, useBlob, useObjectUrl } from "@/hooks/use-app-state";
import { currentDaypart, vnToday } from "@/lib/dates";
import {
  completedIdsOn,
  nextInSlot,
  previewPlan,
  resolveAttachment,
} from "@/lib/planner";
import {
  isItemUnlocked,
  practiceChuaVung,
  practiceSkip,
  practiceXong,
} from "@/lib/store";
import { ACCENTS } from "@/lib/tokens";
import { parseYouTubeId } from "@/lib/youtube";
import type { DaypartId, LibraryDoc } from "@/lib/types";

export function PracticeScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const { state } = useAppState();
  const itemId = params.get("itemId") || "";
  const date = params.get("date") || vnToday();
  const daypart = (params.get("daypart") as DaypartId) || currentDaypart();
  const item = state.items.find((i) => i.id === itemId);
  const node = item ? state.nodes.find((n) => n.id === item.nodeId) : undefined;
  const subject = node
    ? state.subjects.find((s) => s.id === node.subjectId)
    : undefined;
  const plan = previewPlan(state, date);
  const attachment = item ? resolveAttachment(state, item) : undefined;
  const unlocked = item ? isItemUnlocked(item.id) : false;

  const finishAndAdvance = () => {
    const done = new Set(completedIdsOn(state.completions, date));
    done.add(itemId);
    const next = nextInSlot(plan, daypart, itemId, done);
    if (next && next !== itemId) {
      router.replace(`/practice?itemId=${next}&date=${date}&daypart=${daypart}`);
      return;
    }
    router.push(date === vnToday() ? "/" : `/?date=${date}`);
  };

  if (!item || !node || !subject) {
    return (
      <div className="flex min-h-dvh flex-col px-5 pt-6">
        <button type="button" onClick={() => router.push("/")} aria-label="Đóng">
          <X className="size-6" />
        </button>
        <p className="mt-10 text-ink/55">Không tìm thấy đầu mục.</p>
      </div>
    );
  }

  const pal = ACCENTS[subject.accent];
  const kind = item.reviewDue && item.reviewDue <= date ? "Ôn lại" : "Học mới";

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-8 pt-4">
      <header className="grid grid-cols-[40px_1fr_40px] items-center">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex size-10 items-center justify-center"
          aria-label="Đóng"
        >
          <X className="size-6" />
        </button>
        <div className="flex justify-center">
          <span
            className="rounded-full px-3 py-1 text-[12px] font-semibold"
            style={{ background: pal.bg, color: pal.ink }}
          >
            {kind} · {subject.name}
          </span>
        </div>
        <span />
      </header>

      <div className="mt-6 flex-1">
        <h1 className="font-heading text-[32px] leading-tight font-bold">
          {item.title}
        </h1>
        <p className="mt-1 text-[14px] text-ink/45">từ ô {node.title}</p>

        {!unlocked && (
          <p className="mt-4 rounded-[16px] bg-white px-4 py-3 text-[14px] text-ink/60">
            Ô này còn khóa. Xong hết đầu mục ô trước để mở.
          </p>
        )}

        <div className="mt-5 overflow-hidden rounded-[20px] bg-white shadow-[0_10px_30px_rgba(26,24,20,0.06)]">
          <AttachmentView doc={attachment} />
          {item.notes && (
            <div className="whitespace-pre-wrap px-5 py-4 text-[15px] leading-relaxed text-ink/80">
              {item.notes}
            </div>
          )}
          {!item.notes && !attachment && (
            <div className="px-5 py-8 text-center text-[14px] text-ink/45">
              Đầu mục chỉ có tiêu đề — làm xong thì bấm Xong.
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <CtaButton
          icon="none"
          disabled={!unlocked}
          onClick={() => {
            practiceXong(item.id, date, daypart);
            finishAndAdvance();
          }}
        >
          Xong
        </CtaButton>
        <button
          type="button"
          disabled={!unlocked}
          onClick={() => {
            practiceChuaVung(item.id, date);
            router.push("/");
          }}
          className="flex h-14 w-full items-center justify-center rounded-[20px] bg-white text-[16px] font-semibold ring-1 ring-ink/20 disabled:opacity-40"
        >
          Chưa vững, hẹn ôn
        </button>
        <button
          type="button"
          onClick={() => {
            practiceSkip();
            router.push("/");
          }}
          className="w-full py-2 text-center text-[15px] font-medium text-ink/55"
        >
          Bỏ qua
        </button>
      </div>
    </div>
  );
}

function AttachmentView({ doc }: { doc?: LibraryDoc }) {
  const blob = useBlob(doc?.id, doc?.hasBlob);
  const obj = useObjectUrl(blob);

  if (!doc) return null;

  if (doc.type === "youtube" && doc.url) {
    const yt = parseYouTubeId(doc.url);
    if (!yt) return <p className="px-5 py-4 text-sm">{doc.url}</p>;
    return (
      <div className="aspect-video bg-ink/5">
        <iframe
          title={doc.title}
          src={`https://www.youtube.com/embed/${yt}`}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (doc.type === "note") {
    return (
      <div className="whitespace-pre-wrap px-5 py-4 text-[15px] leading-relaxed">
        {doc.text}
      </div>
    );
  }

  const src = obj || doc.url;
  if (doc.type === "image" && src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={doc.title} className="w-full bg-[#fafafa] object-contain" />
    );
  }

  if (doc.type === "pdf" && src) {
    return (
      <div className="px-5 py-4">
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="font-semibold underline underline-offset-4"
        >
          Mở PDF · {doc.title}
        </a>
      </div>
    );
  }

  return <div className="px-5 py-4 text-[14px] text-ink/55">{doc.title}</div>;
}

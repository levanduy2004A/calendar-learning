"use client";

import { X } from "lucide-react";
import { useBlob, useObjectUrl } from "@/hooks/use-app-state";
import { parseYouTubeId } from "@/lib/youtube";
import type { LibraryDoc } from "@/lib/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function LibraryDocViewer({
  doc,
  open,
  onOpenChange,
}: {
  doc: LibraryDoc | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!doc) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[92dvh] overflow-y-auto rounded-t-[24px] bg-canvas p-5"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/20" />
        <SheetHeader className="gap-1 p-0 text-left">
          <div className="flex items-start justify-between gap-3">
            <SheetTitle className="font-heading text-[22px] font-bold leading-tight">
              {doc.title}
            </SheetTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex size-9 shrink-0 items-center justify-center rounded-full"
              aria-label="Đóng"
            >
              <X className="size-5" />
            </button>
          </div>
        </SheetHeader>
        <div className="mt-4 overflow-hidden rounded-[20px] bg-white">
          <DocBody doc={doc} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DocBody({ doc }: { doc: LibraryDoc }) {
  const blob = useBlob(doc.id, doc.hasBlob);
  const obj = useObjectUrl(blob);
  const src = obj || doc.url;

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

  if (doc.type === "image" && src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={doc.title} className="w-full bg-[#fafafa] object-contain" />
    );
  }

  if (doc.type === "pdf" && src) {
    return (
      <div className="px-5 py-6">
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="font-semibold underline underline-offset-4"
        >
          Mở PDF trong tab mới
        </a>
        {doc.fileName && (
          <p className="mt-2 text-[13px] text-ink/45">{doc.fileName}</p>
        )}
      </div>
    );
  }

  return <p className="px-5 py-4 text-[14px] text-ink/55">Không mở được tài liệu.</p>;
}

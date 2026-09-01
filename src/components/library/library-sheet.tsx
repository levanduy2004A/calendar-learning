"use client";

import { useRef, useState } from "react";
import {
  ChevronRight,
  FileText,
  Image as ImageIcon,
  StickyNote,
  Play,
  X,
} from "lucide-react";
import { CtaButton } from "@/components/cta-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from "@/hooks/use-app-state";
import { orderedNodes } from "@/lib/planner";
import { removeLibraryDoc, saveLibraryDoc, saveLibraryFile } from "@/lib/store";
import { parseYouTubeId } from "@/lib/youtube";
import type { DocType } from "@/lib/types";

export function LibrarySheet({
  open,
  onOpenChange,
  defaultSubjectId,
  defaultNodeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSubjectId?: string;
  defaultNodeId?: string;
}) {
  const { state } = useAppState();
  const [mode, setMode] = useState<"pick" | DocType>("pick");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [url, setUrl] = useState("");
  const [subjectId, setSubjectId] = useState(defaultSubjectId ?? "");
  const [nodeId, setNodeId] = useState(defaultNodeId ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const nodes = subjectId ? orderedNodes(state.nodes, subjectId) : [];

  const reset = () => {
    setMode("pick");
    setTitle("");
    setNote("");
    setUrl("");
    setFile(null);
    setError("");
    setSubjectId(defaultSubjectId ?? "");
    setNodeId(defaultNodeId ?? "");
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const sub = subjectId || null;
      const node = nodeId || null;
      if (mode === "note") {
        if (!title.trim() && !note.trim()) {
          setError("Nhập tiêu đề hoặc nội dung ghi chú.");
          return;
        }
        saveLibraryDoc({
          type: "note",
          title: title.trim() || "Ghi chú",
          text: note.trim(),
          subjectId: sub,
          nodeId: node,
        });
      } else if (mode === "youtube") {
        const id = parseYouTubeId(url);
        if (!id) {
          setError("Link YouTube không hợp lệ.");
          return;
        }
        saveLibraryDoc({
          type: "youtube",
          title: title.trim() || "Video YouTube",
          url: `https://www.youtube.com/watch?v=${id}`,
          subjectId: sub,
          nodeId: node,
        });
      } else if (mode === "pdf" || mode === "image") {
        if (!file) {
          setError(mode === "pdf" ? "Chọn một file PDF." : "Chọn một ảnh.");
          return;
        }
        await saveLibraryFile({
          type: mode,
          title: title.trim() || file.name,
          file,
          subjectId: sub,
          nodeId: node,
        });
      }
      reset();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  const onDropFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (f.type.startsWith("image/")) {
      setMode("image");
      setFile(f);
      setTitle(f.name);
    } else if (f.type === "application/pdf") {
      setMode("pdf");
      setFile(f);
      setTitle(f.name);
    } else {
      setError("Chỉ nhận PDF hoặc ảnh.");
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[92dvh] overflow-y-auto rounded-t-[24px] bg-canvas p-5"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/20" />
        <SheetHeader className="gap-1 p-0 text-left">
          <div className="flex items-start justify-between">
            <SheetTitle className="font-heading text-[26px] font-bold">
              Thêm tài liệu
            </SheetTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex size-9 items-center justify-center rounded-full"
              aria-label="Đóng"
            >
              <X className="size-5" />
            </button>
          </div>
          <SheetDescription className="text-[13px] text-ink/55">
            Lưu để mở khi học. Cây kỹ năng bạn tạo tay.
          </SheetDescription>
        </SheetHeader>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onDropFiles(e.dataTransfer.files);
          }}
          className="mt-5 flex w-full flex-col items-center justify-center rounded-[20px] border border-dashed border-ink/25 bg-white/40 px-4 py-8 text-ink/55"
        >
          <FileText className="mb-2 size-7" strokeWidth={1.5} />
          <span className="font-semibold text-ink">Thả PDF vào tủ</span>
          <span className="text-[13px]">PDF / ảnh</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => onDropFiles(e.target.files)}
        />

        {mode === "pick" && (
          <div className="mt-4 divide-y divide-ink/8 overflow-hidden rounded-[20px] bg-white">
            {(
              [
                ["pdf", "Tải PDF", FileText],
                ["note", "Ghi chú", StickyNote],
                ["youtube", "Link YouTube", Play],
                ["image", "Ảnh", ImageIcon],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <Icon className="size-5 text-ink/70" strokeWidth={1.7} />
                <span className="flex-1 font-medium">{label}</span>
                <ChevronRight className="size-4 text-ink/30" />
              </button>
            ))}
          </div>
        )}

        {mode !== "pick" && (
          <div className="mt-4 space-y-3 rounded-[20px] bg-white p-4">
            <Label>Tiêu đề</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 rounded-[14px]"
              placeholder="Tên tài liệu"
            />
            {mode === "note" && (
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nội dung ghi chú"
                className="min-h-24 rounded-[14px]"
              />
            )}
            {mode === "youtube" && (
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/…"
                className="h-11 rounded-[14px]"
              />
            )}
            {(mode === "pdf" || mode === "image") && (
              <p className="text-[13px] text-ink/55">
                {file ? file.name : "Chưa chọn file — dùng ô thả phía trên."}
              </p>
            )}
            <button
              type="button"
              className="text-[13px] text-ink/45 underline"
              onClick={() => {
                setMode("pick");
                setFile(null);
                setError("");
              }}
            >
              Chọn loại khác
            </button>
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <Label className="mb-1.5">Gắn vào môn</Label>
            <select
              className="h-12 w-full rounded-[16px] border border-ink/10 bg-white px-3 text-[14px]"
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setNodeId("");
              }}
            >
              <option value="">Để sau</option>
              {state.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="mb-1.5">Gắn vào ô (tuỳ chọn)</Label>
            <select
              className="h-12 w-full rounded-[16px] border border-ink/10 bg-white px-3 text-[14px]"
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              disabled={!subjectId}
            >
              <option value="">Chọn sau trên cây</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="mt-3 text-[13px] text-red-700">{error}</p>}

        <div className="mt-5">
          <CtaButton icon="none" onClick={() => void save()} disabled={busy}>
            Lưu vào thư viện
          </CtaButton>
          <p className="mt-3 text-center text-[12px] text-ink/45">
            Tạo ô và đầu mục ở tab Cây kỹ năng.
          </p>
        </div>

        {state.library.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-[14px] font-semibold">Đã lưu</h3>
            <ul className="space-y-2">
              {state.library.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-[16px] bg-white px-3 py-2 text-[13px]"
                >
                  <span className="truncate">
                    {d.title}
                    <span className="ml-2 text-ink/40">
                      {d.type === "pdf"
                        ? "PDF"
                        : d.type === "note"
                          ? "Ghi chú"
                          : d.type === "youtube"
                            ? "YouTube"
                            : "Ảnh"}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void removeLibraryDoc(d.id)}
                  >
                    Xóa
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

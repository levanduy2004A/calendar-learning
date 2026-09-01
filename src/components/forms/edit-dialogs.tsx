"use client";

import { useState } from "react";
import { CtaButton } from "@/components/cta-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createItem, createNode, createSubject } from "@/lib/store";
import type { SubjectIconId } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: { id: SubjectIconId; label: string }[] = [
  { id: "guitar", label: "Guitar" },
  { id: "code", label: "Lập trình" },
  { id: "book", label: "Sách" },
  { id: "pen", label: "Viết" },
  { id: "flask", label: "Thí nghiệm" },
];

export function AddSubjectDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<SubjectIconId>("book");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[20px] bg-canvas sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold">Thêm môn</DialogTitle>
          <DialogDescription>
            Môn học nằm trên cây, không phải tab riêng.
          </DialogDescription>
        </DialogHeader>
        <Label>Tên môn</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ví dụ: Piano"
          className="h-11 rounded-[14px]"
        />
        <Label>Biểu tượng</Label>
        <div className="flex flex-wrap gap-2">
          {ICONS.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => setIcon(it.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[13px] font-medium ring-1",
                icon === it.id ? "bg-ink text-white ring-ink" : "bg-white ring-ink/10",
              )}
            >
              {it.label}
            </button>
          ))}
        </div>
        <CtaButton
          icon="none"
          onClick={() => {
            if (!name.trim()) return;
            const id = createSubject(name, icon);
            setName("");
            onOpenChange(false);
            if (id) onCreated?.(id);
          }}
        >
          Tạo môn
        </CtaButton>
      </DialogContent>
    </Dialog>
  );
}

export function AddNodeDialog({
  open,
  onOpenChange,
  subjectId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  subjectId: string;
}) {
  const [title, setTitle] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[20px] bg-canvas sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold">Tạo ô trên cây</DialogTitle>
          <DialogDescription>
            Ô lớn trên cây. Ô sau khóa đến khi ô trước xong hết đầu mục.
          </DialogDescription>
        </DialogHeader>
        <Label>Tên ô</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ví dụ: Hợp âm D"
          className="h-11 rounded-[14px]"
        />
        <CtaButton
          icon="none"
          onClick={() => {
            if (!title.trim()) return;
            createNode(subjectId, title);
            setTitle("");
            onOpenChange(false);
          }}
        >
          Tạo ô
        </CtaButton>
      </DialogContent>
    </Dialog>
  );
}

export function AddItemDialog({
  open,
  onOpenChange,
  nodeId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  nodeId: string;
}) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[20px] bg-canvas sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold">Thêm đầu mục</DialogTitle>
          <DialogDescription>
            Chỉ cần tiêu đề là đủ. Ghi chú và tài liệu là tuỳ chọn.
          </DialogDescription>
        </DialogHeader>
        <Label>Tiêu đề</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ví dụ: Chuyển từ D sang G"
          className="h-11 rounded-[14px]"
        />
        <Label>Ghi chú (tuỳ chọn)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="rounded-[14px]"
        />
        <p className="text-[12px] text-ink/40">
          Có thể gắn PDF, ghi chú, YouTube hoặc ảnh sau trong thư viện.
        </p>
        <CtaButton
          icon="none"
          onClick={() => {
            if (!title.trim() || !nodeId) return;
            createItem(nodeId, title, notes);
            setTitle("");
            setNotes("");
            onOpenChange(false);
          }}
        >
          Thêm đầu mục
        </CtaButton>
      </DialogContent>
    </Dialog>
  );
}

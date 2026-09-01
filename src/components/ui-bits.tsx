"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DaypartId } from "@/lib/types";

export function DaypartGlyph({
  part,
  tone,
}: {
  part: DaypartId;
  tone: "done" | "active" | "idle" | "off";
}) {
  const color =
    tone === "done"
      ? "#3F8F5A"
      : tone === "active"
        ? "#1A1814"
        : tone === "off"
          ? "#C5BFB4"
          : "#1A1814";
  if (part === "toi") {
    return <Moon className="size-5" style={{ color }} strokeWidth={1.8} />;
  }
  return (
    <Sun
      className="size-5"
      style={{ color }}
      strokeWidth={tone === "active" ? 2.2 : 1.8}
    />
  );
}

export function KindTag({
  kind,
  subjectName,
  accentInk,
}: {
  kind: "review" | "new";
  subjectName: string;
  accentInk: string;
}) {
  return (
    <p className="text-[12px] font-medium leading-none" style={{ color: accentInk }}>
      {kind === "review" ? "Ôn lại" : "Học mới"}
      <span className="text-ink/35"> · </span>
      <span>{subjectName}</span>
    </p>
  );
}

export function Pill({
  children,
  active,
  muted,
  onClick,
  className,
}: {
  children: React.ReactNode;
  active?: boolean;
  muted?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-full px-3 text-[13px] font-medium transition",
        active && "bg-ink text-white",
        !active && !muted && "bg-white text-ink ring-1 ring-ink/15",
        muted && "bg-transparent text-ink/35",
        className,
      )}
    >
      {children}
    </button>
  );
}

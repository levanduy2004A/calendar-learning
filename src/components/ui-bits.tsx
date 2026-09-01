"use client";

import { Check, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { TOKENS } from "@/lib/tokens";
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
      ? TOKENS.successGreen
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
  done,
  onClick,
  className,
}: {
  children: React.ReactNode;
  active?: boolean;
  muted?: boolean;
  done?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-medium transition",
        done && "text-white",
        active && !done && "bg-ink text-white",
        !active && !muted && !done && "bg-white text-ink ring-1 ring-ink/15",
        muted && !done && "bg-transparent text-ink/35",
        className,
      )}
      style={
        done ? { backgroundColor: TOKENS.successGreen } : undefined
      }
    >
      {done && <Check className="size-3 shrink-0" strokeWidth={3} />}
      {children}
    </button>
  );
}

const actionChipClass =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-semibold text-ink ring-1 ring-ink/25 transition active:scale-[0.98]";

export function ActionChip({
  children,
  className,
  href,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
}) {
  if (href) {
    return (
      <Link href={href} className={cn(actionChipClass, className)}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cn(actionChipClass, className)}>
      {children}
    </button>
  );
}

const secondaryActionClass =
  "flex h-11 w-full items-center justify-center rounded-[16px] bg-white px-4 text-[14px] font-semibold text-ink ring-1 ring-ink/25 transition active:scale-[0.99]";

export function SecondaryAction({
  children,
  className,
  href,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
}) {
  if (href) {
    return (
      <Link href={href} className={cn(secondaryActionClass, className)}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cn(secondaryActionClass, className)}>
      {children}
    </button>
  );
}

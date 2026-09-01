"use client";

import {
  BookOpen,
  CodeXml,
  FlaskConical,
  Guitar,
  PenLine,
  type LucideIcon,
} from "lucide-react";
import type { AccentId, SubjectIconId } from "@/lib/types";
import { ACCENTS } from "@/lib/tokens";
import { cn } from "@/lib/utils";

const ICONS: Record<SubjectIconId, LucideIcon> = {
  guitar: Guitar,
  code: CodeXml,
  book: BookOpen,
  pen: PenLine,
  flask: FlaskConical,
};

export function SubjectGlyph({
  icon,
  accent,
  size = "md",
  className,
}: {
  icon: SubjectIconId;
  accent: AccentId;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const Icon = ICONS[icon];
  const pal = ACCENTS[accent];
  const dim =
    size === "sm" ? "size-8" : size === "lg" ? "size-12" : "size-10";
  const iconDim = size === "sm" ? "size-4" : size === "lg" ? "size-6" : "size-5";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[14px]",
        dim,
        className,
      )}
      style={{ background: pal.bg, color: pal.ink }}
    >
      {icon === "code" ? (
        <span className="font-semibold leading-none" style={{ fontSize: size === "sm" ? 11 : 13 }}>
          {"</>"}
        </span>
      ) : (
        <Icon className={iconDim} strokeWidth={1.75} />
      )}
    </span>
  );
}

export { ICONS as SUBJECT_ICONS };

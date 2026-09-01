"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

export function CtaButton({
  children,
  onClick,
  href,
  className,
  icon = "play",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  icon?: "play" | "none" | "chevron";
  disabled?: boolean;
}) {
  const inner = (
    <>
      {icon === "play" && (
        <Play className="size-5 fill-current" strokeWidth={0} />
      )}
      {icon === "chevron" && (
        <span className="text-xl leading-none" aria-hidden>
          ›
        </span>
      )}
      <span className="truncate">{children}</span>
    </>
  );
  const cls = cn(
    "flex h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-ink px-5 text-[16px] font-semibold text-white shadow-[0_8px_20px_rgba(26,24,20,0.12)] transition active:scale-[0.99]",
    disabled && "pointer-events-none opacity-40",
    className,
  );
  if (href) {
    return (
      <Link href={href} className={cls} aria-disabled={disabled}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} disabled={disabled}>
      {inner}
    </button>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarDays, House, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Hôm nay", icon: House, match: (p: string) => p === "/" },
  {
    href: "/lich",
    label: "Lịch",
    icon: CalendarDays,
    match: (p: string) => p.startsWith("/lich"),
  },
  {
    href: "/cay",
    label: "Cây kỹ năng",
    icon: Sprout,
    match: (p: string) => p.startsWith("/cay") || p.startsWith("/thu-vien"),
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const search = useSearchParams();
  const date = search.get("date");

  return (
    <nav className="safe-bottom grid grid-cols-3 border-t border-[#E4DFD6] bg-white px-2 pt-2 pb-1">
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        const Icon = tab.icon;
        const href =
          tab.href === "/" && date ? `/?date=${date}` : tab.href;
        return (
          <Link
            key={tab.href}
            href={href}
            className="flex flex-col items-center gap-1 py-1"
          >
            <span
              className={cn(
                "flex size-11 items-center justify-center rounded-full transition-colors",
                active ? "bg-ink text-white" : "text-ink/70",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.2 : 1.7} />
            </span>
            <span
              className={cn(
                "text-[11px] leading-none",
                active ? "font-semibold text-ink" : "font-medium text-ink/55",
              )}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

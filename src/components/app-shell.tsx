"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { useAppState } from "@/hooks/use-app-state";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready } = useAppState();
  const immersive = pathname.startsWith("/practice");

  return (
    <div className="min-h-dvh bg-[#E8E2D6] text-ink">
      <div
        className={cn(
          "mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-canvas shadow-[0_0_0_1px_rgba(26,24,20,0.04),0_24px_60px_rgba(26,24,20,0.08)]",
        )}
      >
        {!ready ? (
          <div className="flex flex-1 items-center justify-center text-sm text-ink/50">
            Đang mở tủ học…
          </div>
        ) : (
          <div className="flex min-h-dvh flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            {!immersive && <BottomNav />}
          </div>
        )}
      </div>
    </div>
  );
}

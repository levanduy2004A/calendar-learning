"use client";

import { SubjectGlyph } from "@/components/subject-icon";
import { Pill } from "@/components/ui-bits";
import { useAppState } from "@/hooks/use-app-state";
import { cn } from "@/lib/utils";

export function SubjectFilters({
  filter,
  onFilter,
}: {
  filter: string;
  onFilter: (id: string) => void;
}) {
  const { state } = useAppState();

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      <Pill active={filter === "all"} onClick={() => onFilter("all")}>
        Tất cả
      </Pill>
      {state.subjects.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onFilter(s.id)}
          className={cn(
            "flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-white px-2.5 text-[13px] font-medium ring-1",
            filter === s.id ? "ring-ink" : "ring-ink/10",
          )}
        >
          <SubjectGlyph icon={s.icon} accent={s.accent} size="sm" className="size-6 rounded-lg" />
          {s.name}
        </button>
      ))}
    </div>
  );
}

import { describe, expect, it } from "vitest";
import {
  buildDayPlan,
  candidateItemsForSubject,
  hasAssignedSubjects,
  hasExpiredSchedulesOnDate,
  isDaypartSlotComplete,
  isNodeComplete,
  previewPlan,
  unlockedNodeIds,
} from "./planner";
import { createSeedState } from "./seed";

function atHour(isoDate: string, hour: number): Date {
  return new Date(`${isoDate}T${String(hour).padStart(2, "0")}:00:00+07:00`);
}

describe("unlock rules", () => {
  it("unlocks the first node and keeps later nodes locked until complete", () => {
    const now = atHour("2026-09-01", 15);
    const s = createSeedState(now);
    const unlocked = unlockedNodeIds("sub_guitar", s.nodes, s.items);
    expect([...unlocked]).toEqual(["node_g1", "node_g2", "node_g3"]);
    expect(isNodeComplete("node_g3", s.items)).toBe(false);
    expect(isNodeComplete("node_g2", s.items)).toBe(true);
  });
});

describe("assigned-subject planning", () => {
  it("only plans items from subjects assigned on that date", () => {
    const date = "2026-09-01";
    const s = createSeedState(atHour(date, 9));
    expect(hasAssignedSubjects(s, date)).toBe(true);
    const plan = buildDayPlan(s, date);
    const itemIds = [
      ...plan.slots.sang,
      ...plan.slots.chieu,
      ...plan.slots.toi,
    ].map((e) => e.itemId);
    for (const id of itemIds) {
      const item = s.items.find((i) => i.id === id)!;
      const node = s.nodes.find((n) => n.id === item.nodeId)!;
      const scheduled =
        node.subjectId === "sub_guitar" || node.subjectId === "sub_code";
      expect(scheduled).toBe(true);
    }
  });

  it("shows empty plan when no subject is assigned", () => {
    const date = "2026-09-06";
    const s = createSeedState(atHour("2026-09-01", 9));
    expect(hasAssignedSubjects(s, date)).toBe(false);
    const plan = previewPlan(s, date, atHour(date, 9));
    expect(plan.slots.sang).toEqual([]);
    expect(plan.slots.chieu).toEqual([]);
    expect(plan.slots.toi).toEqual([]);
  });

  it("detects expired schedules after frozen month ends", () => {
    const s = createSeedState(atHour("2026-09-15", 9));
    expect(hasAssignedSubjects(s, "2026-10-01")).toBe(false);
    expect(hasExpiredSchedulesOnDate(s, "2026-10-01")).toBe(true);
  });

  it("puts reviews before new items within a subject", () => {
    const date = "2026-09-01";
    const s = createSeedState(atHour(date, 9));
    const guitarItems = candidateItemsForSubject(s, "sub_guitar", date);
    expect(guitarItems[0]?.id).toBe("item_g3c");
    expect(guitarItems[0]?.reviewDue).toBe(date);
  });

  it("only includes items from subjects scheduled that day", () => {
    const date = "2026-09-08";
    const s = createSeedState(atHour(date, 9));
    const plan = buildDayPlan(s, date);
    const itemIds = [
      ...plan.slots.sang,
      ...plan.slots.chieu,
      ...plan.slots.toi,
    ].map((e) => e.itemId);
    for (const id of itemIds) {
      const item = s.items.find((i) => i.id === id)!;
      const node = s.nodes.find((n) => n.id === item.nodeId)!;
      expect(node.subjectId).toBe("sub_code");
    }
  });

  it("includes guitar items on scheduled guitar days", () => {
    const date = "2026-09-07";
    const s = createSeedState(atHour(date, 9));
    const plan = buildDayPlan(s, date);
    const guitarInPlan = [...plan.slots.sang, ...plan.slots.chieu].some((e) =>
      e.itemId.startsWith("item_g"),
    );
    expect(guitarInPlan).toBe(true);
  });
});

describe("daypart completion", () => {
  it("marks a slot complete only when enabled, planned, and all items done", () => {
    const date = "2026-09-01";
    const s = createSeedState(atHour(date, 9));
    const plan = buildDayPlan(s, date);
    expect(plan.slots.sang.length).toBeGreaterThan(0);
    expect(isDaypartSlotComplete(s, plan, date, "sang")).toBe(false);

    const sangIds = plan.slots.sang.map((e) => e.itemId);
    const completions = sangIds.map((itemId) => ({
      itemId,
      date,
      daypart: "sang" as const,
    }));
    const doneState = { ...s, completions };
    expect(isDaypartSlotComplete(doneState, plan, date, "sang")).toBe(true);
    expect(isDaypartSlotComplete(doneState, plan, date, "chieu")).toBe(false);
  });

  it("does not mark disabled or empty dayparts complete", () => {
    const date = "2026-09-01";
    const s = createSeedState(atHour(date, 9));
    const plan = buildDayPlan(s, date);
    const disabled = {
      ...s,
      daypartEnabledByDate: { [date]: { sang: false } },
    };
    expect(isDaypartSlotComplete(disabled, plan, date, "sang")).toBe(false);

    const emptyDate = "2026-09-06";
    const emptyPlan = previewPlan(s, emptyDate, atHour(emptyDate, 9));
    expect(isDaypartSlotComplete(s, emptyPlan, emptyDate, "sang")).toBe(false);
  });
});

describe("seed integrity", () => {
  it("demo has frozen-range schedules for Guitar and Lập trình", () => {
    const s = createSeedState(atHour("2026-09-01", 10));
    expect(s.subjects.map((x) => x.name)).toEqual(["Guitar", "Lập trình"]);
    expect(s.schedules.sub_guitar?.rangeStart).toBeTruthy();
    expect(s.schedules.sub_guitar?.rangeEnd).toBeTruthy();
    expect(s.schedules.sub_code?.weekdays).toEqual([1, 3]);
    expect(s.version).toBe(2);
  });
});

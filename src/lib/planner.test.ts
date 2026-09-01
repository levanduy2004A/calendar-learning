import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import {
  applyRolling,
  buildDayPlan,
  isNodeComplete,
  unlockedNodeIds,
} from "./planner";
import { createSeedState } from "./seed";
import type { AppState, DayPlan, SkillItem } from "./types";
import { EMPTY_STATE } from "./types";

function atHour(isoDate: string, hour: number): Date {
  return new Date(`${isoDate}T${String(hour).padStart(2, "0")}:00:00+07:00`);
}

function base(now: Date): AppState {
  return createSeedState(now);
}

describe("unlock rules", () => {
  it("unlocks the first node and keeps later nodes locked until complete", () => {
    const now = atHour("2026-09-01", 15);
    const s = base(now);
    const unlocked = unlockedNodeIds("sub_guitar", s.nodes, s.items);
    expect([...unlocked]).toEqual(["node_g1", "node_g2", "node_g3"]);
    expect(isNodeComplete("node_g3", s.items)).toBe(false);
    expect(isNodeComplete("node_g2", s.items)).toBe(true);
  });

  it("completes a node only when every item is Xong", () => {
    const items: SkillItem[] = [
      { id: "a", nodeId: "n", title: "Một", status: "done" },
      { id: "b", nodeId: "n", title: "Hai", status: "todo" },
    ];
    expect(isNodeComplete("n", items)).toBe(false);
    items[1].status = "done";
    expect(isNodeComplete("n", items)).toBe(true);
  });
});

describe("planner fill", () => {
  it("caps each enabled daypart at 3 and leaves disabled empty", () => {
    const date = "2026-09-01";
    const now = atHour(date, 9);
    const s = base(now);
    const { plan } = buildDayPlan(s, {
      date,
      today: date,
      nowPart: "sang",
      applyRolling: false,
      occupied: new Set(),
      cursor: 0,
    });
    expect(plan.slots.sang.length).toBeLessThanOrEqual(3);
    expect(plan.slots.chieu.length).toBeLessThanOrEqual(3);
    expect(plan.slots.toi).toEqual([]);
  });

  it("puts due reviews before new items", () => {
    const date = "2026-09-01";
    const now = atHour(date, 9);
    const s = base(now);
    const { plan } = buildDayPlan(s, {
      date,
      today: date,
      nowPart: "sang",
      applyRolling: false,
      occupied: new Set(),
      cursor: 0,
    });
    const first = plan.slots.sang[0];
    expect(first.kind).toBe("review");
    expect(first.itemId).toBe("item_g3c");
  });

  it("does not put new work into a daypart that has already passed", () => {
    const date = "2026-09-01";
    const now = atHour(date, 15);
    const s = base(now);
    const { plan } = buildDayPlan(s, {
      date,
      today: date,
      nowPart: "chieu",
      applyRolling: true,
      occupied: new Set(),
      cursor: 0,
    });
    expect(plan.slots.sang).toEqual([]);
    expect(plan.slots.chieu.length).toBeGreaterThan(0);
    expect(plan.slots.chieu.length).toBeLessThanOrEqual(3);
  });

  it("round-robins subjects instead of dumping one subject", () => {
    const date = "2026-09-01";
    const now = atHour(date, 9);
    const s = base(now);
    const { plan } = buildDayPlan(s, {
      date,
      today: date,
      nowPart: "sang",
      applyRolling: false,
      occupied: new Set(),
      cursor: 0,
    });
    const subjectsOf = (ids: string[]) =>
      ids.map((id) => {
        const item = s.items.find((i) => i.id === id)!;
        return s.nodes.find((n) => n.id === item.nodeId)!.subjectId;
      });
    const sangSubs = subjectsOf(plan.slots.sang.map((e) => e.itemId));
    expect(new Set(sangSubs).size).toBeGreaterThan(1);
  });
});

describe("rolling missed items", () => {
  it("moves incomplete items into the next slot when there is room", () => {
    const slots: DayPlan["slots"] = {
      sang: [
        { itemId: "a", kind: "new", origin: "scheduled" },
        { itemId: "b", kind: "new", origin: "scheduled" },
      ],
      chieu: [{ itemId: "c", kind: "new", origin: "scheduled" }],
      toi: [],
    };
    const { slots: next, overflowIds } = applyRolling({
      slots,
      date: "2026-09-01",
      today: "2026-09-01",
      nowPart: "chieu",
      enabled: ["sang", "chieu"],
      completedIds: new Set(),
    });
    expect(next.sang).toEqual([]);
    expect(next.chieu.map((e) => e.itemId).sort()).toEqual(["a", "b", "c"]);
    expect(overflowIds).toEqual([]);
  });

  it("sends overflow to tomorrow instead of exceeding 3", () => {
    const slots: DayPlan["slots"] = {
      sang: [
        { itemId: "a", kind: "new", origin: "scheduled" },
        { itemId: "b", kind: "new", origin: "scheduled" },
      ],
      chieu: [
        { itemId: "c", kind: "new", origin: "scheduled" },
        { itemId: "d", kind: "new", origin: "scheduled" },
        { itemId: "e", kind: "new", origin: "scheduled" },
      ],
      toi: [],
    };
    const { slots: next, overflowIds } = applyRolling({
      slots,
      date: "2026-09-01",
      today: "2026-09-01",
      nowPart: "chieu",
      enabled: ["sang", "chieu"],
      completedIds: new Set(),
    });
    expect(next.chieu).toHaveLength(3);
    expect(overflowIds.sort()).toEqual(["a", "b"]);
  });

  it("does not roll completed items out of a past slot", () => {
    const slots: DayPlan["slots"] = {
      sang: [
        { itemId: "done1", kind: "review", origin: "scheduled" },
        { itemId: "open", kind: "new", origin: "scheduled" },
      ],
      chieu: [],
      toi: [],
    };
    const { slots: next } = applyRolling({
      slots,
      date: "2026-09-01",
      today: "2026-09-01",
      nowPart: "chieu",
      enabled: ["sang", "chieu"],
      completedIds: new Set(["done1"]),
    });
    expect(next.sang.map((e) => e.itemId)).toEqual(["done1"]);
    expect(next.chieu.map((e) => e.itemId)).toEqual(["open"]);
  });
});

describe("seed integrity", () => {
  it("demo tree has Guitar and Lập trình with Vietnamese titles", () => {
    const s = createSeedState(atHour("2026-09-01", 10));
    expect(s.subjects.map((x) => x.name)).toEqual(["Guitar", "Lập trình"]);
    expect(s.items.some((i) => i.title === "Gảy đều hợp âm G")).toBe(true);
    expect(s.items.some((i) => i.title.includes("phút"))).toBe(false);
    expect(addDays("2026-09-01", 1)).toBe("2026-09-02");
    expect(EMPTY_STATE.subjects).toHaveLength(0);
  });
});

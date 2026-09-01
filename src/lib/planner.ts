import { addDays, currentDaypart, vnToday } from "./dates";
import type {
  AppState,
  Completion,
  DaypartId,
  DayPlan,
  ItemKind,
  NodeLock,
  PlannedEntry,
  SkillItem,
  SkillNode,
} from "./types";
import { DAYPARTS } from "./types";

export function isDaypartEnabled(
  state: Pick<AppState, "daypartEnabled" | "daypartEnabledByDate">,
  date: string,
  part: DaypartId,
): boolean {
  const override = state.daypartEnabledByDate[date]?.[part];
  if (override !== undefined) return override;
  return state.daypartEnabled[part];
}

export function enabledDayparts(
  state: Pick<AppState, "daypartEnabled" | "daypartEnabledByDate">,
  date: string,
): DaypartId[] {
  return DAYPARTS.filter((p) => isDaypartEnabled(state, date, p));
}

export function itemsOfNode(items: SkillItem[], nodeId: string): SkillItem[] {
  return items.filter((i) => i.nodeId === nodeId);
}

export function isNodeComplete(nodeId: string, items: SkillItem[]): boolean {
  const mine = itemsOfNode(items, nodeId);
  return mine.length > 0 && mine.every((i) => i.status === "done");
}

export function orderedNodes(nodes: SkillNode[], subjectId: string): SkillNode[] {
  return nodes
    .filter((n) => n.subjectId === subjectId)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "vi"));
}

export function unlockedNodeIds(
  subjectId: string,
  nodes: SkillNode[],
  items: SkillItem[],
): Set<string> {
  const list = orderedNodes(nodes, subjectId);
  const unlocked = new Set<string>();
  for (const node of list) {
    unlocked.add(node.id);
    if (!isNodeComplete(node.id, items)) break;
  }
  return unlocked;
}

export function allUnlockedNodeIds(
  subjects: { id: string }[],
  nodes: SkillNode[],
  items: SkillItem[],
): Set<string> {
  const set = new Set<string>();
  for (const s of subjects) {
    for (const id of unlockedNodeIds(s.id, nodes, items)) set.add(id);
  }
  return set;
}

export function nodeLockState(
  nodeId: string,
  subjectId: string,
  nodes: SkillNode[],
  items: SkillItem[],
): NodeLock {
  const list = orderedNodes(nodes, subjectId);
  const idx = list.findIndex((n) => n.id === nodeId);
  if (idx < 0) return "locked";
  if (isNodeComplete(nodeId, items)) return "done";
  const firstIncomplete = list.findIndex((n) => !isNodeComplete(n.id, items));
  if (idx === firstIncomplete) return "current";
  if (idx === firstIncomplete + 1) return "next";
  return "locked";
}

export function itemKind(item: SkillItem, date: string): ItemKind {
  if (item.reviewDue && item.reviewDue <= date) return "review";
  return "new";
}

function isDaypartPast(
  date: string,
  part: DaypartId,
  today: string,
  nowPart: DaypartId,
): boolean {
  if (date < today) return true;
  if (date > today) return false;
  return DAYPARTS.indexOf(part) < DAYPARTS.indexOf(nowPart);
}

function nextEnabled(
  from: DaypartId,
  enabled: DaypartId[],
): DaypartId | undefined {
  const idx = enabled.indexOf(from);
  if (idx < 0) return enabled[0];
  return enabled[idx + 1];
}

function pickRoundRobin<T>(
  n: number,
  subjectIds: string[],
  startCursor: number,
  takeOne: (subjectId: string) => T | undefined,
): { items: T[]; cursor: number } {
  const items: T[] = [];
  let cursor = subjectIds.length ? startCursor % subjectIds.length : 0;
  if (subjectIds.length === 0 || n <= 0) return { items, cursor };
  while (items.length < n) {
    let picked = false;
    for (let step = 0; step < subjectIds.length; step++) {
      const idx = (cursor + step) % subjectIds.length;
      const item = takeOne(subjectIds[idx]);
      if (item !== undefined) {
        items.push(item);
        cursor = (idx + 1) % subjectIds.length;
        picked = true;
        break;
      }
    }
    if (!picked) break;
  }
  return { items, cursor };
}

export type PlannerPatches = Record<string, Partial<SkillItem>>;

export type BuildPlanOptions = {
  date: string;
  today: string;
  nowPart: DaypartId;
  applyRolling: boolean;
  occupied: Set<string>;
  existing?: DayPlan;
  cursor: number;
};

function candidateItems(
  state: AppState,
  date: string,
  occupied: Set<string>,
): { reviews: SkillItem[]; news: SkillItem[] } {
  const unlocked = allUnlockedNodeIds(state.subjects, state.nodes, state.items);
  const nodeSubject = new Map(state.nodes.map((n) => [n.id, n.subjectId]));
  const reviews: SkillItem[] = [];
  const news: SkillItem[] = [];
  for (const item of state.items) {
    if (item.status === "done") continue;
    if (occupied.has(item.id)) continue;
    if (!unlocked.has(item.nodeId)) continue;
    if (!nodeSubject.has(item.nodeId)) continue;
    if (item.reviewDue && item.reviewDue > date) continue;
    if (item.reviewDue && item.reviewDue <= date) reviews.push(item);
    else news.push(item);
  }
  const byId = (a: SkillItem, b: SkillItem) => a.id.localeCompare(b.id);
  reviews.sort(byId);
  news.sort(byId);
  return { reviews, news };
}

function subjectOfItem(state: AppState, item: SkillItem): string | undefined {
  return state.nodes.find((n) => n.id === item.nodeId)?.subjectId;
}

function fillEntries(
  state: AppState,
  date: string,
  need: number,
  reviews: SkillItem[],
  news: SkillItem[],
  used: Set<string>,
  cursor: number,
): { entries: PlannedEntry[]; cursor: number } {
  const subjectIds = state.subjects.map((s) => s.id);
  const takeFrom = (pool: SkillItem[], sid: string) => {
    const item = pool.find((i) => !used.has(i.id) && subjectOfItem(state, i) === sid);
    if (item) used.add(item.id);
    return item;
  };

  const reviewPick = pickRoundRobin(need, subjectIds, cursor, (sid) =>
    takeFrom(reviews, sid),
  );
  const rest = need - reviewPick.items.length;
  const newPick = pickRoundRobin(rest, subjectIds, reviewPick.cursor, (sid) =>
    takeFrom(news, sid),
  );

  const entries: PlannedEntry[] = [
    ...reviewPick.items.map((i) => ({
      itemId: i.id,
      kind: "review" as const,
      origin: "scheduled" as const,
    })),
    ...newPick.items.map((i) => ({
      itemId: i.id,
      kind: itemKind(i, date),
      origin: "scheduled" as const,
    })),
  ];
  return { entries, cursor: newPick.cursor };
}

function emptySlots(): Record<DaypartId, PlannedEntry[]> {
  return { sang: [], chieu: [], toi: [] };
}

function dropInvalid(
  entries: PlannedEntry[],
  state: AppState,
  occupied: Set<string>,
): PlannedEntry[] {
  const unlocked = allUnlockedNodeIds(state.subjects, state.nodes, state.items);
  const byId = new Map(state.items.map((i) => [i.id, i]));
  return entries.filter((e) => {
    const item = byId.get(e.itemId);
    if (!item) return false;
    if (occupied.has(e.itemId)) return false;
    if (item.status === "done") return false;
    if (!unlocked.has(item.nodeId)) return false;
    return true;
  });
}

export function applyRolling(args: {
  slots: Record<DaypartId, PlannedEntry[]>;
  date: string;
  today: string;
  nowPart: DaypartId;
  enabled: DaypartId[];
  completedIds: Set<string>;
}): { slots: Record<DaypartId, PlannedEntry[]>; overflowIds: string[] } {
  const slots: Record<DaypartId, PlannedEntry[]> = {
    sang: [...args.slots.sang],
    chieu: [...args.slots.chieu],
    toi: [...args.slots.toi],
  };
  const overflowIds: string[] = [];
  if (args.date !== args.today) {
    return { slots, overflowIds };
  }

  for (const part of args.enabled) {
    if (!isDaypartPast(args.date, part, args.today, args.nowPart)) continue;
    const stay = slots[part].filter((e) => args.completedIds.has(e.itemId));
    const incomplete = slots[part].filter((e) => !args.completedIds.has(e.itemId));
    slots[part] = stay;
    if (incomplete.length === 0) continue;
    const next = nextEnabled(part, args.enabled);
    if (!next) {
      overflowIds.push(...incomplete.map((e) => e.itemId));
      continue;
    }
    const room = Math.max(0, 3 - slots[next].length);
    const moving = incomplete.slice(0, room).map((e) => ({
      ...e,
      origin: "rolled" as const,
    }));
    const rest = incomplete.slice(room);
    slots[next] = [...slots[next], ...moving];
    overflowIds.push(...rest.map((e) => e.itemId));
  }
  return { slots, overflowIds };
}

export function buildDayPlan(
  state: AppState,
  options: BuildPlanOptions,
): { plan: DayPlan; overflowIds: string[]; cursor: number } {
  const enabled = enabledDayparts(state, options.date);
  const completedToday = new Set(
    state.completions
      .filter((c) => c.date === options.date)
      .map((c) => c.itemId),
  );
  const used = new Set<string>(options.occupied);
  const slots = emptySlots();
  let cursor = options.cursor;

  const existing = options.existing?.date === options.date ? options.existing : undefined;

  if (existing) {
    for (const part of DAYPARTS) {
      const keptCompleted = existing.slots[part].filter((e) =>
        completedToday.has(e.itemId),
      );
      const keptOpen = dropInvalid(existing.slots[part], state, used).filter(
        (e) => !completedToday.has(e.itemId),
      );
      slots[part] = [...keptCompleted, ...keptOpen].slice(0, 3);
      for (const e of slots[part]) used.add(e.itemId);
    }
  }

  const { reviews, news } = candidateItems(state, options.date, used);

  for (const part of enabled) {
    const past = isDaypartPast(
      options.date,
      part,
      options.today,
      options.nowPart,
    );
    // Do not schedule into a daypart that has already passed.
    // Missed items only roll from a plan that was already persisted.
    if (past) continue;
    const need = 3 - slots[part].length;
    if (need <= 0) continue;
    const filled = fillEntries(state, options.date, need, reviews, news, used, cursor);
    slots[part] = [...slots[part], ...filled.entries];
    cursor = filled.cursor;
  }

  let overflowIds: string[] = [];
  let rolled = slots;
  if (options.applyRolling) {
    const rolledRes = applyRolling({
      slots,
      date: options.date,
      today: options.today,
      nowPart: options.nowPart,
      enabled,
      completedIds: completedToday,
    });
    rolled = rolledRes.slots;
    overflowIds = rolledRes.overflowIds;
  }

  for (const part of DAYPARTS) {
    if (!enabled.includes(part)) rolled[part] = [];
    rolled[part] = rolled[part].slice(0, 3);
  }

  return {
    plan: {
      date: options.date,
      slots: rolled,
      generatedAt: Date.now(),
    },
    overflowIds,
    cursor,
  };
}

export function completedIdsOn(completions: Completion[], date: string): Set<string> {
  return new Set(completions.filter((c) => c.date === date).map((c) => c.itemId));
}

export function firstActionable(
  plan: DayPlan,
  state: AppState,
  date: string,
  today: string,
  nowPart: DaypartId,
): { itemId: string; daypart: DaypartId } | null {
  const done = completedIdsOn(state.completions, date);
  const enabled = enabledDayparts(state, date);
  const order =
    date === today
      ? [
          ...enabled.filter((p) => p === nowPart),
          ...enabled.filter((p) => DAYPARTS.indexOf(p) > DAYPARTS.indexOf(nowPart)),
          ...enabled.filter((p) => DAYPARTS.indexOf(p) < DAYPARTS.indexOf(nowPart)),
        ]
      : enabled;
  for (const part of order) {
    for (const e of plan.slots[part]) {
      if (!done.has(e.itemId)) return { itemId: e.itemId, daypart: part };
    }
  }
  return null;
}

export function nextInSlot(
  plan: DayPlan,
  daypart: DaypartId,
  afterItemId: string,
  done: Set<string>,
): string | null {
  const slot = plan.slots[daypart];
  const idx = slot.findIndex((e) => e.itemId === afterItemId);
  for (let i = idx + 1; i < slot.length; i++) {
    if (!done.has(slot[i].itemId)) return slot[i].itemId;
  }
  for (let i = 0; i < slot.length; i++) {
    if (!done.has(slot[i].itemId)) return slot[i].itemId;
  }
  return null;
}

export function subjectIdForItem(
  state: AppState,
  itemId: string,
): string | undefined {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return undefined;
  return state.nodes.find((n) => n.id === item.nodeId)?.subjectId;
}

export function countKinds(
  plan: DayPlan,
  state: AppState,
  filter: string = "all",
): { review: number; learn: number } {
  let review = 0;
  let learn = 0;
  const done = completedIdsOn(state.completions, plan.date);
  for (const part of DAYPARTS) {
    for (const e of plan.slots[part]) {
      if (done.has(e.itemId)) continue;
      if (filter !== "all" && subjectIdForItem(state, e.itemId) !== filter) continue;
      if (e.kind === "review") review += 1;
      else learn += 1;
    }
  }
  return { review, learn };
}

export function slotSubjectAccents(
  plan: DayPlan,
  state: AppState,
): Record<DaypartId, AccentId | null> {
  const itemMap = new Map(state.items.map((i) => [i.id, i]));
  const nodeMap = new Map(state.nodes.map((n) => [n.id, n]));
  const subjectMap = new Map(state.subjects.map((s) => [s.id, s]));
  const result = { sang: null, chieu: null, toi: null } as Record<
    DaypartId,
    import("./types").AccentId | null
  >;
  for (const part of DAYPARTS) {
    const first = plan.slots[part][0];
    if (!first) continue;
    const item = itemMap.get(first.itemId);
    if (!item) continue;
    const node = nodeMap.get(item.nodeId);
    if (!node) continue;
    result[part] = subjectMap.get(node.subjectId)?.accent ?? null;
  }
  return result;
}

export type AccentId = import("./types").AccentId;

export function resolveAttachment(
  state: AppState,
  item: SkillItem,
): import("./types").LibraryDoc | undefined {
  const node = state.nodes.find((n) => n.id === item.nodeId);
  const subject = node
    ? state.subjects.find((s) => s.id === node.subjectId)
    : undefined;
  const byId = (id?: string) =>
    id ? state.library.find((d) => d.id === id) : undefined;

  return (
    byId(item.attachmentId) ||
    state.library.find((d) => d.itemId === item.id) ||
    (node ? byId(node.attachmentId) : undefined) ||
    state.library.find((d) => d.nodeId === node?.id && !d.itemId) ||
    (subject ? byId(subject.attachmentId) : undefined) ||
    state.library.find((d) => d.subjectId === subject?.id && !d.nodeId && !d.itemId)
  );
}

export function reconcileToday(
  state: AppState,
  now = new Date(),
): { state: AppState; plan: DayPlan } {
  const today = vnToday(now);
  const nowPart = currentDaypart(now);
  const built = buildDayPlan(state, {
    date: today,
    today,
    nowPart,
    applyRolling: true,
    occupied: new Set(),
    existing: state.plans[today],
    cursor: state.roundRobinCursor,
  });
  const tomorrow = addDays(today, 1);
  const items = state.items.map((item) => {
    if (!built.overflowIds.includes(item.id)) return item;
    if (item.status === "done") return item;
    const due = item.reviewDue && item.reviewDue > tomorrow ? item.reviewDue : tomorrow;
    return { ...item, reviewDue: due };
  });
  const next: AppState = {
    ...state,
    items,
    plans: { ...state.plans, [today]: built.plan },
    roundRobinCursor: built.cursor,
  };
  return { state: next, plan: built.plan };
}

export function previewPlan(
  state: AppState,
  date: string,
  now = new Date(),
): DayPlan {
  const today = vnToday(now);
  if (date === today) {
    return reconcileToday(state, now).plan;
  }
  if (date < today && state.plans[date]) return state.plans[date];

  const occupied = new Set<string>();
  if (date > today) {
    const todayPlan = state.plans[today];
    if (todayPlan) {
      for (const part of DAYPARTS) {
        for (const e of todayPlan.slots[part]) occupied.add(e.itemId);
      }
    }
    let cursorDate = addDays(today, 1);
    let cursor = state.roundRobinCursor;
    const walkState = state;
    while (cursorDate < date) {
      const built = buildDayPlan(walkState, {
        date: cursorDate,
        today,
        nowPart: currentDaypart(now),
        applyRolling: false,
        occupied,
        cursor,
      });
      for (const part of DAYPARTS) {
        for (const e of built.plan.slots[part]) occupied.add(e.itemId);
      }
      cursor = built.cursor;
      cursorDate = addDays(cursorDate, 1);
    }
    return buildDayPlan(walkState, {
      date,
      today,
      nowPart: currentDaypart(now),
      applyRolling: false,
      occupied,
      cursor,
    }).plan;
  }

  return buildDayPlan(state, {
    date,
    today,
    nowPart: currentDaypart(now),
    applyRolling: false,
    occupied: new Set(),
    existing: state.plans[date],
    cursor: state.roundRobinCursor,
  }).plan;
}

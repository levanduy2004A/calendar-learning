import { expiredSubjectsOnDate, subjectsOnDate } from "./schedules";
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

function emptySlots(): Record<DaypartId, PlannedEntry[]> {
  return { sang: [], chieu: [], toi: [] };
}

export function candidateItemsForSubject(
  state: AppState,
  subjectId: string,
  date: string,
): SkillItem[] {
  const unlocked = unlockedNodeIds(subjectId, state.nodes, state.items);
  const nodeIds = new Set(
    state.nodes.filter((n) => n.subjectId === subjectId).map((n) => n.id),
  );
  const reviews: SkillItem[] = [];
  const news: SkillItem[] = [];
  for (const item of state.items) {
    if (item.status === "done") continue;
    if (!unlocked.has(item.nodeId)) continue;
    if (!nodeIds.has(item.nodeId)) continue;
    if (item.reviewDue && item.reviewDue > date) continue;
    if (item.reviewDue && item.reviewDue <= date) reviews.push(item);
    else news.push(item);
  }
  const byId = (a: SkillItem, b: SkillItem) => a.id.localeCompare(b.id);
  reviews.sort(byId);
  news.sort(byId);
  return [...reviews, ...news];
}

export function buildDayPlan(state: AppState, date: string): DayPlan {
  const assigned = subjectsOnDate(state, date);
  const enabled = enabledDayparts(state, date);
  const slots = emptySlots();

  if (assigned.length === 0 || enabled.length === 0) {
    return { date, slots, generatedAt: Date.now() };
  }

  const sortedSubjects = [...assigned].sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  for (const subject of sortedSubjects) {
    const items = candidateItemsForSubject(state, subject.id, date);
    let daypartIdx = 0;
    for (const item of items) {
      const part = enabled[daypartIdx % enabled.length];
      slots[part].push({
        itemId: item.id,
        kind: itemKind(item, date),
        origin: "scheduled",
      });
      daypartIdx += 1;
    }
  }

  return { date, slots, generatedAt: Date.now() };
}

export function completedIdsOn(completions: Completion[], date: string): Set<string> {
  return new Set(completions.filter((c) => c.date === date).map((c) => c.itemId));
}

/** True when daypart is enabled, has planned items, and every item is completed. */
export function isDaypartSlotComplete(
  state: Pick<AppState, "completions" | "daypartEnabled" | "daypartEnabledByDate">,
  plan: DayPlan,
  date: string,
  part: DaypartId,
  entryFilter: (entry: PlannedEntry) => boolean = () => true,
): boolean {
  if (!isDaypartEnabled(state, date, part)) return false;
  const entries = plan.slots[part].filter(entryFilter);
  if (entries.length === 0) return false;
  const done = completedIdsOn(state.completions, date);
  return entries.every((e) => done.has(e.itemId));
}

/** True when every enabled daypart that has planned work is fully complete. */
export function isDayFullyComplete(
  state: Pick<AppState, "completions" | "daypartEnabled" | "daypartEnabledByDate">,
  plan: DayPlan,
  date: string,
  entryFilter: (entry: PlannedEntry) => boolean = () => true,
): boolean {
  const workParts = DAYPARTS.filter((part) => {
    if (!isDaypartEnabled(state, date, part)) return false;
    return plan.slots[part].filter(entryFilter).length > 0;
  });
  if (workParts.length === 0) return false;
  return workParts.every((part) =>
    isDaypartSlotComplete(state, plan, date, part, entryFilter),
  );
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
): Record<DaypartId, import("./types").AccentId | null> {
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

export function previewPlan(
  state: AppState,
  date: string,
  now = new Date(),
): DayPlan {
  void now;
  return buildDayPlan(state, date);
}

export function hasAssignedSubjects(state: AppState, date: string): boolean {
  return subjectsOnDate(state, date).length > 0;
}

export function hasExpiredSchedulesOnDate(state: AppState, date: string): boolean {
  return expiredSubjectsOnDate(state, date).length > 0;
}

export function subjectNamesOnDate(state: AppState, date: string): string {
  return subjectsOnDate(state, date)
    .map((s) => s.name)
    .join(", ");
}

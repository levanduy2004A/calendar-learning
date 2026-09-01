import { addDays, currentDaypart, vnToday } from "./dates";
import { uid } from "./ids";
import {
  allUnlockedNodeIds,
  enabledDayparts,
  firstActionable,
  isNodeComplete,
  orderedNodes,
  previewPlan,
  reconcileToday,
} from "./planner";
import { createEmptyWorkingState, createSeedState } from "./seed";
import { deleteFile, putFile } from "./files";
import type {
  AccentId,
  AppState,
  DaypartId,
  DocType,
  LibraryDoc,
  SkillItem,
  SubjectIconId,
} from "./types";
import { ACCENT_CYCLE, EMPTY_STATE } from "./types";

const KEY = "hoc-app:v1";

let state: AppState = EMPTY_STATE;
let ready = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // quota — still keep memory state
  }
}

function withPlan(next: AppState, now = new Date()): AppState {
  return reconcileToday(next, now).state;
}

function setState(updater: (prev: AppState) => AppState) {
  state = withPlan(updater(state));
  persist();
  emit();
}

export function getState(): AppState {
  return state;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isStoreReady(): boolean {
  return ready;
}

export function initStore(): void {
  if (ready) return;
  if (typeof window === "undefined") {
    ready = true;
    return;
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed?.version === 1 && Array.isArray(parsed.subjects)) {
        state = withPlan(parsed);
      } else {
        state = withPlan(createSeedState());
      }
    } else {
      state = withPlan(createSeedState());
    }
  } catch {
    state = withPlan(createSeedState());
  }
  ready = true;
  persist();
  emit();
}

export function resetToDemo() {
  state = withPlan(createSeedState());
  persist();
  emit();
}

export function resetEmpty() {
  state = withPlan(createEmptyWorkingState());
  persist();
  emit();
}

function nextAccent(subjects: AppState["subjects"]): AccentId {
  return ACCENT_CYCLE[subjects.length % ACCENT_CYCLE.length];
}

export function createSubject(name: string, icon: SubjectIconId = "book") {
  const trimmed = name.trim();
  if (!trimmed) return;
  const id = uid("sub");
  setState((s) => ({
    ...s,
    subjects: [
      ...s.subjects,
      {
        id,
        name: trimmed,
        accent: nextAccent(s.subjects),
        icon,
        createdAt: Date.now(),
      },
    ],
  }));
  return id;
}

export function renameSubject(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  setState((s) => ({
    ...s,
    subjects: s.subjects.map((x) => (x.id === id ? { ...x, name: trimmed } : x)),
  }));
}

export function deleteSubject(id: string) {
  setState((s) => {
    const nodeIds = new Set(s.nodes.filter((n) => n.subjectId === id).map((n) => n.id));
    return {
      ...s,
      subjects: s.subjects.filter((x) => x.id !== id),
      nodes: s.nodes.filter((n) => n.subjectId !== id),
      items: s.items.filter((i) => !nodeIds.has(i.nodeId)),
      library: s.library.map((d) =>
        d.subjectId === id ? { ...d, subjectId: null, nodeId: null } : d,
      ),
    };
  });
}

export function createNode(subjectId: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) return;
  setState((s) => {
    const order = orderedNodes(s.nodes, subjectId).length;
    return {
      ...s,
      nodes: [
        ...s.nodes,
        { id: uid("node"), subjectId, title: trimmed, order },
      ],
    };
  });
}

export function renameNode(id: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) return;
  setState((s) => ({
    ...s,
    nodes: s.nodes.map((n) => (n.id === id ? { ...n, title: trimmed } : n)),
  }));
}

export function deleteNode(id: string) {
  setState((s) => ({
    ...s,
    nodes: s.nodes.filter((n) => n.id !== id),
    items: s.items.filter((i) => i.nodeId !== id),
    library: s.library.map((d) => (d.nodeId === id ? { ...d, nodeId: null } : d)),
  }));
}

export function createItem(
  nodeId: string,
  title: string,
  notes?: string,
  attachmentId?: string,
) {
  const trimmed = title.trim();
  if (!trimmed) return;
  setState((s) => ({
    ...s,
    items: [
      ...s.items,
      {
        id: uid("item"),
        nodeId,
        title: trimmed,
        notes: notes?.trim() || undefined,
        attachmentId,
        status: "todo",
      },
    ],
  }));
}

export function updateItem(
  id: string,
  patch: Partial<Pick<SkillItem, "title" | "notes" | "attachmentId">>,
) {
  setState((s) => ({
    ...s,
    items: s.items.map((i) =>
      i.id === id
        ? {
            ...i,
            ...patch,
            title: patch.title !== undefined ? patch.title.trim() || i.title : i.title,
          }
        : i,
    ),
  }));
}

export function deleteItem(id: string) {
  setState((s) => ({
    ...s,
    items: s.items.filter((i) => i.id !== id),
    completions: s.completions.filter((c) => c.itemId !== id),
  }));
}

export function toggleDaypart(date: string, part: DaypartId) {
  setState((s) => {
    const current =
      s.daypartEnabledByDate[date]?.[part] ?? s.daypartEnabled[part];
    const nextVal = !current;
    const remaining = enabledDayparts(s, date).filter((p) =>
      p === part ? nextVal : true,
    );
    if (remaining.length === 0 && !nextVal) {
      return s;
    }
    const today = vnToday();
    const plans = { ...s.plans };
    delete plans[date];
    if (date === today) {
      return {
        ...s,
        daypartEnabled: { ...s.daypartEnabled, [part]: nextVal },
        plans,
      };
    }
    return {
      ...s,
      daypartEnabledByDate: {
        ...s.daypartEnabledByDate,
        [date]: { ...s.daypartEnabledByDate[date], [part]: nextVal },
      },
      plans,
    };
  });
}

export function saveLibraryDoc(doc: Omit<LibraryDoc, "id" | "createdAt"> & { id?: string }) {
  const id = doc.id ?? uid("doc");
  setState((s) => {
    const nextDoc: LibraryDoc = {
      ...doc,
      id,
      createdAt: Date.now(),
    };
    const exists = s.library.some((d) => d.id === id);
    return {
      ...s,
      library: exists
        ? s.library.map((d) => (d.id === id ? { ...d, ...nextDoc } : d))
        : [...s.library, nextDoc],
    };
  });
  return id;
}

export async function saveLibraryFile(args: {
  type: DocType;
  title: string;
  file: File;
  subjectId?: string | null;
  nodeId?: string | null;
}) {
  const id = uid("doc");
  await putFile(id, args.file);
  saveLibraryDoc({
    id,
    type: args.type,
    title: args.title.trim() || args.file.name,
    mimeType: args.file.type,
    fileName: args.file.name,
    hasBlob: true,
    subjectId: args.subjectId,
    nodeId: args.nodeId,
  });
  return id;
}

export async function removeLibraryDoc(id: string) {
  const doc = state.library.find((d) => d.id === id);
  if (doc?.hasBlob) await deleteFile(id);
  setState((s) => ({
    ...s,
    library: s.library.filter((d) => d.id !== id),
    items: s.items.map((i) =>
      i.attachmentId === id ? { ...i, attachmentId: undefined } : i,
    ),
    nodes: s.nodes.map((n) =>
      n.attachmentId === id ? { ...n, attachmentId: undefined } : n,
    ),
    subjects: s.subjects.map((sub) =>
      sub.attachmentId === id ? { ...sub, attachmentId: undefined } : sub,
    ),
  }));
}

export function attachDoc(docId: string, target: {
  subjectId?: string | null;
  nodeId?: string | null;
  itemId?: string | null;
}) {
  setState((s) => ({
    ...s,
    library: s.library.map((d) => (d.id === docId ? { ...d, ...target } : d)),
    items:
      target.itemId
        ? s.items.map((i) =>
            i.id === target.itemId ? { ...i, attachmentId: docId } : i,
          )
        : s.items,
  }));
}

export function practiceXong(itemId: string, date: string, daypart: DaypartId) {
  setState((s) => {
    const items = s.items.map((i) =>
      i.id === itemId
        ? { ...i, status: "done" as const, completedAt: date, reviewDue: null }
        : i,
    );
    const completions = s.completions.filter(
      (c) => !(c.itemId === itemId && c.date === date),
    );
    completions.push({ itemId, date, daypart });
    return { ...s, items, completions };
  });
}

export function practiceChuaVung(itemId: string, date: string) {
  const tomorrow = addDays(date, 1);
  setState((s) => {
    const items = s.items.map((i) =>
      i.id === itemId
        ? { ...i, status: "todo" as const, reviewDue: tomorrow }
        : i,
    );
    const plan = s.plans[date];
    const plans = { ...s.plans };
    if (plan) {
      plans[date] = {
        ...plan,
        slots: {
          sang: plan.slots.sang.filter((e) => e.itemId !== itemId),
          chieu: plan.slots.chieu.filter((e) => e.itemId !== itemId),
          toi: plan.slots.toi.filter((e) => e.itemId !== itemId),
        },
      };
    }
    return { ...s, items, plans };
  });
}

export function practiceSkip() {
  // Skip does not pass: no status change, item stays in the slot.
}

export function getPreview(date: string) {
  return previewPlan(state, date);
}

export function getFirstActionable(date: string) {
  const plan = previewPlan(state, date);
  return firstActionable(plan, state, date, vnToday(), currentDaypart());
}

export function isItemUnlocked(itemId: string): boolean {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return false;
  return allUnlockedNodeIds(state.subjects, state.nodes, state.items).has(
    item.nodeId,
  );
}

export function nodeHasWork(nodeId: string): boolean {
  return !isNodeComplete(nodeId, state.items);
}

export { currentDaypart, vnToday };

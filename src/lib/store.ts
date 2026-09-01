import { addDays } from "./dates";
import { uid } from "./ids";
import {
  allUnlockedNodeIds,
  enabledDayparts,
  firstActionable,
  isNodeComplete,
  orderedNodes,
  previewPlan,
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
  SubjectSchedule,
} from "./types";
import { ACCENT_CYCLE, EMPTY_STATE } from "./types";
import { currentDaypart, vnToday } from "./dates";

const KEY = "hoc-app:v2";

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

function migrate(raw: unknown): AppState {
  if (!raw || typeof raw !== "object") return createSeedState();
  const data = raw as Record<string, unknown>;
  if (data.version === 2) return data as AppState;
  if (data.version === 1) {
    const v1 = data as AppState & {
      plans?: unknown;
      roundRobinCursor?: unknown;
    };
    return {
      version: 2,
      seeded: v1.seeded,
      subjects: v1.subjects ?? [],
      nodes: v1.nodes ?? [],
      items: v1.items ?? [],
      library: v1.library ?? [],
      schedules: {},
      daypartEnabled: v1.daypartEnabled ?? {
        sang: true,
        chieu: true,
        toi: true,
      },
      daypartEnabledByDate: v1.daypartEnabledByDate ?? {},
      completions: v1.completions ?? [],
    };
  }
  return createSeedState();
}

function setState(updater: (prev: AppState) => AppState) {
  state = updater(state);
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
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem("hoc-app:v1");
    if (raw) {
      const parsed = migrate(JSON.parse(raw));
      if (Array.isArray(parsed.subjects)) {
        state = parsed;
      } else {
        state = createSeedState();
      }
    } else {
      state = createSeedState();
    }
  } catch {
    state = createSeedState();
  }
  ready = true;
  persist();
  emit();
}

export function resetToDemo() {
  state = createSeedState();
  persist();
  emit();
}

export function resetEmpty() {
  state = createEmptyWorkingState();
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
    const rest = { ...s.schedules };
    delete rest[id];
    return {
      ...s,
      subjects: s.subjects.filter((x) => x.id !== id),
      nodes: s.nodes.filter((n) => n.subjectId !== id),
      items: s.items.filter((i) => !nodeIds.has(i.nodeId)),
      schedules: rest,
      library: s.library.map((d) =>
        d.subjectId === id ? { ...d, subjectId: null, nodeId: null } : d,
      ),
    };
  });
}

export function saveSubjectSchedule(schedule: SubjectSchedule) {
  setState((s) => ({
    ...s,
    schedules: {
      ...s.schedules,
      [schedule.subjectId]: { ...schedule, updatedAt: Date.now() },
    },
  }));
}

export function toggleScheduleEnabled(subjectId: string, enabled: boolean) {
  setState((s) => {
    const current = s.schedules[subjectId];
    if (!current) return s;
    return {
      ...s,
      schedules: {
        ...s.schedules,
        [subjectId]: { ...current, enabled, updatedAt: Date.now() },
      },
    };
  });
}

export function deleteSubjectSchedule(subjectId: string) {
  setState((s) => {
    const rest = { ...s.schedules };
    delete rest[subjectId];
    return { ...s, schedules: rest };
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
    if (date === today) {
      return {
        ...s,
        daypartEnabled: { ...s.daypartEnabled, [part]: nextVal },
      };
    }
    return {
      ...s,
      daypartEnabledByDate: {
        ...s.daypartEnabledByDate,
        [date]: { ...s.daypartEnabledByDate[date], [part]: nextVal },
      },
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
  setState((s) => ({
    ...s,
    items: s.items.map((i) =>
      i.id === itemId
        ? { ...i, status: "todo" as const, reviewDue: tomorrow }
        : i,
    ),
  }));
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

export type DaypartId = "sang" | "chieu" | "toi";
export type AccentId = "green" | "orange" | "blue" | "rose" | "violet";
export type SubjectIconId = "guitar" | "code" | "book" | "pen" | "flask";
export type ItemKind = "review" | "new";
export type DocType = "pdf" | "note" | "youtube" | "image";
export type NodeLock = "done" | "current" | "next" | "locked";

export const DAYPARTS: DaypartId[] = ["sang", "chieu", "toi"];

export const DAYPART_LABEL: Record<DaypartId, string> = {
  sang: "Sáng",
  chieu: "Chiều",
  toi: "Tối",
};

export const ACCENT_CYCLE: AccentId[] = [
  "green",
  "orange",
  "blue",
  "rose",
  "violet",
];

export type Subject = {
  id: string;
  name: string;
  accent: AccentId;
  icon: SubjectIconId;
  attachmentId?: string;
  createdAt: number;
};

export type SkillNode = {
  id: string;
  subjectId: string;
  title: string;
  order: number;
  attachmentId?: string;
};

export type SkillItem = {
  id: string;
  nodeId: string;
  title: string;
  notes?: string;
  attachmentId?: string;
  status: "todo" | "done";
  completedAt?: string;
  reviewDue?: string | null;
};

export type LibraryDoc = {
  id: string;
  type: DocType;
  title: string;
  text?: string;
  url?: string;
  mimeType?: string;
  fileName?: string;
  hasBlob?: boolean;
  subjectId?: string | null;
  nodeId?: string | null;
  itemId?: string | null;
  createdAt: number;
};

export type PlannedEntry = {
  itemId: string;
  kind: ItemKind;
  origin: "scheduled" | "rolled";
};

export type DayPlan = {
  date: string;
  slots: Record<DaypartId, PlannedEntry[]>;
  generatedAt: number;
};

export type Completion = {
  itemId: string;
  date: string;
  daypart: DaypartId;
};

export type AppState = {
  version: 1;
  seeded: boolean;
  subjects: Subject[];
  nodes: SkillNode[];
  items: SkillItem[];
  library: LibraryDoc[];
  daypartEnabled: Record<DaypartId, boolean>;
  daypartEnabledByDate: Record<string, Partial<Record<DaypartId, boolean>>>;
  plans: Record<string, DayPlan>;
  completions: Completion[];
  roundRobinCursor: number;
};

export const EMPTY_STATE: AppState = {
  version: 1,
  seeded: false,
  subjects: [],
  nodes: [],
  items: [],
  library: [],
  daypartEnabled: { sang: true, chieu: true, toi: true },
  daypartEnabledByDate: {},
  plans: {},
  completions: [],
  roundRobinCursor: 0,
};

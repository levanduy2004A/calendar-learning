export type DaypartId = "sang" | "chieu" | "toi";
export type AccentId = "green" | "orange" | "blue" | "rose" | "violet";
export type SubjectIconId = "guitar" | "code" | "book" | "pen" | "flask";
export type ItemKind = "review" | "new";
export type DocType = "pdf" | "note" | "youtube" | "image";
export type NodeLock = "done" | "current" | "next" | "locked";

export type RecurrencePattern = "daily" | "weekdays" | "monthly" | "yearly";
export type ScheduleRangeKind =
  | "this_week"
  | "this_month"
  | "this_year"
  | "until_date";

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

export const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

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

export type SubjectSchedule = {
  subjectId: string;
  enabled: boolean;
  mode: "recurrence" | "manual";
  pattern?: RecurrencePattern;
  weekdays?: number[];
  range?: ScheduleRangeKind;
  untilDate?: string;
  /** Frozen at save: first day the recurrence range applies. */
  rangeStart?: string;
  /** Frozen at save: last day the recurrence range applies. */
  rangeEnd?: string;
  anchorDate: string;
  manualDates?: string[];
  createdAt: number;
  updatedAt: number;
};

export type AppState = {
  version: 2;
  seeded: boolean;
  subjects: Subject[];
  nodes: SkillNode[];
  items: SkillItem[];
  library: LibraryDoc[];
  schedules: Record<string, SubjectSchedule>;
  daypartEnabled: Record<DaypartId, boolean>;
  daypartEnabledByDate: Record<string, Partial<Record<DaypartId, boolean>>>;
  completions: Completion[];
};

export const EMPTY_STATE: AppState = {
  version: 2,
  seeded: false,
  subjects: [],
  nodes: [],
  items: [],
  library: [],
  schedules: {},
  daypartEnabled: { sang: true, chieu: true, toi: true },
  daypartEnabledByDate: {},
  completions: [],
};

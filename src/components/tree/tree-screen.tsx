"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  Plus,
} from "lucide-react";
import { SubjectGlyph } from "@/components/subject-icon";
import { EmptyTree } from "@/components/tree/empty-tree";
import { LibrarySheet } from "@/components/library/library-sheet";
import { AddItemDialog, AddNodeDialog, AddSubjectDialog } from "@/components/forms/edit-dialogs";
import { useAppState } from "@/hooks/use-app-state";
import { itemsOfNode, nodeLockState, orderedNodes } from "@/lib/planner";
import { deleteNode, deleteSubject } from "@/lib/store";
import { ACCENTS } from "@/lib/tokens";
import type { SkillNode, Subject } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TreeHome({ subjectId }: { subjectId?: string }) {
  const { state } = useAppState();
  const router = useRouter();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [addSubject, setAddSubject] = useState(false);
  const [addNode, setAddNode] = useState(false);

  const selected =
    state.subjects.find((s) => s.id === subjectId) ?? state.subjects[0];
  const nodes = selected ? orderedNodes(state.nodes, selected.id) : [];

  if (state.subjects.length === 0 || !selected) {
    return (
      <>
        <EmptyTree
          hasSubject={false}
          onCreateNode={() => setAddSubject(true)}
          onAddMaterial={() => setLibraryOpen(true)}
          onCreateSubject={() => setAddSubject(true)}
        />
        <AddSubjectDialog
          open={addSubject}
          onOpenChange={setAddSubject}
          onCreated={(id) => {
            setAddSubject(false);
            router.push(`/cay/${id}`);
          }}
        />
        <LibrarySheet open={libraryOpen} onOpenChange={setLibraryOpen} />
      </>
    );
  }

  return (
    <div className="flex min-h-full flex-col px-5 pb-6 pt-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="font-heading text-[28px] font-bold">Cây kỹ năng</h1>
        <Link
          href="/thu-vien"
          className="text-[13px] font-semibold text-ink/55 underline-offset-2 hover:underline"
        >
          Thư viện
        </Link>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {state.subjects.map((s) => (
          <Link
            key={s.id}
            href={`/cay/${s.id}`}
            className={cn(
              "flex h-9 items-center gap-2 rounded-full bg-white px-3 text-[13px] font-semibold ring-1",
              s.id === selected.id ? "ring-ink" : "ring-ink/10",
            )}
          >
            <SubjectGlyph
              icon={s.icon}
              accent={s.accent}
              size="sm"
              className="size-6 rounded-lg"
            />
            {s.name}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setAddSubject(true)}
          className="flex h-9 items-center gap-1 rounded-full px-3 text-[13px] font-semibold text-ink/55 ring-1 ring-ink/10"
        >
          <Plus className="size-4" />
          Thêm môn
        </button>
      </div>

      {nodes.length === 0 ? (
        <EmptyTree
          hasSubject
          compact
          onCreateNode={() => setAddNode(true)}
          onAddMaterial={() => setLibraryOpen(true)}
        />
      ) : (
        <SubjectTree subject={selected} nodes={nodes} onAddNode={() => setAddNode(true)} />
      )}

      <AddSubjectDialog
        open={addSubject}
        onOpenChange={setAddSubject}
        onCreated={(id) => router.push(`/cay/${id}`)}
      />
      <AddNodeDialog open={addNode} onOpenChange={setAddNode} subjectId={selected.id} />
      <LibrarySheet
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        defaultSubjectId={selected.id}
      />
    </div>
  );
}

function SubjectTree({
  subject,
  nodes,
  onAddNode,
}: {
  subject: Subject;
  nodes: SkillNode[];
  onAddNode: () => void;
}) {
  const { state } = useAppState();
  const pal = ACCENTS[subject.accent];
  const openCount = nodes.filter((n) => {
    const lock = nodeLockState(n.id, subject.id, state.nodes, state.items);
    return lock === "current" || lock === "done" || lock === "next";
  }).length;
  const [expanded, setExpanded] = useState<string | null>(
    nodes.find((n) => nodeLockState(n.id, subject.id, state.nodes, state.items) === "current")
      ?.id ?? nodes[0]?.id,
  );
  const [addItemFor, setAddItemFor] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-1 flex items-end justify-between">
        <div>
          <h2 className="font-heading text-[32px] font-bold leading-none">{subject.name}</h2>
          <p className="mt-1 text-[13px] text-ink/45">
            {openCount} ô mở · {nodes.length} ô
          </p>
        </div>
        <button
          type="button"
          onClick={onAddNode}
          className="flex size-10 items-center justify-center rounded-full bg-white ring-1 ring-ink/10"
          aria-label="Tạo ô"
        >
          <Plus className="size-5" />
        </button>
      </div>

      <div className="relative mt-6">
        <div
          className="absolute top-4 bottom-4 left-[27px] w-px"
          style={{ background: pal.bg }}
        />
        <div className="relative flex flex-col gap-3">
          {nodes.map((node, idx) => {
            const lock = nodeLockState(node.id, subject.id, state.nodes, state.items);
            const items = itemsOfNode(state.items, node.id);
            const doneCount = items.filter((i) => i.status === "done").length;
            const isOpen = expanded === node.id && lock !== "locked";
            return (
              <div key={node.id}>
                {lock === "locked" ? (
                  <div className="relative flex items-center gap-3 rounded-[20px] bg-[#EFEBE3] px-4 py-3 text-ink/40">
                    <span className="flex size-8 items-center justify-center rounded-full bg-white/70">
                      <Lock className="size-4" />
                    </span>
                    <span className="font-semibold">{node.title}</span>
                  </div>
                ) : isOpen ? (
                  <div
                    className="relative rounded-[22px] bg-white p-3 ring-2"
                    style={{ borderColor: pal.ink, boxShadow: `0 0 0 1px ${pal.ink}` }}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-3"
                      onClick={() => setExpanded(null)}
                    >
                      <span
                        className="flex size-8 items-center justify-center rounded-full text-[13px] font-bold text-white"
                        style={{ background: pal.ink }}
                      >
                        {idx + 1}
                      </span>
                      <span className="flex-1 text-left text-[16px] font-bold">
                        {node.title}
                      </span>
                      <span className="text-[13px] font-semibold" style={{ color: pal.ink }}>
                        {doneCount}/{items.length || 0}
                      </span>
                    </button>
                    <ul className="mt-3 space-y-1">
                      {items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center gap-3 rounded-2xl px-1 py-2"
                        >
                          <span className="text-ink/35">•</span>
                          <span className="flex-1 text-[15px] font-medium">{item.title}</span>
                          {item.status === "done" ? (
                            <span
                              className="flex size-6 items-center justify-center rounded-full text-white"
                              style={{ background: pal.ink }}
                            >
                              <Check className="size-3.5" strokeWidth={3} />
                            </span>
                          ) : item.reviewDue ? (
                            <span
                              className="size-6 rounded-full"
                              style={{
                                background: `conic-gradient(${pal.ink} 40%, ${pal.bg} 0)`,
                              }}
                            />
                          ) : (
                            <span className="size-6 rounded-full ring-1 ring-ink/20" />
                          )}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAddItemFor(node.id)}
                        className="h-10 flex-1 rounded-full text-[13px] font-semibold ring-1 ring-ink/15"
                      >
                        Thêm đầu mục
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Xóa ô «${node.title}»?`)) deleteNode(node.id);
                        }}
                        className="h-10 rounded-full px-3 text-[13px] text-ink/40"
                      >
                        Xóa ô
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setExpanded(node.id)}
                    className={cn(
                      "relative flex w-full items-center gap-3 rounded-[20px] px-4 py-3",
                      lock === "done" ? "text-ink" : "bg-[#EFEBE3] text-ink/70",
                    )}
                    style={
                      lock === "done"
                        ? { background: pal.bg, color: pal.ink }
                        : undefined
                    }
                  >
                    {lock === "done" ? (
                      <span
                        className="flex size-8 items-center justify-center rounded-full text-white"
                        style={{ background: pal.ink }}
                      >
                        <Check className="size-4" strokeWidth={3} />
                      </span>
                    ) : (
                      <span className="flex size-8 items-center justify-center rounded-full bg-white text-[13px] font-bold">
                        {idx + 1}
                      </span>
                    )}
                    <span className="flex-1 text-left font-semibold">{node.title}</span>
                    <ChevronRight className="size-4 opacity-50" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          className="text-[12px] text-ink/35 underline-offset-2 hover:underline"
          onClick={() => {
            if (confirm(`Xóa môn «${subject.name}» và toàn bộ ô?`)) deleteSubject(subject.id);
          }}
        >
          Xóa môn này
        </button>
      </div>

      <AddItemDialog
        open={Boolean(addItemFor)}
        onOpenChange={(o) => {
          if (!o) setAddItemFor(null);
        }}
        nodeId={addItemFor ?? ""}
      />
    </div>
  );
}

export function SubjectTreePage({ subjectId }: { subjectId: string }) {
  const { state } = useAppState();
  const subject = state.subjects.find((s) => s.id === subjectId);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [addNode, setAddNode] = useState(false);

  const nodes = useMemo(
    () => (subject ? orderedNodes(state.nodes, subject.id) : []),
    [state.nodes, subject],
  );

  if (!subject) {
    return (
      <div className="px-5 pt-8">
        <p>Không tìm thấy môn.</p>
        <Link href="/cay" className="mt-3 inline-block font-semibold underline">
          Về cây kỹ năng
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col px-5 pb-6 pt-4">
      <div className="mb-2 flex items-center gap-2">
        <Link
          href="/cay"
          className="flex size-10 items-center justify-center rounded-full"
          aria-label="Quay lại"
        >
          <ChevronLeft className="size-6" />
        </Link>
        <Link href="/thu-vien" className="ml-auto text-[13px] font-semibold text-ink/55">
          Thêm tài liệu
        </Link>
      </div>
      {nodes.length === 0 ? (
        <EmptyTree
          hasSubject
          onCreateNode={() => setAddNode(true)}
          onAddMaterial={() => setLibraryOpen(true)}
        />
      ) : (
        <SubjectTree subject={subject} nodes={nodes} onAddNode={() => setAddNode(true)} />
      )}
      <AddNodeDialog open={addNode} onOpenChange={setAddNode} subjectId={subject.id} />
      <LibrarySheet
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        defaultSubjectId={subject.id}
      />
    </div>
  );
}


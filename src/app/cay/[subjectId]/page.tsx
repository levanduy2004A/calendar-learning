"use client";

import { use } from "react";
import { SubjectTreePage } from "@/components/tree/tree-screen";

export default function CaySubjectPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = use(params);
  return <SubjectTreePage subjectId={subjectId} />;
}

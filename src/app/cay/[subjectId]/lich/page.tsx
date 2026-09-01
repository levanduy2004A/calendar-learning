"use client";

import { use } from "react";
import { ScheduleSetupScreen } from "@/components/schedule/schedule-setup-screen";

export default function SubjectSchedulePage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = use(params);
  return <ScheduleSetupScreen subjectId={subjectId} />;
}

"use client";

import { use } from "react";
import { ScheduleManageScreen } from "@/components/schedule/schedule-manage-screen";

export default function SubjectScheduleManagePage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = use(params);
  return <ScheduleManageScreen subjectId={subjectId} />;
}

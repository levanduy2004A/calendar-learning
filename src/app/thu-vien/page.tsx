"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LibrarySheet } from "@/components/library/library-sheet";

export default function ThuVienPage() {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) router.replace("/cay");
  }, [open, router]);

  return (
    <LibrarySheet
      open={open}
      onOpenChange={setOpen}
    />
  );
}

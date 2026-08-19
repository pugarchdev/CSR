"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DncAssignmentsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/assignments");
  }, [router]);
  return null;
}

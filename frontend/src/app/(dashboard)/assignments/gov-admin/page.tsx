"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GovAdminAssignmentsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/assignments");
  }, [router]);
  return null;
}

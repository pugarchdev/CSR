"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DepartmentTrackRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/track");
  }, [router]);

  return (
    <div className="flex min-h-[400px] items-center justify-center p-8 text-xs font-bold text-slate-500">
      Redirecting to Application Tracker...
    </div>
  );
}


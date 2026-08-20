"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProjectsRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/convergence-projects");
  }, [router]);

  return null;
}

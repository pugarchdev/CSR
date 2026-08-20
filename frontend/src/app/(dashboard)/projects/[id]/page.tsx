"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ProjectDetailForwarder() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const id = params?.id;
    if (id && typeof id === "string") {
      router.replace(`/convergence-projects/${id}`);
    } else {
      router.replace("/convergence-projects");
    }
  }, [params, router]);

  return null;
}

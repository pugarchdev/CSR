"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AssessmentsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/enquiries");
  }, [router]);

  return null;
}

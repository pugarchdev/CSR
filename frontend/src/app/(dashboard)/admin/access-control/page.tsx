"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AccessControlPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/access-control/roles");
  }, [router]);

  return null;
}

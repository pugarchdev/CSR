"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function AssessmentRedirectPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const id = params?.id;
    if (id && typeof id === "string") {
      router.replace(`/enquiries/${id}`);
    } else {
      router.replace("/enquiries");
    }
  }, [params, router]);

  return null;
}

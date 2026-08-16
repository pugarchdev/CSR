"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { isInternalAuthorityUser } from "@/lib/navigationManifest";
import { OrganizationOnboardingStatusWorkspace } from "@/components/admin/PlatformAdminWorkspaces";

export default function OrganizationOnboardingStatusPage() {
  const router = useRouter();
  const { roles, user, isAdmin } = useAuthStore();
  const userRoles = roles?.length > 0 ? roles : (user?.role ? [user.role] : []);
  const isInternal = isInternalAuthorityUser(userRoles, isAdmin);

  useEffect(() => {
    if (isInternal) {
      router.replace("/dashboard");
    }
  }, [isInternal, router]);

  if (isInternal) {
    return null;
  }

  return <OrganizationOnboardingStatusWorkspace />;
}

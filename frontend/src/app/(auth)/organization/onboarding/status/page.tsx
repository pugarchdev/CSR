"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { isInternalAuthorityUser } from "@/lib/navigationManifest";
import { OrganizationOnboardingStatusWorkspace } from "@/components/admin/PlatformAdminWorkspaces";
import { Loader2 } from "lucide-react";

function OnboardingStatusContent() {
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

export default function OrganizationOnboardingStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-blue-600 h-8 w-8" />
        </div>
      }
    >
      <OnboardingStatusContent />
    </Suspense>
  );
}

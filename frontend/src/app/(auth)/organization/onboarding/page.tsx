"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OrganizationOnboardingWorkspace } from "@/components/admin/PlatformAdminWorkspaces";
import { apiFetch, getStoredUser } from "@/lib/api";

type OrganizationStatus = {
  organizationType?: string;
};

export default function OrganizationOnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    const user = getStoredUser();
    const role = user?.role as string | undefined;
    const storedOrganizationType = user?.organization?.organizationType as string | undefined;

    const routeToTypeForm = (kind?: string) => {
      const isInternal =
        role.includes("SUPER_ADMIN") ||
        role.includes("PLANNING_SECRETARY") ||
        role.includes("JOINT_SECRETARY") ||
        role.includes("CSR_RELATIONSHIP_MANAGER") ||
        role.includes("RELATIONSHIP_MANAGER") ||
        role.includes("STATE_CSR_CELL") ||
        role.includes("PORTAL_ADMIN") ||
        role.includes("CSR_ADMIN") ||
        numericRoleId === 1 ||
        numericRoleId === 2 ||
        numericRoleId === 3 ||
        numericRoleId === 5 ||
        numericRoleId === 6;

      if (isInternal) {
        router.replace("/dashboard");
        return true;
      }
      if (
        organizationType === "CSR_COMPANY" ||
        role === "COMPANY_ADMIN" ||
        role === "COMPANY_MEMBER" ||
        role === "CORPORATE_USER"
      ) {
        router.replace("/organization/onboarding/company");
        return true;
      }
      return false;
    };

    if (routeByType(storedOrganizationType)) return;

    apiFetch<any>("/onboarding/status")
      .then((res) => {
        const org = res?.data || res || {};
        
        const currentStatus = (org.onboardingStatus || org.status || "").toUpperCase();
        if (currentStatus && currentStatus !== "PROFILE_INCOMPLETE" && currentStatus !== "DOCUMENTS_PENDING") {
          router.replace("/organization/onboarding/status");
          return;
        }

        routeToTypeForm(org.kind || org.organizationType);
      })
      .catch(() => {
        routeToTypeForm(storedOrgKind);
      })
      .catch(() => {});
  }, [router]);

  return <OrganizationOnboardingWorkspace />;
}


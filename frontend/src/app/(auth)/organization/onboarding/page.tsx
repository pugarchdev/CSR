"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OrganizationOnboardingWorkspace } from "@/components/admin/PlatformAdminWorkspaces";
import { apiFetch, getStoredUser } from "@/lib/api";

export default function OrganizationOnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    const user = getStoredUser();
    const role = (user?.role || user?.roleSlug || "").toUpperCase();
    const accountType = (user?.accountType || "").toUpperCase();
    const storedOrgType = (user?.organization?.organizationType || user?.orgKind || "").toUpperCase();
    const numericRoleId = user?.roleNumericId;

    const routeByType = (orgType?: string) => {
      const typeStr = (orgType || "").toUpperCase();
      const isGov =
        typeStr === "GOVERNMENT_DEPARTMENT" ||
        typeStr === "GOVT_DEPARTMENT" ||
        accountType === "GOVERNMENT_DEPARTMENT" ||
        role === "BENEFICIARY_AGENCY" ||
        role === "NODAL_OFFICER" ||
        role === "GOVERNMENT_USER" ||
        role === "GOV_ENTITY" ||
        numericRoleId === 7;

      if (isGov) {
        router.replace("/organization/onboarding/department");
        return true;
      }

      const isCompany =
        typeStr === "CSR_COMPANY" ||
        typeStr === "COMPANY" ||
        accountType === "CSR_COMPANY" ||
        role === "COMPANY_ADMIN" ||
        role === "COMPANY_MEMBER" ||
        role === "CORPORATE_USER" ||
        role === "CORPORATE" ||
        numericRoleId === 8;

      if (isCompany) {
        router.replace("/organization/onboarding/company");
        return true;
      }
      return false;
    };

    if (routeByType(storedOrgType)) return;

    apiFetch<any>("/onboarding/status")
      .then((res) => {
        const org = res?.data || res || {};
        const currentStatus = (org.onboardingStatus || "").toUpperCase();
        const locked = ["SUBMITTED_FOR_REVIEW", "UNDER_VERIFICATION", "APPROVED", "SUSPENDED"];
        if (currentStatus && locked.includes(currentStatus)) {
          router.replace(currentStatus === "APPROVED" ? "/organization/onboarding/details" : "/organization/onboarding/status");
          return;
        }
        if (!routeByType(org.organizationType)) {
          router.replace("/organization/onboarding/department");
        }
      })
      .catch(() => {
        router.replace("/organization/onboarding/department");
      });
  }, [router]);

  return <OrganizationOnboardingWorkspace />;
}


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
    const storedOrgKind = (user?.organization?.kind || user?.organization?.organizationType || user?.orgKind || "").toUpperCase();
    const numericRoleId = user?.roleNumericId;

    const routeToTypeForm = (kind?: string) => {
      const typeStr = (kind || storedOrgKind || "").toUpperCase();
      const isGov =
        typeStr === "GOVERNMENT_DEPARTMENT" ||
        typeStr === "GOVT_DEPARTMENT" ||
        typeStr === "DEPARTMENT" ||
        accountType === "GOVERNMENT_DEPARTMENT" ||
        role === "BENEFICIARY_AGENCY" ||
        role === "NODAL_OFFICER" ||
        role === "GOVERNMENT_USER" ||
        role === "GOV_ENTITY" ||
        role === "DEPARTMENT_ADMIN" ||
        role === "GOVERNMENT_DEPARTMENT_ADMIN" ||
        role.includes("GOVT") ||
        role.includes("DEPARTMENT") ||
        numericRoleId === 7;

      if (isGov) {
        router.replace("/organization/onboarding/department");
        return true;
      }

      const isCompany =
        typeStr === "CSR_COMPANY" ||
        typeStr === "COMPANY" ||
        typeStr === "CORPORATE" ||
        accountType === "CSR_COMPANY" ||
        role === "COMPANY_ADMIN" ||
        role === "COMPANY_MEMBER" ||
        role === "CORPORATE_USER" ||
        role === "CORPORATE" ||
        role.includes("COMPANY") ||
        role.includes("CORPORATE") ||
        numericRoleId === 8;

      if (isCompany) {
        router.replace("/organization/onboarding/company");
        return true;
      }

      router.replace("/organization/onboarding/department");
      return true;
    };

    apiFetch<any>("/onboarding/status")
      .then((res) => {
        const org = res?.data || res || {};
        const currentStatus = (org.onboardingStatus || org.status || user?.organization?.status || "").toUpperCase();
        if (currentStatus === "APPROVED") {
          router.replace("/organization/onboarding/details");
          return;
        }
        routeToTypeForm(org.kind || org.organizationType);
      })
      .catch(() => {
        routeToTypeForm(storedOrgKind);
      });
  }, [router]);

  return <OrganizationOnboardingWorkspace />;
}


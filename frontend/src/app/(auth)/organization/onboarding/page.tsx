"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { apiFetch, getStoredUser } from "@/lib/api";

export default function OrganizationOnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    const user = getStoredUser();
    const role = (user?.role || user?.roleSlug || "").toUpperCase();
    const accountType = (user?.accountType || "").toUpperCase();
    const storedOrgKind = (user?.organization?.kind || user?.organization?.organizationType || user?.orgKind || "").toUpperCase();
    const numericRoleId = Number(user?.roleNumericId || user?.roleId || (typeof user?.role === "number" ? user?.role : 0));

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
        numericRoleId === 6 ||
        numericRoleId === 7;

      if (isInternal) {
        router.replace("/dashboard");
        return true;
      }

      const typeStr = (kind || storedOrgKind || "").toUpperCase();
      const isGov =
        typeStr === "GOVERNMENT_DEPARTMENT" ||
        typeStr === "GOVT_DEPARTMENT" ||
        typeStr === "DEPARTMENT" ||
        accountType === "GOVERNMENT_DEPARTMENT" ||
        role === "BENEFICIARY_AGENCY" ||
        role === "GOVERNMENT_USER" ||
        role === "GOV_ENTITY" ||
        role === "DEPARTMENT_ADMIN" ||
        role === "GOVERNMENT_DEPARTMENT_ADMIN" ||
        numericRoleId === 4;

      if (isGov) {
        router.replace("/organization/onboarding/government");
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

      router.replace("/organization/onboarding/government");
      return true;
    };

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
      .finally(() => undefined);
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50/50">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <Loader2 className="animate-spin text-blue-900" size={24} />
        <span className="text-sm font-semibold text-slate-700">Loading Organization Onboarding Workspace...</span>
      </div>
    </div>
  );
}



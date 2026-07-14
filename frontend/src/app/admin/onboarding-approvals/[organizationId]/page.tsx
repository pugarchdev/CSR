"use client";

import { AdminOrganizationDetailsWorkspace } from "@/components/admin/PlatformAdminWorkspaces";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import "../../../../styles/gov-theme.css";

export default function AdminOnboardingApprovalDetailsPage({ params }: { params: { organizationId: string } }) {
  return (
    <GovPortalLayout>
      <div className="gov-container">
        <AdminOrganizationDetailsWorkspace organizationId={params.organizationId} />
      </div>
    </GovPortalLayout>
  );
}

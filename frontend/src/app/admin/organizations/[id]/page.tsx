"use client";

import { AdminOrganizationDetailsWorkspace } from "@/components/admin/PlatformAdminWorkspaces";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import "../../../../styles/gov-theme.css";

export default function AdminOrganizationDetailsPage({ params }: { params: { id: string } }) {
  return (
    <GovPortalLayout>
      <div className="gov-container">
        <AdminOrganizationDetailsWorkspace organizationId={params.id} />
      </div>
    </GovPortalLayout>
  );
}

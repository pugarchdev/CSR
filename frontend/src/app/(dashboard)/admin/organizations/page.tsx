"use client";

import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { AdminOrganizationsWorkspace } from "@/components/admin/PlatformAdminWorkspaces";

export default function AdminOrganizationsPage() {
  return (
    <GovPortalLayout>
      <AdminOrganizationsWorkspace />
    </GovPortalLayout>
  );
}

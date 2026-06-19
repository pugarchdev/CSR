import PortalModulePage from "@/components/PortalModulePage";

export default function AdminApprovalQueuePage() {
  return (
    <PortalModulePage
      eyebrow="Administration"
      title="Approval Queue"
      description="Final approval queue for verified NGOs, companies, government entities, and project proposals."
      metrics={[
        { label: "Pending Approval", value: "18" },
        { label: "Approved Today", value: "0" },
        { label: "Rejected", value: "0" },
      ]}
      rows={[
        ["APP-NGO", "NGO onboarding approval", "Approving authority", "Pending"],
        ["APP-COMP", "Corporate account approval", "Approving authority", "Pending"],
      ]}
      actions={[{ label: "Admin Dashboard", href: "/admin/dashboard", primary: true }]}
    />
  );
}

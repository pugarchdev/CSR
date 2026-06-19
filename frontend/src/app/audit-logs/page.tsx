import PortalModulePage from "@/components/PortalModulePage";

export default function AuditLogsPage() {
  return (
    <PortalModulePage
      eyebrow="Audit"
      title="System Audit Logs"
      description="Review user access, verification decisions, document changes, and administrative workflow events."
      metrics={[
        { label: "Events Today", value: "0" },
        { label: "Retention", value: "8 yrs" },
        { label: "Access", value: "Restricted" },
      ]}
      rows={[
        ["AUD-LOGIN", "User session activity", "System", "Logged"],
        ["AUD-DOC", "Document review decisions", "Verification desk", "Logged"],
        ["AUD-APPROVAL", "Approval and rejection actions", "Admin desk", "Logged"],
      ]}
      actions={[{ label: "Reports", href: "/reports", primary: true }]}
    />
  );
}

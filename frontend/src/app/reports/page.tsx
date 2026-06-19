import PortalModulePage from "@/components/PortalModulePage";

export default function ReportsPage() {
  return (
    <PortalModulePage
      eyebrow="Reports"
      title="Reports Desk"
      description="Generate official summaries for onboarding status, CSR utilization, milestone releases, and audit registers."
      metrics={[
        { label: "Templates", value: "4" },
        { label: "Exports", value: "PDF/CSV" },
        { label: "Status", value: "Ready" },
      ]}
      rows={[
        ["RPT-UTIL", "CSR utilization register", "Reporting cell", "Ready"],
        ["RPT-AUDIT", "Compliance audit summary", "Reporting cell", "Ready"],
        ["RPT-DIST", "District coverage statement", "Reporting cell", "Ready"],
      ]}
      actions={[{ label: "Audit Logs", href: "/audit-logs", primary: true }]}
    />
  );
}

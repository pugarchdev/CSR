import PortalModulePage from "@/components/PortalModulePage";

export default function QueriesPage() {
  return (
    <PortalModulePage
      eyebrow="Reviewer communication"
      title="Queries and Clarifications"
      description="Respond to administrator document queries, compliance observations, and project review remarks."
      metrics={[
        { label: "Open Queries", value: "0" },
        { label: "Resolved", value: "0" },
        { label: "Response SLA", value: "3 days" },
      ]}
      rows={[["QUERY-000", "No active queries assigned", "Review desk", "Clear"]]}
      actions={[{ label: "View Documents", href: "/onboarding/documents", primary: true }]}
    />
  );
}

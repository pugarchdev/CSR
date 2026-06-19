import PortalModulePage from "@/components/PortalModulePage";

export default function AdminDocumentReviewPage() {
  return (
    <PortalModulePage
      eyebrow="Administration"
      title="Document Review Desk"
      description="Verify CSR-1, Darpan, PAN, 12A/80G, audited statements, CIN, GST, and authorization documents."
      metrics={[
        { label: "Pending", value: "42" },
        { label: "Flagged", value: "0" },
        { label: "SLA", value: "7 days" },
      ]}
      rows={[
        ["DOC-QUEUE", "Credential document review", "Verification officer", "Pending"],
        ["DOC-AUDIT", "Financial statement audit", "Compliance officer", "Pending"],
      ]}
      actions={[{ label: "Applications", href: "/admin/applications", primary: true }]}
    />
  );
}

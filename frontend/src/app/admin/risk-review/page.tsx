import PortalModulePage from "@/components/PortalModulePage";

export default function AdminRiskReviewPage() {
  return (
    <PortalModulePage
      eyebrow="Administration"
      title="Risk Review Desk"
      description="Review compliance flags, duplicate records, document mismatches, and funding exception signals."
      metrics={[
        { label: "High Risk", value: "12" },
        { label: "Medium", value: "0" },
        { label: "Cleared", value: "0" },
      ]}
      rows={[
        ["RISK-KYC", "Identity or registration mismatch", "Risk cell", "Review"],
        ["RISK-FUND", "Budget declaration exception", "Finance cell", "Review"],
      ]}
      actions={[{ label: "Approval Queue", href: "/admin/approval-queue", primary: true }]}
    />
  );
}

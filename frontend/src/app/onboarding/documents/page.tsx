import PortalModulePage from "@/components/PortalModulePage";

export default function OnboardingDocumentsPage() {
  return (
    <PortalModulePage
      eyebrow="NGO onboarding"
      title="Verification Documents"
      description="Upload and track statutory documents required for CSR participation and administrator approval."
      metrics={[
        { label: "Required", value: "7" },
        { label: "Uploaded", value: "0" },
        { label: "Review SLA", value: "7 days" },
      ]}
      rows={[
        ["DOC-CSR1", "CSR-1 registration certificate", "NGO applicant", "Required"],
        ["DOC-DARPAN", "NGO Darpan registration proof", "NGO applicant", "Required"],
        ["DOC-AUDIT", "Latest audited financial statements", "NGO applicant", "Required"],
      ]}
      actions={[{ label: "Back to Onboarding", href: "/onboarding", primary: true }]}
    />
  );
}

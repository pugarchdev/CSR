import PortalModulePage from "@/components/PortalModulePage";

export default function NewCSRProjectPage() {
  return (
    <PortalModulePage
      eyebrow="CSR projects"
      title="Create Project Proposal"
      description="Start a proposal with focus area, target district, budget request, milestones, beneficiary plan, and evidence requirements."
      metrics={[
        { label: "Form Sections", value: "6" },
        { label: "Evidence Required", value: "Yes" },
        { label: "Approval", value: "Admin" },
      ]}
      rows={[
        ["STEP-1", "Project identity and focus sector", "NGO applicant", "Pending"],
        ["STEP-2", "Budget and milestone plan", "NGO applicant", "Pending"],
        ["STEP-3", "Submission for administrative approval", "Review desk", "Pending"],
      ]}
      actions={[{ label: "Back to Projects", href: "/csr-projects", primary: true }]}
    />
  );
}

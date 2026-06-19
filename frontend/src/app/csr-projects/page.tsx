import PortalModulePage from "@/components/PortalModulePage";

export default function CSRProjectsPage() {
  return (
    <PortalModulePage
      eyebrow="CSR projects"
      title="Project Proposal Register"
      description="Create, submit, and monitor CSR project proposals before they are listed in the public project directory."
      metrics={[
        { label: "Drafts", value: "0" },
        { label: "Submitted", value: "0" },
        { label: "Approved", value: "0" },
      ]}
      rows={[
        ["PROJECT-DRAFT", "No project proposals created yet", "Organization", "Draft"],
      ]}
      actions={[
        { label: "Create Project", href: "/csr-projects/new", primary: true },
        { label: "Open Directory", href: "/marketplace" },
      ]}
    />
  );
}

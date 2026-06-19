import PortalModulePage from "@/components/PortalModulePage";

export default function FundReleasesPage() {
  return (
    <PortalModulePage
      eyebrow="Financial"
      title="Fund Release Queue"
      description="Review tranche readiness after milestone evidence is verified and approved for release."
      metrics={[
        { label: "Ready", value: "0" },
        { label: "Held", value: "0" },
        { label: "Released", value: "0" },
      ]}
      rows={[["FR-000", "No milestone tranche pending release", "Escrow desk", "Clear"]]}
      actions={[{ label: "Payments Register", href: "/payments", primary: true }]}
    />
  );
}

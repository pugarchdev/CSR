import PortalModulePage from "@/components/PortalModulePage";

export default function PaymentsPage() {
  return (
    <PortalModulePage
      eyebrow="Financial"
      title="Payments Register"
      description="Track CSR payment instructions, escrow entries, disbursement references, and receipt records."
      metrics={[
        { label: "Pending", value: "0" },
        { label: "Cleared", value: "0" },
        { label: "Exceptions", value: "0" },
      ]}
      rows={[["PAY-000", "No payment records available", "Escrow desk", "Clear"]]}
      actions={[{ label: "Fund Releases", href: "/fund-releases", primary: true }]}
    />
  );
}

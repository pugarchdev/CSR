import PortalModulePage from "@/components/PortalModulePage";

export default function ProfilePage() {
  return (
    <PortalModulePage
      eyebrow="Account"
      title="Organization Profile"
      description="Maintain contact information, registration identifiers, office address, and primary user details."
      metrics={[
        { label: "Profile", value: "Draft" },
        { label: "Verification", value: "Pending" },
        { label: "Access", value: "User" },
      ]}
      rows={[
        ["PROFILE-NAME", "Organization legal name", "Account holder", "Required"],
        ["PROFILE-CONTACT", "Primary contact and address", "Account holder", "Required"],
      ]}
      actions={[{ label: "Settings", href: "/settings", primary: true }]}
    />
  );
}

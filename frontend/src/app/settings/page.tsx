import PortalModulePage from "@/components/PortalModulePage";

export default function SettingsPage() {
  return (
    <PortalModulePage
      eyebrow="Account"
      title="Settings"
      description="Configure notification preferences, account controls, communication settings, and security options."
      metrics={[
        { label: "Notifications", value: "On" },
        { label: "Security", value: "Standard" },
        { label: "Language", value: "English" },
      ]}
      rows={[
        ["SET-EMAIL", "Email notifications for approvals and queries", "Account holder", "Enabled"],
        ["SET-SLA", "Reminder alerts for pending actions", "System", "Enabled"],
      ]}
      actions={[{ label: "Profile", href: "/profile", primary: true }]}
    />
  );
}

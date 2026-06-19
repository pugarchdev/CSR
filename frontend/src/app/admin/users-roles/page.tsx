import PortalModulePage from "@/components/PortalModulePage";

export default function AdminUsersRolesPage() {
  return (
    <PortalModulePage
      eyebrow="Administration"
      title="Users and Roles"
      description="Manage platform users, access classes, department accounts, and role-based permissions."
      metrics={[
        { label: "Users", value: "0" },
        { label: "Roles", value: "5" },
        { label: "Pending Access", value: "0" },
      ]}
      rows={[
        ["ROLE-NGO", "NGO admin and member roles", "System", "Active"],
        ["ROLE-COMPANY", "Company admin and member roles", "System", "Active"],
        ["ROLE-GOV", "Government entity restricted access", "System", "Active"],
      ]}
      actions={[{ label: "Admin Dashboard", href: "/admin/dashboard", primary: true }]}
    />
  );
}

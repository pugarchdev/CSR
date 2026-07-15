"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovInput from "@/components/gov/GovInput";
import GovModal from "@/components/gov/GovModal";
import GovSelect from "@/components/gov/GovSelect";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import "../../../styles/gov-theme.css";

const WORKFLOW_ROLES = [
  "CSR_RELATIONSHIP_MANAGER",
  "DISTRICT_NODAL_OFFICER",
  "JOINT_SECRETARY",
  "STATE_CSR_CELL",
  "PLANNING_SECRETARY",
  "GOVERNMENT_OFFICER",
  "IMPLEMENTING_AGENCY_USER",
  "CORPORATE_USER",
  "CSR_ADMIN",
  "PORTAL_ADMIN",
  "SUPER_ADMIN",
  "DISTRICT_ADMIN",
] as const;

const DISTRICT_ROLES = new Set(["CSR_RELATIONSHIP_MANAGER", "DISTRICT_NODAL_OFFICER", "DISTRICT_ADMIN"]);

const MAHARASHTRA_DISTRICTS = [
  "Ahmednagar",
  "Akola",
  "Amravati",
  "Aurangabad",
  "Beed",
  "Bhandara",
  "Buldhana",
  "Chandrapur",
  "Dhule",
  "Gadchiroli",
  "Gondia",
  "Hingoli",
  "Jalgaon",
  "Jalna",
  "Kolhapur",
  "Latur",
  "Mumbai City",
  "Mumbai Suburban",
  "Nagpur",
  "Nanded",
  "Nandurbar",
  "Nashik",
  "Osmanabad",
  "Palghar",
  "Parbhani",
  "Pune",
  "Raigad",
  "Ratnagiri",
  "Sangli",
  "Satara",
  "Sindhudurg",
  "Solapur",
  "Thane",
  "Wardha",
  "Washim",
  "Yavatmal",
];

type UserRow = {
  id: string;
  email: string;
  role: string;
  accountStatus?: string;
  assignedDistrict?: string | null;
  isVerified?: boolean;
  ngo?: { name: string };
  company?: { name: string };
};

export default function AdminUsersRolesPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "Temp@12345",
    role: "CSR_RELATIONSHIP_MANAGER",
    assignedDistrict: "",
    accountStatus: "ACTIVE",
  });

  const fetchUsers = () => {
    setLoading(true);
    apiFetch<UserRow[]>("/admin/users")
      .then((data) => {
        if (data) setUsers(data);
      })
      .catch((err) => setError(err.message || "Failed to load users"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const setField = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm({
      email: "",
      password: "Temp@12345",
      role: "CSR_RELATIONSHIP_MANAGER",
      assignedDistrict: "",
      accountStatus: "ACTIVE",
    });
    setError("");
    setSuccess("");
  };

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiFetch<UserRow>("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          assignedDistrict: form.assignedDistrict || undefined,
          accountStatus: form.accountStatus,
        }),
      });
      setSuccess("User account created successfully.");
      setModalOpen(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const updateUser = async (user: UserRow, key: "role" | "assignedDistrict" | "accountStatus", value: string) => {
    const nextUser = { ...user, [key]: value };
    setUsers((current) => current.map((candidate) => candidate.id === user.id ? nextUser : candidate));
    setError("");
    setSuccess("");

    try {
      const updated = await apiFetch<UserRow>(`/admin/users/${user.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({
          role: nextUser.role,
          assignedDistrict: nextUser.assignedDistrict || undefined,
          accountStatus: nextUser.accountStatus || "ACTIVE",
        }),
      });
      setUsers((current) => current.map((candidate) => candidate.id === user.id ? { ...candidate, ...updated } : candidate));
      setSuccess("User access updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
      fetchUsers();
    }
  };

  const userCount = users.length;
  const metrics = [
    { label: "Users", value: loading ? "..." : String(userCount) },
    { label: "Workflow Roles", value: String(WORKFLOW_ROLES.length) },
    { label: "Pending Access", value: String(users.filter((u) => u.accountStatus !== "ACTIVE").length) },
  ];
  const requiresDistrict = DISTRICT_ROLES.has(form.role);

  return (
    <GovPortalLayout>
      <GovPageHeader
        title="Users and Roles"
        breadcrumb="Admin / Users & Roles"
        description="Manage platform users, access classes, department accounts, and role-based permissions."
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <GovButton variant="primary" onClick={() => setModalOpen(true)}>
              Create User
            </GovButton>
            <Link href="/admin/dashboard" passHref legacyBehavior>
              <GovButton variant="secondary">
                Admin Dashboard
              </GovButton>
            </Link>
          </div>
        }
      />

      <div className="gov-container">
        {error && (
          <div className="gov-alert gov-alert-danger gov-mb-4">{error}</div>
        )}
        {success && (
          <div className="gov-alert gov-alert-success gov-mb-4">{success}</div>
        )}

        {/* Stats Cards */}
        <div className="gov-grid gov-grid-cols-3 gov-gap-6 gov-mb-6">
          {metrics.map((metric) => (
            <GovCard key={metric.label}>
              <GovCardBody>
                <div className="gov-text-sm gov-text-muted gov-mb-1">{metric.label}</div>
                <div className="gov-text-3xl gov-font-bold gov-text-primary">{metric.value}</div>
              </GovCardBody>
            </GovCard>
          ))}
        </div>

        {/* Roles Queue Card */}
        <GovCard>
          <GovCardHeader>
            <GovCardTitle>Access Classes and Permissions</GovCardTitle>
          </GovCardHeader>
          <GovCardBody>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 w-full bg-white">
                <div className="w-10 h-10 rounded-full border-4 border-[#14274e] border-t-transparent animate-spin" />
                <span className="text-xs text-slate-500 font-semibold">Loading users and roles data...</span>
              </div>
            ) : users.length > 0 ? (
              <div className="gov-table-container">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>User Email</th>
                      <th>Role Assigned</th>
                      <th>Assigned District</th>
                      <th>Linked Entity</th>
                      <th>Account Status</th>
                      <th className="gov-text-right">Verification Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="gov-font-semibold gov-text-primary">{u.email}</td>
                        <td>
                          <select
                            className="gov-select"
                            value={u.role}
                            onChange={(event) => updateUser(u, "role", event.target.value)}
                            style={{ minWidth: 220 }}
                          >
                            {Array.from(new Set<string>([u.role, ...WORKFLOW_ROLES])).map((role) => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="gov-select"
                            value={u.assignedDistrict || ""}
                            onChange={(event) => updateUser(u, "assignedDistrict", event.target.value)}
                            style={{ minWidth: 160 }}
                          >
                            <option value="">State level</option>
                            {MAHARASHTRA_DISTRICTS.map((district) => (
                              <option key={district} value={district}>{district}</option>
                            ))}
                          </select>
                        </td>
                        <td className="gov-text-muted">
                          {u.ngo?.name || u.company?.name || "System"}
                        </td>
                        <td>
                          <select
                            className="gov-select"
                            value={u.accountStatus || "ACTIVE"}
                            onChange={(event) => updateUser(u, "accountStatus", event.target.value)}
                            style={{ minWidth: 130 }}
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="INACTIVE">INACTIVE</option>
                            <option value="SUSPENDED">SUSPENDED</option>
                          </select>
                        </td>
                        <td className="gov-text-right">
                          <GovStatusBadge variant={u.isVerified ? "success" : "warning"}>
                            {u.isVerified ? "Verified" : "Pending"}
                          </GovStatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="gov-empty">No users found. Create the first workflow user to begin assignments.</div>
            )}
          </GovCardBody>
        </GovCard>
      </div>

      <GovModal open={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }} title="Create Workflow User" width={720}>
        <form onSubmit={createUser}>
          <div className="gov-grid gov-grid-cols-2 gov-gap-4">
            <GovInput
              label="Official email"
              required
              type="email"
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
              placeholder="rm.user@mahacsr.gov.in"
            />
            <GovInput
              label="Temporary password"
              required
              type="text"
              value={form.password}
              onChange={(event) => setField("password", event.target.value)}
              minLength={6}
            />
            <GovSelect
              label="Role"
              required
              value={form.role}
              onChange={(event) => setField("role", event.target.value)}
            >
              {WORKFLOW_ROLES.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </GovSelect>
            <GovSelect
              label="Account status"
              required
              value={form.accountStatus}
              onChange={(event) => setField("accountStatus", event.target.value)}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </GovSelect>
            <GovSelect
              label="Assigned district"
              required={requiresDistrict}
              value={form.assignedDistrict}
              onChange={(event) => setField("assignedDistrict", event.target.value)}
              help={requiresDistrict ? "Used for RM auto-assignment and nodal officer project queues." : "Leave blank for state-level roles."}
            >
              <option value="">State level / not applicable</option>
              {MAHARASHTRA_DISTRICTS.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </GovSelect>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
            <GovButton type="button" variant="secondary" onClick={() => { setModalOpen(false); resetForm(); }}>
              Cancel
            </GovButton>
            <GovButton type="submit" variant="primary" disabled={saving}>
              {saving ? "Creating..." : "Create User"}
            </GovButton>
          </div>
        </form>
      </GovModal>
    </GovPortalLayout>
  );
}

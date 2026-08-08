"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApiQuery } from "@/lib/apiHooks";
import { apiFetch } from "@/lib/api";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovInput from "@/components/gov/GovInput";
import GovModal from "@/components/gov/GovModal";
import GovSelect from "@/components/gov/GovSelect";
import TransferPortfolioModal, { PortfolioTransferResult } from "@/components/rm/TransferPortfolioModal";
import { useAuthStore } from "@/store/authStore";
import "@/styles/gov-theme.css";

// Base platform roles come from the Prisma enum; everything else is a dynamic
// OrganizationRole fetched from the RBAC engine — never hardcoded here.
const SYSTEM_ROLES_LIST = [
  { id: 1, name: "SUPER_ADMIN" },
  { id: 2, name: "PLANNING_SECRETARY" },
  { id: 3, name: "JOINT_SECRETARY" },
  { id: 4, name: "DISTRICT_NODAL_OFFICER" },
  { id: 5, name: "DISTRICT_NODAL_CONSULTANT" },
  { id: 6, name: "RELATIONSHIP_MANAGER" },
  { id: 7, name: "GOVERNMENT_OFFICER" },
  { id: 8, name: "COMPANY_ADMIN" },
  { id: 9, name: "NGO_ADMIN" },
] as const;

const MAHARASHTRA_DISTRICTS = [
  "Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara",
  "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli",
  "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban",
  "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar",
  "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara",
  "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal",
];

type UserRow = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  mobile?: string | null;
  designation?: string | null;
  role: string | null;
  roleId?: string | number | null;
  roleRelation?: { id: string; name: string } | null;
  accountStatus?: string;
  assignedDistrict?: string | null;
  isVerified?: boolean;
  ngo?: { name: string };
  company?: { name: string };
  organization?: { name: string; kind: string };
  officerProfile?: { designation?: string | null; fullName?: string | null; department?: string | null; district?: string | null; taluka?: string | null; mobile?: string | null } | null;
  dynamicRoles?: { roleId: string; roleName: string }[];
};

type DynamicRole = {
  id: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  isSystemRole: boolean;
  permissions: string[];
};

const EMPTY_USER_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  mobile: "",
  designation: "",
  department: "MahaCSR Portal",
  role: "GOVERNMENT_OFFICER",
  assignedDistrict: "",
  password: "",
  sendInvitation: true,
};

const effectiveRole = (u: any): string => {
  if (!u) return "";
  if (typeof u.role === "string") return u.role;
  if (u.role && typeof u.role === "object" && u.role.name) return String(u.role.name);
  if (u.roleRelation && typeof u.roleRelation === "object" && u.roleRelation.name) return String(u.roleRelation.name);
  if (typeof u.roleId === "number") return `Role #${u.roleId}`;
  return "";
};

export default function AdminUserManagementPage() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [togglingId, setTogglingId] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch dynamic roles (cache for 5 minutes)
  const { data: rolesResponse } = useApiQuery<any>(
    ["admin", "dynamic-roles"],
    "/roles?limit=200",
    { staleTime: 5 * 60 * 1000 }
  );
  const dynamicRoles: DynamicRole[] = rolesResponse?.roles || rolesResponse?.data?.roles || [];

  // Fetch users list (paginated, filtered, cached)
  const { data: usersResponse, isLoading: loading } = useApiQuery<any>(
    ["admin", "users", String(page), debouncedSearch, statusFilter],
    `/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(debouncedSearch)}&status=${statusFilter}`,
    { staleTime: 30 * 1000 }
  );

  const rawUsers = usersResponse?.data || [];
  const pagination = usersResponse?.pagination || { total: 0, totalPages: 1 };

  const parsedUsers: UserRow[] = (Array.isArray(rawUsers) ? rawUsers : []).map((u: any) => ({
    ...u,
    dynamicRoles: (Array.isArray(u.organizationRoles) ? u.organizationRoles : [])
      .map((or: any) => (or?.role ? { roleId: or.role.id, roleName: or.role.name } : null))
      .filter(Boolean),
  }));

  const users = parsedUsers;

  // Create user modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);

  // Edit user modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<{
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    designation: string;
    department: string;
    role: string;
    assignedDistrict: string;
    accountStatus: string;
    password: string;
    dynamicRoleIds: string[];
  }>({
    userId: "",
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    designation: "",
    department: "MahaCSR Portal",
    role: "",
    assignedDistrict: "",
    accountStatus: "ACTIVE",
    password: "",
    dynamicRoleIds: [],
  });

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [transferSource, setTransferSource] = useState<UserRow | null>(null);

  const { isAdmin } = useAuthStore();

  const activeDynamicRoles = dynamicRoles.filter((r) => r.status === "ACTIVE");
  const customRoles = activeDynamicRoles.filter((r) => !r.isSystemRole && Number(r.id) > 9);

  const roleOptions = isAdmin ? (
    <>
      <optgroup label="System Roles (1 to 9)">
        {SYSTEM_ROLES_LIST.map((r) => (
          <option key={r.id} value={r.name}>{r.name}</option>
        ))}
      </optgroup>
      {customRoles.length > 0 && (
        <optgroup label="Organization Custom Roles">
          {customRoles.map((r) => (
            <option key={r.id} value={r.name}>{r.name}</option>
          ))}
        </optgroup>
      )}
    </>
  ) : (
    <>
      {customRoles.length > 0 ? (
        <optgroup label="Organization Custom Roles">
          {customRoles.map((r) => (
            <option key={r.id} value={r.name}>{r.name}</option>
          ))}
        </optgroup>
      ) : (
        <option value="" disabled>No custom roles found. Create a custom role first in Access Control.</option>
      )}
    </>
  );

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const isPasswordBlank = !userForm.password.trim();
      const sendInvitation = isPasswordBlank ? true : userForm.sendInvitation;

      const created = await apiFetch<any>("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          firstName: userForm.firstName.trim(),
          lastName: userForm.lastName.trim(),
          email: userForm.email.trim(),
          mobile: userForm.mobile.trim(),
          designation: userForm.designation.trim(),
          department: userForm.department.trim() || "MahaCSR Portal",
          role: userForm.role,
          assignedDistrict: userForm.assignedDistrict || undefined,
          password: userForm.password.trim() || undefined,
          sendInvitation,
        }),
      });

      const result = created?.data || created;
      setSuccess(
        result?.invitationSent
          ? `User created successfully! ${result.isPasswordAutoGenerated ? `Temporary password (${result.autogeneratedPassword}) and activation link emailed to ${userForm.email.trim()}.` : `Welcome email with login details sent to ${userForm.email.trim()}.`}`
          : "User created successfully."
      );
      setCreateModalOpen(false);
      setUserForm(EMPTY_USER_FORM);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (user: UserRow) => {
    setError("");
    const fullNameParts = (user.firstName || user.officerProfile?.fullName || "").trim().split(/\s+/);
    const fName = user.firstName || fullNameParts[0] || "";
    const lName = user.lastName || fullNameParts.slice(1).join(" ") || "";

    setEditForm({
      userId: user.id,
      firstName: fName,
      lastName: lName,
      email: user.email,
      mobile: user.mobile || user.officerProfile?.mobile || "",
      designation: user.designation || user.officerProfile?.designation || "",
      department: user.officerProfile?.department || "MahaCSR Portal",
      role: effectiveRole(user),
      assignedDistrict: user.assignedDistrict || user.officerProfile?.district || "",
      accountStatus: user.accountStatus || "ACTIVE",
      password: "",
      dynamicRoleIds: (user.dynamicRoles || []).map((r) => r.roleId),
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiFetch(`/admin/users/${editForm.userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          firstName: editForm.firstName.trim(),
          lastName: editForm.lastName.trim(),
          email: editForm.email.trim(),
          mobile: editForm.mobile.trim(),
          designation: editForm.designation.trim(),
          department: editForm.department.trim() || "MahaCSR Portal",
          role: editForm.role,
          assignedDistrict: editForm.assignedDistrict || undefined,
          accountStatus: editForm.accountStatus,
          password: editForm.password.trim() || undefined,
        }),
      });

      // Save additional dynamic role assignments (multi-role mapping)
      await apiFetch(`/roles/users/${editForm.userId}`, {
        method: "POST",
        body: JSON.stringify({ roleIds: editForm.dynamicRoleIds }),
      }).catch(() => undefined);

      setSuccess(`User ${editForm.email} updated successfully.`);
      setEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: UserRow) => {
    const nextStatus = user.accountStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setTogglingId(user.id);
    setError("");
    setSuccess("");
    try {
      await apiFetch(`/admin/users/${user.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ accountStatus: nextStatus }),
      });
      setSuccess(`${user.email} is now ${nextStatus}.`);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setTogglingId("");
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await apiFetch<any>(`/admin/users/${deleteTarget.id}`, { method: "DELETE" });
      const data = result?.data || result;
      setSuccess(
        data?.suspended
          ? `${deleteTarget.email} has linked records and was suspended instead of deleted.`
          : `${deleteTarget.email} deleted permanently.`
      );
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users;

  const isRelationshipManager = (candidate: UserRow) => {
    const roleName = effectiveRole(candidate).toUpperCase().replace(/\s+/g, "_");
    return Number(candidate.roleId) === 6 || roleName === "RELATIONSHIP_MANAGER" || roleName === "CSR_RELATIONSHIP_MANAGER";
  };

  const handlePortfolioTransferred = (result: PortfolioTransferResult) => {
    setSuccess(
      `Portfolio transferred successfully: ${result.enquiryCount} enquiries and ${result.pitchCount} pitches moved to ${result.targetRmName || "the selected RM"}.`
    );
    setTransferSource(null);
  };

  return (
    <GovPortalLayout>
      <GovPageHeader
        title="User Management"
        breadcrumb="Admin / Security / Users"
        description="Create platform users, manage their roles, districts and account status."
        actions={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <GovButton variant="secondary" onClick={() => window.location.href = "/admin/access-control"}>
              Manage Custom Roles
            </GovButton>
            <GovButton variant="primary" onClick={() => setCreateModalOpen(true)}>
              Create User
            </GovButton>
          </div>
        }
      />

      <div className="gov-container">
        {!createModalOpen && !editModalOpen && !deleteTarget && !transferSource && error && (
          <div className="gov-alert gov-alert-danger gov-mb-4">{error}</div>
        )}
        {success && <div className="gov-alert gov-alert-success gov-mb-4">{success}</div>}

        <GovCard>
          <GovCardHeader>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: 12 }}>
              <GovCardTitle>User Directory ({pagination.total})</GovCardTitle>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select
                  className="gov-select"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  style={{ minWidth: 140 }}
                >
                  <option value="">All statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="PENDING_ACTIVATION">PENDING_ACTIVATION</option>
                </select>
                <input
                  type="text"
                  className="gov-input"
                  placeholder="Search users by email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ minWidth: 240 }}
                />
              </div>
            </div>
          </GovCardHeader>
          <GovCardBody>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 w-full bg-white">
                <div className="w-10 h-10 rounded-full border-4 border-[#14274e] border-t-transparent animate-spin" />
                <span className="text-xs text-slate-500 font-semibold">Loading user accounts...</span>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="gov-table-container">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>User / Official Name</th>
                      <th>User Email</th>
                      <th>Designation</th>
                      <th>Role</th>
                      <th>Assigned District</th>
                      <th>Status</th>
                      <th className="gov-text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const isActive = (u.accountStatus || "ACTIVE") === "ACTIVE";
                      const fullName = ([u.firstName, u.lastName].filter(Boolean).join(" ")) || u.officerProfile?.fullName || "Official User";
                      return (
                        <tr key={u.id}>
                          <td className="gov-font-semibold gov-text-primary" style={{ verticalAlign: "middle" }}>
                            <div>{fullName}</div>
                            {(u.ngo?.name || u.company?.name || u.organization?.name) && (
                              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>
                                {u.ngo?.name || u.company?.name || u.organization?.name}
                              </div>
                            )}
                          </td>
                          <td style={{ verticalAlign: "middle", fontSize: "12px", color: "#334155" }}>
                            {u.email}
                          </td>
                          <td style={{ verticalAlign: "middle" }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>
                              {u.officerProfile?.designation || "N/A"}
                            </span>
                          </td>
                          <td style={{ verticalAlign: "middle" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                              {effectiveRole(u) ? (
                                <span
                                  style={{
                                    padding: "3px 10px",
                                    borderRadius: 12,
                                    backgroundColor: u.role ? "#f1f5f9" : "#eff6ff",
                                    color: u.role ? "#334155" : "#1e40af",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    border: "1px solid #e2e8f0",
                                  }}
                                >
                                  {effectiveRole(u)}
                                </span>
                              ) : (
                                <span className="gov-text-muted" style={{ fontSize: 12 }}>No role</span>
                              )}
                              {u.dynamicRoles && u.dynamicRoles.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                  {u.dynamicRoles.map((dr) => (
                                    <span
                                      key={dr.roleId}
                                      style={{
                                        padding: "2px 6px",
                                        borderRadius: 8,
                                        backgroundColor: "#eff6ff",
                                        color: "#1e40af",
                                        fontSize: 10,
                                        fontWeight: 600,
                                        border: "1px solid #bfdbfe",
                                      }}
                                    >
                                      +{dr.roleName}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ verticalAlign: "middle" }}>{u.assignedDistrict || <span className="gov-text-muted">State level</span>}</td>
                          <td style={{ verticalAlign: "middle" }}>
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 700,
                                backgroundColor: isActive ? "#ecfdf5" : u.accountStatus === "SUSPENDED" ? "#fff1f2" : "#f1f5f9",
                                color: isActive ? "#047857" : u.accountStatus === "SUSPENDED" ? "#be123c" : "#475569",
                              }}
                            >
                              {u.accountStatus || "ACTIVE"}
                            </span>
                          </td>
                          <td className="gov-text-right" style={{ verticalAlign: "middle" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
                              {isAdmin && isRelationshipManager(u) && (
                                <GovButton variant="secondary" onClick={() => setTransferSource(u)}>
                                  Transfer Portfolio
                                </GovButton>
                              )}
                              <GovButton variant="secondary" onClick={() => openEditModal(u)}>
                                Edit
                              </GovButton>
                              {/* Activate / Inactivate toggle */}
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isActive}
                                title={isActive ? "Inactivate user" : "Activate user"}
                                disabled={togglingId === u.id}
                                onClick={() => handleToggleStatus(u)}
                                style={{
                                  width: 44,
                                  height: 24,
                                  borderRadius: 12,
                                  border: "none",
                                  position: "relative",
                                  cursor: togglingId === u.id ? "wait" : "pointer",
                                  backgroundColor: isActive ? "#047857" : "#cbd5e1",
                                  transition: "background-color 0.2s",
                                  flexShrink: 0,
                                }}
                              >
                                <span
                                  style={{
                                    position: "absolute",
                                    top: 3,
                                    left: isActive ? 23 : 3,
                                    width: 18,
                                    height: 18,
                                    borderRadius: "50%",
                                    backgroundColor: "#fff",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                                    transition: "left 0.2s",
                                  }}
                                />
                              </button>
                              <GovButton variant="danger" onClick={() => setDeleteTarget(u)}>
                                Delete
                              </GovButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {pagination.totalPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
                    <span className="gov-text-xs gov-text-muted">
                      Showing page {page} of {pagination.totalPages} ({pagination.total} users total)
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <GovButton
                        variant="secondary"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </GovButton>
                      <GovButton
                        variant="secondary"
                        disabled={page >= pagination.totalPages}
                        onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      >
                        Next
                      </GovButton>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="gov-empty">No users matching search query found.</div>
            )}
          </GovCardBody>
        </GovCard>
      </div>

      {/* CREATE USER MODAL */}
      <GovModal open={createModalOpen} onClose={() => { setError(""); setCreateModalOpen(false); }} title="Create Platform User" width={680}>
        <form onSubmit={handleCreateUser}>
          {error && <div className="gov-alert gov-alert-danger gov-mb-4">{error}</div>}

          {/* Dynamic Invitation Condition Helper Alert */}
          {!userForm.password.trim() ? (
            <div className="gov-alert gov-alert-info gov-mb-4" style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
              <span>💡</span>
              <div>
                <strong>Password left blank:</strong> A secure temporary password and portal login/activation link will be automatically generated and emailed to the user (<strong>Sending Email Invitation is Compulsory</strong>).
              </div>
            </div>
          ) : (
            <div className="gov-alert gov-alert-success gov-mb-4" style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
              <span>💡</span>
              <div>
                <strong>Password set manually:</strong> The user account will be activated with this password. Sending an email invitation with credentials & reset link is <strong>Optional</strong>.
              </div>
            </div>
          )}

          <div className="gov-grid gov-grid-cols-2 gov-gap-4">
            <GovInput
              label="First Name"
              required
              type="text"
              value={userForm.firstName}
              onChange={(e) => setUserForm((prev) => ({ ...prev, firstName: e.target.value }))}
              placeholder="e.g. Ramesh"
            />
            <GovInput
              label="Last Name"
              required
              type="text"
              value={userForm.lastName}
              onChange={(e) => setUserForm((prev) => ({ ...prev, lastName: e.target.value }))}
              placeholder="e.g. Patil"
            />
            <GovInput
              label="Official Email"
              required
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="user@mahacsr.gov.in"
            />
            <GovInput
              label="Mobile Number"
              required
              type="tel"
              value={userForm.mobile}
              onChange={(e) => setUserForm((prev) => ({ ...prev, mobile: e.target.value }))}
              placeholder="e.g. 9876543210"
            />
            <GovInput
              label="Designation"
              required
              type="text"
              value={userForm.designation}
              onChange={(e) => setUserForm((prev) => ({ ...prev, designation: e.target.value }))}
              placeholder="e.g. Deputy Collector / Officer"
            />
            <GovInput
              label="Department / Organization"
              type="text"
              value={userForm.department}
              onChange={(e) => setUserForm((prev) => ({ ...prev, department: e.target.value }))}
              placeholder="e.g. Planning Department / MahaCSR"
            />
            <GovSelect
              label="Role"
              required
              value={userForm.role}
              onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}
              help="System and custom roles are listed."
            >
              {roleOptions}
            </GovSelect>
            <GovSelect
              label="Assigned District"
              value={userForm.assignedDistrict}
              onChange={(e) => setUserForm((prev) => ({ ...prev, assignedDistrict: e.target.value }))}
              help="Applies to district officers & consultants."
            >
              <option value="">State level / not applicable</option>
              {MAHARASHTRA_DISTRICTS.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </GovSelect>
            <GovInput
              label="Password (Optional)"
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Leave blank to autogenerate"
              help="If left blank, password is generated & emailed automatically."
            />
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: 18 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#334155",
                  cursor: !userForm.password.trim() ? "not-allowed" : "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={!userForm.password.trim() ? true : userForm.sendInvitation}
                  disabled={!userForm.password.trim()}
                  onChange={(e) => setUserForm((prev) => ({ ...prev, sendInvitation: e.target.checked }))}
                  style={{ width: 18, height: 18, accentColor: "#1e3a8a" }}
                />
                Send invitation email to user
              </label>
              <span style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                {!userForm.password.trim()
                  ? "(Compulsory when password is left blank)"
                  : "(Optional when password is set manually)"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
            <GovButton type="button" variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </GovButton>
            <GovButton type="submit" variant="primary" disabled={saving}>
              {saving ? "Creating..." : "Create & Send Invitation"}
            </GovButton>
          </div>
        </form>
      </GovModal>

      {/* EDIT USER MODAL */}
      <GovModal open={editModalOpen} onClose={() => { setError(""); setEditModalOpen(false); }} title={`Edit User: ${editForm.email}`} width={680}>
        <form onSubmit={handleSaveEdit}>
          {error && <div className="gov-alert gov-alert-danger gov-mb-4">{error}</div>}
          <div className="gov-grid gov-grid-cols-2 gov-gap-4">
            <GovInput
              label="First Name"
              required
              type="text"
              value={editForm.firstName}
              onChange={(e) => setEditForm((prev) => ({ ...prev, firstName: e.target.value }))}
            />
            <GovInput
              label="Last Name"
              required
              type="text"
              value={editForm.lastName}
              onChange={(e) => setEditForm((prev) => ({ ...prev, lastName: e.target.value }))}
            />
            <GovInput
              label="Official Email"
              required
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <GovInput
              label="Mobile Number"
              required
              type="tel"
              value={editForm.mobile}
              onChange={(e) => setEditForm((prev) => ({ ...prev, mobile: e.target.value }))}
            />
            <GovInput
              label="Designation"
              required
              type="text"
              value={editForm.designation}
              onChange={(e) => setEditForm((prev) => ({ ...prev, designation: e.target.value }))}
            />
            <GovInput
              label="Department / Organization"
              type="text"
              value={editForm.department}
              onChange={(e) => setEditForm((prev) => ({ ...prev, department: e.target.value }))}
            />
            <GovSelect
              label="Role"
              value={editForm.role}
              onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
            >
              <option value="">None (dynamic roles only)</option>
              {roleOptions}
            </GovSelect>
            <GovSelect
              label="Account Status"
              required
              value={editForm.accountStatus}
              onChange={(e) => setEditForm((prev) => ({ ...prev, accountStatus: e.target.value }))}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="PENDING_ACTIVATION">PENDING_ACTIVATION</option>
            </GovSelect>
            <GovSelect
              label="Assigned District"
              value={editForm.assignedDistrict}
              onChange={(e) => setEditForm((prev) => ({ ...prev, assignedDistrict: e.target.value }))}
            >
              <option value="">State level / not applicable</option>
              {MAHARASHTRA_DISTRICTS.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </GovSelect>
            <GovInput
              label="New Password (Optional)"
              type="password"
              value={editForm.password}
              onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Leave blank to keep current"
              help="Only fill if resetting password."
            />
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#1e3a8a", borderBottom: "1px solid #e2e8f0", paddingBottom: 6, marginBottom: 10 }}>
              Additional Dynamic Role Assignments
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto", padding: 4 }}>
              {activeDynamicRoles.map((role) => {
                const isChecked = editForm.dynamicRoleIds.includes(role.id);
                return (
                  <label
                    key={role.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #e2e8f0",
                      cursor: "pointer",
                      backgroundColor: isChecked ? "#f8fafc" : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() =>
                        setEditForm((prev) => ({
                          ...prev,
                          dynamicRoleIds: prev.dynamicRoleIds.includes(role.id)
                            ? prev.dynamicRoleIds.filter((id) => id !== role.id)
                            : [...prev.dynamicRoleIds, role.id],
                        }))
                      }
                      style={{ width: 16, height: 16, accentColor: "#1e3a8a" }}
                    />
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 13, color: "#334155" }}>{role.name}</span>
                      {role.isSystemRole && (
                        <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: "#991b1b", backgroundColor: "#fee2e2", padding: "1px 6px", borderRadius: 4 }}>
                          SYSTEM
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
              {activeDynamicRoles.length === 0 && (
                <span className="gov-text-muted" style={{ fontSize: 12 }}>No dynamic roles configured yet.</span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
            <GovButton type="button" variant="secondary" onClick={() => setEditModalOpen(false)}>
              Cancel
            </GovButton>
            <GovButton type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </GovButton>
          </div>
        </form>
      </GovModal>

      <TransferPortfolioModal
        open={!!transferSource}
        onClose={() => setTransferSource(null)}
        sourceRmId={transferSource?.id || ""}
        sourceRmLabel={
          transferSource
            ? ([transferSource.firstName, transferSource.lastName].filter(Boolean).join(" ") || transferSource.email)
            : "Relationship Manager"
        }
        endpoint="/admin/rm/transfer-portfolio"
        includeSourceRmId
        onTransferred={handlePortfolioTransferred}
      />

      {/* DELETE CONFIRMATION MODAL */}
      <GovModal open={!!deleteTarget} onClose={() => { setError(""); setDeleteTarget(null); }} title="Delete User" width={460}>
        {error && <div className="gov-alert gov-alert-danger gov-mb-4">{error}</div>}
        <p style={{ fontSize: 14, color: "#475569", marginBottom: 8 }}>
          Are you sure you want to delete <strong>{deleteTarget?.email}</strong>?
        </p>
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20 }}>
          This action cannot be undone. If the user has linked records (assignments, audit
          history), the account will be suspended instead of removed.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <GovButton type="button" variant="secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </GovButton>
          <GovButton type="button" variant="danger" onClick={handleDeleteUser} disabled={saving}>
            {saving ? "Deleting..." : "Delete User"}
          </GovButton>
        </div>
      </GovModal>
    </GovPortalLayout>
  );
}

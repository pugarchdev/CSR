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

  // Custom role creation state
  const [customRoleModalOpen, setCustomRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [selectedRolePermissions, setSelectedRolePermissions] = useState<string[]>([
    "user:view", "project:view", "fund:view", "report:view"
  ]);
  const [creatingRole, setCreatingRole] = useState(false);
  const [roleError, setRoleError] = useState("");

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
          district: userForm.assignedDistrict || undefined,
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
          district: editForm.assignedDistrict || undefined,
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
          <div className="flex items-center gap-2">
            <GovButton variant="secondary" onClick={() => setCustomRoleModalOpen(true)}>
              + Create Custom Role
            </GovButton>
            <GovButton variant="primary" onClick={() => setCreateModalOpen(true)}>
              Create User
            </GovButton>
          </div>
        }
      />

      <div className="gov-container !px-2 sm:!px-4 md:!px-8">
        {!createModalOpen && !editModalOpen && !deleteTarget && !transferSource && error && (
          <div className="gov-alert gov-alert-danger gov-mb-4">{error}</div>
        )}
        {success && <div className="gov-alert gov-alert-success gov-mb-4">{success}</div>}

        <GovCard>
          <GovCardHeader className="!p-4 md:!p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
              <GovCardTitle>User Directory ({pagination.total})</GovCardTitle>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <select
                  className="gov-select w-full sm:w-auto md:min-w-[140px]"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="PENDING_ACTIVATION">PENDING_ACTIVATION</option>
                </select>
                <input
                  type="text"
                  className="gov-input w-full sm:w-auto md:min-w-[240px]"
                  placeholder="Search users by email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </GovCardHeader>
          
          <GovCardBody className="!p-2 sm:!p-4 md:!p-5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 w-full bg-white">
                <div className="w-10 h-10 rounded-full border-4 border-[#14274e] border-t-transparent animate-spin" />
                <span className="text-xs text-slate-500 font-semibold">Loading user accounts...</span>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="w-full md:overflow-x-auto">
                <table className="w-full block md:table text-left border-collapse">
                  <thead className="hidden md:table-header-group border-b-2 border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left">User / Official Name</th>
                      <th className="px-4 py-3 text-left">User Email</th>
                      <th className="px-4 py-3 text-left">Designation</th>
                      <th className="px-4 py-3 text-left">Role</th>
                      <th className="px-4 py-3 text-left">Assigned District</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="block md:table-row-group divide-y-0 md:divide-y md:divide-slate-100">
                    {filteredUsers.map((u) => {
                      const isActive = (u.accountStatus || "ACTIVE") === "ACTIVE";
                      const fullName = ([u.firstName, u.lastName].filter(Boolean).join(" ")) || u.officerProfile?.fullName || "Official User";
                      
                      return (
                        <tr 
                          key={u.id}
                          className="block md:table-row mb-4 md:mb-0 bg-white border border-slate-200 md:border-none rounded-xl md:rounded-none shadow-sm md:shadow-none hover:bg-slate-50/80 transition-colors overflow-hidden"
                        >
                          <td 
                            data-label="User / Official Name" 
                            className="flex md:table-cell flex-col md:flex-row items-start md:items-center px-4 py-3 md:py-4 border-b border-slate-100 md:border-none align-middle before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden before:mb-1"
                          >
                            <div className="text-left w-full md:w-auto">
                              <div className="gov-font-semibold gov-text-primary break-words">{fullName}</div>
                              {(u.ngo?.name || u.company?.name || u.organization?.name) && (
                                <div className="text-[11px] text-slate-500 font-medium break-words mt-0.5">
                                  {u.ngo?.name || u.company?.name || u.organization?.name}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          <td 
                            data-label="User Email" 
                            className="flex md:table-cell justify-between items-center px-4 py-3 md:py-4 border-b border-slate-100 md:border-none align-middle text-[12px] text-slate-700 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden min-w-0"
                          >
                            <span className="break-all md:break-words text-right md:text-left">{u.email}</span>
                          </td>
                          
                          <td 
                            data-label="Designation" 
                            className="flex md:table-cell justify-between items-center px-4 py-3 md:py-4 border-b border-slate-100 md:border-none align-middle before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden"
                          >
                            <span className="text-[12px] font-semibold text-slate-900 text-right md:text-left">
                              {u.officerProfile?.designation || "N/A"}
                            </span>
                          </td>
                          
                          <td 
                            data-label="Role" 
                            className="flex md:table-cell justify-between items-start md:items-center px-4 py-3 md:py-4 border-b border-slate-100 md:border-none align-middle before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden"
                          >
                            <div className="flex flex-col gap-1 items-end md:items-start w-full md:w-auto">
                              {effectiveRole(u) ? (
                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${u.role ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-blue-50 text-blue-800 border-blue-200'}`}>
                                  {effectiveRole(u)}
                                </span>
                              ) : (
                                <span className="gov-text-muted text-[12px]">No role</span>
                              )}
                              
                              {u.dynamicRoles && u.dynamicRoles.length > 0 && (
                                <div className="flex flex-wrap justify-end md:justify-start gap-1 mt-1 w-full md:w-auto">
                                  {u.dynamicRoles.map((dr) => (
                                    <span
                                      key={dr.roleId}
                                      className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-bold border border-blue-200 whitespace-nowrap"
                                    >
                                      +{dr.roleName}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          <td 
                            data-label="Assigned District" 
                            className="flex md:table-cell justify-between items-center px-4 py-3 md:py-4 border-b border-slate-100 md:border-none align-middle before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden"
                          >
                            <span className="text-right md:text-left text-sm md:text-sm">
                              {u.assignedDistrict || <span className="gov-text-muted text-[12px]">State level</span>}
                            </span>
                          </td>
                          
                          <td 
                            data-label="Status" 
                            className="flex md:table-cell justify-between items-center px-4 py-3 md:py-4 border-b border-slate-100 md:border-none align-middle before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden"
                          >
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              isActive ? "bg-emerald-50 text-emerald-700" : u.accountStatus === "SUSPENDED" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"
                            }`}>
                              {u.accountStatus || "ACTIVE"}
                            </span>
                          </td>
                          
                          <td className="block md:table-cell px-4 py-3 md:py-4 align-middle bg-slate-50/50 md:bg-transparent">
                            <div className="flex md:inline-flex justify-end items-center gap-2.5 w-full md:w-auto">
                              {isAdmin && isRelationshipManager(u) && (
                                <GovButton variant="secondary" className="flex-1 md:flex-none justify-center px-2 py-1 text-xs" onClick={() => setTransferSource(u)}>
                                  Transfer Portfolio
                                </GovButton>
                              )}
                              <GovButton variant="secondary" className="flex-1 md:flex-none justify-center px-2 py-1 text-xs" onClick={() => openEditModal(u)}>
                                Edit
                              </GovButton>
                              
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
                              
                              <GovButton variant="danger" className="flex-1 md:flex-none justify-center px-2 py-1 text-xs" onClick={() => setDeleteTarget(u)}>
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
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 pt-4 border-t border-slate-200">
                    <span className="gov-text-xs gov-text-muted text-center sm:text-left">
                      Showing page {page} of {pagination.totalPages} ({pagination.total} users total)
                    </span>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <GovButton
                        variant="secondary"
                        className="flex-1 sm:flex-none justify-center"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </GovButton>
                      <GovButton
                        variant="secondary"
                        className="flex-1 sm:flex-none justify-center"
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

          <div className="gov-grid gov-grid-cols-1 sm:gov-grid-cols-2 gov-gap-4">
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
              maxLength={10}
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

          <div style={{ display: "flex", flexDirection: "column-reverse", justifyContent: "flex-end", gap: 8, marginTop: 24 }} className="sm:flex-row">
            <GovButton type="button" variant="secondary" onClick={() => setCreateModalOpen(false)} className="w-full sm:w-auto justify-center">
              Cancel
            </GovButton>
            <GovButton type="submit" variant="primary" disabled={saving} className="w-full sm:w-auto justify-center">
              {saving ? "Creating..." : "Create & Send Invitation"}
            </GovButton>
          </div>
        </form>
      </GovModal>

      {/* EDIT USER MODAL */}
      <GovModal open={editModalOpen} onClose={() => { setError(""); setEditModalOpen(false); }} title={`Edit User: ${editForm.email}`} width={680}>
        <form onSubmit={handleSaveEdit}>
          {error && <div className="gov-alert gov-alert-danger gov-mb-4">{error}</div>}
          <div className="gov-grid gov-grid-cols-1 sm:gov-grid-cols-2 gov-gap-4">
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

          <div style={{ marginTop: 18 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#1e3a8a", borderBottom: "1px solid #e2e8f0", paddingBottom: 6, marginBottom: 10 }}>
              Additional Dynamic Role Assignments
            </div>
            <div className="gov-modal-scroll" style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto", padding: 8, border: "1px solid #cbd5e1", borderRadius: 8, backgroundColor: "#f8fafc", overscrollBehavior: "contain" }}>
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
                      backgroundColor: isChecked ? "#eff6ff" : "#ffffff",
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

          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 18,
            paddingTop: 12,
            borderTop: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
            position: "sticky",
            bottom: 0,
            zIndex: 10,
          }} className="flex-col-reverse sm:flex-row">
            <GovButton type="button" variant="secondary" onClick={() => setEditModalOpen(false)} className="w-full sm:w-auto justify-center">
              Cancel
            </GovButton>
            <GovButton type="submit" variant="primary" disabled={saving} className="w-full sm:w-auto justify-center">
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
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }} className="flex-col-reverse sm:flex-row">
          <GovButton type="button" variant="secondary" onClick={() => setDeleteTarget(null)} className="w-full sm:w-auto justify-center">
            Cancel
          </GovButton>
          <GovButton type="button" variant="danger" onClick={handleDeleteUser} disabled={saving} className="w-full sm:w-auto justify-center">
            {saving ? "Deleting..." : "Delete User"}
          </GovButton>
        </div>
      </GovModal>

      {/* CREATE CUSTOM ROLE MODAL */}
      <GovModal open={customRoleModalOpen} onClose={() => { setRoleError(""); setCustomRoleModalOpen(false); }} title="Create Custom Organization Role" width={680}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!newRoleName.trim()) {
            setRoleError("Role name is required.");
            return;
          }
          setCreatingRole(true);
          setRoleError("");
          try {
            await apiFetch("/roles", {
              method: "POST",
              body: JSON.stringify({
                name: newRoleName.trim(),
                description: newRoleDescription.trim() || undefined,
                permissions: selectedRolePermissions,
              }),
            });
            setSuccess(`Custom role "${newRoleName.trim()}" created successfully! You can now assign it to users.`);
            setCustomRoleModalOpen(false);
            setNewRoleName("");
            setNewRoleDescription("");
            setSelectedRolePermissions(["user:view", "project:view", "fund:view", "report:view"]);
            queryClient.invalidateQueries({ queryKey: ["admin", "dynamic-roles"] });
          } catch (err: any) {
            setRoleError(err.message || "Failed to create custom role");
          } finally {
            setCreatingRole(false);
          }
        }}>
          {roleError && <div className="gov-alert gov-alert-danger gov-mb-4">{roleError}</div>}
          
          <div className="gov-grid gov-grid-cols-1 sm:gov-grid-cols-2 gov-gap-4">
            <GovInput
              label="Role Name"
              required
              type="text"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="e.g. CSR Finance Lead"
            />
            <GovInput
              label="Description (Optional)"
              type="text"
              value={newRoleDescription}
              onChange={(e) => setNewRoleDescription(e.target.value)}
              placeholder="e.g. Responsible for reviewing CSR fund utilization and project bills."
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                Select Role Permissions Matrix
              </label>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#1e3a8a", backgroundColor: "#eff6ff", padding: "2px 8px", borderRadius: 12, border: "1px solid #bfdbfe" }}>
                {selectedRolePermissions.length} selected
              </span>
            </div>
            
            <div className="gov-modal-scroll" style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              maxHeight: 280,
              overflowY: "auto",
              paddingRight: 6,
              padding: 10,
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              backgroundColor: "#f8fafc",
              overscrollBehavior: "contain",
            }}>
              {[
                {
                  title: "User Management & Sub-logins",
                  permissions: [
                    { key: "user:view", label: "View Team Users" },
                    { key: "user:create", label: "Create Team Users" },
                    { key: "user:update", label: "Update User Profiles & Roles" },
                    { key: "user:invite", label: "Send Email Invitations" },
                    { key: "user:assign-role", label: "Assign Custom Roles to Team" },
                    { key: "ngo_login:create", label: "Create NGO / Sub-agency Logins" },
                  ]
                },
                {
                  title: "Projects & Milestones",
                  permissions: [
                    { key: "project:view", label: "View Corporate & Convergence Projects" },
                    { key: "project:create", label: "Create / Register Projects" },
                    { key: "milestone:update", label: "Update Milestone Progress" },
                    { key: "progress:verify", label: "Verify Project Deliverables" },
                    { key: "photo:upload", label: "Upload Geotagged Field Photos" },
                  ]
                },
                {
                  title: "Funding & Financials",
                  permissions: [
                    { key: "fund:view", label: "View Fund Allocation & Financial Summaries" },
                    { key: "fund:commit", label: "Commit CSR Funds & Sign MoUs" },
                    { key: "bill:upload", label: "Upload Expenditure Bills & Invoices" },
                    { key: "uc:upload", label: "Upload Utilization Certificates (UC)" },
                  ]
                },
                {
                  title: "Pitches & Corporate Enquiries",
                  permissions: [
                    { key: "pitch:view", label: "Browse Government Pitches & Public Needs" },
                    { key: "pitch:create", label: "Create & Submit Government Pitches" },
                    { key: "enquiry:create", label: "Submit Corporate Enquiries" },
                    { key: "interest:express", label: "Express Corporate Interest in Pitches" },
                  ]
                },
                {
                  title: "Reports & Analytics",
                  permissions: [
                    { key: "report:view", label: "View Analytical Reports & KPIs" },
                    { key: "report:generate", label: "Generate & Export Impact Statements" },
                  ]
                }
              ].map((group) => (
                <div key={group.title} style={{ backgroundColor: "#ffffff", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#1e3a8a", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {group.title}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 8 }}>
                    {group.permissions.map((p) => {
                      const isChecked = selectedRolePermissions.includes(p.key);
                      return (
                        <label key={p.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#334155", cursor: "pointer", padding: "2px 0" }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedRolePermissions((prev) =>
                                isChecked ? prev.filter((k) => k !== p.key) : [...prev, p.key]
                              );
                            }}
                            style={{ accentColor: "#1e3a8a", width: 15, height: 15, cursor: "pointer" }}
                          />
                          <span>{p.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 16,
            paddingTop: 12,
            borderTop: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
            position: "sticky",
            bottom: 0,
            zIndex: 10,
          }} className="flex-col-reverse sm:flex-row">
            <GovButton type="button" variant="secondary" onClick={() => setCustomRoleModalOpen(false)} className="w-full sm:w-auto justify-center">
              Cancel
            </GovButton>
            <GovButton type="submit" variant="primary" disabled={creatingRole} className="w-full sm:w-auto justify-center">
              {creatingRole ? "Creating Role..." : "Create Custom Role"}
            </GovButton>
          </div>
        </form>
      </GovModal>
    </GovPortalLayout>
  );
}

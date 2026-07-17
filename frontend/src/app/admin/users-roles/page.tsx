"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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

const BASE_DATABASE_ROLES = [
  "SUPER_ADMIN",
  "GOVERNMENT_OFFICER",
  "CORPORATE_USER",
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
  role: string | null;
  accountStatus?: string;
  assignedDistrict?: string | null;
  isVerified?: boolean;
  ngo?: { name: string };
  company?: { name: string };
  dynamicRoles?: { roleId: string; roleName: string }[];
};

type Permission = {
  id: string;
  key: string;
  description: string;
  module: string;
};

type PermissionGroup = {
  id: string;
  name: string;
  description: string | null;
  permissions: Permission[];
};

type DynamicRole = {
  id: string;
  name: string;
  description: string | null;
  scope: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  isSystemRole: boolean;
  isPermanent: boolean;
  category: string | null;
  displayOrder: number;
  permissions: string[];
};

const MATRIX_COLUMNS = [
  { label: "View", suffix: [":view", ":view-history", ":dashboard"] },
  { label: "Create", suffix: [":create", ":submit", ":commit"] },
  { label: "Edit", suffix: [":update", ":reverify"] },
  { label: "Delete", suffix: [":delete", ":suspend", ":disable"] },
  { label: "Assign", suffix: [":assign"] },
  { label: "Approve", suffix: [":approve", ":publish", ":verify", ":release", ":execute", ":verify-utilization"] }
];

function AdminUsersRolesPageContent() {
  const [activeTab, setActiveTab] = useState<"users" | "matrix">("users");
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  useEffect(() => {
    if (tabParam === "roles") {
      setActiveTab("matrix");
    } else if (tabParam === "users") {
      setActiveTab("users");
    }
  }, [tabParam]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [dynamicRoles, setDynamicRoles] = useState<DynamicRole[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedRolePerms, setSelectedRolePerms] = useState<string[]>([]);
  const [newRolePerms, setNewRolePerms] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleSearchTerm, setRoleSearchTerm] = useState("");
  
  // Modals
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  
  // Forms
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [userForm, setUserForm] = useState({
    email: "",
    password: "Temp@12345",
    role: "GOVERNMENT_OFFICER",
    assignedDistrict: "",
    accountStatus: "ACTIVE",
  });
  
  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
    scope: "GLOBAL",
    category: "General",
  });

  const [cloneForm, setCloneForm] = useState({
    name: "",
    description: "",
  });

  const [assignForm, setAssignForm] = useState<{
    userId: string;
    email: string;
    roleIds: string[];
  }>({
    userId: "",
    email: "",
    roleIds: [],
  });

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const usersData = await apiFetch<any>("/admin/users");
      const rawUsers = usersData?.data || usersData || [];
      
      // Parse users and map pre-fetched dynamic roles
      const parsedUsers = (Array.isArray(rawUsers) ? rawUsers : []).map((u: any) => {
        const dynamicRoles = (Array.isArray(u.organizationRoles) ? u.organizationRoles : [])
          .map((or: any) => {
            if (or?.role) {
              return {
                roleId: or.role.id,
                roleName: or.role.name
              };
            }
            return null;
          })
          .filter(Boolean);

        return {
          ...u,
          dynamicRoles: dynamicRoles as any[]
        };
      });
      setUsers(parsedUsers);

      const rolesResponse = await apiFetch<any>("/roles");
      const rolesData = rolesResponse?.data || rolesResponse || {};
      const fetchedRoles = rolesData?.roles || [];
      setDynamicRoles(fetchedRoles);
      if (fetchedRoles.length > 0 && !selectedRoleId) {
        setSelectedRoleId(fetchedRoles[0].id);
        setSelectedRolePerms(fetchedRoles[0].permissions || []);
      }

      const groupsResponse = await apiFetch<any>("/roles/permission-groups");
      const groupsData = groupsResponse?.data || groupsResponse || [];
      setPermissionGroups(Array.isArray(groupsData) ? groupsData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectRole = (roleId: string) => {
    setSelectedRoleId(roleId);
    const role = dynamicRoles.find((r) => r.id === roleId);
    if (role) {
      setSelectedRolePerms(role.permissions || []);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: userForm.email.trim(),
          password: userForm.password,
          role: userForm.role,
          assignedDistrict: userForm.assignedDistrict || undefined,
          accountStatus: userForm.accountStatus,
        }),
      });
      setSuccess("Workflow user created successfully.");
      setUserModalOpen(false);
      setUserForm({
        email: "",
        password: "Temp@12345",
        role: "GOVERNMENT_OFFICER",
        assignedDistrict: "",
        accountStatus: "ACTIVE",
      });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUserField = async (user: UserRow, key: "role" | "assignedDistrict" | "accountStatus", value: string) => {
    setError("");
    setSuccess("");
    const nextUser = { ...user, [key]: value };
    try {
      const updated = await apiFetch<any>(`/admin/users/${user.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({
          role: nextUser.role,
          assignedDistrict: nextUser.assignedDistrict || undefined,
          accountStatus: nextUser.accountStatus || "ACTIVE",
        }),
      });
      setUsers((current) => current.map((c) => c.id === user.id ? { ...c, ...updated } : c));
      setSuccess(`User ${key} updated successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
      fetchData();
    }
  };

  const openAssignModal = (user: UserRow) => {
    setAssignForm({
      userId: user.id,
      email: user.email,
      roleIds: (user.dynamicRoles || []).map((r) => r.roleId),
    });
    setAssignModalOpen(true);
  };

  const handleSaveAssignments = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiFetch(`/roles/users/${assignForm.userId}`, {
        method: "POST",
        body: JSON.stringify({
          roleIds: assignForm.roleIds,
        }),
      });
      setSuccess(`Dynamic roles assignment updated for ${assignForm.email}.`);
      setAssignModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign roles");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const createdResponse = await apiFetch<any>("/roles", {
        method: "POST",
        body: JSON.stringify({
          name: roleForm.name.trim(),
          description: roleForm.description.trim(),
          scope: roleForm.scope,
          category: roleForm.category,
          permissions: newRolePerms,
        }),
      });
      setSuccess(`Role '${roleForm.name}' created successfully with selected permissions.`);
      setRoleModalOpen(false);
      setRoleForm({
        name: "",
        description: "",
        scope: "GLOBAL",
        category: "General",
      });
      setNewRolePerms([]);
      await fetchData();
      const created = createdResponse?.data || createdResponse;
      if (created?.id) {
        setSelectedRoleId(created.id);
        setSelectedRolePerms(newRolePerms);
        setActiveTab("matrix");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create role");
    } finally {
      setSaving(false);
    }
  };

  const handleCloneRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const clonedResponse = await apiFetch<any>(`/roles/${selectedRoleId}/clone`, {
        method: "POST",
        body: JSON.stringify({
          newName: cloneForm.name.trim(),
          newDescription: cloneForm.description.trim(),
        }),
      });
      setSuccess(`Role cloned successfully.`);
      setCloneModalOpen(false);
      setCloneForm({ name: "", description: "" });
      fetchData();
      const cloned = clonedResponse?.data || clonedResponse;
      if (cloned?.id) setSelectedRoleId(cloned.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clone role");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRoleStatus = async (role: DynamicRole, nextStatus: "ACTIVE" | "INACTIVE" | "ARCHIVED") => {
    setError("");
    setSuccess("");
    try {
      await apiFetch(`/roles/${role.id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: nextStatus,
        }),
      });
      setSuccess(`Role status updated to ${nextStatus}.`);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role status");
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!window.confirm("Are you sure you want to delete this custom role? This action cannot be undone.")) return;
    setError("");
    setSuccess("");
    try {
      await apiFetch(`/roles/${roleId}`, {
        method: "DELETE",
      });
      setSuccess("Role deleted successfully.");
      setSelectedRoleId("");
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete role");
    }
  };

  const togglePermission = (permKey: string) => {
    setSelectedRolePerms((current) =>
      current.includes(permKey)
        ? current.filter((k) => k !== permKey)
        : [...current, permKey]
    );
  };

  const handleSaveMatrix = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiFetch(`/roles/${selectedRoleId}`, {
        method: "PUT",
        body: JSON.stringify({
          permissions: selectedRolePerms,
        }),
      });
      setSuccess("Role permission matrix saved successfully.");
      // Refresh dynamic roles list
      const rolesResponse = await apiFetch<any>("/roles");
      const rolesData = rolesResponse?.data || rolesResponse || {};
      setDynamicRoles(rolesData?.roles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save permission matrix");
    } finally {
      setSaving(false);
    }
  };

  const toggleAssignRoleSelection = (roleId: string) => {
    setAssignForm((curr) => ({
      ...curr,
      roleIds: curr.roleIds.includes(roleId)
        ? curr.roleIds.filter((id) => id !== roleId)
        : [...curr.roleIds, roleId],
    }));
  };

  // Filters
  const filteredUsers = users.filter((u) => u.email.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredRoles = dynamicRoles.filter((r) => r.name.toLowerCase().includes(roleSearchTerm.toLowerCase()));

  const selectedRole = dynamicRoles.find((r) => r.id === selectedRoleId);
  const requiresDistrict = DISTRICT_ROLES.has(userForm.role);

  return (
    <GovPortalLayout>
      <GovPageHeader
        title="Enterprise RBAC & Roles Manager"
        breadcrumb="Admin / Security / RBAC"
        description="Configure dynamic enterprise roles, map action permissions via Matrix grid, and manage user role mappings."
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <GovButton variant="primary" onClick={() => setUserModalOpen(true)}>
              Create User
            </GovButton>
            <GovButton variant="secondary" onClick={() => setRoleModalOpen(true)}>
              Create Dynamic Role
            </GovButton>
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

        {/* Tab Controls */}
        <div style={{ display: "flex", borderBottom: "2px solid #e2e8f0", marginBottom: 24, gap: 16 }}>
          <button
            onClick={() => setActiveTab("users")}
            style={{
              padding: "12px 16px",
              fontWeight: 600,
              fontSize: "15px",
              color: activeTab === "users" ? "#1e3a8a" : "#64748b",
              borderBottom: activeTab === "users" ? "3px solid #1e3a8a" : "3px solid transparent",
              transition: "all 0.2s"
            }}
          >
            User Assignments
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            style={{
              padding: "12px 16px",
              fontWeight: 600,
              fontSize: "15px",
              color: activeTab === "matrix" ? "#1e3a8a" : "#64748b",
              borderBottom: activeTab === "matrix" ? "3px solid #1e3a8a" : "3px solid transparent",
              transition: "all 0.2s"
            }}
          >
            Roles & Permission Matrix
          </button>
        </div>

        {activeTab === "users" && (
          <GovCard>
            <GovCardHeader>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: 12 }}>
                <GovCardTitle>User Directory & Role Mapping</GovCardTitle>
                <div style={{ minWidth: 260 }}>
                  <input
                    type="text"
                    className="gov-input"
                    placeholder="Search users by email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </GovCardHeader>
            <GovCardBody>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4 w-full bg-white">
                  <div className="w-10 h-10 rounded-full border-4 border-[#14274e] border-t-transparent animate-spin" />
                  <span className="text-xs text-slate-500 font-semibold">Resolving user accounts & identities...</span>
                </div>
              ) : filteredUsers.length > 0 ? (
                <div className="gov-table-container">
                  <table className="gov-table">
                    <thead>
                      <tr>
                        <th>User Email</th>
                        <th>Base Platform Role</th>
                        <th>Dynamic Roles</th>
                        <th>Assigned District</th>
                        <th>Account Status</th>
                        <th className="gov-text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={u.id}>
                          <td className="gov-font-semibold gov-text-primary" style={{ verticalAlign: "middle" }}>
                            {u.email}
                          </td>
                          <td style={{ verticalAlign: "middle" }}>
                            <select
                              className="gov-select"
                              value={u.role || ""}
                              onChange={(event) => handleUpdateUserField(u, "role", event.target.value)}
                              style={{ minWidth: 160 }}
                            >
                              <option value="">None (Custom Dynamic Only)</option>
                              {BASE_DATABASE_ROLES.map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ verticalAlign: "middle" }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                              {u.dynamicRoles && u.dynamicRoles.length > 0 ? (
                                u.dynamicRoles.map((dr) => (
                                  <span
                                    key={dr.roleId}
                                    style={{
                                      padding: "3px 8px",
                                      borderRadius: "12px",
                                      backgroundColor: "#eff6ff",
                                      color: "#1e40af",
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      border: "1px solid #bfdbfe"
                                    }}
                                  >
                                    {dr.roleName}
                                  </span>
                                ))
                              ) : (
                                <span className="gov-text-muted" style={{ fontSize: "12px" }}>No dynamic roles</span>
                              )}
                            </div>
                          </td>
                          <td style={{ verticalAlign: "middle" }}>
                            <select
                              className="gov-select"
                              value={u.assignedDistrict || ""}
                              onChange={(event) => handleUpdateUserField(u, "assignedDistrict", event.target.value)}
                              style={{ minWidth: 130 }}
                            >
                              <option value="">State level</option>
                              {MAHARASHTRA_DISTRICTS.map((district) => (
                                <option key={district} value={district}>{district}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ verticalAlign: "middle" }}>
                            <select
                              className="gov-select"
                              value={u.accountStatus || "ACTIVE"}
                              onChange={(event) => handleUpdateUserField(u, "accountStatus", event.target.value)}
                              style={{ minWidth: 120 }}
                            >
                              <option value="ACTIVE">ACTIVE</option>
                              <option value="INACTIVE">INACTIVE</option>
                              <option value="SUSPENDED">SUSPENDED</option>
                            </select>
                          </td>
                          <td className="gov-text-right" style={{ verticalAlign: "middle" }}>
                            <GovButton variant="secondary" onClick={() => openAssignModal(u)}>
                              Assign Roles
                            </GovButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="gov-empty">No users matching search query found.</div>
              )}
            </GovCardBody>
          </GovCard>
        )}

        {activeTab === "matrix" && (
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>
            {/* Left Panel: Dynamic Roles List */}
            <GovCard>
              <GovCardHeader>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                  <GovCardTitle>Dynamic Roles</GovCardTitle>
                  <input
                    type="text"
                    className="gov-input"
                    placeholder="Search roles..."
                    value={roleSearchTerm}
                    onChange={(e) => setRoleSearchTerm(e.target.value)}
                    style={{ padding: "6px 10px", fontSize: "13px" }}
                  />
                </div>
              </GovCardHeader>
              <GovCardBody style={{ padding: 0 }}>
                {loading ? (
                  <div style={{ padding: 24, textAlign: "center", color: "#64748b" }}>Loading roles...</div>
                ) : filteredRoles.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {filteredRoles.map((role) => {
                      const isSelected = role.id === selectedRoleId;
                      return (
                        <div
                          key={role.id}
                          onClick={() => selectRole(role.id)}
                          style={{
                            padding: "12px 16px",
                            cursor: "pointer",
                            backgroundColor: isSelected ? "#f1f5f9" : "transparent",
                            borderLeft: isSelected ? "4px solid #1e3a8a" : "4px solid transparent",
                            borderBottom: "1px solid #e2e8f0",
                            transition: "all 0.2s"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontWeight: 600, fontSize: "14px", color: isSelected ? "#1e3a8a" : "#334155" }}>
                              {role.name}
                            </div>
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: "8px",
                                backgroundColor: role.status === "ACTIVE" ? "#ecfdf5" : role.status === "ARCHIVED" ? "#f1f5f9" : "#fff1f2",
                                color: role.status === "ACTIVE" ? "#047857" : role.status === "ARCHIVED" ? "#475569" : "#be123c"
                              }}
                            >
                              {role.status}
                            </span>
                          </div>
                          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: 4 }}>
                            {role.permissions.length} permissions
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: 24, textAlign: "center", color: "#64748b" }}>No roles found.</div>
                )}
              </GovCardBody>
            </GovCard>

            {/* Right Panel: Role permissions matrix */}
            <div>
              {selectedRole ? (
                <GovCard>
                  <GovCardHeader>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%", flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <GovCardTitle style={{ fontSize: "20px" }}>{selectedRole.name}</GovCardTitle>
                          {selectedRole.isPermanent && (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                backgroundColor: "#fee2e2",
                                color: "#991b1b",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                letterSpacing: "0.5px"
                              }}
                            >
                              SYSTEM ROLE - IMMUTABLE
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: "13px", color: "#64748b", marginTop: 4 }}>
                          {selectedRole.description || "No description provided."}
                        </p>
                      </div>

                      {!selectedRole.isPermanent && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <GovButton
                            variant="secondary"
                            onClick={() => {
                              setCloneForm({ name: `${selectedRole.name} (Copy)`, description: selectedRole.description || "" });
                              setCloneModalOpen(true);
                            }}
                          >
                            Clone Role
                          </GovButton>
                          {selectedRole.status === "ACTIVE" ? (
                            <GovButton variant="secondary" onClick={() => handleUpdateRoleStatus(selectedRole, "INACTIVE")}>
                              Deactivate
                            </GovButton>
                          ) : (
                            <GovButton variant="secondary" onClick={() => handleUpdateRoleStatus(selectedRole, "ACTIVE")}>
                              Activate
                            </GovButton>
                          )}
                          <GovButton variant="danger" onClick={() => handleDeleteRole(selectedRole.id)}>
                            Delete Role
                          </GovButton>
                        </div>
                      )}
                    </div>
                  </GovCardHeader>
                  <GovCardBody>
                    <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h4 style={{ fontWeight: 600, color: "#1e293b", margin: 0 }}>Permissions Matrix Mapping</h4>
                      <span style={{ fontSize: "13px", color: "#475569" }}>
                        Selected permissions: <strong>{selectedRolePerms.length}</strong>
                      </span>
                    </div>

                    <div className="gov-table-container" style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                      <table className="gov-table" style={{ margin: 0 }}>
                        <thead style={{ backgroundColor: "#f8fafc" }}>
                          <tr>
                            <th style={{ width: "240px" }}>Permission Group / module</th>
                            {MATRIX_COLUMNS.map((col) => (
                              <th key={col.label} style={{ textAlign: "center", width: "100px" }}>{col.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {permissionGroups.map((group) => (
                            <tr key={group.id}>
                              <td style={{ fontWeight: 600, color: "#334155" }}>
                                <div>{group.name}</div>
                                {group.description && (
                                  <div style={{ fontSize: "11px", fontWeight: "normal", color: "#94a3b8", marginTop: 2 }}>
                                    {group.description}
                                  </div>
                                )}
                              </td>
                              {MATRIX_COLUMNS.map((col) => {
                                // Find permission in group that ends with suffixes
                                const matchedPerm = group.permissions.find((p) =>
                                  col.suffix.some((suf) => p.key.endsWith(suf))
                                );
                                
                                if (!matchedPerm) {
                                  return (
                                    <td key={col.label} style={{ textAlign: "center", verticalAlign: "middle" }}>
                                      <span style={{ color: "#cbd5e1" }}>-</span>
                                    </td>
                                  );
                                }

                                const isChecked = selectedRolePerms.includes(matchedPerm.key);
                                const disabled = selectedRole.isPermanent;

                                return (
                                  <td key={col.label} style={{ textAlign: "center", verticalAlign: "middle" }}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={disabled}
                                      onChange={() => togglePermission(matchedPerm.key)}
                                      style={{
                                        width: "18px",
                                        height: "18px",
                                        cursor: disabled ? "not-allowed" : "pointer",
                                        accentColor: "#1e3a8a"
                                      }}
                                      title={matchedPerm.description}
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Non-standard Permissions list */}
                    {permissionGroups.some((g) =>
                      g.permissions.some((p) =>
                        !MATRIX_COLUMNS.some((col) => col.suffix.some((suf) => p.key.endsWith(suf)))
                      )
                    ) && (
                      <div style={{ marginTop: 24 }}>
                        <h5 style={{ fontWeight: 600, color: "#1e293b", marginBottom: 12 }}>Miscellaneous / Specific Permissions</h5>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
                          {permissionGroups.flatMap((g) =>
                            g.permissions.filter((p) =>
                              !MATRIX_COLUMNS.some((col) => col.suffix.some((suf) => p.key.endsWith(suf)))
                            )
                          ).map((perm) => {
                            const isChecked = selectedRolePerms.includes(perm.key);
                            const disabled = selectedRole.isPermanent;
                            return (
                              <label
                                key={perm.id}
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: 10,
                                  padding: "10px 12px",
                                  backgroundColor: "#f8fafc",
                                  borderRadius: "6px",
                                  border: "1px solid #e2e8f0",
                                  cursor: disabled ? "not-allowed" : "pointer"
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={disabled}
                                  onChange={() => togglePermission(perm.key)}
                                  style={{ marginTop: 2, accentColor: "#1e3a8a" }}
                                />
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: "13px", color: "#334155" }}>{perm.key}</div>
                                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: 2 }}>{perm.description}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {!selectedRole.isPermanent && (
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
                        <GovButton variant="primary" onClick={handleSaveMatrix} disabled={saving}>
                          {saving ? "Saving..." : "Save Permission Matrix"}
                        </GovButton>
                      </div>
                    )}
                  </GovCardBody>
                </GovCard>
              ) : (
                <div style={{ backgroundColor: "#f8fafc", border: "2px dashed #cbd5e1", borderRadius: 8, padding: 48, textAlign: "center", color: "#64748b" }}>
                  Select a role from the left panel to configure its permissions matrix.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CREATE WORKFLOW USER MODAL */}
      <GovModal open={userModalOpen} onClose={() => setUserModalOpen(false)} title="Create Platform User" width={720}>
        <form onSubmit={handleCreateUser}>
          <div className="gov-grid gov-grid-cols-2 gov-gap-4">
            <GovInput
              label="Official email"
              required
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="user@mahacsr.gov.in"
            />
            <GovInput
              label="Temporary password"
              required
              type="text"
              value={userForm.password}
              onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
              minLength={6}
            />
            <GovSelect
              label="Base Platform Role"
              required
              value={userForm.role}
              onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}
            >
              {BASE_DATABASE_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </GovSelect>
            <GovSelect
              label="Account status"
              required
              value={userForm.accountStatus}
              onChange={(e) => setUserForm((prev) => ({ ...prev, accountStatus: e.target.value }))}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </GovSelect>
            <GovSelect
              label="Assigned district"
              required={requiresDistrict}
              value={userForm.assignedDistrict}
              onChange={(e) => setUserForm((prev) => ({ ...prev, assignedDistrict: e.target.value }))}
              help="Applies mostly to district consultants and nodal officers."
            >
              <option value="">State level / not applicable</option>
              {MAHARASHTRA_DISTRICTS.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </GovSelect>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
            <GovButton type="button" variant="secondary" onClick={() => setUserModalOpen(false)}>
              Cancel
            </GovButton>
            <GovButton type="submit" variant="primary" disabled={saving}>
              {saving ? "Creating..." : "Create User"}
            </GovButton>
          </div>
        </form>
      </GovModal>

      {/* CREATE DYNAMIC ROLE MODAL */}
      <GovModal open={roleModalOpen} onClose={() => setRoleModalOpen(false)} title="Create Dynamic Role" width={960}>
        <form onSubmit={handleCreateRole}>
          <div style={{ display: "flex", gap: 24 }}>
            {/* Left Column: Role Details */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontWeight: 600, fontSize: "14px", color: "#1e3a8a", borderBottom: "1px solid #e2e8f0", paddingBottom: 6 }}>
                Role Metadata Details
              </div>
              <GovInput
                label="Role Name"
                required
                value={roleForm.name}
                onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. CSR_CONSULTANT"
              />
              <GovInput
                label="Description"
                required
                value={roleForm.description}
                onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Explain the purpose or assignments of this role..."
              />
              <GovInput
                label="Category"
                value={roleForm.category}
                onChange={(e) => setRoleForm((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="e.g. Audit, Operations, Approval"
              />
            </div>

            {/* Right Column: Permission Checklist Selector */}
            <div style={{ flex: 1.3, borderLeft: "1px solid #e2e8f0", paddingLeft: 24, display: "flex", flexDirection: "column" }}>
              <div style={{ fontWeight: 600, fontSize: "14px", color: "#1e3a8a", borderBottom: "1px solid #e2e8f0", paddingBottom: 6, marginBottom: 12 }}>
                Assign Initial Permissions ({newRolePerms.length} Selected)
              </div>
              <div style={{ maxHeight: "380px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 8 }}>
                {permissionGroups.map((group) => (
                  <div key={group.id} style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: 12, backgroundColor: "#f8fafc" }}>
                    <div style={{ fontWeight: 700, fontSize: "12px", color: "#1e3a8a", borderBottom: "1px solid #e2e8f0", paddingBottom: 4, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{group.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const keys = group.permissions.map(p => p.key);
                          const allChecked = keys.every(k => newRolePerms.includes(k));
                          if (allChecked) {
                            setNewRolePerms(prev => prev.filter(k => !keys.includes(k)));
                          } else {
                            setNewRolePerms(prev => Array.from(new Set([...prev, ...keys])));
                          }
                        }}
                        style={{ fontSize: "10px", color: "#1789d6", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        {group.permissions.map(p => p.key).every(k => newRolePerms.includes(k)) ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {group.permissions.map((perm) => {
                        const isChecked = newRolePerms.includes(perm.key);
                        return (
                          <label key={perm.id} style={{ display: "flex", alignItems: "flex-start", gap: 6, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setNewRolePerms((prev) =>
                                  prev.includes(perm.key)
                                    ? prev.filter((k) => k !== perm.key)
                                    : [...prev, perm.key]
                                );
                              }}
                              style={{ marginTop: 2, accentColor: "#1e3a8a" }}
                            />
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: "11px", fontWeight: 600, color: "#334155" }} title={perm.key}>
                                {perm.key}
                              </span>
                              <span style={{ fontSize: "9px", color: "#64748b", lineHeight: "1.2" }}>
                                {perm.description}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
            <GovButton type="button" variant="secondary" onClick={() => { setRoleModalOpen(false); setNewRolePerms([]); }}>
              Cancel
            </GovButton>
            <GovButton type="submit" variant="primary" disabled={saving}>
              {saving ? "Creating..." : "Create Dynamic Role"}
            </GovButton>
          </div>
        </form>
      </GovModal>

      {/* CLONE ROLE MODAL */}
      <GovModal open={cloneModalOpen} onClose={() => setCloneModalOpen(false)} title="Duplicate / Clone Role" width={500}>
        <form onSubmit={handleCloneRole}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <GovInput
              label="New Role Name"
              required
              value={cloneForm.name}
              onChange={(e) => setCloneForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <GovInput
              label="New Description"
              value={cloneForm.description}
              onChange={(e) => setCloneForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
            <GovButton type="button" variant="secondary" onClick={() => setCloneModalOpen(false)}>
              Cancel
            </GovButton>
            <GovButton type="submit" variant="primary" disabled={saving}>
              {saving ? "Cloning..." : "Clone Role"}
            </GovButton>
          </div>
        </form>
      </GovModal>

      {/* ASSIGN ROLE MODAL */}
      <GovModal open={assignModalOpen} onClose={() => setAssignModalOpen(false)} title={`Assign Dynamic Roles: ${assignForm.email}`} width={550}>
        <form onSubmit={handleSaveAssignments}>
          <p style={{ fontSize: "14px", color: "#475569", marginBottom: 16 }}>
            Select one or more dynamic roles to assign to this user. They will dynamically inherit all the configured permissions of selected roles.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "300px", overflowY: "auto", padding: "4px" }}>
            {dynamicRoles.map((role) => {
              const isChecked = assignForm.roleIds.includes(role.id);
              return (
                <label
                  key={role.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    cursor: "pointer",
                    backgroundColor: isChecked ? "#f8fafc" : "transparent",
                    transition: "all 0.15s"
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleAssignRoleSelection(role.id)}
                    style={{ width: "16px", height: "16px", accentColor: "#1e3a8a" }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "#334155" }}>{role.name}</div>
                    {role.description && <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: 2 }}>{role.description}</div>}
                  </div>
                </label>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
            <GovButton type="button" variant="secondary" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </GovButton>
            <GovButton type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving..." : "Save Assignments"}
            </GovButton>
          </div>
        </form>
      </GovModal>
    </GovPortalLayout>
  );
}

export default function AdminUsersRolesPage() {
  return (
    <Suspense fallback={null}>
      <AdminUsersRolesPageContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Search,
  UserPlus,
  Users,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
} from "lucide-react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovInput from "@/components/gov/GovInput";
import GovSelect from "@/components/gov/GovSelect";
import GovTextarea from "@/components/gov/GovTextarea";
import GovAlert from "@/components/gov/GovAlert";
import GovStatusBadge, { statusToVariant } from "@/components/gov/GovStatusBadge";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { apiFetch, invalidateCache } from "@/lib/api";
import { locationData } from "@/lib/locationData";

interface AssignmentContext {
  entityType: string;
  entityId: string;
  title: string;
  reference: string;
  district: string;
  currentStage: string | null;
  assignments: Array<{
    id: string;
    assignmentType: string;
    status: string;
    assignedAt: string;
    assignedTo: {
      id: string;
      email: string;
      accountStatus: string;
      officerProfile: { fullName: string | null; designation: string | null; department: string | null; mobile: string | null } | null;
    };
    assignedRole: { id: string; name: string } | null;
  }>;
}

interface OfficerResult {
  id: string;
  email: string;
  accountStatus: string;
  assignedDistrict: string | null;
  officerProfile: {
    fullName: string | null;
    designation: string | null;
    department: string | null;
    mobile: string | null;
    employeeId: string | null;
    district: string | null;
  } | null;
}

interface AssignableRole {
  id: string;
  name: string;
  description: string | null;
  _count?: { rolePermissions: number };
}

const maharashtraDistricts =
  locationData.find((state) => state.name === "Maharashtra")?.districts.map((d) => d.name) ?? [];

export default function AssignOfficerPage() {
  const params = useParams<{ entityType: string; entityId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const entityType = String(params.entityType || "").toUpperCase();
  const entityId = String(params.entityId || "");

  const [tab, setTab] = useState<"existing" | "new">("existing");
  const [successMessage, setSuccessMessage] = useState("");

  const contextQuery = useQuery({
    queryKey: ["assignment-context", entityType, entityId],
    queryFn: () =>
      apiFetch<{ data: AssignmentContext }>(`/assignments/context/${entityType}/${entityId}`).then(
        (response: any) => (response?.data ?? response) as AssignmentContext
      ),
    enabled: Boolean(entityType && entityId),
  });

  const rolesQuery = useQuery({
    queryKey: ["assignable-roles"],
    queryFn: () =>
      apiFetch<any>(`/assignments/roles`).then(
        (response: any) => ((response?.data ?? response)?.roles ?? []) as AssignableRole[]
      ),
  });

  const context = contextQuery.data;

  const handleAssigned = (message: string) => {
    setSuccessMessage(message);
    invalidateCache("/assignments");
    queryClient.invalidateQueries({ queryKey: ["assignment-context", entityType, entityId] });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <GovPortalLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assign Officer</h1>
          <p className="text-sm text-slate-500">
            Assign an existing officer or create and invite a new officer for this approved project.
          </p>
        </div>

        {successMessage && (
          <GovAlert variant="success">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          </GovAlert>
        )}

        {contextQuery.isLoading ? (
          <PageSkeleton />
        ) : contextQuery.isError ? (
          <GovAlert variant="danger">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{(contextQuery.error as Error)?.message || "Failed to load project context."}</span>
            </div>
          </GovAlert>
        ) : context ? (
          <>
            <GovCard>
              <GovCardHeader>
                <GovCardTitle>
                  <span className="flex items-center gap-2">
                    <FileText className="w-5 h-5" /> Project Details
                  </span>
                </GovCardTitle>
              </GovCardHeader>
              <GovCardBody>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Project</p>
                    <p className="font-medium text-slate-900">{context.title}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Reference</p>
                    <p className="font-medium text-slate-900">{context.reference}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> District</p>
                    <p className="font-medium text-slate-900">{context.district}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Workflow Stage</p>
                    <GovStatusBadge variant={statusToVariant(context.currentStage || "N/A")}>
                      {(context.currentStage || "N/A").replace(/_/g, " ")}
                    </GovStatusBadge>
                  </div>
                </div>

                {context.assignments.length > 0 && (
                  <div className="mt-5 border-t border-slate-200 pt-4">
                    <p className="text-sm font-medium text-slate-700 mb-2">Existing Assignments</p>
                    <ul className="space-y-2">
                      {context.assignments.map((assignment) => (
                        <li key={assignment.id} className="flex items-center justify-between text-sm bg-slate-50 rounded px-3 py-2">
                          <span>
                            <span className="font-medium text-slate-900">
                              {assignment.assignedTo.officerProfile?.fullName || assignment.assignedTo.email}
                            </span>
                            <span className="text-slate-500"> — {assignment.assignmentType.replace(/_/g, " ")}</span>
                            {assignment.assignedRole && (
                              <span className="text-slate-500"> ({assignment.assignedRole.name})</span>
                            )}
                          </span>
                          <GovStatusBadge variant={statusToVariant(assignment.status)}>
                            {assignment.status.replace(/_/g, " ")}
                          </GovStatusBadge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </GovCardBody>
            </GovCard>

            <div className="flex border-b border-slate-200">
              <button
                className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 ${
                  tab === "existing"
                    ? "border-blue-700 text-blue-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => setTab("existing")}
              >
                <Users className="w-4 h-4" /> Assign Existing Officer
              </button>
              <button
                className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 ${
                  tab === "new"
                    ? "border-blue-700 text-blue-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => setTab("new")}
              >
                <UserPlus className="w-4 h-4" /> Create New Officer
              </button>
            </div>

            {tab === "existing" ? (
              <ExistingOfficerTab
                entityType={entityType}
                entityId={entityId}
                roles={rolesQuery.data ?? []}
                onAssigned={handleAssigned}
              />
            ) : (
              <NewOfficerTab
                entityType={entityType}
                entityId={entityId}
                defaultDistrict={context.district}
                roles={rolesQuery.data ?? []}
                rolesLoading={rolesQuery.isLoading}
                onAssigned={handleAssigned}
              />
            )}
          </>
        ) : null}
      </div>
    </GovPortalLayout>
  );
}

function ExistingOfficerTab({
  entityType,
  entityId,
  roles,
  onAssigned,
}: {
  entityType: string;
  entityId: string;
  roles: AssignableRole[];
  onAssigned: (message: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedOfficer, setSelectedOfficer] = useState<OfficerResult | null>(null);
  const [roleId, setRoleId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const searchQuery = useQuery({
    queryKey: ["officer-search", debounced],
    queryFn: () =>
      apiFetch<any>(`/assignments/officers/search?q=${encodeURIComponent(debounced)}`).then(
        (response: any) => ((response?.data ?? response)?.officers ?? []) as OfficerResult[]
      ),
    enabled: debounced.length >= 2,
  });

  const handleAssign = async () => {
    if (!selectedOfficer) return;
    setError("");
    setSubmitting(true);
    try {
      await apiFetch(`/assignments`, {
        method: "POST",
        body: JSON.stringify({
          entityType,
          entityId,
          assignedToId: selectedOfficer.id,
          assignedRoleId: roleId || undefined,
          remarks: remarks || undefined,
        }),
      });
      onAssigned(
        `Officer ${selectedOfficer.officerProfile?.fullName || selectedOfficer.email} assigned successfully. Notifications have been sent.`
      );
      setSelectedOfficer(null);
      setRemarks("");
    } catch (err) {
      setError((err as Error).message || "Failed to assign officer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GovCard>
      <GovCardBody>
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              className="gov-input pl-9 w-full"
              placeholder="Search by name, email, mobile, employee ID, department or designation…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {debounced.length >= 2 && (
            <div className="border border-slate-200 rounded divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {searchQuery.isLoading ? (
                <div className="flex items-center justify-center py-6 text-slate-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Searching…
                </div>
              ) : (searchQuery.data ?? []).length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-500">
                  No matching officers found. Try the &quot;Create New Officer&quot; tab.
                </div>
              ) : (
                (searchQuery.data ?? []).map((officer) => (
                  <button
                    key={officer.id}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-50 ${
                      selectedOfficer?.id === officer.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => setSelectedOfficer(officer)}
                  >
                    <p className="font-medium text-slate-900">
                      {officer.officerProfile?.fullName || officer.email}
                    </p>
                    <p className="text-slate-500">
                      {[
                        officer.email,
                        officer.officerProfile?.designation,
                        officer.officerProfile?.department,
                        officer.officerProfile?.district || officer.assignedDistrict,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}

          {selectedOfficer && (
            <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-4">
              <p className="text-sm">
                Selected:{" "}
                <span className="font-medium text-slate-900">
                  {selectedOfficer.officerProfile?.fullName || selectedOfficer.email}
                </span>{" "}
                <span className="text-slate-500">({selectedOfficer.email})</span>
              </p>
              <GovSelect
                label="Assign Role (optional)"
                value={roleId}
                onChange={(event) => setRoleId(event.target.value)}
                help="Roles are configured dynamically by administrators"
              >
                <option value="">Keep current role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </GovSelect>
              <GovTextarea
                label="Remarks (optional)"
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                rows={2}
              />
              {error && <GovAlert variant="danger">{error}</GovAlert>}
              <GovButton onClick={handleAssign} disabled={submitting}>
                {submitting ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Assigning…</span>
                ) : (
                  "Assign Officer"
                )}
              </GovButton>
            </div>
          )}
        </div>
      </GovCardBody>
    </GovCard>
  );
}

const EMPTY_FORM = {
  fullName: "",
  email: "",
  mobile: "",
  designation: "",
  department: "",
  employeeId: "",
  officeAddress: "",
  district: "",
  taluka: "",
  block: "",
  office: "",
  remarks: "",
  roleId: "",
};

function NewOfficerTab({
  entityType,
  entityId,
  defaultDistrict,
  roles,
  rolesLoading,
  onAssigned,
}: {
  entityType: string;
  entityId: string;
  defaultDistrict: string;
  roles: AssignableRole[];
  rolesLoading: boolean;
  onAssigned: (message: string) => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, district: defaultDistrict });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const talukas = useMemo(() => {
    const district = locationData
      .find((state) => state.name === "Maharashtra")
      ?.districts.find((d) => d.name === form.district);
    return district?.talukas ?? [];
  }, [form.district]);

  const set = (key: keyof typeof EMPTY_FORM) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!form.roleId) {
      setError("Please select a role for the new officer.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch(`/assignments/officers`, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          employeeId: form.employeeId || undefined,
          officeAddress: form.officeAddress || undefined,
          taluka: form.taluka || undefined,
          block: form.block || undefined,
          office: form.office || undefined,
          remarks: form.remarks || undefined,
          entityType,
          entityId,
        }),
      });
      onAssigned(
        `Officer ${form.fullName} created and assigned. A secure activation link has been sent to ${form.email} — no password is ever emailed.`
      );
      setForm({ ...EMPTY_FORM, district: defaultDistrict });
    } catch (err) {
      setError((err as Error).message || "Failed to create officer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GovCard>
      <GovCardBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          <GovAlert variant="info">
            The new officer will receive a secure, single-use activation link by email and SMS to set their own
            password. Passwords are never sent by email.
          </GovAlert>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GovInput label="Full Name" required value={form.fullName} onChange={set("fullName")} />
            <GovInput label="Email" type="email" required value={form.email} onChange={set("email")} />
            <GovInput label="Mobile Number" required value={form.mobile} onChange={set("mobile")} />
            <GovInput label="Employee ID (optional)" value={form.employeeId} onChange={set("employeeId")} />
            <GovInput label="Designation" required value={form.designation} onChange={set("designation")} />
            <GovInput label="Department" required value={form.department} onChange={set("department")} />
            <GovSelect
              label="Role"
              required
              value={form.roleId}
              onChange={set("roleId")}
              help="Assignable roles are loaded dynamically from RBAC configuration"
            >
              <option value="">{rolesLoading ? "Loading roles…" : "Select role"}</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                  {role._count ? ` (${role._count.rolePermissions} permissions)` : ""}
                </option>
              ))}
            </GovSelect>
            <GovSelect label="District" required value={form.district} onChange={set("district")}>
              <option value="">Select district</option>
              {maharashtraDistricts.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </GovSelect>
            <GovSelect label="Taluka (optional)" value={form.taluka} onChange={set("taluka")}>
              <option value="">Select taluka</option>
              {talukas.map((taluka) => (
                <option key={taluka} value={taluka}>
                  {taluka}
                </option>
              ))}
            </GovSelect>
            <GovInput label="Block (optional)" value={form.block} onChange={set("block")} />
            <GovInput label="Office (optional)" value={form.office} onChange={set("office")} />
          </div>

          <GovTextarea label="Office Address (optional)" value={form.officeAddress} onChange={set("officeAddress")} rows={2} />
          <GovTextarea label="Remarks (optional)" value={form.remarks} onChange={set("remarks")} rows={2} />

          {error && <GovAlert variant="danger">{error}</GovAlert>}

          <GovButton type="submit" disabled={submitting}>
            {submitting ? (
              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Creating &amp; inviting…</span>
            ) : (
              "Create Officer & Send Invitation"
            )}
          </GovButton>
        </form>
      </GovCardBody>
    </GovCard>
  );
}

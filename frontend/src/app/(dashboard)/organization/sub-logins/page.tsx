"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Building2, CheckCircle2, Clock3, Loader2, Mail, UserPlus } from "lucide-react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { GovPageHeader } from "@/components/layout/GovPageHeader";
import { useApiQuery } from "@/lib/apiHooks";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { AccessRestricted } from "@/components/auth/AccessRestricted";

const labelStatus = (status?: string) => (status || "UNKNOWN").replace(/_/g, " ");

export default function AgencySubLoginsPage() {
  const user = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);
  const roleNames = roles?.length ? roles : user?.role ? [user.role] : [];
  const isCompany = roleNames.some((role) => /COMPANY|CORPORATE|ROLE_8/i.test(String(role))) || user?.organization?.kind === "CSR_COMPANY";

  const { data: rowsResponse, isLoading, refetch } = useApiQuery<any>(["agency-sub-logins"], "/implementing-agency/sub-logins", { enabled: isCompany });
  const { data: projectResponse } = useApiQuery<any>(["agency-projects"], "/convergence-projects", { enabled: isCompany });
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [ngoName, setNgoName] = useState("");
  const [darpanId, setDarpanId] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [projectSelections, setProjectSelections] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [assigningId, setAssigningId] = useState("");
  const [message, setMessage] = useState("");

  const rows = Array.isArray(rowsResponse?.data) ? rowsResponse.data : Array.isArray(rowsResponse) ? rowsResponse : [];
  const projects = Array.isArray(projectResponse?.data) ? projectResponse.data : Array.isArray(projectResponse) ? projectResponse : [];
  const stats = useMemo(
    () => ({
      approved: rows.filter((row: any) => row.agencyOrganization?.status === "ACTIVE").length,
      review: rows.filter((row: any) => ["UNDER_VERIFICATION", "DOCUMENTS_PENDING"].includes(row.agencyOrganization?.status)).length,
      invited: rows.filter((row: any) => ["INVITE_SENT", "ONBOARDING_REQUIRED"].includes(row.status)).length
    }),
    [rows]
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const body = { email, ngoName, darpanId, contactPerson, phone };
      const result = await apiFetch<any>("/implementing-agency/sub-logins", { method: "POST", body: JSON.stringify(body) });
      setMessage(result?.message || "NGO invitation created.");
      setEmail("");
      setNgoName("");
      setDarpanId("");
      setContactPerson("");
      setPhone("");
      setShowForm(false);
      refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create the invitation.");
    } finally {
      setSaving(false);
    }
  };

  const assignProject = async (rowId: string) => {
    const projectId = projectSelections[rowId];
    if (!projectId) return setMessage("Select a project before assigning the NGO.");
    setAssigningId(rowId);
    setMessage("");
    try {
      const result = await apiFetch<any>("/implementing-agency/assign", {
        method: "POST",
        body: JSON.stringify({ subLoginId: rowId, projectId })
      });
      setMessage(result?.message || "NGO assigned to the project.");
      refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to assign the NGO.");
    } finally {
      setAssigningId("");
    }
  };

  if (!isCompany) {
    return (
      <GovPortalLayout>
        <main className="mx-auto min-h-screen max-w-screen-xl px-4 py-4 md:px-6">
          <AccessRestricted
            requiredPermission="ngo_login:create"
            reason="Sub-logins for NGOs and Implementing Agencies are restricted strictly to authorized Company / Corporate Dashboard accounts."
          />
        </main>
      </GovPortalLayout>
    );
  }

  return (
    <GovPortalLayout>
      <main className="mx-auto min-h-screen max-w-screen-xl space-y-4 px-4 py-4 md:px-6">
        <GovPageHeader
          eyebrow="Company / Corporate Dashboard"
          title="NGO & Implementing Agency Sub-Logins"
          description="Invite an NGO/Implementing Agency, monitor onboarding and approval status, and assign projects after Super Admin verification."
          actions={
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2 text-xs font-bold text-white">
              <UserPlus size={15} /> Invite NGO / Agency
            </button>
          }
        />

        <section className="grid gap-3 sm:grid-cols-3">
          <Metric icon={<CheckCircle2 size={18} />} label="Super Admin approved" value={stats.approved} />
          <Metric icon={<Clock3 size={18} />} label="Under review" value={stats.review} />
          <Metric icon={<Mail size={18} />} label="Awaiting activation / onboarding" value={stats.invited} />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-extrabold text-slate-900">Invited organizations and accounts</h2>
            <p className="mt-1 text-xs text-slate-500">Project assignment remains locked until the organization status is ACTIVE.</p>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-900" /></div>
          ) : rows.length === 0 ? (
            <p className="p-10 text-center text-xs font-semibold text-slate-500">No invitations have been created.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {rows.map((row: any) => {
                const onboardingStatus = row.agencyOrganization?.status || "INVITATION_PENDING";
                const approved = onboardingStatus === "ACTIVE";
                return (
                  <div key={row.id} className="space-y-3 px-5 py-4">
                    <div className="grid gap-3 md:grid-cols-[1.25fr_1fr_1fr_auto] md:items-center">
                      <div>
                        <p className="font-bold text-slate-900">{row.ngoName || row.email}</p>
                        <p className="text-xs text-slate-500">{row.darpanId || "Darpan ID to be completed during onboarding"}</p>
                      </div>
                      <p className="break-all text-xs text-blue-800">{row.email}</p>
                      <div className="text-xs">
                        <p className="font-bold text-slate-700">Account: {labelStatus(row.status)}</p>
                        <p className={approved ? "font-bold text-emerald-700" : "font-bold text-amber-700"}>Onboarding: {labelStatus(onboardingStatus)}</p>
                      </div>
                      <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-extrabold ${approved ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {approved ? "ELIGIBLE FOR ASSIGNMENT" : "ASSIGNMENT LOCKED"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center">
                      {row.assignedProject ? (
                        <p className="text-xs font-bold text-emerald-800">Assigned project: {row.assignedProject.title}</p>
                      ) : (
                        <>
                          <select
                            disabled={!approved}
                            value={projectSelections[row.id] || ""}
                            onChange={(event) => setProjectSelections((current) => ({ ...current, [row.id]: event.target.value }))}
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-2 text-xs disabled:cursor-not-allowed disabled:bg-slate-100"
                          >
                            <option value="">{approved ? "Select a company project" : "Available after Super Admin approval"}</option>
                            {projects.map((project: any) => <option key={project.id} value={project.id}>{project.projectCode ? `${project.projectCode} — ` : ""}{project.title}</option>)}
                          </select>
                          <button
                            type="button"
                            disabled={!approved || assigningId === row.id}
                            onClick={() => assignProject(row.id)}
                            className="rounded-lg bg-blue-900 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            {assigningId === row.id ? "Assigning…" : "Assign project"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {message && <p className="rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-800">{message}</p>}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
            <form onSubmit={submit} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Invite NGO / Implementing Agency</h2>
                <p className="mt-1 text-xs text-slate-500">
                  An activation link will be emailed to the agency. No project can be assigned until onboarding is approved by Super Admin.
                </p>
              </div>
              <label className="block text-xs font-bold text-slate-700">NGO / agency name<input required value={ngoName} onChange={(event) => setNgoName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5" /></label>
              <label className="block text-xs font-bold text-slate-700">NGO Darpan ID (if available)<input value={darpanId} onChange={(event) => setDarpanId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5" /></label>
              <label className="block text-xs font-bold text-slate-700">Official email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5" /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-bold text-slate-700">Contact person<input value={contactPerson} onChange={(event) => setContactPerson(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5" /></label>
                <label className="block text-xs font-bold text-slate-700">Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5" /></label>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700">Cancel</button>
                <button disabled={saving} className="rounded-xl bg-blue-900 px-4 py-2 text-xs font-bold text-white">{saving ? "Creating…" : "Send invitation"}</button>
              </div>
            </form>
          </div>
        )}
      </main>
    </GovPortalLayout>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-blue-800">{icon}<p className="text-[11px] font-extrabold uppercase tracking-wider">{label}</p></div><p className="mt-3 text-xl font-extrabold text-slate-900">{value}</p></div>;
}

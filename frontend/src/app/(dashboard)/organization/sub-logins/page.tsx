"use client";

import { FormEvent, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Loader2, Mail, UserPlus } from "lucide-react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { GovPageHeader } from "@/components/layout/GovPageHeader";
import { AccessRestricted } from "@/components/auth/AccessRestricted";
import { apiFetch } from "@/lib/api";
import { useApiQuery } from "@/lib/apiHooks";
import { useAuthStore } from "@/store/authStore";

const statusLabel = (value?: string) => (value || "UNKNOWN").replace(/_/g, " ");

export default function AgencySubLoginsPage() {
  const user = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const roleNames = roles?.length ? roles : user?.role ? [user.role] : [];
  const isCorporate = roleNames.some((role) => /COMPANY|CORPORATE|ROLE_8/i.test(String(role))) || user?.organization?.kind === "CSR_COMPANY";
  const authorized = isCorporate || isAdmin;
  const { data: membershipResponse, isLoading, refetch } = useApiQuery<any>(["corporate-ngo-memberships"], "/implementing-agency/sub-logins", { enabled: authorized });
  const { data: projectResponse } = useApiQuery<any>(["corporate-projects-for-ngo"], "/convergence-projects", { enabled: authorized });
  const memberships = useMemo(() => Array.isArray(membershipResponse?.data) ? membershipResponse.data : [], [membershipResponse]);
  const projects = Array.isArray(projectResponse?.data) ? projectResponse.data : Array.isArray(projectResponse) ? projectResponse : [];
  const [showInvite, setShowInvite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [projectSelections, setProjectSelections] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ projectId: "", name: "", darpanNumber: "", contactEmail: "", contactPersonName: "", mobile: "" });
  const stats = useMemo(() => ({
    approved: memberships.filter((item: any) => item.status === "APPROVED").length,
    action: memberships.filter((item: any) => item.status === "PENDING_CORPORATE_REVIEW").length,
    pending: memberships.filter((item: any) => ["INVITED", "CLARIFICATION_REQUIRED"].includes(item.status)).length,
  }), [memberships]);

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.projectId) return setMessage("Select the first project for this NGO access.");
    setSaving(true); setMessage("");
    try {
      const response: any = await apiFetch(`/implementing-agency/projects/${form.projectId}/invite`, { method: "POST", body: JSON.stringify(form) });
      setMessage(response?.message || "NGO invitation and corporate-specific access created.");
      setForm({ projectId: "", name: "", darpanNumber: "", contactEmail: "", contactPersonName: "", mobile: "" });
      setShowInvite(false); await refetch();
    } catch (error) { setMessage(error instanceof Error ? error.message : "The invitation could not be created."); }
    finally { setSaving(false); }
  };

  const decide = async (membershipId: string, action: "APPROVE" | "CLARIFY" | "REJECT") => {
    const remarks = action === "APPROVE" ? "" : window.prompt(`Enter mandatory ${action.toLowerCase()} remarks:`) || "";
    if (action !== "APPROVE" && !remarks.trim()) return;
    setBusy(membershipId); setMessage("");
    try {
      await apiFetch(`/implementing-agency/sub-logins/${membershipId}/decide`, { method: "POST", body: JSON.stringify({ action, remarks }) });
      setMessage(`Corporate review decision recorded: ${statusLabel(action)}.`); await refetch();
    } catch (error) { setMessage(error instanceof Error ? error.message : "The review decision could not be recorded."); }
    finally { setBusy(""); }
  };

  const assign = async (membershipId: string) => {
    const projectId = projectSelections[membershipId];
    if (!projectId) return setMessage("Select a project before assigning this approved NGO.");
    setBusy(membershipId); setMessage("");
    try {
      const response: any = await apiFetch("/implementing-agency/assign", { method: "POST", body: JSON.stringify({ membershipId, projectId }) });
      setMessage(response?.message || "NGO assigned to the selected project."); await refetch();
    } catch (error) { setMessage(error instanceof Error ? error.message : "The NGO could not be assigned."); }
    finally { setBusy(""); }
  };

  if (!authorized) return <GovPortalLayout><main className="mx-auto min-h-screen max-w-screen-xl px-4 py-6"><AccessRestricted requiredPermission="ngo_login:create" reason="Corporate–NGO membership and project access can be managed only inside an authorized Corporate organization." /></main></GovPortalLayout>;

  return <GovPortalLayout><main className="mx-auto min-h-screen max-w-screen-xl space-y-5 px-4 py-5 md:px-6">
    <GovPageHeader eyebrow="Corporate implementation governance" title="NGO Memberships & Project Access" description="Invite or reuse an NGO master, review its submitted profile within your Corporate scope, and grant access only to approved projects." actions={<button onClick={() => setShowInvite(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-950 px-4 py-2 text-xs font-bold text-white"><UserPlus size={15}/>Invite NGO</button>} />
    <section className="grid gap-3 sm:grid-cols-3"><Metric icon={<CheckCircle2 size={18}/>} label="Approved memberships" value={stats.approved}/><Metric icon={<Clock3 size={18}/>} label="Awaiting corporate decision" value={stats.action}/><Metric icon={<Mail size={18}/>} label="Invited / clarification" value={stats.pending}/></section>
    {message && <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{message}</p>}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-extrabold text-slate-950">Corporate–NGO membership register</h2><p className="mt-1 text-xs text-slate-500">The NGO master is reusable; login identifiers and project permissions remain specific to this Corporate relationship.</p></div>
      {isLoading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-900"/></div> : memberships.length === 0 ? <div className="p-14 text-center"><AlertCircle className="mx-auto text-slate-400"/><h3 className="mt-3 font-bold">No NGO memberships yet</h3><p className="mt-1 text-sm text-slate-500">Invite the first NGO against a project to begin the governed onboarding flow.</p></div> : <div className="divide-y divide-slate-100">{memberships.map((item: any) => {
        const ngo = item.ngoOrganization || {}; const access = item.accesses?.[0]; const approved = item.status === "APPROVED";
        return <article key={item.id} className="space-y-4 p-5"><div className="grid gap-3 md:grid-cols-[1.4fr_1fr_auto]"><div><h3 className="font-bold text-slate-950">{ngo.name || item.contactEmail}</h3><p className="mt-1 text-xs text-slate-500">Darpan: {ngo.ngoProfile?.darpanNumber || "Not supplied"} · CSR-1: {ngo.ngoProfile?.csr1Number || "Not supplied"}</p></div><div className="text-xs text-slate-600"><p>{item.contactEmail}</p><p className="mt-1 font-semibold">Login ID: {access?.loginIdentifier || "Pending"}</p></div><span className={`h-fit rounded-full px-3 py-1 text-[10px] font-black ${approved ? "bg-emerald-100 text-emerald-800" : item.status === "REJECTED" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900"}`}>{statusLabel(item.status)}</span></div>
          {item.status === "PENDING_CORPORATE_REVIEW" && <div className="flex flex-wrap justify-end gap-2"><button disabled={busy===item.id} onClick={() => decide(item.id,"REJECT")} className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-bold text-rose-800">Reject</button><button disabled={busy===item.id} onClick={() => decide(item.id,"CLARIFY")} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-bold text-amber-900">Request clarification</button><button disabled={busy===item.id} onClick={() => decide(item.id,"APPROVE")} className="rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white">Approve membership</button></div>}
          {approved && <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row"><select value={projectSelections[item.id] || ""} onChange={(event) => setProjectSelections((current) => ({...current,[item.id]:event.target.value}))} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-2 text-xs"><option value="">Select another scoped project</option>{projects.map((project:any)=><option key={project.id} value={project.id}>{project.projectCode ? `${project.projectCode} — ` : ""}{project.title}</option>)}</select><button disabled={busy===item.id} onClick={() => assign(item.id)} className="rounded-lg bg-blue-950 px-4 py-2 text-xs font-bold text-white">Grant project access</button></div>}
        </article>})}</div>}
    </section>
    {showInvite && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><form onSubmit={invite} className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-6"><div><h2 className="font-extrabold text-slate-950">Invite NGO / Implementing Agency</h2><p className="mt-1 text-xs leading-5 text-slate-500">This creates or reuses the NGO master and sends a separate temporary Corporate-context login. The password must be changed on first use.</p></div><label className="block text-xs font-bold">Initial project<select required value={form.projectId} onChange={e=>setForm({...form,projectId:e.target.value})} className="mt-1.5 w-full rounded-xl border p-3"><option value="">Select project</option>{projects.map((p:any)=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><Field label="NGO name" required value={form.name} onChange={name=>setForm({...form,name})}/><Field label="Darpan number" value={form.darpanNumber} onChange={darpanNumber=>setForm({...form,darpanNumber})}/><Field label="Contact person" value={form.contactPersonName} onChange={contactPersonName=>setForm({...form,contactPersonName})}/><Field label="Mobile" value={form.mobile} onChange={mobile=>setForm({...form,mobile})}/></div><Field label="Official contact email" type="email" required value={form.contactEmail} onChange={contactEmail=>setForm({...form,contactEmail})}/><div className="flex justify-end gap-2"><button type="button" onClick={()=>setShowInvite(false)} className="rounded-xl border px-4 py-2 text-xs font-bold">Cancel</button><button disabled={saving} className="rounded-xl bg-blue-950 px-4 py-2 text-xs font-bold text-white">{saving?"Creating…":"Create access & email invite"}</button></div></form></div>}
  </main></GovPortalLayout>;
}

function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:number}){return <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-blue-800">{icon}<span className="text-[11px] font-extrabold uppercase tracking-wide">{label}</span></div><p className="mt-3 text-2xl font-black text-slate-950">{value}</p></div>}
function Field({label,value,onChange,type="text",required=false}:{label:string;value:string;onChange:(value:string)=>void;type?:string;required?:boolean}){return <label className="block text-xs font-bold">{label}<input required={required} type={type} value={value} onChange={e=>onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3"/></label>}

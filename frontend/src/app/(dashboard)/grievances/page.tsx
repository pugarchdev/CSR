"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { StandardPageHeader } from "@/components/layout/StandardPageHeader";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";
import GovDataTable from "@/components/gov/GovDataTable";
import GovButton from "@/components/gov/GovButton";
import GovStatusBadge, { statusToVariant } from "@/components/gov/GovStatusBadge";
import GovModal from "@/components/gov/GovModal";
import GovInput from "@/components/gov/GovInput";
import GovTextarea from "@/components/gov/GovTextarea";
import GovAlert from "@/components/gov/GovAlert";
import AccessDenied from "@/components/gov/AccessDenied";
import { apiFetch, clearApiCache } from "@/lib/api";
import { getCurrentUser, hasPageAccess, GRIEVANCE_ACCESS_PERMS } from "@/lib/roleAccess";
import { AlertCircle, CheckCircle2, Clock, ShieldAlert, Plus } from "lucide-react";

interface Grievance {
  id: string;
  grievanceId: string;
  issueTitle: string;
  status: string;
  level1DueAt: string | null;
  level2DueAt: string | null;
  createdAt: string;
  updatedAt: string;
  convergenceProject?: { projectId: string; title: string };
  raisedByUser?: { email: string };
  assignedNodalOfficer?: { email: string };
}

export default function GrievancesPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [submitError, setSubmitError] = useState("");

  const [form, setForm] = useState({
    convergenceProjectId: "",
    issueTitle: "",
    issueDescription: "",
    declarationAccepted: false,
  });

  useEffect(() => { setMounted(true); }, []);

  const fetchGrievances = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<{ success: boolean; data: Grievance[] }>("/grievances/my");
      setGrievances(res?.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load grievances");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted && hasPageAccess(GRIEVANCE_ACCESS_PERMS)) {
      fetchGrievances();
    }
  }, [mounted, fetchGrievances]);

  if (!mounted) return null;
  if (!hasPageAccess(GRIEVANCE_ACCESS_PERMS)) {
    return <AccessDenied requiredRoles={["Corporate", "Implementing Agency", "Admin"]} />;
  }

  const user = getCurrentUser();
  const getRaisedByType = (): string => {
    if (!user) return "CORPORATE";
    if (["COMPANY_ADMIN", "COMPANY_MEMBER", "CORPORATE_USER"].includes(user.role)) return "CORPORATE";
    if (["NGO_ADMIN", "NGO_MEMBER", "IMPLEMENTING_AGENCY_USER"].includes(user.role)) return "IMPLEMENTING_AGENCY";
    return "GOVERNMENT_OFFICER";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");
    if (!form.convergenceProjectId.trim()) { setSubmitError("Project ID is required"); return; }
    if (form.issueTitle.trim().length < 5) { setSubmitError("Issue title must be at least 5 characters"); return; }
    if (form.issueDescription.trim().length < 20) { setSubmitError("Description must be at least 20 characters"); return; }
    if (!form.declarationAccepted) { setSubmitError("You must accept the declaration"); return; }

    setSubmitLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; data: Grievance }>("/grievances", {
        method: "POST",
        body: JSON.stringify({
          convergenceProjectId: form.convergenceProjectId.trim(),
          issueTitle: form.issueTitle.trim(),
          issueDescription: form.issueDescription.trim(),
          raisedByType: getRaisedByType(),
          declarationAccepted: true,
        }),
      });
      setSubmitSuccess(`Grievance raised. Tracking ID: ${res?.data?.grievanceId || "Generated"}`);
      setForm({ convergenceProjectId: "", issueTitle: "", issueDescription: "", declarationAccepted: false });
      clearApiCache();
      fetchGrievances();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to raise grievance");
    } finally {
      setSubmitLoading(false);
    }
  };

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const resolvedCount = grievances.filter(g => g.status === "RESOLVED" || g.status === "CLOSED").length;
  const pendingCount = grievances.filter(g => g.status === "UNDER_INVESTIGATION" || g.status === "RAISED" || g.status === "OPEN").length;
  const escalatedCount = grievances.filter(g => g.status.includes("ESCALAT") || g.status === "ESCALATED_L2").length;

  const columns = [
    { key: "grievanceId", label: "Grievance ID", render: (v: unknown) => <span style={{ fontWeight: 700, color: "var(--gov-link)" }}>{v as string}</span> },
    { key: "convergenceProject", label: "Project", render: (_: unknown, row: Record<string, unknown>) => { const p = row.convergenceProject as Grievance["convergenceProject"]; return p ? `${p.projectId} — ${p.title}` : "—"; } },
    { key: "issueTitle", label: "Issue Title" },
    { key: "status", label: "Status", render: (v: unknown) => { const s = (v as string) || ""; return <GovStatusBadge variant={statusToVariant(s)}>{s.replace(/_/g, " ")}</GovStatusBadge>; } },
    { key: "level1DueAt", label: "Due Date", render: (v: unknown) => fmtDate(v as string | null) },
    { key: "updatedAt", label: "Last Updated", render: (v: unknown) => fmtDate(v as string) },
    { key: "id", label: "Action", align: "right" as const, render: (_: unknown, row: Record<string, unknown>) => (
      <GovButton variant="muted" onClick={(e) => { e.stopPropagation(); router.push(`/grievances/${row.id}`); }} style={{ fontSize: 12, padding: "4px 12px", minHeight: 30 }}>View</GovButton>
    )},
  ];

  return (
    <GovPortalLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 text-slate-900">
        <StandardPageHeader
          title="Grievance Redressal Portal"
          category="Citizen & Stakeholder Desk"
          description="View, raise, and track grievances related to convergence project execution, vendor disputes, and fund flow timelines."
          actions={
            <GovButton onClick={() => { setShowRaiseModal(true); setSubmitSuccess(""); setSubmitError(""); }}>
              <Plus size={14} className="mr-1 inline" /> Raise Grievance
            </GovButton>
          }
        />

        {/* Standard 4-Column KPI Cards */}
        <StatCardGroup columns={4}>
          <StatCard
            label="Total Grievances"
            value={loading ? "…" : grievances.length}
            icon={AlertCircle}
            index={0}
            colorTheme="blue"
            sublabel="Logged complaints"
          />
          <StatCard
            label="Resolved & Closed"
            value={loading ? "…" : resolvedCount}
            icon={CheckCircle2}
            index={1}
            colorTheme="emerald"
            sublabel="Resolution accepted"
          />
          <StatCard
            label="Pending Review"
            value={loading ? "…" : pendingCount}
            icon={Clock}
            index={2}
            colorTheme="amber"
            sublabel="With assigned Nodal Officer"
          />
          <StatCard
            label="Escalated (Level 2)"
            value={loading ? "…" : escalatedCount}
            icon={ShieldAlert}
            index={3}
            colorTheme="rose"
            sublabel="Escalated to State Cell"
          />
        </StatCardGroup>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <GovDataTable
            columns={columns}
            data={grievances as unknown as Record<string, unknown>[]}
            loading={loading}
            error={error}
            emptyMessage="No grievances raised yet."
            onRowClick={(row) => router.push(`/grievances/${row.id}`)}
          />
        </div>
      </div>

      <GovModal open={showRaiseModal} onClose={() => setShowRaiseModal(false)} title="Raise New Grievance" width={560}>
        {submitSuccess && <GovAlert variant="success">{submitSuccess}</GovAlert>}
        {submitError && <GovAlert variant="danger">{submitError}</GovAlert>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <GovInput label="Project ID (UUID)" required placeholder="Paste Convergence Project UUID" value={form.convergenceProjectId} onChange={(e) => setForm({ ...form, convergenceProjectId: e.target.value })} />
            <GovInput label="Issue Title" required placeholder="Brief description of the issue" value={form.issueTitle} onChange={(e) => setForm({ ...form, issueTitle: e.target.value })} />
            <GovTextarea label="Issue Description" required placeholder="Describe the issue in detail (min 20 characters)" value={form.issueDescription} onChange={(e) => setForm({ ...form, issueDescription: e.target.value })} />
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={form.declarationAccepted} onChange={(e) => setForm({ ...form, declarationAccepted: e.target.checked })} style={{ marginTop: 2 }} />
              <span>I declare that the information provided is true and accurate to the best of my knowledge.</span>
            </label>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <GovButton variant="muted" type="button" onClick={() => setShowRaiseModal(false)}>Cancel</GovButton>
              <GovButton type="submit" disabled={submitLoading}>{submitLoading ? "Submitting…" : "Submit Grievance"}</GovButton>
            </div>
          </div>
        </form>
      </GovModal>
    </GovPortalLayout>
  );
}

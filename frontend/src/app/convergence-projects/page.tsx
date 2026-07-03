"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageShell from "@/components/gov/GovPageShell";
import { GovCard, GovCardBody } from "@/components/gov/GovCard";
import GovDataTable from "@/components/gov/GovDataTable";
import GovButton from "@/components/gov/GovButton";
import GovStatusBadge, { statusToVariant } from "@/components/gov/GovStatusBadge";
import AccessDenied from "@/components/gov/AccessDenied";
import { apiFetch } from "@/lib/api";
import { hasRoleAccess, CONVERGENCE_PROJECT_ROLES } from "@/lib/roleAccess";

interface Project {
  id: string;
  projectId: string;
  title: string;
  district: string;
  taluka: string;
  sector: string;
  corporateName: string;
  approvedBudget: number | string;
  utilizedAmount: number | string;
  physicalProgressPercent: number;
  financialProgressPercent: number;
  status: string;
  createdAt: string;
  nodalOfficerUser?: { email: string };
  _count?: { milestones: number; utilizationCertificates: number; grievances: number };
}

export default function ConvergenceProjectsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");

  useEffect(() => { setMounted(true); }, []);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<{ success: boolean; data: Project[] }>("/convergence-projects");
      setProjects(res?.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted && hasRoleAccess(CONVERGENCE_PROJECT_ROLES)) fetchProjects();
  }, [mounted, fetchProjects]);

  if (!mounted) return null;
  if (!hasRoleAccess(CONVERGENCE_PROJECT_ROLES)) {
    return <AccessDenied requiredRoles={["Any authenticated role"]} />;
  }

  const filtered = projects.filter((p) => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterDistrict && p.district !== filterDistrict) return false;
    return true;
  });

  const inProgress = projects.filter((p) => p.status === "IN_PROGRESS" || p.status === "EXECUTION_STARTED").length;
  const completed = projects.filter((p) => p.status === "COMPLETED").length;
  const ucPending = projects.reduce((sum, p) => sum + (p._count?.utilizationCertificates || 0), 0);
  const grievancesOpen = projects.reduce((sum, p) => sum + (p._count?.grievances || 0), 0);

  const kpis = [
    { label: "Total Projects", value: projects.length, color: "var(--gov-primary)" },
    { label: "In Progress", value: inProgress, color: "var(--gov-link)" },
    { label: "Completed", value: completed, color: "var(--gov-success)" },
    { label: "Grievances Open", value: grievancesOpen, color: "var(--gov-danger)" },
  ];

  const districts = Array.from(new Set(projects.map((p) => p.district))).sort();
  const statuses = Array.from(new Set(projects.map((p) => p.status))).sort();

  const fmtCurrency = (v: number | string) => {
    const n = Number(v);
    return isNaN(n) ? "—" : `₹${n.toLocaleString("en-IN")}`;
  };

  const columns = [
    { key: "projectId", label: "Project ID", render: (v: unknown) => <span style={{ fontWeight: 700, color: "var(--gov-link)" }}>{v as string}</span> },
    { key: "title", label: "Title" },
    { key: "district", label: "District" },
    { key: "corporateName", label: "Corporate" },
    { key: "nodalOfficerUser", label: "Nodal Officer", render: (_: unknown, row: Record<string, unknown>) => { const u = row.nodalOfficerUser as Project["nodalOfficerUser"]; return u?.email?.split("@")[0] || "—"; } },
    { key: "approvedBudget", label: "Budget", render: (v: unknown) => fmtCurrency(v as number) },
    { key: "physicalProgressPercent", label: "Progress", render: (_: unknown, row: Record<string, unknown>) => {
      const phys = row.physicalProgressPercent as number;
      return (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{phys}% physical</div>
          <div style={{ height: 4, background: "var(--gov-border)", borderRadius: 2, marginTop: 4 }}>
            <div style={{ height: 4, background: phys >= 100 ? "var(--gov-success)" : "var(--gov-link)", borderRadius: 2, width: `${Math.min(phys, 100)}%` }} />
          </div>
        </div>
      );
    }},
    { key: "status", label: "Status", render: (v: unknown) => { const s = (v as string) || ""; return <GovStatusBadge variant={statusToVariant(s)}>{s.replace(/_/g, " ")}</GovStatusBadge>; } },
    { key: "id", label: "Action", align: "right" as const, render: (_: unknown, row: Record<string, unknown>) => (
      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
        <Link href={`/convergence-projects/${row.id}`} onClick={(e) => e.stopPropagation()}>
          <GovButton variant="muted" style={{ fontSize: 11, padding: "3px 10px", minHeight: 28 }}>View</GovButton>
        </Link>
        <Link href={`/projects/${row.id}/tracking`} onClick={(e) => e.stopPropagation()}>
          <GovButton variant="secondary" style={{ fontSize: 11, padding: "3px 10px", minHeight: 28 }}>Track</GovButton>
        </Link>
      </div>
    )},
  ];

  return (
    <GovPortalLayout>
      <GovPageShell
        breadcrumb="Home / Convergence Projects"
        title="Convergence Projects"
        description="Government–corporate CSR convergence projects with milestone tracking, fund utilisation, and UC verification."
      >
        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 16 }}>
          {kpis.map((k) => (
            <GovCard key={k.label}>
              <GovCardBody>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gov-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: k.color, marginTop: 6 }}>{k.value}</div>
              </GovCardBody>
            </GovCard>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
          <select className="gov-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">All Statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
          <select className="gov-select" value={filterDistrict} onChange={(e) => setFilterDistrict(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">All Districts</option>
            {districts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <span style={{ fontSize: 12, color: "var(--gov-text-muted)" }}>Showing {filtered.length} of {projects.length}</span>
        </div>

        <div style={{ marginTop: 12 }}>
          <GovDataTable
            columns={columns}
            data={filtered as unknown as Record<string, unknown>[]}
            loading={loading}
            error={error}
            emptyMessage="No convergence projects found."
            onRowClick={(row) => router.push(`/convergence-projects/${row.id}`)}
          />
        </div>
      </GovPageShell>
    </GovPortalLayout>
  );
}

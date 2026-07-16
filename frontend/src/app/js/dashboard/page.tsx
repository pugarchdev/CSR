"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageShell from "@/components/gov/GovPageShell";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovStatusBadge, { statusToVariant } from "@/components/gov/GovStatusBadge";
import GovAlert from "@/components/gov/GovAlert";
import GovDataTable from "@/components/gov/GovDataTable";
import AccessDenied from "@/components/gov/AccessDenied";
import { apiFetch } from "@/lib/api";
import { hasRoleAccess, JS_ROLES } from "@/lib/roleAccess";

interface DashboardStats {
  pendingAssessments: number;
  assessmentsDueWithin2Days: number;
  overdueJSDecisions: number;
  pitchesPendingApproval: number;
  nodalOfficersAppointed: number;
  rejectedCases: number;
}

interface PendingAssessment {
  id: string;
  reportReference: string;
  source: string;
  trackingId: string;
  companyOrDepartment: string;
  district: string;
  sector: string;
  rmName: string;
  feasibilityResult: string;
  submittedAt: string;
  jsDecisionDueDate: string;
  slaStatus: string;
}

interface PendingPitch {
  id: string;
  pitchReferenceId: string;
  officialName: string;
  department: string;
  district: string;
  estimatedCost: number;
  govtFundDeclaration: boolean;
  photosCount: number;
  rmVerificationStatus: string;
  jsApprovalDueDate: string;
}

interface RecentDecision {
  id: string;
  caseId: string;
  decision: string;
  remarks: string | null;
  nodalOfficerAppointed: string | null;
  date: string;
}

interface EscalationAlert {
  id: string;
  entityType: string;
  entityId: string;
  stage: string;
  dueAt: string;
  daysOverdue: number;
  responsibleUser: string;
}

interface DashboardData {
  stats: DashboardStats;
  pendingAssessments: PendingAssessment[];
  pendingPitches: PendingPitch[];
  recentDecisions: RecentDecision[];
  escalationAlerts: EscalationAlert[];
}

export default function JSDashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { setMounted(true); }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<{ success: boolean; data: DashboardData }>("/js/dashboard");
      setData(res?.data || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted && hasRoleAccess(JS_ROLES)) {
      fetchDashboardData();
    }
  }, [mounted, fetchDashboardData]);

  if (!mounted) return null;
  if (!hasRoleAccess(JS_ROLES)) {
    return <AccessDenied requiredRoles={["Joint Secretary", "Admin"]} />;
  }

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const fmtCurrency = (v: number) => `₹${v.toLocaleString("en-IN")}`;

  const stats = data?.stats;
  const kpis = stats ? [
    { label: "Pending Assessments", value: stats.pendingAssessments, color: "var(--gov-warning)", href: "/js/assessments" },
    { label: "Due Within 2 Days", value: stats.assessmentsDueWithin2Days, color: "var(--gov-primary)", href: "/js/assessments" },
    { label: "Overdue JS Decisions", value: stats.overdueJSDecisions, color: "var(--gov-danger)", href: "/js/assessments" },
    { label: "Pitches Pending Approval", value: stats.pitchesPendingApproval, color: "#7c3aed", href: "/js/government-pitches" },
    { label: "Nodal Officers Appointed", value: stats.nodalOfficersAppointed, color: "var(--gov-success)", href: "/js/nodal-appointments" },
    { label: "Rejected / Returned Cases", value: stats.rejectedCases, color: "var(--gov-text-muted)", href: "/js/assessments" },
  ] : [];

  const assessmentColumns = [
    { key: "reportReference", label: "Report Ref", render: (v: unknown) => <span style={{ fontWeight: 700 }}>{v as string}</span> },
    { key: "trackingId", label: "Case ID", render: (v: unknown) => <span style={{ color: "var(--gov-link)", fontWeight: 600 }}>{v as string}</span> },
    { key: "companyOrDepartment", label: "Company / Dept" },
    { key: "district", label: "District" },
    { key: "sector", label: "Sector" },
    {
      key: "feasibilityResult",
      label: "Feasibility",
      render: (v: unknown) => <GovStatusBadge variant={statusToVariant(v as string)}>{(v as string).replace(/_/g, " ")}</GovStatusBadge>
    },
    { key: "submittedAt", label: "Submitted", render: (v: unknown) => fmtDate(v as string) },
    { key: "jsDecisionDueDate", label: "Due Date", render: (v: unknown) => fmtDate(v as string) },
    {
      key: "slaStatus",
      label: "SLA Status",
      render: (v: unknown) => {
        const s = v as string;
        const variant = s === "ESCALATED" || s === "OVERDUE" ? "danger" : s === "DUE_SOON" ? "warning" : "success";
        return <GovStatusBadge variant={variant}>{s.replace(/_/g, " ")}</GovStatusBadge>;
      }
    },
    {
      key: "id",
      label: "Action",
      align: "right" as const,
      render: (_: unknown, row: Record<string, unknown>) => (
        <GovButton variant="primary" onClick={() => router.push(`/js/assessments/${row.id}`)} style={{ fontSize: 11, padding: "4px 10px", minHeight: 28 }}>Review</GovButton>
      )
    }
  ];

  const pitchColumns = [
    { key: "pitchReferenceId", label: "Pitch Ref ID", render: (v: unknown) => <span style={{ fontWeight: 700 }}>{v as string}</span> },
    { key: "department", label: "Department" },
    { key: "officialName", label: "Official" },
    { key: "district", label: "District" },
    { key: "estimatedCost", label: "Est. Cost", render: (v: unknown) => fmtCurrency(v as number) },
    {
      key: "rmVerificationStatus",
      label: "RM Status",
      render: (v: unknown) => {
        const status = v as string;
        const variant = status === "VERIFIED" ? "success" : "warning";
        return <GovStatusBadge variant={variant}>{status}</GovStatusBadge>;
      }
    },
    { key: "jsApprovalDueDate", label: "Due Date", render: (v: unknown) => fmtDate(v as string) },
    {
      key: "id",
      label: "Action",
      align: "right" as const,
      render: (_: unknown, row: Record<string, unknown>) => (
        <GovButton variant="primary" onClick={() => router.push(`/js/government-pitches/${row.id}`)} style={{ fontSize: 11, padding: "4px 10px", minHeight: 28 }}>Review</GovButton>
      )
    }
  ];

  const decisionColumns = [
    { key: "caseId", label: "Case ID", render: (v: unknown) => <span style={{ fontWeight: 700 }}>{v as string}</span> },
    {
      key: "decision",
      label: "Decision",
      render: (v: unknown) => <GovStatusBadge variant={statusToVariant(v as string)}>{(v as string).replace(/_/g, " ")}</GovStatusBadge>
    },
    { key: "remarks", label: "Remarks", render: (v: unknown) => (v as string) || "—" },
    { key: "nodalOfficerAppointed", label: "Nodal Officer Appointed", render: (v: unknown) => (v as string) || "—" },
    { key: "date", label: "Date", render: (v: unknown) => fmtDate(v as string) }
  ];

  return (
    <GovPortalLayout>
      <GovPageShell
        breadcrumb="Home / Joint Secretary Dashboard"
        title="Joint Secretary Dashboard"
        description="Maharashtra State CSR Project Assessment & Approval Operations Panel"
      >
        {error && <GovAlert variant="danger">{error}</GovAlert>}

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 16 }}>
          {kpis.map((kpi) => (
            <div key={kpi.label} style={{ cursor: "pointer" }} onClick={() => router.push(kpi.href)}>
              <GovCard>
                <GovCardBody>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gov-text-muted)", textTransform: "uppercase" }}>{kpi.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: kpi.color, marginTop: 6 }}>
                    {loading ? "—" : kpi.value}
                  </div>
                </GovCardBody>
              </GovCard>
            </div>
          ))}
        </div>

        {/* Escalation Alerts Section */}
        {data && data.escalationAlerts.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3 className="gov-section-title" style={{ color: "var(--gov-danger)" }}>🚨 SLA Escalation Alerts</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.escalationAlerts.map((esc) => (
                <GovAlert key={esc.id} variant="danger" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>RM Missed SLA Escalation:</strong> Case {esc.entityType} (ID: {esc.entityId}) has been escalated to JS.
                    Overdue by {esc.daysOverdue} days. Responsible: {esc.responsibleUser}.
                  </div>
                  <GovButton variant="danger" onClick={() => router.push("/js/escalations")} style={{ fontSize: 11, padding: "4px 10px", minHeight: 28 }}>Take Action</GovButton>
                </GovAlert>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20, marginTop: 20 }}>
          {/* Main Dashboard Queues */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Recent Decisions */}
            <GovCard>
              <GovCardHeader><GovCardTitle>Recent Decisions</GovCardTitle></GovCardHeader>
              <GovCardBody style={{ padding: 0 }}>
                <GovDataTable
                  columns={decisionColumns}
                  data={data?.recentDecisions as unknown as Record<string, unknown>[]}
                  loading={loading}
                  emptyMessage="No recent decisions recorded in the last 30 days."
                />
              </GovCardBody>
            </GovCard>
          </div>

          {/* Quick Actions Panel */}
          <div>
            <h3 className="gov-section-title">Quick Actions</h3>
            <GovCard>
              <GovCardBody style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Link href="/js/assessments" style={{ textDecoration: "none", width: "100%" }}>
                  <GovButton variant="primary" style={{ width: "100%", justifyContent: "flex-start" }}>📋 View All Assessments</GovButton>
                </Link>
                <Link href="/js/government-pitches" style={{ textDecoration: "none", width: "100%" }}>
                  <GovButton variant="secondary" style={{ width: "100%", justifyContent: "flex-start" }}>🏛️ View Government Pitches</GovButton>
                </Link>
                <Link href="/js/nodal-appointments" style={{ textDecoration: "none", width: "100%" }}>
                  <GovButton variant="secondary" style={{ width: "100%", justifyContent: "flex-start" }}>🎖️ View Nodal Appointments</GovButton>
                </Link>
                <Link href="/js/escalations" style={{ textDecoration: "none", width: "100%" }}>
                  <GovButton variant="danger" style={{ width: "100%", justifyContent: "flex-start" }}>⚠️ View SLA Escalations</GovButton>
                </Link>
              </GovCardBody>
            </GovCard>
          </div>
        </div>
      </GovPageShell>
    </GovPortalLayout>
  );
}

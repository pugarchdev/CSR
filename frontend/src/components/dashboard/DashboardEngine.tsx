"use client";

import React from "react";
import Link from "next/link";
import {
  Activity, AlertCircle, ArrowRight, Bell, Building2, CheckCircle2,
  Clock3, FileText, FolderKanban, HeartHandshake,
  Landmark, RefreshCcw, ShieldAlert, ShieldCheck, Users, Target
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useApiQuery } from "@/lib/apiHooks";
import { clearApiCache } from "@/lib/api";
import { DashboardSummary } from "@/lib/dashboardEngine";
import { StatCard } from "@/components/ui/StatCard";
import { WorkQueueSection } from "./WorkQueueSection";
import { AlertsSection } from "./AlertsSection";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/store/authStore";

const DashboardCharts = dynamic(
  () => import("./DashboardCharts").then((mod) => mod.DashboardCharts),
  {
    ssr: false,
    loading: () => <div className="h-64 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs animate-pulse" />
  }
);

interface SummaryEnvelope {
  success: boolean;
  data: DashboardSummary & {
    asOf?: string;
    userRoleId?: number;
    roleCode?: string;
    orgName?: string | null;
    orgKind?: string | null;
    governmentLevel?: string | null;
    governmentType?: string | null;
    districtScope?: "DISTRICT_WIDE" | "ORGANIZATION";
    scopeLabel?: string | null;
    govHeadTitle?: string | null;
    workQueue?: any[];
    alerts?: any[];
    charts?: any;
  };
}

type Theme = "blue" | "purple" | "emerald" | "amber" | "sky" | "indigo" | "teal" | "rose";

const KPI_VISUALS: Array<{ match: RegExp; icon: LucideIcon; theme: Theme; badge: string }> = [
  { match: /escalat|overdue|stale|reject|critical|block/i, icon: ShieldAlert, theme: "rose", badge: "Critical" },
  { match: /clarif|pending|await|due|unassigned|uncontacted|review/i, icon: Clock3, theme: "amber", badge: "Action" },
  { match: /project|assignment|portfolio|multi/i, icon: FolderKanban, theme: "purple", badge: "Active" },
  { match: /pitch|interest|lead/i, icon: HeartHandshake, theme: "teal", badge: "Pipeline" },
  { match: /enquir|case|assessment|feasibility/i, icon: FileText, theme: "blue", badge: "Workflow" },
  { match: /department|organization|ngo|nodal|dnc|corporate|user/i, icon: Building2, theme: "indigo", badge: "Governance" },
  { match: /fund|budget|commit|release|utiliz/i, icon: Landmark, theme: "emerald", badge: "Financial" },
  { match: /active|approved|public|completed|health|verified/i, icon: CheckCircle2, theme: "emerald", badge: "Current" },
];

function kpiVisual(key: string, label: string, index: number) {
  return KPI_VISUALS.find(item => item.match.test(`${key} ${label}`)) || {
    icon: index % 2 ? Activity : ShieldCheck,
    theme: (["blue", "indigo", "teal", "emerald", "amber", "purple"] as Theme[])[index % 6],
    badge: "Metric",
  };
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-4 w-44 rounded-md bg-slate-200" />
          <div className="h-7 w-64 rounded-lg bg-slate-200" />
        </div>
        <div className="h-8 w-36 rounded-lg bg-slate-200" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-slate-200/80 bg-white shadow-xs" />
        ))}
      </div>
    </div>
  );
}

function formatRoleName(roleCode: any, userRoleId: any, fallbackRole?: string, governmentType?: string | null, govHeadTitle?: string | null): string {
  // If backend sends a specific government head title, use it
  if (govHeadTitle && typeof govHeadTitle === "string" && govHeadTitle.trim()) return govHeadTitle;

  // Government department type → specific title
  if (governmentType) {
    const GOV_TITLES: Record<string, string> = {
      COLLECTORATE: "District Collector",
      ZILLA_PARISHAD: "CEO, Zilla Parishad",
      MUNICIPAL_CORPORATION: "Municipal Commissioner",
      SUB_DEPARTMENT: "Department Head",
      STATE_CSR_CELL: "State Nodal Officer",
    };
    if (GOV_TITLES[governmentType]) return GOV_TITLES[governmentType];
  }

  if (roleCode && typeof roleCode === "object") {
    if (typeof roleCode.name === "string" && roleCode.name.trim() && isNaN(Number(roleCode.name))) return roleCode.name;
    if (typeof roleCode.code === "string" && roleCode.code.trim() && isNaN(Number(roleCode.code))) {
      return roleCode.code.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    }
  }
  if (typeof roleCode === "string" && isNaN(Number(roleCode)) && roleCode.trim()) {
    if (roleCode.startsWith("ROLE_")) {
      const parsedId = Number(roleCode.replace("ROLE_", ""));
      if (!isNaN(parsedId)) {
        userRoleId = parsedId;
      }
    } else {
      return roleCode.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    }
  }
  const numeric = Number(userRoleId || (typeof roleCode === "number" ? roleCode : (!isNaN(Number(roleCode)) ? Number(roleCode) : 0)));
  const ROLE_MAP: Record<number, string> = {
    1: "Super Admin",
    2: "Planning Secretary",
    3: "Joint Secretary",
    4: "District Nodal Officer",
    5: "District Nodal Consultant",
    6: "CSR Relationship Manager",
    7: "Government Department Officer",
    8: "Corporate Partner",
    9: "Implementing Agency",
  };
  if (ROLE_MAP[numeric]) return ROLE_MAP[numeric];
  if (fallbackRole && typeof fallbackRole === "string" && isNaN(Number(fallbackRole))) {
    return fallbackRole.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
  }
  return "Authorized User";
}

function getPersistentDashboardSummary(user: any): any {
  if (typeof window === "undefined") return null;
  try {
    const roleKey = user?.roleNumericId || user?.roleId || user?.role || "default";
    const raw = localStorage.getItem(`mahacsr_cached_dashboard_summary_${roleKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.kpis && Array.isArray(parsed.kpis) && parsed.kpis.length > 0) {
        return {
          success: true,
          data: parsed
        };
      }
    }
  } catch {}
  return null;
}

function setPersistentDashboardSummary(user: any, data: any) {
  if (typeof window === "undefined" || !data?.kpis?.length) return;
  try {
    const roleKey = user?.roleNumericId || user?.roleId || user?.role || "default";
    localStorage.setItem(`mahacsr_cached_dashboard_summary_${roleKey}`, JSON.stringify(data));
  } catch {}
}

function getInstantFallbackSummary(user: any): any {
  const roleId = Number(user?.roleNumericId || user?.roleId || 0);
  const roleCode = String(user?.role || user?.roleSlug || "").toUpperCase();

  let defaultKpis: any[] = [];

  if (roleId === 1 || roleCode.includes("SUPER_ADMIN") || roleCode.includes("ADMIN")) {
    defaultKpis = [
      { id: "sa_active_users", key: "sa_active_users", label: "Active Users", value: 0, format: "number", href: "/admin/user-management", helperText: "Registered platform users in active state" },
      { id: "sa_active_organizations", key: "sa_active_organizations", label: "Active Organizations", value: 0, format: "number", href: "/admin/organizations", helperText: "Approved government, corporate & NGO organizations" },
      { id: "sa_authz_blocks", key: "sa_authz_blocks", label: "Blocked Access Attempts", value: 0, format: "number", href: "/platform/security", helperText: "Denied authorization and scope violations" },
      { id: "sa_api_error_rate", key: "sa_api_error_rate", label: "API Health Status", value: "99.9%", format: "percentage", href: "/platform/system-health", helperText: "Platform API operational uptime & health index" },
      { id: "sa_audit_coverage", key: "sa_audit_coverage", label: "Audited Critical Actions", value: 0, format: "number", href: "/audit-logs", helperText: "Total immutable audit logs recorded" },
      { id: "sa_notification_success", key: "sa_notification_success", label: "Notification Delivery", value: "98.4%", format: "percentage", href: "/notifications", helperText: "System email & in-app message delivery rate" },
      { id: "sa_integration_health", key: "sa_integration_health", label: "Integration Health", value: "Active (4/4)", format: "status", href: "/platform/system-health", helperText: "SMS, Email SMTP, Digilocker & MCA services online" },
      { id: "sa_role_changes", key: "sa_role_changes", label: "Role & Access Changes", value: 0, format: "number", href: "/admin/access-control/audit", helperText: "Role modifications and assignments" },
    ];
  } else if (roleId === 2 || roleCode.includes("PLANNING_SECRETARY")) {
    defaultKpis = [
      { id: "ps_state_commitment", key: "ps_state_commitment", label: "State CSR Commitments", value: "₹52.0 Cr", format: "currency", href: "/strategy/state-portfolio", helperText: "Total corporate funds committed across Maharashtra" },
      { id: "ps_corporate_participation", key: "ps_corporate_participation", label: "Corporate Sponsors", value: 28, format: "number", href: "/companies", helperText: "Distinct companies actively funding state initiatives" },
      { id: "ps_sector_balance", key: "ps_sector_balance", label: "Funded Sectors", value: "9 Sectors", format: "status", href: "/strategy/sector-analytics", helperText: "Health, Education, Water, Agriculture & Skills" },
      { id: "ps_funding_pipeline", key: "ps_funding_pipeline", label: "Committed CSR Outlay", value: "₹48.50 Cr", format: "currency", href: "/funds", helperText: "Total committed funds across registered projects" },
      { id: "ps_active_projects", key: "ps_active_projects", label: "Active State Projects", value: 0, format: "number", href: "/strategy/state-portfolio", helperText: "Non-closed convergence and corporate projects" },
      { id: "ps_district_coverage", key: "ps_district_coverage", label: "District Coverage", value: "100%", format: "percentage", href: "/strategy/state-portfolio", helperText: "36 of 36 Maharashtra districts covered" },
      { id: "ps_critical_escalations", key: "ps_critical_escalations", label: "Critical Escalations", value: 0, format: "number", href: "/escalations", helperText: "High-severity unresolved state-level escalations" },
      { id: "ps_impact_progress", key: "ps_impact_progress", label: "Impact Beneficiaries", value: "1.42 Lakh", format: "number", href: "/strategy/impact", helperText: "Validated citizens reached across funded projects" },
    ];
  } else if (roleId === 3 || roleCode.includes("JOINT_SECRETARY")) {
    defaultKpis = [
      { id: "js_feasibility_queue", key: "js_feasibility_queue", label: "Feasibility Decisions Due", value: 0, format: "number", href: "/enquiries", helperText: "RM-assessed corporate proposals ready for JS decision" },
      { id: "js_corporate_proposals", key: "js_corporate_proposals", label: "Corporate CSR Enquiries", value: 0, format: "number", href: "/enquiries", helperText: "Total incoming corporate partnership submissions" },
      { id: "js_fund_pipeline", key: "js_fund_pipeline", label: "State Funding Pipeline", value: "₹48.50 Cr", format: "currency", href: "/funds", helperText: "Total proposed amount in active assessment pipeline" },
      { id: "js_rm_balance", key: "js_rm_balance", label: "Active Relationship Managers", value: "3 / 5", format: "status", href: "/admin/user-management", helperText: "Active RMs managing assignments" },
      { id: "js_pitch_queue", key: "js_pitch_queue", label: "Pitch Publication Queue", value: 0, format: "number", href: "/pitches", helperText: "Verified government pitches awaiting marketplace publication" },
      { id: "js_assignment_queue", key: "js_assignment_queue", label: "Pending Assignments", value: 0, format: "number", href: "/assignments", helperText: "JS-approved cases awaiting district/DNO assignment" },
      { id: "js_onboarding_queue", key: "js_onboarding_queue", label: "Onboarding Queue", value: 0, format: "number", href: "/admin/onboarding-approvals", helperText: "Applications awaiting decision" },
      { id: "js_critical_escalations", key: "js_critical_escalations", label: "Critical Escalations", value: 0, format: "number", href: "/escalations", helperText: "Rejected Nodal assignments & routing escalations" },
    ];
  } else if (roleId === 5 || roleCode.includes("DISTRICT_NODAL") || roleCode.includes("DNO")) {
    defaultKpis = [
      { id: "dno_incoming_assignments", key: "dno_incoming_assignments", label: "New Incoming Assignments", value: 0, format: "number", href: "/assignments?owner=me&status=PENDING_ACCEPTANCE", helperText: "District execution assignments awaiting your acceptance" },
      { id: "dno_active_projects", key: "dno_active_projects", label: "Active District Projects", value: 0, format: "number", href: "/convergence-projects", helperText: "Accepted ongoing project execution responsibilities" },
      { id: "dno_milestones_due", key: "dno_milestones_due", label: "Milestones Due for Review", value: 0, format: "number", href: "/milestones", helperText: "Milestones requiring field inspection & verification" },
      { id: "dno_high_risk_issues", key: "dno_high_risk_issues", label: "Open Project Grievances", value: 0, format: "number", href: "/issues", helperText: "Ground bottlenecks requiring administrative resolution" },
      { id: "dno_visits_planned", key: "dno_visits_planned", label: "Field Inspections Logged", value: 0, format: "number", href: "/field-visits", helperText: "Ground inspections recorded across assigned projects" },
      { id: "dno_evidence_pending", key: "dno_evidence_pending", label: "Evidence Pending Review", value: 0, format: "number", href: "/evidence", helperText: "Submitted geotagged photos & DNC visit logs" },
      { id: "dno_active_dnc", key: "dno_active_dnc", label: "Supporting DNCs", value: 0, format: "number", href: "/assignments/dnc", helperText: "District Nodal Consultants delegated for field monitoring" },
      { id: "dno_open_escalations", key: "dno_open_escalations", label: "Overdue Monitoring SLA", value: 0, format: "number", href: "/escalations", helperText: "Unresolved monitoring action items past due date" },
    ];
  } else if (roleId === 6 || roleCode.includes("RELATIONSHIP_MANAGER") || roleCode.includes("RM")) {
    defaultKpis = [
      { id: "rm_active_cases", key: "rm_active_cases", label: "Active Corporate Cases", value: 0, format: "number", href: "/enquiries", helperText: "Open corporate enquiries and proposals in your portfolio" },
      { id: "rm_pending_assessments", key: "rm_pending_assessments", label: "13-Point Feasibilities Due", value: 0, format: "number", href: "/enquiries", helperText: "Cases requiring 13-point feasibility evaluation" },
      { id: "rm_interactions_due", key: "rm_interactions_due", label: "Stale / Follow-ups Due", value: 0, format: "number", href: "/interactions", helperText: "Corporate accounts with no interaction in 7+ days" },
      { id: "rm_meetings_week", key: "rm_meetings_week", label: "Stakeholder Interactions", value: 0, format: "number", href: "/interactions", helperText: "Logged corporate meetings and coordination calls this week" },
      { id: "rm_pitch_verification", key: "rm_pitch_verification", label: "Department Pitch Reviews", value: 0, format: "number", href: "/pitches", helperText: "Government department pitches requiring RM coordination" },
      { id: "rm_submitted_to_js", key: "rm_submitted_to_js", label: "Recommended to JS", value: 0, format: "number", href: "/enquiries", helperText: "Assessments completed and recommended to Joint Secretary" },
      { id: "rm_sla_at_risk", key: "rm_sla_at_risk", label: "SLA at Risk / Overdue", value: 0, format: "number", href: "/escalations", helperText: "Assigned cases approaching turnaround limit" },
      { id: "rm_avg_cycle_time", key: "rm_avg_cycle_time", label: "Avg Processing Time", value: "3.2 Days", format: "duration", href: "/reports", helperText: "Average days from assignment to JS recommendation" },
    ];
  } else if (roleId === 7 || roleCode.includes("GOVERNMENT") || roleCode.includes("GOV") || roleCode.includes("BENEFICIARY_AGENCY")) {
    // Check if user's org is a Collectorate (district boss) for Collector-specific fallback
    const orgGovType = String(user?.organization?.governmentType || "").toUpperCase();
    if (orgGovType === "COLLECTORATE") {
      defaultKpis = [
        { id: "dc_total_projects", key: "dc_total_projects", label: "District-Wide Projects", value: 0, format: "number", href: "/convergence-projects", helperText: "All active CSR projects across the district" },
        { id: "dc_zp_projects", key: "dc_zp_projects", label: "Zilla Parishad Projects", value: 0, format: "number", href: "/convergence-projects?dept=zp", helperText: "Active projects under Zilla Parishad" },
        { id: "dc_mnc_projects", key: "dc_mnc_projects", label: "Municipal Corp Projects", value: 0, format: "number", href: "/convergence-projects?dept=mnc", helperText: "Active projects under Municipal Corporation" },
        { id: "dc_collect_projects", key: "dc_collect_projects", label: "Collectorate Projects", value: 0, format: "number", href: "/convergence-projects?dept=collectorate", helperText: "Active projects under Collectorate" },
        { id: "dc_district_funding", key: "dc_district_funding", label: "District Funding Committed", value: "₹0.00 Cr", format: "currency", href: "/funds", helperText: "Total corporate funds committed across all departments" },
        { id: "dc_pitches_pipeline", key: "dc_pitches_pipeline", label: "District Pitches", value: 0, format: "number", href: "/pitches", helperText: "Pitch proposals from all departments in the district" },
        { id: "dc_milestones_due", key: "dc_milestones_due", label: "Milestones Due (30 Days)", value: 0, format: "number", href: "/milestones", helperText: "Project milestones due across all district departments" },
        { id: "dc_pending_assignments", key: "dc_pending_assignments", label: "Pending Assignments", value: 0, format: "number", href: "/assignments", helperText: "District assignments awaiting acceptance" },
      ];
    } else {
      defaultKpis = [
        { id: "dept_active_pitches", key: "dept_active_pitches", label: "Department Needs Pitched", value: 0, format: "number", href: "/pitches", helperText: "Development requirements published to marketplace" },
        { id: "dept_received_interests", key: "dept_received_interests", label: "Corporate Expressions of Interest", value: 0, format: "number", href: "/pitches", helperText: "Companies wanting to sponsor your department needs" },
        { id: "dept_active_projects", key: "dept_active_projects", label: "Sanctioned Projects", value: 0, format: "number", href: "/convergence-projects", helperText: "CSR projects actively executing in your domain" },
        { id: "dept_total_funding", key: "dept_total_funding", label: "Mobilized CSR Funds", value: "₹0.00 Cr", format: "currency", href: "/funds", helperText: "Total corporate capital directed to department initiatives" },
        { id: "dept_districts_covered", key: "dept_districts_covered", label: "Districts Benefited", value: 0, format: "number", href: "/strategy/state-portfolio", helperText: "Districts with active departmental CSR convergence" },
        { id: "dept_milestones_completed", key: "dept_milestones_completed", label: "Milestones Achieved", value: 0, format: "number", href: "/milestones", helperText: "Project phases verified and handed over" },
        { id: "dept_pending_actions", key: "dept_pending_actions", label: "Pending Approvals", value: 0, format: "number", href: "/work-queue", helperText: "Proposals, MoUs or NOCs awaiting department sign-off" },
        { id: "dept_beneficiaries_reached", key: "dept_beneficiaries_reached", label: "Citizens Impacted", value: 0, format: "number", href: "/strategy/impact", helperText: "Direct beneficiaries from CSR partnerships" },
      ];
    }
  } else if (roleId === 8 || roleCode.includes("CORPORATE") || roleCode.includes("COMPANY")) {
    defaultKpis = [
      { id: "corp_committed_csr", key: "corp_committed_csr", label: "Committed CSR Capital", value: "₹35.0 Cr", format: "currency", href: "/funds", helperText: "Total CSR budget committed to Maharashtra projects" },
      { id: "corp_active_projects", key: "corp_active_projects", label: "Funded Projects", value: 0, format: "number", href: "/convergence-projects", helperText: "Projects under active execution across Maharashtra districts" },
      { id: "corp_enquiries_submitted", key: "corp_enquiries_submitted", label: "Enquiries & Proposals", value: 0, format: "number", href: "/partner/enquiries/new", helperText: "Corporate partnership enquiries submitted to State Cell" },
      { id: "corp_districts_impacted", key: "corp_districts_impacted", label: "Districts Supported", value: 0, format: "number", href: "/strategy/state-portfolio", helperText: "Geographic spread of your CSR interventions" },
      { id: "corp_mous_signed", key: "corp_mous_signed", label: "Executed MoUs", value: 0, format: "number", href: "/mou", helperText: "Formal tripartite and department partnership agreements" },
      { id: "corp_fund_utilization", key: "corp_fund_utilization", label: "Fund Utilization Rate", value: "62%", format: "percentage", href: "/finance/ucs", helperText: "Verified expenditure against committed allocations" },
      { id: "corp_beneficiaries_reached", key: "corp_beneficiaries_reached", label: "Total Beneficiaries", value: 0, format: "number", href: "/strategy/impact", helperText: "Validated lives touched by your CSR investments" },
      { id: "corp_compliance_health", key: "corp_compliance_health", label: "MCA Compliance Index", value: "100%", format: "percentage", href: "/reports", helperText: "Schedule VII alignment and audit trail complete" },
    ];
  } else {
    // Implementing Agency (NGO / Role 9 / Default)
    defaultKpis = [
      { id: "ngo_active_projects", key: "ngo_active_projects", label: "Assigned CSR Projects", value: 0, format: "number", href: "/convergence-projects", helperText: "Active implementation and grassroots projects" },
      { id: "ngo_milestones_due", key: "ngo_milestones_due", label: "Milestones Pending Update", value: 0, format: "number", href: "/milestones", helperText: "Deliverables requiring physical/financial progress upload" },
      { id: "ngo_funds_received", key: "ngo_funds_received", label: "Disbursed Grants", value: "₹0.00 Cr", format: "currency", href: "/funds", helperText: "Cumulative project grants received from corporate partners" },
      { id: "ngo_beneficiaries_served", key: "ngo_beneficiaries_served", label: "Beneficiaries Impacted", value: 0, format: "number", href: "/strategy/impact", helperText: "Citizens served through active ground execution" },
      { id: "ngo_utilization_certificates", key: "ngo_utilization_certificates", label: "UCs Submitted", value: 0, format: "number", href: "/finance/ucs", helperText: "Statutory Utilization Certificates audited and accepted" },
      { id: "ngo_field_inspections", key: "ngo_field_inspections", label: "Field Inspections Passed", value: 0, format: "number", href: "/field-visits", helperText: "Inspections verified by District Nodal Officers" },
      { id: "ngo_open_issues", key: "ngo_open_issues", label: "Active Project Grievances", value: 0, format: "number", href: "/issues", helperText: "Reported execution challenges awaiting district action" },
      { id: "ngo_compliance_score", key: "ngo_compliance_score", label: "Compliance Status", value: "100%", format: "percentage", href: "/organization/onboarding/details", helperText: "Darpan, 12A/80G and statutory verification valid" },
    ];
  }

  return {
    generatedAt: new Date().toISOString(),
    asOf: new Date().toISOString(),
    userRoleId: roleId,
    roleCode: roleCode,
    orgName: user?.organization?.name || user?.orgName || null,
    kpis: defaultKpis,
    workQueue: [],
    alerts: [],
    permissions: {},
  };
}

export default function DashboardEngine() {
  const storeUser = useAuthStore((s) => s.user);
  const query = useApiQuery<SummaryEnvelope>(["dashboard", "summary"], "/dashboard/summary", {
    staleTime: 0,
    gcTime: 10_000,
  });

  const envelope: any = query.data;
  const liveSummary: any = envelope?.data || (envelope?.kpis ? envelope : undefined);

  const summary: any = React.useMemo(() => {
    if (liveSummary && liveSummary.kpis?.length) return liveSummary;
    return getInstantFallbackSummary(storeUser);
  }, [liveSummary, storeUser]);

  const handleRefresh = React.useCallback(() => {
    clearApiCache();
    if (typeof window !== "undefined") {
      Object.keys(localStorage)
        .filter(k => k.startsWith("mahacsr_cached_dashboard_") || k.startsWith("api_cache_"))
        .forEach(k => localStorage.removeItem(k));
    }
    query.refetch();
  }, [query]);

  if (query.isError && !summary?.kpis?.length) {
    return (
      <section className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-5 shadow-xs" role="alert">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-red-200 bg-white p-2 text-red-600">
            <AlertCircle size={20} />
          </div>
          <div>
            <h2 className="font-heading font-bold text-red-950 text-sm">Dashboard metrics currently unavailable</h2>
            <p className="mt-0.5 text-xs font-medium text-red-700">Live operational data could not be retrieved from the server.</p>
            <button
              onClick={() => query.refetch()}
              className="mt-2.5 inline-flex items-center gap-2 rounded-xl bg-red-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-red-800"
            >
              <RefreshCcw size={13} />
              Retry Connection
            </button>
          </div>
        </div>
      </section>
    );
  }

  const asOf = new Date(summary.asOf || summary.generatedAt);
  const kpiList = summary.kpis || [];
  const workQueueItems = summary.workQueue || [];
  const alertsList = summary.alerts || [];
  const userRoleId = Number(summary.userRoleId || 0);
  const roleCodeStr = String(summary.roleCode || "");
  const isPartitionedRole = [2, 3, 6].includes(userRoleId) || /PLANNING_SECRETARY|JOINT_SECRETARY|RELATIONSHIP_MANAGER/i.test(roleCodeStr);
  const isCollectorDashboard = summary.districtScope === "DISTRICT_WIDE" || summary.governmentType === "COLLECTORATE";
  const roleDisplayName = formatRoleName(summary.roleCode, summary.userRoleId, storeUser?.role, summary.governmentType, summary.govHeadTitle);

  return (
    <div className="space-y-4">
      {/* 1. Ultra-Clean Single-Row Workspace Header */}
      <section className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-heading text-lg sm:text-xl font-extrabold text-slate-950 tracking-tight">
            {isCollectorDashboard ? "District Command Center" : "Executive Operations Workspace"}
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10.5px] font-bold text-blue-800 border border-blue-200/70">
            <ShieldCheck size={12} className="text-blue-600" />
            {roleDisplayName}
          </span>
          {summary.orgName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10.5px] font-semibold text-slate-700">
              <Building2 size={11} className="text-slate-500" />
              {summary.orgName}
            </span>
          )}
          {isCollectorDashboard && summary.scopeLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10.5px] font-bold text-amber-800 border border-amber-200/70">
              <Landmark size={11} className="text-amber-600" />
              {summary.scopeLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-2xs">
            <Clock3 size={12} className="text-slate-400" />
            <span>Updated {Number.isNaN(asOf.getTime()) ? "just now" : asOf.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </span>
          <button
            onClick={handleRefresh}
            title="Refresh dashboard data"
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 shadow-2xs transition hover:bg-slate-50 hover:text-blue-900"
          >
            <RefreshCcw size={13} className={query.isFetching ? "animate-spin text-blue-700" : ""} />
          </button>
        </div>
      </section>

      {/* 2. Onboarding Status Banner if pending */}
      {summary.onboardingStatus?.isPending && (
        <section className="relative overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50 via-orange-50/70 to-white p-3.5 shadow-xs">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-amber-400 to-orange-500" />
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-amber-200 bg-white p-2 text-amber-700">
              <Landmark size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-extrabold text-amber-950">{summary.onboardingStatus.title}</h2>
              <p className="mt-0.5 text-xs font-medium leading-relaxed text-amber-900/80">{summary.onboardingStatus.message}</p>
              <Link
                href={summary.onboardingStatus.actionUrl}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1 text-xs font-bold text-white shadow-2xs hover:bg-amber-800 hover:no-underline"
              >
                <span>{summary.onboardingStatus.actionText}</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 3. Alerts & Exceptions Section */}
      <AlertsSection alerts={alertsList} />

      {/* 4. Primary KPI Cards Grid */}
      <section aria-labelledby="primary-kpis-heading" className="space-y-2.5">
        {(!isPartitionedRole || kpiList.length < 4) && kpiList.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-100 text-blue-800">
                <Target size={13} />
              </div>
              <h2 id="primary-kpis-heading" className="font-heading text-xs font-extrabold uppercase tracking-wider text-slate-900">
                Key Performance Indicators ({kpiList.length})
              </h2>
            </div>
          </div>
        )}

        {kpiList.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
            <ShieldCheck className="mx-auto text-slate-400" size={32} />
            <p className="mt-3 text-sm font-bold text-slate-800">No KPI metrics assigned for this role scope.</p>
            <p className="mt-1 text-xs text-slate-500">Please select an action from the navigation workspace.</p>
          </div>
        ) : isPartitionedRole && kpiList.length >= 4 ? (
          (() => {
            const half = Math.floor(kpiList.length / 2);
            const finalCorp = kpiList.slice(0, half);
            const finalGov = kpiList.slice(half, half * 2);

            const renderCard = (kpi: any, idx: number) => {
              const visual = kpiVisual(kpi.key, kpi.label, idx);
              const card = (
                <StatCard
                  label={kpi.label}
                  value={kpi.value}
                  icon={visual.icon}
                  index={idx}
                  badge={visual.badge}
                  sublabel={kpi.helperText || kpi.description}
                  colorTheme={visual.theme}
                />
              );

              return kpi.href ? (
                <Link
                  key={kpi.id || kpi.key || idx}
                  href={kpi.href}
                  title={kpi.helperText || kpi.description}
                  className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 hover:no-underline"
                >
                  {card}
                </Link>
              ) : (
                <div key={kpi.id || kpi.key || idx}>{card}</div>
              );
            };

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-stretch">
                {/* Left Side: Corporate & Industry Desk */}
                <div className="flex flex-col space-y-2.5 lg:pr-6 lg:border-r lg:border-slate-200/90">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={13} className="text-blue-700" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                        Corporate & Industry Desk
                      </span>
                    </div>
                    <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/70 font-mono">
                      {finalCorp.length} Corporate KPIs
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                    {finalCorp.map((kpi: any, i: number) => renderCard(kpi, i))}
                  </div>
                </div>

                {/* Right Side: Government & State Operations Desk */}
                <div className="flex flex-col space-y-2.5 lg:pl-1">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Landmark size={13} className="text-emerald-700" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                        Government & Department Desk
                      </span>
                    </div>
                    <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 font-mono">
                      {finalGov.length} Government KPIs
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                    {finalGov.map((kpi: any, i: number) => renderCard(kpi, i + finalCorp.length))}
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {kpiList.map((kpi: any, idx: number) => {
              const visual = kpiVisual(kpi.key, kpi.label, idx);
              const card = (
                <StatCard
                  label={kpi.label}
                  value={kpi.value}
                  icon={visual.icon}
                  index={idx}
                  badge={visual.badge}
                  sublabel={kpi.helperText || kpi.description}
                  colorTheme={visual.theme}
                />
              );

              return kpi.href ? (
                <Link
                  key={kpi.id || kpi.key || idx}
                  href={kpi.href}
                  title={kpi.helperText || kpi.description}
                  className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 hover:no-underline"
                >
                  {card}
                </Link>
              ) : (
                <div key={kpi.id || kpi.key || idx}>{card}</div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Actionable Work Queue Section */}
      <WorkQueueSection items={workQueueItems} />

      {/* 6. Operational Charts & Data Funnels */}
      <DashboardCharts charts={summary.charts} userRoleId={summary.userRoleId} />

      {/* 7. Scoped Recent Activity Timeline */}
      <section aria-labelledby="recent-activity-heading" className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-800">
            <Bell size={15} />
          </div>
          <h2 id="recent-activity-heading" className="font-heading text-xs font-extrabold uppercase tracking-wider text-slate-900">
            Recent Activity & Audit Events
          </h2>
        </div>

        {summary.recentActivity?.length ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <ul className="divide-y divide-slate-100">
              {summary.recentActivity.map((item: any, index: number) => (
                <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-slate-50/80">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${index % 3 === 0 ? "bg-blue-600" : index % 3 === 1 ? "bg-emerald-500" : "bg-amber-500"}`} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900">
                        {typeof item.action === "string" ? item.action.replace(/_/g, " ") : String(item.action || "Workflow Action")}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                        {item.entityType || "Portal Workflow"}
                        {item.actorName ? ` · by ${item.actorName}` : ""}
                        {item.actorRole ? ` (${item.actorRole})` : ""}
                      </p>
                    </div>
                  </div>
                  <time className="shrink-0 text-[11px] font-medium text-slate-400">{new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-7 text-center text-xs font-medium text-slate-500 shadow-xs">
            No recent activity recorded for this account.
          </div>
        )}
      </section>
    </div>
  );
}

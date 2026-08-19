"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle, CheckCircle2, Clock, ShieldAlert, ArrowLeft,
  Building2, User, HelpCircle, Layers, Check, Copy, FileText,
  Shield, ChevronRight, Send, UserCheck, CornerUpRight, CheckSquare,
  Loader2, ExternalLink
} from "lucide-react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { GovPageHeader } from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovTimeline, { TimelineStep } from "@/components/gov/GovTimeline";
import GovModal from "@/components/gov/GovModal";
import GovAlert from "@/components/gov/GovAlert";
import { Button } from "@/components/ui/Button";
import { apiFetch, clearApiCache } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

interface ActionLog {
  id: string;
  action: string;
  note: string;
  createdAt: string;
  actorUser?: {
    id?: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    designation?: string | null;
    role?: { name: string } | string;
  };
}

interface GrievanceDetail {
  id: string;
  grievanceCode: string;
  projectId?: string;
  issueTitle: string;
  issueDescription: string;
  status: string;
  resolutionText?: string | null;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    projectCode: string;
    title: string;
    district: string;
    sector: string;
    organization?: { name: string; type?: string };
    departmentOrganization?: { name: string };
  };
  raisedByUser?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    designation?: string | null;
    mobile?: string | null;
    role?: { name: string } | string;
  };
  actionLogs?: ActionLog[];
}

interface AssignableOfficer {
  id: string;
  email: string;
  name: string;
  role: string;
  designation: string;
  assignedDistrict?: string | null;
  orgName?: string | null;
}

export default function GrievanceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const [grievance, setGrievance] = useState<GrievanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  // Action Modals
  const [actionType, setActionType] = useState<"respond" | "escalate" | "close" | "assign" | null>(null);
  const [actionRemarks, setActionRemarks] = useState("");
  const [escalateTo, setEscalateTo] = useState<"STATE_CSR_CELL" | "JOINT_SECRETARY">("STATE_CSR_CELL");
  const [targetStatus, setTargetStatus] = useState<string>("LEVEL_1_RESOLVED");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  // Assign Officers
  const [assignableUsers, setAssignableUsers] = useState<AssignableOfficer[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");

  const isAuthority = useMemo(() => {
    if (isAdmin) return true;
    const userRoles = roles || (user?.role ? [user.role] : []);
    return userRoles.some((r) =>
      ["SUPER_ADMIN", "PLANNING_SECRETARY", "JOINT_SECRETARY", "CSR_RELATIONSHIP_MANAGER", "RELATIONSHIP_MANAGER", "PORTAL_ADMIN", "STATE_CSR_CELL", "DISTRICT_NODAL", "DISTRICT_DNC", "GOVT_DEPARTMENT", "CSR_ADMIN"].includes(
        String(r).toUpperCase()
      )
    );
  }, [isAdmin, roles, user]);

  const fetchGrievance = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<any>(`/grievances/${id}`);
      const data = res?.data || res;
      setGrievance(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load grievance details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGrievance();
  }, [fetchGrievance]);

  useEffect(() => {
    if (isAuthority) {
      apiFetch<any>("/grievances/assignable-users")
        .then((res) => {
          const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
          setAssignableUsers(list);
        })
        .catch((err) => console.warn("Failed to load officers:", err));
    }
  }, [isAuthority]);

  const getStageLevel = (status: string) => {
    if (status === "CLOSED") return "Formally Closed";
    if (status === "LEVEL_2_RESOLVED") return "Level 2 Resolved (State Cell)";
    if (status === "LEVEL_1_RESOLVED") return "Level 1 Resolved (District Cell)";
    if (status.includes("ESCALAT") || status === "LEVEL_2") return "Level 2: State CSR Cell & Joint Secretary";
    return "Level 1: District CSR Cell & Organization Head";
  };

  const getStageBadge = (status: string) => {
    if (status === "CLOSED") {
      return <span className="inline-flex rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-bold">Closed</span>;
    }
    if (status === "LEVEL_2_RESOLVED" || status === "LEVEL_1_RESOLVED") {
      return <span className="inline-flex rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-bold">Resolved</span>;
    }
    if (status.includes("ESCALAT") || status === "LEVEL_2") {
      return <span className="inline-flex rounded-full bg-rose-100 text-rose-800 px-3 py-1 text-xs font-bold">Level 2: State Cell / JS</span>;
    }
    return <span className="inline-flex rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-bold">Level 1: District Cell</span>;
  };

  const buildTimeline = (g: GrievanceDetail): TimelineStep[] => {
    const logs = g.actionLogs || [];
    const steps: TimelineStep[] = [
      {
        label: "Grievance Raised",
        description: `Dispatched by ${g.raisedByUser?.email || "Stakeholder"} — Routed to District CSR Cell & Org Head for Level 1 Review.`,
        date: g.createdAt,
        status: "completed",
      },
    ];

    for (const log of logs) {
      if (log.action === "RAISED") continue;
      const actorName = log.actorUser?.email || "Authorized Officer";
      steps.push({
        label: log.action.replace(/_/g, " "),
        description: `${log.note || "Action processed"} (by ${actorName})`,
        date: log.createdAt,
        status: "completed",
      });
    }

    if (g.status !== "CLOSED" && g.status !== "REJECTED") {
      steps.push({
        label: "Active Redressal Stage",
        description: `Currently at ${getStageLevel(g.status)}`,
        status: "active",
      });
    }

    return steps;
  };

  const handleExecuteAction = async () => {
    if (!grievance || !actionType) return;
    if (actionType !== "assign" && (!actionRemarks.trim() || actionRemarks.trim().length < 8)) {
      setActionMsg("Remarks must be at least 8 characters");
      return;
    }

    setActionLoading(true);
    setActionMsg("");
    try {
      if (actionType === "respond") {
        await apiFetch(`/grievances/${grievance.id}/respond`, {
          method: "POST",
          body: JSON.stringify({
            resolutionText: actionRemarks.trim(),
            status: targetStatus,
          }),
        });
        setSuccess(`Grievance resolution updated to ${targetStatus.replace(/_/g, " ")}`);
      } else if (actionType === "escalate") {
        await apiFetch(`/grievances/${grievance.id}/escalate`, {
          method: "POST",
          body: JSON.stringify({
            escalationReason: actionRemarks.trim(),
            escalateTo,
          }),
        });
        setSuccess(`Grievance escalated to ${escalateTo === "JOINT_SECRETARY" ? "Joint Secretary" : "State CSR Cell"}`);
      } else if (actionType === "close") {
        await apiFetch(`/grievances/${grievance.id}/close`, {
          method: "POST",
          body: JSON.stringify({
            closureReason: actionRemarks.trim(),
          }),
        });
        setSuccess("Grievance formally closed with final determination.");
      } else if (actionType === "assign") {
        if (!selectedAssigneeId) {
          setActionMsg("Please select an officer to assign");
          setActionLoading(false);
          return;
        }
        await apiFetch(`/grievances/${grievance.id}/assign`, {
          method: "PATCH",
          body: JSON.stringify({
            userId: selectedAssigneeId,
            note: actionRemarks.trim() || undefined,
          }),
        });
        setSuccess("Grievance successfully assigned to officer.");
      }

      setActionType(null);
      setActionRemarks("");
      clearApiCache();
      fetchGrievance();
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Action failed to execute");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <GovPortalLayout>
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-600">
          <Loader2 size={36} className="animate-spin text-blue-900" />
          <p className="text-sm font-semibold">Loading grievance case file...</p>
        </div>
      </GovPortalLayout>
    );
  }

  if (error || !grievance) {
    return (
      <GovPortalLayout>
        <div className="mx-auto max-w-4xl px-4 py-12">
          <GovAlert variant="danger">{error || "Grievance record not found."}</GovAlert>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/grievances")}
            className="mt-4 text-xs font-bold"
          >
            <ArrowLeft size={13} className="mr-1.5" /> Back to Grievances Queue
          </Button>
        </div>
      </GovPortalLayout>
    );
  }

  const isLevel2OrHigher = ["ESCALATED_TO_STATE_CELL", "ESCALATED_TO_JS_SECRETARY", "LEVEL_2_RESOLVED"].includes(
    grievance.status
  );
  const isClosed = grievance.status === "CLOSED";

  return (
    <GovPortalLayout>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-5 px-3 py-5 sm:px-6 sm:py-6 md:px-8 text-slate-900">
        {/* --- PAGE HEADER --- */}
        <GovPageHeader
          title={`Grievance Case: ${grievance.grievanceCode}`}
          description={grievance.issueTitle}
          eyebrow="Dispute File & Redressal Timeline"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/grievances")}
                className="bg-white text-slate-700 border-slate-300 font-bold text-xs"
              >
                <ArrowLeft size={13} className="mr-1.5" /> All Grievances
              </Button>
              {getStageBadge(grievance.status)}
            </div>
          }
        />

        {success && <GovAlert variant="success">{success}</GovAlert>}

        {/* --- MULTI-LEVEL HIERARCHY PROGRESS STEPPER --- */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">
            Hierarchical Governance Chain
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl border bg-emerald-50 border-emerald-200">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">✓</div>
                <span className="text-xs font-bold text-emerald-900">1. Grievance Logged</span>
              </div>
              <p className="text-[11px] text-emerald-700 mt-1">Initiated with project link</p>
            </div>

            <div className={`p-3 rounded-xl border ${
              grievance.status.includes("LEVEL_1") || !isLevel2OrHigher && !isClosed
                ? "bg-amber-50 border-amber-300 ring-2 ring-amber-400/40"
                : "bg-emerald-50 border-emerald-200"
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  isLevel2OrHigher || isClosed ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
                }`}>
                  {isLevel2OrHigher || isClosed ? "✓" : "2"}
                </div>
                <span className="text-xs font-bold text-slate-900">2. District Cell / Org Head</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1">Level 1 investigation & response</p>
            </div>

            <div className={`p-3 rounded-xl border ${
              isLevel2OrHigher && !isClosed
                ? "bg-rose-50 border-rose-300 ring-2 ring-rose-400/40"
                : isClosed
                ? "bg-emerald-50 border-emerald-200"
                : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  isClosed ? "bg-emerald-600 text-white" : isLevel2OrHigher ? "bg-rose-600 text-white" : "bg-slate-300 text-slate-700"
                }`}>
                  {isClosed ? "✓" : "3"}
                </div>
                <span className="text-xs font-bold text-slate-900">3. State CSR Cell / JS</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1">Level 2 State Secretariat review</p>
            </div>

            <div className={`p-3 rounded-xl border ${
              isClosed ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/40" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  isClosed ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"
                }`}>
                  {isClosed ? "✓" : "4"}
                </div>
                <span className="text-xs font-bold text-slate-900">4. Formally Closed</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1">Resolution accepted & recorded</p>
            </div>
          </div>
        </div>

        {/* --- KEY DETAILS GRID --- */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Project Code</span>
            <p className="text-xs font-mono font-bold text-blue-900 mt-1">
              {grievance.project?.projectCode || (grievance.projectId ? grievance.projectId.slice(0, 8) : grievance.id.slice(0, 8))}
            </p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">District Location</span>
            <p className="text-xs font-bold text-slate-800 mt-1">{grievance.project?.district || "Maharashtra"}</p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Sector</span>
            <p className="text-xs font-bold text-slate-800 mt-1">{grievance.project?.sector || "Convergence"}</p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Raised By</span>
            <p className="text-xs font-bold text-slate-800 mt-1 truncate" title={grievance.raisedByUser?.email}>
              {grievance.raisedByUser?.email || "Stakeholder"}
            </p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Current Authority</span>
            <p className="text-xs font-bold text-blue-900 mt-1 truncate">
              {isLevel2OrHigher ? "State CSR Cell (JS)" : "District Nodal / Org Head"}
            </p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Logged Date</span>
            <p className="text-xs font-bold text-slate-800 mt-1">
              {new Date(grievance.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* --- MAIN SPLIT: ISSUE DETAILS & ACTION TIMELINE --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left: Issue Description & Resolution Note */}
          <div className="space-y-4">
            <GovCard>
              <GovCardHeader>
                <GovCardTitle>Grievance Particulars & Evidence</GovCardTitle>
              </GovCardHeader>
              <GovCardBody>
                <div className="space-y-3.5 text-xs">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Linked Project Title</span>
                    <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {grievance.project?.title || "Convergence Project"}
                    </p>
                    {grievance.project?.departmentOrganization && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Department: {grievance.project.departmentOrganization.name}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Issue Summary</span>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">{grievance.issueTitle}</p>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Detailed Description</span>
                    <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      {grievance.issueDescription}
                    </p>
                  </div>

                  {grievance.resolutionText && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="text-[11px] font-extrabold text-emerald-900 uppercase">
                        Official Resolution Summary
                      </span>
                      <p className="text-xs text-emerald-950 mt-1 whitespace-pre-wrap leading-relaxed">
                        {grievance.resolutionText}
                      </p>
                    </div>
                  )}
                </div>
              </GovCardBody>
            </GovCard>

            {/* Role Action Controls */}
            {isAuthority && !isClosed && (
              <GovCard>
                <GovCardHeader>
                  <GovCardTitle>Hierarchical Authority Actions</GovCardTitle>
                </GovCardHeader>
                <GovCardBody>
                  <div className="flex flex-wrap gap-2">
                    {/* Level 1 Actions */}
                    <Button
                      size="sm"
                      onClick={() => {
                        setActionType("respond");
                        setTargetStatus("LEVEL_1_RESOLVED");
                        setActionRemarks("");
                        setActionMsg("");
                      }}
                      className="bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs"
                    >
                      <CheckCircle2 size={13} className="mr-1.5" /> Level 1 Resolve
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActionType("escalate");
                        setEscalateTo("STATE_CSR_CELL");
                        setActionRemarks("");
                        setActionMsg("");
                      }}
                      className="border-rose-300 text-rose-800 hover:bg-rose-50 font-bold text-xs"
                    >
                      <ShieldAlert size={13} className="mr-1.5" /> Escalate to State Cell
                    </Button>

                    {/* Level 2 Actions */}
                    <Button
                      size="sm"
                      onClick={() => {
                        setActionType("respond");
                        setTargetStatus("LEVEL_2_RESOLVED");
                        setActionRemarks("");
                        setActionMsg("");
                      }}
                      className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                      <CheckCircle2 size={13} className="mr-1.5" /> Level 2 Resolve (JS)
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActionType("assign");
                        setSelectedAssigneeId("");
                        setActionRemarks("");
                        setActionMsg("");
                      }}
                      className="border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs"
                    >
                      <UserCheck size={13} className="mr-1.5" /> Assign Officer
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => {
                        setActionType("close");
                        setActionRemarks("");
                        setActionMsg("");
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                    >
                      <CheckSquare size={13} className="mr-1.5" /> Close Grievance
                    </Button>
                  </div>
                </GovCardBody>
              </GovCard>
            )}
          </div>

          {/* Right: Chronological Action Timeline */}
          <div>
            <GovCard>
              <GovCardHeader>
                <GovCardTitle>Action & Escalation Audit Timeline</GovCardTitle>
              </GovCardHeader>
              <GovCardBody>
                <GovTimeline steps={buildTimeline(grievance)} />
              </GovCardBody>
            </GovCard>
          </div>
        </div>

        {/* --- ACTION MODAL --- */}
        <GovModal
          open={Boolean(actionType)}
          onClose={() => setActionType(null)}
          title={
            actionType === "respond"
              ? `Submit ${targetStatus.replace(/_/g, " ")} Resolution`
              : actionType === "escalate"
              ? "Escalate Grievance to State Secretariat"
              : actionType === "assign"
              ? "Assign Case to Officer / Desk"
              : "Formally Close Grievance"
          }
          width={540}
        >
          <div className="space-y-4">
            {actionMsg && <GovAlert variant="danger">{actionMsg}</GovAlert>}

            {actionType === "escalate" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Escalate To <span className="text-rose-500">*</span>
                </label>
                <select
                  value={escalateTo}
                  onChange={(e) => setEscalateTo(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                >
                  <option value="STATE_CSR_CELL">Level 2: State CSR Cell & Relationship Desk</option>
                  <option value="JOINT_SECRETARY">Level 3: Joint Secretary / Planning Secretary</option>
                </select>
              </div>
            )}

            {actionType === "assign" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Assignee Officer <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedAssigneeId}
                  onChange={(e) => setSelectedAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                >
                  <option value="">Select an Authorized Officer</option>
                  {assignableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role}) {u.assignedDistrict ? `— ${u.assignedDistrict}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {actionType === "escalate"
                  ? "Escalation Justification & Findings"
                  : actionType === "close"
                  ? "Final Closure Summary & Determinations"
                  : actionType === "assign"
                  ? "Assignment Remark / Instructions (Optional)"
                  : "Resolution Notes & Corrective Actions"}{" "}
                {actionType !== "assign" && <span className="text-rose-500">*</span>}
              </label>
              <textarea
                rows={4}
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
                placeholder="Enter detailed administrative remarks..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActionType(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-blue-900 hover:bg-blue-800 text-white font-bold"
                onClick={handleExecuteAction}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <Loader2 size={13} className="animate-spin mr-1.5" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={13} className="mr-1.5" />
                    Confirm Action
                  </>
                )}
              </Button>
            </div>
          </div>
        </GovModal>
      </div>
    </GovPortalLayout>
  );
}


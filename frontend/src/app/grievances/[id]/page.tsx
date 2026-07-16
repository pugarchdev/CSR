"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageShell from "@/components/gov/GovPageShell";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovStatusBadge, { statusToVariant } from "@/components/gov/GovStatusBadge";
import GovTimeline, { TimelineStep } from "@/components/gov/GovTimeline";
import GovModal from "@/components/gov/GovModal";
import GovTextarea from "@/components/gov/GovTextarea";
import GovAlert from "@/components/gov/GovAlert";
import AccessDenied from "@/components/gov/AccessDenied";
import { apiFetch, clearApiCache } from "@/lib/api";
import {
  getCurrentUser,
  hasRoleAccess,
  GRIEVANCE_ACCESS_ROLES,
  GRIEVANCE_RESPOND_ROLES,
  GRIEVANCE_ESCALATE_ROLES,
  GRIEVANCE_CLOSE_ROLES,
} from "@/lib/roleAccess";

interface ActionLog {
  id: string;
  action: string;
  note: string;
  createdAt: string;
  actorUser?: { email: string; role: string };
}

interface GrievanceDetail {
  id: string;
  grievanceId: string;
  issueTitle: string;
  issueDescription: string;
  status: string;
  raisedByType: string;
  level1DueAt: string | null;
  level2DueAt: string | null;
  resolutionText: string | null;
  createdAt: string;
  updatedAt: string;
  convergenceProject?: { projectId: string; title: string; district: string };
  raisedByUser?: { email: string; role: string };
  assignedNodalOfficer?: { id: string; email: string; role: string };
  assignedStateCellUser?: { id: string; email: string; role: string };
  finalAuthorityUser?: { id: string; email: string; role: string };
  actionLogs?: ActionLog[];
}

export default function GrievanceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [grievance, setGrievance] = useState<GrievanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  // Action modals
  const [actionType, setActionType] = useState<"respond" | "escalate" | "close" | null>(null);
  const [actionText, setActionText] = useState("");
  const [escalateTo, setEscalateTo] = useState<"STATE_CSR_CELL" | "JOINT_SECRETARY">("STATE_CSR_CELL");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  const [assignableUsers, setAssignableUsers] = useState<{ id: string; email: string; role: string; name?: string; assignedDistrict?: string }[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const user = getCurrentUser();

  useEffect(() => {
    const isAssigner = user && ["SUPER_ADMIN", "PORTAL_ADMIN", "CSR_ADMIN", "STATE_CSR_CELL", "JOINT_SECRETARY"].includes(user.role);
    if (isAssigner) {
      apiFetch<{ success: boolean; data: any }>("/grievances/assignable-users")
        .then((res) => {
          const data = res?.data || res;
          if (Array.isArray(data)) setAssignableUsers(data);
        })
        .catch((err) => console.error("Error fetching assignable users:", err));
    }
  }, [user]);

  // Set initial assignee
  useEffect(() => {
    if (grievance) {
      setSelectedAssigneeId(grievance.assignedStateCellUser?.id || grievance.assignedNodalOfficer?.id || "");
    }
  }, [grievance]);

  const handleAssign = async () => {
    if (!selectedAssigneeId) return;
    setAssigning(true);
    setError("");
    setSuccess(null);
    try {
      await apiFetch(`/grievances/${id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ userId: selectedAssigneeId })
      });
      setSuccess("Grievance assigned successfully!");
      clearApiCache();
      fetchGrievance();
    } catch (err: any) {
      setError(err?.message || "Failed to assign grievance.");
    } finally {
      setAssigning(false);
    }
  };

  const fetchGrievance = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<{ success: boolean; data: GrievanceDetail }>(`/grievances/${id}`);
      setGrievance(res?.data || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load grievance");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (mounted && hasRoleAccess(GRIEVANCE_ACCESS_ROLES)) fetchGrievance();
  }, [mounted, fetchGrievance]);

  if (!mounted) return null;
  if (!hasRoleAccess(GRIEVANCE_ACCESS_ROLES)) return <AccessDenied />;

  const canRespond = hasRoleAccess(GRIEVANCE_RESPOND_ROLES);
  const canEscalate = hasRoleAccess(GRIEVANCE_ESCALATE_ROLES);
  const canClose = hasRoleAccess(GRIEVANCE_CLOSE_ROLES);
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const getLevel = (status: string) => {
    if (status.includes("ESCALATED_TO_JS") || status.includes("FINAL")) return "Final — JS/Planning Secretary";
    if (status.includes("STATE_CELL") || status.includes("LEVEL_2")) return "Level 2 — State CSR Cell";
    return "Level 1 — District Nodal Officer";
  };

  const getAuthority = (g: GrievanceDetail) =>
    g.finalAuthorityUser?.email || g.assignedStateCellUser?.email || g.assignedNodalOfficer?.email || "Pending assignment";

  const buildTimeline = (g: GrievanceDetail): TimelineStep[] => {
    const logs = g.actionLogs || [];
    const steps: TimelineStep[] = [
      { label: "Grievance Raised", description: `By ${g.raisedByUser?.email || "—"}`, date: g.createdAt, status: "completed" },
    ];
    for (const log of logs) {
      if (log.action === "RAISED") continue;
      const isCompleted = true;
      steps.push({
        label: log.action.replace(/_/g, " "),
        description: `${log.note?.substring(0, 100) || ""}${log.actorUser ? ` — ${log.actorUser.email}` : ""}`,
        date: log.createdAt,
        status: isCompleted ? "completed" : "active",
      });
    }
    if (g.status !== "CLOSED" && g.status !== "REJECTED") {
      steps.push({ label: "Pending Resolution", description: `Current level: ${getLevel(g.status)}`, status: "active" });
    }
    return steps;
  };

  const handleAction = async () => {
    if (!grievance || !actionType) return;
    if (!actionText.trim() || actionText.trim().length < 10) { setActionMsg("Response must be at least 10 characters"); return; }
    setActionLoading(true);
    setActionMsg("");
    try {
      const endpoint = actionType === "respond" ? `/grievances/${grievance.id}/respond`
        : actionType === "escalate" ? `/grievances/${grievance.id}/escalate`
        : `/grievances/${grievance.id}/close`;
      const body = actionType === "respond"
        ? { responseText: actionText.trim(), status: "LEVEL_1_RESOLVED" }
        : actionType === "escalate"
        ? { escalationReason: actionText.trim(), escalateTo }
        : { closureReason: actionText.trim(), resolutionSummary: actionText.trim() };
      await apiFetch(endpoint, { method: "POST", body: JSON.stringify(body) });
      setActionType(null);
      setActionText("");
      clearApiCache();
      fetchGrievance();
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <GovPortalLayout>
        <div style={{ textAlign: "center", padding: 64 }}>
          <div style={{ width: 36, height: 36, border: "3px solid var(--gov-border)", borderTopColor: "var(--gov-primary)", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ color: "var(--gov-text-muted)" }}>Loading grievance…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </GovPortalLayout>
    );
  }

  if (error || !grievance) {
    return (
      <GovPortalLayout>
        <GovPageShell breadcrumb="Home / Grievances / Detail" title="Grievance Not Found">
          <GovAlert variant="danger">{error || "Grievance not found"}</GovAlert>
          <GovButton variant="muted" onClick={() => router.push("/grievances")} style={{ marginTop: 12 }}>← Back to Grievances</GovButton>
        </GovPageShell>
      </GovPortalLayout>
    );
  }

  return (
    <GovPortalLayout>
      <GovPageShell
        breadcrumb="Home / Grievances / Detail"
        title={grievance.grievanceId}
        description={grievance.issueTitle}
        actions={
          <GovStatusBadge variant={statusToVariant(grievance.status)} style={{ fontSize: 14, padding: "6px 14px" }}>
            {grievance.status.replace(/_/g, " ")}
          </GovStatusBadge>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 16 }}>
          {[
            { label: "Project", value: grievance.convergenceProject ? `${grievance.convergenceProject.projectId} — ${grievance.convergenceProject.title}` : "—" },
            { label: "Current Level", value: getLevel(grievance.status) },
            { label: "Responsible Authority", value: getAuthority(grievance) },
            { label: "L1 Due Date", value: fmtDate(grievance.level1DueAt) },
            { label: "L2 Due Date", value: fmtDate(grievance.level2DueAt) },
            { label: "Raised Date", value: fmtDate(grievance.createdAt) },
          ].map((item) => (
            <GovCard key={item.label}>
              <GovCardBody>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gov-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6, color: "var(--gov-primary-dark)" }}>{item.value}</div>
              </GovCardBody>
            </GovCard>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
          {/* Details */}
          <GovCard>
            <GovCardHeader><GovCardTitle>Issue Details</GovCardTitle></GovCardHeader>
            <GovCardBody>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Issue Title</div>
                <div style={{ fontSize: 14 }}>{grievance.issueTitle}</div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Description</div>
                <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{grievance.issueDescription}</div>
              </div>
              {grievance.resolutionText && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Resolution</div>
                  <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{grievance.resolutionText}</div>
                </div>
              )}
            </GovCardBody>
          </GovCard>

          {/* Timeline */}
          <GovCard>
            <GovCardHeader><GovCardTitle>Action Timeline</GovCardTitle></GovCardHeader>
            <GovCardBody>
              <GovTimeline steps={buildTimeline(grievance)} />
            </GovCardBody>
          </GovCard>
        </div>

        {/* Assignment Widget */}
        {grievance.status !== "CLOSED" && grievance.status !== "REJECTED" && ["SUPER_ADMIN", "PORTAL_ADMIN", "CSR_ADMIN", "STATE_CSR_CELL", "JOINT_SECRETARY"].includes(user?.role || "") && (
          <GovCard style={{ marginTop: 16, marginBottom: 16 }}>
            <GovCardHeader style={{ paddingBottom: 8 }}>
              <GovCardTitle>Assign Grievance Officer</GovCardTitle>
            </GovCardHeader>
            <GovCardBody style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <select
                  className="gov-select"
                  value={selectedAssigneeId}
                  onChange={(e) => setSelectedAssigneeId(e.target.value)}
                  style={{ width: "100%", height: 38, padding: "8px 12px", border: "1px solid var(--gov-border)", borderRadius: 6, fontSize: 13 }}
                >
                  <option value="">Select Nodal Officer or State CSR Cell User</option>
                  {assignableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email} ({u.role.replace(/_/g, " ")}) {u.assignedDistrict ? `— ${u.assignedDistrict}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <GovButton onClick={handleAssign} disabled={assigning || !selectedAssigneeId}>
                {assigning ? "Assigning..." : "Assign Officer"}
              </GovButton>
            </GovCardBody>
          </GovCard>
        )}

        {/* Actions */}
        {grievance.status !== "CLOSED" && grievance.status !== "REJECTED" && (
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            {canRespond && <GovButton onClick={() => { setActionType("respond"); setActionText(""); setActionMsg(""); }}>Respond / Resolve</GovButton>}
            {canEscalate && <GovButton variant="danger" onClick={() => { setActionType("escalate"); setActionText(""); setActionMsg(""); }}>Escalate</GovButton>}
            {canClose && <GovButton variant="secondary" onClick={() => { setActionType("close"); setActionText(""); setActionMsg(""); }}>Close Grievance</GovButton>}
            <GovButton variant="muted" onClick={() => router.push("/grievances")}>← Back to List</GovButton>
          </div>
        )}
      </GovPageShell>

      {/* Action Modal */}
      <GovModal
        open={!!actionType}
        onClose={() => setActionType(null)}
        title={actionType === "respond" ? "Respond to Grievance" : actionType === "escalate" ? "Escalate Grievance" : "Close Grievance"}
        width={480}
      >
        {actionMsg && <GovAlert variant="danger">{actionMsg}</GovAlert>}
        {actionType === "escalate" && (
          <div style={{ marginBottom: 12 }}>
            <label className="gov-label">Escalate To</label>
            <select className="gov-select" value={escalateTo} onChange={(e) => setEscalateTo(e.target.value as "STATE_CSR_CELL" | "JOINT_SECRETARY")}>
              <option value="STATE_CSR_CELL">State CSR Cell</option>
              <option value="JOINT_SECRETARY">Joint Secretary</option>
            </select>
          </div>
        )}
        <GovTextarea
          label={actionType === "escalate" ? "Escalation Reason" : actionType === "close" ? "Closure Reason / Resolution Summary" : "Response"}
          required
          placeholder="Minimum 10 characters"
          value={actionText}
          onChange={(e) => setActionText(e.target.value)}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <GovButton variant="muted" onClick={() => setActionType(null)}>Cancel</GovButton>
          <GovButton onClick={handleAction} disabled={actionLoading}>{actionLoading ? "Processing…" : "Submit"}</GovButton>
        </div>
      </GovModal>
    </GovPortalLayout>
  );
}

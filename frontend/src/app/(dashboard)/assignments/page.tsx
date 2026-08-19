"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToastActions } from "@/components/ui/Toast";
import {
  Landmark,
  Building2,
  UserCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Search,
  Eye,
  Calendar,
  MapPin,
  FileText,
  Send,
  AlertTriangle,
  Clock,
  ShieldCheck,
  FolderOpen,
  ArrowRight,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import "@/styles/gov-theme.css";

interface PendingCase {
  id: string;
  trackingId: string;
  type: string;
  targetDistricts: string[];
  geographicScope: string;
  status: string;
  updatedAt: string;
  title?: string;
}

interface GovernmentAssignment {
  id: string;
  caseId: string;
  status: string;
  ownershipLevel: "STATE" | "DISTRICT";
  primaryNodalUserId: string;
  csrCellHeadUserId?: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
  case?: {
    id: string;
    trackingId: string;
    type: string;
    targetDistricts: string[];
    status: string;
    title?: string;
  };
  governmentOrganization?: {
    id: string;
    name: string;
    district?: string;
    departmentHeadUserId?: string;
    memberships?: Array<{
      user: {
        id: string;
        firstName: string;
        lastName?: string;
        designation?: string;
      };
    }>;
  };
  districtAssignments?: Array<{
    id: string;
    district: string;
    status: string;
    nodalUserId?: string;
  }>;
  events?: Array<{
    id: string;
    eventType: string;
    createdAt: string;
    reasonCode?: string;
    remarks?: string;
  }>;
}

interface AssignmentOptions {
  ownershipLevel: "STATE" | "DISTRICT";
  organizations: Array<{
    id: string;
    name: string;
    governmentType: string;
    district?: string;
    memberships: Array<{
      user: {
        id: string;
        firstName: string;
        lastName?: string;
        designation?: string;
      };
    }>;
  }>;
}

export default function MasterAssignmentsPage() {
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const roleText = [...(roles || []), user?.role || ""].join(" ").toUpperCase();
  const isJs =
    roleText.includes("JOINT_SECRETARY") ||
    Number(user?.roleNumericId || user?.roleId) === 3;

  const [data, setData] = useState<{
    pendingCases: PendingCase[];
    assignments: GovernmentAssignment[];
  }>({ pendingCases: [], assignments: [] });

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // JS Assignment Modal
  const [assignCase, setAssignCase] = useState<PendingCase | null>(null);
  const [options, setOptions] = useState<AssignmentOptions | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedNodalId, setSelectedNodalId] = useState("");
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Action Modal (Accept, Reject, Escalate, Reassign)
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: "ACCEPT" | "REJECT" | "ESCALATE" | "REASSIGN";
    assignment: GovernmentAssignment | null;
  }>({ isOpen: false, type: "ACCEPT", assignment: null });

  const [actionReason, setActionReason] = useState("");
  const [replacementNodalId, setReplacementNodalId] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  // Detail Modal
  const [detailModal, setDetailModal] = useState<GovernmentAssignment | null>(null);

  const toast = useToastActions();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<any>("/government-assignments");
      setData(res?.data || { pendingCases: [], assignments: [] });
    } catch {
      setData({ pendingCases: [], assignments: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open JS Assign Modal
  const handleOpenAssign = async (caseItem: PendingCase) => {
    setAssignCase(caseItem);
    setSelectedOrgId("");
    setSelectedNodalId("");
    setLoadingOptions(true);
    try {
      const res = await apiFetch<any>(`/government-assignments/options/${caseItem.id}`);
      setOptions(res?.data || null);
    } catch (err: any) {
      toast.error("Options Unavailable", err.message || "Failed to load eligible CSR Cells.");
      setAssignCase(null);
    } finally {
      setLoadingOptions(false);
    }
  };

  // Submit JS Assignment
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignCase || !selectedOrgId || !selectedNodalId) {
      toast.error("Selection Required", "Please select a CSR Cell and an active Nodal Officer.");
      return;
    }

    setSubmittingAssign(true);
    try {
      await apiFetch("/government-assignments", {
        method: "POST",
        body: JSON.stringify({
          caseId: assignCase.id,
          governmentOrganizationId: selectedOrgId,
          primaryNodalUserId: selectedNodalId,
          districtAssignments: (assignCase.targetDistricts || []).map((district: string) => ({
            district,
          })),
        }),
      });

      toast.success(
        "Assignment Complete",
        `Case ${assignCase.trackingId} assigned to CSR Cell.`
      );
      setAssignCase(null);
      setOptions(null);
      loadData();
    } catch (err: any) {
      toast.error("Assignment Failed", err.message || "Could not complete assignment.");
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Open Action Modal
  const openActionModal = (
    type: "ACCEPT" | "REJECT" | "ESCALATE" | "REASSIGN",
    assignment: GovernmentAssignment
  ) => {
    setActionReason("");
    setReplacementNodalId("");
    setActionModal({ isOpen: true, type, assignment });
  };

  // Execute Action
  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { type, assignment } = actionModal;
    if (!assignment) return;

    if ((type === "REJECT" || type === "ESCALATE") && !actionReason.trim()) {
      toast.error("Reason Required", "Please provide a reason for this action.");
      return;
    }

    if (type === "REASSIGN" && !replacementNodalId) {
      toast.error("Officer Required", "Please pick a replacement Nodal Officer.");
      return;
    }

    setActionBusy(true);
    try {
      if (type === "ACCEPT" || type === "REJECT") {
        await apiFetch(`/government-assignments/${assignment.id}/respond`, {
          method: "POST",
          body: JSON.stringify({
            decision: type,
            reason: actionReason.trim() || undefined,
          }),
        });
        toast.success(
          type === "ACCEPT" ? "Assignment Accepted" : "Assignment Declined",
          type === "ACCEPT"
            ? "Project ownership confirmed. Proceed with execution."
            : "Case returned for CSR Cell Head reassignment."
        );
      } else if (type === "ESCALATE") {
        await apiFetch(`/government-assignments/${assignment.id}/escalate-wrong-district`, {
          method: "POST",
          body: JSON.stringify({ reason: actionReason.trim() }),
        });
        toast.warning(
          "District Escalated",
          "Case escalated to the Joint Secretary for district re-mapping."
        );
      } else if (type === "REASSIGN") {
        await apiFetch(`/government-assignments/${assignment.id}/reassign-nodal`, {
          method: "POST",
          body: JSON.stringify({
            replacementNodalUserId: replacementNodalId,
            reason: actionReason.trim() || "Reassigned by CSR Cell Head",
          }),
        });
        toast.success("Nodal Reassigned", "New Nodal Officer assigned.");
      }

      setActionModal({ isOpen: false, type: "ACCEPT", assignment: null });
      loadData();
    } catch (err: any) {
      toast.error("Action Failed", err.message || "Failed to execute action.");
    } finally {
      setActionBusy(false);
    }
  };

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return data.assignments.filter((item) => {
      const matchSearch =
        !searchTerm.trim() ||
        item.case?.trackingId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.case?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.governmentOrganization?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.case?.targetDistricts || []).some((d) =>
          d.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PENDING" && item.status === "PENDING_ACCEPTANCE") ||
        (statusFilter === "ACTIVE" && item.status === "ACTIVE") ||
        (statusFilter === "REJECTED" &&
          item.status === "REJECTED_AWAITING_HEAD_REASSIGNMENT") ||
        (statusFilter === "ESCALATED" &&
          item.status === "ESCALATED_TO_JS_WRONG_DISTRICT");

      return matchSearch && matchStatus;
    });
  }, [data.assignments, searchTerm, statusFilter]);

  const selectedOrg = options?.organizations?.find((o) => o.id === selectedOrgId);

  // Quick stats
  const pendingAcceptanceCount = data.assignments.filter(
    (a) => a.status === "PENDING_ACCEPTANCE"
  ).length;
  const activeCount = data.assignments.filter((a) => a.status === "ACTIVE").length;
  const escalatedCount = data.assignments.filter(
    (a) => a.status === "ESCALATED_TO_JS_WRONG_DISTRICT"
  ).length;

  return (
    <GovPortalLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 text-slate-900">
        <GovPageHeader
          title="Government Project Assignments & Delegation"
          breadcrumb="Dashboard / Project Assignments"
          description="Manage, accept, and oversee government CSR project ownership, Nodal officer execution, and district scopes."
          actions={
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={loadData}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          }
        />

        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Visible</span>
              <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Landmark size={17} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">
              {loading ? "..." : data.assignments.length + data.pendingCases.length}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Projects in department scope</p>
          </div>

          <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending Action</span>
              <div className="h-8 w-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Clock size={17} />
              </div>
            </div>
            <p className="text-2xl font-black text-amber-900 mt-2">
              {loading ? "..." : pendingAcceptanceCount + (isJs ? data.pendingCases.length : 0)}
            </p>
            <p className="text-[11px] text-amber-600/80 mt-0.5">Awaiting Nodal / JS response</p>
          </div>

          <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Active Ownership</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={17} />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-900 mt-2">
              {loading ? "..." : activeCount}
            </p>
            <p className="text-[11px] text-emerald-600/80 mt-0.5">Accepted & active execution</p>
          </div>

          <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">District Escalated</span>
              <div className="h-8 w-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                <AlertTriangle size={17} />
              </div>
            </div>
            <p className="text-2xl font-black text-rose-900 mt-2">
              {loading ? "..." : escalatedCount}
            </p>
            <p className="text-[11px] text-rose-600/80 mt-0.5">Flagged for district re-mapping</p>
          </div>
        </div>

        {/* ── Section 1: Cases Awaiting Government Owner (Visible for Joint Secretary) ── */}
        {isJs && (
          <Card variant="outlined" className="border-blue-200/80 bg-linear-to-b from-blue-50/20 to-transparent">
            <CardHeader className="border-b border-blue-100/60 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base text-blue-950 font-bold">
                    <Landmark size={20} className="text-blue-700" />
                    Approved Cases Awaiting Government Owner ({data.pendingCases.length})
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Joint Secretary approved cases ready for formal assignment to State or District CSR Cells.
                  </p>
                </div>
                <Badge variant={data.pendingCases.length > 0 ? "warning" : "muted"} size="md">
                  {data.pendingCases.length} Pending Assignment
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {data.pendingCases.length === 0 ? (
                <div className="p-8 text-center text-xs font-medium text-slate-500">
                  <CheckCircle2 size={28} className="mx-auto text-emerald-600 mb-1.5" />
                  All approved cases have been assigned to an official CSR Cell.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.pendingCases.map((caseItem) => (
                    <div
                      key={caseItem.id}
                      className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:bg-blue-50/30 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">
                            {caseItem.trackingId}
                          </span>
                          <Badge variant="info" size="sm">
                            {caseItem.geographicScope?.replace(/_/g, " ") || "STATEWIDE"}
                          </Badge>
                          {caseItem.status === "ASSIGNMENT_ESCALATED" && (
                            <Badge variant="danger" size="sm">
                              District Correction Needed
                            </Badge>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {caseItem.title || caseItem.type || "CSR Project Proposal"}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            <MapPin size={12} className="text-slate-400" />
                            {(caseItem.targetDistricts || []).join(", ") || "All Maharashtra"}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar size={12} className="text-slate-400" />
                            {new Date(caseItem.updatedAt).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="primary"
                        size="sm"
                        icon={Send}
                        onClick={() => handleOpenAssign(caseItem)}
                        className="shrink-0 shadow-sm"
                      >
                        Assign CSR Cell
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Section 2: Main Assignment Register ── */}
        <Card variant="outlined">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <FileText size={20} className="text-blue-700" />
                  Government Assignments Register ({filteredAssignments.length})
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official project ownership, Nodal acceptance status, and district execution scopes.
                </p>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Search tracking ID, title, district..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9 w-48 sm:w-64 rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setStatusFilter("ALL")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      statusFilter === "ALL"
                        ? "bg-white text-blue-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setStatusFilter("PENDING")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      statusFilter === "PENDING"
                        ? "bg-white text-amber-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setStatusFilter("ACTIVE")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      statusFilter === "ACTIVE"
                        ? "bg-white text-emerald-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setStatusFilter("ESCALATED")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      statusFilter === "ESCALATED"
                        ? "bg-white text-rose-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Escalated
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Loader2 className="animate-spin text-blue-600" size={28} />
                <span className="text-xs font-semibold text-slate-500">
                  Loading assignment records...
                </span>
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="p-12 text-center text-xs font-medium text-slate-500">
                <FolderOpen size={36} className="mx-auto text-slate-300 mb-2" />
                No assignment records match your filter.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredAssignments.map((item) => {
                  const isNodalAssigned = item.primaryNodalUserId === user?.id;
                  const isHead =
                    item.governmentOrganization?.departmentHeadUserId === user?.id ||
                    item.csrCellHeadUserId === user?.id;

                  const isPending = item.status === "PENDING_ACCEPTANCE";
                  const isRejected = item.status === "REJECTED_AWAITING_HEAD_REASSIGNMENT";
                  const isEscalated = item.status === "ESCALATED_TO_JS_WRONG_DISTRICT";
                  const isActive = item.status === "ACTIVE";

                  return (
                    <div
                      key={item.id}
                      className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">
                            {item.case?.trackingId}
                          </span>

                          <Badge
                            variant={
                              isActive
                                ? "success"
                                : isPending
                                ? "warning"
                                : isRejected
                                ? "danger"
                                : isEscalated
                                ? "danger"
                                : "primary"
                            }
                            size="sm"
                          >
                            {item.status.replace(/_/g, " ")}
                          </Badge>

                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {item.ownershipLevel} OWNERSHIP
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {item.case?.title || item.case?.type || "CSR Project"}
                        </h4>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            <Building2 size={13} className="text-slate-400" />
                            {item.governmentOrganization?.name || "State CSR Cell"}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin size={13} className="text-slate-400" />
                            {(item.case?.targetDistricts || []).join(", ") ||
                              item.governmentOrganization?.district ||
                              "All Districts"}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar size={13} className="text-slate-400" />
                            {new Date(item.updatedAt).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                      </div>

                      {/* Action Trays */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Eye}
                          onClick={() => setDetailModal(item)}
                        >
                          Details & History
                        </Button>

                        {/* Nodal Officer Acceptance Actions */}
                        {isNodalAssigned && isPending && (
                          <>
                            <Button
                              variant="danger"
                              size="sm"
                              icon={XCircle}
                              onClick={() => openActionModal("REJECT", item)}
                            >
                              Decline
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={CheckCircle2}
                              onClick={() => openActionModal("ACCEPT", item)}
                            >
                              Accept Ownership
                            </Button>
                          </>
                        )}

                        {/* Head Reassignment */}
                        {isHead && isRejected && (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={UserCheck}
                            onClick={() => openActionModal("REASSIGN", item)}
                          >
                            Reassign Nodal
                          </Button>
                        )}

                        {/* Wrong District Escalation */}
                        {(isNodalAssigned || isHead) &&
                          !["COMPLETED", "CLOSED", "REVOKED", "ESCALATED_TO_JS_WRONG_DISTRICT"].includes(
                            item.status
                          ) && (
                            <Button
                              variant="outline"
                              size="sm"
                              icon={AlertTriangle}
                              onClick={() => openActionModal("ESCALATE", item)}
                              className="text-amber-700 border-amber-300 hover:bg-amber-50"
                            >
                              Escalate District
                            </Button>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Modal 1: Assign CSR Cell (JS Flow) ── */}
      <Modal
        isOpen={Boolean(assignCase)}
        onClose={() => {
          setAssignCase(null);
          setOptions(null);
        }}
        title={`Assign Government Owner · ${assignCase?.trackingId || ""}`}
      >
        <form onSubmit={handleAssignSubmit} className="space-y-5">
          <div className="p-3.5 bg-blue-50/80 border border-blue-200/60 rounded-xl text-xs text-blue-900 leading-relaxed">
            <p className="font-bold">Authoritative Ownership Assignment</p>
            <p className="mt-0.5 text-blue-800">
              {options?.ownershipLevel === "STATE"
                ? "Multi-district projects route to the State CSR Cell for statewide coordination."
                : "Single-district projects route directly to the active District CSR Cell."}
            </p>
          </div>

          {loadingOptions ? (
            <div className="py-8 text-center text-xs font-semibold text-slate-500">
              <Loader2 className="animate-spin mx-auto text-blue-600 mb-2" size={24} />
              Loading eligible CSR Cells...
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Owning CSR Cell *
                </label>
                <select
                  required
                  value={selectedOrgId}
                  onChange={(e) => {
                    setSelectedOrgId(e.target.value);
                    setSelectedNodalId("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Choose Eligible CSR Cell --</option>
                  {options?.organizations?.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} {org.district ? `(${org.district})` : "[Statewide]"}
                    </option>
                  ))}
                </select>
              </div>

              {selectedOrg && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Designate Primary Nodal Officer *
                  </label>
                  <select
                    required
                    value={selectedNodalId}
                    onChange={(e) => setSelectedNodalId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Select Active Nodal Officer --</option>
                    {selectedOrg.memberships?.map((m) => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.firstName} {m.user.lastName || ""} ({m.user.designation || "Nodal Officer"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAssignCase(null);
                    setOptions(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submittingAssign || !selectedOrgId || !selectedNodalId}
                >
                  {submittingAssign ? "Issuing..." : "Issue Assignment"}
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* ── Modal 2: Action Modal (Accept, Reject, Escalate, Reassign) ── */}
      <Modal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ isOpen: false, type: "ACCEPT", assignment: null })}
        title={
          actionModal.type === "ACCEPT"
            ? "Confirm Project Ownership"
            : actionModal.type === "REJECT"
            ? "Decline Assignment"
            : actionModal.type === "REASSIGN"
            ? "Reassign Nodal Officer"
            : "Escalate Incorrect District"
        }
      >
        <form onSubmit={handleActionSubmit} className="space-y-4">
          {actionModal.type === "ACCEPT" && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
              <p className="font-bold">Acceptance Confirmation</p>
              <p className="mt-0.5 text-emerald-800">
                By accepting, you confirm active Nodal responsibility for overseeing this project
                and coordinating execution deliverables.
              </p>
            </div>
          )}

          {actionModal.type === "REJECT" && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 leading-relaxed">
              <p className="font-bold">Mandatory Decline Reason</p>
              <p className="mt-0.5 text-rose-800">
                Provide a justification. The case will be returned to your CSR Cell Head for reassignment.
              </p>
            </div>
          )}

          {actionModal.type === "ESCALATE" && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
              <p className="font-bold">District Correction Escalation</p>
              <p className="mt-0.5 text-amber-800">
                Explain why this case was mapped to the incorrect district. The Joint Secretary
                will review and update the target district.
              </p>
            </div>
          )}

          {actionModal.type === "REASSIGN" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Replacement Nodal Officer *
              </label>
              <select
                required
                value={replacementNodalId}
                onChange={(e) => setReplacementNodalId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- Choose Replacement Officer --</option>
                {actionModal.assignment?.governmentOrganization?.memberships?.map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.firstName} {m.user.lastName || ""} ({m.user.designation || "Nodal Officer"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {actionModal.type !== "ACCEPT" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {actionModal.type === "REASSIGN" ? "Remarks / Justification (Optional)" : "Reason *"}
              </label>
              <textarea
                required={actionModal.type !== "REASSIGN"}
                rows={3}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={
                  actionModal.type === "REJECT"
                    ? "Enter reason for declining assignment..."
                    : actionModal.type === "ESCALATE"
                    ? "Explain why the district mapping is incorrect..."
                    : "Add any instructions for the replacement officer..."
                }
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActionModal({ isOpen: false, type: "ACCEPT", assignment: null })}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={
                actionModal.type === "REJECT"
                  ? "danger"
                  : actionModal.type === "ESCALATE"
                  ? "primary"
                  : "primary"
              }
              size="sm"
              disabled={actionBusy}
            >
              {actionBusy ? "Processing..." : "Confirm Action"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal 3: Detail & History Modal ── */}
      <Modal
        isOpen={Boolean(detailModal)}
        onClose={() => setDetailModal(null)}
        title={`Assignment Audit & Timeline · ${detailModal?.case?.trackingId || ""}`}
      >
        {detailModal && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold uppercase text-slate-500">Ownership Level</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">
                  {detailModal.ownershipLevel} CSR CELL
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold uppercase text-slate-500">Owning Organization</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                  {detailModal.governmentOrganization?.name || "State CSR Cell"}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold uppercase text-slate-500">Current Status</p>
                <p className="text-xs font-bold text-blue-700 mt-0.5">
                  {detailModal.status.replace(/_/g, " ")}
                </p>
              </div>
            </div>

            {/* Target District Breakdown */}
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Target Districts & Execution Scope
              </h5>
              <div className="flex flex-wrap gap-2">
                {(detailModal.case?.targetDistricts || []).map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-800 text-xs font-bold rounded-lg border border-blue-200/60"
                  >
                    <MapPin size={11} /> {d}
                  </span>
                ))}
              </div>
            </div>

            {/* Audit History Timeline */}
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
                Event Trail & State Transitions
              </h5>
              {(!detailModal.events || detailModal.events.length === 0) ? (
                <p className="text-xs text-slate-400 italic">No event records available.</p>
              ) : (
                <div className="space-y-2.5">
                  {detailModal.events.map((ev, idx) => (
                    <div
                      key={ev.id || idx}
                      className="p-3 bg-white border border-slate-200/70 rounded-xl flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900">
                          {ev.eventType.replace(/_/g, " ")}
                        </span>
                        {ev.remarks && (
                          <p className="text-slate-600 mt-0.5 italic">"{ev.remarks}"</p>
                        )}
                        {ev.reasonCode && (
                          <span className="inline-block mt-1 text-[10px] font-mono text-slate-400">
                            Code: {ev.reasonCode}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {new Date(ev.createdAt).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setDetailModal(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </GovPortalLayout>
  );
}

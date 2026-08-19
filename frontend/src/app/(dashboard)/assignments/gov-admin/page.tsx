"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToastActions } from "@/components/ui/Toast";
import { Building2, UserCheck, RefreshCw, AlertTriangle, History } from "lucide-react";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTh } from "@/components/ui/SortableTh";
import "@/styles/gov-theme.css";

import AssignmentTabs from "@/components/assignments/AssignmentTabs";

interface GovProjectItem {
  id: string;
  projectCode: string;
  title: string;
  district: string;
  sector: string;
  organizationId: string;
  status: string;
  currentOwner: string | null;
  delegationStatus: "DELEGATED" | "PENDING_DELEGATION";
  history: any[];
}

interface EligibleGovOfficer {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  organizationName: string;
  roleName: string;
  isValid: boolean;
  disabledReason: string | null;
}

export default function GovAdminAssignmentQueuePage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<GovProjectItem[]>([]);

  const [officers, setOfficers] = useState<EligibleGovOfficer[]>([]);

  const [selectedProject, setSelectedProject] = useState<GovProjectItem | null>(null);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [historyProject, setHistoryProject] = useState<GovProjectItem | null>(null);

  const { sortedItems: sortedProjects, sortKey, sortDirection, requestSort } = useTableSort(projects, {
    customGetters: {
      title: (p) => `${p.title} ${p.projectCode}`,
      sector: (p) => `${p.sector} ${p.district}`,
      status: (p) => p.status,
      currentOwner: (p) => p.currentOwner || "",
      delegationStatus: (p) => p.delegationStatus,
    }
  });

  const toast = useToastActions();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch<any>("/assignments/gov-admin/queue");
      if (res) {
        setProjects(res.projects || res.data || []);
        if (Array.isArray(res.eligibleOfficers) && res.eligibleOfficers.length > 0) {
          setOfficers(res.eligibleOfficers);
        } else {
          try {
            const officersRes = await apiFetch<any>("/assignments/gov-admin/eligible-officers");
            setOfficers(officersRes?.eligibleOfficers || officersRes?.data || []);
          } catch {
            setOfficers([]);
          }
        }
      }
    } catch (err) {
      toast.error("Failed to load queue", err instanceof Error ? err.message : "Error fetching Department Officer queue");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelegate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !selectedOfficerId) return;

    setSubmitting(true);
    try {
      await apiFetch("/assignments/gov-admin/delegate", {
        method: "POST",
        body: JSON.stringify({
          projectId: selectedProject.id,
          officerUserId: selectedOfficerId,
          reason,
        }),
      });

      toast.success("Assigned", `Project '${selectedProject.title}' assigned to Designated Nodal Officer.`);
      setSelectedProject(null);
      setSelectedOfficerId("");
      setReason("");
      fetchData();
    } catch (err) {
      toast.error("Assignment Failed", err instanceof Error ? err.message : "Failed to assign officer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GovPortalLayout>
      <GovPageHeader
        title="Department Officer Assignment Queue"
        breadcrumb="Projects / Assignments"
        description="Designate project officers for approved department CSR projects."
        actions={
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchData}>
            Refresh Queue
          </Button>
        }
      />

      <AssignmentTabs />

      <div className="space-y-6">
        {/* Org Banner */}
        <div className="p-4 bg-indigo-50/80 border border-indigo-200/60 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 size={20} className="text-indigo-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-indigo-900">
                Department Organization Administrator
              </p>
              <p className="text-xs text-indigo-700">
                Designate nodal officers within your department organization to manage approved project execution.
              </p>
            </div>
          </div>
          <Badge variant="primary" size="md">
            Gov Org Admin
          </Badge>
        </div>

        {/* Queue Table */}
        <Card variant="outlined" hover={false} tilt={false}>
          <CardHeader>
            <CardTitle>Department Projects Queue ({projects.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-400">Loading department queue...</div>
            ) : projects.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                No projects pending officer designation in department.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 border-b border-slate-100/80">
                    <tr>
                      <SortableTh sortKey="title" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Project</SortableTh>
                      <SortableTh sortKey="sector" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sector / District</SortableTh>
                      <SortableTh sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</SortableTh>
                      <SortableTh sortKey="currentOwner" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Designated Officer</SortableTh>
                      <SortableTh sortKey="delegationStatus" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Delegation</SortableTh>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {sortedProjects.map((proj) => (
                      <tr key={proj.id} className="hover:bg-indigo-50/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{proj.title}</p>
                          <p className="text-[10px] font-mono text-slate-400">{proj.projectCode}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-slate-700">{proj.sector}</p>
                          <p className="text-[10px] text-slate-400">{proj.district}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={proj.status === "APPROVED" ? "success" : "muted"} size="sm">
                            {proj.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {proj.currentOwner || "Unassigned"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={proj.delegationStatus === "DELEGATED" ? "success" : "warning"}
                            size="sm"
                            dot
                          >
                            {proj.delegationStatus === "DELEGATED" ? "Designated" : "Pending Designation"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              icon={History}
                              onClick={() => setHistoryProject(proj)}
                              title="View assignment history"
                            >
                              History
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              icon={UserCheck}
                              onClick={() => setSelectedProject(proj)}
                            >
                              {proj.delegationStatus === "DELEGATED" ? "Re-designate" : "Designate Officer"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Designation Modal */}
      {selectedProject && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedProject(null)}
          title={`Designate Department Nodal Officer — ${selectedProject.projectCode}`}
        >
          <form onSubmit={handleDelegate} className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 mb-2">
                Project: <strong>{selectedProject.title}</strong>
              </p>
            </div>

            <div>
              <label htmlFor="officer-select" className="block text-xs font-bold text-slate-600 mb-1">
                Select Designated Nodal Officer in Same Department *
              </label>
              <select
                id="officer-select"
                value={selectedOfficerId}
                onChange={(e) => setSelectedOfficerId(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-200/60 rounded-xl text-sm focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10"
                required
              >
                <option value="">Select department officer...</option>
                {officers.map((off) => (
                  <option
                    key={off.id}
                    value={off.id}
                    disabled={!off.isValid}
                  >
                    {off.name} ({off.roleName}) {off.disabledReason ? `— ${off.disabledReason}` : ""}
                  </option>
                ))}
              </select>
              {officers.length === 0 && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  No officers found in department organization.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="designation-reason" className="block text-xs font-bold text-slate-600 mb-1">
                Designation Reason / Instructions
              </label>
              <textarea
                id="designation-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Department project execution instructions..."
                className="w-full h-20 px-3 py-2 bg-white border border-slate-200/60 rounded-xl text-sm resize-none focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100/60">
              <Button variant="ghost" size="sm" type="button" onClick={() => setSelectedProject(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" loading={submitting} disabled={!selectedOfficerId}>
                Confirm Designation
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* History Modal */}
      {historyProject && (
        <Modal
          isOpen={true}
          onClose={() => setHistoryProject(null)}
          title={`Assignment History — ${historyProject.projectCode}`}
        >
          <div className="space-y-3">
            {historyProject.history.length === 0 ? (
              <p className="text-xs text-slate-400">No previous assignment records.</p>
            ) : (
              historyProject.history.map((h: any, i: number) => (
                <div key={h.id || i} className="p-3 bg-slate-50 rounded-xl border border-slate-200/40 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-800">{h.assignmentType}</span>
                    <Badge variant={h.status === "ACTIVE" ? "success" : "muted"} size="sm">
                      {h.status}
                    </Badge>
                  </div>
                  <p className="text-slate-500 mt-1">Assigned to: <span className="font-mono">{h.assignedToId}</span></p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{new Date(h.assignedAt).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
    </GovPortalLayout>
  );
}

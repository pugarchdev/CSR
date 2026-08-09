"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2, Clock, Upload, AlertCircle, Plus,
  ShieldCheck, FileText, Check, X, Camera, ChevronRight
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToastActions } from "@/components/ui/Toast";

interface MilestoneEvidence {
  id: string;
  fileUrl: string;
  title: string;
  description: string | null;
  createdAt: string;
}

interface Milestone {
  id: string;
  name: string;
  description: string | null;
  sequenceOrder: number;
  targetAmount: number;
  utilizedAmount: number;
  dueDate: string | null;
  status: string;
  createdByType: string;
  verificationStatus: string;
  verificationRemarks: string | null;
  evidences?: MilestoneEvidence[];
}

interface ProjectMilestoneTrackerProps {
  projectId: string;
  userRole?: string;
  onMilestonesUpdated?: () => void;
}

export function ProjectMilestoneTracker({
  projectId,
  userRole = "GOVERNMENT_OFFICER",
  onMilestonesUpdated
}: ProjectMilestoneTrackerProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState<Milestone | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState<Milestone | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [progressRemarks, setProgressRemarks] = useState("");

  const [verifyRemarks, setVerifyRemarks] = useState("");

  const toast = useToastActions();

  useEffect(() => {
    fetchMilestones();
  }, [projectId]);

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/milestones/project/${projectId}`);
      const data = await res.json();
      if (data.data) {
        setMilestones(data.data);
      }
    } catch {
      toast.error("Error", "Failed to fetch project milestones");
    } finally {
      setLoading(false);
    }
  };

  const handleProposeMilestone = async () => {
    if (!newTitle.trim() || !newAmount) {
      toast.error("Validation Error", "Title and Target Amount are required");
      return;
    }
    try {
      const res = await fetch("/api/v1/milestones/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          createdByType: userRole === "NGO_ADMIN" ? "IMPLEMENTING_AGENCY" : "GOVERNMENT_DEPARTMENT",
          items: [
            {
              name: newTitle.trim(),
              targetAmount: parseFloat(newAmount),
              dueDate: newDueDate || undefined
            }
          ]
        })
      });
      const data = await res.json();
      if (data.data) {
        toast.success("Milestone Proposed", "Milestone proposal added.");
        setShowProposeModal(false);
        setNewTitle("");
        setNewAmount("");
        setNewDueDate("");
        fetchMilestones();
        if (onMilestonesUpdated) onMilestonesUpdated();
      }
    } catch {
      toast.error("Error", "Failed to propose milestone");
    }
  };

  const handleApprovePlan = async () => {
    try {
      const res = await fetch(`/api/v1/milestones/project/${projectId}/approve-plan`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Plan Approved", "Proposed milestones approved by Government.");
        fetchMilestones();
        if (onMilestonesUpdated) onMilestonesUpdated();
      }
    } catch {
      toast.error("Error", "Failed to approve milestone plan");
    }
  };

  const handleSubmitProgress = async () => {
    if (!showProgressModal) return;
    try {
      const res = await fetch(`/api/v1/milestones/${showProgressModal.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progressRemarks,
          evidenceFiles: evidenceUrl ? [{ fileUrl: evidenceUrl, title: evidenceTitle || "Deliverable Evidence" }] : []
        })
      });
      const data = await res.json();
      if (data.data) {
        toast.success("Progress Submitted", "Milestone progress & evidence submitted for verification.");
        setShowProgressModal(null);
        setEvidenceUrl("");
        setEvidenceTitle("");
        setProgressRemarks("");
        fetchMilestones();
      }
    } catch {
      toast.error("Error", "Failed to submit milestone progress");
    }
  };

  const handleVerify = async (decision: "VERIFIED" | "REJECTED") => {
    if (!showVerifyModal) return;
    try {
      const res = await fetch(`/api/v1/milestones/${showVerifyModal.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, remarks: verifyRemarks })
      });
      const data = await res.json();
      if (data.data) {
        toast.success("Verification Completed", `Milestone marked as ${decision}`);
        setShowVerifyModal(null);
        setVerifyRemarks("");
        fetchMilestones();
        if (onMilestonesUpdated) onMilestonesUpdated();
      }
    } catch {
      toast.error("Error", "Failed to verify milestone");
    }
  };

  const hasUnapprovedProposals = milestones.some((m) => m.status === "SUBMITTED" || m.status === "DRAFT");

  if (loading) {
    return (
      <Card className="border border-slate-200/60 shadow-sm p-6 text-center text-slate-400 text-sm">
        Loading Project Milestones...
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200/60 shadow-sm space-y-4 p-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Project Execution Milestones</h3>
          <p className="text-xs text-slate-500">
            IA / Corporate proposes detailed milestones • DNO approves plan and verifies deliverables.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasUnapprovedProposals && (userRole === "GOVERNMENT_OFFICER" || userRole === "DISTRICT_NODAL_OFFICER") && (
            <Button variant="outline" size="sm" icon={ShieldCheck} onClick={handleApprovePlan}>
              Approve Milestone Plan
            </Button>
          )}
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowProposeModal(true)}>
            Propose Milestone
          </Button>
        </div>
      </div>

      {milestones.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/50 space-y-2">
          <p className="text-sm font-semibold text-slate-700">No milestones proposed yet.</p>
          <p className="text-xs text-slate-500">
            The executing agency or corporate can propose implementation milestones for government approval.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map((m, idx) => {
            const isVerified = m.status === "VERIFIED" || m.status === "COMPLETED";
            const isSubmitted = m.status === "SUBMITTED_FOR_VERIFICATION";

            return (
              <div
                key={m.id}
                className="p-4 rounded-xl border border-slate-200/70 bg-white hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                      {m.sequenceOrder || idx + 1}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{m.name}</h4>
                    <Badge variant={isVerified ? "success" : isSubmitted ? "warning" : "muted"} size="sm">
                      {m.status}
                    </Badge>
                  </div>
                  {m.description && <p className="text-xs text-slate-500">{m.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                    <span>Target: <strong>₹{Number(m.targetAmount).toLocaleString()}</strong></span>
                    {m.dueDate && <span>Due: <strong>{new Date(m.dueDate).toLocaleDateString()}</strong></span>}
                    <span>Proposer: <strong className="uppercase">{m.createdByType.replace("_", " ")}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {m.status === "APPROVED" && (
                    <Button variant="outline" size="sm" icon={Upload} onClick={() => setShowProgressModal(m)}>
                      Submit Progress & Evidence
                    </Button>
                  )}
                  {isSubmitted && (userRole === "GOVERNMENT_OFFICER" || userRole === "DISTRICT_NODAL_OFFICER") && (
                    <Button variant="primary" size="sm" icon={ShieldCheck} onClick={() => setShowVerifyModal(m)}>
                      Verify Milestone
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Propose Milestone Modal */}
      {showProposeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Propose Execution Milestone</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Milestone Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Equipment Procurement & Installation"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Amount (₹) *</label>
                <input
                  type="number"
                  placeholder="500000"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Expected Completion Date</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowProposeModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleProposeMilestone}>Propose</Button>
            </div>
          </div>
        </div>
      )}

      {/* Progress & Evidence Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Submit Progress & Evidence</h3>
            <p className="text-xs text-slate-500">Milestone: <strong>{showProgressModal.name}</strong></p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Progress Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Installation completed and tested on site."
                  value={progressRemarks}
                  onChange={(e) => setProgressRemarks(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Evidence Photo / Document URL</label>
                <input
                  type="text"
                  placeholder="https://storage.mahacsr.gov.in/evidence/site-photo.jpg"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowProgressModal(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleSubmitProgress}>Submit for Verification</Button>
            </div>
          </div>
        </div>
      )}

      {/* DNO Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="text-emerald-600" size={20} />
              DNO Field & Document Verification
            </h3>
            <p className="text-xs text-slate-500">Milestone: <strong>{showVerifyModal.name}</strong></p>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Verification Remarks</label>
              <textarea
                rows={3}
                placeholder="Inspected site deliverables on-ground. Work satisfies government criteria."
                value={verifyRemarks}
                onChange={(e) => setVerifyRemarks(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowVerifyModal(null)}>Cancel</Button>
              <Button variant="outline" size="sm" onClick={() => handleVerify("REJECTED")}>Reject / Request Changes</Button>
              <Button variant="primary" size="sm" onClick={() => handleVerify("VERIFIED")}>Verify & Complete</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

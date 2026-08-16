"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Camera,
  FileText,
  AlertTriangle,
  MessageSquare,
  Layers,
  Archive,
  CheckSquare
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

export default function ProjectExecutionPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<"kickoff" | "site" | "plan" | "milestones" | "issues" | "communications" | "closure">("kickoff");

  // Reassignment Modal State
  const [reassignmentReason, setReassignmentReason] = useState("");
  const [showReassignModal, setShowReassignModal] = useState(false);

  // Communications State
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // New Issue State
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [issueSeverity, setIssueSeverity] = useState("MEDIUM");

  // Kickoff checklist state
  const [kickoffChecklist, setKickoffChecklist] = useState({
    deptConfirmed: true,
    locationConfirmed: true,
    govtOfficerConfirmed: true,
    corporateContactConfirmed: true,
    timelineDiscussed: true
  });

  // Site verification state
  const [siteStatus, setSiteStatus] = useState("VERIFIED");
  const [siteRemarks, setSiteRemarks] = useState("");

  const fetchProjectData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/convergence-projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load project details");
      setProject(data.data || null);

      // Fetch communications
      const commRes = await fetch(`${API_BASE_URL}/convergence-projects/${projectId}/communications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const commData = await commRes.json();
      if (commRes.ok) setMessages(commData.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load project execution data");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) fetchProjectData();
  }, [projectId, fetchProjectData]);

  const handleDnoAccept = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/convergence-projects/${projectId}/dno-accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to accept assignment");
      setSuccess("DNO Assignment Accepted successfully.");
      fetchProjectData();
    } catch (err: any) {
      setError(err.message || "Acceptance failed");
    }
  };

  const handleRequestReassignment = async () => {
    if (!reassignmentReason.trim()) return;
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/convergence-projects/${projectId}/dno-request-reassignment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: reassignmentReason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request reassignment");
      setSuccess("Reassignment requested.");
      setShowReassignModal(false);
      fetchProjectData();
    } catch (err: any) {
      setError(err.message || "Reassignment request failed");
    }
  };

  const handleCompleteKickoff = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/convergence-projects/${projectId}/kickoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kickoffChecklist })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to complete kickoff");
      setSuccess("Project kickoff completed.");
      fetchProjectData();
    } catch (err: any) {
      setError(err.message || "Kickoff submission failed");
    }
  };

  const handleSubmitSiteVerification = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/convergence-projects/${projectId}/site-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ siteVerificationStatus: siteStatus, inspectionReport: { remarks: siteRemarks } })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit site verification");
      setSuccess("Field site verification submitted.");
      fetchProjectData();
    } catch (err: any) {
      setError(err.message || "Site verification failed");
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/convergence-projects/${projectId}/communications`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: newMessage })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message");
      setNewMessage("");
      fetchProjectData();
    } catch (err: any) {
      setError(err.message || "Failed to send message");
    }
  };

  const handleCreateIssue = async () => {
    if (!issueTitle.trim() || !issueDescription.trim()) return;
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/convergence-projects/${projectId}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: issueTitle, description: issueDescription, severity: issueSeverity })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to raise issue");
      setSuccess("Project issue raised.");
      setIssueTitle("");
      setIssueDescription("");
      fetchProjectData();
    } catch (err: any) {
      setError(err.message || "Issue creation failed");
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-900 mb-2" />
        <span className="text-xs font-semibold">Loading 23-Step Project Execution Engine...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">
              <ShieldCheck size={16} />
              <span>Project Execution & Monitoring Workspace</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{project?.title || "CSR Project Execution"}</h1>
            <p className="text-slate-500 text-xs mt-1">
              Code: <span className="font-mono text-slate-700 font-bold">{project?.projectCode}</span> | District: {project?.district} | Status: <strong className="text-blue-900">{project?.status}</strong>
            </p>
          </div>

          {/* DNO Acceptance Banner Buttons */}
          {project?.dnoAssignmentStatus !== "ACCEPTED" ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDnoAccept}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 size={15} />
                <span>Accept DNO Assignment</span>
              </button>
              <button
                onClick={() => setShowReassignModal(true)}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all"
              >
                Request Reassignment
              </button>
            </div>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              <CheckCircle2 size={14} /> DNO Assignment Accepted
            </span>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-bold text-slate-600 border-b border-slate-100 pb-2">
          {[
            { id: "kickoff", label: "3. Kickoff", icon: CheckSquare },
            { id: "site", label: "4-5. Site Inspection", icon: Camera },
            { id: "plan", label: "6-7. Implementation Plan", icon: FileText },
            { id: "milestones", label: "10-12. Milestones", icon: Layers },
            { id: "issues", label: "13-14. Issues", icon: AlertTriangle },
            { id: "communications", label: "15. Audit Chat", icon: MessageSquare },
            { id: "closure", label: "18-23. Closure & Monitoring", icon: Archive }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-blue-900 text-white shadow-sm"
                    : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}

      {/* TAB CONTENT */}

      {/* 3. KICKOFF */}
      {activeTab === "kickoff" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm text-xs">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare size={18} className="text-blue-900" />
            <span>Government-Side Project Kickoff Checklist</span>
          </h3>

          <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {Object.entries({
              deptConfirmed: "Department ownership & operational scope confirmed",
              locationConfirmed: "Project site & hospital/office location confirmed",
              govtOfficerConfirmed: "Government nodal officer & head confirmed",
              corporateContactConfirmed: "Corporate partner & Implementing Agency representative confirmed",
              timelineDiscussed: "Implementation target timeline & milestones discussed"
            }).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(kickoffChecklist as any)[key]}
                  onChange={(e) => setKickoffChecklist({ ...kickoffChecklist, [key]: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-900"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleCompleteKickoff}
              className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold shadow-sm"
            >
              Complete Kickoff Phase
            </button>
          </div>
        </div>
      )}

      {/* 4-5. SITE INSPECTION */}
      {activeTab === "site" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm text-xs">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Camera size={18} className="text-blue-900" />
            <span>Field Site Verification & Infrastructure Inspection</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Infrastructure Site Readiness</label>
              <select
                value={siteStatus}
                onChange={(e) => setSiteStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold"
              >
                <option value="VERIFIED">VERIFIED (Site ready for execution)</option>
                <option value="PARTIALLY_VERIFIED">PARTIALLY VERIFIED (Minor upgrades needed)</option>
                <option value="NOT_AVAILABLE">NOT AVAILABLE (Site not accessible)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Inspection Remarks & Technical Notes</label>
              <textarea
                rows={3}
                placeholder="e.g. Internet bandwidth needs to be upgraded before equipment installation..."
                value={siteRemarks}
                onChange={(e) => setSiteRemarks(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSubmitSiteVerification}
              className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold shadow-sm"
            >
              Submit Site Inspection Report
            </button>
          </div>
        </div>
      )}

      {/* 13-14. ISSUES */}
      {activeTab === "issues" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6 shadow-sm text-xs">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" />
              <span>Project Issue Tracker & Departmental Escalations</span>
            </h3>
            <p className="text-slate-500 text-xs">Raise operational bottlenecks and track resolution.</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="font-bold text-slate-900">Raise New Issue</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Issue Title..."
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold"
              />
              <select
                value={issueSeverity}
                onChange={(e) => setIssueSeverity(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl bg-white font-bold"
              >
                <option value="LOW">Severity: LOW</option>
                <option value="MEDIUM">Severity: MEDIUM</option>
                <option value="HIGH">Severity: HIGH</option>
                <option value="CRITICAL">Severity: CRITICAL</option>
              </select>
            </div>
            <textarea
              rows={2}
              placeholder="Detailed description of operational bottleneck..."
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold"
            />
            <button
              onClick={handleCreateIssue}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-sm"
            >
              Raise Issue
            </button>
          </div>

          {/* Issue List */}
          <div className="space-y-3">
            {project?.issues?.length === 0 ? (
              <div className="text-center p-6 text-slate-400 font-semibold">No issues reported for this project.</div>
            ) : (
              project?.issues?.map((issue: any) => (
                <div key={issue.id} className="p-4 rounded-xl border border-slate-200 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{issue.title}</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                        issue.severity === "CRITICAL" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {issue.severity}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1">{issue.description}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {issue.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 15. COMMUNICATIONS */}
      {activeTab === "communications" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm text-xs">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare size={18} className="text-blue-900" />
            <span>Project Communication Audit Log</span>
          </h3>

          <div className="h-60 overflow-y-auto bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-slate-400 font-semibold p-8">No messages recorded in project audit log yet.</div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>{m.senderRole}</span>
                    <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-slate-800 font-semibold">{m.message}</div>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type official communication..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl font-semibold"
            />
            <button
              onClick={handleSendMessage}
              className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold flex items-center gap-1.5"
            >
              <Send size={15} />
              <span>Send</span>
            </button>
          </div>
        </div>
      )}

      {/* Reassignment Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl text-xs">
            <h3 className="text-base font-bold text-slate-900">Request DNO Reassignment</h3>
            <textarea
              rows={3}
              placeholder="Reason for requesting DNO reassignment..."
              value={reassignmentReason}
              onChange={(e) => setReassignmentReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowReassignModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestReassignment}
                className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl"
              >
                Confirm Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { Button } from "@/components/ui/Button";
import { X, HelpCircle, ShieldCheck, MapPin, AlertTriangle, FileText } from "lucide-react";

export default function ProjectVerificationQueue() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReq, setSelectedReq] = useState<any | null>(null);

  // Verification form states
  const [remarks, setRemarks] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any[]>("/csr-requirements/verification-queue");
      setQueue(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load verification queue");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: "APPROVE" | "REJECT" | "CLARIFICATION" | "FIELD_VERIFICATION") => {
    if (!selectedReq) return;
    if (action === "REJECT" && !rejectionReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }
    if (!remarks.trim() && action !== "REJECT") {
      alert("Please provide verification remarks.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch(`/csr-requirements/${selectedReq.id}/verify`, {
        method: "POST",
        body: JSON.stringify({
          action,
          remarks,
          rejectionReason: action === "REJECT" ? rejectionReason : undefined,
          priorityLevel: priority
        })
      });
      alert(`Requirement successfully updated to status: ${action}`);
      setSelectedReq(null);
      setRemarks("");
      setRejectionReason("");
      fetchQueue();
    } catch (err: any) {
      alert(err.message || "Failed to update requirement status");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900 font-sans"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b pb-4 border-slate-200">
        <h1 className="text-xl font-bold font-heading text-blue-950">District Verification Queue</h1>
        <p className="text-xs text-slate-500">Verify and list social/rural requirements submitted by Beneficiary Agencies to the CSR marketplace</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verification list queue */}
        <div className="lg:col-span-2 space-y-4">
          <GovCard>
            <GovCardHeader className="bg-slate-50 border-b flex justify-between items-center">
              <GovCardTitle>Pending Requirements ({queue.length})</GovCardTitle>
            </GovCardHeader>
            <GovCardBody className="p-0">
              {queue.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <p className="font-semibold text-slate-700">Verification Queue is Empty</p>
                  <p className="text-xs mt-1">There are no pending requirements awaiting verification in your district.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {queue.map((req) => (
                    <div
                      key={req.id}
                      onClick={() => {
                        setSelectedReq(req);
                        setRemarks(req.verificationRemarks || "");
                        setPriority(req.priorityLevel || "MEDIUM");
                      }}
                      className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer flex justify-between items-start gap-4 ${
                        selectedReq?.id === req.id ? "bg-slate-50 border-l-4 border-blue-900" : ""
                      }`}
                    >
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-900 text-sm">{req.title}</h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">{req.category}</span>
                          <span className="flex items-center gap-0.5"><MapPin size={12} /> {req.district}, {req.taluka}</span>
                          <span className="font-bold text-slate-700">₹{Number(req.estimatedCost).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 pt-1">{req.description}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <GovStatusBadge variant={req.status === "FIELD_VERIFICATION_REQUIRED" ? "warning" : "info"}>
                          {req.status.replace(/_/g, " ")}
                        </GovStatusBadge>
                        <span className="text-[10px] text-slate-400 font-sans">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GovCardBody>
          </GovCard>
        </div>

        {/* Verification Detail & Action Panel */}
        <div className="space-y-4">
          {selectedReq ? (
            <GovCard className="sticky top-20">
              <GovCardHeader className="bg-slate-50 border-b">
                <GovCardTitle>Verification Panel</GovCardTitle>
              </GovCardHeader>
              <GovCardBody className="space-y-4 text-xs">
                {/* Title & Desc */}
                <div className="space-y-1 border-b pb-3">
                  <h3 className="font-bold text-slate-900 text-sm">{selectedReq.title}</h3>
                  <div className="flex justify-between font-semibold text-slate-700 mt-1">
                    <span>Cost: ₹{Number(selectedReq.estimatedCost).toLocaleString()}</span>
                    <span>Reach: {selectedReq.beneficiaryCount} lives</span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed pt-2">{selectedReq.description}</p>
                </div>

                {/* Supporting Documents */}
                <div className="space-y-2 border-b pb-3">
                  <h4 className="font-bold text-slate-800">Uploaded Supporting Documents</h4>
                  {selectedReq.documents.length === 0 ? (
                    <p className="text-slate-400 italic">No supporting documents uploaded.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedReq.documents.map((doc: any) => (
                        <a
                          key={doc.id}
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-blue-900 hover:underline font-bold"
                        >
                          <FileText size={14} className="shrink-0" />
                          <span className="truncate">{doc.fileName}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Form */}
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Set Priority Level</label>
                    <select
                      className="w-full border rounded px-2.5 py-1.5 bg-white text-slate-700"
                      value={priority}
                      onChange={e => setPriority(e.target.value)}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Verification Remarks *</label>
                    <textarea
                      required
                      placeholder="Add inspection notes, verification remarks, or instructions for the beneficiary."
                      className="w-full border rounded px-2.5 py-1.5"
                      rows={3}
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Rejection Reason (Required if Rejecting)</label>
                    <textarea
                      placeholder="Why is this requirement rejected?"
                      className="w-full border rounded px-2.5 py-1.5 border-red-200 focus:ring-red-500"
                      rows={2}
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    onClick={() => handleAction("APPROVE")}
                    disabled={submitting}
                    className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 flex items-center justify-center gap-1 border-none"
                  >
                    <ShieldCheck size={14} /> Approve & List
                  </Button>
                  <Button
                    onClick={() => handleAction("FIELD_VERIFICATION")}
                    disabled={submitting}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 flex items-center justify-center gap-1 border-none"
                  >
                    <AlertTriangle size={14} /> Field Verify
                  </Button>
                  <Button
                    onClick={() => handleAction("CLARIFICATION")}
                    disabled={submitting}
                    className="bg-blue-900 hover:bg-blue-950 text-white font-bold py-2 flex items-center justify-center gap-1 border-none"
                  >
                    <HelpCircle size={14} /> Clarify Info
                  </Button>
                  <Button
                    onClick={() => handleAction("REJECT")}
                    disabled={submitting}
                    className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 flex items-center justify-center gap-1 border-none"
                  >
                    <X size={14} /> Reject Request
                  </Button>
                </div>
              </GovCardBody>
            </GovCard>
          ) : (
            <div className="bg-slate-50 border rounded-lg p-6 text-center text-slate-400 italic text-xs">
              Select a requirement from the queue to review and perform verification actions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

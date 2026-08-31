"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, CheckCircle2, Clock, ShieldCheck,
  AlertCircle, FileCheck, PenTool
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToastActions } from "@/components/ui/Toast";

interface MouVersion {
  id: string;
  versionNumber: number;
  documentUrl: string;
  changesSummary: string | null;
  status: string;
  createdAt: string;
}

interface MouRecord {
  id: string;
  projectId: string;
  mouNumber: string;
  title: string;
  status: string;
  signingType: "DIGITAL" | "PHYSICAL";
  mouRequired: boolean;
  pdfDocumentUrl: string | null;
  signedPdfUrl: string | null;
  currentVersion: number;
  signedAt: string | null;
  versions?: MouVersion[];
}

interface MouWorkflowManagerProps {
  projectId: string;
  projectTitle: string;
  userRole?: string;
  onMouStatusChange?: (status: string) => void;
}

export function MouWorkflowManager({
  projectId,
  projectTitle,
  userRole: _userRole = "GOVERNMENT_OFFICER",
  onMouStatusChange
}: MouWorkflowManagerProps) {
  const [mou, setMou] = useState<MouRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [signedUrlInput, setSignedUrlInput] = useState("");
  const [showSignModal, setShowSignModal] = useState(false);
  const toast = useToastActions();

  const fetchMouDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/mou/project/${projectId}`);
      const data = await res.json();
      if (data.data) {
        setMou(data.data);
        if (onMouStatusChange) onMouStatusChange(data.data.status);
      } else {
        setMou(null);
      }
    } catch {
      toast.error("Error", "Failed to fetch MoU details");
    } finally {
      setLoading(false);
    }
  }, [projectId, onMouStatusChange, toast]);

  useEffect(() => {
    fetchMouDetails();
  }, [fetchMouDetails]);

  const handleInitiateMou = async () => {
    try {
      const res = await fetch("/api/v1/mou/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId })
      });
      const data = await res.json();
      if (data.data) {
        setMou(data.data);
        toast.success("MoU Initiated", "MoU draft has been created for project review.");
        if (onMouStatusChange) onMouStatusChange(data.data.status);
      }
    } catch {
      toast.error("Error", "Failed to initiate MoU");
    }
  };

  const handleUpdateStatus = async (newStatus: string, changesSummary: string) => {
    if (!mou) return;
    try {
      const res = await fetch(`/api/v1/mou/${mou.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, changesSummary })
      });
      const data = await res.json();
      if (data.data) {
        setMou(data.data);
        toast.success("MoU Updated", `MoU status updated to ${newStatus}`);
        if (onMouStatusChange) onMouStatusChange(data.data.status);
      }
    } catch {
      toast.error("Error", "Failed to update MoU status");
    }
  };

  const handleRecordSignature = async (signingType: "DIGITAL" | "PHYSICAL") => {
    if (!mou || !signedUrlInput.trim()) {
      toast.error("Validation Error", "Please provide a valid signed document URL");
      return;
    }
    try {
      setUploadingPdf(true);
      const res = await fetch(`/api/v1/mou/${mou.id}/signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signedPdfUrl: signedUrlInput.trim(),
          signingType
        })
      });
      const data = await res.json();
      if (data.data) {
        setMou(data.data);
        toast.success("MoU Signed", "Signed MoU document recorded successfully.");
        setShowSignModal(false);
        if (onMouStatusChange) onMouStatusChange(data.data.status);
      }
    } catch {
      toast.error("Error", "Failed to record MoU signature");
    } finally {
      setUploadingPdf(false);
    }
  };

  if (loading) {
    return (
      <Card className="border border-slate-200/60 shadow-sm p-6 text-center text-slate-400 text-sm">
        Loading MoU Workflow Status...
      </Card>
    );
  }

  if (!mou) {
    return (
      <Card className="border border-slate-200/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="text-blue-600" size={18} />
            Memorandum of Understanding (MoU) Governance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={18} />
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-900">MoU Workflow Not Initiated</p>
              <p>
                An MoU formalizes corporate commitments and government oversight for <strong>{projectTitle}</strong> prior to milestone execution.
              </p>
            </div>
          </div>
          <Button variant="primary" size="sm" icon={PenTool} onClick={handleInitiateMou}>
            Initiate MoU Workflow
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isSigned = mou.status === "SIGNED";

  return (
    <Card className="border border-slate-200/60 shadow-sm space-y-4 p-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">{mou.title}</h3>
            <Badge variant={isSigned ? "success" : "warning"} size="sm">
              {mou.status}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 font-mono">{mou.mouNumber} • Version v{mou.currentVersion}</p>
        </div>

        {!isSigned && (
          <div className="flex items-center gap-2">
            {mou.status === "DRAFT" && (
              <Button variant="outline" size="sm" onClick={() => handleUpdateStatus("CORPORATE_REVIEW", "Submitted for Corporate Review")}>
                Submit Corporate Review
              </Button>
            )}
            {mou.status === "CORPORATE_REVIEW" && (
              <Button variant="outline" size="sm" onClick={() => handleUpdateStatus("GOVT_REVIEW", "Submitted for Govt Review")}>
                Submit Govt Review
              </Button>
            )}
            {mou.status === "GOVT_REVIEW" && (
              <Button variant="outline" size="sm" onClick={() => handleUpdateStatus("LEGAL_REVIEW", "Submitted for Legal Approval")}>
                Submit Legal Review
              </Button>
            )}
            {(mou.status === "LEGAL_REVIEW" || mou.status === "APPROVED") && (
              <Button variant="primary" size="sm" icon={FileCheck} onClick={() => setShowSignModal(true)}>
                Record Signature
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Progress Timeline */}
      <div className="grid grid-cols-5 gap-2 text-center text-xs">
        {["DRAFT", "CORPORATE_REVIEW", "GOVT_REVIEW", "LEGAL_REVIEW", "SIGNED"].map((st, idx) => {
          const activeIndex = ["DRAFT", "CORPORATE_REVIEW", "GOVT_REVIEW", "LEGAL_REVIEW", "SIGNED"].indexOf(mou.status);
          const isDone = activeIndex > idx || isSigned;
          const isCurrent = activeIndex === idx && !isSigned;

          return (
            <div
              key={st}
              className={`p-2 rounded-lg border transition-all ${
                isDone
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-medium"
                  : isCurrent
                  ? "bg-blue-50 border-blue-300 text-blue-900 font-bold ring-2 ring-blue-400/20"
                  : "bg-slate-50 border-slate-200 text-slate-400"
              }`}
            >
              {isDone ? (
                <CheckCircle2 size={14} className="mx-auto text-emerald-600 mb-1" />
              ) : (
                <Clock size={14} className="mx-auto text-slate-400 mb-1" />
              )}
              {st.replace("_", " ")}
            </div>
          );
        })}
      </div>

      {/* Documents & Versions */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/50 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <FileText className="text-slate-500" size={16} />
          <span className="text-slate-700 font-medium">
            {isSigned ? "Executed MoU PDF Document" : "Draft MoU Document (v" + mou.currentVersion + ")"}
          </span>
        </div>
        {(mou.signedPdfUrl || mou.pdfDocumentUrl) && (
          <a
            href={mou.signedPdfUrl || mou.pdfDocumentUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
          >
            View Document →
          </a>
        )}
      </div>

      {/* Record Signature Modal */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="text-emerald-600" size={20} />
              Record MoU Signature
            </h3>
            <p className="text-xs text-slate-500">
              Provide the URL to the signed MoU document (digital e-Sign or physically scanned PDF).
            </p>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Signed Document PDF URL *
              </label>
              <input
                type="text"
                placeholder="https://storage.mahacsr.gov.in/mou/signed-mou.pdf"
                value={signedUrlInput}
                onChange={(e) => setSignedUrlInput(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowSignModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={uploadingPdf}
                onClick={() => handleRecordSignature("DIGITAL")}
              >
                {uploadingPdf ? "Recording..." : "Record Digital Signature"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={uploadingPdf}
                onClick={() => handleRecordSignature("PHYSICAL")}
              >
                Upload Scanned PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

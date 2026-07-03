"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageShell from "@/components/gov/GovPageShell";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovStatusBadge, { statusToVariant } from "@/components/gov/GovStatusBadge";
import GovAlert from "@/components/gov/GovAlert";
import GovTextarea from "@/components/gov/GovTextarea";
import GovInput from "@/components/gov/GovInput";
import AccessDenied from "@/components/gov/AccessDenied";
import { apiFetch, clearApiCache } from "@/lib/api";
import { hasRoleAccess, JS_ROLES } from "@/lib/roleAccess";

interface Photo {
  id: string;
  fileUrl: string;
  latitude: number;
  longitude: number;
}

interface NodalOfficer {
  id: string;
  name: string;
  email: string;
  assignedDistrict: string;
}

interface PitchDetail {
  id: string;
  pitchReferenceId: string;
  officialName: string;
  designation: string;
  department: string;
  officeName: string;
  serviceClass: string;
  mobile: string;
  email: string;
  district: string;
  taluka: string;
  exactLocation: string;
  csrRequirement: string;
  estimatedCost: number | string;
  govtFundDeclaration: boolean;
  certificationType: string;
  hodCertificationDocument: string | null;
  status: string;
  submittedAt: string;
  jsApprovalDueAt: string;
  photos: Photo[];
  feasibilityAssessment?: {
    id: string;
    reportReference: string;
    summaryOfInteraction: string;
    feasibilityResult: string;
    recommendation: string;
    suggestedNodalOfficerDomain?: string;
    checklistItems?: {
      itemNumber: number;
      dimension: string;
      checkText: string;
      answer: string;
      remarks: string | null;
    }[];
    nodalOfficerAppointment?: {
      id: string;
      nodalOfficerName: string;
      designation: string;
      department: string;
      district: string;
      appointedAt: string;
      appointmentLetterUrl: string | null;
    } | null;
  };
}

export default function JSGovernmentPitchDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [pitch, setPitch] = useState<PitchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Approval Form
  const [decision, setDecision] = useState<"JS_APPROVED" | "JS_REJECTED" | "">("");
  const [remarks, setRemarks] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [submitError, setSubmitError] = useState("");

  // Nodal appointment form
  const [nodalOfficers, setNodalOfficers] = useState<NodalOfficer[]>([]);
  const [selectedNodalId, setSelectedNodalId] = useState("");
  const [nodalDesignation, setNodalDesignation] = useState("District Nodal Officer");
  const [nodalDepartment, setNodalDepartment] = useState("");
  const [collectorCc, setCollectorCc] = useState(true);
  const [zpCeoCc, setZpCeoCc] = useState(true);
  const [signedLetterUrl, setSignedLetterUrl] = useState("");
  const [appointLoading, setAppointLoading] = useState(false);
  const [appointSuccess, setAppointSuccess] = useState("");
  const [appointError, setAppointError] = useState("");

  useEffect(() => { setMounted(true); }, []);

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<PitchDetail>(`/government-pitches/${id}`);
      setPitch(res || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load pitch details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchNodalOfficers = useCallback(async () => {
    try {
      const res = await apiFetch<{ success: boolean; data: NodalOfficer[] }>("/js/nodal-officers");
      setNodalOfficers(res?.data || []);
    } catch (err) {
      console.error("Failed to load nodal officers", err);
    }
  }, []);

  useEffect(() => {
    if (mounted && hasRoleAccess(JS_ROLES)) {
      fetchDetails();
      fetchNodalOfficers();
    }
  }, [mounted, fetchDetails, fetchNodalOfficers]);

  useEffect(() => {
    if (pitch?.feasibilityAssessment?.suggestedNodalOfficerDomain) {
      setNodalDepartment(pitch.feasibilityAssessment.suggestedNodalOfficerDomain);
    }
  }, [pitch]);

  const handleNodalAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppointError("");
    setAppointSuccess("");

    if (!pitch?.feasibilityAssessment?.id) {
      setAppointError("No feasibility assessment found for this pitch");
      return;
    }
    if (!selectedNodalId) { setAppointError("Please select a nodal officer"); return; }
    if (!nodalDesignation.trim()) { setAppointError("Designation is required"); return; }
    if (!nodalDepartment.trim()) { setAppointError("Department/Domain is required"); return; }

    const officer = nodalOfficers.find((o) => o.id === selectedNodalId);
    if (!officer) { setAppointError("Invalid nodal officer selection"); return; }

    setAppointLoading(true);
    try {
      await apiFetch(`/js/assessments/${pitch.feasibilityAssessment.id}/nodal-officer`, {
        method: "POST",
        body: JSON.stringify({
          district: officer.assignedDistrict,
          domain: nodalDepartment.trim(),
          nodalOfficerUserId: selectedNodalId,
          nodalOfficerName: officer.name,
          designation: nodalDesignation.trim(),
          department: nodalDepartment.trim(),
          appointmentLetterUrl: signedLetterUrl.trim() || null,
          collectorCc,
          zpCeoCc,
        }),
      });
      setAppointSuccess("Nodal officer appointed successfully.");
      clearApiCache();
      fetchDetails();
    } catch (err: unknown) {
      setAppointError(err instanceof Error ? err.message : "Failed to appoint nodal officer");
    } finally {
      setAppointLoading(false);
    }
  };

  if (!mounted) return null;
  if (!hasRoleAccess(JS_ROLES)) return <AccessDenied requiredRoles={["Joint Secretary", "Admin"]} />;

  if (loading) {
    return (
      <GovPortalLayout>
        <div style={{ textAlign: "center", padding: 64 }}>
          <div style={{ width: 36, height: 36, border: "3px solid var(--gov-border)", borderTopColor: "var(--gov-primary)", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ color: "var(--gov-text-muted)" }}>Loading government pitch details…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </GovPortalLayout>
    );
  }

  if (error || !pitch) {
    return (
      <GovPortalLayout>
        <GovPageShell breadcrumb="Home / Pitch Approvals / Detail" title="Government Pitch Not Found">
          <GovAlert variant="danger">{error || "Pitch not found"}</GovAlert>
          <GovButton variant="muted" onClick={() => router.push("/js/government-pitches")} style={{ marginTop: 12 }}>← Back</GovButton>
        </GovPageShell>
      </GovPortalLayout>
    );
  }

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const fmtCurrency = (v: number | string) => `₹${Number(v).toLocaleString("en-IN")}`;

  const handleApproveReject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");

    if (!decision) { setSubmitError("Please select a decision"); return; }
    if (decision === "JS_REJECTED" && (!rejectionReason.trim() || rejectionReason.trim().length < 10)) {
      setSubmitError("Rejection reason must be at least 10 characters");
      return;
    }

    setSubmitLoading(true);
    try {
      await apiFetch(`/government-pitches/${pitch.id}/approve`, {
        method: "POST",
        body: JSON.stringify({
          status: decision,
          remarks: remarks.trim() || undefined,
          rejectionReason: decision === "JS_REJECTED" ? rejectionReason.trim() : undefined,
        }),
      });
      setSubmitSuccess(`Government pitch ${decision === "JS_APPROVED" ? "approved" : "rejected"} successfully.`);
      clearApiCache();
      fetchDetails();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to record approval decision");
    } finally {
      setSubmitLoading(false);
    }
  };

  const isAlreadyDecided = pitch.status === "JS_APPROVED" || pitch.status === "JS_REJECTED" || pitch.status === "PUBLIC_LISTED";

  return (
    <GovPortalLayout>
      <GovPageShell
        breadcrumb={`Home / Pitches / ${pitch.pitchReferenceId}`}
        title={`Government Pitch — ${pitch.pitchReferenceId}`}
        description={`Review government pitch details, geo-tagged photos, and approve for public portal listing.`}
        actions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <GovStatusBadge variant={statusToVariant(pitch.status)} style={{ fontSize: 13, padding: "6px 14px" }}>
              {pitch.status.replace(/_/g, " ")}
            </GovStatusBadge>
            <GovButton variant="muted" onClick={() => router.push("/js/government-pitches")}>← Back to List</GovButton>
          </div>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, marginTop: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Pitch Details */}
            <GovCard>
              <GovCardHeader><GovCardTitle>🏛️ Department Requirement details</GovCardTitle></GovCardHeader>
              <GovCardBody style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div><strong>Department:</strong> {pitch.department}</div>
                  <div><strong>Office:</strong> {pitch.officeName}</div>
                  <div><strong>Official:</strong> {pitch.officialName} ({pitch.designation})</div>
                  <div><strong>Service Class:</strong> {pitch.serviceClass}</div>
                  <div><strong>Contact Info:</strong> {`${pitch.email} / ${pitch.mobile}`}</div>
                  <div><strong>Location:</strong> {`${pitch.exactLocation}, ${pitch.taluka}, ${pitch.district}`}</div>
                  <div><strong>Estimated Cost:</strong> {fmtCurrency(pitch.estimatedCost)}</div>
                  <div><strong>Govt Fund Declaration:</strong> {pitch.govtFundDeclaration ? "Confirmed (No budget duplication)" : "No Declaration"}</div>
                  <div><strong>Certification Type:</strong> {pitch.certificationType === "HOD" ? "HOD Certificate" : "Self Certified"}</div>
                </div>

                <div style={{ borderTop: "1px solid var(--gov-border)", paddingTop: 12 }}>
                  <strong>CSR Requirement details:</strong>
                  <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--gov-text-secondary)", whiteSpace: "pre-wrap" }}>
                    {pitch.csrRequirement}
                  </p>
                </div>

                {pitch.hodCertificationDocument && (
                  <div style={{ borderTop: "1px solid var(--gov-border)", paddingTop: 12 }}>
                    <strong>HOD Certification Document:</strong>
                    <a href={pitch.hodCertificationDocument} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 4 }}>
                      Download HOD Certification Document
                    </a>
                  </div>
                )}
              </GovCardBody>
            </GovCard>

            {/* Geo-tagged Photos */}
            <GovCard>
              <GovCardHeader><GovCardTitle>📸 Geo-tagged Field Photos</GovCardTitle></GovCardHeader>
              <GovCardBody>
                {pitch.photos.length === 0 ? (
                  <p style={{ color: "var(--gov-text-muted)", margin: 0 }}>No photos uploaded.</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                    {pitch.photos.map((photo) => (
                      <div key={photo.id} style={{ border: "1px solid var(--gov-border)", borderRadius: 4, padding: 8 }}>
                        <img src={photo.fileUrl} alt="Site" style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 2 }} />
                        <div style={{ fontSize: 11, color: "var(--gov-text-muted)", marginTop: 8 }}>
                          <div>Lat: {photo.latitude}</div>
                          <div>Long: {photo.longitude}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GovCardBody>
            </GovCard>

            {/* RM Feasibility Verification */}
            {pitch.feasibilityAssessment && (
              <GovCard>
                <GovCardHeader><GovCardTitle>📋 RM Verification Remarks</GovCardTitle></GovCardHeader>
                <GovCardBody>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
                    <div><strong>RM Report Ref:</strong> {pitch.feasibilityAssessment.reportReference}</div>
                    <div><strong>Verification Result:</strong> {pitch.feasibilityAssessment.feasibilityResult}</div>
                  </div>
                  <div><strong>RM Summary Note:</strong> {pitch.feasibilityAssessment.summaryOfInteraction}</div>
                  {pitch.feasibilityAssessment.recommendation && (
                    <div style={{ marginTop: 8 }}><strong>Recommendation:</strong> {pitch.feasibilityAssessment.recommendation}</div>
                  )}
                </GovCardBody>
              </GovCard>
            )}

            {/* Actions Panel */}
            {!isAlreadyDecided ? (
              <GovCard>
                <GovCardHeader><GovCardTitle>⚖️ JS Approval Action</GovCardTitle></GovCardHeader>
                <GovCardBody>
                  {submitSuccess && <GovAlert variant="success">{submitSuccess}</GovAlert>}
                  {submitError && <GovAlert variant="danger">{submitError}</GovAlert>}

                  <form onSubmit={handleApproveReject}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div>
                        <label className="gov-label">Decision *</label>
                        <select className="gov-select" value={decision} onChange={(e) => setDecision(e.target.value as any)} required>
                          <option value="">Select Action</option>
                          <option value="JS_APPROVED">Approve for Public Listing</option>
                          <option value="JS_REJECTED">Reject / Decline</option>
                        </select>
                      </div>

                      {decision === "JS_REJECTED" && (
                        <GovTextarea
                          label="Rejection Reason *"
                          placeholder="Please explain the reason for rejecting this pitch..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          required
                        />
                      )}

                      <GovTextarea
                        label="Decision Remarks (Optional)"
                        placeholder="Add review remarks..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                      />

                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <GovButton type="submit" disabled={submitLoading}>
                          {submitLoading ? "Submitting…" : "Record Decision"}
                        </GovButton>
                      </div>
                    </div>
                  </form>
                </GovCardBody>
              </GovCard>
            ) : (
              <>
                <GovCard>
                  <GovCardHeader><GovCardTitle>⚖️ JS Decision Recorded</GovCardTitle></GovCardHeader>
                  <GovCardBody>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div><strong>Approval Status:</strong> {pitch.status.replace(/_/g, " ")}</div>
                      <div><strong>Decided Date:</strong> {fmtDate(pitch.submittedAt)}</div>
                    </div>
                  </GovCardBody>
                </GovCard>

                {pitch.feasibilityAssessment && (
                  <GovCard style={{ marginTop: 20 }}>
                    <GovCardHeader>
                      <GovCardTitle>🎖️ District Nodal Officer Appointment</GovCardTitle>
                    </GovCardHeader>
                    <GovCardBody>
                      {pitch.feasibilityAssessment.nodalOfficerAppointment ? (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                          <div><strong>Appointed Officer:</strong> {pitch.feasibilityAssessment.nodalOfficerAppointment.nodalOfficerName}</div>
                          <div><strong>Designation:</strong> {pitch.feasibilityAssessment.nodalOfficerAppointment.designation}</div>
                          <div><strong>Department:</strong> {pitch.feasibilityAssessment.nodalOfficerAppointment.department}</div>
                          <div><strong>District:</strong> {pitch.feasibilityAssessment.nodalOfficerAppointment.district}</div>
                          <div><strong>Appointed At:</strong> {fmtDate(pitch.feasibilityAssessment.nodalOfficerAppointment.appointedAt)}</div>
                          {pitch.feasibilityAssessment.nodalOfficerAppointment.appointmentLetterUrl && (
                            <div>
                              <strong>Letter:</strong> <a href={pitch.feasibilityAssessment.nodalOfficerAppointment.appointmentLetterUrl} target="_blank" rel="noopener noreferrer">View Letter</a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          {appointSuccess && <GovAlert variant="success">{appointSuccess}</GovAlert>}
                          {appointError && <GovAlert variant="danger">{appointError}</GovAlert>}
                          
                          <form onSubmit={handleNodalAppointment}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                              <div>
                                <label className="gov-label">Assign Nodal Officer *</label>
                                <select className="gov-select" value={selectedNodalId} onChange={(e) => setSelectedNodalId(e.target.value)} required>
                                  <option value="">Select Officer</option>
                                  {nodalOfficers.map((o) => (
                                    <option key={o.id} value={o.id}>{`${o.name} (${o.assignedDistrict}) — ${o.email}`}</option>
                                  ))}
                                </select>
                              </div>

                              <GovInput
                                label="Officer Designation *"
                                value={nodalDesignation}
                                onChange={(e) => setNodalDesignation(e.target.value)}
                                required
                              />

                              <GovInput
                                label="Department / Domain *"
                                value={nodalDepartment}
                                onChange={(e) => setNodalDepartment(e.target.value)}
                                required
                              />

                              <GovInput
                                label="Appointment Letter Document URL (Optional)"
                                placeholder="Link to signed appointment letter document"
                                value={signedLetterUrl}
                                onChange={(e) => setSignedLetterUrl(e.target.value)}
                              />

                              <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                                  <input type="checkbox" checked={collectorCc} onChange={(e) => setCollectorCc(e.target.checked)} />
                                  Send CC to District Collector
                                </label>
                                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                                  <input type="checkbox" checked={zpCeoCc} onChange={(e) => setZpCeoCc(e.target.checked)} />
                                  Send CC to ZP CEO
                                </label>
                              </div>

                              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                <GovButton type="submit" disabled={appointLoading}>
                                  {appointLoading ? "Appointing…" : "Issue Appointment Letter"}
                                </GovButton>
                              </div>
                            </div>
                          </form>
                        </div>
                      )}
                    </GovCardBody>
                  </GovCard>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <h3 className="gov-section-title">Case Metadata</h3>
            <GovCard>
              <GovCardBody style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--gov-text-muted)" }}>Submitted At</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{fmtDate(pitch.submittedAt)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--gov-text-muted)" }}>Approval SLA Due</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{fmtDate(pitch.jsApprovalDueAt)}</div>
                </div>
              </GovCardBody>
            </GovCard>
          </div>
        </div>
      </GovPageShell>
    </GovPortalLayout>
  );
}

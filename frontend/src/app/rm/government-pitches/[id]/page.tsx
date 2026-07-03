"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovStatusBadge, { statusToVariant } from "@/components/gov/GovStatusBadge";
import GovButton from "@/components/gov/GovButton";
import GovAlert from "@/components/gov/GovAlert";
import GovTextarea from "@/components/gov/GovTextarea";
import { useApiQuery, useApiMutation } from "@/lib/apiHooks";
import { ArrowLeft, CheckCircle2, AlertTriangle, FileText, MapPin, Building, Image, Download } from "lucide-react";

interface PitchPhoto {
  id: string;
  fileUrl: string;
  latitude: number | null;
  longitude: number | null;
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
  estimatedCost: number;
  govtFundDeclaration: boolean;
  certificationType: string;
  hodCertificationDocument: string | null;
  status: string;
  submittedAt: string | null;
  verificationDueAt: string | null;
  photos: PitchPhoto[];
}

export default function RMPitchDetailPage() {
  const params = useParams();
  const pitchId = params.id as string;
  const router = useRouter();

  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: pitch, isLoading, refetch } = useApiQuery<PitchDetail>(
    ["rm", "pitch", pitchId],
    `/government-pitches/${pitchId}`,
    { staleTime: 30 * 1000, enabled: !!pitchId }
  );

  const verifyMutation = useApiMutation<void, { status: string; remarks: string }>(
    "POST",
    `/rm/pitches/${pitchId}/verify`,
    {
      onSuccess: () => {
        setSuccess("Government pitch verified successfully and submitted to JS");
        refetch();
        setTimeout(() => {
          router.push("/rm/government-pitches");
        }, 2000);
      },
      onError: (err: any) => {
        setError(err.message || "Verification failed. Please check criteria.");
      }
    }
  );

  const handleAction = async (status: string) => {
    setError(null);
    setSuccess(null);

    if (!remarks.trim()) {
      setError("Verification remarks are required");
      return;
    }

    try {
      await verifyMutation.mutateAsync({ status, remarks });
    } catch {
      // Handled by onError mutation callback
    }
  };

  if (isLoading) {
    return (
      <GovPortalLayout>
        <div style={{ padding: 100, textAlign: "center", color: "var(--gov-text-muted)" }}>Loading pitch details...</div>
      </GovPortalLayout>
    );
  }

  if (!pitch) {
    return (
      <GovPortalLayout>
        <div style={{ padding: 24 }}>
          <GovAlert variant="danger">Government pitch not found.</GovAlert>
          <Link href="/rm/government-pitches">
            <GovButton variant="secondary" style={{ marginTop: 16 }}>
              <ArrowLeft size={16} style={{ marginRight: 8 }} /> Back to Queue
            </GovButton>
          </Link>
        </div>
      </GovPortalLayout>
    );
  }

  // Verification checks
  const photoCheckPassed = pitch ? pitch.photos.length >= 2 : false;
  const fundDeclarationPassed = pitch ? pitch.govtFundDeclaration === true : false;
  const hodCertNeeded = pitch ? pitch.serviceClass === "BELOW_CLASS_2" : false;
  const hodCertUploaded = pitch ? !!pitch.hodCertificationDocument : false;
  const certCheckPassed = !hodCertNeeded || hodCertUploaded;
  const allChecksPassed = photoCheckPassed && fundDeclarationPassed && certCheckPassed;

  return (
    <GovPortalLayout>
      <GovPageHeader
        title={`Pitch ${pitch.pitchReferenceId}`}
        description="Verify government official development need proposal card"
        breadcrumb="Home / Pitches / Detail"
        actions={
          <Link href="/rm/government-pitches">
            <GovButton variant="secondary">
              <ArrowLeft size={16} style={{ marginRight: 8 }} /> Back to Queue
            </GovButton>
          </Link>
        }
      />

      {error && <GovAlert variant="danger" style={{ marginBottom: 20 }}>{error}</GovAlert>}
      {success && <GovAlert variant="success" style={{ marginBottom: 20 }}>{success}</GovAlert>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Pitch Official Details */}
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Government Department Profile</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <span style={{ display: "block", fontSize: 12, color: "var(--gov-text-muted)" }}>OFFICIAL NAME</span>
                  <span style={{ fontWeight: 600 }}>{pitch.officialName}</span>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: 12, color: "var(--gov-text-muted)" }}>DESIGNATION & CLASS</span>
                  <span style={{ fontWeight: 600 }}>{pitch.designation} ({pitch.serviceClass})</span>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: 12, color: "var(--gov-text-muted)" }}>DEPARTMENT</span>
                  <span>{pitch.department}</span>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: 12, color: "var(--gov-text-muted)" }}>OFFICE NAME</span>
                  <span>{pitch.officeName}</span>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: 12, color: "var(--gov-text-muted)" }}>EMAIL</span>
                  <span>{pitch.email}</span>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: 12, color: "var(--gov-text-muted)" }}>MOBILE</span>
                  <span>{pitch.mobile}</span>
                </div>
              </div>
            </GovCardBody>
          </GovCard>

          {/* CSR Project Details */}
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Proposed Need & Requirements</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <span style={{ display: "block", fontSize: 12, color: "var(--gov-text-muted)" }}>LOCATION</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, marginTop: 4 }}>
                    <MapPin size={16} />
                    <span>{pitch.exactLocation}, {pitch.taluka}, {pitch.district}</span>
                  </div>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: 12, color: "var(--gov-text-muted)" }}>CSR REQUIREMENT</span>
                  <p style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.5, background: "#f8fafc", padding: 12, borderRadius: 4 }}>
                    {pitch.csrRequirement}
                  </p>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: 12, color: "var(--gov-text-muted)" }}>ESTIMATED COST</span>
                  <span style={{ fontWeight: 800, fontSize: 18, color: "var(--gov-primary)" }}>
                    ₹{Number(pitch.estimatedCost).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </GovCardBody>
          </GovCard>

          {/* Geo-tagged Photos */}
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Geo-Tagged Site Photos ({pitch.photos.length})</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              {pitch.photos.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
                  {pitch.photos.map((photo) => (
                    <div key={photo.id} style={{ border: "1px solid var(--gov-border)", borderRadius: 6, overflow: "hidden", background: "#f8fafc" }}>
                      <img src={photo.fileUrl} alt="Site" style={{ width: "100%", height: 160, objectFit: "cover" }} />
                      <div style={{ padding: 8, fontSize: 11, color: "var(--gov-text-muted)" }}>
                        <div>Lat: {photo.latitude || "—"}</div>
                        <div>Long: {photo.longitude || "—"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 20, textAlign: "center", color: "var(--gov-text-muted)" }}>
                  <Image size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <div>No photos uploaded.</div>
                </div>
              )}
            </GovCardBody>
          </GovCard>
        </div>

        {/* Verification Check & Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Safeguard Checklist Card */}
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Safeguards Verification Checklist</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13 }}>Min 2 Geo-tagged Photos</span>
                  <GovStatusBadge variant={photoCheckPassed ? "success" : "danger"}>
                    {pitch.photos.length} / 2
                  </GovStatusBadge>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13 }}>Non-Govt Budget Declared</span>
                  <GovStatusBadge variant={fundDeclarationPassed ? "success" : "danger"}>
                    {fundDeclarationPassed ? "YES" : "NO"}
                  </GovStatusBadge>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13 }}>HOD Cert (if below Class 2)</span>
                  <GovStatusBadge variant={certCheckPassed ? "success" : "danger"}>
                    {!hodCertNeeded ? "NOT REQ" : hodCertUploaded ? "UPLOADED" : "MISSING"}
                  </GovStatusBadge>
                </div>

                {pitch.hodCertificationDocument && (
                  <div style={{ marginTop: 8, borderTop: "1px solid var(--gov-border)", paddingTop: 8 }}>
                    <span style={{ display: "block", fontSize: 11, color: "var(--gov-text-muted)", marginBottom: 4 }}>HOD DOCUMENT</span>
                    <a href={pitch.hodCertificationDocument} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--gov-link)", fontWeight: 600 }}>
                      <Download size={14} /> Download Certificate
                    </a>
                  </div>
                )}
              </div>
            </GovCardBody>
          </GovCard>

          {/* Verification Console */}
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Verification Console</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              {pitch.status === "RM_VERIFICATION_PENDING" || pitch.status === "SUBMITTED" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <GovTextarea
                    label="Verification Remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter detailed validation logs and verification checks..."
                    rows={4}
                  />

                  <GovButton
                    variant="primary"
                    disabled={!allChecksPassed || verifyMutation.isPending}
                    onClick={() => handleAction("RM_VERIFIED")}
                  >
                    Verify & Send to JS
                  </GovButton>

                  {!allChecksPassed && (
                    <span style={{ fontSize: 11, color: "var(--gov-danger)", textAlign: "center" }}>
                      * Cannot verify. Safeguards checklist must pass.
                    </span>
                  )}
                </div>
              ) : (
                <div>
                  <span style={{ display: "block", fontSize: 12, color: "var(--gov-text-muted)" }}>CURRENT PITCH STATUS</span>
                  <GovStatusBadge variant={statusToVariant(pitch.status)} style={{ marginTop: 6, fontSize: 13 }}>
                    {pitch.status.replace(/_/g, " ")}
                  </GovStatusBadge>
                </div>
              )}
            </GovCardBody>
          </GovCard>
        </div>
      </div>
    </GovPortalLayout>
  );
}

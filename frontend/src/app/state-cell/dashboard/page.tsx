"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovStatusBadge, { statusToVariant } from "@/components/gov/GovStatusBadge";
import { apiFetch } from "@/lib/api";
import {
  Building2,
  FileText,
  AlertTriangle,
  ArrowRight
} from "lucide-react";

// Format date helper
const formatDate = (dateString: string): string => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function StateCellDashboardPage() {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [pitches, setPitches] = useState<any[]>([]);
  const [grievances, setGrievances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [enquiryRes, pitchRes, grievanceRes] = await Promise.all([
        apiFetch<any>("/rm/enquiries?limit=50"),
        apiFetch<any>("/rm/pitches?limit=50"),
        apiFetch<any>("/grievances/my?limit=50"),
      ]);

      setEnquiries(enquiryRes?.data?.enquiries || enquiryRes?.enquiries || enquiryRes || []);
      setPitches(pitchRes?.data || pitchRes || []);
      setGrievances(grievanceRes?.data || grievanceRes || []);
    } catch (err: any) {
      console.error("Error loading dashboard data:", err);
      setError(err?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute stats
  const totalEnquiries = enquiries.length;
  const unassignedEnquiries = enquiries.filter(
    (e) => !e.assignedRelationshipManagerId
  ).length;

  const totalPitches = pitches.length;
  const pendingPitches = pitches.filter(
    (p) => p.status === "RM_VERIFICATION_PENDING" || p.status === "SUBMITTED"
  ).length;

  const totalGrievances = grievances.length;
  const l2Grievances = grievances.filter(
    (g) => g.status === "ESCALATED_TO_STATE_CELL"
  ).length;

  return (
    <GovPortalLayout>
      <GovPageHeader
        title="State CSR Cell Dashboard"
        description="MahaCSR State Cell Operations Control Panel. Oversee corporate enquiries, nodal officer inspects, and Level 2 grievance escalations."
        breadcrumb="Home / Dashboard"
      />

      {error && (
        <div style={{ marginBottom: 20 }}>
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-800 text-xs">
            {error}
          </div>
        </div>
      )}

      {/* KPI Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <GovCard>
          <GovCardBody style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ backgroundColor: "rgba(30, 58, 138, 0.08)", color: "var(--gov-primary)", borderRadius: 8, padding: 12 }}>
              <Building2 size={24} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gov-text-muted)", textTransform: "uppercase" }}>Corporate Enquiries</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--gov-primary)", marginTop: 4 }}>{totalEnquiries}</div>
              <div style={{ fontSize: 11, color: "var(--gov-text-muted)", marginTop: 2 }}>
                <span style={{ color: "var(--gov-danger)", fontWeight: 600 }}>{unassignedEnquiries}</span> awaiting assignment
              </div>
            </div>
          </GovCardBody>
        </GovCard>

        <GovCard>
          <GovCardBody style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ backgroundColor: "rgba(249, 115, 22, 0.08)", color: "var(--gov-secondary)", borderRadius: 8, padding: 12 }}>
              <FileText size={24} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gov-text-muted)", textTransform: "uppercase" }}>Government Pitches</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--gov-secondary)", marginTop: 4 }}>{totalPitches}</div>
              <div style={{ fontSize: 11, color: "var(--gov-text-muted)", marginTop: 2 }}>
                <span style={{ color: "var(--gov-warning)", fontWeight: 600 }}>{pendingPitches}</span> pending RM verification
              </div>
            </div>
          </GovCardBody>
        </GovCard>

        <GovCard>
          <GovCardBody style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ backgroundColor: "rgba(220, 38, 38, 0.08)", color: "var(--gov-danger)", borderRadius: 8, padding: 12 }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gov-text-muted)", textTransform: "uppercase" }}>State Escalations (L2)</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--gov-danger)", marginTop: 4 }}>{l2Grievances}</div>
              <div style={{ fontSize: 11, color: "var(--gov-text-muted)", marginTop: 2 }}>
                Out of <span style={{ fontWeight: 600 }}>{totalGrievances}</span> total grievances
              </div>
            </div>
          </GovCardBody>
        </GovCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
        {/* Unassigned Enquiries Section */}
        <GovCard>
          <GovCardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <GovCardTitle>Unassigned Corporate Enquiries</GovCardTitle>
            <Link href="/rm/enquiries">
              <GovButton variant="secondary" style={{ fontSize: 11, padding: "4px 8px", minHeight: 28 }}>
                View All Enquiries <ArrowRight size={12} style={{ marginLeft: 4 }} />
              </GovButton>
            </Link>
          </GovCardHeader>
          <GovCardBody style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--gov-text-muted)" }}>Loading enquiries...</div>
            ) : enquiries.filter(e => !e.assignedRelationshipManagerId).length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--gov-text-muted)" }}>No unassigned enquiries found.</div>
            ) : (
              <div className="gov-table-container">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>Tracking ID</th>
                      <th>Company Name</th>
                      <th>Sector</th>
                      <th>District</th>
                      <th>Submitted At</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enquiries.filter(e => !e.assignedRelationshipManagerId).slice(0, 5).map((enquiry) => (
                      <tr key={enquiry.id}>
                        <td style={{ fontWeight: 600, color: "var(--gov-link)" }}>{enquiry.trackingId}</td>
                        <td>{enquiry.companyName}</td>
                        <td>{enquiry.sector}</td>
                        <td>{enquiry.district || enquiry.preferredDistricts?.[0] || "—"}</td>
                        <td>{formatDate(enquiry.submittedAt)}</td>
                        <td>
                          <Link href={`/rm/enquiries/${enquiry.id}`}>
                            <GovButton variant="primary" style={{ fontSize: 11, padding: "4px 8px", minHeight: 24 }}>Assign RM</GovButton>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GovCardBody>
        </GovCard>

        {/* L2 Grievances & Pending Pitches */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Grievances Card */}
          <GovCard>
            <GovCardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <GovCardTitle>Escalated Grievances (Level 2)</GovCardTitle>
              <Link href="/state-cell/grievances">
                <GovButton variant="secondary" style={{ fontSize: 11, padding: "4px 8px", minHeight: 28 }}>
                  Grievance Queue
                </GovButton>
              </Link>
            </GovCardHeader>
            <GovCardBody style={{ padding: 0 }}>
              {loading ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--gov-text-muted)" }}>Loading grievances...</div>
              ) : grievances.filter(g => g.status === "ESCALATED_TO_STATE_CELL").length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--gov-text-muted)" }}>No escalated grievances found.</div>
              ) : (
                <div className="gov-table-container">
                  <table className="gov-table">
                    <thead>
                      <tr>
                        <th>Grievance ID</th>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grievances.filter(g => g.status === "ESCALATED_TO_STATE_CELL").slice(0, 5).map((g) => (
                        <tr key={g.id}>
                          <td style={{ fontWeight: 600, color: "var(--gov-link)" }}>{g.grievanceId}</td>
                          <td>{g.issueTitle}</td>
                          <td>
                            <GovStatusBadge variant="danger">Escalated (L2)</GovStatusBadge>
                          </td>
                          <td>
                            <Link href={`/grievances/${g.id}`}>
                              <GovButton variant="secondary" style={{ fontSize: 11, padding: "4px 8px", minHeight: 24 }}>Resolve</GovButton>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GovCardBody>
          </GovCard>

          {/* Pitches Card */}
          <GovCard>
            <GovCardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <GovCardTitle>Pending Government Pitches</GovCardTitle>
              <Link href="/rm/government-pitches">
                <GovButton variant="secondary" style={{ fontSize: 11, padding: "4px 8px", minHeight: 28 }}>
                  Pitches Queue
                </GovButton>
              </Link>
            </GovCardHeader>
            <GovCardBody style={{ padding: 0 }}>
              {loading ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--gov-text-muted)" }}>Loading pitches...</div>
              ) : pitches.filter(p => p.status === "RM_VERIFICATION_PENDING" || p.status === "SUBMITTED").length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--gov-text-muted)" }}>No pending pitches found.</div>
              ) : (
                <div className="gov-table-container">
                  <table className="gov-table">
                    <thead>
                      <tr>
                        <th>Ref ID</th>
                        <th>Department</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pitches.filter(p => p.status === "RM_VERIFICATION_PENDING" || p.status === "SUBMITTED").slice(0, 5).map((pitch) => (
                        <tr key={pitch.id}>
                          <td style={{ fontWeight: 600, color: "var(--gov-link)" }}>{pitch.pitchReferenceId}</td>
                          <td>{pitch.department}</td>
                          <td>
                            <GovStatusBadge variant={statusToVariant(pitch.status)}>
                              {pitch.status === "SUBMITTED" ? "Submitted" : "Verification Pending"}
                            </GovStatusBadge>
                          </td>
                          <td>
                            <Link href={`/rm/government-pitches/${pitch.id}`}>
                              <GovButton variant="secondary" style={{ fontSize: 11, padding: "4px 8px", minHeight: 24 }}>Verify</GovButton>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GovCardBody>
          </GovCard>
        </div>
      </div>
    </GovPortalLayout>
  );
}

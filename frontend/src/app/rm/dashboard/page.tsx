"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { apiFetch } from "@/lib/api";
import { useApiQuery } from "@/lib/apiHooks";
import { 
  Inbox, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  FileText,
  ChevronRight,
  Phone,
  Mail
} from "lucide-react";

// Types
interface DashboardStats {
  totalEnquiries: number;
  pendingResponse: number;
  slaDueSoon: number;
  pendingVerifications: number;
}

interface Enquiry {
  id: string;
  trackingId: string;
  companyName: string;
  sector: string;
  status: "PENDING" | "IN_PROGRESS" | "UNDER_VERIFICATION" | "APPROVED" | "REJECTED" | "ESCALATED";
  slaDue: string;
  submittedAt: string;
  district: string;
}

interface GovernmentPitch {
  id: string;
  trackingId: string;
  departmentName: string;
  projectTitle: string;
  estimatedCost: number;
  status: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED";
  submittedAt: string;
}

// API Functions
const fetchDashboardStats = async (): Promise<DashboardStats> => {
  return apiFetch<DashboardStats>("/rm/dashboard/stats");
};

const fetchRecentEnquiries = async (): Promise<Enquiry[]> => {
  return apiFetch<Enquiry[]>("/rm/enquiries/recent");
};

const fetchPendingPitches = async (): Promise<GovernmentPitch[]> => {
  return apiFetch<GovernmentPitch[]>("/rm/pitches/pending");
};

// Status badge variant mapper
const getStatusVariant = (status: string): "success" | "warning" | "danger" | "info" | "muted" => {
  const statusMap: Record<string, "success" | "warning" | "danger" | "info" | "muted"> = {
    PENDING: "warning",
    IN_PROGRESS: "info",
    UNDER_VERIFICATION: "info",
    APPROVED: "success",
    REJECTED: "danger",
    ESCALATED: "danger",
    PENDING_VERIFICATION: "warning",
    VERIFIED: "success",
  };
  return statusMap[status] || "muted";
};

// Format date helper
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Calculate days remaining for SLA
const getDaysRemaining = (slaDue: string): number => {
  const due = new Date(slaDue);
  const today = new Date();
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export default function RMDashboardPage() {
  const [userName, setUserName] = useState<string>("Relationship Manager");

  const { data: rawStats, isLoading: statsLoading } = useApiQuery<any>(
    ["rm", "dashboard", "stats"],
    "/rm/dashboard?view=summary",
    { staleTime: 60 * 1000 }
  );

  const { data: enquiriesResponse, isLoading: enquiriesLoading } = useApiQuery<any>(
    ["rm", "enquiries", "recent"],
    "/rm/enquiries?limit=5&view=dashboard",
    { staleTime: 60 * 1000 }
  );

  const { data: pitchesResponse, isLoading: pitchesLoading } = useApiQuery<any>(
    ["rm", "pitches", "pending"],
    "/rm/pitches?limit=5&view=dashboard",
    { staleTime: 60 * 1000 }
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("user");
      if (user) {
        try {
          const userData = JSON.parse(user);
          setUserName(userData.name || "Relationship Manager");
        } catch {
          console.error("Error parsing user data");
        }
      }
    }
  }, []);

  const stats: DashboardStats = {
    totalEnquiries: rawStats?.corporateEnquiries?.total ?? 0,
    pendingResponse: rawStats?.corporateEnquiries?.pending ?? 0,
    slaDueSoon: rawStats?.performance?.slaItemsDueSoon ?? 0,
    pendingVerifications: rawStats?.governmentPitches?.pendingVerification ?? 0,
  };

  const recentEnquiries: Enquiry[] = (enquiriesResponse?.data ?? []).map((item: any) => ({
    id: item.id,
    trackingId: item.trackingId,
    companyName: item.companyName,
    sector: item.sector,
    status: item.status,
    slaDue: item.firstResponseDueAt ?? item.updatedAt ?? item.submittedAt,
    submittedAt: item.submittedAt,
    district: item.preferredDistricts?.join(", ") ?? item.preferredDistrict ?? item.district ?? "",
  }));

  const pendingPitches: GovernmentPitch[] = (pitchesResponse?.data ?? []).map((item: any) => ({
    id: item.id,
    trackingId: item.pitchReferenceId,
    departmentName: item.department,
    projectTitle: item.csrRequirement,
    estimatedCost: Number(item.estimatedCost ?? 0),
    status: item.status,
    submittedAt: item.submittedAt,
  }));

  // Stats cards data
  const statCards = [
    { label: "Total Enquiries", value: stats?.totalEnquiries || 0, icon: Inbox, color: "#14274e" },
    { label: "Pending Response", value: stats?.pendingResponse || 0, icon: Clock, color: "#d97706" },
    { label: "SLA Due Soon", value: stats?.slaDueSoon || 0, icon: AlertTriangle, color: "#b91c1c" },
    { label: "Pending Verifications", value: stats?.pendingVerifications || 0, icon: CheckCircle, color: "#166534" },
  ];

  return (
    <GovPortalLayout userRole="CSR_RELATIONSHIP_MANAGER">
      <GovPageHeader
        title={`Welcome, ${userName}`}
        description="CSR Relationship Manager Dashboard - Monitor enquiries, manage corporate interests, and facilitate CSR partnerships"
        breadcrumb="Home / Dashboard"
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/rm/enquiries">
              <GovButton variant="secondary">View All Enquiries</GovButton>
            </Link>
          </div>
        }
      />

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {statCards.map((stat, index) => (
          <GovCard key={index} style={{ animationDelay: `${index * 0.05}s` }} className="animate-fadeIn">
            <GovCardBody>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {stat.label}
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "var(--gov-primary-dark)", marginTop: 4 }}>
                    {statsLoading ? "—" : stat.value}
                  </div>
                </div>
                <div style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 8, 
                  background: `${stat.color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: stat.color
                }}>
                  <stat.icon size={24} />
                </div>
              </div>
            </GovCardBody>
          </GovCard>
        ))}
      </div>

      {/* Main Content Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        {/* Recent Corporate Enquiries */}
        <GovCard>
          <GovCardHeader>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <GovCardTitle>Recent Corporate Enquiries</GovCardTitle>
              <Link href="/rm/enquiries" style={{ fontSize: 13, color: "var(--gov-link)", display: "flex", alignItems: "center", gap: 4 }}>
                View All <ChevronRight size={14} />
              </Link>
            </div>
          </GovCardHeader>
          <GovCardBody style={{ padding: 0 }}>
            {enquiriesLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--gov-text-muted)" }}>
                Loading enquiries...
              </div>
            ) : recentEnquiries && recentEnquiries.length > 0 ? (
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Tracking ID</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>SLA Due</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEnquiries.map((enquiry) => {
                    const daysRemaining = getDaysRemaining(enquiry.slaDue);
                    return (
                      <tr key={enquiry.id}>
                        <td>
                          <Link href={`/rm/enquiries/${enquiry.id}`} style={{ fontWeight: 600, color: "var(--gov-link)" }}>
                            {enquiry.trackingId}
                          </Link>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{enquiry.companyName}</div>
                          <div style={{ fontSize: 12, color: "var(--gov-text-muted)" }}>{enquiry.sector}</div>
                        </td>
                        <td>
                          <GovStatusBadge variant={getStatusVariant(enquiry.status)}>
                            {enquiry.status.replace(/_/g, " ")}
                          </GovStatusBadge>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {daysRemaining <= 2 && <Clock size={14} color="#b91c1c" />}
                            <span style={{ color: daysRemaining <= 2 ? "#b91c1c" : "inherit", fontWeight: daysRemaining <= 2 ? 600 : 400 }}>
                              {formatDate(enquiry.slaDue)}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: daysRemaining <= 2 ? "#b91c1c" : "var(--gov-text-muted)" }}>
                            {daysRemaining > 0 ? `${daysRemaining} days remaining` : daysRemaining === 0 ? "Due today" : `${Math.abs(daysRemaining)} days overdue`}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <Link href={`/rm/enquiries/${enquiry.id}`}>
                              <GovButton variant="secondary" style={{ padding: "6px 10px", fontSize: 12 }}>
                                <Eye size={14} />
                              </GovButton>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 40, textAlign: "center", color: "var(--gov-text-muted)" }}>
                <FileText size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                <div>No recent enquiries found</div>
              </div>
            )}
          </GovCardBody>
        </GovCard>

        {/* Sidebar Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Pending Government Pitches */}
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Pending Government Pitches</GovCardTitle>
            </GovCardHeader>
            <GovCardBody style={{ padding: 0 }}>
              {pitchesLoading ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--gov-text-muted)" }}>
                  Loading pitches...
                </div>
              ) : pendingPitches && pendingPitches.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {pendingPitches.map((pitch) => (
                    <div 
                      key={pitch.id} 
                      style={{ 
                        padding: 16, 
                        borderBottom: "1px solid var(--gov-border)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gov-link)" }}>
                          {pitch.trackingId}
                        </div>
                        <GovStatusBadge variant="warning" style={{ fontSize: 10 }}>Pending</GovStatusBadge>
                      </div>
                      <div style={{ fontWeight: 600 }}>{pitch.projectTitle}</div>
                      <div style={{ fontSize: 12, color: "var(--gov-text-muted)" }}>{pitch.departmentName}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--gov-success)" }}>
                          ₹{(pitch.estimatedCost / 100000).toFixed(1)}L
                        </div>
                        <Link href={`/rm/pitches/${pitch.id}`} style={{ fontSize: 12, color: "var(--gov-link)", display: "flex", alignItems: "center", gap: 2 }}>
                          Review <ChevronRight size={12} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 24, textAlign: "center", color: "var(--gov-text-muted)" }}>
                  <CheckCircle size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <div style={{ fontSize: 13 }}>No pending pitches</div>
                </div>
              )}
            </GovCardBody>
          </GovCard>

          {/* Quick Actions */}
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Quick Actions</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <GovButton variant="secondary" style={{ justifyContent: "flex-start" }}>
                  <FileText size={18} />
                  Create New Enquiry
                </GovButton>
                <GovButton variant="secondary" style={{ justifyContent: "flex-start" }}>
                  <Phone size={18} />
                  Schedule Company Call
                </GovButton>
                <GovButton variant="secondary" style={{ justifyContent: "flex-start" }}>
                  <Mail size={18} />
                  Send Bulk Communication
                </GovButton>
              </div>
            </GovCardBody>
          </GovCard>
        </div>
      </div>
    </GovPortalLayout>
  );
}

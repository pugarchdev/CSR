"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import GovInput from "@/components/gov/GovInput";
import "../../../styles/gov-theme.css";

export default function ApplicationsListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Mock data - replace with API call
  const applications = [
    {
      id: "CSR-NGO-2026-00128",
      ngoName: "Sahyadri Eco Foundation",
      submittedDate: "2026-06-18",
      status: "UNDER_ANALYST_REVIEW",
      district: "Pune",
      organizationType: "TRUST",
      riskLevel: "LOW",
    },
    {
      id: "CSR-NGO-2026-00127",
      ngoName: "Vidarbha Development Society",
      submittedDate: "2026-06-17",
      status: "UNDER_COMPLIANCE_REVIEW",
      district: "Nagpur",
      organizationType: "SOCIETY",
      riskLevel: "MEDIUM",
    },
    {
      id: "CSR-NGO-2026-00126",
      ngoName: "Mumbai Education Trust",
      submittedDate: "2026-06-16",
      status: "APPROVED",
      district: "Mumbai",
      organizationType: "TRUST",
      riskLevel: "LOW",
    },
    {
      id: "CSR-NGO-2026-00125",
      ngoName: "Konkan Welfare Association",
      submittedDate: "2026-06-15",
      status: "QUERY_RAISED",
      district: "Ratnagiri",
      organizationType: "SOCIETY",
      riskLevel: "HIGH",
    },
  ];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "success";
      case "REJECTED":
        return "danger";
      case "QUERY_RAISED":
        return "warning";
      case "UNDER_ANALYST_REVIEW":
      case "UNDER_COMPLIANCE_REVIEW":
        return "info";
      default:
        return "muted";
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "LOW":
        return "#166534";
      case "MEDIUM":
        return "#d97706";
      case "HIGH":
        return "#b91c1c";
      default:
        return "#6b7280";
    }
  };

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.ngoName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "ALL" || app.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <GovPortalLayout userRole="PORTAL_ADMIN">
      <GovPageHeader
        breadcrumb="Home / Admin / Applications"
        title="NGO Onboarding Applications"
        description="Review and verify NGO registration applications"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <GovCard>
          <GovCardBody>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gov-text-muted)", marginBottom: 8 }}>
              Total Applications
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--gov-primary)" }}>
              {applications.length}
            </div>
          </GovCardBody>
        </GovCard>
        <GovCard>
          <GovCardBody>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gov-text-muted)", marginBottom: 8 }}>
              Under Review
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#d97706" }}>
              {applications.filter((a) => a.status.includes("REVIEW")).length}
            </div>
          </GovCardBody>
        </GovCard>
        <GovCard>
          <GovCardBody>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gov-text-muted)", marginBottom: 8 }}>
              Queries Raised
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#d97706" }}>
              {applications.filter((a) => a.status === "QUERY_RAISED").length}
            </div>
          </GovCardBody>
        </GovCard>
        <GovCard>
          <GovCardBody>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gov-text-muted)", marginBottom: 8 }}>
              Approved
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#166534" }}>
              {applications.filter((a) => a.status === "APPROVED").length}
            </div>
          </GovCardBody>
        </GovCard>
      </div>

      {/* Filters */}
      <GovCard style={{ marginBottom: 24 }}>
        <GovCardBody>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
            <div>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 700 }}>
                Search Applications
              </label>
              <GovInput
                type="text"
                placeholder="Search by NGO name or Application ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 700 }}>
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid var(--gov-border)",
                  borderRadius: "var(--gov-radius)",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <option value="ALL">All Status</option>
                <option value="UNDER_ANALYST_REVIEW">Under Analyst Review</option>
                <option value="UNDER_COMPLIANCE_REVIEW">Under Compliance Review</option>
                <option value="QUERY_RAISED">Query Raised</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </GovCardBody>
      </GovCard>

      {/* Applications Table */}
      <GovCard>
        <GovCardHeader>
          <GovCardTitle>Applications List ({filteredApplications.length})</GovCardTitle>
        </GovCardHeader>
        <GovCardBody style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--gov-border)" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "var(--gov-text-muted)" }}>
                    APPLICATION ID
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "var(--gov-text-muted)" }}>
                    NGO NAME
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "var(--gov-text-muted)" }}>
                    TYPE
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "var(--gov-text-muted)" }}>
                    DISTRICT
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "var(--gov-text-muted)" }}>
                    SUBMITTED
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "var(--gov-text-muted)" }}>
                    RISK
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "var(--gov-text-muted)" }}>
                    STATUS
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 800, color: "var(--gov-text-muted)" }}>
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app) => (
                  <tr
                    key={app.id}
                    style={{
                      borderBottom: "1px solid var(--gov-border)",
                      cursor: "pointer",
                      transition: "background-color 0.15s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "var(--gov-bg-secondary)")}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    onClick={() => router.push(`/admin/applications/${app.id}`)}
                  >
                    <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700, color: "var(--gov-primary)" }}>
                      {app.id}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700 }}>
                      {app.ngoName}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 12, fontWeight: 600, color: "var(--gov-text-secondary)" }}>
                      {app.organizationType}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 12, fontWeight: 600, color: "var(--gov-text-secondary)" }}>
                      {app.district}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 12, fontWeight: 600, color: "var(--gov-text-secondary)" }}>
                      {app.submittedDate}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: getRiskColor(app.riskLevel),
                        }}
                      >
                        {app.riskLevel}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <GovStatusBadge variant={getStatusVariant(app.status)}>
                        {app.status.replace(/_/g, " ")}
                      </GovStatusBadge>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <GovButton
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/applications/${app.id}`);
                        }}
                        style={{ fontSize: 12, padding: "6px 12px" }}
                      >
                        Review →
                      </GovButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GovCardBody>
      </GovCard>
    </GovPortalLayout>
  );
}

// Made with Bob

"use client";

import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import "../../../styles/gov-theme.css";

const kpis = [
  { label: "Total Applications", value: "1,248", status: "All onboarding applications", color: "#14274e" },
  { label: "Pending Review", value: "86", status: "Requires analyst action", color: "#d97706" },
  { label: "Query Raised", value: "31", status: "Waiting for NGO response", color: "#92400e" },
  { label: "Approved NGOs", value: "742", status: "Eligible for CSR projects", color: "#166534" },
  { label: "High Risk", value: "12", status: "Compliance review required", color: "#b91c1c" },
  { label: "Payments Pending", value: "19", status: "Finance action required", color: "#005ea8" },
];

const recentApplications = [
  {
    id: "CSR-NGO-2026-00128",
    org: "Aarohan Rural Development Trust",
    state: "Maharashtra",
    status: "Under Review",
    statusVariant: "warning" as const,
    risk: "Medium",
    reviewer: "Compliance Team 1",
  },
  {
    id: "CSR-NGO-2026-00129",
    org: "Seva Foundation",
    state: "Gujarat",
    status: "Query Raised",
    statusVariant: "info" as const,
    risk: "Low",
    reviewer: "Analyst 2",
  },
  {
    id: "CSR-NGO-2026-00130",
    org: "Grameen Vikas Sansthan",
    state: "Maharashtra",
    status: "Approved",
    statusVariant: "success" as const,
    risk: "Low",
    reviewer: "Approver 1",
  },
  {
    id: "CSR-NGO-2026-00131",
    org: "Urban Development Society",
    state: "Maharashtra",
    status: "Rejected",
    statusVariant: "danger" as const,
    risk: "High",
    reviewer: "Compliance Team 2",
  },
];

export default function AdminDashboardPage() {
  return (
    <GovPortalLayout>
      <GovPageHeader
        breadcrumb="Home / Dashboard"
        title="Administrative Dashboard"
        description="Monitor NGO onboarding, verification status, compliance risk, project proposals and fund release activities."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-[18px]">
        {kpis.map((kpi) => (
          <GovCard key={kpi.label}>
            <GovCardBody>
              <div style={{ color: "var(--gov-text-muted)", fontWeight: 700, fontSize: 12 }}>
                {kpi.label}
              </div>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  color: kpi.color,
                  marginTop: 6,
                  marginBottom: 4,
                }}
              >
                {kpi.value}
              </div>
              <div className="gov-help">{kpi.status}</div>
            </GovCardBody>
          </GovCard>
        ))}
      </div>

      {/* Recent Applications Table */}
      <GovCard>
        <GovCardHeader>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <GovCardTitle>Recent Applications</GovCardTitle>
            <GovButton variant="secondary">View All Applications</GovButton>
          </div>
        </GovCardHeader>
        <GovCardBody>
          <div className="overflow-x-auto">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Application ID</th>
                  <th>Organization</th>
                  <th>State</th>
                  <th>Status</th>
                  <th>Risk</th>
                  <th>Assigned Reviewer</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentApplications.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <strong>{app.id}</strong>
                    </td>
                    <td>{app.org}</td>
                    <td>{app.state}</td>
                    <td>
                      <GovStatusBadge variant={app.statusVariant}>{app.status}</GovStatusBadge>
                    </td>
                    <td>{app.risk}</td>
                    <td>{app.reviewer}</td>
                    <td>
                      <GovButton variant="secondary">Open</GovButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GovCardBody>
      </GovCard>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px] mt-[18px]">
        <GovCard>
          <GovCardHeader>
            <GovCardTitle>Pending Actions</GovCardTitle>
          </GovCardHeader>
          <GovCardBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Documents awaiting verification</span>
                <GovStatusBadge variant="warning">42</GovStatusBadge>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Queries pending response</span>
                <GovStatusBadge variant="info">31</GovStatusBadge>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Applications in approval queue</span>
                <GovStatusBadge variant="warning">18</GovStatusBadge>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>High risk flags</span>
                <GovStatusBadge variant="danger">12</GovStatusBadge>
              </div>
            </div>
          </GovCardBody>
        </GovCard>

        <GovCard>
          <GovCardHeader>
            <GovCardTitle>System Statistics</GovCardTitle>
          </GovCardHeader>
          <GovCardBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Average processing time</span>
                <strong>7.2 days</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Approval rate</span>
                <strong>78.4%</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Active reviewers</span>
                <strong>24</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Documents verified today</span>
                <strong>156</strong>
              </div>
            </div>
          </GovCardBody>
        </GovCard>
      </div>
    </GovPortalLayout>
  );
}

// Made with Bob

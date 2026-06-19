"use client";

import { useState } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovSelect from "@/components/gov/GovSelect";
import "../../../styles/gov-theme.css";

const reports = [
  {
    id: "RPT-2026-001",
    title: "Quarterly CSR Compliance Report",
    type: "Compliance",
    period: "Q1 FY 2026-27",
    generatedBy: "System",
    generatedOn: "2026-04-05",
    status: "Available",
    fileSize: "2.4 MB",
  },
  {
    id: "RPT-2026-002",
    title: "NGO Performance Analysis",
    type: "Performance",
    period: "FY 2025-26",
    generatedBy: "Admin Team",
    generatedOn: "2026-04-01",
    status: "Available",
    fileSize: "5.8 MB",
  },
  {
    id: "RPT-2026-003",
    title: "District-wise CSR Spending Report",
    type: "Financial",
    period: "FY 2025-26",
    generatedBy: "Finance Team",
    generatedOn: "2026-03-31",
    status: "Available",
    fileSize: "3.2 MB",
  },
  {
    id: "RPT-2026-004",
    title: "Project Impact Assessment",
    type: "Impact",
    period: "FY 2025-26",
    generatedBy: "Evaluation Team",
    generatedOn: "2026-03-28",
    status: "Available",
    fileSize: "8.6 MB",
  },
  {
    id: "RPT-2026-005",
    title: "Audit Trail Summary",
    type: "Audit",
    period: "March 2026",
    generatedBy: "System",
    generatedOn: "2026-04-01",
    status: "Available",
    fileSize: "1.9 MB",
  },
];

const reportCategories = [
  {
    name: "Compliance Reports",
    description: "CSR compliance and regulatory reports",
    count: 24,
    icon: "📋",
  },
  {
    name: "Financial Reports",
    description: "Budget allocation and spending reports",
    count: 18,
    icon: "💰",
  },
  {
    name: "Performance Reports",
    description: "NGO and project performance analytics",
    count: 32,
    icon: "📊",
  },
  {
    name: "Impact Reports",
    description: "Social impact and outcome assessments",
    count: 15,
    icon: "🎯",
  },
  {
    name: "Audit Reports",
    description: "System audit trails and logs",
    count: 42,
    icon: "🔍",
  },
  {
    name: "Custom Reports",
    description: "User-generated custom reports",
    count: 8,
    icon: "⚙️",
  },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState("all");
  const [period, setPeriod] = useState("all");

  const filteredReports = reports.filter((report) => {
    const matchesType = reportType === "all" || report.type === reportType;
    const matchesPeriod = period === "all" || report.period === period;
    return matchesType && matchesPeriod;
  });

  return (
    <GovPortalLayout>
      <GovPageHeader
        title="Reports & Analytics"
        breadcrumb="Admin / Reports"
        actions={
          <GovButton variant="primary">
            Generate New Report
          </GovButton>
        }
      />

      <div className="gov-container">
        {/* Report Categories */}
        <div className="gov-grid gov-grid-cols-3 gov-gap-6 gov-mb-6">
          {reportCategories.map((category) => (
            <GovCard key={category.name} style={{ cursor: "pointer" }}>
              <GovCardBody>
                <div className="gov-flex gov-items-start gov-gap-3">
                  <div className="gov-text-4xl">{category.icon}</div>
                  <div className="gov-flex-1">
                    <h3 className="gov-text-lg gov-font-semibold gov-mb-1">
                      {category.name}
                    </h3>
                    <p className="gov-text-sm gov-text-muted gov-mb-2">
                      {category.description}
                    </p>
                    <div className="gov-text-2xl gov-font-bold gov-text-primary">
                      {category.count}
                    </div>
                  </div>
                </div>
              </GovCardBody>
            </GovCard>
          ))}
        </div>

        {/* Filters */}
        <GovCard className="gov-mb-6">
          <GovCardBody>
            <div className="gov-grid gov-grid-cols-2 gov-gap-4">
              <GovSelect
                label="Report Type"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="Compliance">Compliance</option>
                <option value="Financial">Financial</option>
                <option value="Performance">Performance</option>
                <option value="Impact">Impact</option>
                <option value="Audit">Audit</option>
              </GovSelect>
              <GovSelect
                label="Period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="all">All Periods</option>
                <option value="Q1 FY 2026-27">Q1 FY 2026-27</option>
                <option value="FY 2025-26">FY 2025-26</option>
                <option value="March 2026">March 2026</option>
              </GovSelect>
            </div>
          </GovCardBody>
        </GovCard>

        {/* Reports List */}
        <GovCard>
          <GovCardHeader>
            <GovCardTitle>Available Reports ({filteredReports.length})</GovCardTitle>
          </GovCardHeader>
          <GovCardBody>
            <div className="gov-table-container">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Report Title</th>
                    <th>Type</th>
                    <th>Period</th>
                    <th>Generated By</th>
                    <th>Generated On</th>
                    <th>File Size</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => (
                    <tr key={report.id}>
                      <td className="gov-font-mono">{report.id}</td>
                      <td className="gov-font-semibold">{report.title}</td>
                      <td>
                        <span className="gov-badge gov-badge-info">{report.type}</span>
                      </td>
                      <td>{report.period}</td>
                      <td className="gov-text-sm">{report.generatedBy}</td>
                      <td className="gov-text-sm">{report.generatedOn}</td>
                      <td className="gov-text-sm">{report.fileSize}</td>
                      <td>
                        <span className="gov-badge gov-badge-success">{report.status}</span>
                      </td>
                      <td>
                        <div className="gov-flex gov-gap-2">
                          <GovButton variant="secondary">Download</GovButton>
                          <GovButton variant="muted">View</GovButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GovCardBody>
        </GovCard>

        {/* Quick Stats */}
        <div className="gov-grid gov-grid-cols-4 gov-gap-6 gov-mt-6">
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Total Reports</div>
              <div className="gov-text-3xl gov-font-bold gov-text-primary">139</div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">All time</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">This Month</div>
              <div className="gov-text-3xl gov-font-bold" style={{ color: "#166534" }}>
                12
              </div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">Generated reports</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Downloads</div>
              <div className="gov-text-3xl gov-font-bold" style={{ color: "#005ea8" }}>
                1,248
              </div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">Total downloads</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Scheduled</div>
              <div className="gov-text-3xl gov-font-bold" style={{ color: "#d97706" }}>
                8
              </div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">Upcoming reports</div>
            </GovCardBody>
          </GovCard>
        </div>
      </div>
    </GovPortalLayout>
  );
}

// Made with Bob

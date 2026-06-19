"use client";

import { useState } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovInput from "@/components/gov/GovInput";
import GovSelect from "@/components/gov/GovSelect";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import "../../../styles/gov-theme.css";

const auditLogs = [
  {
    id: "AUD-2026-001",
    timestamp: "2026-06-19 09:15:23",
    user: "admin@mahacsr.gov.in",
    action: "NGO_APPROVED",
    entity: "Sahyadri Eco Foundation",
    entityId: "NGO-2026-001",
    ipAddress: "103.45.67.89",
    status: "Success",
    statusVariant: "success" as const,
    details: "NGO application approved after document verification",
  },
  {
    id: "AUD-2026-002",
    timestamp: "2026-06-19 08:42:15",
    user: "analyst@mahacsr.gov.in",
    action: "DOCUMENT_VERIFIED",
    entity: "Mumbai Education Trust",
    entityId: "NGO-2026-003",
    ipAddress: "103.45.67.90",
    status: "Success",
    statusVariant: "success" as const,
    details: "All documents verified and marked as authentic",
  },
  {
    id: "AUD-2026-003",
    timestamp: "2026-06-19 08:30:45",
    user: "company@tatamotors.com",
    action: "PROJECT_CREATED",
    entity: "Western Ghats Conservation",
    entityId: "PROJ-2026-001",
    ipAddress: "103.45.67.91",
    status: "Success",
    statusVariant: "success" as const,
    details: "New CSR project created with budget allocation",
  },
  {
    id: "AUD-2026-004",
    timestamp: "2026-06-19 07:55:12",
    user: "ngo@vidarbha.org",
    action: "LOGIN_FAILED",
    entity: "User Account",
    entityId: "USER-2026-045",
    ipAddress: "103.45.67.92",
    status: "Failed",
    statusVariant: "danger" as const,
    details: "Invalid password attempt - 3rd consecutive failure",
  },
  {
    id: "AUD-2026-005",
    timestamp: "2026-06-19 07:20:33",
    user: "admin@mahacsr.gov.in",
    action: "REPORT_GENERATED",
    entity: "Quarterly Compliance Report",
    entityId: "RPT-2026-001",
    ipAddress: "103.45.67.89",
    status: "Success",
    statusVariant: "success" as const,
    details: "Q1 FY 2026-27 compliance report generated",
  },
  {
    id: "AUD-2026-006",
    timestamp: "2026-06-19 06:45:18",
    user: "system@mahacsr.gov.in",
    action: "DATA_BACKUP",
    entity: "Database Backup",
    entityId: "BACKUP-2026-170",
    ipAddress: "127.0.0.1",
    status: "Success",
    statusVariant: "success" as const,
    details: "Automated daily database backup completed",
  },
];

const actionTypes = [
  { value: "all", label: "All Actions" },
  { value: "NGO_APPROVED", label: "NGO Approved" },
  { value: "NGO_REJECTED", label: "NGO Rejected" },
  { value: "DOCUMENT_VERIFIED", label: "Document Verified" },
  { value: "PROJECT_CREATED", label: "Project Created" },
  { value: "PROJECT_UPDATED", label: "Project Updated" },
  { value: "LOGIN_SUCCESS", label: "Login Success" },
  { value: "LOGIN_FAILED", label: "Login Failed" },
  { value: "REPORT_GENERATED", label: "Report Generated" },
  { value: "DATA_BACKUP", label: "Data Backup" },
  { value: "USER_CREATED", label: "User Created" },
  { value: "USER_UPDATED", label: "User Updated" },
];

export default function AuditTrailPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    return matchesSearch && matchesAction && matchesStatus;
  });

  return (
    <GovPortalLayout>
      <GovPageHeader
        title="Audit Trail"
        breadcrumb="Admin / Audit Trail"
      />

      <div className="gov-container">
        {/* Stats Cards */}
        <div className="gov-grid gov-grid-cols-4 gov-gap-6 gov-mb-6">
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Total Events</div>
              <div className="gov-text-3xl gov-font-bold gov-text-primary">12,456</div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">All time logs</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Today</div>
              <div className="gov-text-3xl gov-font-bold" style={{ color: "#166534" }}>
                342
              </div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">Events logged</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Failed Actions</div>
              <div className="gov-text-3xl gov-font-bold" style={{ color: "#b91c1c" }}>
                23
              </div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">Requires attention</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Active Users</div>
              <div className="gov-text-3xl gov-font-bold" style={{ color: "#005ea8" }}>
                156
              </div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">Currently online</div>
            </GovCardBody>
          </GovCard>
        </div>

        {/* Filters */}
        <GovCard className="gov-mb-6">
          <GovCardBody>
            <div className="gov-grid gov-grid-cols-3 gov-gap-4">
              <GovInput
                label="Search Logs"
                placeholder="Search by user, entity, or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <GovSelect
                label="Action Type"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                {actionTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </GovSelect>
              <GovSelect
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="Success">Success</option>
                <option value="Failed">Failed</option>
                <option value="Warning">Warning</option>
              </GovSelect>
            </div>
          </GovCardBody>
        </GovCard>

        {/* Audit Logs */}
        <GovCard>
          <GovCardHeader>
            <GovCardTitle>Audit Logs ({filteredLogs.length})</GovCardTitle>
          </GovCardHeader>
          <GovCardBody>
            <div className="gov-table-container">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Audit ID</th>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Entity ID</th>
                    <th>IP Address</th>
                    <th>Status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="gov-font-mono gov-text-sm">{log.id}</td>
                      <td className="gov-font-mono gov-text-sm">{log.timestamp}</td>
                      <td className="gov-text-sm">{log.user}</td>
                      <td>
                        <span className="gov-badge gov-badge-info">{log.action}</span>
                      </td>
                      <td className="gov-font-semibold">{log.entity}</td>
                      <td className="gov-font-mono gov-text-sm">{log.entityId}</td>
                      <td className="gov-font-mono gov-text-sm">{log.ipAddress}</td>
                      <td>
                        <GovStatusBadge variant={log.statusVariant}>
                          {log.status}
                        </GovStatusBadge>
                      </td>
                      <td className="gov-text-sm">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GovCardBody>
        </GovCard>

        {/* Security Alerts */}
        <GovCard className="gov-mt-6">
          <GovCardHeader>
            <GovCardTitle>Recent Security Alerts</GovCardTitle>
          </GovCardHeader>
          <GovCardBody>
            <div className="gov-space-y-3">
              <div className="gov-flex gov-items-start gov-gap-3 gov-p-3 gov-bg-danger-light gov-rounded">
                <div className="gov-text-2xl">⚠️</div>
                <div className="gov-flex-1">
                  <div className="gov-font-semibold gov-mb-1">Multiple Failed Login Attempts</div>
                  <div className="gov-text-sm gov-text-muted">
                    User ngo@vidarbha.org has 3 consecutive failed login attempts from IP 103.45.67.92
                  </div>
                  <div className="gov-text-xs gov-text-muted gov-mt-1">2 minutes ago</div>
                </div>
              </div>
              <div className="gov-flex gov-items-start gov-gap-3 gov-p-3 gov-bg-warning-light gov-rounded">
                <div className="gov-text-2xl">🔔</div>
                <div className="gov-flex-1">
                  <div className="gov-font-semibold gov-mb-1">Unusual Activity Detected</div>
                  <div className="gov-text-sm gov-text-muted">
                    High volume of document downloads from IP 103.45.67.95 in the last hour
                  </div>
                  <div className="gov-text-xs gov-text-muted gov-mt-1">15 minutes ago</div>
                </div>
              </div>
            </div>
          </GovCardBody>
        </GovCard>
      </div>
    </GovPortalLayout>
  );
}

// Made with Bob

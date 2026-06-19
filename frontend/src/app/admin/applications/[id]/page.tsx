"use client";

import { use } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import GovTextarea from "@/components/gov/GovTextarea";
import GovAlert from "@/components/gov/GovAlert";
import "../../../../styles/gov-theme.css";

const mockDocuments = [
  { name: "Registration Certificate", status: "Verified", statusVariant: "success" as const, risk: "Low" },
  { name: "CSR-1 Certificate", status: "Pending Review", statusVariant: "warning" as const, risk: "Medium" },
  { name: "12A / 12AB Certificate", status: "Verified", statusVariant: "success" as const, risk: "Low" },
  { name: "80G Certificate", status: "Needs Correction", statusVariant: "danger" as const, risk: "High" },
  { name: "Cancelled Cheque", status: "Pending Review", statusVariant: "warning" as const, risk: "Medium" },
  { name: "Bank Statement", status: "Verified", statusVariant: "success" as const, risk: "Low" },
  { name: "Audited Financials", status: "Under Review", statusVariant: "info" as const, risk: "Medium" },
];

export default function AdminApplicationReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <GovPortalLayout userRole="ADMIN">
      <GovPageHeader
        breadcrumb={`Admin / Applications / ${id}`}
        title="NGO Application Review"
        description="Verify statutory documents, financial details, governance records and risk indicators before approval."
        actions={
          <GovButton variant="secondary">Download Review Summary</GovButton>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 18 }}>
        {/* Main Content */}
        <section>
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Application Details</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              <h4 className="gov-section-title">Organization Summary</h4>

              <table className="gov-table">
                <tbody>
                  <tr>
                    <th style={{ width: "30%" }}>Application ID</th>
                    <td>{id}</td>
                  </tr>
                  <tr>
                    <th>Legal Name</th>
                    <td>Aarohan Rural Development Trust</td>
                  </tr>
                  <tr>
                    <th>Entity Type</th>
                    <td>Trust</td>
                  </tr>
                  <tr>
                    <th>PAN</th>
                    <td>AAAAA****F</td>
                  </tr>
                  <tr>
                    <th>Registration Number</th>
                    <td>MAH/2015/12345</td>
                  </tr>
                  <tr>
                    <th>CSR-1 Status</th>
                    <td>
                      <GovStatusBadge variant="warning">Pending Verification</GovStatusBadge>
                    </td>
                  </tr>
                  <tr>
                    <th>District</th>
                    <td>Pune</td>
                  </tr>
                  <tr>
                    <th>FCRA Applicable</th>
                    <td>No</td>
                  </tr>
                  <tr>
                    <th>Submitted On</th>
                    <td>15-Jun-2026</td>
                  </tr>
                </tbody>
              </table>

              <h4 className="gov-section-title" style={{ marginTop: 24 }}>Document Verification</h4>

              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Status</th>
                    <th>Risk</th>
                    <th>Reviewer Action</th>
                  </tr>
                </thead>
                <tbody>
                  {mockDocuments.map((doc) => (
                    <tr key={doc.name}>
                      <td>{doc.name}</td>
                      <td>
                        <GovStatusBadge variant={doc.statusVariant}>{doc.status}</GovStatusBadge>
                      </td>
                      <td>{doc.risk}</td>
                      <td>
                        <GovButton variant="secondary">Review</GovButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h4 className="gov-section-title" style={{ marginTop: 24 }}>Bank Account Details</h4>

              <table className="gov-table">
                <tbody>
                  <tr>
                    <th style={{ width: "30%" }}>Account Holder</th>
                    <td>Aarohan Rural Development Trust</td>
                  </tr>
                  <tr>
                    <th>Bank Name</th>
                    <td>State Bank of India</td>
                  </tr>
                  <tr>
                    <th>Branch</th>
                    <td>Pune Main Branch</td>
                  </tr>
                  <tr>
                    <th>Account Number</th>
                    <td>****6789</td>
                  </tr>
                  <tr>
                    <th>IFSC Code</th>
                    <td>SBIN0001234</td>
                  </tr>
                  <tr>
                    <th>Verification Status</th>
                    <td>
                      <GovStatusBadge variant="warning">Pending Penny Drop</GovStatusBadge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </GovCardBody>
          </GovCard>
        </section>

        {/* Decision Panel */}
        <aside>
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Decision Panel</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              <GovAlert variant="warning">
                2 documents need reviewer attention before approval.
              </GovAlert>

              <h4 className="gov-section-title" style={{ marginTop: 18 }}>Risk Score</h4>

              <div
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "var(--gov-warning)",
                  marginBottom: 4,
                }}
              >
                46 / 100
              </div>
              <p className="gov-help">Medium risk. Compliance review required before approval.</p>

              <h4 className="gov-section-title" style={{ marginTop: 18 }}>Risk Flags</h4>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  style={{
                    padding: 10,
                    border: "1px solid var(--gov-border)",
                    borderRadius: "var(--gov-radius)",
                    fontSize: 12,
                  }}
                >
                  <GovStatusBadge variant="warning">Medium</GovStatusBadge>
                  <div style={{ marginTop: 6 }}>
                    <strong>Document Quality:</strong> 80G certificate expiry date approaching
                  </div>
                </div>
                <div
                  style={{
                    padding: 10,
                    border: "1px solid var(--gov-border)",
                    borderRadius: "var(--gov-radius)",
                    fontSize: 12,
                  }}
                >
                  <GovStatusBadge variant="danger">High</GovStatusBadge>
                  <div style={{ marginTop: 6 }}>
                    <strong>Bank Verification:</strong> Account name mismatch detected
                  </div>
                </div>
              </div>

              <h4 className="gov-section-title" style={{ marginTop: 18 }}>Reviewer Remarks</h4>
              <textarea
                className="gov-textarea"
                rows={5}
                placeholder="Add internal reviewer note..."
                style={{ marginBottom: 16 }}
              />

              <div style={{ display: "grid", gap: 10 }}>
                <GovButton variant="secondary">Raise Query</GovButton>
                <GovButton variant="muted">Mark for Compliance Review</GovButton>
                <GovButton variant="primary">Approve Application</GovButton>
                <GovButton
                  variant="danger"
                  style={{
                    background: "#fee2e2",
                    color: "var(--gov-danger)",
                    borderColor: "#fca5a5",
                  }}
                >
                  Reject Application
                </GovButton>
              </div>
            </GovCardBody>
          </GovCard>

          <GovCard style={{ marginTop: 18 }}>
            <GovCardHeader>
              <GovCardTitle>Activity Log</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Application Submitted</div>
                  <div className="gov-help">15-Jun-2026, 10:30 AM</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>Auto-Check Passed</div>
                  <div className="gov-help">15-Jun-2026, 10:32 AM</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>Assigned to Analyst</div>
                  <div className="gov-help">15-Jun-2026, 11:00 AM</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>Document Review Started</div>
                  <div className="gov-help">16-Jun-2026, 09:15 AM</div>
                </div>
              </div>
            </GovCardBody>
          </GovCard>
        </aside>
      </div>
    </GovPortalLayout>
  );
}

// Made with Bob

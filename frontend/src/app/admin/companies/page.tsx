"use client";

import { useState } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovInput from "@/components/gov/GovInput";
import GovSelect from "@/components/gov/GovSelect";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import "../../../styles/gov-theme.css";

const companies = [
  {
    id: "COMP-2026-001",
    name: "Tata Motors Limited",
    cin: "L28920MH1945PLC004520",
    sector: "Automotive",
    status: "Active",
    statusVariant: "success" as const,
    csrObligation: "₹125.5 Cr",
    spent: "₹132.8 Cr",
    projects: 24,
    lastReport: "2026-03-31",
  },
  {
    id: "COMP-2026-002",
    name: "Infosys Limited",
    cin: "L85110KA1981PLC013115",
    sector: "IT Services",
    status: "Active",
    statusVariant: "success" as const,
    csrObligation: "₹89.2 Cr",
    spent: "₹95.6 Cr",
    projects: 18,
    lastReport: "2026-03-31",
  },
  {
    id: "COMP-2026-003",
    name: "Reliance Industries Limited",
    cin: "L17110MH1973PLC019786",
    sector: "Conglomerate",
    status: "Active",
    statusVariant: "success" as const,
    csrObligation: "₹245.8 Cr",
    spent: "₹256.3 Cr",
    projects: 42,
    lastReport: "2026-03-31",
  },
  {
    id: "COMP-2026-004",
    name: "Mahindra & Mahindra Limited",
    cin: "L65990MH1945PLC004558",
    sector: "Automotive",
    status: "Under Review",
    statusVariant: "warning" as const,
    csrObligation: "₹67.4 Cr",
    spent: "₹58.2 Cr",
    projects: 15,
    lastReport: "2025-12-31",
  },
  {
    id: "COMP-2026-005",
    name: "Wipro Limited",
    cin: "L32102KA1945PLC020800",
    sector: "IT Services",
    status: "Active",
    statusVariant: "success" as const,
    csrObligation: "₹52.3 Cr",
    spent: "₹54.8 Cr",
    projects: 12,
    lastReport: "2026-03-31",
  },
];

export default function CompaniesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("all");

  const filteredCompanies = companies.filter((company) => {
    const matchesSearch =
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.cin.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || company.status === statusFilter;
    const matchesSector = sectorFilter === "all" || company.sector === sectorFilter;
    return matchesSearch && matchesStatus && matchesSector;
  });

  return (
    <GovPortalLayout>
      <GovPageHeader
        title="Registered Companies"
        breadcrumb="Admin / Companies"
      />

      <div className="gov-container">
        {/* Stats Cards */}
        <div className="gov-grid gov-grid-cols-4 gov-gap-6 gov-mb-6">
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Total Companies</div>
              <div className="gov-text-3xl gov-font-bold gov-text-primary">856</div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">Registered entities</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Total CSR Obligation</div>
              <div className="gov-text-3xl gov-font-bold" style={{ color: "#166534" }}>
                ₹2,456 Cr
              </div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">FY 2025-26</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Total Spent</div>
              <div className="gov-text-3xl gov-font-bold" style={{ color: "#005ea8" }}>
                ₹2,589 Cr
              </div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">105% compliance</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Active Projects</div>
              <div className="gov-text-3xl gov-font-bold" style={{ color: "#d97706" }}>
                342
              </div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">Ongoing initiatives</div>
            </GovCardBody>
          </GovCard>
        </div>

        {/* Filters */}
        <GovCard className="gov-mb-6">
          <GovCardBody>
            <div className="gov-grid gov-grid-cols-3 gov-gap-4">
              <GovInput
                label="Search Company"
                placeholder="Search by name or CIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <GovSelect
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Under Review">Under Review</option>
                <option value="Suspended">Suspended</option>
              </GovSelect>
              <GovSelect
                label="Sector"
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
              >
                <option value="all">All Sectors</option>
                <option value="Automotive">Automotive</option>
                <option value="IT Services">IT Services</option>
                <option value="Conglomerate">Conglomerate</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Banking">Banking</option>
              </GovSelect>
            </div>
          </GovCardBody>
        </GovCard>

        {/* Companies List */}
        <GovCard>
          <GovCardHeader>
            <GovCardTitle>Registered Companies ({filteredCompanies.length})</GovCardTitle>
          </GovCardHeader>
          <GovCardBody>
            <div className="gov-table-container">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Company ID</th>
                    <th>Company Name</th>
                    <th>CIN</th>
                    <th>Sector</th>
                    <th>CSR Obligation</th>
                    <th>Amount Spent</th>
                    <th>Projects</th>
                    <th>Last Report</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map((company) => (
                    <tr key={company.id}>
                      <td className="gov-font-mono">{company.id}</td>
                      <td className="gov-font-semibold">{company.name}</td>
                      <td className="gov-font-mono gov-text-sm">{company.cin}</td>
                      <td>
                        <span className="gov-badge gov-badge-info">{company.sector}</span>
                      </td>
                      <td className="gov-font-semibold">{company.csrObligation}</td>
                      <td className="gov-font-semibold">{company.spent}</td>
                      <td className="gov-text-center">{company.projects}</td>
                      <td className="gov-text-sm">{company.lastReport}</td>
                      <td>
                        <GovStatusBadge variant={company.statusVariant}>
                          {company.status}
                        </GovStatusBadge>
                      </td>
                      <td>
                        <div className="gov-flex gov-gap-2">
                          <GovButton variant="secondary">View</GovButton>
                          <GovButton variant="muted">Reports</GovButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GovCardBody>
        </GovCard>
      </div>
    </GovPortalLayout>
  );
}

// Made with Bob

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

const ngos = [
  {
    id: "NGO-2026-001",
    name: "Sahyadri Eco Foundation",
    registrationNo: "MH/2015/0123456",
    district: "Pune",
    focusArea: "Environment",
    status: "Active",
    statusVariant: "success" as const,
    projectsCompleted: 12,
    totalFunding: "₹45,00,000",
    lastAudit: "2026-03-15",
  },
  {
    id: "NGO-2026-002",
    name: "Vidarbha Development Society",
    registrationNo: "MH/2018/0234567",
    district: "Nagpur",
    focusArea: "Rural Development",
    status: "Active",
    statusVariant: "success" as const,
    projectsCompleted: 8,
    totalFunding: "₹32,50,000",
    lastAudit: "2026-02-20",
  },
  {
    id: "NGO-2026-003",
    name: "Mumbai Education Trust",
    registrationNo: "MH/2012/0345678",
    district: "Mumbai",
    focusArea: "Education",
    status: "Under Review",
    statusVariant: "warning" as const,
    projectsCompleted: 15,
    totalFunding: "₹67,80,000",
    lastAudit: "2025-12-10",
  },
  {
    id: "NGO-2026-004",
    name: "Konkan Welfare Association",
    registrationNo: "MH/2019/0456789",
    district: "Ratnagiri",
    focusArea: "Healthcare",
    status: "Active",
    statusVariant: "success" as const,
    projectsCompleted: 6,
    totalFunding: "₹28,90,000",
    lastAudit: "2026-04-05",
  },
  {
    id: "NGO-2026-005",
    name: "Marathwada Social Welfare",
    registrationNo: "MH/2020/0567890",
    district: "Aurangabad",
    focusArea: "Women Empowerment",
    status: "Suspended",
    statusVariant: "danger" as const,
    projectsCompleted: 4,
    totalFunding: "₹15,60,000",
    lastAudit: "2025-11-22",
  },
];

export default function NGORegistryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");

  const filteredNGOs = ngos.filter((ngo) => {
    const matchesSearch =
      ngo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ngo.registrationNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ngo.status === statusFilter;
    const matchesDistrict = districtFilter === "all" || ngo.district === districtFilter;
    return matchesSearch && matchesStatus && matchesDistrict;
  });

  return (
    <GovPortalLayout>
      <GovPageHeader
        title="NGO Registry"
        breadcrumb="Admin / NGO Registry"
      />

      <div className="gov-container">
        {/* Stats Cards */}
        <div className="gov-grid gov-grid-cols-4 gov-gap-6 gov-mb-6">
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Total NGOs</div>
              <div className="gov-text-3xl gov-font-bold gov-text-primary">1,248</div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">Registered organizations</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Active NGOs</div>
              <div className="gov-text-3xl gov-font-bold" style={{ color: "#166534" }}>
                1,156
              </div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">Currently operational</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Under Review</div>
              <div className="gov-text-3xl gov-font-bold" style={{ color: "#d97706" }}>
                67
              </div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">Pending verification</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Suspended</div>
              <div className="gov-text-3xl gov-font-bold" style={{ color: "#b91c1c" }}>
                25
              </div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">Compliance issues</div>
            </GovCardBody>
          </GovCard>
        </div>

        {/* Filters */}
        <GovCard className="gov-mb-6">
          <GovCardBody>
            <div className="gov-grid gov-grid-cols-3 gov-gap-4">
              <GovInput
                label="Search NGO"
                placeholder="Search by name or registration number..."
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
                label="District"
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
              >
                <option value="all">All Districts</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Pune">Pune</option>
                <option value="Nagpur">Nagpur</option>
                <option value="Ratnagiri">Ratnagiri</option>
                <option value="Aurangabad">Aurangabad</option>
              </GovSelect>
            </div>
          </GovCardBody>
        </GovCard>

        {/* NGO List */}
        <GovCard>
          <GovCardHeader>
            <GovCardTitle>Registered NGOs ({filteredNGOs.length})</GovCardTitle>
          </GovCardHeader>
          <GovCardBody>
            <div className="gov-table-container">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>NGO ID</th>
                    <th>Organization Name</th>
                    <th>Registration No.</th>
                    <th>District</th>
                    <th>Focus Area</th>
                    <th>Projects</th>
                    <th>Total Funding</th>
                    <th>Last Audit</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNGOs.map((ngo) => (
                    <tr key={ngo.id}>
                      <td className="gov-font-mono">{ngo.id}</td>
                      <td className="gov-font-semibold">{ngo.name}</td>
                      <td className="gov-font-mono gov-text-sm">{ngo.registrationNo}</td>
                      <td>{ngo.district}</td>
                      <td>
                        <span className="gov-badge gov-badge-info">{ngo.focusArea}</span>
                      </td>
                      <td className="gov-text-center">{ngo.projectsCompleted}</td>
                      <td className="gov-font-semibold">{ngo.totalFunding}</td>
                      <td className="gov-text-sm">{ngo.lastAudit}</td>
                      <td>
                        <GovStatusBadge variant={ngo.statusVariant}>{ngo.status}</GovStatusBadge>
                      </td>
                      <td>
                        <div className="gov-flex gov-gap-2">
                          <GovButton variant="secondary">
                            View
                          </GovButton>
                          <GovButton variant="muted">
                            Audit
                          </GovButton>
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

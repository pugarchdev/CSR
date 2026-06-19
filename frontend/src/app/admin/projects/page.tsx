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

const projects = [
  {
    id: "PROJ-2026-001",
    title: "Western Ghats Biodiversity Conservation",
    company: "Tata Motors Limited",
    ngo: "Sahyadri Eco Foundation",
    district: "Pune",
    focusArea: "Environment",
    budget: "₹45,00,000",
    spent: "₹32,50,000",
    status: "Active",
    statusVariant: "success" as const,
    progress: 72,
    startDate: "2025-04-01",
    endDate: "2027-03-31",
  },
  {
    id: "PROJ-2026-002",
    title: "Farmer Livelihood Enhancement Program",
    company: "Reliance Industries Limited",
    ngo: "Vidarbha Development Society",
    district: "Nagpur",
    focusArea: "Rural Development",
    budget: "₹32,50,000",
    spent: "₹28,90,000",
    status: "Active",
    statusVariant: "success" as const,
    progress: 89,
    startDate: "2025-06-15",
    endDate: "2026-12-31",
  },
  {
    id: "PROJ-2026-003",
    title: "Digital Literacy for Urban Youth",
    company: "Infosys Limited",
    ngo: "Mumbai Education Trust",
    district: "Mumbai",
    focusArea: "Education",
    budget: "₹67,80,000",
    spent: "₹45,20,000",
    status: "Active",
    statusVariant: "success" as const,
    progress: 67,
    startDate: "2025-01-10",
    endDate: "2026-12-31",
  },
  {
    id: "PROJ-2026-004",
    title: "Rural Healthcare Mobile Clinics",
    company: "Mahindra & Mahindra Limited",
    ngo: "Konkan Welfare Association",
    district: "Ratnagiri",
    focusArea: "Healthcare",
    budget: "₹28,90,000",
    spent: "₹15,60,000",
    status: "Under Review",
    statusVariant: "warning" as const,
    progress: 54,
    startDate: "2025-08-01",
    endDate: "2027-07-31",
  },
  {
    id: "PROJ-2026-005",
    title: "Women Entrepreneurship Development",
    company: "Wipro Limited",
    ngo: "Marathwada Social Welfare",
    district: "Aurangabad",
    focusArea: "Women Empowerment",
    budget: "₹52,30,000",
    spent: "₹48,70,000",
    status: "Completed",
    statusVariant: "info" as const,
    progress: 100,
    startDate: "2024-04-01",
    endDate: "2026-03-31",
  },
];

export default function ProjectsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [focusAreaFilter, setFocusAreaFilter] = useState("all");

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.ngo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    const matchesFocusArea = focusAreaFilter === "all" || project.focusArea === focusAreaFilter;
    return matchesSearch && matchesStatus && matchesFocusArea;
  });

  return (
    <GovPortalLayout>
      <GovPageHeader
        title="CSR Projects"
        breadcrumb="Admin / Projects"
      />

      <div className="gov-container">
        {/* Stats Cards */}
        <div className="gov-grid gov-grid-cols-4 gov-gap-6 gov-mb-6">
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Total Projects</div>
              <div className="gov-text-3xl gov-font-bold gov-text-primary">342</div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">All registered projects</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Active Projects</div>
              <div className="gov-text-3xl gov-font-bold" style={{ color: "#166534" }}>
                256
              </div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">Currently ongoing</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Total Budget</div>
              <div className="gov-text-3xl gov-font-bold" style={{ color: "#005ea8" }}>
                ₹2,589 Cr
              </div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">Allocated funds</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Completed</div>
              <div className="gov-text-3xl gov-font-bold" style={{ color: "#d97706" }}>
                86
              </div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">Successfully finished</div>
            </GovCardBody>
          </GovCard>
        </div>

        {/* Filters */}
        <GovCard className="gov-mb-6">
          <GovCardBody>
            <div className="gov-grid gov-grid-cols-3 gov-gap-4">
              <GovInput
                label="Search Project"
                placeholder="Search by title, company, or NGO..."
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
                <option value="Completed">Completed</option>
                <option value="Suspended">Suspended</option>
              </GovSelect>
              <GovSelect
                label="Focus Area"
                value={focusAreaFilter}
                onChange={(e) => setFocusAreaFilter(e.target.value)}
              >
                <option value="all">All Focus Areas</option>
                <option value="Environment">Environment</option>
                <option value="Education">Education</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Rural Development">Rural Development</option>
                <option value="Women Empowerment">Women Empowerment</option>
              </GovSelect>
            </div>
          </GovCardBody>
        </GovCard>

        {/* Projects List */}
        <GovCard>
          <GovCardHeader>
            <GovCardTitle>CSR Projects ({filteredProjects.length})</GovCardTitle>
          </GovCardHeader>
          <GovCardBody>
            <div className="gov-table-container">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Project ID</th>
                    <th>Project Title</th>
                    <th>Company</th>
                    <th>NGO Partner</th>
                    <th>District</th>
                    <th>Focus Area</th>
                    <th>Budget</th>
                    <th>Spent</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project) => (
                    <tr key={project.id}>
                      <td className="gov-font-mono">{project.id}</td>
                      <td className="gov-font-semibold">{project.title}</td>
                      <td className="gov-text-sm">{project.company}</td>
                      <td className="gov-text-sm">{project.ngo}</td>
                      <td>{project.district}</td>
                      <td>
                        <span className="gov-badge gov-badge-info">{project.focusArea}</span>
                      </td>
                      <td className="gov-font-semibold">{project.budget}</td>
                      <td className="gov-font-semibold">{project.spent}</td>
                      <td>
                        <div className="gov-flex gov-items-center gov-gap-2">
                          <div
                            className="gov-progress-bar"
                            style={{
                              width: "60px",
                              height: "8px",
                              backgroundColor: "#e5e7eb",
                              borderRadius: "4px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${project.progress}%`,
                                height: "100%",
                                backgroundColor: "#166534",
                                transition: "width 0.3s ease",
                              }}
                            />
                          </div>
                          <span className="gov-text-sm">{project.progress}%</span>
                        </div>
                      </td>
                      <td>
                        <GovStatusBadge variant={project.statusVariant}>
                          {project.status}
                        </GovStatusBadge>
                      </td>
                      <td>
                        <div className="gov-flex gov-gap-2">
                          <GovButton variant="secondary">View</GovButton>
                          <GovButton variant="muted">Report</GovButton>
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

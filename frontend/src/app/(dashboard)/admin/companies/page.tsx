"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApiQuery } from "@/lib/apiHooks";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovInput from "@/components/gov/GovInput";
import GovSelect from "@/components/gov/GovSelect";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { apiFetch } from "@/lib/api";
import "@/styles/gov-theme.css";

export default function CompaniesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const dbStatus =
    statusFilter === "Active" ? "ACTIVE" :
    statusFilter === "Under Review" ? "PENDING" :
    statusFilter === "Suspended" ? "SUSPENDED" :
    statusFilter === "all" ? "" : statusFilter;

  const dbSector = sectorFilter === "all" ? "" : sectorFilter;

  // Fetch paginated and filtered Companies
  const { data: orgsResponse, isLoading: loading } = useApiQuery<any>(
    ["admin", "companies", String(page), debouncedSearch, dbStatus, dbSector],
    `/admin/organizations?type=CSR_COMPANY&page=${page}&limit=${limit}&search=${encodeURIComponent(debouncedSearch)}&status=${dbStatus}&sector=${encodeURIComponent(dbSector)}`,
    { staleTime: 30 * 1000 }
  );

  const rawOrgs = Array.isArray(orgsResponse?.data) ? orgsResponse.data : (Array.isArray(orgsResponse) ? orgsResponse : []);
  const pagination = orgsResponse?.pagination || {
    total: rawOrgs.length,
    active: rawOrgs.filter((o: any) => o.status === "ACTIVE").length,
    pending: rawOrgs.filter((o: any) => o.status !== "ACTIVE" && o.status !== "SUSPENDED").length,
    suspended: rawOrgs.filter((o: any) => o.status === "SUSPENDED").length,
    totalPages: 1
  };

  const items = (Array.isArray(rawOrgs) ? rawOrgs : []).map((org, index) => ({
    id: org.id,
    displayId: `COMP-${new Date(org.createdAt || Date.now()).getFullYear()}-${String((page - 1) * limit + index + 1).padStart(3, '0')}`,
    name: org.name,
    cin: org.cin || org.registrationNumber || "—",
    sector: org.csrCompanyProfile?.sector || "—",
    status: org.status === "ACTIVE" ? "Active" : org.status === "PENDING" ? "Under Review" : org.status.replace(/_/g, " "),
    statusVariant: org.status === "ACTIVE" ? "success" as const : "warning" as const,
    csrObligation: org.csrCompanyProfile?.csrBudget ? `₹${Number(org.csrCompanyProfile.csrBudget).toLocaleString("en-IN")}` : "—",
    spent: org.csrCompanyProfile?.spentAmount ? `₹${Number(org.csrCompanyProfile.spentAmount).toLocaleString("en-IN")}` : "—",
    projects: org._count?.projects || 0,
    lastReport: org.updatedAt ? new Date(org.updatedAt).toLocaleDateString("en-IN") : "—",
    isDb: true
  }));

  const filteredCompanies = items;

  return (
    <GovPortalLayout>
      <GovPageHeader
        title="Corporate Company Partners"
        breadcrumb="Admin / Companies"
      />

      <div className="gov-container">
        {/* Stats Cards */}
        <div className="gov-grid gov-grid-cols-4 gov-gap-6 gov-mb-6">
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Total Companies</div>
              <div className="gov-text-3xl gov-font-bold gov-text-primary">{loading ? "…" : pagination.total}</div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">Registered corporate partners</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Active</div>
              <div className="gov-text-3xl gov-font-bold" style={{ color: "#166534" }}>
                {loading ? "…" : (pagination.active || 0)}
              </div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">Currently operational</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Under Review</div>
              <div className="gov-text-3xl gov-font-bold" style={{ color: "#005ea8" }}>
                {loading ? "…" : (pagination.pending || 0)}
              </div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">Pending verification</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Suspended</div>
              <div className="gov-text-3xl gov-font-bold" style={{ color: "#b91c1c" }}>
                {loading ? "…" : (pagination.suspended || 0)}
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
                label="Search Company"
                placeholder="Search by name or CIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <GovSelect
                label="Status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Under Review">Under Review</option>
                <option value="Suspended">Suspended</option>
              </GovSelect>
              <GovSelect
                label="Sector"
                value={sectorFilter}
                onChange={(e) => {
                  setSectorFilter(e.target.value);
                  setPage(1);
                }}
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
            <GovCardTitle>Registered Companies ({pagination.total})</GovCardTitle>
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
                      <td className="gov-font-mono">{company.displayId || company.id}</td>
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
                          <GovButton variant="secondary" onClick={() => {
                            if (company.isDb) {
                              router.push(`/admin/organizations/${company.id}`);
                            } else {
                              router.push("/admin/organizations");
                            }
                          }}>View</GovButton>
                          <GovButton variant="muted" onClick={() => router.push("/admin/reports")}>Reports</GovButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pagination.totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
                  <span className="gov-text-xs gov-text-muted">
                    Showing page {page} of {pagination.totalPages} ({pagination.total} companies total)
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <GovButton
                      variant="secondary"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </GovButton>
                    <GovButton
                      variant="secondary"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    >
                      Next
                    </GovButton>
                  </div>
                </div>
              )}
            </div>
          </GovCardBody>
        </GovCard>
      </div>
    </GovPortalLayout>
  );
}

// Made with Bob

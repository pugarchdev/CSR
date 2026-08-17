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

      {/* Force reduced padding on mobile container */}
      <div className="gov-container !px-2 sm:!px-4 md:!px-6">
        
    {/* Compact KPI Cards */}
   <div className="gov-grid gov-grid-cols-4 gov-gap-3 gov-mb-4">
        <GovCard>
          <GovCardBody className="!p-3 flex items-center justify-between">
            <div>
              <div className="gov-text-xs gov-text-muted">Total Companies</div>
              <div className="gov-text-xl gov-font-bold gov-text-primary">{loading ? "…" : pagination.total}</div>
            </div>
            <div className="gov-text-[10px] gov-text-muted text-right">Registered</div>
          </GovCardBody>
        </GovCard>
        <GovCard>
          <GovCardBody className="!p-3 flex items-center justify-between">
            <div>
              <div className="gov-text-xs gov-text-muted">Active</div>
              <div className="gov-text-xl gov-font-bold" style={{ color: "#166534" }}>
                {loading ? "…" : (pagination.active || 0)}
              </div>
            </div>
            <div className="gov-text-[10px] gov-text-muted text-right">Operational</div>
          </GovCardBody>
        </GovCard>
        <GovCard>
          <GovCardBody className="!p-3 flex items-center justify-between">
            <div>
              <div className="gov-text-xs gov-text-muted">Under Review</div>
              <div className="gov-text-xl gov-font-bold" style={{ color: "#005ea8" }}>
                {loading ? "…" : (pagination.pending || 0)}
              </div>
            </div>
            <div className="gov-text-[10px] gov-text-muted text-right">Pending</div>
          </GovCardBody>
        </GovCard>
        <GovCard>
          <GovCardBody className="!p-3 flex items-center justify-between">
            <div>
              <div className="gov-text-xs gov-text-muted">Suspended</div>
              <div className="gov-text-xl gov-font-bold" style={{ color: "#b91c1c" }}>
                {loading ? "…" : (pagination.suspended || 0)}
              </div>
            </div>
            <div className="gov-text-[10px] gov-text-muted text-right">Issues</div>
          </GovCardBody>
        </GovCard>
      </div>

      {/* Compact Filters - Side by Side on One Line */}
     <GovCard className="gov-mb-4">
        <GovCardBody className="!p-3">
          <div className="gov-grid gov-grid-cols-3 gov-gap-3 items-center">
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
          <GovCardHeader className="!px-3 !py-3 md:!px-5 md:!py-4">
            <GovCardTitle>Registered Companies ({pagination.total})</GovCardTitle>
          </GovCardHeader>
          {/* Drastically reduced padding here for mobile to let cards breathe */}
          <GovCardBody className="!p-2 sm:!p-4 md:!p-5">
            <div className="w-full md:overflow-x-auto">
              <table className="w-full block md:table text-left border-collapse">
                <thead className="hidden md:table-header-group border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">Company ID</th>
                    <th className="px-4 py-3">Company Name</th>
                    <th className="px-4 py-3">CIN</th>
                    <th className="px-4 py-3">Sector</th>
                    <th className="px-4 py-3">CSR Obligation</th>
                    <th className="px-4 py-3">Amount Spent</th>
                    <th className="px-4 py-3 text-center">Projects</th>
                    <th className="px-4 py-3">Last Report</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right md:text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="block md:table-row-group divide-y-0 md:divide-y md:divide-slate-100">
                  {filteredCompanies.map((company) => (
                    <tr 
                      key={company.id}
                      className="block md:table-row mb-3 md:mb-0 bg-white border border-slate-200 md:border-none rounded-xl md:rounded-none shadow-sm md:shadow-none hover:bg-slate-50/80 transition-colors overflow-hidden"
                    >
                      <td 
                        data-label="Company ID" 
                        className="flex md:table-cell justify-between items-center px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-100 md:border-none gov-font-mono before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left text-xs md:text-sm"
                      >
                        {company.displayId || company.id}
                      </td>
                      <td 
                        data-label="Company Name" 
                        className="flex md:table-cell justify-between items-center px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-100 md:border-none gov-font-semibold before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left text-xs md:text-sm"
                      >
                        {company.name}
                      </td>
                      <td 
                        data-label="CIN" 
                        className="flex md:table-cell justify-between items-center px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-100 md:border-none gov-font-mono gov-text-xs md:gov-text-sm before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left"
                      >
                        {company.cin}
                      </td>
                      <td 
                        data-label="Sector" 
                        className="flex md:table-cell justify-between items-center px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-100 md:border-none before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left"
                      >
                        <span className="gov-badge gov-badge-info text-[10px] md:text-xs">{company.sector}</span>
                      </td>
                      <td 
                        data-label="CSR Obligation" 
                        className="flex md:table-cell justify-between items-center px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-100 md:border-none gov-font-semibold before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left text-xs md:text-sm"
                      >
                        {company.csrObligation}
                      </td>
                      <td 
                        data-label="Amount Spent" 
                        className="flex md:table-cell justify-between items-center px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-100 md:border-none gov-font-semibold before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left text-xs md:text-sm"
                      >
                        {company.spent}
                      </td>
                      <td 
                        data-label="Projects" 
                        className="flex md:table-cell justify-between items-center px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-100 md:border-none md:gov-text-center before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-center text-xs md:text-sm"
                      >
                        {company.projects}
                      </td>
                      <td 
                        data-label="Last Report" 
                        className="flex md:table-cell justify-between items-center px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-100 md:border-none gov-text-xs md:gov-text-sm before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left"
                      >
                        {company.lastReport}
                      </td>
                      <td 
                        data-label="Status" 
                        className="flex md:table-cell justify-between items-center px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-100 md:border-none before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left"
                      >
                        <GovStatusBadge variant={company.statusVariant}>
                          {company.status}
                        </GovStatusBadge>
                      </td>
                      <td className="block md:table-cell px-3 md:px-4 py-3 bg-slate-50/50 md:bg-transparent">
                        <div className="flex md:inline-flex justify-end gap-2 w-full md:w-auto">
                          <GovButton 
                            variant="secondary" 
                            className="flex-1 md:flex-none justify-center text-xs md:text-sm"
                            onClick={() => {
                              if (company.isDb) {
                                router.push(`/admin/organizations/${company.id}`);
                              } else {
                                router.push("/admin/organizations");
                              }
                            }}
                          >
                            View
                          </GovButton>
                          <GovButton 
                            variant="muted" 
                            className="flex-1 md:flex-none justify-center text-xs md:text-sm"
                            onClick={() => router.push("/admin/reports")}
                          >
                            Reports
                          </GovButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Responsive Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4 pt-4 border-t border-slate-200">
                  <span className="gov-text-[11px] md:gov-text-xs gov-text-muted text-center sm:text-left">
                    Showing page {page} of {pagination.totalPages} ({pagination.total} companies total)
                  </span>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <GovButton
                      variant="secondary"
                      className="flex-1 sm:flex-none justify-center text-xs md:text-sm py-1.5 md:py-2"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </GovButton>
                    <GovButton
                      variant="secondary"
                      className="flex-1 sm:flex-none justify-center text-xs md:text-sm py-1.5 md:py-2"
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

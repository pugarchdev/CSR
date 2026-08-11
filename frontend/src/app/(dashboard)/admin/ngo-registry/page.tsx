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

export default function ImplementingAgencyRegistryPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
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

  const dbDistrict = districtFilter === "all" ? "" : districtFilter;

  // Fetch paginated and filtered NGOs
  const { data: orgsResponse, isLoading: loading } = useApiQuery<any>(
    ["admin", "ngos", String(page), debouncedSearch, dbStatus, dbDistrict],
    `/admin/organizations?type=NGO&page=${page}&limit=${limit}&search=${encodeURIComponent(debouncedSearch)}&status=${dbStatus}&district=${encodeURIComponent(dbDistrict)}`,
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
    displayId: `IA-${new Date(org.createdAt || Date.now()).getFullYear()}-${String((page - 1) * limit + index + 1).padStart(3, '0')}`,
    name: org.name,
    registrationNo: org.registrationNumber || "—",
    district: org.district || "—",
    focusArea: org.organizationType?.replace(/_/g, " ") || "Other",
    status: org.status === "ACTIVE" ? "Active" : org.status === "PENDING" ? "Under Review" : org.status.replace(/_/g, " "),
    statusVariant: org.status === "ACTIVE" ? "success" as const : "warning" as const,
    projectsCompleted: org._count?.projects || 0,
    totalFunding: org.csrCompanyProfile?.spentAmount ? `₹${Number(org.csrCompanyProfile.spentAmount).toLocaleString("en-IN")}` : "—",
    lastAudit: org.updatedAt ? new Date(org.updatedAt).toLocaleDateString("en-IN") : "—",
    isDb: true
  }));

  const filteredNGOs = items;

return (
    <GovPortalLayout>
      <GovPageHeader
        title="Implementing Agencies"
        breadcrumb="Admin / Implementing Agencies"
      />

      <div className="gov-container !px-2 sm:!px-4 md:!px-6">
        
        {/* Stats Cards - Replaced with Tailwind grid for a compact 4-column row on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
          <GovCard>
            <GovCardBody className="!p-3 md:!p-4">
              <div className="text-xs text-slate-500 font-medium mb-1">Total Agencies</div>
              <div className="text-xl md:text-2xl font-bold text-blue-900">{loading ? "…" : pagination.total}</div>
              <div className="text-[10px] md:text-[11px] text-slate-500 mt-1">Registered implementing agencies</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody className="!p-3 md:!p-4">
              <div className="text-xs text-slate-500 font-medium mb-1">Active Agencies</div>
              <div className="text-xl md:text-2xl font-bold text-emerald-800">
                {loading ? "…" : (pagination.active || 0)}
              </div>
              <div className="text-[10px] md:text-[11px] text-slate-500 mt-1">Currently operational</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody className="!p-3 md:!p-4">
              <div className="text-xs text-slate-500 font-medium mb-1">Under Review</div>
              <div className="text-xl md:text-2xl font-bold text-amber-600">
                {loading ? "…" : (pagination.pending || 0)}
              </div>
              <div className="text-[10px] md:text-[11px] text-slate-500 mt-1">Pending verification</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody className="!p-3 md:!p-4">
              <div className="text-xs text-slate-500 font-medium mb-1">Suspended</div>
              <div className="text-xl md:text-2xl font-bold text-red-700">
                {loading ? "…" : (pagination.suspended || 0)}
              </div>
              <div className="text-[10px] md:text-[11px] text-slate-500 mt-1">Compliance issues</div>
            </GovCardBody>
          </GovCard>
        </div>

        {/* Filters - Replaced with Tailwind grid for a compact 3-column row on desktop */}
       <GovCard className="mb-6">
          <GovCardBody className="!p-3 md:!p-4">
            {/* Flex forces them into a single line on medium screens and up */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 w-full">
              
              {/* flex-[2] makes the search bar take up twice as much horizontal space as the dropdowns */}
              <div className="w-full flex-[2]">
                <GovInput
                  label="Search Agency"
                  placeholder="Search by name or registration number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="w-full flex-1">
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
              </div>

              <div className="w-full flex-1">
                <GovSelect
                  label="District"
                  value={districtFilter}
                  onChange={(e) => {
                    setDistrictFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Districts</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Pune">Pune</option>
                  <option value="Nagpur">Nagpur</option>
                  <option value="Ratnagiri">Ratnagiri</option>
                  <option value="Aurangabad">Aurangabad</option>
                </GovSelect>
              </div>
              
            </div>
          </GovCardBody>
        </GovCard>

        {/* Agency List */}
        <GovCard>
          <GovCardHeader className="!px-3 !py-3 md:!px-5 md:!py-4">
            <GovCardTitle>Registered Implementing Agencies ({pagination.total})</GovCardTitle>
          </GovCardHeader>
          <GovCardBody className="!p-2 sm:!p-4 md:!p-5">
            <div className="w-full md:overflow-x-auto">
              <table className="w-full block md:table text-left border-collapse">
                <thead className="hidden md:table-header-group border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">Agency ID</th>
                    <th className="px-4 py-3">Organization Name</th>
                    <th className="px-4 py-3">Registration No.</th>
                    <th className="px-4 py-3">District</th>
                    <th className="px-4 py-3">Focus Area</th>
                    <th className="px-4 py-3 text-center">Projects</th>
                    <th className="px-4 py-3">Total Funding</th>
                    <th className="px-4 py-3">Last Audit</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right md:text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="block md:table-row-group divide-y-0 md:divide-y md:divide-slate-100">
                  {filteredNGOs.map((ngo) => (
                    <tr 
                      key={ngo.id}
                      className="block md:table-row mb-3 md:mb-0 bg-white border border-slate-200 md:border-none rounded-xl md:rounded-none shadow-sm md:shadow-none hover:bg-slate-50/80 transition-colors overflow-hidden"
                    >
                      <td 
                        data-label="Agency ID" 
                        className="flex md:table-cell justify-between items-center px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-100 md:border-none gov-font-mono before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left text-xs md:text-sm"
                      >
                        {ngo.displayId || ngo.id}
                      </td>
                      <td 
                        data-label="Organization Name" 
                        className="flex md:table-cell justify-between items-center px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-100 md:border-none gov-font-semibold before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left text-xs md:text-sm"
                      >
                        {ngo.name}
                      </td>
                      <td 
                        data-label="Registration No." 
                        className="flex md:table-cell justify-between items-center px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-100 md:border-none gov-font-mono gov-text-xs md:gov-text-sm before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left"
                      >
                        {ngo.registrationNo}
                      </td>
                      <td 
                        data-label="District" 
                        className="flex md:table-cell justify-between items-center px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-100 md:border-none before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left text-xs md:text-sm"
                      >
                        {ngo.district}
                      </td>
                      <td 
                        data-label="Focus Area" 
                        className="flex md:table-cell justify-between items-center px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-100 md:border-none before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left"
                      >
                        <span className="gov-badge gov-badge-info text-[10px] md:text-xs">{ngo.focusArea}</span>
                      </td>
                      <td 
                        data-label="Projects" 
                        className="flex md:table-cell justify-between items-center px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-100 md:border-none md:gov-text-center before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-center text-xs md:text-sm"
                      >
                        {ngo.projectsCompleted}
                      </td>
                      <td 
                        data-label="Total Funding" 
                        className="flex md:table-cell justify-between items-center px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-100 md:border-none gov-font-semibold before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left text-xs md:text-sm"
                      >
                        {ngo.totalFunding}
                      </td>
                      <td 
                        data-label="Last Audit" 
                        className="flex md:table-cell justify-between items-center px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-100 md:border-none gov-text-xs md:gov-text-sm before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left"
                      >
                        {ngo.lastAudit}
                      </td>
                      <td 
                        data-label="Status" 
                        className="flex md:table-cell justify-between items-center px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-100 md:border-none before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left"
                      >
                        <GovStatusBadge variant={ngo.statusVariant}>{ngo.status}</GovStatusBadge>
                      </td>
                      <td className="block md:table-cell px-3 md:px-4 py-3 bg-slate-50/50 md:bg-transparent">
                        <div className="flex md:inline-flex justify-end gap-2 w-full md:w-auto">
                          <GovButton 
                            variant="secondary" 
                            className="flex-1 md:flex-none justify-center text-xs md:text-sm"
                            onClick={() => {
                              if (ngo.isDb) {
                                router.push(`/admin/organizations/${ngo.id}`);
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
                            onClick={() => {
                              router.push(`/admin/audit-trail?search=${encodeURIComponent(ngo.name)}`);
                            }}
                          >
                            Audit
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
                    Showing page {page} of {pagination.totalPages} ({pagination.total} agencies total)
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

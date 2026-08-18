"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, CheckCircle2, Clock, ShieldAlert, Eye } from "lucide-react";
import { useApiQuery } from "@/lib/apiHooks";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { StandardPageHeader } from "@/components/layout/StandardPageHeader";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovInput from "@/components/gov/GovInput";
import GovSelect from "@/components/gov/GovSelect";
import GovStatusBadge from "@/components/gov/GovStatusBadge";

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
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 text-slate-900">
        <StandardPageHeader
          title="Implementing Agencies (NGOs)"
          category="Admin / Agencies"
          description="Verified register of CSR-1 registered NGOs, non-profit trusts, and social sector implementing partners in Maharashtra."
        />

        {/* 4-Column Animated KPI Cards */}
        <StatCardGroup columns={4}>
          <StatCard
            label="Total Agencies"
            value={loading ? "…" : pagination.total}
            icon={Users}
            colorTheme="blue"
            sublabel="Registered non-profit partners"
            index={0}
          />
          <StatCard
            label="Active Agencies"
            value={loading ? "…" : (pagination.active || 0)}
            icon={CheckCircle2}
            colorTheme="emerald"
            sublabel="Operational & accredited"
            index={1}
          />
          <StatCard
            label="Under Review"
            value={loading ? "…" : (pagination.pending || 0)}
            icon={Clock}
            colorTheme="amber"
            sublabel="Pending credential verification"
            index={2}
          />
          <StatCard
            label="Suspended / Inactive"
            value={loading ? "…" : (pagination.suspended || 0)}
            icon={ShieldAlert}
            colorTheme="rose"
            sublabel="Compliance issues"
            index={3}
          />
        </StatCardGroup>

        {/* Search and Filters Bar */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 w-full">
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
                <option value="Nashik">Nashik</option>
                <option value="Thane">Thane</option>
                <option value="Aurangabad">Chhatrapati Sambhajinagar</option>
              </GovSelect>
            </div>
          </div>
        </div>

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
                            className="flex-1 md:flex-none justify-center text-xs md:text-sm inline-flex items-center gap-1.5 font-bold"
                            onClick={() => {
                              if (ngo.isDb) {
                                router.push(`/admin/organizations/${ngo.id}`);
                              } else {
                                router.push("/admin/organizations");
                              }
                            }}
                          >
                            <Eye size={14} className="text-blue-700" />
                            <span>View Details</span>
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

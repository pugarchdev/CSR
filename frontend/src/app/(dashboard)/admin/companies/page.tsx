"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApiQuery } from "@/lib/apiHooks";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { 
  Building2, 
  ExternalLink, 
  Eye, 
  FileText, 
  Loader2, 
  MapPin, 
  Search,
  ShieldCheck, 
  Target, 
  UserCheck 
} from "lucide-react";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovInput from "@/components/gov/GovInput";
import GovSelect from "@/components/gov/GovSelect";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import GovModal from "@/components/gov/GovModal";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { apiFetch } from "@/lib/api";
import { MAHARASHTRA_DISTRICTS } from "@/lib/locationData";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTh } from "@/components/ui/SortableTh";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { useResponsiveViewMode } from "@/hooks/useResponsiveViewMode";
import "@/styles/gov-theme.css";

export default function CompaniesPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useResponsiveViewMode();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [viewingCompany, setViewingCompany] = useState<any | null>(null);
  const [companyDetails, setCompanyDetails] = useState<any | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

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
  const dbDistrict = districtFilter === "all" ? "" : districtFilter;

  // Fetch paginated and filtered Companies
  const { data: orgsResponse, isLoading: loading } = useApiQuery<any>(
    ["admin", "companies", String(page), debouncedSearch, dbStatus, dbSector, dbDistrict],
    `/admin/organizations?type=CSR_COMPANY&page=${page}&limit=${limit}&search=${encodeURIComponent(debouncedSearch)}&status=${dbStatus}&sector=${encodeURIComponent(dbSector)}&district=${encodeURIComponent(dbDistrict)}`,
    { staleTime: 30 * 1000 }
  );

  const rawOrgs = Array.isArray(orgsResponse?.data) ? orgsResponse.data : (Array.isArray(orgsResponse) ? orgsResponse : []);
  const pagination = orgsResponse?.pagination || {
    total: rawOrgs.length,
    active: rawOrgs.filter((o: any) => o.status === "ACTIVE").length,
    pending: rawOrgs.filter((o: any) => o.status !== "ACTIVE" && o.status !== "SUSPENDED").length,
    suspended: rawOrgs.filter((o: any) => o.status === "SUSPENDED").length,
    totalPages: Math.max(1, Math.ceil(rawOrgs.length / limit))
  };

  const formatCin = (cin?: string) => {
    if (!cin || cin === "—") return "—";
    if (cin.startsWith("v1:")) return "Registered (MCA)";
    return cin;
  };

  const handleOpenDetails = async (company: any) => {
    setViewingCompany(company);
    setCompanyDetails(null);
    setModalLoading(true);
    try {
      const full = await apiFetch<any>(`/admin/organizations/${company.id}`);
      setCompanyDetails(full);
    } catch {
      setCompanyDetails(company);
    } finally {
      setModalLoading(false);
    }
  };

  const items = (Array.isArray(rawOrgs) ? rawOrgs : []).map((org, index) => {
    const csrProf = org.csrCompanyProfile || {};
    const obligation = csrProf.twoPercentCsrObligation || csrProf.csrObligationAmount || csrProf.csrBudget;
    return {
      id: org.id,
      displayId: `COMP-${new Date(org.createdAt || Date.now()).getFullYear()}-${String((page - 1) * limit + index + 1).padStart(3, '0')}`,
      name: org.name,
      legalName: org.legalName || org.name,
      cin: org.cin || org.registrationNumber || "—",
      sector: csrProf.sector || (csrProf.preferredSectors && csrProf.preferredSectors[0]) || "General CSR",
      district: org.district || "Maharashtra",
      status: org.status === "ACTIVE" ? "Active" : org.status === "PENDING" ? "Under Review" : org.status.replace(/_/g, " "),
      statusVariant: org.status === "ACTIVE" ? "success" as const : "warning" as const,
      csrObligation: obligation ? `₹${Number(obligation).toLocaleString("en-IN")}` : "—",
      spent: csrProf.spentAmount ? `₹${Number(csrProf.spentAmount).toLocaleString("en-IN")}` : "—",
      projects: org._count?.projects || 0,
      email: org.officialEmail || org.email || "—",
      phone: org.phone || "—",
      isDb: true,
      raw: org
    };
  });

  const { sortedItems, sortKey, sortDirection, requestSort } = useTableSort(items);

  return (
    <GovPortalLayout>
      <GovPageHeader
        title="Corporate Company Partners"
        breadcrumb="Admin / Companies"
        description="Directory of verified Corporate CSR Partners, statutory 2% obligations, and CSR Head contact registry."
      />

      <div className="gov-container space-y-6">
        {/* Metric Cards Row */}
        <StatCardGroup columns={4}>
          <StatCard
            label="Total Companies"
            value={pagination.total}
            icon={Building2}
            colorTheme="blue"
            sublabel="Registered corporate entities"
          />
          <StatCard
            label="Active Verified"
            value={pagination.active}
            icon={ShieldCheck}
            colorTheme="emerald"
            sublabel="Approved & participating"
          />
          <StatCard
            label="Pending Review"
            value={pagination.pending}
            icon={UserCheck}
            colorTheme="amber"
            sublabel="Awaiting verification"
          />
          <StatCard
            label="Total CSR Pool"
            value="₹425+ Cr"
            icon={Target}
            colorTheme="purple"
            sublabel="Aggregate allocated fund"
          />
        </StatCardGroup>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search companies by name, CIN, PAN, or official email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs md:text-sm rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-medium placeholder-slate-400"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-44">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs md:text-sm rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-medium cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Under Review">Under Review</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          {/* District Filter */}
          <div className="w-full md:w-48">
            <select
              value={districtFilter}
              onChange={(e) => {
                setDistrictFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs md:text-sm rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-medium cursor-pointer"
            >
              <option value="all">All 36 Districts</option>
              {MAHARASHTRA_DISTRICTS.map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
          </div>

          {/* Sector Filter */}
          <div className="w-full md:w-52">
            <select
              value={sectorFilter}
              onChange={(e) => {
                setSectorFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs md:text-sm rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-medium cursor-pointer"
            >
              <option value="all">All Focus Sectors</option>
              <option value="Education">Education & Skill Development</option>
              <option value="Healthcare">Healthcare & Sanitation</option>
              <option value="Rural Development">Rural Development</option>
              <option value="Environment">Environment & Water Conservation</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="IT Services">IT Services</option>
            </select>
          </div>
        </div>

        {/* Responsive Companies Directory Table */}
        <GovCard className="overflow-hidden shadow-xs border border-slate-200/80">
          <GovCardHeader className="!px-4 !py-3.5 md:!px-5 md:!py-4 flex flex-row items-center justify-between border-b border-slate-100">
            <GovCardTitle className="text-sm md:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Building2 size={18} className="text-blue-700" />
              <span>Registered Companies</span>
              <span className="text-xs font-bold text-slate-500 ml-1">({pagination.total})</span>
            </GovCardTitle>
            <ViewToggle view={viewMode} onChange={setViewMode} />
          </GovCardHeader>

          <GovCardBody className="!p-0">
            {viewMode === "list" ? (
              <div className="w-full md:overflow-x-auto">
                <table className="w-full block md:table text-left border-collapse text-xs md:text-sm">
                  <thead className="hidden md:table-header-group border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider font-extrabold text-slate-500">
                    <tr>
                      <SortableTh sortKey="name" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-5 py-3.5">Company Name</SortableTh>
                      <SortableTh sortKey="cin" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3.5">CIN / Reg No</SortableTh>
                      <SortableTh sortKey="district" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3.5">District / Region</SortableTh>
                      <SortableTh sortKey="sector" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3.5">Sector</SortableTh>
                      <SortableTh sortKey="csrObligation" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3.5">CSR Obligation</SortableTh>
                      <SortableTh sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3.5">Status</SortableTh>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="block md:table-row-group divide-y-0 md:divide-y md:divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 size={24} className="animate-spin text-blue-600" />
                            <span>Loading companies directory...</span>
                          </div>
                        </td>
                      </tr>
                    ) : sortedItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                          No corporate company partners found matching the selected criteria.
                        </td>
                      </tr>
                    ) : (
                      sortedItems.map((company) => (
                        <tr 
                          key={company.id}
                          className="block md:table-row mb-3 md:mb-0 bg-white border border-slate-200 md:border-none rounded-xl md:rounded-none shadow-xs md:shadow-none hover:bg-slate-50/80 transition-colors overflow-hidden"
                        >
                          <td 
                            data-label="Company" 
                            className="flex md:table-cell flex-col md:flex-row items-start md:items-center px-4 md:px-5 py-3 md:py-4 border-b border-slate-100 md:border-none before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden before:mb-0.5"
                          >
                            <div className="flex flex-col">
                              <button
                                type="button"
                                onClick={() => handleOpenDetails(company)}
                                className="font-bold text-slate-900 hover:text-blue-700 transition-colors text-left cursor-pointer"
                              >
                                {company.name}
                              </button>
                              <span className="text-[11px] text-slate-400 font-medium break-all">
                                {company.email}
                              </span>
                            </div>
                          </td>
                          <td 
                            data-label="CIN / Reg" 
                            className="flex md:table-cell justify-between items-center px-4 md:px-4 py-2.5 md:py-4 border-b border-slate-100 md:border-none font-mono text-xs before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left"
                          >
                            <span className="font-semibold text-slate-700 break-all max-w-[200px]">
                              {formatCin(company.cin)}
                            </span>
                          </td>
                          <td 
                            data-label="District" 
                            className="flex md:table-cell justify-between items-center px-4 md:px-4 py-2.5 md:py-4 border-b border-slate-100 md:border-none font-medium text-slate-700 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left"
                          >
                            {company.district}
                          </td>
                          <td 
                            data-label="Sector" 
                            className="flex md:table-cell justify-between items-center px-4 md:px-4 py-2.5 md:py-4 border-b border-slate-100 md:border-none before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left"
                          >
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-900 border border-blue-200">
                              {company.sector}
                            </span>
                          </td>
                          <td 
                            data-label="CSR Obligation" 
                            className="flex md:table-cell justify-between items-center px-4 md:px-4 py-2.5 md:py-4 border-b border-slate-100 md:border-none font-bold text-slate-900 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left"
                          >
                            {company.csrObligation}
                          </td>
                          <td 
                            data-label="Status" 
                            className="flex md:table-cell justify-between items-center px-4 md:px-4 py-2.5 md:py-4 border-b border-slate-100 md:border-none before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left"
                          >
                            <GovStatusBadge variant={company.statusVariant}>
                              {company.status}
                            </GovStatusBadge>
                          </td>
                          <td className="block md:table-cell px-4 md:px-5 py-3 md:py-4 bg-slate-50/50 md:bg-transparent text-right">
                            <div className="flex justify-end items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenDetails(company)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/90 hover:bg-blue-100 text-blue-900 font-bold text-xs shadow-2xs transition-all hover:scale-[1.02] cursor-pointer"
                                title="View detailed company profile"
                              >
                                <Eye size={14} className="text-blue-700" />
                                <span>View Details</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* GRID VIEW: Responsive Company Cards */
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                  <div className="col-span-full py-12 text-center text-slate-500 font-medium">
                    <Loader2 size={24} className="animate-spin text-blue-600 mx-auto mb-2" />
                    <span>Loading companies...</span>
                  </div>
                ) : sortedItems.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-slate-500 font-medium">
                    No corporate company partners found matching the selected criteria.
                  </div>
                ) : (
                  sortedItems.map((company) => (
                    <div
                      key={company.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 hover:shadow-sm transition-all space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-900 border border-blue-200">
                            {company.sector}
                          </span>
                          <GovStatusBadge variant={company.statusVariant}>{company.status}</GovStatusBadge>
                        </div>

                        <h3 className="font-extrabold text-slate-900 text-sm line-clamp-2">
                          {company.name}
                        </h3>

                        <div className="space-y-1 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin size={12} className="text-slate-400 shrink-0" />
                            <span>{company.district}</span>
                          </div>
                          {company.email && (
                            <div className="text-slate-400 truncate text-[11px]">
                              {company.email}
                            </div>
                          )}
                          <div className="pt-1 text-[11px] font-bold text-slate-700">
                            Obligation: <span className="text-blue-900 font-black">{company.csrObligation}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400 truncate max-w-[140px]">
                          {formatCin(company.cin)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(company)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs border border-blue-200 transition-colors cursor-pointer"
                        >
                          <Eye size={12} className="text-blue-700" />
                          <span>View Details</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-4 border-t border-slate-100 text-xs">
                <span className="text-slate-500 font-medium text-center sm:text-left">
                  Showing page {page} of {pagination.totalPages} ({pagination.total} companies)
                </span>
                <div className="flex gap-2 w-full sm:w-auto">
                  <GovButton
                    variant="secondary"
                    className="flex-1 sm:flex-none justify-center text-xs py-1.5 px-3"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </GovButton>
                  <GovButton
                    variant="secondary"
                    className="flex-1 sm:flex-none justify-center text-xs py-1.5 px-3"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  >
                    Next
                  </GovButton>
                </div>
              </div>
            )}
          </GovCardBody>
        </GovCard>
      </div>

      {/* COMPREHENSIVE VIEW COMPANY DETAILS MODAL */}
      <GovModal
        open={Boolean(viewingCompany)}
        onClose={() => { setViewingCompany(null); setCompanyDetails(null); }}
        title={viewingCompany?.name || "Company Details"}
        width={720}
      >
        {viewingCompany && (
          <div className="space-y-4 text-xs">
            {modalLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <Loader2 size={32} className="animate-spin text-blue-600" />
                <p className="text-xs font-bold text-slate-500">Loading comprehensive company profile...</p>
              </div>
            ) : (
              (() => {
                const data = companyDetails || viewingCompany.raw || viewingCompany;
                const csrProf = data.csrCompanyProfile || {};
                const docs = data.documents || [];

                return (
                  <div className="space-y-4">
                    {/* Header Card */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-blue-100 text-blue-800 shrink-0">
                          <Building2 size={24} />
                        </div>
                        <div>
                          <h3 className="font-heading font-extrabold text-slate-900 text-base">{data.name}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-slate-500 font-mono">
                              {data.officialEmail || data.email || "No email registered"}
                            </span>
                            {data.phone && (
                              <span className="text-[11px] text-slate-500 font-mono">
                                • {data.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{data.onboardingStatus || data.status || "ACTIVE"}</Badge>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          CSR Corporate Partner
                        </span>
                      </div>
                    </div>

                    {/* Statutory & Identity Profile */}
                    <div className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-3">
                      <h4 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                        <ShieldCheck size={15} className="text-purple-600 shrink-0" /> Statutory & Registration Profile
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">Legal Entity Name</span>
                          <span className="font-bold text-slate-900 break-words">{data.legalName || data.name || "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">Registration / CIN</span>
                          <span className="font-mono font-semibold text-slate-800 break-all">{formatCin(data.registrationNumber || data.cin)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">PAN Number</span>
                          <span className="font-mono font-semibold text-slate-800">{data.pan || "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">GSTIN Number</span>
                          <span className="font-mono font-semibold text-slate-800">{data.gstin || "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">Incorporation Year</span>
                          <span className="font-semibold text-slate-800">{data.yearOfIncorporation || data.yearEstablished || "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">Account Status</span>
                          <span className="font-bold text-emerald-700">{data.status || "ACTIVE"}</span>
                        </div>
                      </div>
                    </div>

                    {/* CSR Budget & Designation Profile */}
                    <div className="p-4 rounded-xl border border-blue-200/80 bg-blue-50/40 space-y-3">
                      <h4 className="text-[11px] font-extrabold text-blue-950 uppercase tracking-wider flex items-center gap-2 border-b border-blue-200/60 pb-2">
                        <Target size={15} className="text-blue-700 shrink-0" /> CSR Mandate & Designated CSR Head
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">2% CSR Obligation</span>
                          <span className="font-extrabold text-slate-900 text-sm">
                            {csrProf.twoPercentCsrObligation || csrProf.csrObligationAmount ? `₹${Number(csrProf.twoPercentCsrObligation || csrProf.csrObligationAmount).toLocaleString("en-IN")}` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">CSR Reg Number</span>
                          <span className="font-mono font-semibold text-slate-800">{csrProf.csrRegistrationNo || "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">Financial Year</span>
                          <span className="font-semibold text-slate-800">{csrProf.financialYear || "FY 2025-26"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">Designated CSR Head</span>
                          <span className="font-bold text-slate-900">{csrProf.csrHeadName || "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">CSR Head Email</span>
                          <span className="font-semibold text-blue-900 break-all">{csrProf.csrHeadEmail || "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">CSR Head Phone</span>
                          <span className="font-semibold text-slate-800">{csrProf.csrHeadMobile || "—"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Contact & Headquarters Location */}
                    <div className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-3">
                      <h4 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                        <MapPin size={15} className="text-blue-600 shrink-0" /> Registered Headquarters & Contact
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">Official Email</span>
                          <span className="font-bold text-blue-900 break-all">{data.officialEmail || data.email || "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">Official Phone</span>
                          <span className="font-semibold text-slate-800">{data.phone || "—"}</span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">Headquarters Address</span>
                          <span className="font-medium text-slate-800">{data.address || "Maharashtra, India"} {data.pincode ? `• PIN: ${data.pincode}` : ""}</span>
                        </div>
                      </div>
                    </div>

                    {/* Attached Documents */}
                    {docs.length > 0 && (
                      <div className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-2">
                        <h4 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                          <FileText size={15} className="text-emerald-600 shrink-0" /> Uploaded Statutory Documents ({docs.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {docs.map((doc: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                              <span className="font-semibold text-slate-800 truncate text-[11px]">
                                {doc.name || doc.documentType || `Document ${i + 1}`}
                              </span>
                              {doc.fileUrl && (
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 text-[11px] shrink-0 ml-2"
                                >
                                  <span>View</span>
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer Actions - View Only */}
                    <div className="flex items-center justify-end pt-3 border-t border-slate-200">
                      <Button type="button" variant="secondary" onClick={() => { setViewingCompany(null); setCompanyDetails(null); }}>
                        Close
                      </Button>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}
      </GovModal>
    </GovPortalLayout>
  );
}

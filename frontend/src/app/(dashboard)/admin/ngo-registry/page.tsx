"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  Clock,
  ExternalLink, 
  Eye, 
  FileText, 
  HeartHandshake, 
  Loader2, 
  Mail,
  MapPin, 
  Search,
  ShieldCheck,
  XCircle
} from "lucide-react";
import { useApiQuery } from "@/lib/apiHooks";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { StandardPageHeader } from "@/components/layout/StandardPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovInput from "@/components/gov/GovInput";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import GovModal from "@/components/gov/GovModal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { MAHARASHTRA_DISTRICTS } from "@/lib/locationData";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTh } from "@/components/ui/SortableTh";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { useResponsiveViewMode } from "@/hooks/useResponsiveViewMode";

import "@/styles/gov-theme.css";

export default function ImplementingAgencyRegistryPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuthStore();
  const isRm = user?.role === "RELATIONSHIP_MANAGER" || user?.role?.includes("RM");

  const [viewMode, setViewMode] = useResponsiveViewMode();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [viewingAgency, setViewingAgency] = useState<any | null>(null);
  const [agencyDetails, setAgencyDetails] = useState<any | null>(null);
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
    totalPages: Math.max(1, Math.ceil(rawOrgs.length / limit))
  };

  const handleOpenDetails = async (ngo: any) => {
    setViewingAgency(ngo);
    setAgencyDetails(null);
    setModalLoading(true);
    try {
      const full = await apiFetch<any>(`/admin/organizations/${ngo.id}`);
      setAgencyDetails(full);
    } catch {
      setAgencyDetails(ngo);
    } finally {
      setModalLoading(false);
    }
  };

  const items = (Array.isArray(rawOrgs) ? rawOrgs : []).map((org, index) => {
    const ngoProf = org.ngoProfile || {};
    return {
      id: org.id,
      displayId: `IA-${new Date(org.createdAt || Date.now()).getFullYear()}-${String((page - 1) * limit + index + 1).padStart(3, '0')}`,
      name: org.name,
      legalName: org.legalName || org.name,
      registrationNo: org.registrationNumber || ngoProf.csr1Number || ngoProf.darpanNumber || "—",
      darpanId: ngoProf.darpanNumber || "—",
      csr1Number: ngoProf.csr1Number || "—",
      district: org.district || "Maharashtra",
      focusArea: org.organizationType?.replace(/_/g, " ") || "Social Sector NGO",
      status: org.status === "ACTIVE" ? "Active" : org.status === "PENDING" ? "Under Review" : org.status.replace(/_/g, " "),
      statusVariant: org.status === "ACTIVE" ? "success" as const : "warning" as const,
      projectsCompleted: org._count?.projects || 0,
      email: org.officialEmail || org.email || "—",
      phone: org.phone || "—",
      isDb: true,
      raw: org
    };
  });

  const { sortedItems, sortKey, sortDirection, requestSort } = useTableSort(items);

  const hasActiveFilters = Boolean(searchTerm.trim() || statusFilter !== "all" || districtFilter !== "all");

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDistrictFilter("all");
    setPage(1);
  };

  const districtsCovered = new Set(items.map((i) => i.district).filter(Boolean)).size;

  return (
    <GovPortalLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-3 py-5 md:px-6 md:py-6 text-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StandardPageHeader
            title="Implementing Agencies (NGOs)"
            category="Admin / Agencies"
            description="Verified registry of NITI Aayog DARPAN & MCA CSR-1 accredited Grassroots NGOs, non-profit trusts, and implementing partners in Maharashtra."
          />
          <div className="flex items-center gap-2">
            <ViewToggle view={viewMode} onChange={setViewMode} />
          </div>
        </div>

        {/* KPI Stats Bar */}
        <StatCardGroup columns={4}>
          <StatCard
            label="Total Implementing Agencies"
            value={pagination.total}
            icon={HeartHandshake}
            colorTheme="emerald"
            sublabel="NITI Aayog & CSR-1 registered"
          />
          <StatCard
            label="Active & Verified"
            value={pagination.active}
            icon={ShieldCheck}
            colorTheme="blue"
            sublabel="Approved for CSR partnerships"
          />
          <StatCard
            label="Under Review"
            value={pagination.pending}
            icon={Clock}
            colorTheme="amber"
            sublabel="Pending compliance check"
          />
          <StatCard
            label="Districts Covered"
            value={districtsCovered || 1}
            icon={MapPin}
            colorTheme="purple"
            sublabel="Grassroots footprint"
          />
        </StatCardGroup>

        {/* Sleek Single-Row Search & Filters Bar */}
        <div className="flex flex-col md:flex-row items-center gap-2.5 p-2.5 sm:p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search agency by name, DARPAN ID or registration..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs md:text-sm rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <XCircle size={14} />
              </button>
            )}
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
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Under Review">Under Review</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          {/* District Filter */}
          <div className="w-full md:w-56">
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

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors shrink-0"
            >
              Reset
            </button>
          )}
        </div>

        {/* Responsive Implementing Agencies List / Grid */}
        <GovCard className="overflow-hidden shadow-xs border border-slate-200/80">
          <GovCardHeader className="!px-4 !py-3.5 md:!px-5 md:!py-4 flex flex-row items-center justify-between border-b border-slate-100">
            <GovCardTitle className="text-sm md:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <HeartHandshake size={18} className="text-emerald-700" />
              <span>Registered Implementing Agencies</span>
              <span className="text-xs font-bold text-slate-500 ml-1">({pagination.total})</span>
            </GovCardTitle>
          </GovCardHeader>

          <GovCardBody className="!p-0">
            {viewMode === "list" ? (
              /* LIST VIEW: Sortable Table */
              <div className="w-full md:overflow-x-auto">
                <table className="w-full block md:table text-left border-collapse text-xs md:text-sm">
                  <thead className="hidden md:table-header-group border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider font-extrabold text-slate-500">
                    <tr>
                      <SortableTh sortKey="name" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-5 py-3.5">Organization Name</SortableTh>
                      <SortableTh sortKey="registrationNo" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3.5">Registration / DARPAN</SortableTh>
                      <SortableTh sortKey="district" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3.5">District Scope</SortableTh>
                      <SortableTh sortKey="focusArea" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3.5">Accreditation</SortableTh>
                      <SortableTh sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3.5">Status</SortableTh>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="block md:table-row-group divide-y-0 md:divide-y md:divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 size={24} className="animate-spin text-blue-600" />
                            <span>Loading implementing agencies...</span>
                          </div>
                        </td>
                      </tr>
                    ) : sortedItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                          No implementing agency partners found matching the selected criteria.
                        </td>
                      </tr>
                    ) : (
                      sortedItems.map((ngo) => (
                        <tr 
                          key={ngo.id}
                          className="block md:table-row mb-3 md:mb-0 bg-white border border-slate-200 md:border-none rounded-xl md:rounded-none shadow-xs md:shadow-none hover:bg-slate-50/80 transition-colors overflow-hidden"
                        >
                          <td 
                            data-label="Organization" 
                            className="flex md:table-cell flex-col md:flex-row items-start md:items-center px-4 md:px-5 py-3 md:py-4 border-b border-slate-100 md:border-none before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden before:mb-0.5"
                          >
                            <div className="flex flex-col">
                              <button
                                type="button"
                                onClick={() => handleOpenDetails(ngo)}
                                className="font-bold text-slate-900 hover:text-blue-700 transition-colors text-left cursor-pointer"
                              >
                                {ngo.name}
                              </button>
                              <span className="text-[11px] text-slate-400 font-medium break-all">
                                {ngo.email}
                              </span>
                            </div>
                          </td>
                          <td 
                            data-label="Reg / DARPAN" 
                            className="flex md:table-cell justify-between items-center px-4 md:px-4 py-2.5 md:py-4 border-b border-slate-100 md:border-none font-mono text-xs before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left"
                          >
                            <span className="font-semibold text-slate-700 break-all">
                              {ngo.registrationNo}
                            </span>
                          </td>
                          <td 
                            data-label="District" 
                            className="flex md:table-cell justify-between items-center px-4 md:px-4 py-2.5 md:py-4 border-b border-slate-100 md:border-none font-medium text-slate-700 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left"
                          >
                            {ngo.district}
                          </td>
                          <td 
                            data-label="Accreditation" 
                            className="flex md:table-cell justify-between items-center px-4 md:px-4 py-2.5 md:py-4 border-b border-slate-100 md:border-none whitespace-nowrap align-middle before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left"
                          >
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap inline-flex items-center">
                              Verified NGO
                            </span>
                          </td>
                          <td 
                            data-label="Status" 
                            className="flex md:table-cell justify-between items-center px-4 md:px-4 py-2.5 md:py-4 border-b border-slate-100 md:border-none whitespace-nowrap align-middle before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left"
                          >
                            <GovStatusBadge variant={ngo.statusVariant}>{ngo.status}</GovStatusBadge>
                          </td>
                          <td className="block md:table-cell px-4 md:px-5 py-3 md:py-4 bg-slate-50/50 md:bg-transparent text-right">
                            <div className="flex justify-end items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenDetails(ngo)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/90 hover:bg-blue-100 text-blue-900 font-bold text-xs shadow-2xs transition-all hover:scale-[1.02] cursor-pointer"
                                title="View detailed agency profile"
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
              /* GRID VIEW: Responsive Agency Cards */
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                  <div className="col-span-full py-12 text-center text-slate-500 font-medium">
                    <Loader2 size={24} className="animate-spin text-blue-600 mx-auto mb-2" />
                    <span>Loading agencies...</span>
                  </div>
                ) : sortedItems.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-slate-500 font-medium">
                    No implementing agency partners found matching the selected criteria.
                  </div>
                ) : (
                  sortedItems.map((ngo) => (
                    <div
                      key={ngo.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 hover:shadow-sm transition-all space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-900 border border-emerald-200">
                            Verified NGO
                          </span>
                          <GovStatusBadge variant={ngo.statusVariant}>{ngo.status}</GovStatusBadge>
                        </div>

                        <h3 className="font-extrabold text-slate-900 text-sm line-clamp-2">
                          {ngo.name}
                        </h3>

                        <div className="space-y-1 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin size={12} className="text-slate-400 shrink-0" />
                            <span>{ngo.district}</span>
                          </div>
                          {ngo.email && ngo.email !== "—" && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Mail size={12} className="text-slate-400 shrink-0" />
                              <span className="truncate">{ngo.email}</span>
                            </div>
                          )}
                          <div className="pt-1 text-[11px] font-mono text-slate-600">
                            Reg: {ngo.registrationNo}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {ngo.focusArea}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(ngo)}
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
                  Showing page {page} of {pagination.totalPages} ({pagination.total} agencies)
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

      {/* COMPREHENSIVE VIEW AGENCY DETAILS MODAL */}
      <GovModal
        open={Boolean(viewingAgency)}
        onClose={() => { setViewingAgency(null); setAgencyDetails(null); }}
        title={viewingAgency?.name || "Implementing Agency Profile"}
        width={720}
      >
        {viewingAgency && (
          <div className="space-y-4 text-xs">
            {modalLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <Loader2 size={32} className="animate-spin text-blue-600" />
                <p className="text-xs font-bold text-slate-500">Loading comprehensive agency profile...</p>
              </div>
            ) : (
              (() => {
                const data = agencyDetails || viewingAgency.raw || viewingAgency;
                const ngoProf = data.ngoProfile || {};
                const docs = data.documents || [];

                return (
                  <div className="space-y-4">
                    {/* Header Card */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                          <HeartHandshake size={24} />
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
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Implementing NGO
                        </span>
                      </div>
                    </div>

                    {/* Statutory & Accreditation Profile */}
                    <div className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-3">
                      <h4 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                        <ShieldCheck size={15} className="text-purple-600 shrink-0" /> Accreditation & Statutory IDs
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">NITI Aayog DARPAN ID</span>
                          <span className="font-mono font-bold text-emerald-900 break-all">{ngoProf.darpanNumber || data.darpanId || "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">MCA CSR-1 Registration</span>
                          <span className="font-mono font-bold text-emerald-900 break-all">{ngoProf.csr1Number || data.csr1Number || data.registrationNumber || "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">PAN Number</span>
                          <span className="font-mono font-semibold text-slate-800">{data.pan || "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">Year Established</span>
                          <span className="font-semibold text-slate-800">{ngoProf.yearEstablished || data.yearEstablished || "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">FCRA Registration</span>
                          <span className="font-semibold text-slate-800">{ngoProf.fcraDetails || "Not Applicable"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">Account Status</span>
                          <span className="font-bold text-emerald-700">{data.status || "ACTIVE"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tax Exemption Status */}
                    <div className="p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/40 space-y-3">
                      <h4 className="text-[11px] font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-2 border-b border-emerald-200/60 pb-2">
                        <ShieldCheck size={15} className="text-emerald-700 shrink-0" /> Tax Exemption Certificates (12A & 80G)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 bg-white rounded-xl border border-emerald-100">
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">12A Certificate</span>
                          <span className="font-bold text-emerald-800 text-xs">
                            {ngoProf.certificate12AUrl ? "✓ 12A Certified" : "12A Registered"}
                          </span>
                          {ngoProf.certificate12AUrl && (
                            <a href={ngoProf.certificate12AUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold mt-1 text-[11px] inline-flex items-center gap-1">
                              View Certificate <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-emerald-100">
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">80G Tax Exemption</span>
                          <span className="font-bold text-emerald-800 text-xs">
                            {ngoProf.certificate80GUrl ? "✓ 80G Active (50% Exemption)" : "80G Registered"}
                          </span>
                          {ngoProf.certificate80GUrl && (
                            <a href={ngoProf.certificate80GUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold mt-1 text-[11px] inline-flex items-center gap-1">
                              View Certificate <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contact & Headquarters Location */}
                    <div className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-3">
                      <h4 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                        <MapPin size={15} className="text-blue-600 shrink-0" /> Registered Field Office & Contact
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
                          <span className="text-slate-400 block font-bold text-[10px] uppercase">Office Address</span>
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
                      <Button type="button" variant="secondary" onClick={() => { setViewingAgency(null); setAgencyDetails(null); }}>
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

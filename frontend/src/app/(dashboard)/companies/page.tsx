"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApiQuery } from "@/lib/apiHooks";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { useResponsiveViewMode } from "@/hooks/useResponsiveViewMode";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { Loader } from "@/components/ui/Loader";
import { Pagination } from "@/components/ui/Pagination";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTh } from "@/components/ui/SortableTh";
import {
  Building2,
  ShieldCheck,
  Coins,
  Search,
  MapPin,
  Building,
  Eye,
  X,
  Mail,
  Phone,
  Globe,
  FileText,
  CheckCircle2,
  FileCheck,
  ExternalLink,
  Layers
} from "lucide-react";

export default function CompaniesPage() {
  const { data: envelope, isLoading } = useApiQuery<any>(
    ["companies"],
    "/companies"
  );

  const [viewMode, setViewMode] = useResponsiveViewMode();
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);

  const rawCompanies: any[] = Array.isArray(envelope)
    ? envelope
    : Array.isArray(envelope?.data)
    ? envelope.data
    : Array.isArray(envelope?.data?.companies)
    ? envelope.data.companies
    : Array.isArray(envelope?.companies)
    ? envelope.companies
    : [];

  const companiesList = rawCompanies.map((c: any) => {
    const profile = c.csrCompanyProfile || {};
    const budgetVal = profile.annualCsrBudget || profile.currentYearCsrBudget || c.csrBudget;
    const formattedBudget = budgetVal ? `₹${(Number(budgetVal) / 10000000).toFixed(1)} Cr` : "N/A";
    const cinNumber = c.cin || c.registrationNumber || "N/A";
    const districtName = c.district || c.address || c.state || "Maharashtra";
    const industryName = c.companyType || c.industry || "Corporate Partner";
    const status = c.status || "REGISTERED";
    const cinVerified = c.mcaVerificationStatus === "VERIFIED" || Boolean(c.cin && c.cin !== "N/A");

    return {
      id: c.id,
      name: c.name || c.legalName || c.displayName || "Corporate Partner",
      cin: cinNumber,
      district: districtName,
      status,
      industry: industryName,
      budget: formattedBudget,
      rawBudget: budgetVal ? Number(budgetVal) : 0,
      cinVerified,
      raw: c
    };
  });

  const totalBudget = companiesList.reduce((acc, c) => acc + c.rawBudget, 0);
  const formattedTotalBudget = totalBudget > 0
    ? `₹${(totalBudget / 10000000).toFixed(1)} Cr`
    : "₹0.0 Cr";

  const filteredCompanies = companiesList.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.cin.toLowerCase().includes(search.toLowerCase()) ||
    c.district.toLowerCase().includes(search.toLowerCase())
  );

  const { sortedItems: sortedCompanies, sortKey, sortDirection, requestSort } = useTableSort(filteredCompanies, {
    customGetters: {
      name: (c: any) => c.name,
      cin: (c: any) => c.cin,
      industry: (c: any) => c.industry,
      district: (c: any) => c.district,
      budget: (c: any) => c.rawBudget,
      status: (c: any) => c.status,
    }
  });

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  const totalPages = Math.ceil(sortedCompanies.length / ITEMS_PER_PAGE);
  const paginatedCompanies = sortedCompanies.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <GovPortalLayout>
      <GovPageHeader
        title="CSR Companies & Corporate Partners Directory"
        description="Comprehensive directory of corporate entities registered for CSR partnerships in Maharashtra."
        breadcrumb="Home / Companies"
      />

      <div className="space-y-6">
        {/* KPI Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Empaneled Companies"
            value={companiesList.length}
            icon={Building2}
            index={0}
            colorTheme="purple"
            badge="Registered Corporate Partners"
            sublabel="Verified Companies"
          />
          <StatCard
            label="Verified Status"
            value={companiesList.filter((c: any) => c.status === "VERIFIED" || c.status === "ACTIVE").length}
            icon={ShieldCheck}
            index={1}
            colorTheme="blue"
            badge="Verified Status"
            sublabel="MCA Statutory Checked"
          />
          <StatCard
            label="Pledged Outlay Budget"
            value={formattedTotalBudget}
            icon={Coins}
            index={2}
            colorTheme="amber"
            badge="Total Allocation"
            sublabel="Statewide CSR Pledged"
          />
        </div>

        {/* Controls Bar */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search company name, CIN number, or district..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-none transition-all placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500">{filteredCompanies.length} Companies</span>
            <ViewToggle view={viewMode} onChange={setViewMode} />
          </div>
        </div>

        {/* Content View */}
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader label="Loading Company Directory from Database..." />
          </div>
        ) : companiesList.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center shadow-xs">
            <Building className="mx-auto text-slate-300 mb-3" size={48} />
            <h3 className="text-base font-bold text-slate-800">No Corporate Partners Registered</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are currently no corporate companies registered in the database.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedCompanies.map((c: any, idx: number) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  className="group relative rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/50 to-purple-50/20 p-5 shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col justify-between gap-4 overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600" />
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-md">
                        {c.cin}
                      </span>
                      <GovStatusBadge variant={c.status === "VERIFIED" || c.status === "ACTIVE" ? "success" : "warning"}>
                        {c.status}
                      </GovStatusBadge>
                    </div>
                    <h3 className="mt-3 font-extrabold text-sm text-slate-900 group-hover:text-purple-950 transition-colors">
                      {c.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{c.industry}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1 font-medium">
                      <MapPin size={13} className="text-slate-400" /> {c.district}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-purple-900">{c.budget}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedCompany(c.raw)}
                        className="inline-flex items-center justify-center p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={15} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredCompanies.length}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs overflow-x-auto">
              <table className="gov-table w-full text-xs">
                <thead>
                  <tr>
                    <SortableTh sortKey="name" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Company Name</SortableTh>
                    <SortableTh sortKey="cin" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>CIN Number</SortableTh>
                    <SortableTh sortKey="industry" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Industry</SortableTh>
                    <SortableTh sortKey="district" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>District</SortableTh>
                    <SortableTh sortKey="budget" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Active Budget</SortableTh>
                    <SortableTh sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Status</SortableTh>
                    <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase tracking-wider text-center text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCompanies.length > 0 ? (
                    paginatedCompanies.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="font-bold text-slate-900">{c.name}</td>
                        <td className="font-mono text-xs text-purple-700 font-semibold">{c.cin}</td>
                        <td className="text-slate-600 font-medium">{c.industry}</td>
                        <td className="text-slate-700">{c.district}</td>
                        <td className="font-extrabold text-purple-950">{c.budget}</td>
                        <td>
                          <GovStatusBadge variant={c.status === "VERIFIED" || c.status === "ACTIVE" ? "success" : "warning"}>
                            {c.status}
                          </GovStatusBadge>
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedCompany(c.raw)}
                            className="inline-flex items-center justify-center h-8 w-8 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 rounded-lg transition-all shadow-2xs"
                            title="View Company Details"
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500 font-medium">
                        No companies match your search criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredCompanies.length}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            </div>
          </div>
        )}

        {/* Company Details Modal */}
        <AnimatePresence>
          {selectedCompany && (
            <CompanyDetailsModal
              company={selectedCompany}
              onClose={() => setSelectedCompany(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </GovPortalLayout>
  );
}

function CompanyDetailsModal({ company, onClose }: { company: any; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    // Lock body scrolling while modal is open
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop += e.deltaY;
    }
  };

  const profile = company?.csrCompanyProfile || {};

  const formatCurrency = (val: any) => {
    if (!val || isNaN(Number(val))) return "N/A";
    const num = Number(val);
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakh`;
    return `₹${num.toLocaleString("en-IN")}`;
  };

  const sectors = Array.isArray(profile.preferredSectors) ? profile.preferredSectors : [];
  const districts = Array.isArray(profile.preferredDistricts) ? profile.preferredDistricts : [];
  const documents = Array.isArray(company.documents) ? company.documents : [];

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/80 p-4 sm:p-6 backdrop-blur-md overflow-hidden"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        className="relative flex flex-col w-full max-w-4xl max-h-[85vh] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
      >
        {/* Fixed Modal Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-extrabold text-lg shadow-2xs">
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-extrabold text-slate-900">{company.name || company.legalName || "Corporate Partner"}</h2>
                <GovStatusBadge variant={company.status === "ACTIVE" || company.status === "VERIFIED" ? "success" : "warning"}>
                  {company.status || "REGISTERED"}
                </GovStatusBadge>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                CIN: <span className="font-mono font-bold text-purple-700">{company.cin || company.registrationNumber || "N/A"}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content Body with scrollRef */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 text-xs text-slate-700 select-text"
        >
          {/* Section 1: Statutory & Registration Information */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-5 shadow-2xs">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-200/60 pb-2">
              <ShieldCheck size={16} className="text-purple-600" /> Statutory & Registration Details
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-slate-400 block font-medium">Legal Name</span>
                <span className="font-bold text-slate-900">{company.legalName || company.name || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">PAN Number</span>
                <span className="font-mono font-bold text-slate-900">{company.pan || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">GSTIN</span>
                <span className="font-mono font-bold text-slate-900">{company.gstin || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Registration Number</span>
                <span className="font-mono font-semibold text-slate-800">{company.registrationNumber || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Company Type</span>
                <span className="font-semibold text-slate-800">{company.companyType || "Private Limited Company"}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Incorporation Year</span>
                <span className="font-semibold text-slate-800">{company.yearOfIncorporation || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">MCA Verification Status</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 size={13} /> {company.mcaVerificationStatus || "VERIFIED"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Company Status</span>
                <span className="font-semibold text-slate-800">{company.companyStatus || "ACTIVE"}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Headquarters */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-5 shadow-2xs">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-200/60 pb-2">
              <MapPin size={16} className="text-blue-600" /> Contact & Headquarters Location
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-2.5">
                <Mail size={16} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400 block font-medium">Official Email</span>
                  <span className="font-semibold text-slate-900">{company.officialEmail || "N/A"}</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Phone size={16} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400 block font-medium">Official Phone</span>
                  <span className="font-semibold text-slate-900">{company.officialPhone || "N/A"}</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Globe size={16} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400 block font-medium">Website</span>
                  {company.website ? (
                    <a
                      href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                    >
                      {company.website} <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span className="font-medium text-slate-500">N/A</span>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400 block font-medium">District, State & Pincode</span>
                  <span className="font-semibold text-slate-900">
                    {company.district || "N/A"}, {company.state || "Maharashtra"} {company.pincode ? `- ${company.pincode}` : ""}
                  </span>
                </div>
              </div>
            </div>

            {(company.address || company.registeredOfficeAddress || company.corporateOfficeAddress) && (
              <div className="mt-4 pt-3 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {company.registeredOfficeAddress && (
                  <div>
                    <span className="text-slate-400 block font-medium">Registered Office Address</span>
                    <span className="font-medium text-slate-800">{company.registeredOfficeAddress}</span>
                  </div>
                )}
                {(company.address || company.corporateOfficeAddress) && (
                  <div>
                    <span className="text-slate-400 block font-medium">Corporate / Office Address</span>
                    <span className="font-medium text-slate-800">{company.corporateOfficeAddress || company.address}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: CSR Budget & Financial Profile */}
          <div className="rounded-xl border border-purple-200/80 bg-purple-50/40 p-5 shadow-2xs">
            <h3 className="text-xs font-extrabold text-purple-950 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-purple-200/60 pb-2">
              <Coins size={16} className="text-amber-600" /> CSR Portfolio & Financial Outlay
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-2xs">
                <span className="text-slate-400 block text-[10px] font-extrabold uppercase">Annual CSR Budget</span>
                <span className="font-extrabold text-purple-900 text-sm">{formatCurrency(profile.annualCsrBudget || profile.currentYearCsrBudget)}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-2xs">
                <span className="text-slate-400 block text-[10px] font-extrabold uppercase">Net Worth</span>
                <span className="font-extrabold text-slate-900 text-sm">{formatCurrency(profile.netWorth)}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-2xs">
                <span className="text-slate-400 block text-[10px] font-extrabold uppercase">Annual Turnover</span>
                <span className="font-extrabold text-slate-900 text-sm">{formatCurrency(profile.turnover)}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-2xs">
                <span className="text-slate-400 block text-[10px] font-extrabold uppercase">Net Profit</span>
                <span className="font-extrabold text-slate-900 text-sm">{formatCurrency(profile.netProfit)}</span>
              </div>
            </div>

            {/* Additional CSR Compliance Metrics */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white/80 p-2.5 rounded-lg border border-purple-100">
                <span className="text-slate-400 block text-[10px] font-semibold">2% CSR Obligation</span>
                <span className="font-bold text-slate-800">{formatCurrency(profile.twoPercentCsrObligation || profile.csrObligationAmount)}</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-lg border border-purple-100">
                <span className="text-slate-400 block text-[10px] font-semibold">Unspent CSR Amount</span>
                <span className="font-bold text-slate-800">{formatCurrency(profile.unspentCsrAmount)}</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-lg border border-purple-100">
                <span className="text-slate-400 block text-[10px] font-semibold">Financial Year</span>
                <span className="font-bold text-slate-800">{profile.financialYear || "FY 2025-26"}</span>
              </div>
            </div>

            {/* Preferred Sectors & Geography */}
            <div className="mt-4 pt-3 border-t border-purple-200/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-700 font-bold block mb-1.5 flex items-center gap-1">
                  <Layers size={13} className="text-purple-600" /> Preferred CSR Focus Sectors
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {sectors.length > 0 ? (
                    sectors.map((s: string, i: number) => (
                      <span key={i} className="bg-white border border-purple-200 text-purple-900 px-2.5 py-1 rounded-md text-[11px] font-semibold shadow-2xs">
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">Not specified</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-slate-700 font-bold block mb-1.5 flex items-center gap-1">
                  <MapPin size={13} className="text-purple-600" /> Target Geography / Districts
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {districts.length > 0 ? (
                    districts.map((d: string, i: number) => (
                      <span key={i} className="bg-white border border-slate-200 text-slate-800 px-2.5 py-1 rounded-md text-[11px] font-semibold shadow-2xs">
                        {d}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">Statewide (All Districts)</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Submitted Onboarding Documents */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-5 shadow-2xs">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-200/60 pb-2">
              <FileCheck size={16} className="text-indigo-600" /> Submitted Onboarding Documents
            </h3>
            {documents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-bold">
                        <FileText size={18} />
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-slate-900 block truncate text-xs">{doc.title || doc.fileName || "Document"}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{doc.documentType || "ONBOARDING"}</span>
                      </div>
                    </div>
                    {doc.fileUrl ? (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 shrink-0 inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 transition-colors"
                      >
                        View File <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">No Link</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-6 rounded-xl border border-dashed border-slate-200 text-center">
                <FileText className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-xs font-medium text-slate-500">No uploaded documents recorded for this company yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Modal Footer */}
        <div className="shrink-0 border-t border-slate-200 bg-slate-50/90 px-6 py-3.5 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-200 hover:bg-slate-300 px-5 py-2 text-xs font-extrabold text-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

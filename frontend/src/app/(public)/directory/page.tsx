"use client";

import { useEffect, useMemo, useState } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import {
  Users,
  Building2,
  Clock,
  ShieldCheck,
  Search,
  X,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  LayoutGrid,
  List,
  Copy,
  Check
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTh } from "@/components/ui/SortableTh";

const districts = [
  ["Ahmednagar", "Nashik"], ["Akola", "Amravati"], ["Amravati", "Amravati"], ["Chhatrapati Sambhajinagar", "Aurangabad"],
  ["Beed", "Aurangabad"], ["Bhandara", "Nagpur"], ["Buldhana", "Amravati"], ["Chandrapur", "Nagpur"],
  ["Dhule", "Nashik"], ["Gadchiroli", "Nagpur"], ["Gondia", "Nagpur"], ["Hingoli", "Aurangabad"],
  ["Jalgaon", "Nashik"], ["Jalna", "Aurangabad"], ["Kolhapur", "Pune"], ["Latur", "Aurangabad"],
  ["Mumbai City", "Konkan"], ["Mumbai Suburban", "Konkan"], ["Nagpur", "Nagpur"], ["Nanded", "Aurangabad"],
  ["Nandurbar", "Nashik"], ["Nashik", "Nashik"], ["Dharashiv", "Aurangabad"], ["Palghar", "Konkan"],
  ["Parbhani", "Aurangabad"], ["Pune", "Pune"], ["Raigad", "Konkan"], ["Ratnagiri", "Konkan"],
  ["Sangli", "Pune"], ["Satara", "Pune"], ["Sindhudurg", "Konkan"], ["Solapur", "Pune"],
  ["Thane", "Konkan"], ["Wardha", "Nagpur"], ["Washim", "Amravati"], ["Yavatmal", "Amravati"],
];

const directoryEntries = [
  {
    id: "STATE-CSR-CELL",
    role: "State CSR Cell",
    officer: "Member Secretary, State CSR Cell",
    designation: "State CSR Coordination Desk",
    division: "State",
    district: "Maharashtra",
    office: "Maharashtra CSR Authority, Mantralaya Annexe, Mumbai",
    email: "statecell.user@mahacsr.gov.in",
    phone: "022-2202 1234",
    responsibility: "State-level coordination, Level 2 grievances, reports, public directory governance.",
  },
  {
    id: "RM-STATE-01",
    role: "CSR Relationship Manager",
    officer: "Relationship Manager - Corporate Desk",
    designation: "CSR Relationship Manager",
    division: "State",
    district: "Maharashtra",
    office: "MahaCSR Relationship Manager Desk",
    email: "rm.user@mahacsr.gov.in",
    phone: "022-2202 1240",
    responsibility: "Corporate enquiry response, government pitch verification, corporate-government coordination.",
  },
  {
    id: "HELPDESK-01",
    role: "Helpdesk",
    officer: "Public Helpdesk Executive",
    designation: "Helpdesk",
    division: "State",
    district: "Maharashtra",
    office: "MahaCSR Public Helpdesk",
    email: "helpdesk@mahacsr.gov.in",
    phone: "1800-123-4567",
    responsibility: "Static page support, document guidance, tracking help and public queries.",
  },
  ...districts.map(([district, division]) => ({
    id: `DNO-${district.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`,
    role: "District Nodal Officer",
    officer: `District Nodal Officer, ${district}`,
    designation: "District Nodal Officer",
    division,
    district,
    office: `District Collectorate / District Planning Office, ${district}`,
    email: `dno.${district.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@mahacsr.gov.in`,
    phone: "District office number to be published",
    responsibility: "Development need dialogue, MoU coordination, milestone verification, UC certification and Level 1 grievance response.",
  })),
];

const unique = (key: "role" | "division" | "district") => ["All", ...Array.from(new Set(directoryEntries.map((entry) => entry[key])))];

export default function DirectoryPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("All");
  const [division, setDivision] = useState("All");
  const [district, setDistrict] = useState("All");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [liveEntries, setLiveEntries] = useState<typeof directoryEntries>([]);

  const handleCopyEmail = (email: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await apiFetch<any>("/public/directory");
        const data = response.data ?? response;
        const mapped: typeof directoryEntries = [];

        (data.relationshipManagers ?? []).forEach((rm: any, i: number) => {
          mapped.push({
            id: `LIVE-RM-${i}`,
            role: "CSR Relationship Manager",
            officer: rm.email?.split("@")[0]?.replace(/\./g, " ") || "Relationship Manager",
            designation: "CSR Relationship Manager",
            division: "State",
            district: rm.district || "Maharashtra",
            office: "MahaCSR Relationship Manager Desk",
            email: rm.email || "-",
            phone: "Published on request",
            responsibility: "Corporate enquiry response, government pitch verification, corporate-government coordination.",
          });
        });

        (data.nodalOfficers ?? []).forEach((no: any, i: number) => {
          mapped.push({
            id: `LIVE-DNO-${i}`,
            role: "District Nodal Officer",
            officer: no.name || `District Nodal Officer, ${no.district}`,
            designation: no.designation || "District Nodal Officer",
            division: "Appointed",
            district: no.district,
            office: no.department || `District Office, ${no.district}`,
            email: no.email || "-",
            phone: "Published on request",
            responsibility: `${no.domain || "Development"} domain — MoU coordination, milestone verification, UC certification and Level 1 grievance response.`,
          });
        });

        if (active) setLiveEntries(mapped);
      } catch {
        if (active) setLiveEntries([]);
      }
    })();
    return () => { active = false; };
  }, []);

  const allEntries = useMemo(() => [...liveEntries, ...directoryEntries], [liveEntries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allEntries.filter((entry) => {
      const matchesSearch = !q || Object.values(entry).join(" ").toLowerCase().includes(q);
      const matchesRole = role === "All" || entry.role === role;
      const matchesDivision = division === "All" || entry.division === division;
      const matchesDistrict = district === "All" || entry.district === district;
      return matchesSearch && matchesRole && matchesDivision && matchesDistrict;
    });
  }, [allEntries, search, role, division, district]);

  const { sortedItems: sortedDirectory, sortKey, sortDirection, requestSort } = useTableSort(filtered, {
    customGetters: {
      officer: (e) => `${e.officer} ${e.role}`,
      district: (e) => `${e.district} ${e.division}`,
      office: (e) => e.office,
      contact: (e) => `${e.email} ${e.phone}`,
      responsibility: (e) => e.responsibility,
    }
  });

  return (
    <GovPortalLayout showSidebar={false}>
      <div className="w-full min-w-0 max-w-7xl mx-auto px-4 py-8 sm:px-6 md:py-10 text-slate-900 space-y-6">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              <span>Public Portal</span>
              <span>/</span>
              <span className="text-blue-600 font-extrabold">Public Contact Directory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              MahaCSR Administrative Directory
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Official public directory of the State CSR Cell, Relationship Managers, Public Helpdesk, and District Nodal Officers across all 36 Maharashtra districts.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200">
              <ShieldCheck size={14} className="text-blue-600" />
              <span>Government of Maharashtra</span>
            </span>
          </div>
        </div>

        {/* 4 Metric Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Directory</span>
              <Users size={16} className="text-blue-600" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">{allEntries.length}</p>
            <p className="text-[11px] text-slate-500 font-medium">State, RM, helpdesk &amp; DNOs</p>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">District Officers</span>
              <Building2 size={16} className="text-emerald-600" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-900 font-mono">36 Districts</p>
            <p className="text-[11px] text-slate-500 font-medium">All Maharashtra Districts</p>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Helpdesk SLA</span>
              <Clock size={16} className="text-purple-600" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">2 Days</p>
            <p className="text-[11px] text-slate-500 font-medium">Public Query Resolution</p>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Corporate RM SLA</span>
              <ShieldCheck size={16} className="text-amber-600" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">5 Days</p>
            <p className="text-[11px] text-slate-500 font-medium">Corporate Enquiry Response</p>
          </div>
        </div>

        {/* Compact 1-Row Filter Toolbar */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-3.5 shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search officer, role, district, email or responsibility..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-8 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Role Select */}
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs cursor-pointer"
            >
              {unique("role").map((v) => (
                <option key={v} value={v}>{v === "All" ? "All Roles" : v}</option>
              ))}
            </select>

            {/* Division Select */}
            <select
              value={division}
              onChange={(e) => {
                setDivision(e.target.value);
                setDistrict("All");
              }}
              className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs cursor-pointer"
            >
              {unique("division").map((v) => (
                <option key={v} value={v}>{v === "All" ? "All Divisions" : `${v} Division`}</option>
              ))}
            </select>

            {/* District Select */}
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs cursor-pointer"
            >
              {(division === "All"
                ? unique("district")
                : ["All", ...districts.filter(([_, div]) => div === division).map(([dist]) => dist)]
              ).map((v) => (
                <option key={v} value={v}>{v === "All" ? "All Districts" : v}</option>
              ))}
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/60 self-start lg:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "table" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
                title="Table View"
              >
                <List size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "grid" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
                title="Card Grid View"
              >
                <LayoutGrid size={15} />
              </button>
            </div>

            {(search || role !== "All" || division !== "All" || district !== "All") && (
              <button
                onClick={() => {
                  setSearch("");
                  setRole("All");
                  setDivision("All");
                  setDistrict("All");
                }}
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                Reset
              </button>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-semibold text-slate-400">
            <span>
              Showing <strong className="text-slate-800">{filtered.length}</strong> of {allEntries.length} directory entries. Appointed live officials appear with verified status.
            </span>
            {search && (
              <button onClick={() => setSearch("")} className="text-xs font-bold text-rose-600 hover:underline cursor-pointer">
                Clear Search
              </button>
            )}
          </div>
        </div>

        {/* Directory View: Table View */}
        {viewMode === "table" && (
          <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <SortableTh sortKey="officer" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="py-3.5 px-4 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Role / Officer</SortableTh>
                    <SortableTh sortKey="district" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="py-3.5 px-4 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">District / Division</SortableTh>
                    <SortableTh sortKey="office" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="py-3.5 px-4 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Office</SortableTh>
                    <SortableTh sortKey="contact" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="py-3.5 px-4 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Contact Details</SortableTh>
                    <SortableTh sortKey="responsibility" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="py-3.5 px-4 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Responsibility Scope</SortableTh>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {sortedDirectory.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900">{entry.officer}</div>
                        <div className="mt-1">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[10px] font-extrabold border border-blue-200/60">
                            {entry.role}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-800 flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400" />
                          <span>{entry.district}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-semibold mt-0.5">{entry.division} Division</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium max-w-xs leading-snug">
                        {entry.office}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-800 font-bold">{entry.email}</span>
                          {entry.email !== "-" && (
                            <button
                              type="button"
                              onClick={() => handleCopyEmail(entry.email)}
                              className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5"
                              title="Copy Email"
                            >
                              {copiedEmail === entry.email ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Phone size={10} />
                          <span>{entry.phone}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium max-w-xs leading-relaxed">
                        {entry.responsibility}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold text-xs">
                        No directory entries match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Directory View: Grid Card View */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedDirectory.map((entry) => (
              <div
                key={entry.id}
                className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] font-extrabold border border-blue-200/60">
                      {entry.role}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                      <MapPin size={12} className="text-slate-400" />
                      <span>{entry.district}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                      {entry.officer}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{entry.designation}</p>
                  </div>

                  <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                    {entry.office}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-600 font-semibold truncate max-w-[220px]">
                      <Mail size={12} className="text-slate-400 shrink-0" />
                      <span className="font-mono text-[11px] truncate">{entry.email}</span>
                    </div>
                    {entry.email !== "-" && (
                      <button
                        type="button"
                        onClick={() => handleCopyEmail(entry.email)}
                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        {copiedEmail === entry.email ? "Copied" : "Copy"}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                    <Phone size={11} className="text-slate-400 shrink-0" />
                    <span>{entry.phone}</span>
                  </div>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="col-span-full rounded-3xl border border-slate-200/90 bg-white p-12 text-center shadow-xs space-y-2">
                <Users className="mx-auto text-slate-300 mb-2" size={44} />
                <h3 className="text-sm font-extrabold text-slate-800">No Directory Entries Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                  No administrative contacts match your search query or selected division/district filter.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Publication Advisory Banner */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-xs text-slate-600 font-medium leading-relaxed flex items-start gap-3">
          <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-900 block font-bold">Administrative Publication Note</strong>
            This directory is published under the Maharashtra State CSR Convergence Framework. District Nodal Officer assignments and Relationship Manager desks are continuously synced with official department notifications.
          </div>
        </div>

      </div>
    </GovPortalLayout>
  );
}

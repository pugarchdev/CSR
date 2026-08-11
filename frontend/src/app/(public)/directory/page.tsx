"use client";

import { useEffect, useMemo, useState } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { GovCard, GovCardBody, GovCardHeader, GovCardTitle } from "@/components/gov/GovCard";
import GovInput from "@/components/gov/GovInput";
import GovSelect from "@/components/gov/GovSelect";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { apiFetch } from "@/lib/api";

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
  const [liveEntries, setLiveEntries] = useState<typeof directoryEntries>([]);

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

  return (
    <GovPortalLayout showSidebar={false}>
      <div className="gov-public-main">
        <div className="gov-page-header">
          <div className="gov-breadcrumb">Home / Directory</div>
          <div style={{ color: "var(--gov-saffron)", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            Public contact directory
          </div>
          <h1 className="gov-page-title">Directory</h1>
          <p className="gov-page-description">
            Search the State CSR Cell, CSR Relationship Manager desk, public helpdesk and District Nodal Officer directory.
          </p>
        </div>

        {/* Responsive Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {[
            ["Directory Entries", allEntries.length.toString(), "State, RM, helpdesk and district officers"],
            ["District Nodal Officers", "36", "All Maharashtra districts"],
            ["Helpdesk SLA", "2 days", "Public query response"],
            ["RM SLA", "5 days", "Corporate enquiry response"],
          ].map(([label, value, note]) => (
            <GovCard key={label}>
              <GovCardBody>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gov-text-muted)", textTransform: "uppercase" }}>{label}</div>
                <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: "var(--gov-primary-dark)" }}>{value}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: "var(--gov-text-secondary)" }}>{note}</div>
              </GovCardBody>
            </GovCard>
          ))}
        </div>

        <GovCard>
          <GovCardHeader>
            <GovCardTitle>Search Officer Directory</GovCardTitle>
          </GovCardHeader>
          <GovCardBody>
            {/* Responsive Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <GovInput label="Keyword Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search officer, district, email..." />
              <GovSelect label="Role" value={role} onChange={(event) => setRole(event.target.value)}>
                {unique("role").map((value) => <option key={value}>{value}</option>)}
              </GovSelect>
              <GovSelect label="Division" value={division} onChange={(event) => { setDivision(event.target.value); setDistrict("All"); }}>
                {unique("division").map((value) => <option key={value}>{value}</option>)}
              </GovSelect>
              <GovSelect label="District" value={district} onChange={(event) => setDistrict(event.target.value)}>
                {(division === "All"
                  ? unique("district")
                  : ["All", ...districts.filter(([_, div]) => div === division).map(([dist]) => dist)]
                ).map((value) => <option key={value}>{value}</option>)}
              </GovSelect>
            </div>
            <div className="gov-help mt-3 text-sm text-gray-500">Showing {filtered.length} of {allEntries.length} directory entries. Officials appointed on the portal appear at the top with live details.</div>
          </GovCardBody>
        </GovCard>

        <GovCard className="gov-mt-4 mt-4 border-0 shadow-none md:border md:shadow-sm bg-transparent md:bg-white">
          <GovCardBody className="p-0 sm:p-0 md:p-0">
            {/* 
              -mx-4 and w-[calc(100%+32px)] forces it to break out of standard 16px parent padding on mobile. 
              Adjust to -mx-5 or -mx-6 if your standard container padding is larger.
            */}
            <div className="w-[calc(100%+32px)] -mx-4 sm:mx-0 sm:w-full md:border-0 md:rounded-xl md:overflow-hidden bg-white border-y sm:border-y-0 border-gray-200">
              <table className="w-full block md:table text-left border-collapse">
                <thead className="hidden md:table-header-group bg-gray-50/50 border-b border-gray-200">
                  <tr>
                    <th className="p-3 md:px-6 md:py-4 font-semibold text-gray-700 text-sm">Role / Officer</th>
                    <th className="p-3 md:px-6 md:py-4 font-semibold text-gray-700 text-sm">District / Division</th>
                    <th className="p-3 md:px-6 md:py-4 font-semibold text-gray-700 text-sm">Office</th>
                    <th className="p-3 md:px-6 md:py-4 font-semibold text-gray-700 text-sm">Contact</th>
                    <th className="p-3 md:px-6 md:py-4 font-semibold text-gray-700 text-sm">Responsibility</th>
                  </tr>
                </thead>
                <tbody className="block md:table-row-group p-4 md:p-0 bg-gray-50 md:bg-white">
                  {filtered.map((entry) => (
                    <tr 
                      key={entry.id}
                      className="block md:table-row mb-4 md:mb-0 bg-white border border-gray-200 md:border-0 md:border-b md:border-gray-200 last:border-b-0 shadow-sm md:shadow-none rounded-lg md:rounded-none overflow-hidden"
                    >
                      {/* Note the change here: removed relative & absolute positioning. Added before:block before:mb-1 before:text-xs */}
                      <td data-label="Role / Officer" className="block md:table-cell py-3 px-4 md:px-6 md:py-4 border-b md:border-none last:border-b-0 break-words text-sm text-gray-800 before:content-[attr(data-label)] before:block before:mb-1 before:text-xs before:uppercase before:font-bold before:text-gray-500 md:before:hidden">
                        <div style={{ fontWeight: 800, color: "var(--gov-primary-dark)" }}>{entry.officer}</div>
                        <div style={{ marginTop: 4 }}><GovStatusBadge variant="info">{entry.role}</GovStatusBadge></div>
                      </td>
                      <td data-label="District / Division" className="block md:table-cell py-3 px-4 md:px-6 md:py-4 border-b md:border-none last:border-b-0 break-words text-sm text-gray-800 before:content-[attr(data-label)] before:block before:mb-1 before:text-xs before:uppercase before:font-bold before:text-gray-500 md:before:hidden">
                        <div style={{ fontWeight: 700 }}>{entry.district}</div>
                        <div style={{ fontSize: 12, color: "var(--gov-text-muted)" }}>{entry.division} Division</div>
                      </td>
                      <td data-label="Office" className="block md:table-cell py-3 px-4 md:px-6 md:py-4 border-b md:border-none last:border-b-0 break-words text-sm text-gray-800 before:content-[attr(data-label)] before:block before:mb-1 before:text-xs before:uppercase before:font-bold before:text-gray-500 md:before:hidden">
                        {entry.office}
                      </td>
                      <td data-label="Contact" className="block md:table-cell py-3 px-4 md:px-6 md:py-4 border-b md:border-none last:border-b-0 break-words text-sm text-gray-800 before:content-[attr(data-label)] before:block before:mb-1 before:text-xs before:uppercase before:font-bold before:text-gray-500 md:before:hidden">
                        <div>{entry.email}</div>
                        <div style={{ marginTop: 4, color: "var(--gov-text-muted)" }}>{entry.phone}</div>
                      </td>
                      <td data-label="Responsibility" className="block md:table-cell py-3 px-4 md:px-6 md:py-4 border-b md:border-none last:border-b-0 break-words text-sm text-gray-600 before:content-[attr(data-label)] before:block before:mb-1 before:text-xs before:uppercase before:font-bold before:text-gray-500 md:before:hidden">
                        {entry.responsibility}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr className="block md:table-row">
                      <td colSpan={5} className="block md:table-cell p-6 text-center text-gray-500 text-sm">
                        No directory entries match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GovCardBody>
        </GovCard>

        <GovCard className="mt-4">
          <GovCardBody>
            <strong>Publication note:</strong> This directory is structured for portal use. Personal officer names and district office numbers should be connected to the official government master directory before production publication.
          </GovCardBody>
        </GovCard>
      </div>
    </GovPortalLayout>
  );
}

"use client";

import { useMemo, useState } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { GovCard, GovCardBody, GovCardHeader, GovCardTitle } from "@/components/gov/GovCard";
import GovInput from "@/components/gov/GovInput";
import GovSelect from "@/components/gov/GovSelect";
import GovStatusBadge from "@/components/gov/GovStatusBadge";

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return directoryEntries.filter((entry) => {
      const matchesSearch = !q || Object.values(entry).join(" ").toLowerCase().includes(q);
      const matchesRole = role === "All" || entry.role === role;
      const matchesDivision = division === "All" || entry.division === division;
      const matchesDistrict = district === "All" || entry.district === district;
      return matchesSearch && matchesRole && matchesDivision && matchesDistrict;
    });
  }, [search, role, division, district]);

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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
          {[
            ["Directory Entries", directoryEntries.length.toString(), "State, RM, helpdesk and district officers"],
            ["District Nodal Officers", "36", "All Maharashtra districts"],
            ["Helpdesk SLA", "2 days", "Static public query"],
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
              <GovInput label="Keyword Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search officer, district, email or responsibility" />
              <GovSelect label="Role" value={role} onChange={(event) => setRole(event.target.value)}>
                {unique("role").map((value) => <option key={value}>{value}</option>)}
              </GovSelect>
              <GovSelect label="Division" value={division} onChange={(event) => setDivision(event.target.value)}>
                {unique("division").map((value) => <option key={value}>{value}</option>)}
              </GovSelect>
              <GovSelect label="District" value={district} onChange={(event) => setDistrict(event.target.value)}>
                {unique("district").map((value) => <option key={value}>{value}</option>)}
              </GovSelect>
            </div>
            <div className="gov-help">Showing {filtered.length} of {directoryEntries.length} directory entries.</div>
          </GovCardBody>
        </GovCard>

        <GovCard className="gov-mt-2">
          <GovCardBody style={{ padding: 0 }}>
            <div className="gov-table-container">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Role / Officer</th>
                    <th>District / Division</th>
                    <th>Office</th>
                    <th>Contact</th>
                    <th>Responsibility</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <div style={{ fontWeight: 800, color: "var(--gov-primary-dark)" }}>{entry.officer}</div>
                        <div style={{ marginTop: 4 }}><GovStatusBadge variant="info">{entry.role}</GovStatusBadge></div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{entry.district}</div>
                        <div style={{ fontSize: 12, color: "var(--gov-text-muted)" }}>{entry.division} Division</div>
                      </td>
                      <td>{entry.office}</td>
                      <td>
                        <div>{entry.email}</div>
                        <div style={{ marginTop: 4, color: "var(--gov-text-muted)" }}>{entry.phone}</div>
                      </td>
                      <td>{entry.responsibility}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5}>No directory entries match the selected filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GovCardBody>
        </GovCard>

        <GovCard className="gov-mt-2">
          <GovCardBody>
            <strong>Publication note:</strong> This directory is structured for portal use. Personal officer names and district office numbers should be connected to the official government master directory before production publication.
          </GovCardBody>
        </GovCard>
      </div>
    </GovPortalLayout>
  );
}

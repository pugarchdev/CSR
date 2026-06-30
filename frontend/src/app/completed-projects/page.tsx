"use client";

import { useMemo, useState } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { GovCard, GovCardBody, GovCardHeader, GovCardTitle } from "@/components/gov/GovCard";
import GovSelect from "@/components/gov/GovSelect";
import GovInput from "@/components/gov/GovInput";
import GovStatusBadge from "@/components/gov/GovStatusBadge";

const completedProjects = [
  {
    id: "CP-2026-PUN-001",
    title: "Digital Learning Lab - Zilla Parishad Schools",
    district: "Pune",
    taluka: "Mulshi",
    sector: "Education",
    corporate: "Mahindra CSR Trust",
    implementingAgency: "Verified Education Partner",
    year: "FY 2025-26",
    amount: "Rs. 75.00 lakh",
    beneficiaries: "4,500 students",
    evidence: "Installation photos, school acceptance certificate, teacher orientation report, UC verified",
    status: "Completed",
  },
  {
    id: "CP-2026-NDB-002",
    title: "Primary Health Centre Equipment Support",
    district: "Nandurbar",
    taluka: "Akkalkuwa",
    sector: "Health",
    corporate: "HDFC Bank CSR",
    implementingAgency: "Verified Health Partner",
    year: "FY 2025-26",
    amount: "Rs. 120.00 lakh",
    beneficiaries: "18,000 patients annually",
    evidence: "Delivery challan, installation certificate, institution acceptance, UC verified",
    status: "Completed",
  },
  {
    id: "CP-2026-GAD-003",
    title: "Water Conservation Check Dam Package",
    district: "Gadchiroli",
    taluka: "Aheri",
    sector: "Water",
    corporate: "Tata Projects CSR",
    implementingAgency: "Verified Rural Partner",
    year: "FY 2025-26",
    amount: "Rs. 98.00 lakh",
    beneficiaries: "9,000 farming households",
    evidence: "Site readiness photos, construction milestones, handover note, UC verified",
    status: "Completed",
  },
  {
    id: "CP-2025-KOL-004",
    title: "Girls Hostel Sanitation Renovation",
    district: "Kolhapur",
    taluka: "Karveer",
    sector: "Sanitation",
    corporate: "Bajaj Foundation",
    implementingAgency: "District Works Agency",
    year: "FY 2024-25",
    amount: "Rs. 42.00 lakh",
    beneficiaries: "620 girl students",
    evidence: "Before-after photos, engineer completion certificate, institution acceptance",
    status: "Completed",
  },
  {
    id: "CP-2025-NAG-005",
    title: "Skill Training Lab for ITI Students",
    district: "Nagpur",
    taluka: "Nagpur Urban",
    sector: "Skill Development",
    corporate: "Infosys Foundation",
    implementingAgency: "Government ITI Partner",
    year: "FY 2024-25",
    amount: "Rs. 88.00 lakh",
    beneficiaries: "1,200 trainees",
    evidence: "Equipment register, trainee attendance, lab handover, UC verified",
    status: "Completed",
  },
];

const unique = (key: keyof typeof completedProjects[number]) => ["All", ...Array.from(new Set(completedProjects.map((item) => String(item[key]))))];

export default function CompletedProjectsPage() {
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("All");
  const [sector, setSector] = useState("All");
  const [corporate, setCorporate] = useState("All");
  const [year, setYear] = useState("All");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return completedProjects.filter((project) => {
      const matchesSearch = !q || Object.values(project).join(" ").toLowerCase().includes(q);
      const matchesDistrict = district === "All" || project.district === district;
      const matchesSector = sector === "All" || project.sector === sector;
      const matchesCorporate = corporate === "All" || project.corporate === corporate;
      const matchesYear = year === "All" || project.year === year;
      return matchesSearch && matchesDistrict && matchesSector && matchesCorporate && matchesYear;
    });
  }, [search, district, sector, corporate, year]);

  return (
    <GovPortalLayout showSidebar={false}>
      <div className="gov-public-main">
        <div className="gov-page-header">
          <div className="gov-breadcrumb">Home / Completed Projects Gallery</div>
          <div style={{ color: "var(--gov-saffron)", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            Public completion record
          </div>
          <h1 className="gov-page-title">Completed Projects Gallery</h1>
          <p className="gov-page-description">
            Permanent, searchable public record of all portal projects by district, sector, corporate and year.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
          {[
            ["Records", completedProjects.length.toString(), "Demo completion register"],
            ["Evidence", "UC + photos", "Completion proof"],
            ["Filters", "4", "District, sector, corporate, year"],
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
            <GovCardTitle>Search and Filter Completed Projects</GovCardTitle>
          </GovCardHeader>
          <GovCardBody>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
              <GovInput label="Keyword Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search project, district, corporate or evidence" />
              <GovSelect label="District" value={district} onChange={(event) => setDistrict(event.target.value)}>
                {unique("district").map((value) => <option key={value}>{value}</option>)}
              </GovSelect>
              <GovSelect label="Sector" value={sector} onChange={(event) => setSector(event.target.value)}>
                {unique("sector").map((value) => <option key={value}>{value}</option>)}
              </GovSelect>
              <GovSelect label="Corporate" value={corporate} onChange={(event) => setCorporate(event.target.value)}>
                {unique("corporate").map((value) => <option key={value}>{value}</option>)}
              </GovSelect>
              <GovSelect label="Year" value={year} onChange={(event) => setYear(event.target.value)}>
                {unique("year").map((value) => <option key={value}>{value}</option>)}
              </GovSelect>
            </div>
            <div className="gov-help">Showing {filtered.length} of {completedProjects.length} completed project records.</div>
          </GovCardBody>
        </GovCard>

        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {filtered.map((project) => (
            <GovCard key={project.id}>
              <GovCardBody>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "var(--gov-link)" }}>{project.id}</div>
                    <h2 style={{ margin: "4px 0 6px", fontSize: 17, fontWeight: 800, color: "var(--gov-primary-dark)" }}>{project.title}</h2>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: "var(--gov-text-secondary)" }}>{project.evidence}</p>
                  </div>
                  <GovStatusBadge variant="success">{project.status}</GovStatusBadge>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, marginTop: 14, fontSize: 13 }}>
                  <div><strong>District:</strong> {project.district}, {project.taluka}</div>
                  <div><strong>Sector:</strong> {project.sector}</div>
                  <div><strong>Corporate:</strong> {project.corporate}</div>
                  <div><strong>Implementing Agency:</strong> {project.implementingAgency}</div>
                  <div><strong>Amount:</strong> {project.amount}</div>
                  <div><strong>Beneficiaries:</strong> {project.beneficiaries}</div>
                  <div><strong>Year:</strong> {project.year}</div>
                </div>
              </GovCardBody>
            </GovCard>
          ))}
          {filtered.length === 0 && (
            <GovCard>
              <GovCardBody>No completed project records match the selected filters.</GovCardBody>
            </GovCard>
          )}
        </div>
      </div>
    </GovPortalLayout>
  );
}

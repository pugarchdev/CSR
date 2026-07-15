"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { GovCard, GovCardBody, GovCardHeader, GovCardTitle } from "@/components/gov/GovCard";
import GovSelect from "@/components/gov/GovSelect";
import GovInput from "@/components/gov/GovInput";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { apiFetch } from "@/lib/api";
import { Loader2, MapPin, Building2, Users, ImageIcon } from "lucide-react";

interface GalleryProject {
  id: string;
  projectId: string;
  title: string;
  district: string;
  taluka: string;
  location: string;
  sector: string;
  corporate: string;
  amount: number | string;
  utilizedAmount: number | string;
  completedAt: string | null;
  year: number | null;
  beneficiaries: string | null;
  impact: string | null;
  photos: string[];
}

interface GalleryFilters {
  districts: string[];
  sectors: string[];
  corporates: string[];
  years: number[];
}

const fmtCurrency = (value: number | string) => {
  const n = Number(value || 0);
  if (n >= 10000000) return `Rs. ${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `Rs. ${(n / 100000).toFixed(2)} Lakh`;
  return `Rs. ${n.toLocaleString("en-IN")}`;
};

export default function CompletedProjectsPage() {
  const [projects, setProjects] = useState<GalleryProject[]>([]);
  const [filters, setFilters] = useState<GalleryFilters>({ districts: [], sectors: [], corporates: [], years: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("All");
  const [sector, setSector] = useState("All");
  const [corporate, setCorporate] = useState("All");
  const [year, setYear] = useState("All");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "24" });
      if (search.trim()) params.set("search", search.trim());
      if (district !== "All") params.set("district", district);
      if (sector !== "All") params.set("sector", sector);
      if (corporate !== "All") params.set("corporate", corporate);
      if (year !== "All") params.set("year", year);

      const response = await apiFetch<any>(`/public/completed-projects?${params.toString()}`);
      const data = response.data ?? response;
      setProjects(data.projects ?? []);
      setTotal(data.pagination?.total ?? (data.projects?.length ?? 0));
      if (data.filters) setFilters(data.filters);
    } catch (err: any) {
      setError(err?.message || "Failed to load completed projects");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [search, district, sector, corporate, year]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const totalBudget = useMemo(
    () => projects.reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [projects]
  );

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
            Permanent, searchable public record of CSR convergence projects delivered across Maharashtra — by district, sector, corporate and year.
          </p>
        </div>

        <div className="gov-grid-auto-sm" style={{ marginBottom: 16 }}>
          {[
            ["Completed Projects", total.toString(), "Verified on portal"],
            ["Total Investment", fmtCurrency(totalBudget), "Approved budgets (page)"],
            ["Districts", filters.districts.length.toString(), "With completed work"],
            ["Sectors", filters.sectors.length.toString(), "Development domains"],
          ].map(([label, value, note]) => (
            <GovCard key={label}>
              <GovCardBody>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gov-text-muted)", textTransform: "uppercase" }}>{label}</div>
                <div style={{ marginTop: 6, fontSize: 20, fontWeight: 800, color: "var(--gov-primary-dark)" }}>{value}</div>
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
            <div className="gov-grid-auto">
              <GovInput label="Keyword Search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Project, corporate, district or ID" />
              <GovSelect label="District" value={district} onChange={(e) => setDistrict(e.target.value)}>
                <option value="All">All Districts</option>
                {filters.districts.map((v) => <option key={v} value={v}>{v}</option>)}
              </GovSelect>
              <GovSelect label="Sector" value={sector} onChange={(e) => setSector(e.target.value)}>
                <option value="All">All Sectors</option>
                {filters.sectors.map((v) => <option key={v} value={v}>{v}</option>)}
              </GovSelect>
              <GovSelect label="Corporate" value={corporate} onChange={(e) => setCorporate(e.target.value)}>
                <option value="All">All Corporates</option>
                {filters.corporates.map((v) => <option key={v} value={v}>{v}</option>)}
              </GovSelect>
              <GovSelect label="Year" value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="All">All Years</option>
                {filters.years.map((v) => <option key={v} value={String(v)}>{v}</option>)}
              </GovSelect>
            </div>
          </GovCardBody>
        </GovCard>

        {loading ? (
          <div className="gov-flex-center" style={{ padding: "48px 0", color: "var(--gov-text-muted)", gap: 10 }}>
            <Loader2 className="animate-spin" size={20} /> Loading completed projects...
          </div>
        ) : error ? (
          <GovCard><GovCardBody><div style={{ color: "var(--gov-danger)" }}>{error}</div></GovCardBody></GovCard>
        ) : projects.length === 0 ? (
          <GovCard>
            <GovCardBody>
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--gov-text-muted)" }}>
                No completed projects match the selected filters yet. As projects are certified complete on the portal, they will appear here automatically.
              </div>
            </GovCardBody>
          </GovCard>
        ) : (
          <div className="gov-grid-auto-lg" style={{ marginTop: 16 }}>
            {projects.map((project) => (
              <GovCard key={project.id}>
                <div
                  style={{
                    height: 150,
                    background: project.photos?.[0]
                      ? `url(${project.photos[0]}) center/cover no-repeat`
                      : "linear-gradient(135deg, #0e2144, #14274e)",
                    borderTopLeftRadius: "var(--gov-radius)",
                    borderTopRightRadius: "var(--gov-radius)",
                    position: "relative",
                    display: "flex",
                    alignItems: "flex-end",
                  }}
                >
                  {!project.photos?.[0] && (
                    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "rgba(255,255,255,0.35)" }}>
                      <ImageIcon size={40} />
                    </div>
                  )}
                  <div style={{ position: "absolute", top: 10, right: 10 }}>
                    <GovStatusBadge variant="success">Completed</GovStatusBadge>
                  </div>
                </div>
                <GovCardBody>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gov-link)" }}>{project.projectId}</div>
                  <h2 style={{ margin: "4px 0 8px", fontSize: 16, fontWeight: 800, color: "var(--gov-primary-dark)", lineHeight: 1.4 }}>{project.title}</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--gov-text-secondary)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <MapPin size={14} className="shrink-0" /> {project.district}{project.taluka ? `, ${project.taluka}` : ""}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Building2 size={14} className="shrink-0" /> {project.corporate}
                    </div>
                    {project.beneficiaries && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Users size={14} className="shrink-0" /> {project.beneficiaries}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--gov-border)" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--gov-text-muted)", fontWeight: 700 }}>{project.sector}</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--gov-primary-dark)" }}>{fmtCurrency(project.amount)}</div>
                    </div>
                    {project.year && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gov-text-secondary)" }}>{project.year}</div>
                    )}
                  </div>
                </GovCardBody>
              </GovCard>
            ))}
          </div>
        )}
      </div>
    </GovPortalLayout>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import "../../styles/gov-theme.css";

type TabType = "mandate" | "rules" | "schedule" | "circulars";

export default function AboutPage({ params }: { params?: { tab?: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("mandate");

  useEffect(() => {
    if (params?.tab) {
      setActiveTab(params.tab as TabType);
    }
  }, [params?.tab]);

  const circulars = [
    { id: "cir-1", title: "GR-2026/05: Allocation of CSR funds to aspirational talukas in Maharashtra", date: "June 12, 2026", size: "1.4 MB", type: "PDF" },
    { id: "cir-2", title: "Directive 43: Exemption limits & audit guidelines for self-funded CSR trusts", date: "May 28, 2026", size: "850 KB", type: "PDF" },
    { id: "cir-3", title: "Notification 12/2026: Mandatory S3 file evidence upload for escrow releases", date: "May 10, 2026", size: "2.1 MB", type: "PDF" },
    { id: "cir-4", title: "Sample Board-room CSR Report Template & Excel ledger sheets", date: "April 15, 2026", size: "3.2 MB", type: "ZIP" }
  ];

  const tabs = [
    { id: "mandate", label: "MahaCSR Mandate" },
    { id: "rules", label: "CSR Rules & Act" },
    { id: "schedule", label: "Schedule VII Sectors" },
    { id: "circulars", label: "Official Circulars" }
  ];

  return (
    <GovPortalLayout userRole="PUBLIC">
      <GovPageHeader
        breadcrumb="Home / About"
        title="About MahaCSR Portal"
        description="Access compliance standards, statutory mandates, Schedule VII guidelines, and official Government of Maharashtra circulars"
      />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "2px solid var(--gov-border)", marginBottom: 24 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as TabType);
              router.push(`/about/${tab.id}`);
            }}
            style={{
              padding: "12px 20px",
              fontSize: 12,
              fontWeight: 700,
              border: "none",
              borderBottom: activeTab === tab.id ? "3px solid var(--gov-saffron)" : "3px solid transparent",
              background: activeTab === tab.id ? "var(--gov-bg-secondary)" : "transparent",
              color: activeTab === tab.id ? "var(--gov-saffron)" : "var(--gov-text-secondary)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "mandate" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Portal Objective</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              <p style={{ marginBottom: 16, lineHeight: 1.7 }}>
                MahaCSR (Government of Maharashtra CSR Collaboration Platform) serves as the official single-source directory and matching platform for corporate social responsibility initiatives across the state.
              </p>
              <p style={{ lineHeight: 1.7 }}>
                Established under the guidance of the Department of Industries and the CSR Commissioner of Maharashtra, the portal facilitates transparent, audited funding matches between corporations and verified grassroot non-governmental organizations (NGOs) to promote regional development.
              </p>
            </GovCardBody>
          </GovCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GovCard>
              <GovCardHeader>
                <GovCardTitle>NGO Compliance Checks</GovCardTitle>
              </GovCardHeader>
              <GovCardBody>
                <ul style={{ display: "flex", flexDirection: "column", gap: 10, listStyle: "none", padding: 0 }}>
                  <li style={{ display: "flex", gap: 8, fontSize: 13 }}>
                    <span style={{ color: "var(--gov-success)", fontWeight: 700 }}>✓</span>
                    <span>Valid <strong>CSR-1 Number</strong> registered with the MCA</span>
                  </li>
                  <li style={{ display: "flex", gap: 8, fontSize: 13 }}>
                    <span style={{ color: "var(--gov-success)", fontWeight: 700 }}>✓</span>
                    <span>Verified <strong>NGO Darpan ID</strong> from NITI Aayog</span>
                  </li>
                  <li style={{ display: "flex", gap: 8, fontSize: 13 }}>
                    <span style={{ color: "var(--gov-success)", fontWeight: 700 }}>✓</span>
                    <span>Valid <strong>12A and 80G</strong> tax exemption certifications</span>
                  </li>
                  <li style={{ display: "flex", gap: 8, fontSize: 13 }}>
                    <span style={{ color: "var(--gov-success)", fontWeight: 700 }}>✓</span>
                    <span>Three years of audited financial balance sheets</span>
                  </li>
                </ul>
              </GovCardBody>
            </GovCard>

            <GovCard>
              <GovCardHeader>
                <GovCardTitle>Corporate Spend Audits</GovCardTitle>
              </GovCardHeader>
              <GovCardBody>
                <ul style={{ display: "flex", flexDirection: "column", gap: 10, listStyle: "none", padding: 0 }}>
                  <li style={{ display: "flex", gap: 8, fontSize: 13 }}>
                    <span style={{ color: "var(--gov-success)", fontWeight: 700 }}>✓</span>
                    <span>Direct tracking of milestone completion evidence</span>
                  </li>
                  <li style={{ display: "flex", gap: 8, fontSize: 13 }}>
                    <span style={{ color: "var(--gov-success)", fontWeight: 700 }}>✓</span>
                    <span>Generation of annual board-room ready compliance PDFs</span>
                  </li>
                  <li style={{ display: "flex", gap: 8, fontSize: 13 }}>
                    <span style={{ color: "var(--gov-success)", fontWeight: 700 }}>✓</span>
                    <span>Historical project matching and impact validation logs</span>
                  </li>
                  <li style={{ display: "flex", gap: 8, fontSize: 13 }}>
                    <span style={{ color: "var(--gov-success)", fontWeight: 700 }}>✓</span>
                    <span>GIS mapping of district-wise capital distributions</span>
                  </li>
                </ul>
              </GovCardBody>
            </GovCard>
          </div>
        </div>
      )}

      {activeTab === "rules" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Companies Act, 2013 - Section 135</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, lineHeight: 1.7 }}>
                <p>
                  Every company having a <strong>net worth of ₹500 crore or more</strong>, or <strong>turnover of ₹1,000 crore or more</strong>, or a <strong>net profit of ₹5 crore or more</strong> during any financial year must constitute a Corporate Social Responsibility Committee of the Board.
                </p>
                <p>
                  The Board of every such company shall ensure that the company spends, in every financial year, <strong>at least 2% of the average net profits</strong> of the company made during the three immediately preceding financial years, in pursuance of its Corporate Social Responsibility Policy.
                </p>
                <p>
                  The platform helps automate this matching by validating budget thresholds and ensuring compliance documentation matches current Ministry of Corporate Affairs (MCA) registries.
                </p>
              </div>
            </GovCardBody>
          </GovCard>

          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Regional Spending Guidelines</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              <p style={{ lineHeight: 1.7 }}>
                Under the central rules, companies are encouraged to give preference to the <strong>local areas</strong> and areas around where they operate. For Maharashtra, this portal maps operations directly to local districts and aspirational talukas, allowing corporates to target underdeveloped regions such as Gadchiroli, Washim, and Nandurbar.
              </p>
            </GovCardBody>
          </GovCard>
        </div>
      )}

      {activeTab === "schedule" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { index: "I", title: "Eradicating Hunger & Poverty", desc: "Initiatives targeting malnutrition, sanitation, and clean drinking water systems in rural communities.", sdg: "SDG 1 & 2" },
            { index: "II", title: "Promoting Education & Literacy", desc: "Zilla Parishad smart-classrooms, vocational teacher training, and science lab installations.", sdg: "SDG 4" },
            { index: "III", title: "Gender Equality & Empowerment", desc: "Vocational training for women, self-help group seed funding, and safety hostel upgrades.", sdg: "SDG 5" },
            { index: "IV", title: "Environmental Sustainability", desc: "Taluka afforestation, solar-grid systems for public clinics, and watershed rainwater harvesting projects.", sdg: "SDG 13" },
            { index: "V", title: "Protection of Heritage & Arts", desc: "Conservation of ancient forts, support for traditional handloom weavers, and public libraries.", sdg: "SDG 11" },
            { index: "VI", title: "Veterans & Armed Forces Support", desc: "Resettlement benefits for ex-servicemen, widows, and their dependents in rural areas.", sdg: "SDG 16" }
          ].map((sec) => (
            <GovCard key={sec.index}>
              <GovCardBody>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ 
                    fontSize: 10, 
                    fontWeight: 800, 
                    color: "var(--gov-saffron)", 
                    background: "#fff7ed", 
                    padding: "4px 10px", 
                    borderRadius: 12 
                  }}>
                    Clause {sec.index}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--gov-primary)" }}>{sec.sdg}</span>
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "var(--gov-primary-dark)" }}>
                  {sec.title}
                </h4>
                <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--gov-text-secondary)" }}>
                  {sec.desc}
                </p>
              </GovCardBody>
            </GovCard>
          ))}
        </div>
      )}

      {activeTab === "circulars" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Download Center</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              <p>
                Download verified government resolutions (GR), compliance guidelines, and report templates published by the Secretary to the Government of Maharashtra.
              </p>
            </GovCardBody>
          </GovCard>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {circulars.map((cir) => (
              <GovCard key={cir.id}>
                <GovCardBody>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: "var(--gov-primary-dark)" }}>
                        {cir.title}
                      </h4>
                      <p style={{ fontSize: 11, color: "var(--gov-text-muted)" }}>
                        Published: {cir.date} • Size: {cir.size}
                      </p>
                    </div>
                    <GovButton variant="secondary" style={{ fontSize: 12, padding: "8px 16px", whiteSpace: "nowrap" }}>
                      Download ({cir.type})
                    </GovButton>
                  </div>
                </GovCardBody>
              </GovCard>
            ))}
          </div>
        </div>
      )}
    </GovPortalLayout>
  );
}

// Made with Bob

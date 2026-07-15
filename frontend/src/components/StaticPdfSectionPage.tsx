"use client";

import { useMemo, useState } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { GovCard, GovCardBody } from "@/components/gov/GovCard";

interface StaticPdfSectionPageProps {
  title: string;
  description: string;
  items: string[];
  eyebrow?: string;
  metrics?: Array<{ label: string; value: string; note?: string }>;
  sections?: Array<{ title: string; items: string[] }>;
  records?: Array<{ title: string; detail: string; meta?: string; tag?: string }>;
  table?: { columns: string[]; rows: string[][] };
}

export default function StaticPdfSectionPage({ title, description, items, eyebrow, metrics = [], sections = [], records = [], table }: StaticPdfSectionPageProps) {
  const [recordSearch, setRecordSearch] = useState("");
  const filteredRecords = useMemo(() => {
    const query = recordSearch.trim().toLowerCase();
    if (!query) return records;
    return records.filter((record) =>
      [record.title, record.detail, record.meta, record.tag]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [recordSearch, records]);

  return (
    <GovPortalLayout showSidebar={false}>
      <div className="gov-public-main">
        <div className="gov-page-header">
          <div className="gov-breadcrumb">Home / {title}</div>
          {eyebrow && (
            <div style={{ color: "var(--gov-saffron)", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
              {eyebrow}
            </div>
          )}
          <h1 className="gov-page-title">{title}</h1>
          <p className="gov-page-description">{description}</p>
        </div>

        {metrics.length > 0 && (
          <div className="gov-grid-auto-sm" style={{ marginBottom: 16 }}>
            {metrics.map((metric) => (
              <GovCard key={metric.label}>
                <GovCardBody>
                  <div style={{ fontSize: 11, color: "var(--gov-text-muted)", fontWeight: 800, textTransform: "uppercase" }}>{metric.label}</div>
                  <div style={{ marginTop: 6, color: "var(--gov-primary-dark)", fontSize: 22, fontWeight: 800 }}>{metric.value}</div>
                  {metric.note && <div style={{ marginTop: 4, color: "var(--gov-text-secondary)", fontSize: 12 }}>{metric.note}</div>}
                </GovCardBody>
              </GovCard>
            ))}
          </div>
        )}

        <GovCard>
          <GovCardBody>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {items.map((item) => (
                <div key={item} className="rounded border border-slate-200 bg-white p-4 text-sm font-semibold leading-6 text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </GovCardBody>
        </GovCard>

        {sections.length > 0 && (
          <div className="gov-grid-auto-lg" style={{ marginTop: 16 }}>
            {sections.map((section) => (
              <GovCard key={section.title}>
                <GovCardBody>
                  <h2 style={{ margin: "0 0 12px", fontSize: 16, color: "var(--gov-primary-dark)", fontWeight: 800 }}>{section.title}</h2>
                  <div style={{ display: "grid", gap: 10 }}>
                    {section.items.map((item) => (
                      <div key={item} style={{ borderLeft: "3px solid var(--gov-saffron)", paddingLeft: 10, fontSize: 13, lineHeight: 1.6, color: "var(--gov-text-secondary)" }}>
                        {item}
                      </div>
                    ))}
                  </div>
                </GovCardBody>
              </GovCard>
            ))}
          </div>
        )}

        {records.length > 0 && (
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <GovCard>
              <GovCardBody>
                <label className="gov-label" htmlFor={`${title.replace(/\s+/g, "-").toLowerCase()}-search`}>
                  Search records
                </label>
                <input
                  id={`${title.replace(/\s+/g, "-").toLowerCase()}-search`}
                  className="gov-input"
                  value={recordSearch}
                  onChange={(event) => setRecordSearch(event.target.value)}
                  placeholder="Search by title, district, department, tag or keyword"
                />
                <div className="gov-help">
                  Showing {filteredRecords.length} of {records.length} record{records.length === 1 ? "" : "s"}.
                </div>
              </GovCardBody>
            </GovCard>
            {filteredRecords.map((record) => (
              <GovCard key={record.title}>
                <GovCardBody>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 16, color: "var(--gov-primary-dark)", fontWeight: 800 }}>{record.title}</h2>
                      <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.65, color: "var(--gov-text-secondary)" }}>{record.detail}</p>
                      {record.meta && <div style={{ marginTop: 8, fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 700 }}>{record.meta}</div>}
                    </div>
                    {record.tag && (
                      <span className="gov-status gov-status-info">{record.tag}</span>
                    )}
                  </div>
                </GovCardBody>
              </GovCard>
            ))}
            {filteredRecords.length === 0 && (
              <GovCard>
                <GovCardBody>
                  <div style={{ color: "var(--gov-text-muted)", fontSize: 13 }}>No records match the current search.</div>
                </GovCardBody>
              </GovCard>
            )}
          </div>
        )}

        {table && (
          <GovCard className="gov-mt-2">
            <GovCardBody style={{ padding: 0 }}>
              <div className="gov-table-container">
                <table className="gov-table">
                  <thead>
                    <tr>{table.columns.map((column) => <th key={column}>{column}</th>)}</tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row) => (
                      <tr key={row.join("|")}>{row.map((cell, index) => <td key={`${cell}-${index}`}>{cell}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GovCardBody>
          </GovCard>
        )}
      </div>
    </GovPortalLayout>
  );
}

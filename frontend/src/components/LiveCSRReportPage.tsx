"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";

const COLORS = ["#14274e", "#f7941d", "#2e7d32", "#c62828", "#1565c0", "#ad1457", "#ef6c00", "#37474f"];

type LiveCSRReportPageProps = {
  title: string;
  description: string;
  endpoint: string;
};

type ReportResponse = {
  reportName: string;
  kpis?: Record<string, number | string>;
  charts?: Record<string, Array<{ label: string; value: number }>>;
  table?: Array<Record<string, unknown>>;
  exportFormats?: string[];
};

const filterFields = ["financialYear", "district", "taluka", "village", "sector", "department", "company", "ngo", "status", "dateRange"];

export default function LiveCSRReportPage({ title, description, endpoint }: LiveCSRReportPageProps) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: string) => {
    if (format === "Print") {
      window.print();
      return;
    }

    if (format === "PDF") {
      setIsExporting(true);
      setTimeout(async () => {
        const element = document.getElementById("report-printable-area");
        if (!element) {
          setIsExporting(false);
          return;
        }

        try {
          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff"
          });

          const imgData = canvas.toDataURL("image/jpeg", 0.95);
          const pdf = new jsPDF("p", "mm", "a4");
          const imgWidth = 210;
          const pageHeight = 297;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          let heightLeft = imgHeight;
          let position = 0;

          pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;

          while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
          }

          pdf.save(`${report?.reportName || "csr-report"}-${new Date().toISOString().split("T")[0]}.pdf`);
        } catch (err) {
          console.error("PDF generation failed:", err);
          alert("Failed to export PDF. Falling back to print.");
          window.print();
        } finally {
          setIsExporting(false);
        }
      }, 300);
      return;
    }

    if (format === "CSV" || format === "Excel") {
      const rows = report?.table || [];
      if (rows.length === 0) {
        alert("No table data available to export");
        return;
      }
      const columns = Object.keys(rows[0]);
      const csvContent = [
        columns.join(","),
        ...rows.map(row => columns.map(col => `"${String(row[col] ?? "").replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${report?.reportName || "csr-report"}-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
  };

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value.trim()) params.set(key, value.trim());
    });
    return params.toString();
  }, [filters]);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const data = await apiFetch<ReportResponse>(`${endpoint}${query ? `?${query}` : ""}`);
        setReport(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to load report");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [endpoint, query]);

  const rows = report?.table || [];
  const columns = rows[0] ? Object.keys(rows[0]).slice(0, 8) : [];
  const chartGroups = Object.entries(report?.charts || {});

  return (
    <main className="mx-auto min-h-screen max-w-7xl space-y-5 px-5 py-7">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/60 pb-5">
        <div>
          <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">CSR Reports</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500 leading-normal">{description}</p>
        </div>
      </div>

      <section className="border border-slate-200/60 bg-white/70 backdrop-blur-xl rounded-2xl p-4 shadow-glass">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {filterFields.map((field) => (
            <label key={field} className="text-xs font-bold uppercase tracking-wide text-gov-muted">
              {field.replace(/([A-Z])/g, " $1")}
              <input
                className="mt-1 w-full border border-gov-line px-3 py-2 text-sm font-medium normal-case tracking-normal text-gov-ink outline-none focus:border-gov-blue"
                value={filters[field] || ""}
                onChange={(event) => setFilters((current) => ({ ...current, [field]: event.target.value }))}
              />
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(report?.exportFormats || ["PDF", "Excel", "CSV", "Print"]).map((format) => (
            <button
              key={format}
              type="button"
              className="border border-gov-line bg-white px-3 py-2 text-xs font-extrabold text-gov-blue hover:bg-gov-mist"
              onClick={() => handleExport(format)}
            >
              Export {format}
            </button>
          ))}
        </div>
      </section>

      {loading && <section className="border border-gov-line bg-white p-8 text-center text-sm font-bold text-gov-muted">Loading report data...</section>}
      {error && !loading && <section className="border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">{error}</section>}

      {!loading && !error && report && (
        <div id="report-printable-area" className={isExporting ? "bg-white p-8 text-slate-900 font-sans space-y-6" : "space-y-5"}>
          {isExporting && (
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 100 100" className="w-12 h-12" fill="none" stroke="currentColor">
                  <polygon points="50,5 82,18 95,50 82,82 50,95 18,82 5,50 18,18" stroke="#14274e" strokeWidth="4.5" fill="#e3f0fa" />
                  <path d="M28,32 L72,32 M32,44 L68,44 M28,56 L72,56 M36,68 L64,68" stroke="#f7941d" strokeWidth="3" strokeLinecap="round" />
                  <path d="M42,80 L58,80" stroke="#14274e" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <div>
                  <h2 className="text-lg font-extrabold text-[#14274e]">MahaCSR Platform</h2>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider font-extrabold">Government of Maharashtra</p>
                </div>
              </div>
              <div className="text-right text-[10px] text-slate-550">
                <p><strong>Report:</strong> {report.reportName}</p>
                <p><strong>Generated:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {Object.entries(report.kpis || {}).slice(0, 8).map(([label, value]) => (
              <div key={label} className="border border-gov-line bg-white p-4 shadow-sm">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gov-muted">{label}</p>
                <p className="mt-2 text-xl font-extrabold text-gov-navy">{typeof value === "number" ? value.toLocaleString() : value}</p>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {chartGroups.length === 0 ? (
              <div className="border border-gov-line bg-white p-8 text-center text-sm text-gov-muted">No chart data for the selected filters.</div>
            ) : chartGroups.map(([name, points]) => {
              const isStatusChart = name.toLowerCase().includes("status");
              
              if (isStatusChart) {
                // Render a beautiful donut/pie chart
                return (
                  <div key={name} className="border border-gov-line bg-white p-5 shadow-sm flex flex-col">
                    <h2 className="text-sm font-extrabold uppercase tracking-wide text-gov-navy mb-4">{name.replace(/([A-Z])/g, " $1")}</h2>
                    <div className="h-[250px] w-full flex-grow">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={points}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="label"
                          >
                            {points.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [value, "Total"]} />
                          <Legend formatter={(value) => value.replace(/_/g, " ")} wrapperStyle={{ fontSize: 10 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              }

              // Render a professional BarChart
              return (
                <div key={name} className="border border-gov-line bg-white p-5 shadow-sm flex flex-col">
                  <h2 className="text-sm font-extrabold uppercase tracking-wide text-gov-navy mb-4">{name.replace(/([A-Z])/g, " $1")}</h2>
                  <div className="h-[250px] w-full flex-grow">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" fontSize={10} tickLine={false} tickFormatter={(val) => val && val.length > 12 ? `${val.slice(0, 10)}..` : val} />
                        <YAxis fontSize={10} tickLine={false} allowDecimals={false} />
                        <Tooltip formatter={(value) => [value, "Count"]} />
                        <Bar dataKey="value" fill="#f7941d" radius={[4, 4, 0, 0]}>
                          {points.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="border border-slate-200/60 bg-white/70 backdrop-blur-xl rounded-2xl shadow-glass overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4 bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-900">Report Table</h2>
            </div>
            {rows.length === 0 ? (
              <div className="p-8 text-center text-sm text-gov-muted">No report rows match the selected filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-gov-mist text-[11px] uppercase tracking-wider text-gov-muted">
                    <tr>{columns.map((column) => <th key={column} className="px-4 py-3">{column}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gov-line">
                    {rows.map((row, index) => (
                      <tr key={index}>
                        {columns.map((column) => (
                          <td key={column} className="px-4 py-3 font-medium text-gov-ink">{String(row[column] ?? "-")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

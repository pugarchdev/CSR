"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Search, Building2, Award, Loader2, RefreshCw, Clock, Coins } from "lucide-react";
import { StandardPageHeader } from "@/components/layout/StandardPageHeader";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";
import { apiFetch } from "@/lib/api";

interface HandoverItem {
  id: string;
  projectName: string;
  department: string;
  donorCompany: string;
  implementingNgo: string;
  assetValueCr: number;
  handoverCertificateStatus: "SIGNED" | "PENDING_DEPARTMENT_SIGNATURE" | "UNDER_AUDIT";
  completionDate: string;
}

export default function HandoverPage() {
  const [items, setItems] = useState<HandoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadHandovers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<any[]>("/projects");
      if (Array.isArray(res) && res.length > 0) {
        const mapped: HandoverItem[] = res
          .filter((p: any) => p.status === "COMPLETED" || p.status === "TRANSFERRED" || p.status === "HANDOVER_PENDING")
          .map((p: any) => ({
            id: p.id,
            projectName: p.title || p.projectName || "CSR Project Asset",
            department: p.department || p.recipientDepartment || "Government Department",
            donorCompany: p.organization?.name || p.donorCompany || "CSR Corporate Partner",
            implementingNgo: p.implementingAgency?.name || p.implementingNgo || "Implementing Agency",
            assetValueCr: p.approvedBudget ? Number((p.approvedBudget / 10000000).toFixed(2)) : 0,
            handoverCertificateStatus: p.status === "TRANSFERRED" ? "SIGNED" : "PENDING_DEPARTMENT_SIGNATURE",
            completionDate: p.updatedAt ? p.updatedAt.split("T")[0] : new Date().toISOString().split("T")[0]
          }));
        setItems(mapped);
      } else {
        setItems([]);
      }
    } catch (err: any) {
      console.warn("Failed to load project handovers:", err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHandovers();
  }, []);

  const handleSignCertificate = async (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, handoverCertificateStatus: "SIGNED" } : item
      )
    );
  };

  const pendingCount = items.filter(
    (i) => i.handoverCertificateStatus === "PENDING_DEPARTMENT_SIGNATURE"
  ).length;

  const transferredCount = items.filter(
    (i) => i.handoverCertificateStatus === "SIGNED"
  ).length;

  const totalAssetValueCr = items.reduce(
    (acc, curr) => acc + (curr.assetValueCr || 0),
    0
  );

  const filtered = items.filter(
    (item) =>
      item.projectName.toLowerCase().includes(search.toLowerCase()) ||
      item.department.toLowerCase().includes(search.toLowerCase()) ||
      item.donorCompany.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 text-slate-900">
      <StandardPageHeader
        title="CSR Project Handover & Asset Transfer"
        category="Asset Transfer Desk"
        description="Formal sign-off and transfer of completed CSR infrastructure assets into State Government Department operational custody."
      />

      {/* Standard 4-Column Animated KPI Cards */}
      <StatCardGroup columns={4}>
        <StatCard
          label="Total Handover Assets"
          value={loading ? "…" : items.length}
          icon={Building2}
          index={0}
          colorTheme="blue"
          sublabel="Completed CSR assets"
        />
        <StatCard
          label="Pending Dept Sign-Off"
          value={loading ? "…" : pendingCount}
          icon={Clock}
          index={1}
          colorTheme="amber"
          sublabel="Ready for government takeover"
        />
        <StatCard
          label="Transferred Assets"
          value={loading ? "…" : transferredCount}
          icon={CheckCircle2}
          index={2}
          colorTheme="emerald"
          sublabel="Handover certificate executed"
        />
        <StatCard
          label="Transferred Asset Outlay"
          value={loading ? "…" : `₹${totalAssetValueCr.toFixed(1)} Cr`}
          icon={Coins}
          index={3}
          colorTheme="purple"
          sublabel="Public infrastructure value"
        />
      </StatCardGroup>

      {/* Main Table / Empty State Container */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by project, department, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
          </div>
          <button
            onClick={loadHandovers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all shrink-0 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="animate-spin text-blue-700" size={24} />
            <span className="text-xs font-extrabold uppercase tracking-wider">
              Loading Asset Transfer Records...
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center gap-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center border border-blue-100">
              <Building2 size={24} />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900">
              No Asset Handover Records Found
            </h3>
            <p className="text-xs text-slate-500 font-medium max-w-md leading-relaxed">
              {search
                ? `No handover records match "${search}". Try clearing your search.`
                : "There are currently no completed CSR projects or transferred assets recorded for your organization. Once your CSR projects complete execution, handover certificates and asset transfer records will be listed here for department sign-off."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <tr>
                  <th className="px-4 py-3">Completed CSR Project</th>
                  <th className="px-4 py-3">Recipient Department</th>
                  <th className="px-4 py-3">Donor & Implementer</th>
                  <th className="px-4 py-3">Asset Outlay</th>
                  <th className="px-4 py-3">Handover Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900 max-w-xs">
                      {item.projectName}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">{item.department}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-800">{item.donorCompany}</p>
                      <p className="text-[10px] text-slate-400">NGO: {item.implementingNgo}</p>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-blue-900">
                      ₹{item.assetValueCr} Cr
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          item.handoverCertificateStatus === "SIGNED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {item.handoverCertificateStatus.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {item.handoverCertificateStatus !== "SIGNED" ? (
                        <button
                          onClick={() => handleSignCertificate(item.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 size={12} /> Sign Handover Doc
                        </button>
                      ) : (
                        <span className="text-emerald-700 font-bold text-[11px] flex items-center justify-end gap-1">
                          <Award size={12} /> Transferred
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useApiQuery } from "@/lib/apiHooks";
import { StandardPageHeader } from "@/components/layout/StandardPageHeader";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { Loader } from "@/components/ui/Loader";
import { Pagination } from "@/components/ui/Pagination";
import {
  Coins, Search, ShieldCheck, Check, FileText, Clock
} from "lucide-react";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTh } from "@/components/ui/SortableTh";

interface FundReleaseItem {
  id: string;
  projectName: string;
  district: string;
  tranche: string;
  approvedBudgetCr: number;
  releaseAmountCr: number;
  status: "APPROVED" | "VERIFIED_READY" | "DISBURSED";
  verifiedDate: string;
}

export default function FundReleasesPage() {
  const { data: envelope, isLoading } = useApiQuery<any>(
    ["fund-releases"],
    "/convergence-projects"
  );

  const [search, setSearch] = useState("");
  const [statusOverrides, setStatusOverrides] = useState<Record<string, "DISBURSED">>({});
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const rawProjects: any[] = Array.isArray(envelope)
    ? envelope
    : Array.isArray(envelope?.data)
    ? envelope.data
    : Array.isArray(envelope?.data?.projects)
    ? envelope.data.projects
    : Array.isArray(envelope?.projects)
    ? envelope.projects
    : [];

  const fundReleasesList: FundReleaseItem[] = rawProjects.flatMap((proj: any) => {
    const budget = proj.approvedBudget ? Number(proj.approvedBudget) : (proj.csrBudget ? Number(proj.csrBudget) : 0);
    const budgetCr = budget > 0 ? (budget / 10000000) : 0;
    const districtName = proj.district || proj.location || "Maharashtra";
    const title = proj.title || proj.projectName || "CSR Project";

    const milestones = Array.isArray(proj.milestones) && proj.milestones.length > 0
      ? proj.milestones
      : [
          {
            id: `${proj.id}-t1`,
            name: "Tranche 1 (Mobilization 40%)",
            fundsUtilized: budget * 0.4,
            status: proj.status === "COMPLETED" ? "DISBURSED" : "VERIFIED_READY",
            updatedAt: proj.updatedAt || proj.createdAt
          }
        ];

    return milestones.map((m: any, idx: number) => {
      const trancheAmount = m.fundsUtilized ? (Number(m.fundsUtilized) / 10000000) : (budgetCr * 0.3);
      const initialStatus = m.status === "COMPLETED" ? "DISBURSED" : m.status === "IN_PROGRESS" || m.status === "VERIFIED" ? "VERIFIED_READY" : "APPROVED";
      const currentStatus = statusOverrides[m.id] || initialStatus;

      return {
        id: m.id || `${proj.id}-t-${idx}`,
        projectName: title,
        district: districtName,
        tranche: m.name || `Tranche ${idx + 1}`,
        approvedBudgetCr: Number(budgetCr.toFixed(2)),
        releaseAmountCr: Number(trancheAmount.toFixed(2)),
        status: currentStatus as "APPROVED" | "VERIFIED_READY" | "DISBURSED",
        verifiedDate: m.updatedAt ? new Date(m.updatedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
      };
    });
  });

  const handleApproveRelease = (id: string) => {
    setApprovingId(id);
    setTimeout(() => {
      setStatusOverrides(prev => ({ ...prev, [id]: "DISBURSED" }));
      setApprovingId(null);
    }, 800);
  };

  const filtered = fundReleasesList.filter(r =>
    r.projectName.toLowerCase().includes(search.toLowerCase()) ||
    r.district.toLowerCase().includes(search.toLowerCase()) ||
    r.tranche.toLowerCase().includes(search.toLowerCase())
  );

  const { sortedItems: sortedFilteredTranches, sortKey, sortDirection, requestSort } = useTableSort(filtered, {
    customGetters: {
      projectName: (r) => r.projectName,
      district: (r) => r.district,
      tranche: (r) => r.tranche,
      releaseAmountCr: (r) => r.releaseAmountCr,
      status: (r) => r.status,
    }
  });

  const disbursedTotalCr = fundReleasesList
    .filter(r => r.status === "DISBURSED")
    .reduce((acc, curr) => acc + curr.releaseAmountCr, 0);

  const readyCount = fundReleasesList.filter(r => r.status === "VERIFIED_READY").length;
  const pendingCount = fundReleasesList.filter(r => r.status === "APPROVED").length;

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  const totalPages = Math.ceil(sortedFilteredTranches.length / ITEMS_PER_PAGE);
  const paginatedTranches = sortedFilteredTranches.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <GovPortalLayout>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 text-slate-900">
        <StandardPageHeader
          title="Escrow Fund Release Queue"
          category="Financial Governance"
          description="Escrow fund release authorization, milestone verification, and tranche disbursement tracking for approved CSR projects."
        />

        {/* 4-Column Animated KPI Cards */}
        <StatCardGroup columns={4}>
          <StatCard
            label="Total Tranches"
            value={isLoading ? "…" : fundReleasesList.length}
            icon={FileText}
            index={0}
            colorTheme="blue"
            sublabel="Tracked milestones"
          />
          <StatCard
            label="Verified & Ready"
            value={isLoading ? "…" : readyCount}
            icon={ShieldCheck}
            index={1}
            colorTheme="purple"
            sublabel="Audited milestones ready"
          />
          <StatCard
            label="Disbursed Outlay"
            value={isLoading ? "…" : `₹${disbursedTotalCr.toFixed(2)} Cr`}
            icon={Coins}
            index={2}
            colorTheme="emerald"
            sublabel="Released to escrow"
          />
          <StatCard
            label="Pending Sanction"
            value={isLoading ? "…" : pendingCount}
            icon={Clock}
            index={3}
            colorTheme="amber"
            sublabel="Awaiting field verification"
          />
        </StatCardGroup>

        {/* Main Content Area */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search by project name, district, or tranche..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none transition-all"
              />
            </div>
            <span className="text-xs font-bold text-slate-500">{filtered.length} Tranches</span>
          </div>

          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader label="Loading Escrow Fund Release Tranches from Database..." />
            </div>
          ) : fundReleasesList.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center shadow-xs">
              <FileText className="mx-auto text-slate-300 mb-3" size={48} />
              <h3 className="text-base font-bold text-slate-800">No Fund Release Tranches Recorded</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                There are currently no escrow fund release tranches recorded in the database.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="gov-table w-full text-xs">
                  <thead>
                    <tr>
                      <SortableTh sortKey="projectName" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Project Name</SortableTh>
                      <SortableTh sortKey="district" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>District</SortableTh>
                      <SortableTh sortKey="tranche" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Milestone Tranche</SortableTh>
                      <SortableTh sortKey="releaseAmountCr" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Release Outlay</SortableTh>
                      <SortableTh sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Status</SortableTh>
                      <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase tracking-wider text-right text-slate-500">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTranches.length > 0 ? (
                      paginatedTranches.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="font-bold text-slate-900">{r.projectName}</td>
                          <td className="text-slate-600 font-medium">{r.district}</td>
                          <td className="font-semibold text-blue-900">{r.tranche}</td>
                          <td className="font-mono font-extrabold text-blue-950">₹{r.releaseAmountCr} Cr</td>
                          <td>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              r.status === "DISBURSED"
                                ? "bg-emerald-100 text-emerald-800"
                                : r.status === "VERIFIED_READY"
                                ? "bg-blue-100 text-blue-800 font-extrabold"
                                : "bg-amber-100 text-amber-800"
                            }`}>
                              {r.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="text-right">
                            {r.status === "DISBURSED" ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                                <Check size={14} /> Disbursed
                              </span>
                            ) : (
                              <button
                                onClick={() => handleApproveRelease(r.id)}
                                disabled={approvingId === r.id}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:shadow-md transition-all hover:scale-105 disabled:opacity-50"
                              >
                                <ShieldCheck size={13} />
                                {approvingId === r.id ? "Authorizing..." : "Authorize Release"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-500 font-medium">
                          No fund release tranches match your search criteria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filtered.length}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            </div>
          )}
        </div>
      </div>
    </GovPortalLayout>
  );
}

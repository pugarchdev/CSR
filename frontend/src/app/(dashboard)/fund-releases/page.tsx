"use client";

import { useState } from "react";
import { useApiQuery } from "@/lib/apiHooks";
import { GovPageHeader } from "@/components/layout/GovPageHeader";
import { StatCard } from "@/components/ui/StatCard";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { Loader } from "@/components/ui/Loader";
import { Pagination } from "@/components/ui/Pagination";
import {
  Coins, Search, ShieldCheck, CheckCircle2, Landmark, Check, FileText, ArrowUp, ArrowDown
} from "lucide-react";

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

// 1. Defined the missing SortableTh Component
interface SortableThProps {
  sortKey: string;
  currentSortKey: string;
  currentSortDirection: "asc" | "desc";
  onSort: (key: string) => void;
  children: React.ReactNode;
  className?: string;
}

function SortableTh({ sortKey, currentSortKey, currentSortDirection, onSort, children, className = "" }: SortableThProps) {
  return (
    <th
      className={`px-4 py-3.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:bg-slate-50 transition-colors ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {children}
        {currentSortKey === sortKey && (
          currentSortDirection === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
        )}
      </div>
    </th>
  );
}

export default function FundReleasesPage() {
  const { data: envelope, isLoading } = useApiQuery<any>(
    ["fund-releases"],
    "/convergence-projects"
  );

  const [search, setSearch] = useState("");
  const [statusOverrides, setStatusOverrides] = useState<Record<string, "DISBURSED">>({});
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // 2. Added missing sorting state
  const [sortKey, setSortKey] = useState<string>("verifiedDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

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

  // 3. Added requestSort handler
  const requestSort = (key: string) => {
    if (sortKey === key && sortDirection === "asc") {
      setSortDirection("desc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const filtered = fundReleasesList.filter(r =>
    r.projectName.toLowerCase().includes(search.toLowerCase()) ||
    r.district.toLowerCase().includes(search.toLowerCase()) ||
    r.tranche.toLowerCase().includes(search.toLowerCase())
  );

  // 4. Added sorting logic to apply sort state to the filtered list
  const sortedReleases = [...filtered].sort((a: any, b: any) => {
    if (a[sortKey] < b[sortKey]) return sortDirection === "asc" ? -1 : 1;
    if (a[sortKey] > b[sortKey]) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const disbursedTotalCr = fundReleasesList
    .filter(r => r.status === "DISBURSED")
    .reduce((acc, curr) => acc + curr.releaseAmountCr, 0);

  // 5. Paginated based on sortedReleases instead of filtered
  const totalPages = Math.ceil(sortedReleases.length / ITEMS_PER_PAGE);
  const paginatedTranches = sortedReleases.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <GovPortalLayout>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-5 px-4 py-6 md:px-8">
        <GovPageHeader
          title="Escrow Fund Release Queue & Milestone Tranches"
          eyebrow="Financial Governance"
          description="Escrow fund release authorization, milestone verification, and tranche disbursement tracking."
        />

        {/* KPI Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Verified & Ready"
            value={fundReleasesList.filter(r => r.status === "VERIFIED_READY").length}
            icon={ShieldCheck}
            index={0}
            colorTheme="blue"
            badge="Ready for Release"
            sublabel="Audited Milestones"
          />
          <StatCard
            label="Total Authorized Releases"
            value={`₹${disbursedTotalCr.toFixed(2)} Cr`}
            icon={Coins}
            index={1}
            colorTheme="emerald"
            badge="Disbursed Outlay"
            sublabel="Released to Escrow"
          />
          <StatCard
            label="Empaneled Escrow Banks"
            value="4 Banks"
            icon={Landmark}
            index={2}
            colorTheme="amber"
            badge="Escrow Gateway"
            sublabel="SBI, HDFC, ICICI, BOB"
          />
        </div>

        {/* Main Content Area */}
        <div className="space-y-4">
          {/* ================= DESKTOP TABLE ================= */}
          <div className="hidden md:block overflow-x-auto">
            <table className="gov-table w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <SortableTh
                    sortKey="projectName"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={requestSort}
                    className="text-left"
                  >
                    Project Name
                  </SortableTh>

                  <SortableTh
                    sortKey="district"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={requestSort}
                    className="text-left"
                  >
                    District
                  </SortableTh>

                  <SortableTh
                    sortKey="tranche"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={requestSort}
                    className="text-left"
                  >
                    Milestone Tranche
                  </SortableTh>

                  <SortableTh
                    sortKey="releaseAmountCr"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={requestSort}
                    className="text-left"
                  >
                    Release Outlay
                  </SortableTh>

                  <SortableTh
                    sortKey="status"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={requestSort}
                    className="text-left"
                  >
                    Status
                  </SortableTh>

                  <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase tracking-wider text-right text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {paginatedTranches.length > 0 ? (
                  paginatedTranches.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/80 transition-colors border-b border-slate-100"
                    >
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {r.projectName}
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 font-medium">
                        {r.district}
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-blue-900">
                        {r.tranche}
                      </td>

                      <td className="px-4 py-3.5 font-mono font-extrabold text-blue-950">
                        ₹{r.releaseAmountCr} Cr
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${r.status === "DISBURSED"
                              ? "bg-emerald-100 text-emerald-800"
                              : r.status === "VERIFIED_READY"
                                ? "bg-blue-100 text-blue-800 font-extrabold"
                                : "bg-amber-100 text-amber-800"
                            }`}
                        >
                          {r.status.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        {r.status === "DISBURSED" ? (
                          <span className="inline-flex items-center justify-end gap-1 text-xs font-bold text-emerald-600">
                            <Check size={14} />
                            Disbursed
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApproveRelease(r.id)}
                            disabled={approvingId === r.id}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:shadow-md transition-all hover:scale-105 disabled:opacity-50"
                          >
                            <ShieldCheck size={13} />
                            {approvingId === r.id
                              ? "Authorizing..."
                              : "Authorize Release"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-12 text-slate-500 font-medium"
                    >
                      No fund release tranches match your search criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ================= MOBILE CARD VIEW ================= */}
          <div className="md:hidden space-y-3">
            {paginatedTranches.length > 0 ? (
              paginatedTranches.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Project
                      </p>

                      <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                        {r.projectName}
                      </h3>
                    </div>

                    {/* Status */}
                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${r.status === "DISBURSED"
                          ? "bg-emerald-100 text-emerald-800"
                          : r.status === "VERIFIED_READY"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                    >
                      {r.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Card Details */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {/* District */}
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        District
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-700 truncate">
                        {r.district}
                      </p>
                    </div>

                    {/* Tranche */}
                    <div className="rounded-xl bg-blue-50/70 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-blue-500">
                        Milestone
                      </p>

                      <p className="mt-1 text-xs font-bold text-blue-900">
                        {r.tranche}
                      </p>
                    </div>
                  </div>

                  {/* Release Amount */}
                  <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          Release Outlay
                        </p>

                        <p className="mt-1 font-mono text-base font-extrabold text-blue-950">
                          ₹{r.releaseAmountCr} Cr
                        </p>
                      </div>

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200">
                        <FileText
                          size={16}
                          className="text-blue-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="mt-3">
                    {r.status === "DISBURSED" ? (
                      <div className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 border border-emerald-100">
                        <Check size={14} />
                        Release Disbursed
                      </div>
                    ) : (
                      <button
                        onClick={() => handleApproveRelease(r.id)}
                        disabled={approvingId === r.id}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        <ShieldCheck size={14} />

                        {approvingId === r.id
                          ? "Authorizing..."
                          : "Authorize Release"}
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <FileText
                  className="mx-auto mb-3 text-slate-300"
                  size={40}
                />

                <h3 className="text-sm font-bold text-slate-800">
                  No Tranches Found
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  No fund release tranches match your search criteria.
                </p>
              </div>
            )}
          </div>

          {/* ================= PAGINATION ================= */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </div>
      </div>
    </GovPortalLayout>
  );
}
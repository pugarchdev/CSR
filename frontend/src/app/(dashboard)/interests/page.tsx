"use client";

import { useApiQuery } from "@/lib/apiHooks";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { StandardPageHeader } from "@/components/layout/StandardPageHeader";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { Loader } from "@/components/ui/Loader";
import { HeartHandshake, CheckCircle2, Clock, Coins } from "lucide-react";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTh } from "@/components/ui/SortableTh";

export default function InterestsPage() {
  const { data: envelope, isLoading } = useApiQuery<any>(
    ["company-interests"],
    "/company-interests"
  );

  const rawInterests = envelope?.data?.interests || envelope?.data || envelope?.interests || (Array.isArray(envelope) ? envelope : []);
  const interests = Array.isArray(rawInterests) ? rawInterests : [];

  const { sortedItems: sortedInterests, sortKey, sortDirection, requestSort } = useTableSort(interests, {
    customGetters: {
      id: (i: any) => i.id,
      company: (i: any) => i.companyName || i.company?.name || "",
      needTitle: (i: any) => i.needTitle || i.pitchTitle || "",
      proposedOutlay: (i: any) => Number(i.proposedOutlay || 0),
      status: (i: any) => i.status || "LOGGED",
    }
  });

  const acceptedCount = interests.filter((i: any) => i.status === "ACCEPTED" || i.status === "APPROVED").length;
  const pendingCount = interests.filter((i: any) => i.status !== "ACCEPTED" && i.status !== "APPROVED").length;
  const totalOutlay = interests.reduce((acc: number, curr: any) => acc + Number(curr.proposedOutlay || 0), 0);

  return (
    <GovPortalLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 text-slate-900">
        <StandardPageHeader
          title="Corporate Expressions of Interest (EOI)"
          category="Corporate Desk"
          description="Formal expressions of interest logged by corporate partners for specific government development needs and district projects."
        />

        {/* 4-Column Animated KPI Cards */}
        <StatCardGroup columns={4}>
          <StatCard
            label="Total EOIs"
            value={isLoading ? "…" : interests.length}
            icon={HeartHandshake}
            index={0}
            colorTheme="blue"
            sublabel="Logged corporate interests"
          />
          <StatCard
            label="Accepted & Partnered"
            value={isLoading ? "…" : acceptedCount}
            icon={CheckCircle2}
            index={1}
            colorTheme="emerald"
            sublabel="Formally onboarded to needs"
          />
          <StatCard
            label="Under Review"
            value={isLoading ? "…" : pendingCount}
            icon={Clock}
            index={2}
            colorTheme="amber"
            sublabel="Awaiting departmental match"
          />
          <StatCard
            label="Pledged Outlay"
            value={isLoading ? "…" : `₹${(totalOutlay / 10000000).toFixed(2)} Cr`}
            icon={Coins}
            index={3}
            colorTheme="purple"
            sublabel="Committed financial outlay"
          />
        </StatCardGroup>

        {isLoading ? (
          <div className="py-12 flex justify-center bg-white rounded-2xl border border-slate-200/80">
            <Loader label="Loading Expressions of Interest from Database..." />
          </div>
        ) : (
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Logged Expressions of Interest ({interests.length})</GovCardTitle>
            </GovCardHeader>
            <GovCardBody className="p-4 md:p-5">
              <div className="w-full md:overflow-x-auto md:rounded-2xl md:border md:border-slate-200/80">
                <table className="w-full block md:table text-left text-sm text-slate-700 border-collapse">
                  <thead className="hidden md:table-header-group bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                    <tr>
                      <SortableTh sortKey="id" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3">Ref ID</SortableTh>
                      <SortableTh sortKey="company" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3">Corporate Partner</SortableTh>
                      <SortableTh sortKey="needTitle" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3">Target Need / Pitch</SortableTh>
                      <SortableTh sortKey="proposedOutlay" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3">Proposed Outlay</SortableTh>
                      <SortableTh sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3">Status</SortableTh>
                    </tr>
                  </thead>
                  <tbody className="block md:table-row-group divide-y-0 md:divide-y md:divide-slate-100">
                    {sortedInterests.length > 0 ? (
                      sortedInterests.map((i: any) => (
                        <tr 
                          key={i.id}
                          className="block md:table-row mb-4 md:mb-0 bg-white border border-slate-200 md:border-none rounded-xl md:rounded-none shadow-sm md:shadow-none hover:bg-slate-50/80 transition-colors overflow-hidden"
                        >
                          <td 
                            data-label="Ref ID" 
                            className="flex md:table-cell justify-between items-center px-4 py-3 md:py-3.5 border-b border-slate-100 md:border-none font-mono text-xs font-bold text-blue-900 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden"
                          >
                            {i.id.slice(0, 8)}
                          </td>
                          <td 
                            data-label="Corporate Partner" 
                            className="flex md:table-cell justify-between items-center px-4 py-3 md:py-3.5 border-b border-slate-100 md:border-none font-semibold text-slate-900 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left"
                          >
                            {i.companyName || i.company?.name || "Corporate"}
                          </td>
                          <td 
                            data-label="Target Need / Pitch" 
                            className="flex md:table-cell justify-between items-center px-4 py-3 md:py-3.5 border-b border-slate-100 md:border-none text-slate-700 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left"
                          >
                            {i.needTitle || i.pitchTitle || "Development Need"}
                          </td>
                          <td 
                            data-label="Proposed Outlay" 
                            className="flex md:table-cell justify-between items-center px-4 py-3 md:py-3.5 border-b border-slate-100 md:border-none font-mono font-medium before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden"
                          >
                            ₹{i.proposedOutlay ? Number(i.proposedOutlay).toLocaleString("en-IN") : "0"}
                          </td>
                          <td 
                            data-label="Status" 
                            className="flex md:table-cell justify-between items-center px-4 py-3 md:py-3.5 md:border-none before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden bg-slate-50/50 md:bg-transparent"
                          >
                            <GovStatusBadge variant={i.status === "ACCEPTED" ? "success" : "warning"}>
                              {i.status || "LOGGED"}
                            </GovStatusBadge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="block md:table-row bg-white border border-slate-200 md:border-none rounded-xl md:rounded-none shadow-sm md:shadow-none">
                        <td colSpan={5} className="block md:table-cell text-center py-8 text-slate-500 font-medium text-sm">
                          No expressions of interest recorded in database
                        </td>
                      </tr>
                    )}
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


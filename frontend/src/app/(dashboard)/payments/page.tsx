"use client";

import { useApiQuery } from "@/lib/apiHooks";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { Loader } from "@/components/ui/Loader";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTh } from "@/components/ui/SortableTh";

export default function PaymentsPage() {
  const { data: envelope, isLoading } = useApiQuery<any>(
    ["payments"],
    "/convergence-projects"
  );

  const rawProjects = envelope?.data?.projects || envelope?.data || envelope?.projects || [];
  const projects = Array.isArray(rawProjects) ? rawProjects : [];

  const { sortedItems: sortedProjects, sortKey, sortDirection, requestSort } = useTableSort(projects, {
    customGetters: {
      id: (p: any) => p.id,
      title: (p: any) => p.title || p.name || "",
      approvedBudget: (p: any) => Number(p.approvedBudget || 0),
      status: (p: any) => p.status || "CLEARED",
    }
  });

  return (
    <GovPortalLayout userRole="USER">
      <GovPageHeader
        breadcrumb="Dashboard / Payments"
        title="Payments Register"
        description="Track CSR payment instructions, escrow entries, disbursement references, and receipt records."
      />

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader label="Loading Payments from Database..." />
        </div>
      ) : (
        <GovCard>
          <GovCardHeader>
            <GovCardTitle>Payment & Escrow Transactions ({projects.length})</GovCardTitle>
          </GovCardHeader>
          <GovCardBody>
            <div className="overflow-x-auto">
              <table className="gov-table w-full">
                <thead>
                  <tr>
                    <SortableTh sortKey="id" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Ref ID</SortableTh>
                    <SortableTh sortKey="title" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Project</SortableTh>
                    <SortableTh sortKey="approvedBudget" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Committed Amount</SortableTh>
                    <SortableTh sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Status</SortableTh>
                  </tr>
                </thead>
                <tbody>
                  {sortedProjects.length > 0 ? (
                    sortedProjects.map((p: any) => (
                      <tr key={p.id}>
                        <td className="font-mono text-xs">{p.id.slice(0, 8)}</td>
                        <td className="font-semibold">{p.title || p.name}</td>
                        <td className="font-mono">₹{p.approvedBudget ? Number(p.approvedBudget).toLocaleString("en-IN") : "0"}</td>
                        <td>
                          <GovStatusBadge variant={p.status === "COMPLETED" ? "success" : "warning"}>
                            {p.status || "CLEARED"}
                          </GovStatusBadge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-slate-500 font-medium">
                        No payment records found in database
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GovCardBody>
        </GovCard>
      )}
    </GovPortalLayout>
  );
}

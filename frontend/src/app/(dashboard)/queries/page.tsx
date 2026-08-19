"use client";

import { useApiQuery } from "@/lib/apiHooks";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { Loader } from "@/components/ui/Loader";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTh } from "@/components/ui/SortableTh";

export default function QueriesPage() {
  const { data: envelope, isLoading } = useApiQuery<any>(
    ["queries"],
    "/helpdesk"
  );

  const rawQueries = envelope?.data?.queries || envelope?.data || envelope?.queries || [];
  const queries = Array.isArray(rawQueries) ? rawQueries : [];

  const { sortedItems: sortedQueries, sortKey, sortDirection, requestSort } = useTableSort(queries, {
    customGetters: {
      id: (q: any) => q.id,
      subject: (q: any) => q.subject || q.title || "",
      category: (q: any) => q.category || "General",
      status: (q: any) => q.status || "OPEN",
      createdAt: (q: any) => q.createdAt,
    }
  });

  return (
    <GovPortalLayout userRole="USER">
      <GovPageHeader
        breadcrumb="Dashboard / Queries"
        title="Queries and Clarifications"
        description="Respond to administrator document queries, compliance observations, and project review remarks."
      />

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader label="Loading Queries from Database..." />
        </div>
      ) : (
        <GovCard>
          <GovCardHeader>
            <GovCardTitle>Helpdesk & Clarifications ({queries.length})</GovCardTitle>
          </GovCardHeader>
          <GovCardBody>
            <div className="overflow-x-auto">
              <table className="gov-table w-full">
                <thead>
                  <tr>
                    <SortableTh sortKey="id" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Query Ref</SortableTh>
                    <SortableTh sortKey="subject" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Subject</SortableTh>
                    <SortableTh sortKey="category" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Category</SortableTh>
                    <SortableTh sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Status</SortableTh>
                    <SortableTh sortKey="createdAt" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Created Date</SortableTh>
                  </tr>
                </thead>
                <tbody>
                  {sortedQueries.length > 0 ? (
                    sortedQueries.map((q: any) => (
                      <tr key={q.id}>
                        <td className="font-mono text-xs">{q.id.slice(0, 8)}</td>
                        <td className="font-semibold">{q.subject || q.title || "Query"}</td>
                        <td>{q.category || "General"}</td>
                        <td>
                          <GovStatusBadge variant={q.status === "RESOLVED" ? "success" : "warning"}>
                            {q.status || "OPEN"}
                          </GovStatusBadge>
                        </td>
                        <td>
                          {q.createdAt
                            ? new Date(q.createdAt).toLocaleDateString("en-IN")
                            : "N/A"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-500 font-medium">
                        No active queries in database
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

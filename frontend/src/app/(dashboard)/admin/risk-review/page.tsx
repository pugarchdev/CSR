"use client";

import { useApiQuery } from "@/lib/apiHooks";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import GovButton from "@/components/gov/GovButton";
import Link from "next/link";
import { Loader } from "@/components/ui/Loader";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTh } from "@/components/ui/SortableTh";

export default function AdminRiskReviewPage() {
  const { data: envelope, isLoading } = useApiQuery<any>(
    ["risk-review"],
    "/org?status=UNDER_VERIFICATION"
  );

  const rawOrgs = envelope?.data?.organizations || envelope?.data || envelope?.organizations || [];
  const orgs = Array.isArray(rawOrgs) ? rawOrgs : [];

  const { sortedItems: sortedOrgs, sortKey, sortDirection, requestSort } = useTableSort(orgs, {
    customGetters: {
      name: (org: any) => org.name || org.legalName || "",
      kind: (org: any) => org.kind || "NGO",
      status: (org: any) => org.status || "REVIEW",
    }
  });

  return (
    <GovPortalLayout userRole="ADMIN">
      <GovPageHeader
        breadcrumb="Admin / Risk Review"
        title="Risk Review Desk"
        description="Review compliance flags, duplicate records, document mismatches, and funding exception signals."
      />

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader label="Loading Risk Indicators from Database..." />
        </div>
      ) : (
        <GovCard>
          <GovCardHeader>
            <GovCardTitle>Entities Requiring Compliance & Risk Evaluation ({orgs.length})</GovCardTitle>
          </GovCardHeader>
          <GovCardBody>
            <div className="overflow-x-auto">
              <table className="gov-table w-full">
                <thead>
                  <tr>
                    <SortableTh sortKey="name" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Organization</SortableTh>
                    <SortableTh sortKey="kind" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Kind</SortableTh>
                    <SortableTh sortKey="risk" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Risk Category</SortableTh>
                    <SortableTh sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Status</SortableTh>
                    <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOrgs.length > 0 ? (
                    sortedOrgs.map((org: any) => (
                      <tr key={org.id}>
                        <td className="font-semibold">{org.name || org.legalName || "Organization"}</td>
                        <td>{org.kind || "NGO"}</td>
                        <td>Compliance Check</td>
                        <td>
                          <GovStatusBadge variant="warning">{org.status || "REVIEW"}</GovStatusBadge>
                        </td>
                        <td>
                          <Link href={`/admin/applications/${org.id}`}>
                            <GovButton variant="primary">Evaluate Risk</GovButton>
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-500 font-medium">
                        No risk flags or pending compliance reviews in database
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

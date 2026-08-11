"use client";

import { useApiQuery } from "@/lib/apiHooks";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { Loader } from "@/components/ui/Loader";

export default function InterestsPage() {
  const { data: envelope, isLoading } = useApiQuery<any>(
    ["company-interests"],
    "/company-interests"
  );

  const interests = envelope?.data?.interests || envelope?.data || envelope?.interests || (Array.isArray(envelope) ? envelope : []);

return (
    <GovPortalLayout>
      <GovPageHeader
        breadcrumb="Home / Corporate Interests"
        title="Corporate Expression of Interest"
        description="Expressions of interest logged by corporates for specific government development needs and district projects."
      />

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader label="Loading Expressions of Interest from Database..." />
        </div>
      ) : (
        <GovCard>
          <GovCardHeader>
            <GovCardTitle>Logged Expressions of Interest ({interests.length})</GovCardTitle>
          </GovCardHeader>
          <GovCardBody className="p-4 md:p-5">
            {/* Wrapper: Removes horizontal scroll on mobile, keeps it standard on desktop */}
            <div className="w-full md:overflow-x-auto md:rounded-2xl md:border md:border-slate-200/80">
              <table className="w-full block md:table text-left text-sm text-slate-700 border-collapse">
                {/* Headers: Hidden on mobile, shown on desktop */}
                <thead className="hidden md:table-header-group bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-3">Ref ID</th>
                    <th className="px-4 py-3">Corporate Partner</th>
                    <th className="px-4 py-3">Target Need / Pitch</th>
                    <th className="px-4 py-3">Proposed Outlay</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="block md:table-row-group divide-y-0 md:divide-y md:divide-slate-100">
                  {interests.length > 0 ? (
                    interests.map((i: any) => (
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
    </GovPortalLayout>
  );
}

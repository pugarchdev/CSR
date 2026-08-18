"use client";

import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { useApiQuery } from "@/lib/apiHooks";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";

interface SecurityResponse {
  success: boolean;
  data: {
    summary: {
      totalEvents: number;
      criticalEvents: number;
      lastDetected: string | null;
    };
    events: Array<{
      id: string;
      action: string;
      entityType: string;
      details: any;
      ipAddress: string;
      actorEmail: string;
      actorName: string;
      createdAt: string;
    }>;
  };
}

export default function PlatformSecurityPage() {
  const { data: response } = useApiQuery<SecurityResponse>(
    ["platform", "security"],
    "/platform-admin/security"
  );

  const securityData = response?.data;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-900">
              Super Admin Security
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
              Global Platform Scope
            </span>
          </div>
          <h1 className="mt-1 font-heading text-xl font-extrabold text-slate-950">
            Platform Security & Access Violation Logs
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Real-time audit log of blocked authorization attempts, cross-tenant data scope denials, and session anomalies
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <StatCardGroup columns={3}>
        <StatCard
          label="Total Security Events"
          value={securityData?.summary.totalEvents || 0}
          icon={Shield}
          index={0}
          colorTheme="blue"
          sublabel="Recorded across platform API endpoints"
        />
        <StatCard
          label="Critical Access Blocks"
          value={securityData?.summary.criticalEvents || 0}
          icon={ShieldAlert}
          index={1}
          colorTheme="rose"
          badge={securityData?.summary.criticalEvents ? "Action Req" : "Clear"}
          sublabel="Direct object reference & scope violations"
        />
        <StatCard
          label="Threat Mitigation Status"
          value="Protected"
          icon={ShieldCheck}
          index={2}
          colorTheme="emerald"
          badge="Active"
          sublabel="RBAC ceiling & scope predicates active"
        />
      </StatCardGroup>

      {/* Security Logs Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Security & Denial Audit Trail
          </h3>
        </div>

        {!securityData?.events || securityData.events.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No unauthorized access or security violations recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Security Event</th>
                  <th className="px-4 py-3">Actor & Identity</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {securityData.events.map((e) => (
                  <tr key={e.id} className="transition hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-sans">
                      <span className="inline-flex rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
                        {e.action}
                      </span>
                      <p className="mt-1 text-xs text-slate-700 font-medium">{e.entityType || "API Endpoint"}</p>
                    </td>
                    <td className="px-4 py-3 font-sans">
                      <p className="font-bold text-slate-900">{e.actorName}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{e.actorEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{e.ipAddress}</td>
                    <td className="px-4 py-3 text-slate-500 font-sans">{new Date(e.createdAt).toLocaleString()}</td>
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

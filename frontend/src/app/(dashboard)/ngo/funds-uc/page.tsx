"use client";

import { CheckCircle2, Plus, Landmark, Clock } from "lucide-react";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";

export default function NgoFundsUcPage() {
  const formatCr = (val: number) => `₹${(Number(val || 0) / 10000000).toFixed(2)} Cr`;

  const certificates = [
    {
      id: "uc-1",
      projectCode: "PRJ-2026-001",
      projectTitle: "Melghat School Solar Electrification",
      milestoneName: "Milestone 1: Solar Inverter Installation",
      amountUtilized: 7200000,
      verificationStatus: "VERIFIED",
      verifiedBy: "District Nodal Officer (Amravati)",
      uploadedAt: "10 Aug 2026"
    },
    {
      id: "uc-2",
      projectCode: "PRJ-2026-004",
      projectTitle: "Beed Watershed & Check Dam Project",
      milestoneName: "Milestone 1: Excavation & Concrete Core Wall",
      amountUtilized: 7000000,
      verificationStatus: "PENDING_VERIFICATION",
      verifiedBy: "Awaiting DNO Inspection",
      uploadedAt: "14 Aug 2026"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
              NGO Financial Compliance
            </span>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Utilization Certificates
            </span>
          </div>
          <h1 className="mt-1 font-heading text-xl font-extrabold text-slate-950">
            Fund Receipts & Utilization Certificates (UCs)
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Submission and audit tracking of formal Chartered Accountant (CA) certified Utilization Certificates
          </p>
        </div>

        <button
          onClick={() => alert("Upload UC feature coming soon!")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-800"
        >
          <Plus size={14} />
          <span>Submit Utilization Certificate</span>
        </button>
      </div>

      {/* Overview Summary */}
      <StatCardGroup columns={3}>
        <StatCard
          label="Total Funds Received"
          value={formatCr(18500000)}
          icon={Landmark}
          index={0}
          colorTheme="blue"
          sublabel="Disbursed by corporate sponsors"
        />
        <StatCard
          label="Verified Ground Deployment"
          value={formatCr(14200000)}
          icon={CheckCircle2}
          index={1}
          colorTheme="emerald"
          sublabel="Certified by CA & submitted UCs"
        />
        <StatCard
          label="UCs Under DNO Review"
          value="1"
          icon={Clock}
          index={2}
          colorTheme="amber"
          badge="Pending Review"
          sublabel="Awaiting ground physical verification"
        />
      </StatCardGroup>

      {/* Certificates List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Utilization Certificates Repository
          </h3>
        </div>

        <div className="divide-y divide-slate-100">
          {certificates.map((uc) => (
            <div key={uc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition hover:bg-slate-50/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded">
                    {uc.projectCode}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${uc.verificationStatus === "VERIFIED" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
                    <CheckCircle2 size={11} /> {uc.verificationStatus.replace(/_/g, " ")}
                  </span>
                </div>
                <h4 className="text-xs font-extrabold text-slate-900">{uc.milestoneName}</h4>
                <p className="text-[11px] text-slate-500 font-medium">{uc.projectTitle} · Verified by: {uc.verifiedBy}</p>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Utilized Amount</span>
                  <p className="font-mono text-xs font-extrabold text-emerald-900">{formatCr(uc.amountUtilized)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

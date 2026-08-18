"use client";

import { useState } from "react";
import { CheckCircle2, Shield, Landmark, FileText, Search, Building2, Award, Clock } from "lucide-react";
import { GovPageHeader } from "@/components/layout/GovPageHeader";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";

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

const mockHandovers: HandoverItem[] = [
  {
    id: "ho-1",
    projectName: "Gadchiroli Tribal Tele-ICU Facilities & Equipment",
    department: "Public Health Department",
    donorCompany: "Tata Consultancy Services CSR Foundation",
    implementingNgo: "Arogya Seva Trust",
    assetValueCr: 12.4,
    handoverCertificateStatus: "PENDING_DEPARTMENT_SIGNATURE",
    completionDate: "2026-07-20",
  },
  {
    id: "ho-2",
    projectName: "Solapur Solar RO Water Purification Plants (15 Units)",
    department: "Rural Development & Water Supply Dept",
    donorCompany: "Mahindra CSR",
    implementingNgo: "Jal Jeevan Foundation",
    assetValueCr: 4.8,
    handoverCertificateStatus: "SIGNED",
    completionDate: "2026-06-15",
  },
];

export default function HandoverPage() {
  const [items, setItems] = useState<HandoverItem[]>(mockHandovers);
  const [search, setSearch] = useState("");

  const handleSignCertificate = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, handoverCertificateStatus: "SIGNED" } : item));
  };

  const filtered = items.filter(item =>
    item.projectName.toLowerCase().includes(search.toLowerCase()) ||
    item.department.toLowerCase().includes(search.toLowerCase()) ||
    item.donorCompany.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
      <GovPageHeader
        title="CSR Project Handover & Asset Transfer"
        description="Formal sign-off and transfer of completed CSR infrastructure assets into State Government Department operational custody."
        eyebrow="Asset Transfer Desk"
      />

      <StatCardGroup columns={3}>
        <StatCard
          label="Pending Department Sign-Off"
          value={items.filter(i => i.handoverCertificateStatus === "PENDING_DEPARTMENT_SIGNATURE").length}
          icon={Clock}
          index={0}
          colorTheme="amber"
          sublabel="Completed assets ready for takeover"
        />
        <StatCard
          label="Transferred Assets"
          value={items.filter(i => i.handoverCertificateStatus === "SIGNED").length}
          icon={CheckCircle2}
          index={1}
          colorTheme="emerald"
          sublabel="Handover certificate executed"
        />
        <StatCard
          label="Total Transferred Asset Value"
          value={`₹${items.reduce((acc, curr) => acc + curr.assetValueCr, 0).toFixed(1)} Cr`}
          icon={Landmark}
          index={2}
          colorTheme="blue"
          sublabel="Public infrastructure value"
        />
      </StatCardGroup>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="mb-6 max-w-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by project, department, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
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
                  <td className="px-4 py-3.5 font-bold text-slate-900 max-w-xs">{item.projectName}</td>
                  <td className="px-4 py-3.5 text-slate-700">{item.department}</td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-slate-800">{item.donorCompany}</p>
                    <p className="text-[10px] text-slate-400">NGO: {item.implementingNgo}</p>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-blue-900">₹{item.assetValueCr} Cr</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${
                      item.handoverCertificateStatus === "SIGNED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {item.handoverCertificateStatus === "PENDING_DEPARTMENT_SIGNATURE" ? "PENDING SIGN-OFF" : item.handoverCertificateStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {item.handoverCertificateStatus !== "SIGNED" ? (
                      <button
                        onClick={() => handleSignCertificate(item.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 transition-colors"
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

        {/* Mobile Cards View */}
        <div className="flex flex-col gap-4 md:hidden">
          {filtered.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 shadow-xs">
              <div className="flex flex-col gap-2">
                <div className="flex items-center">
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                    item.handoverCertificateStatus === "SIGNED"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {item.handoverCertificateStatus === "PENDING_DEPARTMENT_SIGNATURE" ? "Pending Sign-Off" : item.handoverCertificateStatus}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm leading-tight">{item.projectName}</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Department</span>
                  <span className="font-medium text-slate-700">{item.department}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Asset Outlay</span>
                  <span className="font-bold text-blue-900">₹{item.assetValueCr} Cr</span>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Donor & Implementer</span>
                <span className="font-semibold text-slate-800">{item.donorCompany}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">NGO: {item.implementingNgo}</span>
              </div>

              <div className="pt-3 border-t border-slate-200 mt-1 flex justify-end">
                {item.handoverCertificateStatus !== "SIGNED" ? (
                  <button
                    onClick={() => handleSignCertificate(item.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 transition-colors w-full justify-center sm:w-auto"
                  >
                    <CheckCircle2 size={14} /> Sign Handover Doc
                  </button>
                ) : (
                  <span className="text-emerald-700 font-bold text-xs flex items-center justify-center sm:justify-end gap-1.5 py-1 w-full sm:w-auto bg-emerald-50 sm:bg-transparent rounded-lg">
                    <Award size={14} /> Transferred
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

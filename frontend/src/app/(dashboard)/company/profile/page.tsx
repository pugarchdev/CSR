"use client";

import React, { useState } from "react";
import { Building2, ShieldCheck, FileCheck, CheckCircle2, Save, Users, Landmark } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export default function CorporateProfilePage() {
  const user = useAuthStore((s) => s.user);

  const [companyName, setCompanyName] = useState(user?.organization?.name || "Tata Power Company Limited");
  const [cin, setCin] = useState("L28920MH1919PLC000567");
  const [pan, setPan] = useState("AAACT1234F");
  const [csrBudget, setCsrBudget] = useState("₹45.00 Cr");
  const [csrHead, setCsrHead] = useState("Shri Rajesh Sharma");
  const [officialEmail, setOfficialEmail] = useState("csr.lead@tatapower.com");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
              Corporate Governance
            </span>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              MCA Verified
            </span>
          </div>
          <h1 className="mt-1 font-heading text-xl font-extrabold text-slate-950">
            Corporate Profile & Statutory CSR Committee
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Company MCA 21 CIN, Section 135 statutory budget, and verified CSR committee focal contacts
          </p>
        </div>
      </div>

      {saved && (
        <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>Corporate profile changes updated successfully!</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-5">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Corporate Identity & Registration
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700">Corporate Legal Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full mt-1 rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700">Corporate Identity Number (MCA CIN)</label>
              <input
                type="text"
                value={cin}
                onChange={(e) => setCin(e.target.value)}
                className="w-full mt-1 rounded-xl border border-slate-200 p-2.5 text-xs font-mono focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700">Permanent Account Number (PAN)</label>
              <input
                type="text"
                value={pan}
                onChange={(e) => setPan(e.target.value)}
                className="w-full mt-1 rounded-xl border border-slate-200 p-2.5 text-xs font-mono focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700">Annual Section 135 CSR Budget</label>
              <input
                type="text"
                value={csrBudget}
                onChange={(e) => setCsrBudget(e.target.value)}
                className="w-full mt-1 rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-emerald-800 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            CSR Committee & Primary SPOC
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700">Designated CSR Head / Director</label>
              <input
                type="text"
                value={csrHead}
                onChange={(e) => setCsrHead(e.target.value)}
                className="w-full mt-1 rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700">Official CSR Office Email</label>
              <input
                type="email"
                value={officialEmail}
                onChange={(e) => setOfficialEmail(e.target.value)}
                className="w-full mt-1 rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800"
          >
            <Save size={14} />
            <span>Save Profile Updates</span>
          </button>
        </div>
      </form>
    </div>
  );
}

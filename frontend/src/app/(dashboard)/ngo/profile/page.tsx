"use client";

import React, { useState } from "react";
import { Building2, ShieldCheck, CheckCircle2, FileText, Save, Award } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export default function NgoProfilePage() {
  const user = useAuthStore((s) => s.user);

  const [ngoName, setNgoName] = useState(user?.organization?.name || "Savitribai Phule Gramin Vikas Sanstha");
  const [darpanId, setDarpanId] = useState("MH/2021/0289123");
  const [csr1, setCsr1] = useState("CSR00018421");
  const [pan, setPan] = useState("AAATS9876K");
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
              NGO Master Identity
            </span>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Verified Organization
            </span>
          </div>
          <h1 className="mt-1 font-heading text-xl font-extrabold text-slate-950">
            Master NGO Profile & Statutory Registrations
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Reusable Master NGO identity records, Darpan ID, 12A/80G tax exemptions, and MCA CSR-1 validation
          </p>
        </div>
      </div>

      {saved && (
        <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>NGO master profile updated successfully!</span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSave} className="space-y-5">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Master NGO Legal Registration
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700">NGO Legal Name</label>
              <input
                type="text"
                value={ngoName}
                onChange={(e) => setNgoName(e.target.value)}
                className="w-full mt-1 rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700">NITI Aayog NGO Darpan ID</label>
              <input
                type="text"
                value={darpanId}
                onChange={(e) => setDarpanId(e.target.value)}
                className="w-full mt-1 rounded-xl border border-slate-200 p-2.5 text-xs font-mono focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700">MCA CSR-1 Registration Number</label>
              <input
                type="text"
                value={csr1}
                onChange={(e) => setCsr1(e.target.value)}
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
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Statutory Exemption Certificates
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900">Section 12A Certificate</span>
                <p className="text-[11px] text-slate-500 font-medium">Income Tax Exemption Validity: Permanent</p>
              </div>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                Verified
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900">Section 80G Certificate</span>
                <p className="text-[11px] text-slate-500 font-medium">Tax Deduction for Donors: Active</p>
              </div>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                Verified
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800"
          >
            <Save size={14} />
            <span>Save NGO Profile</span>
          </button>
        </div>
      </form>
    </div>
  );
}

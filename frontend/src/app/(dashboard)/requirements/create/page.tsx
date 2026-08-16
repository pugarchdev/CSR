"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { GovPageHeader } from "@/components/layout/GovPageHeader";

export default function CreateRequirementPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [district, setDistrict] = useState("Gadchiroli");
  const [fundingRequiredLakhs, setFundingRequiredLakhs] = useState("");
  const [sector, setSector] = useState("Healthcare");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      router.push("/requirements");
    }, 1000);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-8 md:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-blue-900 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Requirements
        </button>
      </div>

      <GovPageHeader
        title="Create Department CSR Requirement"
        description="Publish official department developmental needs to invite corporate CSR funding and implementing partner proposals."
        eyebrow="Department Procurement Desk"
      />

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Requirement Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Solar Power Micro-Grids for 50 Rural Primary Health Sub-Centres"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">District *</label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                <option value="Gadchiroli">Gadchiroli</option>
                <option value="Nandurbar">Nandurbar</option>
                <option value="Solapur">Solapur</option>
                <option value="Chhatrapati Sambhajinagar">Chhatrapati Sambhajinagar</option>
                <option value="Palghar">Palghar</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Focus Sector *</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                <option value="Healthcare">Healthcare</option>
                <option value="Education">Education</option>
                <option value="Water Security">Water Security</option>
                <option value="Environment & Green Energy">Environment & Green Energy</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Funding Gap (₹ Lakhs) *</label>
              <input
                type="number"
                required
                value={fundingRequiredLakhs}
                onChange={(e) => setFundingRequiredLakhs(e.target.value)}
                placeholder="e.g. 200"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Requirement Details & Specifications *</label>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Specify technical scope, mandatory compliance standards, and timeline..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-800 transition-colors shadow-sm disabled:opacity-50"
            >
              <Send size={14} /> {submitting ? "Publishing..." : "Publish Requirement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

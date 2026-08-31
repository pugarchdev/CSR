"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, FileCheck, Award, ArrowLeft, Download, CheckCircle2, BarChart3, Building2 } from "lucide-react";

export default function ComplianceAuditsPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#14274e] via-[#1f3a6e] to-[#0f172a] text-white py-14 px-4 sm:px-6 lg:px-8 border-b border-slate-200">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Portal Home</span>
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider">
              Statutory Transparency & Audits
            </span>
            <span className="text-xs text-slate-300">MCA Section 135 & CAG Alignment</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-heading tracking-tight text-white">
            Statutory Compliance & Audit Framework
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-3xl mt-3 leading-relaxed">
            Independent audit verification records, financial reconciliation logs, and statutory reporting under Section 135 of the Companies Act, 2013 and Maharashtra State CSR Convergence Guidelines.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-emerald-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Audit Compliance</span>
              <ShieldCheck size={20} />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">99.4%</div>
            <div className="text-xs text-slate-500 mt-1">Independent third-party verified</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-blue-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Statutory Returns</span>
              <FileCheck size={20} />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">100% Filed</div>
            <div className="text-xs text-slate-500 mt-1">MCA CSR-2 & Form FC-4</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-purple-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Public Projects</span>
              <Award size={20} />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">Geo-Tagged</div>
            <div className="text-xs text-slate-500 mt-1">100% milestone photo verified</div>
          </div>
        </div>

        {/* Audit Details */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-[#14274e]">Statutory Reporting & MCA Section 135 Compliance</h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
              Every project onboarded to the MahaCSR portal adheres to strict multi-tier audit verification before, during, and after fund disbursement:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <CheckCircle2 size={16} className="text-emerald-600" />
                Pre-Execution Diligence
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Verification of NGO 12A/80G status, DARPAN accreditation, FCRA clearance, and Corporate CSR committee board approvals.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <CheckCircle2 size={16} className="text-emerald-600" />
                Milestone-Based Fund Release
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Funds are escrowed and disbursed only upon District Nodal Officer (DNO) site inspection and photo-verified proof of milestone completion.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <CheckCircle2 size={16} className="text-emerald-600" />
                Utilization Certificate (UC) Reconciliation
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Audited Utilization Certificates signed by certified Chartered Accountants (CA) are published for public accountability.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <CheckCircle2 size={16} className="text-emerald-600" />
                Independent Social Impact Assessment
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Projects with outlays exceeding ₹1 Crore undergo statutory Social Impact Assessments (SIA) by state-approved research institutes.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              Need statutory compliance documentation for your board or audit committee?
            </div>
            <Link
              href="/document-library"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
            >
              <Download size={14} />
              <span>Browse Compliance Documents</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

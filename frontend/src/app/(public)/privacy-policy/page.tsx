"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, Eye, FileText, CheckCircle2, Building, Scale, ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
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
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
              Legal & Statutory Governance
            </span>
            <span className="text-xs text-slate-300">Government of Maharashtra</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-heading tracking-tight text-white">
            Privacy Policy & Data Protection Framework
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-3xl mt-3 leading-relaxed">
            Statutory privacy governance policy for the MahaCSR State Convergence Portal, enacted under the Information Technology Act, Digital Personal Data Protection (DPDP) Act, and MCA Section 135 guidelines.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Body (2 cols) */}
          <div className="md:col-span-2 space-y-8 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#14274e] flex items-center gap-2">
                <ShieldCheck className="text-blue-600" size={20} />
                1. Institutional Overview & Scope
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                The MahaCSR platform is developed and maintained under the guidance of the State CSR Cell, Planning Department, Government of Maharashtra. This policy outlines how company details, CSR contributions, NGO DARPAN accreditations, and official government communications are collected, processed, and secured.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#14274e] flex items-center gap-2">
                <Lock className="text-blue-600" size={20} />
                2. Information We Collect
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                To facilitate transparent CSR convergence and statutory compliance with MCA Section 135, the portal collects the following categories of information:
              </p>
              <ul className="list-disc pl-5 text-xs sm:text-sm text-slate-600 space-y-2">
                <li><strong>Corporate Entities:</strong> Corporate Identity Number (CIN), MCA CSR-1 registration, authorized signatory contact information, financial outlay, and annual CSR expenditure statements.</li>
                <li><strong>Implementing Agencies (NGOs):</strong> NITI Aayog NGO-DARPAN ID, 12A/80G certification, FCRA registration, governance body listings, and bank account validation credentials.</li>
                <li><strong>Government Officers:</strong> Official government email address, department designation, district mapping, and administrative actions performed within the portal.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#14274e] flex items-center gap-2">
                <Eye className="text-blue-600" size={20} />
                3. Purpose of Processing
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Collected information is strictly processed for the facilitation of public welfare initiatives, convergence project allocations, milestone verification, fund disbursement tracking, and generating statutory audit reports for the State Legislature and MCA.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#14274e] flex items-center gap-2">
                <Scale className="text-blue-600" size={20} />
                4. Data Security & Storage Standards
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                All data transmitted to and from the MahaCSR portal is encrypted using TLS 1.3 encryption and stored in MeitY-empanelled cloud data centers physically located in the Republic of India. Role-Based Access Control (RBAC) and immutable audit logging ensure data integrity.
              </p>
            </section>

            <section className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">5. Grievances and Inquiries</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                For questions regarding this privacy policy or data governance practices, please reach out to the State CSR Cell at Mantralaya Annexe, Mumbai or submit an inquiry through our <Link href="/helpdesk" className="text-blue-600 underline font-semibold">Helpdesk Portal</Link>.
              </p>
            </section>
          </div>

          {/* Sidebar Summary Card */}
          <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Key Information</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Governing Authority</span>
                  <span className="font-bold text-slate-800">Planning Department, Govt. of Maharashtra</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Compliance Framework</span>
                  <span className="font-bold text-slate-800">MCA Section 135 & DPDP Act 2023</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Data Residency</span>
                  <span className="font-bold text-slate-800">MeitY Certified Data Center (India)</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Last Updated</span>
                  <span className="font-bold text-slate-800">August 2026</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-blue-700" />
                Statutory Assurance
              </h4>
              <p className="text-xs text-blue-900 leading-relaxed">
                Your organizational data will never be commercialized, monetized, or shared with unauthorized commercial entities.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

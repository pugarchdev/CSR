"use client";

import { useState } from "react";
import Link from "next/link";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Send,
  Building2,
  Layers,
  Award,
  ExternalLink,
  ChevronRight,
  AlertCircle
} from "lucide-react";

const corporateSteps = [
  { step: "1", title: "Corporate Enquiry Form", detail: "Company details, sector, geography, optional budget, CSR contact, OTP-verified mobile and email, MCA21 CIN, and proposed CSR work." },
  { step: "2", title: "Unique Tracking ID", detail: "Tracking ID is generated instantly (e.g. CSR-MH-2026-000001) and sent by SMS and email for live status tracking." },
  { step: "3", title: "RM Response (5-Day SLA)", detail: "A dedicated CSR Relationship Manager responds within 5 days, holds an exploratory discussion, and records every interaction." },
  { step: "4", title: "Assessment to Joint Secretary", detail: "RM conducts 13-point statutory feasibility review and submits formal Assessment Report to Joint Secretary." },
  { step: "5", title: "Joint Secretary Decision", detail: "JS approves, approves with conditions, or records reasons. On approval, a District Nodal Officer (DNO) is appointed." },
  { step: "6-8", title: "Dialogue, MoU & Onboarding", detail: "DNO and corporate finalize scope, execute standard tripartite MoU, issue unique Project Code (PRJ-MH-XXXX), and initialize implementation." },
];

const guarantees = [
  { label: "RM Response SLA", value: "5 Working Days", desc: "Dedicated CSR Relationship Manager contacts company" },
  { label: "First Escalation", value: "3 Days", desc: "Auto-escalation to Joint Secretary if RM is silent" },
  { label: "Apex Escalation", value: "2 Days", desc: "Auto-escalation to Planning Secretary if JS is silent" },
  { label: "JS Decision SLA", value: "5 Days", desc: "Statutory decision on RM assessment report" },
];

const implementationSteps = [
  { title: "Agency Sub-Login", detail: "Corporates deploying through their own foundation or NGO partner can grant implementing-agency sub-logins. The agency updates physical progress while the corporate retains executive governance." },
  { title: "Standard 3-Stage Milestone Tracking", detail: "Every deliverable uses strictly NOT STARTED, IN PROGRESS, or COMPLETED for unequivocal state audit clarity." },
  { title: "Geotagged Photo Evidence", detail: "Against each physical milestone, the agency records fund outlay and uploads verified geo-tagged photo evidence." },
  { title: "UC Upload & DNO Verification", detail: "The agency uploads the statutory Utilisation Certificate (UC). The District Nodal Officer conducts physical inspection and certifies UC acceptance." },
  { title: "Independent Third-Party M&E", detail: "For large projects, independent third-party monitoring & evaluation (M&E) reports can be linked directly to the project record." },
];

const governmentPitchSteps = [
  { step: "1", title: "Government Pitch Submission", detail: "Official submits department need: designation, OTP verification, district/location, 200-word CSR requirement, estimated cost, govt fund non-availability declaration, and minimum 2 geo-tagged site photos." },
  { step: "2", title: "Relationship Manager Verification", detail: "Relationship Manager verifies authenticity, Schedule VII eligibility, and non-duplication within the same 5-3-2 day escalation window." },
  { step: "3", title: "JS Approval & Public Listing", detail: "Verification report submitted to Joint Secretary. Upon approval, pitch is published LIVE on the Maharashtra CSR Opportunity Marketplace." },
  { step: "4", title: "Corporate Matching ('I am Interested')", detail: "Interested corporate submits the matching pop-up form with Pitch Reference ID, MCA CIN, contact, budget commitment, and timeline." },
  { step: "5", title: "Tripartite MoU & Execution", detail: "Relationship Manager coordinates between department and corporate, maps DNO, executes standard MoU, and onboards project for tracking." },
];

const grievanceRows = [
  { level: "Level 1: District Redressal", authority: "District Nodal Officer (DNO)", time: "15 Days", scope: "First responder for all on-ground site, clearance, and coordination issues." },
  { level: "Level 2: State Coordination", authority: "State CSR Cell (Member Secretary)", time: "30 Days", scope: "Inter-departmental alignment if unresolved at District level within 15 days." },
  { level: "Level 3: Apex Decision", authority: "Joint Secretary / Planning Secretary", time: "Senior Review", scope: "Final binding statutory decision on contentious matters." },
];

const slaRows = [
  { stage: "Initial response to corporate enquiry", responsible: "CSR Relationship Manager", time: "5 Days", first: "Joint Secretary (3 days)", second: "Planning Secretary (2 days)" },
  { stage: "Decision on assessment report & DNO mapping", responsible: "Joint Secretary", time: "5 Days", first: "Planning Secretary (2 days)", second: "-" },
  { stage: "Government development pitch verification", responsible: "CSR Relationship Manager", time: "5 Days", first: "Joint Secretary (3 days)", second: "Planning Secretary (2 days)" },
  { stage: "Public grievance resolution", responsible: "District Nodal Officer", time: "15 Days", first: "State CSR Cell (30 days)", second: "Planning Secretary" },
  { stage: "Helpdesk support query resolution", responsible: "Public IT Helpdesk", time: "2 Days", first: "State Helpdesk Lead", second: "-" },
];

const feasibilityChecklist = [
  { id: 1, dim: "Mandate & Legal [C]", check: "Activity falls within Schedule VII of the Companies Act, 2013", answer: "Yes / No" },
  { id: 2, dim: "Mandate & Legal [C]", check: "Not a prohibited CSR activity (not employee-only, political, or normal course of business)", answer: "Yes / No" },
  { id: 3, dim: "Need & Alignment [C]", check: "Addresses a genuine, verified development need", answer: "Yes / No" },
  { id: 4, dim: "Need & Alignment [C]", check: "Does NOT duplicate an existing government scheme or ongoing project in the same location", answer: "Yes / No" },
  { id: 5, dim: "Site & Govt Support [C]", check: "For civil/renovation work: site/land is available, clear, and in government ownership/control", answer: "Yes / No / NA" },
  { id: 6, dim: "Site & Govt Support [C]", check: "Required permissions and clearances are obtainable within a reasonable time", answer: "Yes / No" },
  { id: 7, dim: "Site & Govt Support [C]", check: "Required government support (personnel, access, utility) is confirmed", answer: "Yes / No" },
  { id: 8, dim: "Financial Viability", check: "Indicative budget is adequate for the proposed physical scope", answer: "Yes / No" },
  { id: 9, dim: "Financial Viability", check: "Cost estimate is realistic and benchmarked against similar public works", answer: "Yes / No" },
  { id: 10, dim: "Implementation Capacity", check: "Executing capacity exists (corporate / foundation / NGO is capable)", answer: "Yes / No" },
  { id: 11, dim: "Implementation Capacity", check: "Timeline is realistic for the proposed physical deliverables", answer: "Yes / No" },
  { id: 12, dim: "Sustainability [C]", check: "Post-completion asset ownership is explicitly assigned to government department", answer: "Yes / No" },
  { id: 13, dim: "Sustainability [C]", check: "Operation & maintenance (O&M) / recurring-cost responsibility is identified", answer: "Yes / No" },
];

export default function WorkflowPage() {
  const [activeTab, setActiveTab] = useState<"corporate" | "pitch" | "implementation" | "feasibility" | "slas">("corporate");

  return (
    <GovPortalLayout showSidebar={false}>
      <div className="w-full min-w-0 max-w-7xl mx-auto px-4 py-8 sm:px-6 md:py-10 text-slate-900 space-y-6">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              <span>Public Portal</span>
              <span>/</span>
              <span className="text-blue-600 font-extrabold">Workflow Architecture</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              MahaCSR End-to-End Operating Workflow
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Unified architecture bridging Corporate CSR Enquiries, Government Department Pitches, Time-bound SLA Escalations, Feasibility Checks, and Convergence Milestone Tracking.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200">
              <ShieldCheck size={14} className="text-blue-600" />
              <span>Government of Maharashtra</span>
            </span>
          </div>
        </div>

        {/* Quick Tabs Navigation Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
          {[
            { id: "corporate", label: "1. Corporate Enquiry Flow" },
            { id: "pitch", label: "2. Government Pitch Flow" },
            { id: "implementation", label: "3. Implementation & UC" },
            { id: "feasibility", label: "4. 13-Point Feasibility Check" },
            { id: "slas", label: "5. Grievance & SLA Rules" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-extrabold transition-all cursor-pointer border-b-2 shrink-0 ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600 bg-blue-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Corporate Journey */}
        {activeTab === "corporate" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Steps (8 Cols) */}
              <div className="lg:col-span-8 rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs space-y-4">
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Building2 size={16} className="text-blue-600" />
                  Partner with Maharashtra Corporate Journey
                </h2>

                <div className="space-y-3">
                  {corporateSteps.map((step) => (
                    <div
                      key={step.step}
                      className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-blue-50/30 hover:border-blue-200 transition-all flex items-start gap-4"
                    >
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-extrabold shrink-0 shadow-2xs">
                        {step.step}
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                          {step.title}
                        </h3>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          {step.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar Guarantees (4 Cols) */}
              <div className="lg:col-span-4 space-y-4">
                <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
                  <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Clock size={16} className="text-amber-600" />
                    Time-Bound SLA Guarantees
                  </h2>

                  <div className="space-y-3">
                    {guarantees.map((g) => (
                      <div key={g.label} className="p-3.5 rounded-2xl border border-amber-100 bg-amber-50/50 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-amber-900">{g.label}</span>
                          <span className="font-mono text-xs font-extrabold text-amber-950 px-2 py-0.5 rounded-md bg-amber-200/60">{g.value}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium">{g.desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <Link
                      href="/partner-with-maharashtra"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all"
                    >
                      <span>Submit Corporate Enquiry</span>
                      <ArrowRight size={14} />
                    </Link>

                    <Link
                      href="/track"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all"
                    >
                      <span>Track Existing Enquiry</span>
                    </Link>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: Pitch Flow */}
        {activeTab === "pitch" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs space-y-4">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Send size={16} className="text-emerald-600" />
                Government Development Pitch Lifecycle
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {governmentPitchSteps.map((step) => (
                  <div
                    key={step.step}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-emerald-50/30 hover:border-emerald-200 transition-all flex items-start gap-3.5"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-extrabold shrink-0 shadow-2xs">
                      {step.step}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                        {step.title}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-950 flex items-center gap-3">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>On submission, a unique Government Pitch Reference ID (e.g. GP-MH-2026-000001) is issued. Only verified pitches are publicly listed on the Opportunity Marketplace.</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Implementation */}
        {activeTab === "implementation" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs space-y-4">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Layers size={16} className="text-purple-600" />
                Implementation, Milestones &amp; Utilisation Certificate (UC)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {implementationSteps.map((item) => (
                  <div
                    key={item.title}
                    className="p-4.5 rounded-2xl border border-slate-100 bg-slate-50/60 space-y-1.5 hover:border-slate-300 transition-all"
                  >
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: 13-Point Feasibility Checklist */}
        {activeTab === "feasibility" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText size={16} className="text-blue-600" />
                  Annexure A: 13-Point Statutory Feasibility Checklist
                </h2>
                <span className="text-[11px] font-extrabold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  [C] = Critical Mandatory Gate
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200">
                      <th className="py-3 px-3 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] w-12 text-center">#</th>
                      <th className="py-3 px-4 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] w-48">Dimension</th>
                      <th className="py-3 px-4 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Feasibility Verification Item</th>
                      <th className="py-3 px-4 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] w-28 text-center">Standard</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {feasibilityChecklist.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-600 text-center">{row.id}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{row.dim}</td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{row.check}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-extrabold">
                            {row.answer}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/60 text-xs font-semibold text-blue-950 leading-relaxed">
                <strong>Statutory Decision Rule:</strong> All 9 critical checks (items 1–7, 12, 13) must be verified YES by the Relationship Manager for FEASIBLE rating. If conditional, state specific mitigation. If failed, recorded as NOT FEASIBLE.
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Grievances & SLAs */}
        {activeTab === "slas" && (
          <div className="space-y-6 animate-fadeIn">
            {/* SLAs Table */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs space-y-4">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Clock size={16} className="text-blue-600" />
                Statutory Service Level Agreements (SLAs) &amp; Escalation Matrix
              </h2>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200">
                      <th className="py-3 px-4 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Workflow Stage</th>
                      <th className="py-3 px-4 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Primary Authority</th>
                      <th className="py-3 px-4 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Response SLA</th>
                      <th className="py-3 px-4 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Level 1 Escalation</th>
                      <th className="py-3 px-4 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Apex Escalation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {slaRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{row.stage}</td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{row.responsible}</td>
                        <td className="py-3 px-4 font-mono font-extrabold text-emerald-700">{row.time}</td>
                        <td className="py-3 px-4 text-slate-600 font-medium">{row.first}</td>
                        <td className="py-3 px-4 text-slate-600 font-medium">{row.second}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Grievance Table */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs space-y-4">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldCheck size={16} className="text-amber-600" />
                3-Tier Public Grievance Redressal Architecture
              </h2>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200">
                      <th className="py-3 px-4 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Tier</th>
                      <th className="py-3 px-4 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Competent Authority</th>
                      <th className="py-3 px-4 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Statutory SLA</th>
                      <th className="py-3 px-4 font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Jurisdiction Scope</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {grievanceRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{row.level}</td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{row.authority}</td>
                        <td className="py-3 px-4 font-mono font-extrabold text-amber-800">{row.time}</td>
                        <td className="py-3 px-4 text-slate-600 font-medium leading-relaxed">{row.scope}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </GovPortalLayout>
  );
}

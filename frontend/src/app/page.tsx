import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  CloudUpload,
  FileCheck2,
  Headphones,
  Landmark,
  ShieldCheck,
  Users,
} from "lucide-react";
import HeroSection from "@/components/HeroSection";
import GisMap from "@/components/GisMap";

const workflow = [
  {
    title: "Register",
    detail: "Register as NGO, Company, or Government Entity",
    icon: Users,
  },
  {
    title: "Onboard",
    detail: "Complete onboarding and upload statutory documents",
    icon: CloudUpload,
  },
  {
    title: "Verify",
    detail: "Administrator verifies documents before approval",
    icon: ShieldCheck,
  },
  {
    title: "Approve & Publish",
    detail: "Approved entities can publish proposals and manage CSR",
    icon: CheckCircle2,
  },
];

const roleCards = [
  {
    title: "For NGOs",
    detail: "Register credentials, maintain CSR-1 records, publish proposals, and submit milestone evidence.",
    action: "Register as NGO",
    href: "/register",
    icon: Users,
    tone: "green",
  },
  {
    title: "For Corporates",
    detail: "Submit CSR interest, browse public development needs, and track enquiry status.",
    action: "Partner with Maharashtra",
    href: "/partner-with-maharashtra",
    icon: Building2,
    tone: "blue",
  },
  {
    title: "For Government Entities",
    detail: "Pitch development needs with district, budget, certification, and location evidence.",
    action: "Pitch Development Need",
    href: "/pitch-development-need",
    icon: Landmark,
    tone: "orange",
  },
];

const stats = [
  ["11,000+", "Beneficiaries Served", "+ 18% YoY"],
  ["10.92 Cr+", "Allocated CSR Funds", "+ 23% YoY"],
  ["6,000+", "Active Projects", "+ 15% YoY"],
  ["5,000+", "Active NGOs", "+ 20% YoY"],
  ["36", "Districts Covered", "100% Maharashtra"],
];

const recommendations = [
  "Publish a monthly district priority index for water-stress, tribal, and school infrastructure gaps.",
  "Add a public verification seal for NGOs with current CSR-1, Darpan, 12A, 80G, and audited statements.",
  "Expose a downloadable CSR utilization register with district, focus area, company, NGO, and milestone status.",
  "Create an officer review queue with SLA labels for pending NGO, company, and project approvals.",
];

const notices = [
  ["CSR policy notices published by authorized officers", "Policy Notice", "Official", "15 May 2025"],
  ["CSR-1, Darpan, PAN, 12A/80G, GST, and board authorization guidance", "Document Checklist", "Reference", "10 May 2025"],
  ["Entity approvals, rejections, and query notices after administrative verification", "Approval Orders", "Workflow", "08 May 2025"],
];

const pillars = [
  {
    title: "Credential Verification",
    detail: "Verify CSR-1, NGO Darpan, PAN, 12A/80G, audited statements, and office location checks.",
    icon: ShieldCheck,
  },
  {
    title: "Matching & Approval",
    detail: "Project proposals ranked by focus area, district priority, budget fit, and implementation history.",
    icon: ClipboardCheck,
  },
  {
    title: "Milestone Monitoring",
    detail: "Evidence upload, officer review, tranche readiness, audit trail, and downloadable compliance reports.",
    icon: BarChart3,
  },
];

const cardTone = {
  green: "border-emerald-200 bg-emerald-50/45 text-emerald-700",
  blue: "border-blue-200 bg-blue-50/55 text-blue-700",
  orange: "border-orange-200 bg-orange-50/55 text-orange-700",
};

export default function LandingPage() {
  return (
    <div className="bg-[#f5f7fb] text-[#10244a]">
      <HeroSection />

      <main className="mx-auto flex w-full max-w-[1380px] flex-col gap-6 px-4 pb-10 pt-8 sm:px-6 md:px-8 lg:pt-14">
        <section className="rounded-lg border border-[#d8e2ef] bg-white p-4 shadow-[0_8px_26px_rgba(15,35,70,0.06)] sm:p-5 md:p-6">
          <div className="flex flex-col gap-4 border-b border-[#d8e2ef] pb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#456aa4]">Registration & Approval Workflow</div>
              <h2 className="mt-1 break-words text-xl font-extrabold leading-tight text-[#102c60] sm:text-2xl">From Registration to Approval</h2>
            </div>
            <div className="rounded-md border border-[#d8e2ef] bg-[#f8fbff] px-4 py-3 text-xs font-semibold leading-5 text-[#48627f] md:max-w-[390px]">
              Public statistics are displayed only from approved records and audited reports.
            </div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {workflow.map((step, index) => (
              <div key={step.title} className="relative rounded-md border border-[#cfdcf0] bg-[#f9fbff] p-5">
                <div className="absolute -top-4 left-1/2 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full bg-[#245ddc] text-xs font-extrabold text-white shadow-md">
                  {index + 1}
                </div>
                <step.icon className="mt-3 text-[#2464e8]" size={28} />
                <h3 className="mt-3 text-sm font-extrabold text-[#112c62]">{step.title}</h3>
                <p className="mt-1 text-[11px] font-medium leading-5 text-[#516986]">{step.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-[#d8e2ef] bg-white p-4 shadow-[0_8px_26px_rgba(15,35,70,0.06)] sm:p-5 md:p-6">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#456aa4]">Access by Role</div>
          <h2 className="mt-1 break-words text-xl font-extrabold leading-tight text-[#102c60] sm:text-2xl">Choose your role to get started</h2>
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            {roleCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className={`rounded-md border p-6 transition hover:-translate-y-0.5 hover:shadow-md hover:no-underline ${cardTone[card.tone as keyof typeof cardTone]}`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:flex-col lg:items-start xl:flex-row xl:items-center">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-current/20 bg-white/75">
                    <card.icon size={34} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold">{card.title}</h3>
                    <p className="mt-2 text-xs font-medium leading-5 text-slate-600">{card.detail}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold">
                      {card.action} <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-[#d8e2ef] bg-white p-4 shadow-[0_8px_26px_rgba(15,35,70,0.06)] sm:p-5 md:p-6">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#456aa4]">Public Information Directory</div>
          <h2 className="mt-1 break-words text-xl font-extrabold leading-tight text-[#102c60] sm:text-2xl">MahaCSR Setu Resources</h2>
          
          <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Framework & Policy Information",
                description: "The State's CSR convergence framework explained simply; benefits to corporates. Marathi & English.",
                href: "/framework-policy",
                bulletColor: "bg-[#12325a]"
              },
              {
                title: "Document Library",
                description: "CSR Rules 2014 & MCA amendments; Schedule VII; State GRs; progress formats; checklists.",
                href: "/document-library",
                bulletColor: "bg-[#FF9933]"
              },
              {
                title: "Workflow Explainer",
                description: "Simple visual guide showing exactly how the partnership works, step by step, with timelines.",
                href: "/workflow",
                bulletColor: "bg-[#138808]"
              },
              {
                title: "Success Stories & Case Studies",
                description: "Completed projects with photos, investment, beneficiaries, corporate name. Builds confidence through proof.",
                href: "/success-stories",
                bulletColor: "bg-[#008080]"
              },
              {
                title: "CSR Summits & Events",
                description: "Past summit reports and videos; upcoming events; registration links.",
                href: "/csr-events",
                bulletColor: "bg-[#d97706]"
              },
              {
                title: "Directory",
                description: "Contact details of the State CSR Cell, the CSR Relationship Managers, and all District Nodal Officers.",
                href: "/directory",
                bulletColor: "bg-red-600"
              },
              {
                title: "Completed Projects Gallery",
                description: "Permanent, searchable public record of all portal projects — by district, sector, corporate, year.",
                href: "/completed-projects",
                bulletColor: "bg-indigo-600"
              },
              {
                title: "Public Development Needs (Live)",
                description: "Government pitches approved and made public — open for any corporate to fund.",
                href: "/public-development-needs",
                bulletColor: "bg-sky-600"
              },
              {
                title: "FAQs, News & Recognition",
                description: "Common questions; portal updates; CSR awards and recognition of corporate partners.",
                href: "/faq-news-recognition",
                bulletColor: "bg-teal-600"
              }
            ].map((item) => (
              <Link 
                key={item.title} 
                href={item.href}
                className="flex items-start gap-3 rounded-md border border-[#d8e2ef] bg-white p-4 hover:border-blue-200 transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.01)] hover:shadow-md hover:no-underline group"
              >
                <span className={`h-3 w-3 rounded-sm ${item.bulletColor} shrink-0 mt-1.5`} />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 leading-snug group-hover:text-[#245ddc] transition-colors">{item.title}</h3>
                  <p className="mt-1.5 text-[11px] font-semibold leading-relaxed text-slate-500">{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-[#d8e2ef] bg-white p-4 shadow-[0_8px_26px_rgba(15,35,70,0.06)] sm:p-5 md:p-6">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#456aa4]">MahaCSR at a Glance</div>
          <div className="mt-4 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {stats.map(([value, label, delta], index) => (
              <div key={label} className="rounded-md border border-[#d8e2ef] bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className={`grid h-10 w-10 place-items-center rounded-md ${index === 1 ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"}`}>
                    {index === 1 ? <FileCheck2 size={20} /> : <Users size={20} />}
                  </div>
                  <div>
                    <div className="text-xl font-extrabold text-[#102c60]">{value}</div>
                    <div className="text-xs font-semibold text-[#516986]">{label}</div>
                  </div>
                </div>
                <div className="mt-3 text-[11px] font-extrabold text-emerald-700">{delta}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-lg border border-[#d8e2ef] bg-white p-4 shadow-[0_8px_26px_rgba(15,35,70,0.06)] sm:p-5 md:p-6">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#456aa4]">Recommended Improvements for Stronger Governance</div>
            <div className="mt-5 flex flex-col gap-3">
              {recommendations.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-md border border-[#d8e2ef] bg-white p-3">
                  <CheckCircle2 className="shrink-0 text-emerald-600" size={18} />
                  <p className="flex-1 text-sm font-semibold leading-6 text-[#364d69]">{item}</p>
                  <ArrowRight className="shrink-0 text-[#245ddc]" size={17} />
                </div>
              ))}
            </div>
            
          </div>

          <div className="rounded-lg border border-[#d8e2ef] bg-white p-4 shadow-[0_8px_26px_rgba(15,35,70,0.06)] sm:p-5 md:p-6">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#456aa4]">Circulars & Notices</div>
              <Link href="/circulars" className="text-xs font-extrabold text-[#245ddc] hover:no-underline">View All</Link>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 border-b border-[#d8e2ef] pb-3 text-xs font-extrabold">
              <span className="rounded bg-[#245ddc] px-4 py-2 text-white">All</span>
              <span className="px-2 py-2 text-[#4c6380]">Policy Notices</span>
              <span className="px-2 py-2 text-[#4c6380]">Government Resolutions</span>
              <span className="px-2 py-2 text-[#4c6380]">Circulars</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left text-xs">
                <thead className="bg-[#f8fbff] text-[#102c60]">
                  <tr>
                    <th className="border border-[#d8e2ef] px-3 py-3">Title</th>
                    <th className="border border-[#d8e2ef] px-3 py-3">Category</th>
                    <th className="border border-[#d8e2ef] px-3 py-3">Type</th>
                    <th className="border border-[#d8e2ef] px-3 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="text-[#4c6380]">
                  {notices.map(([title, category, type, date]) => (
                    <tr key={title}>
                      <td className="border border-[#d8e2ef] px-3 py-3 font-semibold">{title}</td>
                      <td className="border border-[#d8e2ef] px-3 py-3">{category}</td>
                      <td className="border border-[#d8e2ef] px-3 py-3">{type}</td>
                      <td className="border border-[#d8e2ef] px-3 py-3">{date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link href="/circulars" className="mt-5 inline-flex min-h-10 items-center rounded-md border border-[#cfdcf0] px-5 text-xs font-extrabold text-[#245ddc] hover:bg-blue-50 hover:no-underline">
              View All Notices & Circulars
            </Link>
          </div>
        </section>

        <section className="rounded-lg border border-[#d8e2ef] bg-white p-4 shadow-[0_8px_26px_rgba(15,35,70,0.06)] sm:p-5 md:p-6">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#456aa4]">District CSR Register</div>
              <h2 className="mt-1 break-words text-lg font-extrabold text-[#102c60]">Visualize CSR activity across Maharashtra</h2>
          <div className="mt-5">
            <GisMap />
          </div>
        </section>

        <section className="rounded-lg border border-[#d8e2ef] bg-white p-5 shadow-[0_8px_26px_rgba(15,35,70,0.06)] md:p-6">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#456aa4]">Our Process Pillars</div>
          <h2 className="mt-1 text-lg font-extrabold text-[#102c60]">How MahaCSR drives accountable impact</h2>
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            {pillars.map((pillar, index) => (
              <div key={pillar.title} className="rounded-md border border-[#d8e2ef] bg-white p-5">
                <div className="flex items-start gap-5">
                  <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full border border-blue-100 bg-blue-50 text-[#245ddc]">
                    <span className="absolute -left-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-[#245ddc] text-[11px] font-extrabold text-white">0{index + 1}</span>
                    <pillar.icon size={30} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#102c60]">{pillar.title}</h3>
                    <p className="mt-2 text-xs font-medium leading-5 text-[#516986]">{pillar.detail}</p>
                    <Link href="/knowledge" className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold text-[#245ddc] hover:no-underline">
                      Learn more <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg bg-[#062a5d] px-6 py-6 text-white shadow-[0_12px_30px_rgba(6,42,93,0.2)] md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
              <Headphones className="shrink-0 text-blue-100" size={44} />
              <div>
                <h2 className="text-xl font-extrabold">Need help with registration, CSR filings, or project approval?</h2>
                <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-blue-100">
                  Use the knowledge center for templates, compliance guidance, support tickets, and official helpdesk chat.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/knowledge" className="inline-flex min-h-11 items-center rounded-md border border-white/45 px-5 text-sm font-extrabold text-white hover:bg-white/10 hover:no-underline">
                Knowledge Center
              </Link>
              <Link href="/contact" className="inline-flex min-h-11 items-center rounded-md bg-[#ff7a1a] px-5 text-sm font-extrabold text-white hover:bg-[#ea6508] hover:no-underline">
                Contact Helpdesk
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

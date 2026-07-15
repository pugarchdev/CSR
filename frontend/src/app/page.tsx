import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Headphones,
  Landmark,
  Users,
} from "lucide-react";
import HeroSection from "@/components/HeroSection";
import GisMap from "@/components/GisMap";
import HomeStatsStrip from "@/components/HomeStatsStrip";

const workflow = [
  {
    title: "State-Level Entry & Dialogue",
    detail: "Corporates approach the State CSR Coordinating Unit. An initial dialogue captures sector preference, budget, and geography.",
    icon: Headphones,
  },
  {
    title: "Domain-Specific Delegation",
    detail: "The State Unit nominates the relevant district Head of Department as the single point of contact, retaining oversight.",
    icon: Users,
  },
  {
    title: "Ground Finalisation & MoU",
    detail: "The District Nodal Officer and corporate align needs to a project blueprint and execute the standard MoU.",
    icon: FileCheck2,
  },
  {
    title: "Onboarding & Tracking",
    detail: "The project is onboarded to the portal, tracking physical/financial progress, UCs, and administrative bottlenecks.",
    icon: CheckCircle2,
  },
];

const roleCards = [
  {
    title: "Corporate Partners",
    detail: "Submit a CSR partnership enquiry, browse live government development needs, and track your enquiry through a single point of coordination.",
    action: "Partner with Maharashtra",
    href: "/partner-with-maharashtra",
    icon: Building2,
    tone: "blue",
  },
  {
    title: "Government Departments & Districts",
    detail: "Pitch a specific development need with district, budget, and location evidence to seek CSR support under the convergence framework.",
    action: "Pitch a Development Need",
    href: "/pitch-development-need",
    icon: Landmark,
    tone: "orange",
  },
  {
    title: "Track a Partnership",
    detail: "Corporates and departments can track the real-time status of any enquiry, pitch, or onboarded project using the tracking ID.",
    action: "Track Status",
    href: "/track",
    icon: ClipboardCheck,
    tone: "green",
  },
];

const recommendations = [
  "Align CSR investments with district development priorities to prevent duplication and fragmented, one-time interventions.",
  "Single-point accountability through one domain nodal officer per project, with Collector and ZP CEO kept informed.",
  "Two-way Pitch & Exchange: corporates pitch initiatives needing facilitation; departments pitch needs seeking CSR support.",
  "Time-bound escalation (5-3-2 rule) ensures accelerated decision-making and reliable project facilitation.",
];

const notices = [
  ["CSR convergence framework guidelines issued by the State CSR Coordinating Unit", "Policy Notice", "Official", "15 May 2025"],
  ["Standard MoU template and 13-point feasibility checklist for convergence projects", "Reference", "Workflow", "10 May 2025"],
  ["Guidelines for government pitches to ensure convergence, avoid duplication, and ensure sustainability", "Guidelines", "Workflow", "08 May 2025"],
];

const pillars = [
  {
    title: "Single-Point Coordination",
    detail: "One domain nodal officer per project assumes total accountability, with the State Unit ensuring compliance and rapid resolution.",
    icon: Users,
  },
  {
    title: "Convergence with Government",
    detail: "CSR aligned with district development plans and schemes, preventing duplication and enabling greater, sustainable impact.",
    icon: ClipboardCheck,
  },
  {
    title: "Transparent Monitoring",
    detail: "Real-time physical and financial progress, geo-tagged evidence, utilization certificates, and a full audit trail.",
    icon: BarChart3,
  },
];

const cardTone = {
  green: "border-[#c8e6c9] bg-[#e8f5e9] text-[#2e7d32]",
  blue: "border-[#c4ddf2] bg-[#e3f0fa] text-[#14274e]",
  orange: "border-[#fbe0b8] bg-[#fef3e0] text-[#b06000]",
};

export default function LandingPage() {
  return (
    <div className="bg-[#f4f5f7] text-[#333333]">
      <HeroSection />

      <main className="mx-auto flex w-full max-w-[1380px] flex-col gap-6 px-4 pb-10 pt-8 sm:px-6 md:px-8 lg:pt-14">
        <section className="rounded-lg border border-[#e0e4ea] bg-white p-4 sm:p-5 md:p-6">
          <div className="flex flex-col gap-4 border-b border-[#e0e4ea] pb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6b7280]">State-Led, District-Executed Convergence</div>
              <h2 className="mt-1 break-words text-xl font-extrabold leading-tight text-[#14274e] sm:text-2xl">How the partnership works</h2>
            </div>
            <div className="rounded-md border border-[#e0e4ea] bg-[#f4f5f7] px-4 py-3 text-xs font-semibold leading-5 text-[#6b7280] md:max-w-[390px]">
              A single State CSR Coordinating Unit routes every corporate to one accountable District Nodal Officer.
            </div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {workflow.map((step, index) => (
              <div key={step.title} className="relative rounded-md border border-[#e0e4ea] bg-[#f4f5f7] p-5">
                <div className="absolute -top-4 left-1/2 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full bg-[#1789d6] text-xs font-extrabold text-white">
                  {index + 1}
                </div>
                <step.icon className="mt-3 text-[#1789d6]" size={28} />
                <h3 className="mt-3 text-sm font-extrabold text-[#14274e]">{step.title}</h3>
                <p className="mt-1 text-[11px] font-medium leading-5 text-[#6b7280]">{step.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-[#e0e4ea] bg-white p-4 sm:p-5 md:p-6">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6b7280]">Two Ways to Engage</div>
          <h2 className="mt-1 break-words text-xl font-extrabold leading-tight text-[#14274e] sm:text-2xl">Start your convergence partnership</h2>
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            {roleCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className={`rounded-lg border p-6 transition-colors hover:no-underline ${cardTone[card.tone as keyof typeof cardTone]}`}
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

        <section className="rounded-lg border border-[#e0e4ea] bg-white p-4 sm:p-5 md:p-6">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6b7280]">Public Information Directory</div>
          <h2 className="mt-1 break-words text-xl font-extrabold leading-tight text-[#14274e] sm:text-2xl">MahaCSR Setu Resources</h2>
          
          <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Framework & Policy Information",
                description: "The State's CSR convergence framework explained simply; benefits to corporates. Marathi & English.",
                href: "/framework-policy",
                bulletColor: "bg-[#14274e]"
              },
              {
                title: "Document Library",
                description: "CSR Rules 2014 & MCA amendments; Schedule VII; State GRs; progress formats; checklists.",
                href: "/document-library",
                bulletColor: "bg-[#f7941d]"
              },
              {
                title: "Workflow Explainer",
                description: "Simple visual guide showing exactly how the partnership works, step by step, with timelines.",
                href: "/workflow",
                bulletColor: "bg-[#43a047]"
              },
              {
                title: "Success Stories & Case Studies",
                description: "Completed projects with photos, investment, beneficiaries, corporate name. Builds confidence through proof.",
                href: "/success-stories",
                bulletColor: "bg-[#0f7c8a]"
              },
              {
                title: "CSR Summits & Events",
                description: "Past summit reports and videos; upcoming events; registration links.",
                href: "/csr-events",
                bulletColor: "bg-[#f7941d]"
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
                className="flex items-start gap-3 rounded-lg border border-[#e0e4ea] bg-white p-4 hover:border-[#1789d6] transition-colors hover:no-underline group"
              >
                <span className={`h-3 w-3 rounded-sm ${item.bulletColor} shrink-0 mt-1.5`} />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 leading-snug group-hover:text-[#1789d6] transition-colors">{item.title}</h3>
                  <p className="mt-1.5 text-[11px] font-semibold leading-relaxed text-slate-500">{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-[#e0e4ea] bg-white p-4 sm:p-5 md:p-6">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6b7280]">MahaCSR at a Glance</div>
          <p className="mt-1 text-xs font-semibold text-[#6b7280]">Live figures drawn only from projects onboarded and certified on the portal.</p>
          <HomeStatsStrip />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-lg border border-[#e0e4ea] bg-white p-4 sm:p-5 md:p-6">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6b7280]">Framework Principles</div>
            <div className="mt-5 flex flex-col gap-3">
              {recommendations.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-md border border-[#e0e4ea] bg-white p-3">
                  <CheckCircle2 className="shrink-0 text-[#2e7d32]" size={18} />
                  <p className="flex-1 text-sm font-semibold leading-6 text-[#4b5563]">{item}</p>
                  <ArrowRight className="shrink-0 text-[#1789d6]" size={17} />
                </div>
              ))}
            </div>
            
          </div>

          <div className="rounded-lg border border-[#e0e4ea] bg-white p-4 sm:p-5 md:p-6">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6b7280]">Circulars & Notices</div>
              <Link href="/circulars" className="text-xs font-extrabold text-[#1789d6] hover:no-underline">View All</Link>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 border-b border-[#e0e4ea] pb-3 text-xs font-extrabold">
              <span className="rounded bg-[#1789d6] px-4 py-2 text-white">All</span>
              <span className="px-2 py-2 text-[#4b5563]">Policy Notices</span>
              <span className="px-2 py-2 text-[#4b5563]">Government Resolutions</span>
              <span className="px-2 py-2 text-[#4b5563]">Circulars</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left text-xs">
                <thead className="bg-[#f4f5f7] text-[#14274e]">
                  <tr>
                    <th className="border border-[#e0e4ea] px-3 py-3">Title</th>
                    <th className="border border-[#e0e4ea] px-3 py-3">Category</th>
                    <th className="border border-[#e0e4ea] px-3 py-3">Type</th>
                    <th className="border border-[#e0e4ea] px-3 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="text-[#4b5563]">
                  {notices.map(([title, category, type, date]) => (
                    <tr key={title}>
                      <td className="border border-[#e0e4ea] px-3 py-3 font-semibold">{title}</td>
                      <td className="border border-[#e0e4ea] px-3 py-3">{category}</td>
                      <td className="border border-[#e0e4ea] px-3 py-3">{type}</td>
                      <td className="border border-[#e0e4ea] px-3 py-3">{date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link href="/circulars" className="mt-5 inline-flex min-h-10 items-center rounded-md border border-[#e0e4ea] px-5 text-xs font-extrabold text-[#1789d6] hover:bg-[#e3f0fa] hover:no-underline">
              View All Notices & Circulars
            </Link>
          </div>
        </section>

        <section className="rounded-lg border border-[#e0e4ea] bg-white p-4 sm:p-5 md:p-6">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6b7280]">District CSR Register</div>
              <h2 className="mt-1 break-words text-lg font-extrabold text-[#14274e]">Visualize CSR activity across Maharashtra</h2>
          <div className="mt-5">
            <GisMap />
          </div>
        </section>

        <section className="rounded-lg border border-[#e0e4ea] bg-white p-5 md:p-6">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6b7280]">The Convergence Model</div>
          <h2 className="mt-1 text-lg font-extrabold text-[#14274e]">State-Led, District-Executed</h2>
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            {pillars.map((pillar, index) => (
              <div key={pillar.title} className="rounded-md border border-[#e0e4ea] bg-white p-5">
                <div className="flex items-start gap-5">
                  <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full border border-[#c4ddf2] bg-[#e3f0fa] text-[#1789d6]">
                    <span className="absolute -left-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-[#1789d6] text-[11px] font-extrabold text-white">0{index + 1}</span>
                    <pillar.icon size={30} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#14274e]">{pillar.title}</h3>
                    <p className="mt-2 text-xs font-medium leading-5 text-[#6b7280]">{pillar.detail}</p>
                    <Link href="/knowledge" className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold text-[#1789d6] hover:no-underline">
                      Learn more <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg bg-[#0e2144] px-6 py-6 text-white md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
              <Headphones className="shrink-0 text-white/80" size={44} />
              <div>
                <h2 className="text-xl font-extrabold">Need help partnering with Maharashtra or pitching a development need?</h2>
                <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-white/80">
                  Use the knowledge center for the framework guide, the standard MoU template, document checklists, and the official helpdesk.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/knowledge" className="inline-flex min-h-11 items-center rounded-md border border-white/45 px-5 text-sm font-extrabold text-white hover:bg-white/10 hover:no-underline">
                Knowledge Center
              </Link>
              <Link href="/contact" className="inline-flex min-h-11 items-center rounded-md bg-[#f7941d] px-5 text-sm font-extrabold text-white hover:bg-[#e07f00] hover:no-underline">
                Contact Helpdesk
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

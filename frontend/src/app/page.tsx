import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, ClipboardList, FileText, Landmark, MapPin, ShieldCheck, Users } from "lucide-react";

const serviceCards = [
  {
    title: "For NGOs",
    detail: "Register credentials, maintain CSR-1 records, publish proposals, and submit milestone evidence.",
    href: "/register",
    icon: Landmark,
  },
  {
    title: "For Corporates",
    detail: "Discover verified projects, track recommended matches, approve tranches, and generate reports.",
    href: "/marketplace",
    icon: Building2,
  },
  {
    title: "For Government Entities",
    detail: "Register a department, district office, or local body for restricted access after administrator approval.",
    href: "/register",
    icon: ShieldCheck,
  },
];

const recommendations = [
  "Publish a monthly district priority index for water-stress, tribal, and school infrastructure gaps.",
  "Add a public verification seal for NGOs with current CSR-1, Darpan, 12A, 80G, and audited statements.",
  "Expose a downloadable CSR utilization register with district, focus area, company, NGO, and milestone status.",
  "Create an officer review queue with SLA labels for pending NGO, company, and project approvals.",
];

export default function LandingPage() {
  return (
    <div className="bg-[#f6f8fb] text-gov-ink">
      <section className="border-b border-gov-line bg-white">
        <div className="h-1.5 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-10 lg:py-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="flex flex-col gap-6">
              <div className="w-fit border border-gov-line bg-gov-mist px-3 py-1 text-xs font-bold uppercase tracking-wide text-gov-blue">
                Government of Maharashtra | CSR Facilitation Portal
              </div>
              <div className="flex flex-col gap-4">
                <h1 className="max-w-4xl text-4xl font-extrabold leading-[1.08] text-gov-navy md:text-5xl">
                  MahaCSR single window for verified CSR funding, monitoring, and public accountability.
                </h1>
                <p className="max-w-3xl text-base leading-7 text-gov-muted">
                  A formal state portal for connecting eligible corporate CSR capital with verified NGOs, district
                  priorities, milestone evidence, and official compliance reporting under Section 135.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/marketplace"
                  className="inline-flex min-h-10 items-center gap-2 bg-gov-blue px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-gov-navy"
                >
                  View CSR Directory <ArrowRight size={16} />
                </Link>
                <Link
                  href="/knowledge"
                  className="inline-flex min-h-10 items-center gap-2 border border-gov-blue bg-white px-5 py-2.5 text-sm font-bold text-gov-blue hover:bg-[#e8f0f8]"
                >
                  Compliance Helpdesk
                </Link>
              </div>
            </div>

            <div className="border border-gov-line bg-white p-6 shadow-sm">
              <div className="border-b border-gov-line pb-4">
                <span className="text-xs font-bold uppercase tracking-wide text-gov-muted">Public register workflow</span>
                <h2 className="mt-1 text-xl font-extrabold text-gov-navy">Registration and approval workflow</h2>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3.5">
                {[
                  ["1", "Register as NGO, company, or government entity"],
                  ["2", "Complete onboarding and upload statutory documents"],
                  ["3", "Admin verifies documents before account approval"],
                  ["4", "Approved entities can publish proposals or manage CSR projects"],
                ].map(([value, label]) => (
                  <div key={label} className="flex gap-3 border border-gov-line bg-gov-mist p-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center bg-gov-blue text-sm font-extrabold text-white">{value}</div>
                    <div className="text-sm font-semibold leading-6 text-slate-700">{label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900">
                Public statistics should be displayed only from approved records and audited reports.
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-12 md:px-10">
        <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {serviceCards.map((card) => (
            <Link
              href={card.href}
              key={card.title}
              className="border border-gov-line bg-white p-6 shadow-sm transition hover:border-gov-blue hover:shadow-md hover:no-underline"
            >
              <div className="grid h-11 w-11 place-items-center border border-amber-200 bg-amber-50 text-gov-saffron">
                <card.icon size={22} />
              </div>
              <h2 className="mt-4 text-lg font-extrabold text-gov-navy">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-gov-muted">{card.detail}</p>
            </Link>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="border border-gov-line bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gov-saffron">
              <ClipboardList size={16} /> Portal recommendations
            </div>
            <h2 className="mt-3 text-2xl font-extrabold text-gov-navy">Recommended improvements for stronger governance</h2>
            <div className="mt-5 flex flex-col gap-3">
              {recommendations.map((item) => (
                <div key={item} className="flex gap-3 border border-gov-line bg-gov-mist p-3 text-sm leading-6 text-slate-700">
                  <CheckCircle2 className="mt-1 shrink-0 text-gov-green" size={16} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-gov-line bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gov-blue">
              <FileText size={16} /> Circulars and notices
            </div>
            <div className="mt-5 flex flex-col divide-y divide-gov-line border border-gov-line">
              {[
                ["CSR policy notices", "Government resolutions and circulars published by authorized officers", "Official"],
                ["Document checklists", "CSR-1, Darpan, PAN, 12A/80G, CIN, GST, and board authorization guidance", "Reference"],
                ["Approval orders", "Entity approvals, rejections, and query notices after administrative verification", "Workflow"],
              ].map(([code, title, date]) => (
                <div key={code} className="grid grid-cols-1 gap-2 bg-white p-4 md:grid-cols-[150px_1fr_100px]">
                  <span className="text-xs font-extrabold text-gov-blue">{code}</span>
                  <span className="text-sm font-semibold text-slate-800">{title}</span>
                  <span className="text-xs font-bold text-gov-muted md:text-right">{date}</span>
                </div>
              ))}
            </div>
            <Link href="/about/circulars" className="mt-4 inline-flex text-sm font-bold text-gov-blue">
              View all circulars
            </Link>
          </div>
        </section>

        <section className="border border-gov-line bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gov-saffron">
                <MapPin size={16} /> District view
              </div>
              <h2 className="mt-2 text-2xl font-extrabold text-gov-navy">District CSR register</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-gov-muted">
              District data should be published only after records are approved by the administrative verification workflow.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              ["Verified entities", "Published after document approval by the admin desk."],
              ["Approved project shelf", "Projects become visible after proposal review and sanction."],
              ["CSR utilization", "District-wise utilization is generated from audited reports."],
            ].map(([title, detail]) => (
              <div key={title} className="border border-gov-line bg-gov-mist p-4">
                <h3 className="text-sm font-extrabold text-gov-navy">{title}</h3>
                <p className="mt-2 text-xs leading-6 text-gov-muted">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            ["Credential verification", "CSR-1, NGO Darpan, PAN, 12A/80G, audited statements, and office location checks."],
            ["Matching and approval", "Project proposals ranked by focus area, district priority, budget fit, and implementation history."],
            ["Milestone monitoring", "Evidence upload, officer review, tranche readiness, audit trail, and downloadable compliance reports."],
          ].map(([title, detail], index) => (
            <div key={title} className="border border-gov-line bg-white p-6 shadow-sm">
              <div className="text-3xl font-extrabold text-slate-400">0{index + 1}</div>
              <h3 className="mt-2 text-lg font-extrabold text-gov-navy">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-gov-muted">{detail}</p>
            </div>
          ))}
        </section>

        <section className="border border-gov-blue bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gov-saffron">
                <Users size={16} /> Public service desk
              </div>
              <h2 className="mt-2 text-2xl font-extrabold text-gov-navy">Need help with registration, CSR filings, or project approval?</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gov-muted">
                Use the knowledge center for templates, compliance guidance, support tickets, and official helpdesk chat.
              </p>
            </div>
            <Link href="/knowledge" className="inline-flex min-h-10 items-center justify-center bg-gov-blue px-5 py-2.5 text-sm font-bold text-white hover:bg-gov-navy">
              Open Knowledge Center
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

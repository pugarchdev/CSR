"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
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
import { GisMap } from "@/components/LazyComponents";
import HomeStatsStrip from "@/components/HomeStatsStrip";
import { Card } from "@/components/ui/Card";

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
    gradient: "from-blue-600 to-indigo-700",
  },
  {
    title: "Government Departments & Districts",
    detail: "Pitch a specific development need with district, budget, and location evidence to seek CSR support under the convergence framework.",
    action: "Pitch a Development Need",
    href: "/pitch-development-need",
    icon: Landmark,
    gradient: "from-amber-500 to-orange-600",
  },
  {
    title: "Track a Partnership",
    detail: "Corporates and departments can track the real-time status of any enquiry, pitch, or onboarded project using the tracking ID.",
    action: "Track Status",
    href: "/track",
    icon: ClipboardCheck,
    gradient: "from-emerald-500 to-teal-600",
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

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const cardFadeUp = {
  hidden: { opacity: 0, y: 40, rotateX: 8 },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

const sectionFade = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
};

function Parallax3DSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [4, 0, -4]);

  return (
    <motion.div
      ref={ref}
      style={{ y, rotateX, transformPerspective: 1200 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const resources = [
  { title: "Framework & Policy Information", description: "The State's CSR convergence framework explained simply; benefits to corporates. Marathi & English.", href: "/framework-policy" },
  { title: "Document Library", description: "CSR Rules 2014 & MCA amendments; Schedule VII; State GRs; progress formats; checklists.", href: "/document-library" },
  { title: "Workflow Explainer", description: "Simple visual guide showing exactly how the partnership works, step by step, with timelines.", href: "/workflow" },
  { title: "Success Stories & Case Studies", description: "Completed projects with photos, investment, beneficiaries, corporate name. Builds confidence through proof.", href: "/success-stories" },
  { title: "CSR Summits & Events", description: "Past summit reports and videos; upcoming events; registration links.", href: "/csr-events" },
  { title: "Directory", description: "Contact details of the State CSR Cell, the CSR Relationship Managers, and all District Nodal Officers.", href: "/directory" },
  { title: "Completed Projects Gallery", description: "Permanent, searchable public record of all portal projects — by district, sector, corporate, year.", href: "/completed-projects" },
  { title: "Public Development Needs (Live)", description: "Government pitches approved and made public — open for any corporate to fund.", href: "/public-development-needs" },
  { title: "FAQs, News & Recognition", description: "Common questions; portal updates; CSR awards and recognition of corporate partners.", href: "/faq-news-recognition" },
];

export default function LandingPage() {
  return (
    <div className="bg-slate-50 text-slate-700 min-h-screen font-sans relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute top-20 -left-12 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-float" />
      <div className="absolute bottom-20 -right-12 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-float" style={{ animationDelay: "2.5s" }} />

      <HeroSection />

      <main className="mx-auto flex w-full max-w-[1380px] flex-col gap-10 px-4 pb-16 pt-8 sm:px-6 md:px-8 lg:pt-14">

        {/* ── Workflow Section ── */}
        <Parallax3DSection>
          <motion.div
            variants={sectionFade}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <Card hover={false} tilt={false} className="p-6 sm:p-8">
              <div className="flex flex-col gap-4 border-b border-slate-100/80 pb-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                    State-Led, District-Executed Convergence
                  </span>
                  <h2 className="mt-3 break-words text-2xl font-bold leading-tight text-slate-900 sm:text-3xl tracking-tight">
                    How the partnership works
                  </h2>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-5 py-4 text-xs font-medium leading-relaxed text-slate-500 md:max-w-[400px]">
                  A single State CSR Coordinating Unit routes every corporate to one accountable District Nodal Officer.
                </div>
              </div>

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
                style={{ perspective: "800px" }}
              >
                {workflow.map((step, index) => (
                  <motion.div key={step.title} variants={cardFadeUp} style={{ transformStyle: "preserve-3d" }}>
                    <Card
                      index={index}
                      className="relative p-6 pt-8 bg-white/60 border border-slate-100"
                    >
                      <div className="absolute -top-4 left-6 grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-lg shadow-blue-500/30">
                        {index + 1}
                      </div>
                      <div className="text-blue-600 p-2.5 bg-blue-50/60 rounded-xl inline-block shadow-sm">
                        <step.icon size={22} />
                      </div>
                      <h3 className="mt-4 text-sm font-bold text-slate-900 tracking-tight">{step.title}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-slate-500">{step.detail}</p>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </Card>
          </motion.div>
        </Parallax3DSection>

        {/* ── Enhanced Two-Tile Action Hub ── */}
        <Parallax3DSection>
          <motion.div
            variants={sectionFade}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="grid gap-8 md:grid-cols-2" style={{ perspective: "1000px" }}>
              {/* Tile 1: Partner with Maharashtra */}
              <motion.div
                whileHover={{ y: -8, rotateY: -3, scale: 1.01 }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }}
                className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-gradient-to-br from-white/90 via-slate-50/50 to-blue-50/40 p-8 shadow-glass group"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Decorative absolute background glow */}
                <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl group-hover:bg-blue-500/20 transition-all duration-500" />
                
                <div className="relative z-10 flex flex-col justify-between h-full min-h-[280px]">
                  <div className="flex flex-col gap-5">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 transition-transform duration-300 group-hover:scale-110">
                      <Building2 size={26} />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600">For Corporate Partners</span>
                      <h3 className="mt-2 text-2xl font-extrabold text-slate-900 tracking-tight">Partner with Maharashtra</h3>
                      <p className="mt-4 text-sm leading-relaxed text-slate-500 max-w-lg">
                        Submit a CSR partnership enquiry, browse live government development needs, and track your enquiry through a single point of coordination.
                      </p>
                    </div>
                  </div>
                  <div className="mt-8">
                    <Link
                      href="/partner-with-maharashtra"
                      className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-blue-600 hover:bg-blue-700 px-6 text-sm font-bold text-white shadow-lg shadow-blue-500/10 hover:no-underline transition-all hover:scale-105"
                    >
                      Submit Partnership Enquiry <ArrowRight size={16} className="ml-2" />
                    </Link>
                  </div>
                </div>
              </motion.div>

              {/* Tile 2: Pitch a Development Need */}
              <motion.div
                whileHover={{ y: -8, rotateY: 3, scale: 1.01 }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }}
                className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-gradient-to-br from-white/90 via-slate-50/50 to-amber-50/40 p-8 shadow-glass group"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Decorative absolute background glow */}
                <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl group-hover:bg-amber-500/20 transition-all duration-500" />
                
                <div className="relative z-10 flex flex-col justify-between h-full min-h-[280px]">
                  <div className="flex flex-col gap-5">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/20 transition-transform duration-300 group-hover:scale-110">
                      <Landmark size={26} />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600">For Government Departments</span>
                      <h3 className="mt-2 text-2xl font-extrabold text-slate-900 tracking-tight">Pitch a Development Need</h3>
                      <p className="mt-4 text-sm leading-relaxed text-slate-500 max-w-lg">
                        Pitch a specific development need with district, budget, and location evidence to seek CSR support under the convergence framework.
                      </p>
                    </div>
                  </div>
                  <div className="mt-8">
                    <Link
                      href="/pitch-development-need"
                      className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-amber-500 hover:bg-amber-600 px-6 text-sm font-bold text-white shadow-lg shadow-amber-500/10 hover:no-underline transition-all hover:scale-105"
                    >
                      Pitch Development Need <ArrowRight size={16} className="ml-2" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Quick Track Bar Below */}
            <div className="mt-8 p-6 rounded-2xl border border-slate-200/50 bg-white/70 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-glass">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ClipboardCheck size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Track an existing enquiry or pitch?</h4>
                  <p className="text-xs text-slate-500">Enter your tracking ID to view real-time convergence status.</p>
                </div>
              </div>
              <Link
                href="/track"
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:no-underline transition-colors w-full sm:w-auto"
              >
                Track Status <ArrowRight size={14} className="ml-1.5" />
              </Link>
            </div>
          </motion.div>
        </Parallax3DSection>

        {/* ── Resources Directory ── */}
        <Parallax3DSection>
          <motion.div
            variants={sectionFade}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <Card hover={false} tilt={false} className="p-6 sm:p-8">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                  Public Information Directory
                </span>
                <h2 className="mt-3 break-words text-2xl font-bold leading-tight text-slate-900 sm:text-3xl tracking-tight">
                  MahaCSR Setu Resources
                </h2>
              </div>

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              >
                {resources.map((item, index) => (
                  <motion.div key={item.title} variants={cardFadeUp}>
                    <Link href={item.href} className="hover:no-underline flex">
                      <Card
                        index={index}
                        className="flex items-start gap-4 p-5 bg-white/60 border border-slate-100 hover:border-blue-200/50 w-full group"
                      >
                        <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 shrink-0 mt-1.5 shadow-sm shadow-blue-500/30" />
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 leading-snug group-hover:text-blue-600 transition-colors tracking-tight">{item.title}</h3>
                          <p className="mt-2 text-xs leading-relaxed text-slate-500">{item.description}</p>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </Card>
          </motion.div>
        </Parallax3DSection>

        {/* ── Live Stats ── */}
        <Parallax3DSection>
          <motion.div
            variants={sectionFade}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <Card hover={false} tilt={false} className="p-6 sm:p-8">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                  MahaCSR at a Glance
                </span>
                <p className="mt-2 text-xs font-normal text-slate-400">
                  Live figures drawn only from projects onboarded and certified on the portal.
                </p>
              </div>
              <div className="mt-6">
                <HomeStatsStrip />
              </div>
            </Card>
          </motion.div>
        </Parallax3DSection>

        {/* ── Guidelines & Circulars ── */}
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Parallax3DSection>
            <motion.div
              variants={sectionFade}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              <Card hover={false} tilt={false} className="p-6 sm:p-8 h-full">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                    Framework Principles
                  </span>
                </div>
                <div className="mt-6 flex flex-col gap-3">
                  {recommendations.map((item) => (
                    <motion.div
                      key={item}
                      whileHover={{ x: 6, scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/30 p-4 transition-colors hover:bg-slate-50/60 hover:border-blue-200/40 cursor-default"
                    >
                      <CheckCircle2 className="shrink-0 text-emerald-500" size={18} />
                      <p className="flex-1 text-xs font-medium leading-relaxed text-slate-600">{item}</p>
                      <ArrowRight className="shrink-0 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" size={15} />
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </Parallax3DSection>

          <Parallax3DSection>
            <motion.div
              variants={sectionFade}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              <Card hover={false} tilt={false} className="p-6 sm:p-8 h-full">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                    Circulars & Notices
                  </span>
                  <Link href="/circulars" className="text-xs font-bold text-blue-600 hover:underline">
                    View All
                  </Link>
                </div>
                <div className="mt-5 flex flex-wrap gap-2 border-b border-slate-100 pb-3 text-xs font-bold">
                  <span className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-white shadow-sm shadow-blue-500/20">All</span>
                  <span className="px-3 py-1.5 text-slate-500 hover:text-slate-800 cursor-pointer transition-colors">Policy Notices</span>
                  <span className="px-3 py-1.5 text-slate-500 hover:text-slate-800 cursor-pointer transition-colors">Government Resolutions</span>
                  <span className="px-3 py-1.5 text-slate-500 hover:text-slate-800 cursor-pointer transition-colors">Circulars</span>
                </div>
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100 overflow-hidden">
                  <table className="w-full min-w-[500px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-900 border-b border-slate-100">
                        <th className="px-3 py-3 font-bold">Title</th>
                        <th className="px-3 py-3 font-bold">Category</th>
                        <th className="px-3 py-3 font-bold">Type</th>
                        <th className="px-3 py-3 font-bold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-500">
                      {notices.map(([title, category, type, date]) => (
                        <tr key={title} className="hover:bg-blue-50/30 transition-colors border-b border-slate-100/80">
                          <td className="px-3 py-3.5 font-medium text-slate-700">{title}</td>
                          <td className="px-3 py-3.5">{category}</td>
                          <td className="px-3 py-3.5">{type}</td>
                          <td className="px-3 py-3.5 whitespace-nowrap">{date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          </Parallax3DSection>
        </div>

        {/* ── GIS Map ── */}
        <Parallax3DSection>
          <motion.div
            variants={sectionFade}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <Card hover={false} tilt={false} className="p-6 sm:p-8">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                  District CSR Register
                </span>
                <h2 className="mt-3 break-words text-lg font-bold text-slate-900 tracking-tight">
                  Visualize CSR activity across Maharashtra
                </h2>
              </div>
              <div className="mt-6 rounded-xl overflow-hidden border border-slate-100 shadow-sm bg-white">
                <GisMap />
              </div>
            </Card>
          </motion.div>
        </Parallax3DSection>

        {/* ── Model Pillars ── */}
        <Parallax3DSection>
          <motion.div
            variants={sectionFade}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <Card hover={false} tilt={false} className="p-6 sm:p-8">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                  The Convergence Model
                </span>
                <h2 className="mt-3 text-lg font-bold text-slate-900 tracking-tight">
                  State-Led, District-Executed
                </h2>
              </div>
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="mt-6 grid gap-6 lg:grid-cols-3"
                style={{ perspective: "800px" }}
              >
                {pillars.map((pillar, index) => (
                  <motion.div key={pillar.title} variants={cardFadeUp} style={{ transformStyle: "preserve-3d" }}>
                    <Card
                      index={index}
                      className="p-6 bg-white/60 border border-slate-100"
                    >
                      <div className="flex items-start gap-5">
                        <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
                          <span className="absolute -left-2.5 -top-2.5 grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-[10px] font-bold text-white shadow-lg shadow-blue-500/30">
                            0{index + 1}
                          </span>
                          <pillar.icon size={24} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 tracking-tight">{pillar.title}</h3>
                          <p className="mt-2 text-xs font-normal leading-relaxed text-slate-500">{pillar.detail}</p>
                          <Link href="/knowledge" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline">
                            Learn more <ArrowRight size={13} />
                          </Link>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </Card>
          </motion.div>
        </Parallax3DSection>

        {/* ── Bottom CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card hover={false} tilt={false} className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-48 w-48 bg-blue-500/10 rounded-full filter blur-3xl -mr-12 -mt-12" />
            <div className="absolute bottom-0 left-0 h-48 w-48 bg-amber-500/8 rounded-full filter blur-3xl -ml-12 -mb-12" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-xl flex items-center justify-center shrink-0 border border-white/10">
                  <Headphones className="text-blue-300" size={28} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Need help partnering with Maharashtra or pitching a development need?</h2>
                  <p className="mt-2 max-w-2xl text-xs sm:text-sm font-normal leading-relaxed text-slate-300">
                    Use the knowledge center for the framework guide, the standard MoU template, document checklists, and the official helpdesk.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 shrink-0">
                <Link href="/knowledge" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/20 px-5 text-xs font-bold text-white hover:bg-white/5 hover:no-underline transition-all">
                  Knowledge Center
                </Link>
                <Link href="/contact" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 text-xs font-bold text-white hover:from-amber-600 hover:to-orange-600 hover:no-underline shadow-lg shadow-orange-500/20 transition-all">
                  Contact Helpdesk
                </Link>
              </div>
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

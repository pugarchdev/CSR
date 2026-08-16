"use client";

import { useRef, useState, useEffect } from "react";
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
  Sparkles,
  ExternalLink,
} from "lucide-react";
import HeroSection from "@/components/HeroSection";
import { GisMap } from "@/components/LazyComponents";
import HomeStatsStrip from "@/components/HomeStatsStrip";

const workflow = [
  {
    title: "State-Level Entry & Dialogue",
    detail: "Corporates approach the State CSR Coordinating Unit. An initial dialogue captures sector preference, budget, and geography.",
    icon: Headphones,
    glow: "bg-blue-500/10 text-blue-600 border-blue-200/60",
  },
  {
    title: "Domain-Specific Delegation",
    detail: "The State Unit nominates the relevant district Head of Department as the single point of contact, retaining oversight.",
    icon: Users,
    glow: "bg-purple-500/10 text-purple-600 border-purple-200/60",
  },
  {
    title: "Ground Finalisation & MoU",
    detail: "The District Nodal Officer and corporate align needs to a project blueprint and execute the standard MoU.",
    icon: FileCheck2,
    glow: "bg-amber-500/10 text-amber-600 border-amber-200/60",
  },
  {
    title: "Onboarding & Tracking",
    detail: "The project is onboarded to the portal, tracking physical/financial progress, UCs, and administrative bottlenecks.",
    icon: CheckCircle2,
    glow: "bg-emerald-500/10 text-emerald-600 border-emerald-200/60",
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

/* ── Motion Variants for Section Slide-in from Right & Text Sequence Reveal ── */
const sectionSlideFromRight = {
  hidden: { opacity: 0, x: 80 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

const textRevealSequence = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.2 },
  },
};

const staggerSlideCards = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.25 },
  },
};

const cardSlideFromRight = {
  hidden: { opacity: 0, x: 60, scale: 0.96 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 120, damping: 16 },
  },
};

function Parallax3DSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <motion.div
      ref={ref}
      style={isMobile ? {} : { y }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPageClient() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = cursorRef.current;
    if (!dot) return;
    const handleMouseMove = (e: MouseEvent) => {
      dot.style.transform = `translate(${e.clientX - 6}px, ${e.clientY - 6}px)`;
      dot.style.opacity = "1";
    };
    const handleMouseLeave = () => {
      dot.style.opacity = "0";
    };
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div className="bg-slate-50 text-slate-700 min-h-screen font-sans relative overflow-hidden">
      {/* Ambient glass background glows */}
      <div className="absolute top-20 -left-12 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-float pointer-events-none" />
      <div className="absolute top-1/2 -right-12 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-float pointer-events-none" style={{ animationDelay: "2.5s" }} />

      <HeroSection />

      <main className="mx-auto flex w-full max-w-[1380px] flex-col gap-14 px-4 pb-16 pt-8 sm:px-6 md:px-8 lg:pt-14">

        {/* ── Workflow Section with Slide-from-Right Motion ── */}
        <Parallax3DSection>
          <motion.div
            variants={sectionSlideFromRight}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="flex flex-col gap-6"
          >
            <motion.div variants={textRevealSequence} className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="break-words text-2xl font-black leading-tight text-slate-900 sm:text-3xl tracking-tight">
                  How the partnership works
                </h2>
                <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200/60 px-3 py-1 rounded-full mb-2.5">
                  <Sparkles size={12} className="text-blue-500" /> State-Led, District-Executed Convergence
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={staggerSlideCards}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
            >
              {workflow.map((step, index) => (
                <motion.div key={step.title} variants={cardSlideFromRight}>
                  <div className="liquid-glass-card-light p-6 relative h-full flex flex-col justify-between group rounded-2xl border border-slate-200/90 bg-white/80 backdrop-blur-md shadow-xs hover:shadow-xl transition-all duration-300">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-2xl inline-flex items-center justify-center border shadow-sm ${step.glow} backdrop-blur-md transition-transform duration-300 group-hover:scale-110`}>
                          <step.icon size={22} />
                        </div>
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-[11px] font-black text-white shadow-md shadow-blue-500/25 border border-white/40">
                          Step 0{index + 1}
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 tracking-tight">{step.title}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600 font-medium">{step.detail}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </Parallax3DSection>

        {/* ── Enhanced Two-Tile Action Hub with Photo Accents ── */}
        <Parallax3DSection>
          <motion.div
            variants={sectionSlideFromRight}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            <div className="grid gap-8 md:grid-cols-2">
              {/* Tile 1: Partner with Maharashtra */}
              <motion.div
                variants={cardSlideFromRight}
                whileHover={{ y: -6, scale: 1.01 }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }}
                className="liquid-glass-card-light p-6 md:p-8 relative overflow-hidden group border-blue-200/50 bg-gradient-to-br from-white/95 via-slate-50/95 to-blue-50/30 rounded-3xl border shadow-md hover:shadow-2xl transition-all"
              >
                {/* Photo graphic overlay with smooth gradient fade */}
                <div 
                  className="absolute inset-0 bg-cover bg-right opacity-10 group-hover:opacity-[0.14] transition-opacity duration-500 pointer-events-none rounded-3xl"
                  style={{ backgroundImage: `url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-white/10 pointer-events-none" />
                <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-blue-500/15 blur-3xl group-hover:bg-blue-500/25 transition-all duration-500" />

                <div className="relative z-10 flex flex-col justify-between h-full min-h-[280px]">
                  <div className="flex flex-col gap-5">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 transition-transform duration-300 group-hover:scale-110 border border-white/40">
                      <Building2 size={26} />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">
                        For Corporate Partners
                      </span>
                      <h3 className="mt-3 text-2xl font-black text-slate-900 tracking-tight">Partner with Maharashtra</h3>
                      <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-600 max-w-lg font-medium">
                        Submit a CSR partnership enquiry, browse live government development needs, and track your enquiry through a single point of coordination.
                      </p>
                    </div>
                  </div>
                  <div className="mt-8">
                    <Link
                      href="/partner-with-maharashtra"
                      className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 px-7 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 hover:no-underline transition-all hover:scale-105 border border-white/30"
                    >
                      Submit Partnership Enquiry <ArrowRight size={16} className="ml-2" />
                    </Link>
                  </div>
                </div>
              </motion.div>

              {/* Tile 2: Pitch a Development Need */}
              <motion.div
                variants={cardSlideFromRight}
                whileHover={{ y: -6, scale: 1.01 }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }}
                className="liquid-glass-card-light p-6 md:p-8 relative overflow-hidden group border-amber-200/50 bg-gradient-to-br from-white/95 via-slate-50/95 to-amber-50/30 rounded-3xl border shadow-md hover:shadow-2xl transition-all"
              >
                {/* Photo graphic overlay with smooth gradient fade */}
                <div 
                  className="absolute inset-0 bg-cover bg-right opacity-10 group-hover:opacity-[0.14] transition-opacity duration-500 pointer-events-none rounded-3xl"
                  style={{ backgroundImage: `url('https://images.unsplash.com/photo-1554469384-e58fac16e23a?auto=format&fit=crop&w=800&q=80')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-white/10 pointer-events-none" />
                <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-amber-500/15 blur-3xl group-hover:bg-amber-500/25 transition-all duration-500" />

                <div className="relative z-10 flex flex-col justify-between h-full min-h-[280px]">
                  <div className="flex flex-col gap-5">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 transition-transform duration-300 group-hover:scale-110 border border-white/40">
                      <Landmark size={26} />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
                        For Government Departments
                      </span>
                      <h3 className="mt-3 text-2xl font-black text-slate-900 tracking-tight">Pitch a Development Need</h3>
                      <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-600 max-w-lg font-medium">
                        Pitch a specific development need with district, budget, and location evidence to seek CSR support under the convergence framework.
                      </p>
                    </div>
                  </div>
                  <div className="mt-8">
                    <Link
                      href="/pitch-development-need"
                      className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 px-7 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-amber-500/20 hover:no-underline transition-all hover:scale-105 border border-white/30"
                    >
                      Pitch Development Need <ArrowRight size={16} className="ml-2" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Quick Track Bar Below */}
            <motion.div variants={cardSlideFromRight} className="mt-6 p-6 rounded-3xl liquid-glass-card-light flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-200/80 bg-white/80 backdrop-blur-md shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200/60 shadow-sm">
                  <ClipboardCheck size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">Track an existing enquiry or pitch?</h4>
                  <p className="text-xs text-slate-500 font-medium">Enter your tracking ID to view real-time convergence status.</p>
                </div>
              </div>
              <Link
                href="/track"
                className="liquid-glass-pill-btn inline-flex min-h-10 items-center justify-center px-6 text-xs font-bold text-slate-800 hover:text-blue-600 hover:no-underline w-full sm:w-auto rounded-full border border-slate-200 bg-slate-50"
              >
                Track Status <ArrowRight size={14} className="ml-1.5" />
              </Link>
            </motion.div>
          </motion.div>
        </Parallax3DSection>

        {/* ── Resources Directory with Liquid Glass Cards ── */}
        <Parallax3DSection>
          <motion.div
            variants={sectionSlideFromRight}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="flex flex-col gap-6"
          >
            <motion.div variants={textRevealSequence}>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200/60 px-3 py-1 rounded-full mb-2.5">
                Public Information Directory
              </div>
              <h2 className="break-words text-2xl font-black leading-tight text-slate-900 sm:text-3xl tracking-tight">
                MahaCSR Setu Resources
              </h2>
            </motion.div>

            <motion.div
              variants={staggerSlideCards}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            >
              {resources.map((item) => (
                <motion.div key={item.title} variants={cardSlideFromRight}>
                  <Link href={item.href} className="hover:no-underline flex h-full">
                    <div className="liquid-glass-card-light p-5 rounded-2xl border border-slate-200/90 bg-white/80 backdrop-blur-md flex items-start gap-4 w-full group transition-all hover:shadow-lg hover:border-blue-300">
                      <span className="h-3 w-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shrink-0 mt-1 shadow-sm shadow-blue-500/40 border border-white/60" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-extrabold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors tracking-tight flex items-center justify-between">
                          {item.title}
                          <ExternalLink size={13} className="text-slate-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </h3>
                        <p className="mt-2 text-xs leading-relaxed text-slate-600 font-medium">{item.description}</p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </Parallax3DSection>

        {/* ── Live Stats Section with Animated Count-Up Numbers ── */}
        <Parallax3DSection>
          <motion.div
            variants={sectionSlideFromRight}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="flex flex-col gap-6"
          >
            <motion.div variants={textRevealSequence}>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200/60 px-3 py-1 rounded-full mb-2.5">
                Live Portal Statistics
              </div>
              <h2 className="break-words text-2xl font-black leading-tight text-slate-900 sm:text-3xl tracking-tight">
                MahaCSR at a Glance
              </h2>
              <p className="mt-2 text-xs font-medium text-slate-500">
                Live figures drawn only from projects onboarded and certified on the portal.
              </p>
            </motion.div>
            <div>
              <HomeStatsStrip />
            </div>
          </motion.div>
        </Parallax3DSection>

        {/* ── Guidelines & Circulars ── */}
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr] w-full min-w-0">
          <Parallax3DSection className="w-full min-w-0">
            <motion.div
              variants={sectionSlideFromRight}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="h-full w-full min-w-0"
            >
              <div className="liquid-glass-card-light p-6 sm:p-8 h-full rounded-3xl w-full min-w-0 overflow-hidden border border-slate-200/90 bg-white/80 backdrop-blur-md shadow-sm">
                <div className="flex flex-col gap-1.5">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200/60 px-3 py-1 rounded-full w-fit">
                    Guidelines & Implementation
                  </div>
                  <h3 className="break-words text-xl font-black text-slate-900 tracking-tight mt-1">
                    Framework Principles
                  </h3>
                </div>
                <div className="mt-6 flex flex-col gap-3">
                  {recommendations.map((item) => (
                    <motion.div
                      key={item}
                      whileHover={{ x: 6, scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="flex items-start gap-3.5 rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-md p-4 transition-all hover:bg-white hover:border-blue-300 cursor-default shadow-sm"
                    >
                      <CheckCircle2 className="shrink-0 text-emerald-500 mt-0.5" size={18} />
                      <p className="flex-1 text-xs font-semibold leading-relaxed text-slate-700">{item}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </Parallax3DSection>

          <Parallax3DSection className="w-full min-w-0">
            <motion.div
              variants={sectionSlideFromRight}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="h-full w-full min-w-0"
            >
              <div className="liquid-glass-card-light p-6 sm:p-8 h-full rounded-3xl w-full min-w-0 overflow-hidden border border-slate-200/90 bg-white/80 backdrop-blur-md shadow-sm">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200/60 px-3 py-1 rounded-full">
                      Official Updates
                    </div>
                    <Link href="/circulars" className="text-xs font-extrabold text-blue-600 hover:underline">
                      View All
                    </Link>
                  </div>
                  <h3 className="break-words text-xl font-black text-slate-900 tracking-tight mt-1">
                    Circulars & Notices
                  </h3>
                </div>
                <div className="mt-5 flex flex-wrap gap-2 border-b border-slate-200/60 pb-3 text-xs font-bold">
                  <span className="rounded-full bg-blue-600 px-4 py-1.5 text-white shadow-sm shadow-blue-500/20">All</span>
                  <span className="px-3.5 py-1.5 rounded-full text-slate-600 hover:bg-white hover:text-slate-900 cursor-pointer transition-colors">Policy Notices</span>
                  <span className="px-3.5 py-1.5 rounded-full text-slate-600 hover:bg-white hover:text-slate-900 cursor-pointer transition-colors">Government Resolutions</span>
                </div>
                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-md">
                  <table className="w-full min-w-[500px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100/60 text-slate-900 border-b border-slate-200/80">
                        <th className="px-3.5 py-3 font-extrabold">Title</th>
                        <th className="px-3.5 py-3 font-extrabold">Category</th>
                        <th className="px-3.5 py-3 font-extrabold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-600">
                      {notices.map(([title, category, _type, date]) => (
                        <tr key={title} className="hover:bg-blue-50/40 transition-colors border-b border-slate-100/80">
                          <td className="px-3.5 py-3.5 font-bold text-slate-800">{title}</td>
                          <td className="px-3.5 py-3.5 font-semibold text-blue-600">{category}</td>
                          <td className="px-3.5 py-3.5 whitespace-nowrap font-medium">{date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </Parallax3DSection>
        </div>

        {/* ── GIS Map with Glass Shell ── */}
        <Parallax3DSection>
          <motion.div
            variants={sectionSlideFromRight}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="flex flex-col gap-6"
          >
            <motion.div variants={textRevealSequence}>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200/60 px-3 py-1 rounded-full mb-2.5">
                District CSR Register
              </div>
              <h2 className="break-words text-2xl font-black leading-tight text-slate-900 sm:text-3xl tracking-tight">
                Visualize CSR activity across Maharashtra
              </h2>
            </motion.div>
            <div className="mt-2 rounded-3xl overflow-hidden liquid-glass-card-light p-2 sm:p-3 border border-slate-200 bg-white shadow-sm">
              <GisMap />
            </div>
          </motion.div>
        </Parallax3DSection>

        {/* ── Model Pillars ── */}
        <Parallax3DSection>
          <motion.div
            variants={sectionSlideFromRight}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="flex flex-col gap-6"
          >
            <motion.div variants={textRevealSequence}>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200/60 px-3 py-1 rounded-full mb-2.5">
                The Convergence Model
              </div>
              <h2 className="break-words text-2xl font-black leading-tight text-slate-900 sm:text-3xl tracking-tight">
                State-Led, District-Executed
              </h2>
            </motion.div>
            <motion.div
              variants={staggerSlideCards}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid gap-5 lg:grid-cols-3"
            >
              {pillars.map((pillar, index) => (
                <motion.div key={pillar.title} variants={cardSlideFromRight}>
                  <div className="liquid-glass-card-light p-6 h-full flex flex-col justify-between group rounded-2xl border border-slate-200/90 bg-white/80 backdrop-blur-md shadow-xs hover:shadow-xl transition-all">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-blue-200/80 bg-blue-50 text-blue-600 shadow-sm backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
                          <pillar.icon size={22} />
                        </div>
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200/60 text-[11px] font-black tracking-wider">
                          Pillar 0{index + 1}
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 tracking-tight">{pillar.title}</h3>
                      <p className="mt-2 text-xs font-medium leading-relaxed text-slate-600">{pillar.detail}</p>
                    </div>
                    <Link href="/knowledge" className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline">
                      Learn more <ArrowRight size={13} />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </Parallax3DSection>

        {/* ── Bottom CTA ── */}
        <motion.div
          variants={sectionSlideFromRight}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-8 sm:p-12 rounded-3xl relative overflow-hidden border border-white/10 shadow-2xl">
            <div className="absolute top-0 right-0 h-48 w-48 bg-blue-500/15 rounded-full filter blur-3xl -mr-12 -mt-12 pointer-events-none" />
            <div className="absolute bottom-0 left-0 h-48 w-48 bg-amber-500/10 rounded-full filter blur-3xl -ml-12 -mb-12 pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-xl flex items-center justify-center shrink-0 border border-white/20 shadow-lg">
                  <Headphones className="text-blue-300" size={28} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">Need help partnering with Maharashtra or pitching a development need?</h2>
                  <p className="mt-2 max-w-2xl text-xs sm:text-sm font-medium leading-relaxed text-slate-300">
                    Use the knowledge center for the framework guide, the standard MoU template, document checklists, and the official helpdesk.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 shrink-0">
                <Link href="/knowledge" className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 px-6 text-xs font-bold text-white hover:bg-white/10 hover:no-underline transition-all backdrop-blur-md">
                  Knowledge Center
                </Link>
                <Link href="/contact" className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 text-xs font-black uppercase tracking-wider text-white hover:from-amber-600 hover:to-orange-600 hover:no-underline shadow-lg shadow-orange-500/25 transition-all hover:scale-105 border border-white/20">
                  Contact Helpdesk
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Custom fast cursor follower */}
      {/* <div
        ref={cursorRef}
        className="pointer-events-none fixed left-0 top-0 z-50 w-2 h-2 rounded-full bg-amber-400/70 mix-blend-difference opacity-0"
        style={{ willChange: "transform" }}
      /> */}
    </div>
  );
}

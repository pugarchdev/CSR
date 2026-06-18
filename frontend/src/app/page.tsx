import Link from "next/link";
import { 
  HeartHandshake, Compass, Coins, 
  Building2, Landmark, GraduationCap, Stethoscope, Droplet, Trees, 
  HelpCircle, Star, ShieldAlert, Award, FileText, 
  Bell, Newspaper, Users, ChevronRight
} from "lucide-react";
import dynamic from "next/dynamic";
import HeroSection from "@/components/HeroSection";
import CitizenCounter from "@/components/CitizenCounter";
import FaqAccordion from "@/components/FaqAccordion";

const GisMap = dynamic(() => import("@/components/GisMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[580px] w-full flex items-center justify-center bg-slate-955/40 rounded-3xl border border-slate-800/80">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#1e3a8a] border-t-transparent animate-spin" />
        <span className="text-xs text-slate-400 font-semibold">Initializing digital GIS network...</span>
      </div>
    </div>
  )
});

export default function LandingPage() {
  const faqs = [
    { 
      q: "How does the platform verify NGO compliance?", 
      a: "We audit NGO Darpan registration, CSR-1 registration, 12A/80G tax status, and three years of financial ledger filings before approving organizations for matching and proposal submission." 
    },
    { 
      q: "Is the Maharashtra district mapping based on actual location rules?", 
      a: "Yes, our matching engine tracks projects at the Taluka and District levels, allowing companies to target geographical sectors corresponding to local corporate rules and underdeveloped areas." 
    },
    { 
      q: "How does the milestone escrow funding work?", 
      a: "Funds are released in tranches. NGOs upload milestone evidence (reports, images) directly onto our secure S3 repository, which must be approved by the funding company controller to unlock payment." 
    },
    { 
      q: "Can we generate compliance audit reports for tax filings?", 
      a: "Absolutely. Corporations can download annual board-ready CSR spending summaries in both PDF and Excel formats, detailing project metrics, milestone releases, and beneficiary distributions." 
    }
  ];

  return (
    <div className="bg-slate-955 text-slate-200 min-h-screen">
      
      {/* 1. Official Government Header Ticker */}
      <div className="bg-indigo-700 text-white text-[11px] font-semibold py-2.5 px-6 md:px-12 flex justify-between items-center gap-4 flex-wrap shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f97316] animate-pulse" />
          <span>Government of Maharashtra Official Portal</span>
          <span className="opacity-40">|</span>
          <span>Department of Industries & Social Welfare</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/about" className="text-white hover:underline transition-colors">MCA Section 135 Rules</Link>
          <Link href="/knowledge" className="text-white hover:underline transition-colors">NGO Registration Help</Link>
          <span className="opacity-40">|</span>
          <span className="text-white font-bold">Screen Reader Accessibility</span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-10 max-w-7xl mx-auto flex flex-col gap-24 relative overflow-hidden">
        
        {/* Subtle Background Radial Gradients */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full filter blur-[120px] pointer-events-none" />
        <div className="absolute top-[30vh] right-1/4 w-[400px] h-[400px] bg-orange-600/5 rounded-full filter blur-[100px] pointer-events-none" />

        {/* 2. Hero Section */}
        <HeroSection />

        {/* 3. Live Statistics Banner */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-sm z-10 relative">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
            <div className="flex flex-col gap-1 items-center text-center lg:px-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Sourced CSR Funds</span>
              <span className="text-3xl font-heading font-extrabold text-indigo-700">₹18.40 Cr</span>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1">Verified Audit Trail</span>
            </div>
            <div className="flex flex-col gap-1 items-center text-center pt-6 lg:pt-0 lg:px-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registered & Audited NGOs</span>
              <span className="text-3xl font-heading font-extrabold text-indigo-700">145 NGOs</span>
              <span className="text-[10px] text-slate-300 font-semibold mt-1">Darpan & CSR-1 Verified</span>
            </div>
            <div className="flex flex-col gap-1 items-center text-center pt-6 lg:pt-0 lg:px-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Approved Projects</span>
              <span className="text-3xl font-heading font-extrabold text-slate-50">420 Projects</span>
              <span className="text-[10px] text-slate-300 font-semibold mt-1">Across 36 Districts</span>
            </div>
            <div className="flex flex-col gap-1 items-center text-center pt-6 lg:pt-0 lg:px-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Beneficiaries Served</span>
              <span className="text-3xl font-heading font-extrabold text-[#f97316]">2.4 Lakhs+</span>
              <span className="text-[10px] text-[#f97316]/90 font-semibold mt-1">Rural & Tribal Focus</span>
            </div>
          </div>
        </section>

        {/* 4. Leadership Messages Column */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 z-10 relative">
          
          {/* CM Message */}
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row gap-6 items-start shadow-sm">
            <div className="w-24 h-24 rounded-2xl bg-slate-955 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10" />
              <div className="font-heading font-extrabold text-slate-300 text-[10px] text-center z-20 p-1 leading-tight">
                Hon'ble Chief Minister
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-heading font-bold text-lg text-slate-50">Shri Eknath Shinde</h3>
              <span className="text-[10px] font-bold text-[#f97316] uppercase tracking-wider">Hon'ble Chief Minister, Maharashtra</span>
              <p className="text-slate-300 text-xs leading-relaxed italic">
                "Maharashtra leads India's industrial growth. Through MahaCSR, we are unlocking corporate social responsibility as a driver for equitable rural development. I invite all corporates to invest in our tribal talukas and Zilla Parishad schools."
              </p>
            </div>
          </div>

          {/* Commissioner Message */}
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row gap-6 items-start shadow-sm">
            <div className="w-24 h-24 rounded-2xl bg-slate-955 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10" />
              <div className="font-heading font-extrabold text-slate-300 text-[10px] text-center z-20 p-1 leading-tight">
                CSR Commissioner
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-heading font-bold text-lg text-slate-50">Shri Pravin Darade, IAS</h3>
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">CSR Commissioner & Secretary</span>
              <p className="text-slate-300 text-xs leading-relaxed italic">
                "Our mission is transparency and efficiency under Section 135. By verifying NGO compliance status and tracking milestones in an escrow system, we provide a trustworthy marketplace for corporate social capital."
              </p>
            </div>
          </div>

        </section>

        {/* 5. Live News, Events, and Circulars Notices Feed */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 z-10 relative">
          
          {/* Government Circulars */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col gap-4 shadow-sm">
            <h3 className="font-heading font-bold text-base text-slate-50 flex items-center gap-2 pb-2 border-b border-slate-800">
              <FileText size={18} className="text-[#f97316]" />
              Official Circulars
            </h3>
            <div className="flex flex-col gap-4">
              {[
                { title: "State Resolution: Tribal CSR Funding Mandates 2026", date: "June 12, 2026", url: "/about" },
                { title: "Circular 102/2026: Updated 12A/80G Audit Filing Guidelines", date: "May 28, 2026", url: "/about" },
                { title: "State CSR Steering Committee Appointment Rules", date: "May 10, 2026", url: "/about" }
              ].map((c, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <Link href={c.url} className="text-xs font-bold text-slate-100 hover:text-indigo-700 transition-colors leading-snug">
                    {c.title}
                  </Link>
                  <span className="text-[10px] text-slate-400">{c.date}</span>
                </div>
              ))}
            </div>
            <Link href="/about" className="text-[10px] font-bold text-indigo-700 hover:underline flex items-center gap-1 mt-2">
              View All State Resolutions <ChevronRight size={12} />
            </Link>
          </div>

          {/* News & Updates */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col gap-4 shadow-sm">
            <h3 className="font-heading font-bold text-base text-slate-50 flex items-center gap-2 pb-2 border-b border-slate-800">
              <Newspaper size={18} className="text-indigo-700" />
              Latest News
            </h3>
            <div className="flex flex-col gap-4">
              {[
                { title: "MahaCSR matches ₹5 Cr for Gadchiroli check dams", desc: "Corporate-NGO collaboration achieves water safety in 12 villages.", date: "June 14, 2026" },
                { title: "Over 80 new NGOs verified on platform", desc: "NITI Aayog Darpan mapping completed for new cohort.", date: "June 05, 2026" }
              ].map((n, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-50 leading-snug">{n.title}</span>
                  <p className="text-[11px] text-slate-305 leading-relaxed">{n.desc}</p>
                  <span className="text-[9px] text-slate-400 mt-0.5">{n.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Announcements */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col gap-4 shadow-sm">
            <h3 className="font-heading font-bold text-base text-slate-50 flex items-center gap-2 pb-2 border-b border-slate-800">
              <Bell size={18} className="text-emerald-600" />
              Platform Announcements
            </h3>
            <div className="flex flex-col gap-3">
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex flex-col gap-1">
                <span className="text-xs font-bold text-indigo-700">CSR-1 Validation Drive</span>
                <span className="text-[10px] text-slate-305">Online validation portal open for self-service matching.</span>
              </div>
              <div className="p-3 bg-slate-955 border border-slate-800 rounded-xl flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-50">Scheduled Server Maintenance</span>
                <span className="text-[10px] text-slate-400">MahaCSR portal will be offline on Sunday 02:00 AM to 04:00 AM IST.</span>
              </div>
            </div>
          </div>

        </section>

        {/* 6. Live Citizen Beneficiary Counter Banner */}
        <CitizenCounter />

        {/* 7. Focus Sectors Grid */}
        <section className="flex flex-col gap-12 relative z-10">
          <div className="text-center max-w-2xl mx-auto flex flex-col gap-3">
            <h2 className="font-heading font-bold text-3xl text-slate-50">Schedule VII Focus Sectors</h2>
            <p className="text-slate-300 text-sm">Deploying capital across specific developmental activities under the Companies Act 2013 rules.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Education & Smart Literacy", desc: "Zilla Parishad smart labs, training materials, and rural library networks.", icon: GraduationCap, sdg: "SDG 4" },
              { title: "Healthcare & Mobile Clinics", desc: "Tribal area diagnostics, sanitation facilities, and clean drinking water.", icon: Stethoscope, sdg: "SDG 3" },
              { title: "Water Harvesting & Dams", desc: "District watershed conservation, check dams, and taluka borewell recharge.", icon: Droplet, sdg: "SDG 6" },
              { title: "Environment & Solar Grids", desc: "Community afforestation drives, solar microgrids, and green waste management.", icon: Trees, sdg: "SDG 13" },
              { title: "Self-Help Groups & Seed Funds", desc: "Vocational skills, financial literacy, and startup microloans for women.", icon: HeartHandshake, sdg: "SDG 5" },
              { title: "Skill Development Centers", desc: "Taluka skill initiatives, IT education, and youth job assistance.", icon: Compass, sdg: "SDG 8" }
            ].map((cat, i) => (
              <div key={i} className="bg-slate-900 p-6 rounded-3xl flex flex-col gap-5 justify-between border border-slate-800 hover:border-[#f97316]/40 hover:shadow-md transition-all duration-300">
                <div className="flex flex-col gap-4">
                  <div className="bg-[#fff7ed] w-11 h-11 rounded-xl flex items-center justify-center text-[#f97316] border border-[#ffedd5]">
                    <cat.icon size={20} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-heading font-bold text-base text-slate-50">{cat.title}</h3>
                    <p className="text-slate-300 text-xs leading-relaxed line-clamp-3">{cat.desc}</p>
                  </div>
                </div>
                <span className="text-[10px] text-[#f97316] font-bold bg-[#fff7ed] border border-[#ffedd5] w-fit px-2.5 py-0.5 rounded-full">{cat.sdg}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 8. Regional GIS Heatmap Monitor */}
        <section className="flex flex-col gap-12 relative z-10">
          <div className="text-center max-w-2xl mx-auto flex flex-col gap-3">
            <h2 className="font-heading font-bold text-3xl text-slate-50">Territorial GIS Heatmap Monitor</h2>
            <p className="text-slate-300 text-sm">Aggregated CSR spending audit logs and proposal density map across 36 districts of Maharashtra.</p>
          </div>
          
          <div className="w-full bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-sm">
            <GisMap />
          </div>
        </section>

        {/* 9. Verified Corporate & NGO Flows */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          
          {/* Corporate Flow */}
          <div className="bg-slate-900 p-8 rounded-3xl flex flex-col gap-6 relative overflow-hidden shadow-sm border border-slate-800">
            <h3 className="font-heading font-bold text-xl text-indigo-700 flex items-center gap-2">
              <Building2 size={20} className="text-indigo-700" />
              Corporate CSR Flow
            </h3>
            <div className="flex flex-col gap-4">
              {[
                { step: "01", title: "Declare CSR Budget", desc: "Register your corporate credentials, configure budget parameters, and choose focus SDGs." },
                { step: "02", title: "Review Matching Scorecards", desc: "Browse pre-filtered proposals scored by regional priority index and NGO compliance rating." },
                { step: "03", title: "Approve Escrow Milestones", desc: "Track verified reports and photographic evidence to unlock funding tranches in real time." }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                  <span className="font-heading font-extrabold text-2xl text-blue-500/25 leading-none">{item.step}</span>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-slate-100">{item.title}</span>
                    <span className="text-xs text-slate-350 leading-relaxed mt-0.5">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* NGO Flow */}
          <div className="bg-slate-900 p-8 rounded-3xl flex flex-col gap-6 relative overflow-hidden shadow-sm border border-slate-800">
            <h3 className="font-heading font-bold text-xl text-[#f97316] flex items-center gap-2">
              <Landmark size={20} className="text-[#f97316]" />
              NGO Proposals Flow
            </h3>
            <div className="flex flex-col gap-4">
              {[
                { step: "01", title: "Submit Regulatory Cards", desc: "Provide NITI Aayog Darpan ID, MCA CSR-1 certificate, and 12A/80G status." },
                { step: "02", title: "Publish Proposals", desc: "Outline project details, budget requirements, timeline milestones, and beneficiary impact." },
                { step: "03", title: "Request Milestone Tranches", desc: "Upload completed project documentation to request the release of escrow capital." }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                  <span className="font-heading font-extrabold text-2xl text-[#f97316]/25 leading-none">{item.step}</span>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-slate-100">{item.title}</span>
                    <span className="text-xs text-slate-300 leading-relaxed mt-0.5">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 10. Verified Success Cases */}
        <section className="flex flex-col gap-12 relative z-10">
          <div className="text-center max-w-2xl mx-auto flex flex-col gap-3">
            <h2 className="font-heading font-bold text-3xl text-slate-50">Impact Success Stories</h2>
            <p className="text-slate-300 text-sm">Verifiable social developments completed by partner NGOs in Maharashtra.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                title: "Gadchiroli Groundwater Restoration",
                ngo: "Sahyadri Eco Foundation",
                partner: "Tata Projects",
                desc: "Completed 3 check dams and planted 5,000 saplings in Aheri, raising the ground water table by 1.8 meters across 4 villages.",
                impact: "12,000+ Villagers Served"
              },
              {
                title: "Smart Zilla Parishad Classrooms",
                ngo: "Vidarbha Seva Samiti",
                partner: "Reliance Foundation",
                desc: "Equipped 15 rural schools in Nagpur district with interactive boards, offline digital syllabus contents, and solar power packs.",
                impact: "4,500+ Students Engaged"
              }
            ].map((story, i) => (
              <div key={i} className="bg-slate-900 p-8 rounded-3xl flex flex-col gap-6 justify-between border border-slate-800 shadow-sm">
                <div className="flex flex-col gap-4">
                  <span className="text-xs text-[#f97316] font-extrabold flex items-center gap-1">
                    <Star size={12} className="fill-[#f97316]" /> Verifiable Success Case
                  </span>
                  <h3 className="font-heading font-bold text-xl text-slate-50 tracking-tight">{story.title}</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">{story.desc}</p>
                </div>

                <div className="flex flex-col gap-4 mt-2">
                  <div className="w-full h-px bg-slate-800" />
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                    <span>NGO: {story.ngo} • Partner: {story.partner}</span>
                    <span className="text-[#f97316] bg-[#fff7ed] border border-[#ffedd5] px-3 py-1 rounded-full font-bold">{story.impact}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 11. FAQ Accordion Module */}
        <FaqAccordion faqs={faqs} />

        {/* 12. Corporate Collaborators Logos Banner */}
        <section className="flex flex-col gap-6 text-center border-t border-slate-800 pt-8 relative z-10">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Empowering Corporate Collaborations With</span>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center justify-items-center opacity-80">
            {["Tata Projects", "Reliance Foundation", "Mahindra CSR", "Infosys Foundation", "L&T Care"].map((name, i) => (
              <span key={i} className="font-heading font-extrabold text-base text-slate-200 tracking-tight">{name}</span>
            ))}
          </div>
        </section>

      </div>

    </div>
  );
}

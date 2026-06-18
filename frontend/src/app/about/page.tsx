"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ShieldCheck, Info, FileText, CheckCircle2, BookOpen, 
  HelpCircle, Scale, Download, Calendar, ExternalLink 
} from "lucide-react";

type TabType = "mandate" | "rules" | "schedule" | "circulars";

export default function AboutPage({ params }: { params?: { tab?: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("mandate");

  useEffect(() => {
    if (params?.tab) {
      setActiveTab(params.tab as TabType);
    }
  }, [params?.tab]);

  const circulars = [
    { id: "cir-1", title: "GR-2026/05: Allocation of CSR funds to aspirational talukas in Maharashtra", date: "June 12, 2026", size: "1.4 MB", type: "PDF" },
    { id: "cir-2", title: "Directive 43: Exemption limits & audit guidelines for self-funded CSR trusts", date: "May 28, 2026", size: "850 KB", type: "PDF" },
    { id: "cir-3", title: "Notification 12/2026: Mandatory S3 file evidence upload for escrow releases", date: "May 10, 2026", size: "2.1 MB", type: "PDF" },
    { id: "cir-4", title: "Sample Board-room CSR Report Template & Excel ledger sheets", date: "April 15, 2026", size: "3.2 MB", type: "ZIP" }
  ];

  return (
    <div className="px-6 md:px-12 py-12 max-w-5xl mx-auto flex flex-col gap-8 bg-slate-950 text-slate-100 min-h-screen">
      
      {/* Header Banner */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[#f97316] font-bold text-xs uppercase tracking-wider">
          <BookOpen size={14} /> Institutional Registry
        </div>
        <h1 className="font-heading font-extrabold text-4xl tracking-tight text-slate-100">
          About MahaCSR Portal
        </h1>
        <p className="text-slate-400 text-base max-w-2xl leading-relaxed">
          Access compliance standards, statutory mandates, Schedule VII guidelines, and official Government of Maharashtra circulars.
        </p>
      </div>

      {/* Tabs Switcher Navigation */}
      <div className="flex border-b border-slate-800 gap-1 overflow-x-auto pb-px">
        {[
          { id: "mandate", label: "MahaCSR Mandate", icon: Info },
          { id: "rules", label: "CSR Rules & Act", icon: Scale },
          { id: "schedule", label: "Schedule VII Sectors", icon: CheckCircle2 },
          { id: "circulars", label: "Official Circulars", icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                router.push(`/about/${tab.id}`);
              }}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap ${
                isActive 
                  ? "border-[#f97316] text-[#f97316] bg-slate-900/50" 
                  : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-900/20"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="mt-4">
        
        {/* Tab 1: The Mandate */}
        {activeTab === "mandate" && (
          <motion.div 
            className="flex flex-col gap-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="glass-panel p-8 rounded-3xl flex flex-col gap-6 border border-slate-800">
              <h2 className="font-heading font-bold text-xl text-slate-100 flex items-center gap-2">
                <Info className="text-[#f97316]" size={20} />
                Portal Objective
              </h2>
              <p className="text-slate-350 text-sm leading-relaxed">
                MahaCSR (Government of Maharashtra CSR Collaboration Platform) serves as the official single-source directory and matching platform for corporate social responsibility initiatives across the state.
              </p>
              <p className="text-slate-350 text-sm leading-relaxed">
                Established under the guidance of the Department of Industries and the CSR Commissioner of Maharashtra, the portal facilitates transparent, audited funding matches between corporations and verified grassroot non-governmental organizations (NGOs) to promote regional development.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card p-6 rounded-2xl flex flex-col gap-4">
                <h3 className="font-heading font-bold text-base text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="text-indigo-650" size={18} />
                  NGO Compliance Checks
                </h3>
                <ul className="flex flex-col gap-2.5 text-xs text-slate-400 font-medium">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-[#f97316] mt-0.5 shrink-0" />
                    <span>Valid **CSR-1 Number** registered with the MCA.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-[#f97316] mt-0.5 shrink-0" />
                    <span>Verified **NGO Darpan ID** from NITI Aayog.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-[#f97316] mt-0.5 shrink-0" />
                    <span>Valid **12A and 80G** tax exemption certifications.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-[#f97316] mt-0.5 shrink-0" />
                    <span>Three years of audited financial balance sheets.</span>
                  </li>
                </ul>
              </div>

              <div className="glass-card p-6 rounded-2xl flex flex-col gap-4">
                <h3 className="font-heading font-bold text-base text-slate-100 flex items-center gap-2">
                  <FileText className="text-indigo-650" size={18} />
                  Corporate Spend Audits
                </h3>
                <ul className="flex flex-col gap-2.5 text-xs text-slate-400 font-medium">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-[#f97316] mt-0.5 shrink-0" />
                    <span>Direct tracking of milestone completion evidence.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-[#f97316] mt-0.5 shrink-0" />
                    <span>Generation of annual board-room ready compliance PDFs.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-[#f97316] mt-0.5 shrink-0" />
                    <span>Historical project matching and impact validation logs.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-[#f97316] mt-0.5 shrink-0" />
                    <span>GIS mapping of district-wise capital distributions.</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 2: Section 135 Rules */}
        {activeTab === "rules" && (
          <motion.div 
            className="flex flex-col gap-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="glass-panel p-8 rounded-3xl flex flex-col gap-6 border border-slate-800">
              <h2 className="font-heading font-bold text-xl text-slate-100 flex items-center gap-2">
                <Scale className="text-[#f97316]" size={20} />
                Companies Act, 2013 - Section 135
              </h2>
              <div className="flex flex-col gap-4 text-slate-350 text-sm leading-relaxed">
                <p>
                  Every company having a **net worth of ₹500 crore or more**, or **turnover of ₹1,000 crore or more**, or a **net profit of ₹5 crore or more** during any financial year must constitute a Corporate Social Responsibility Committee of the Board.
                </p>
                <p>
                  The Board of every such company shall ensure that the company spends, in every financial year, **at least 2% of the average net profits** of the company made during the three immediately preceding financial years, in pursuance of its Corporate Social Responsibility Policy.
                </p>
                <p>
                  The platform helps automate this matching by validating budget thresholds and ensuring compliance documentation matches current Ministry of Corporate Affairs (MCA) registries.
                </p>
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl flex flex-col gap-3">
              <h3 className="font-heading font-bold text-base text-slate-100">Regional Spending Guidelines</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Under the central rules, companies are encouraged to give preference to the **local areas** and areas around where they operate. For Maharashtra, this portal maps operations directly to local districts and aspirational talukas, allowing corporates to target underdeveloped regions such as Gadchiroli, Washim, and Nandurbar.
              </p>
            </div>
          </motion.div>
        )}

        {/* Tab 3: Schedule VII Focus Sectors */}
        {activeTab === "schedule" && (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {[
              { index: "I", title: "Eradicating Hunger & Poverty", desc: "Initiatives targeting malnutrition, sanitation, and clean drinking water systems in rural communities.", sdg: "SDG 1 & 2" },
              { index: "II", title: "Promoting Education & Literacy", desc: "Zilla Parishad smart-classrooms, vocational teacher training, and science lab installations.", sdg: "SDG 4" },
              { index: "III", title: "Gender Equality & Empowerment", desc: "Vocational training for women, self-help group seed funding, and safety hostel upgrades.", sdg: "SDG 5" },
              { index: "IV", title: "Environmental Sustainability", desc: "Taluka afforestation, solar-grid systems for public clinics, and watershed rainwater harvesting projects.", sdg: "SDG 13" },
              { index: "V", title: "Protection of Heritage & Arts", desc: "Conservation of ancient forts, support for traditional handloom weavers, and public libraries.", sdg: "SDG 11" },
              { index: "VI", title: "Veterans & Armed Forces Support", desc: "Resettlement benefits for ex-servicemen, widows, and their dependents in rural areas.", sdg: "SDG 16" }
            ].map((sec, idx) => (
              <div key={idx} className="glass-card p-6 rounded-2xl border border-slate-800/80 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-[#f97316] font-bold bg-[#fff7ed] px-2.5 py-0.5 rounded-full">Clause {sec.index}</span>
                    <span className="text-[10px] text-indigo-750 font-bold">{sec.sdg}</span>
                  </div>
                  <h4 className="font-heading font-bold text-base text-slate-100 leading-tight">{sec.title}</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">{sec.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Tab 4: Government Circulars & Resolutions */}
        {activeTab === "circulars" && (
          <motion.div 
            className="flex flex-col gap-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col gap-4">
              <h3 className="font-heading font-bold text-base text-slate-100 flex items-center gap-2">
                <Download className="text-[#f97316]" size={18} />
                Download Center
              </h3>
              <p className="text-slate-400 text-xs">
                Download verified government resolutions (GR), compliance guidelines, and report templates published by the Secretary to the Government of Maharashtra.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {circulars.map((cir) => (
                <div 
                  key={cir.id} 
                  className="glass-card p-4 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-[#f97316]/30 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-[#f97316] shrink-0 mt-0.5">
                      <FileText size={18} />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-slate-200 leading-snug hover:text-violet-400 cursor-pointer">
                        {cir.title}
                      </span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-2">
                        <Calendar size={10} /> Published: {cir.date} • Size: {cir.size}
                      </span>
                    </div>
                  </div>

                  <button className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 shrink-0 transition-colors shadow-sm">
                    <Download size={14} /> Download ({cir.type})
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </div>

    </div>
  );
}

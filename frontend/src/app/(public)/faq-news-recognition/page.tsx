"use client";

import { useState, useMemo } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import {
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  Search,
  X,
  ChevronDown,
  Building2,
  Users,
  FileText,
  Sparkles,
  BookOpen
} from "lucide-react";
import faqsData from "./faqs_data.json";

type FAQCategory = "General FAQs" | "Corporate" | "Implementing Agency" | "FAQs on CSR Provisions";

export default function FaqNewsRecognitionPage() {
  const [activeTab, setActiveTab] = useState<FAQCategory>("General FAQs");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const tabs: { id: FAQCategory; label: string; icon: any }[] = [
    { id: "General FAQs", label: "General & Portal", icon: HelpCircle },
    { id: "Corporate", label: "Corporate CSR", icon: Building2 },
    { id: "Implementing Agency", label: "Implementing Agency", icon: Users },
    { id: "FAQs on CSR Provisions", label: "Section 135 Rules", icon: FileText },
  ];

  const toggleExpand = (cat: FAQCategory, index: number) => {
    const key = `${cat}-${index}`;
    setExpandedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const totalFaqCount = useMemo(() => {
    return Object.values(faqsData).reduce((acc, list) => acc + (Array.isArray(list) ? list.length : 0), 0);
  }, []);

  const filteredFaqs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return (faqsData[activeTab] || []).map((faq: any, index: number) => ({
        ...faq,
        originalIndex: index,
        category: activeTab,
      }));
    }

    const results: { q: string; a: string; originalIndex: number; category: FAQCategory }[] = [];
    (Object.keys(faqsData) as FAQCategory[]).forEach((cat) => {
      const list = (faqsData as any)[cat] || [];
      list.forEach((faq: any, index: number) => {
        if (
          faq.q.toLowerCase().includes(query) ||
          faq.a.toLowerCase().includes(query)
        ) {
          results.push({
            ...faq,
            originalIndex: index,
            category: cat,
          });
        }
      });
    });

    return results;
  }, [activeTab, searchQuery]);

  const displayResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return { [activeTab]: filteredFaqs };
    }

    const groups: Record<string, typeof filteredFaqs> = {};
    filteredFaqs.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredFaqs, searchQuery, activeTab]);

  return (
    <GovPortalLayout showSidebar={false}>
      <div className="w-full min-w-0 max-w-7xl mx-auto px-4 py-8 sm:px-6 md:py-10 text-slate-900 space-y-6">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              <span>Public Portal</span>
              <span>/</span>
              <span className="text-blue-600 font-extrabold">Knowledge &amp; Support</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              MahaCSR Frequently Asked Questions
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Official clarifications on portal registration, corporate CSR matching, implementing agency onboarding, Section 135 legal mandates, and statutory Schedule VII applicability.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200">
              <ShieldCheck size={14} className="text-blue-600" />
              <span>Government of Maharashtra</span>
            </span>
          </div>
        </div>

        {/* 4 Metric Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Clarifications</span>
              <HelpCircle size={16} className="text-blue-600" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900">{totalFaqCount} Items</p>
            <p className="text-[11px] text-slate-500 font-medium">All Portal Domains</p>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Corporate Desk</span>
              <Building2 size={16} className="text-emerald-600" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-900">
              {((faqsData as any)["Corporate"] || []).length} FAQs
            </p>
            <p className="text-[11px] text-slate-500 font-medium">CIN, 2% Rules &amp; MoUs</p>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Agency Onboarding</span>
              <Users size={16} className="text-purple-600" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {((faqsData as any)["Implementing Agency"] || []).length} FAQs
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Darpan &amp; CSR-1 Rules</p>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Statutory Provisions</span>
              <FileText size={16} className="text-amber-600" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {((faqsData as any)["FAQs on CSR Provisions"] || []).length} FAQs
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Schedule VII Eligibility</p>
          </div>
        </div>

        {/* Compact Search & Category Tab Bar */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-3.5 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 w-full min-w-[240px]">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search across questions, answers, keywords (e.g. 2% net profit, CSR-1, Darpan, RFP, UC)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setExpandedItems({});
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-8 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id && !searchQuery.trim();

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSearchQuery("");
                      setExpandedItems({});
                    }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <Icon size={13} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-semibold text-slate-500">
            <div>
              {searchQuery.trim() ? (
                <span>Found <strong className="text-slate-900">{filteredFaqs.length}</strong> matching questions across all categories</span>
              ) : (
                <span>Showing <strong className="text-slate-900">{filteredFaqs.length}</strong> questions under <strong className="text-slate-900">{activeTab}</strong></span>
              )}
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>

        {/* FAQs Accordion List */}
        <div className="space-y-4">
          {Object.keys(displayResults).map((catName) => {
            const catFaqs = displayResults[catName];
            if (catFaqs.length === 0) return null;

            return (
              <div key={catName} className="space-y-3">
                {searchQuery.trim() && (
                  <div className="flex items-center gap-2 pt-2">
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      {catName}
                    </h3>
                  </div>
                )}

                <div className="space-y-2.5">
                  {catFaqs.map((faq: any) => {
                    const key = `${faq.category}-${faq.originalIndex}`;
                    const isExpanded = !!expandedItems[key];

                    return (
                      <div
                        key={key}
                        className={`rounded-3xl border transition-all duration-200 overflow-hidden bg-white shadow-2xs ${
                          isExpanded
                            ? "border-blue-300 ring-2 ring-blue-500/10"
                            : "border-slate-200/90 hover:border-slate-300 hover:shadow-xs"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleExpand(faq.category, faq.originalIndex)}
                          className="w-full text-left p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer group"
                        >
                          <div className="space-y-1 pr-2">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-extrabold uppercase mb-1">
                              {faq.category}
                            </span>
                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                              {faq.q}
                            </h4>
                          </div>

                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                              isExpanded
                                ? "bg-blue-600 text-white rotate-180"
                                : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                            }`}
                          >
                            <ChevronDown size={15} />
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 border-t border-slate-100 text-xs text-slate-600 font-medium leading-relaxed bg-slate-50/50 animate-fadeIn">
                            <div className="pt-3 prose prose-slate max-w-none text-xs leading-relaxed">
                              {faq.a}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredFaqs.length === 0 && (
            <div className="rounded-3xl border border-slate-200/90 bg-white p-12 text-center shadow-xs space-y-2">
              <HelpCircle className="mx-auto text-slate-300 mb-2" size={44} />
              <h3 className="text-sm font-extrabold text-slate-800">No Clarifications Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                No FAQs match your search query. Try searching with different keywords or browse by category.
              </p>
            </div>
          )}
        </div>

      </div>
    </GovPortalLayout>
  );
}

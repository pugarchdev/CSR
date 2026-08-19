"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  ArrowRight,
  Sparkles,
  Building2,
  FolderKanban,
  FileText,
  Users,
  ShieldAlert,
  Compass,
  History,
  Sliders,
  Clock,
  Mail,
  PieChart,
  HelpCircle,
  MessageSquare,
  FileCheck2,
  Camera,
  AlertTriangle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchItem {
  id: string;
  title: string;
  subtitle?: string;
  snippet?: string;
  category: "navigation" | "proposals" | "organizations" | "pitches" | "enquiries" | "users" | "issues";
  badge?: string;
  url: string;
  iconType?: string;
  keywords?: string[];
}

// Built-in Platform Navigation Index for instant 0ms responses with keyword synonyms
const PLATFORM_PAGES: SearchItem[] = [
  {
    id: "nav-dashboard",
    title: "Executive Dashboard",
    subtitle: "State-level CSR overview, financial milestones, and key metrics",
    category: "navigation",
    url: "/dashboard",
    iconType: "dashboard",
    badge: "Core",
    keywords: ["home", "kpi", "summary", "expenditure", "budget", "stats", "overview"]
  },
  {
    id: "nav-user-management",
    title: "Official User Directory",
    subtitle: "Provision platform accounts, manage roles, credentials, and invitations",
    category: "navigation",
    url: "/admin/user-management",
    iconType: "users",
    badge: "Admin",
    keywords: ["users", "accounts", "officers", "password", "invite", "collector", "dno", "rm", "admin"]
  },
  {
    id: "nav-access-control",
    title: "Access Control & Roles",
    subtitle: "RBAC security policies, department roles, and granular permissions",
    category: "navigation",
    url: "/admin/access-control",
    iconType: "shield",
    badge: "Security",
    keywords: ["rbac", "permissions", "roles", "privileges", "security", "authorization", "matrix"]
  },
  {
    id: "nav-onboarding-approvals",
    title: "Onboarding Approvals",
    subtitle: "Review and approve government entity & corporate registration requests",
    category: "navigation",
    url: "/admin/onboarding-approvals",
    iconType: "file-check",
    badge: "Workflow",
    keywords: ["onboarding", "approval", "verify", "head", "joint secretary", "js", "pending", "vetting"]
  },
  {
    id: "nav-sla-config",
    title: "SLA & Escalation Matrices",
    subtitle: "Configure turnaround time thresholds, breach notifications, and escalation rules",
    category: "navigation",
    url: "/admin/sla-config",
    iconType: "clock",
    badge: "Admin",
    keywords: ["sla", "turnaround", "deadline", "escalation", "timer", "breach", "matrix", "config"]
  },
  {
    id: "nav-dno-verification",
    title: "DNO Verification Queue",
    subtitle: "District Nodal Officer ground verification and vetting portal",
    category: "navigation",
    url: "/admin/dno-verification",
    iconType: "shield",
    badge: "Verification",
    keywords: ["dno", "district", "nodal", "collectorate", "ground inspection", "verification"]
  },
  {
    id: "nav-convergence-projects",
    title: "Convergence Projects",
    subtitle: "Active joint initiatives between government departments and CSR partners",
    category: "navigation",
    url: "/convergence-projects",
    iconType: "folder",
    badge: "Projects",
    keywords: ["projects", "convergence", "initiatives", "work", "scheme", "joint", "mou"]
  },
  {
    id: "nav-pitches",
    title: "Government Pitches & Proposals",
    subtitle: "Departmental project proposals awaiting corporate CSR matching",
    category: "navigation",
    url: "/pitches",
    iconType: "file-text",
    badge: "Pitches",
    keywords: ["pitches", "proposals", "requirements", "department", "funding", "csr need"]
  },
  {
    id: "nav-enquiries",
    title: "Corporate CSR Enquiries",
    subtitle: "Corporate intent submissions, CSR requirements, and partner allocations",
    category: "navigation",
    url: "/enquiries",
    iconType: "mail",
    badge: "Corporate",
    keywords: ["enquiries", "corporate", "leads", "intent", "company", "donation", "grant"]
  },
  {
    id: "nav-agencies",
    title: "Implementing Agencies & NGOs",
    subtitle: "Verified directory of grassroots partners, trusts, and execution agencies",
    category: "navigation",
    url: "/agencies",
    iconType: "building",
    badge: "NGO",
    keywords: ["agencies", "ngo", "trust", "society", "grassroots", "nonprofit", "ngo darpan"]
  },
  {
    id: "nav-companies",
    title: "Corporate Companies Directory",
    subtitle: "CSR foundations, public/private enterprises, and funding organizations",
    category: "navigation",
    url: "/companies",
    iconType: "building",
    badge: "Corporate",
    keywords: ["companies", "corporates", "enterprises", "mca21", "cin", "industry", "partners"]
  },
  {
    id: "nav-analytics",
    title: "Statewide CSR Analytics",
    subtitle: "Sectoral expenditure, district coverage heatmaps, and impact reporting",
    category: "navigation",
    url: "/analytics",
    iconType: "chart",
    badge: "Analytics",
    keywords: ["analytics", "charts", "trends", "heatmaps", "district stats", "csr spend"]
  },
  {
    id: "nav-field-visits",
    title: "Field Visits & Inspections",
    subtitle: "On-site progress inspections, geo-tagged audits, and officer observations",
    category: "navigation",
    url: "/field-visits",
    iconType: "camera",
    badge: "Ground",
    keywords: ["field visits", "inspections", "audits", "photos", "geo tag", "ground verification"]
  },
  {
    id: "nav-evidence",
    title: "Evidence & Documentation",
    subtitle: "Photo proofs, milestone sign-offs, and compliance documentation",
    category: "navigation",
    url: "/evidence",
    iconType: "camera",
    badge: "Audits",
    keywords: ["evidence", "proof", "photos", "documents", "certificates", "uc", "compliance"]
  },
  {
    id: "nav-grievances",
    title: "Grievances & Issue Escalations",
    subtitle: "Stakeholder complaints, bottleneck resolution, and JS dispute tracking",
    category: "navigation",
    url: "/grievances",
    iconType: "shield-alert",
    badge: "Resolution",
    keywords: ["grievance", "complaint", "issue", "dispute", "redressal", "bottleneck", "ticket"]
  },
  {
    id: "nav-chat",
    title: "Chat & Communications",
    subtitle: "Secure messaging with relationship managers, departments, and partners",
    category: "navigation",
    url: "/chat",
    iconType: "chat",
    badge: "Messaging",
    keywords: ["chat", "messages", "inbox", "conversation", "communication", "channel"]
  },
  {
    id: "nav-helpdesk",
    title: "Helpdesk & Inquiries",
    subtitle: "Technical support tickets and platform guidance for officers",
    category: "navigation",
    url: "/helpdesk",
    iconType: "help",
    badge: "Support",
    keywords: ["helpdesk", "support", "help", "query", "ticket", "assistance", "guide"]
  },
  {
    id: "nav-audit-logs",
    title: "Security Audit Logs",
    subtitle: "Immutable activity trail, login history, and configuration changelog",
    category: "navigation",
    url: "/audit-logs",
    iconType: "shield",
    badge: "Security",
    keywords: ["audit", "logs", "activity", "trail", "history", "security", "event"]
  }
];

const CATEGORIES = [
  { id: "all", label: "All Results" },
  { id: "navigation", label: "Pages & Tools" },
  { id: "proposals", label: "Proposals & Pitches" },
  { id: "organizations", label: "NGOs & Companies" },
  { id: "enquiries", label: "CSR Enquiries" },
  { id: "users", label: "Users & Officers" },
  { id: "issues", label: "Issues & Helpdesk" }
] as const;

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [apiResults, setApiResults] = useState<SearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const clientCacheRef = useRef<Map<string, SearchItem[]>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("mahacsr_recent_searches");
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, 5));
      }
    } catch {
      // Ignore
    }
  }, []);

  const saveRecentSearch = (searchTerm: string) => {
    const term = searchTerm.trim();
    if (!term) return;
    try {
      const updated = [term, ...recentSearches.filter((s) => s.toLowerCase() !== term.toLowerCase())].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("mahacsr_recent_searches", JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem("mahacsr_recent_searches");
    } catch {
      // Ignore
    }
  };

  // Focus input immediately on open
  useEffect(() => {
    if (isOpen) {
      setActiveCategory("all");
      inputRef.current?.focus();
      inputRef.current?.select();
    } else {
      setQuery("");
      setApiResults([]);
      setSelectedIndex(0);
      setActiveCategory("all");
    }
  }, [isOpen]);

  // High-Speed Instant Debounced Search with Client In-Memory Cache & In-Flight Abort
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setApiResults([]);
      setIsLoading(false);
      return;
    }

    const cacheKey = trimmed.toLowerCase();

    // 1. Instant 0ms memory cache hit
    if (clientCacheRef.current.has(cacheKey)) {
      setApiResults(clientCacheRef.current.get(cacheKey)!);
      setIsLoading(false);
      return;
    }

    // 2. Abort previous in-flight request to eliminate network queuing
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await apiFetch<{
          success: boolean;
          data: { results: SearchItem[]; total: number };
        }>(`/search/global?q=${encodeURIComponent(trimmed)}&limit=12`, {
          signal: controller.signal,
        });

        let results: SearchItem[] = [];
        if (data?.success && Array.isArray(data.data?.results)) {
          results = data.data.results;
        } else if (Array.isArray((data as any)?.results)) {
          results = (data as any).results;
        }

        clientCacheRef.current.set(cacheKey, results);
        setApiResults(results);
      } catch (err: any) {
        if (err?.name !== "AbortError" && !err?.message?.includes("aborted")) {
          console.error("Search fetch error:", err);
        }
      } finally {
        setIsLoading(false);
      }
    }, 90); // 90ms ultra-fast debounce

    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  // Synchronous Instant (0ms) Platform Navigation Match
  const filteredNavigation = useMemo(() => {
    if (!query.trim()) {
      return PLATFORM_PAGES.slice(0, 6);
    }
    const q = query.toLowerCase().trim();
    return PLATFORM_PAGES.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.subtitle?.toLowerCase().includes(q) ||
        p.badge?.toLowerCase().includes(q) ||
        p.keywords?.some((k) => k.toLowerCase().includes(q))
    );
  }, [query]);

  // Combined Results Filtered by Active Category
  const displayedResults = useMemo(() => {
    const combined: SearchItem[] = [];

    if (activeCategory === "all" || activeCategory === "navigation") {
      combined.push(...filteredNavigation);
    }

    apiResults.forEach((item) => {
      if (activeCategory === "all") {
        combined.push(item);
      } else if (activeCategory === "proposals" && (item.category === "proposals" || item.category === "pitches")) {
        combined.push(item);
      } else if (activeCategory === "organizations" && item.category === "organizations") {
        combined.push(item);
      } else if (activeCategory === "enquiries" && item.category === "enquiries") {
        combined.push(item);
      } else if (activeCategory === "users" && item.category === "users") {
        combined.push(item);
      } else if (activeCategory === "issues" && item.category === "issues") {
        combined.push(item);
      }
    });

    return combined;
  }, [filteredNavigation, apiResults, activeCategory]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [displayedResults.length, activeCategory]);

  const handleSelectResult = useCallback(
    (item: SearchItem) => {
      if (query.trim()) {
        saveRecentSearch(query.trim());
      }
      onClose();
      router.push(item.url);
    },
    [query, router, onClose]
  );

  // Keyboard navigation inside modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (displayedResults.length > 0 ? (prev + 1) % displayedResults.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          displayedResults.length > 0 ? (prev - 1 + displayedResults.length) % displayedResults.length : 0
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (displayedResults[selectedIndex]) {
          handleSelectResult(displayedResults[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, displayedResults, selectedIndex, handleSelectResult, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (resultsContainerRef.current) {
      const activeEl = resultsContainerRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  const renderIcon = (type?: string, category?: string) => {
    if (type === "dashboard") return <Sliders size={16} className="text-blue-600" />;
    if (type === "users" || category === "users") return <Users size={16} className="text-purple-600" />;
    if (type === "shield") return <ShieldAlert size={16} className="text-emerald-600" />;
    if (type === "shield-alert" || category === "issues") return <AlertTriangle size={16} className="text-rose-600" />;
    if (type === "file-check") return <FileCheck2 size={16} className="text-amber-600" />;
    if (type === "clock") return <Clock size={16} className="text-orange-600" />;
    if (type === "folder" || category === "proposals") return <FolderKanban size={16} className="text-blue-600" />;
    if (type === "file-text" || category === "pitches") return <FileText size={16} className="text-indigo-600" />;
    if (type === "mail" || category === "enquiries") return <Mail size={16} className="text-teal-600" />;
    if (type === "building" || category === "organizations") return <Building2 size={16} className="text-sky-600" />;
    if (type === "chart") return <PieChart size={16} className="text-cyan-600" />;
    if (type === "camera") return <Camera size={16} className="text-amber-600" />;
    if (type === "chat") return <MessageSquare size={16} className="text-indigo-600" />;
    if (type === "help") return <HelpCircle size={16} className="text-slate-600" />;
    return <Compass size={16} className="text-blue-600" />;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-16 sm:pt-24 px-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -6 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden z-10 flex flex-col max-h-[82vh] transform-gpu"
        >
          {/* Top Search Input Bar */}
          <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3 bg-white">
            <Search size={20} className="text-blue-600 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search proposals, descriptions, NGOs, companies, users, or platform tools..."
              className="flex-1 bg-transparent text-slate-900 placeholder:text-slate-400 text-sm sm:text-base font-medium focus:outline-none"
            />
            {isLoading ? (
              <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin shrink-0" />
            ) : query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
              >
                <X size={16} />
              </button>
            ) : null}
            <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md select-none">
              <span>ESC</span>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50/70 border-b border-slate-100 overflow-x-auto scrollbar-hide text-xs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap text-[11px] cursor-pointer ${
                  activeCategory === cat.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/70"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Results List */}
          <div ref={resultsContainerRef} className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100/60 max-h-[50vh]">
            {/* When Query is Empty — Show Recent Searches & Quick Shortcuts */}
            {!query.trim() && (
              <div className="p-2 space-y-4">
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <History size={12} />
                        Recent Searches
                      </span>
                      <button
                        type="button"
                        onClick={clearRecentSearches}
                        className="text-[10px] text-slate-400 hover:text-red-600 transition-colors lowercase"
                      >
                        clear
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 px-2">
                      {recentSearches.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => setQuery(term)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <History size={11} className="text-slate-400" />
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles size={12} className="text-amber-500" />
                    Quick Platform Shortcuts
                  </div>
                </div>
              </div>
            )}

            {/* Results Items */}
            {displayedResults.length > 0 ? (
              displayedResults.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={`${item.category}-${item.id}-${idx}`}
                    data-index={idx}
                    onClick={() => handleSelectResult(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`group flex flex-col p-3 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-50/90 text-blue-950 border border-blue-200/80 shadow-xs"
                        : "hover:bg-slate-50 text-slate-800 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between min-w-0">
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? "bg-white text-blue-700 shadow-xs" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {renderIcon(item.iconType, item.category)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                              {item.title}
                            </span>
                            {item.badge && (
                              <span
                                className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md shrink-0 border ${
                                  isSelected
                                    ? "bg-blue-100 text-blue-800 border-blue-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                          {item.subtitle && (
                            <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded transition-opacity ${
                            isSelected ? "opacity-100 text-blue-700 bg-blue-100/60" : "opacity-0"
                          }`}
                        >
                          Jump to
                        </span>
                        <ArrowRight
                          size={14}
                          className={`transition-transform duration-150 ${
                            isSelected ? "text-blue-600 translate-x-0.5" : "text-slate-300"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Matched text snippet preview */}
                    {item.snippet && (
                      <div className="mt-2 ml-12 text-[11px] text-slate-600 bg-white/80 rounded-lg px-2.5 py-1 border border-slate-200/60 font-sans italic line-clamp-2">
                        &ldquo;{item.snippet}&rdquo;
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                  <Search size={22} />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No matching results found</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  We couldn&apos;t find anything matching &quot;{query}&quot;. Try searching for any word across proposals, project descriptions, NGO names, corporate entities, districts, or platform tools.
                </p>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-4 py-2.5 bg-slate-50/90 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 select-none gap-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-600 shadow-2xs">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-600 shadow-2xs">↓</kbd>
                <span>navigate</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-600 shadow-2xs">↵</kbd>
                <span>open</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-600 shadow-2xs">esc</kbd>
                <span>close</span>
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
              <span>MahaCSR Global Index</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

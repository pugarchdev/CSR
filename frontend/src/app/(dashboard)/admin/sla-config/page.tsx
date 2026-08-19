"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Clock,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  RotateCcw,
  Save,
  Building2,
  ShieldAlert,
  AlertCircle,
  Hourglass,
  MapPin,
  Users,
  HelpCircle,
  Scale,
  MessageSquare,
  Plus,
  Trash2,
  Search,
  SlidersHorizontal,
  ArrowRight,
  CalendarDays,
  Layers,
  Activity,
  FileCheck,
  X,
  AlertTriangle,
  Minus,
  LucideIcon,
} from "lucide-react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { StandardPageHeader } from "@/components/layout/StandardPageHeader";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";
import GovButton from "@/components/gov/GovButton";
import AccessDenied from "@/components/gov/AccessDenied";
import { apiFetch } from "@/lib/api";
import { isAdmin } from "@/lib/roleAccess";
import { useAuthStore } from "@/store/authStore";

type SlaValues = Record<string, number>;
type SlaResponse = { config: SlaValues; defaults: SlaValues; holidays?: string[] };

interface SlaStageMeta {
  title: string;
  category: "intake" | "escalation" | "field" | "grievance";
  description: string;
  icon: LucideIcon;
  colorTheme: "blue" | "purple" | "emerald" | "amber" | "rose" | "cyan";
}

const STAGE_METADATA: Record<string, SlaStageMeta> = {
  RM_RESPONSE: {
    title: "Relationship Manager First Response",
    category: "intake",
    description: "Statutory window for Relationship Manager to conduct first touch on submitted CSR proposals.",
    icon: Clock,
    colorTheme: "blue",
  },
  FEASIBILITY_REVIEW: {
    title: "Feasibility Review Window",
    category: "intake",
    description: "Technical, legal, and financial feasibility vetting before submission to the Secretariat.",
    icon: FileCheck,
    colorTheme: "blue",
  },
  GOVERNMENT_PITCH_VERIFICATION: {
    title: "Govt Pitch Verification Window",
    category: "intake",
    description: "Verification timeline for government department-sponsored project pitches.",
    icon: Building2,
    colorTheme: "blue",
  },
  JS_DECISION: {
    title: "Joint Secretary Decision Window",
    category: "escalation",
    description: "Standard timeline for Joint Secretary review, sanction order issuance, or approval.",
    icon: ShieldCheck,
    colorTheme: "purple",
  },
  JS_ESCALATED_RESPONSE: {
    title: "JS Escalated Response Window",
    category: "escalation",
    description: "Expedited turnaround timeline when a proposal is flagged as escalated to JS.",
    icon: AlertCircle,
    colorTheme: "amber",
  },
  SECRETARY_ESCALATION: {
    title: "Principal Secretary Escalation",
    category: "escalation",
    description: "Apex intervention window for critical escalations requiring Principal Secretary sanction.",
    icon: ShieldAlert,
    colorTheme: "rose",
  },
  GRACE_PERIOD_BEFORE_ESCALATION: {
    title: "Pre-Escalation Grace Period",
    category: "escalation",
    description: "Buffer period before automated escalation triggers and notifies higher authorities.",
    icon: Hourglass,
    colorTheme: "amber",
  },
  NODAL_ASSIGNMENT: {
    title: "District Nodal Officer Assignment",
    category: "field",
    description: "Timeline for assigning verified projects to the respective District Nodal Officer (DNO).",
    icon: MapPin,
    colorTheme: "emerald",
  },
  FIELD_OFFICER_ASSIGNMENT: {
    title: "Field Officer Allocation",
    category: "field",
    description: "Ground-level allocation timeline for assigning site inspection and monitoring officers.",
    icon: Users,
    colorTheme: "emerald",
  },
  GRIEVANCE_LEVEL_1: {
    title: "Level 1 Grievance Redressal",
    category: "grievance",
    description: "Statutory resolution window for citizen and NGO frontline complaints.",
    icon: HelpCircle,
    colorTheme: "amber",
  },
  GRIEVANCE_LEVEL_2: {
    title: "Level 2 Grievance Escalation",
    category: "grievance",
    description: "Appellate authority dispute resolution window for unaddressed L1 grievances.",
    icon: Scale,
    colorTheme: "rose",
  },
  STATIC_HELPDESK: {
    title: "Helpdesk Query Redressal",
    category: "grievance",
    description: "General portal technical assistance, query ticketing, and user support turnaround.",
    icon: MessageSquare,
    colorTheme: "cyan",
  },
};

const CATEGORIES = [
  { id: "all", label: "All Stages", icon: Layers },
  { id: "intake", label: "Application & Intake", icon: FileCheck },
  { id: "escalation", label: "Secretariat & Escalation", icon: ShieldAlert },
  { id: "field", label: "Field Operations", icon: MapPin },
  { id: "grievance", label: "Grievance & Helpdesk", icon: HelpCircle },
  { id: "holidays", label: "Holiday Exclusions", icon: CalendarDays },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

const POPULAR_MAHARASHTRA_HOLIDAYS = [
  { name: "Republic Day", date: `${new Date().getFullYear()}-01-26` },
  { name: "Chhatrapati Shivaji Maharaj Jayanti", date: `${new Date().getFullYear()}-02-19` },
  { name: "Dr. Ambedkar Jayanti", date: `${new Date().getFullYear()}-04-14` },
  { name: "Maharashtra Day", date: `${new Date().getFullYear()}-05-01` },
  { name: "Independence Day", date: `${new Date().getFullYear()}-08-15` },
  { name: "Ganesh Chaturthi", date: `${new Date().getFullYear()}-09-07` },
  { name: "Gandhi Jayanti", date: `${new Date().getFullYear()}-10-02` },
  { name: "Diwali / Laxmi Pujan", date: `${new Date().getFullYear()}-11-01` },
  { name: "Christmas", date: `${new Date().getFullYear()}-12-25` },
];

export default function SlaConfigurationPage() {
  const [values, setValues] = useState<SlaValues>({});
  const [defaults, setDefaults] = useState<SlaValues>({});
  const [holidays, setHolidays] = useState<string[]>([]);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyModified, setShowOnlyModified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const { hasPermission, isAdmin: storeIsAdmin } = useAuthStore();
  const canAccess =
    storeIsAdmin ||
    hasPermission("page:sla-config:view") ||
    hasPermission("sla:configure") ||
    hasPermission("role:configure") ||
    isAdmin();

  useEffect(() => {
    apiFetch<SlaResponse>("/admin/sla/config")
      .then((response) => {
        setValues(response.config || {});
        setDefaults(response.defaults || {});
        setHolidays(Array.isArray(response.holidays) ? response.holidays : []);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load SLA configuration"))
      .finally(() => setLoading(false));
  }, []);

  // Compute modified count
  const modifiedCount = useMemo(() => {
    return Object.keys(values).reduce((count, key) => {
      return count + (values[key] !== defaults[key] ? 1 : 0);
    }, 0);
  }, [values, defaults]);

  // Filter stages based on tab and search
  const filteredStages = useMemo(() => {
    const allKeys = Object.keys(values);
    return allKeys.filter((key) => {
      const meta = STAGE_METADATA[key] || {
        title: key.replaceAll("_", " "),
        category: "intake",
        description: "",
      };

      if (selectedCategory !== "all" && selectedCategory !== "holidays" && meta.category !== selectedCategory) {
        return false;
      }

      if (showOnlyModified && values[key] === defaults[key]) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesKey = key.toLowerCase().includes(q);
        const matchesTitle = meta.title.toLowerCase().includes(q);
        const matchesDesc = meta.description.toLowerCase().includes(q);
        return matchesKey || matchesTitle || matchesDesc;
      }

      return true;
    });
  }, [values, defaults, selectedCategory, searchQuery, showOnlyModified]);

  // Calculate total standard pipeline turnaround
  const standardWorkflowDays = useMemo(() => {
    const rm = values.RM_RESPONSE ?? 5;
    const feasibility = values.FEASIBILITY_REVIEW ?? 12;
    const js = values.JS_DECISION ?? 7;
    const nodal = values.NODAL_ASSIGNMENT ?? 2;
    const field = values.FIELD_OFFICER_ASSIGNMENT ?? 3;
    return rm + feasibility + js + nodal + field;
  }, [values]);

  const updateStageValue = (stage: string, newVal: number) => {
    const clamped = Math.max(1, Math.min(365, isNaN(newVal) ? 1 : newVal));
    setValues((prev) => ({ ...prev, [stage]: clamped }));
    setMessage("");
  };

  const handleAddHoliday = (dateToAdd: string) => {
    if (!dateToAdd) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateToAdd)) {
      setError("Holiday date must be in YYYY-MM-DD format.");
      return;
    }
    if (holidays.includes(dateToAdd)) {
      setMessage(`Holiday ${dateToAdd} is already added.`);
      return;
    }
    setHolidays((prev) => [...prev, dateToAdd].sort());
    setNewHolidayDate("");
    setMessage("");
    setError("");
  };

  const handleRemoveHoliday = (dateToRemove: string) => {
    setHolidays((prev) => prev.filter((d) => d !== dateToRemove));
  };

  const resetAllToDefaults = () => {
    setValues({ ...defaults });
    setMessage("Reset all stages to platform statutory baselines. Click 'Save' to apply.");
  };

  const resetStageToDefault = (stage: string) => {
    if (defaults[stage] !== undefined) {
      setValues((prev) => ({ ...prev, [stage]: defaults[stage] }));
    }
  };

  const save = async (event?: FormEvent) => {
    if (event) event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await apiFetch<{ config: SlaValues; holidays?: string[] }>("/admin/sla/config", {
        method: "PUT",
        body: JSON.stringify({
          updates: values,
          holidays: holidays,
        }),
      });
      setValues(response.config || values);
      if (response.holidays) setHolidays(response.holidays);
      setMessage("SLA configuration and statutory calendar successfully saved.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to save SLA configuration");
    } finally {
      setSaving(false);
    }
  };

  if (!canAccess) {
    return <AccessDenied requiredRoles={["Super Admin", "Administrator"]} />;
  }

  return (
    <GovPortalLayout userRole="SUPER_ADMIN">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 text-slate-900">
        {/* Header */}
        <StandardPageHeader
          title="SLA & Escalation Engine"
          category="Admin / SLA Configuration"
          description="Configure statutory turnaround timelines (in working days) across coordination stages and citizen grievance redressal."
        />

        {/* 4-Column Summary KPI Cards */}
        <StatCardGroup columns={4}>
          <StatCard
            label="RM Response Window"
            value={loading ? "…" : `${values.RM_RESPONSE ?? 5} Days`}
            icon={Clock}
            colorTheme="blue"
            sublabel="Intake & first touch"
            index={0}
          />
          <StatCard
            label="JS Decision Window"
            value={loading ? "…" : `${values.JS_DECISION ?? 7} Days`}
            icon={ShieldCheck}
            colorTheme="purple"
            sublabel="Secretariat sanction"
            index={1}
          />
          <StatCard
            label="District Assignment"
            value={loading ? "…" : `${values.NODAL_ASSIGNMENT ?? 2} Days`}
            icon={CheckCircle2}
            colorTheme="emerald"
            sublabel="Field nodal allocation"
            index={2}
          />
          <StatCard
            label="L1 Grievance Redressal"
            value={loading ? "…" : `${values.GRIEVANCE_LEVEL_1 ?? 15} Days`}
            icon={Calendar}
            colorTheme="amber"
            sublabel="Citizen & NGO disputes"
            index={3}
          />
        </StatCardGroup>

        {/* Workflow Lifecycle Pipeline Bar */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 text-white shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30">
                <Activity size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tracking-tight text-white">Standard CSR Project Lifecycle Turnaround</span>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                    Statutory Compliant
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Total end-to-end baseline from submission to ground officer allocation:{" "}
                  <strong className="text-amber-300">{loading ? "…" : `${standardWorkflowDays} Working Days`}</strong>
                </p>
              </div>
            </div>

            {/* Stepper badges */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="rounded-lg bg-white/10 px-2.5 py-1 text-slate-200 backdrop-blur-sm">
                1. RM Touch: <strong className="text-white">{values.RM_RESPONSE ?? 5}d</strong>
              </span>
              <ArrowRight size={12} className="text-slate-400" />
              <span className="rounded-lg bg-white/10 px-2.5 py-1 text-slate-200 backdrop-blur-sm">
                2. Feasibility: <strong className="text-white">{values.FEASIBILITY_REVIEW ?? 12}d</strong>
              </span>
              <ArrowRight size={12} className="text-slate-400" />
              <span className="rounded-lg bg-white/10 px-2.5 py-1 text-slate-200 backdrop-blur-sm">
                3. JS Sanction: <strong className="text-white">{values.JS_DECISION ?? 7}d</strong>
              </span>
              <ArrowRight size={12} className="text-slate-400" />
              <span className="rounded-lg bg-white/10 px-2.5 py-1 text-slate-200 backdrop-blur-sm">
                4. DNO Nodal: <strong className="text-white">{values.NODAL_ASSIGNMENT ?? 2}d</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col gap-5">
          {/* Category Tabs & Search Toolbar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm md:flex-row md:items-center md:justify-between">
            {/* Scrollable Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.id;
                let count = 0;
                if (cat.id === "all") count = Object.keys(values).length;
                else if (cat.id === "holidays") count = holidays.length;
                else {
                  count = Object.keys(values).filter(
                    (k) => (STAGE_METADATA[k]?.category || "intake") === cat.id
                  ).length;
                }

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon size={14} />
                    <span>{cat.label}</span>
                    <span
                      className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Filter / Search */}
            {selectedCategory !== "holidays" && (
              <div className="flex items-center gap-2">
                <div className="relative flex-1 md:w-56">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search SLA rules…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowOnlyModified((v) => !v)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    showOnlyModified
                      ? "border-amber-300 bg-amber-50 text-amber-900"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                  title="Show only modified settings"
                >
                  <SlidersHorizontal size={13} />
                  <span>Modified {modifiedCount > 0 ? `(${modifiedCount})` : ""}</span>
                </button>
              </div>
            )}
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 shadow-sm animate-in fade-in">
              <AlertTriangle size={16} className="shrink-0 text-red-600" />
              <div className="flex-1">{error}</div>
              <button onClick={() => setError("")} className="text-red-400 hover:text-red-700">
                <X size={14} />
              </button>
            </div>
          )}
          {message && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 shadow-sm animate-in fade-in">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              <div className="flex-1">{message}</div>
              <button onClick={() => setMessage("")} className="text-emerald-400 hover:text-emerald-800">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Tab Content: Holiday Exclusions or SLA Grid */}
          {selectedCategory === "holidays" ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-2 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <CalendarDays className="text-blue-600" size={20} />
                  <span>Maharashtra Public Holidays & Statutory Exclusions</span>
                </div>
                <p className="text-xs text-slate-500">
                  Configured state holidays and standard weekends (Saturdays & Sundays) do not consume SLA working hours. The
                  engine automatically rolls deadlines over to the subsequent official government business day.
                </p>
              </div>

              {/* Add New Holiday Control */}
              <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">Add Holiday Exclusion</h4>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-1 min-w-[200px] flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-600">Select Date (YYYY-MM-DD)</label>
                    <input
                      type="date"
                      value={newHolidayDate}
                      onChange={(e) => setNewHolidayDate(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-end">
                    <GovButton
                      type="button"
                      disabled={!newHolidayDate}
                      onClick={() => handleAddHoliday(newHolidayDate)}
                      className="h-[38px]"
                    >
                      <Plus size={14} className="mr-1.5 inline" />
                      Add Date
                    </GovButton>
                  </div>
                </div>

                {/* Popular Maharashtra Holidays Quick Chips */}
                <div className="mt-4 border-t border-slate-200/60 pt-3">
                  <span className="text-[11px] font-semibold text-slate-500">Quick-Add Common State Holidays:</span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {POPULAR_MAHARASHTRA_HOLIDAYS.map((holiday) => {
                      const alreadyAdded = holidays.includes(holiday.date);
                      return (
                        <button
                          key={holiday.date}
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => handleAddHoliday(holiday.date)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                            alreadyAdded
                              ? "bg-slate-200/70 text-slate-400 cursor-not-allowed line-through"
                              : "bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                          }`}
                        >
                          <Plus size={10} />
                          <span>{holiday.name}</span>
                          <span className="text-[10px] text-slate-400">({holiday.date})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Active Holidays List */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Active Configured Exclusions ({holidays.length})
                  </h4>
                  {holidays.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setHolidays([])}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Clear All Holidays
                    </button>
                  )}
                </div>

                {holidays.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
                    <CalendarDays className="mx-auto mb-2 text-slate-300" size={32} />
                    <p className="text-xs font-medium text-slate-500">No specific public holidays configured.</p>
                    <p className="text-[11px] text-slate-400">SLA clock will only exclude standard Saturdays and Sundays.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {holidays.map((dateStr) => {
                      const dateObj = new Date(dateStr);
                      const dayName = isNaN(dateObj.getTime())
                        ? ""
                        : new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Kolkata" }).format(dateObj);
                      const formatted = isNaN(dateObj.getTime())
                        ? dateStr
                        : new Intl.DateTimeFormat("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            timeZone: "Asia/Kolkata",
                          }).format(dateObj);

                      return (
                        <div
                          key={dateStr}
                          className="group flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 transition-all hover:border-slate-300 hover:bg-white"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                              <Calendar size={14} />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800">{formatted}</div>
                              <div className="text-[10px] font-medium text-slate-400">
                                {dayName} • {dateStr}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveHoliday(dateStr)}
                            className="rounded-lg p-1 text-slate-400 opacity-80 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                            title="Remove holiday"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* SLA Stages Grid */
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              {loading ? (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  <p className="text-xs font-semibold text-slate-500">Loading authoritative SLA parameters…</p>
                </div>
              ) : filteredStages.length === 0 ? (
                <div className="py-16 text-center">
                  <HelpCircle className="mx-auto mb-2 text-slate-300" size={32} />
                  <p className="text-xs font-medium text-slate-600">No SLA parameters match your filter.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("all");
                      setSearchQuery("");
                      setShowOnlyModified(false);
                    }}
                    className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStages.map((stage) => {
                    const meta = STAGE_METADATA[stage] || {
                      title: stage.replaceAll("_", " "),
                      category: "intake",
                      description: "Configurable turnaround timeline for this stage.",
                      icon: Clock,
                      colorTheme: "blue",
                    };
                    const Icon = meta.icon;
                    const currentValue = values[stage] ?? 0;
                    const defaultValue = defaults[stage] ?? currentValue;
                    const isModified = currentValue !== defaultValue;
                    const diff = currentValue - defaultValue;

                    const colorStyles = {
                      blue: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-500/20" },
                      purple: { bg: "bg-purple-50", text: "text-purple-700", ring: "ring-purple-500/20" },
                      emerald: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-500/20" },
                      amber: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-500/20" },
                      rose: { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-500/20" },
                      cyan: { bg: "bg-cyan-50", text: "text-cyan-700", ring: "ring-cyan-500/20" },
                    }[meta.colorTheme] || { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-500/20" };

                    return (
                      <div
                        key={stage}
                        className={`group relative flex flex-col justify-between rounded-2xl border p-4.5 transition-all hover:shadow-md ${
                          isModified
                            ? "border-amber-300/80 bg-amber-50/20 shadow-sm"
                            : "border-slate-200/80 bg-slate-50/30 hover:border-slate-300 hover:bg-white"
                        }`}
                      >
                        {/* Card Header */}
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${colorStyles.bg} ${colorStyles.text} ring-1 ${colorStyles.ring}`}
                              >
                                <Icon size={16} />
                              </div>
                              <div>
                                <h3 className="text-xs font-bold leading-snug text-slate-900 line-clamp-1" title={meta.title}>
                                  {meta.title}
                                </h3>
                                <span className="font-mono text-[10px] font-medium text-slate-400">{stage}</span>
                              </div>
                            </div>

                            {/* Status Tag */}
                            {isModified ? (
                              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                {diff > 0 ? `+${diff}d` : `${diff}d`}
                              </span>
                            ) : (
                              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                Default
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          <p className="mt-2.5 text-[11px] leading-relaxed text-slate-500 line-clamp-2" title={meta.description}>
                            {meta.description}
                          </p>
                        </div>

                        {/* Interactive Stepper Control */}
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            {/* Stepper Buttons */}
                            <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-xs p-0.5">
                              <button
                                type="button"
                                disabled={currentValue <= 1}
                                onClick={() => updateStageValue(stage, currentValue - 1)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent"
                                title="Decrease by 1 day"
                              >
                                <Minus size={13} />
                              </button>

                              <div className="flex items-center px-2">
                                <input
                                  type="number"
                                  min={1}
                                  max={365}
                                  value={currentValue || ""}
                                  onChange={(e) => updateStageValue(stage, parseInt(e.target.value, 10))}
                                  className="w-10 text-center font-mono text-sm font-bold text-slate-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-[11px] font-semibold text-slate-400">days</span>
                              </div>

                              <button
                                type="button"
                                disabled={currentValue >= 365}
                                onClick={() => updateStageValue(stage, currentValue + 1)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent"
                                title="Increase by 1 day"
                              >
                                <Plus size={13} />
                              </button>
                            </div>

                            {/* Reset or Baseline Hint */}
                            <div className="text-right">
                              {isModified ? (
                                <button
                                  type="button"
                                  onClick={() => resetStageToDefault(stage)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-amber-100/60 px-2 py-1 text-[10px] font-bold text-amber-900 transition-colors hover:bg-amber-200"
                                  title={`Revert to baseline default (${defaultValue} days)`}
                                >
                                  <RotateCcw size={10} />
                                  <span>Reset ({defaultValue}d)</span>
                                </button>
                              ) : (
                                <span className="text-[10px] font-medium text-slate-400">
                                  Baseline: <strong className="text-slate-600">{defaultValue}d</strong>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sticky Bottom Action Toolbar */}
          <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-lg backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <SlidersHorizontal size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {modifiedCount > 0
                      ? `${modifiedCount} Parameter${modifiedCount > 1 ? "s" : ""} Modified`
                      : "Statutory Baselines Active"}
                  </span>
                  {modifiedCount > 0 && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      Unsaved Changes
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  {holidays.length} state holiday exclusion{holidays.length === 1 ? "" : "s"} enrolled
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <GovButton
                type="button"
                variant="secondary"
                onClick={resetAllToDefaults}
                disabled={saving || loading || modifiedCount === 0}
                className="h-9 px-3 text-xs"
              >
                <RotateCcw size={13} className="mr-1.5 inline" />
                Reset All to Defaults
              </GovButton>

              <GovButton
                type="button"
                onClick={() => save()}
                disabled={saving || loading}
                className="h-9 px-4 text-xs font-bold"
              >
                <Save size={13} className="mr-1.5 inline" />
                {saving ? "Saving Changes…" : "Save Configuration"}
              </GovButton>
            </div>
          </div>
        </div>
      </div>
    </GovPortalLayout>
  );
}



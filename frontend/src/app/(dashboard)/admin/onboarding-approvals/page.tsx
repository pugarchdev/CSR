"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Award,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Coins,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Globe,
  Grid,
  Hash,
  HelpCircle,
  Landmark,
  Layers,
  List,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  User,
  X,
  XCircle,
} from "lucide-react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { useResponsiveViewMode } from "@/hooks/useResponsiveViewMode";
import { locationData } from "@/lib/locationData";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

type ApplicationType = "ALL" | "GOVERNMENT" | "COMPANY" | "NGO";
type StatusFilter = "ALL" | "UNDER_VERIFICATION" | "CLARIFICATION_REQUIRED" | "APPROVED" | "REJECTED";
type SortOption = "newest" | "oldest" | "name_asc" | "name_desc";

interface OfficerInfo {
  name?: string | null;
  email?: string | null;
  mobile?: string | null;
  phone?: string | null;
  designation?: string | null;
}

interface DocumentItem {
  id?: string;
  title?: string;
  documentType?: string;
  fileName?: string;
  fileUrl?: string;
  url?: string;
  fileSize?: number;
  verificationStatus?: string;
  status?: string;
  createdAt?: string;
}

interface UnifiedOnboardingItem {
  id: string;
  applicationId?: string;
  organizationId: string;
  source: "GOVERNMENT_APPLICATION" | "ORGANIZATION_RECORD";
  kind: "GOVERNMENT_DEPARTMENT" | "CSR_COMPANY" | "NGO" | "IMPLEMENTING_AGENCY";
  name: string;
  legalName?: string | null;
  displayName?: string | null;
  governmentType?: string | null;
  governmentLevel?: string | null;
  organizationCode?: string | null;
  district?: string | null;
  taluka?: string | null;
  state?: string | null;
  address?: string | null;
  pincode?: string | null;
  officialEmail?: string | null;
  officialPhone?: string | null;
  website?: string | null;
  status: string;
  version?: number;
  reviewerRoleCode?: string | null;
  decision?: string | null;
  decisionRemarks?: string | null;
  rejectionReason?: string | null;
  clarificationRemarks?: string | null;
  submittedAt?: string | null;
  createdAt?: string | null;
  headOfficer?: OfficerInfo | null;
  nodalOfficer?: OfficerInfo | null;
  adminOfficer?: OfficerInfo | null;
  csrProfile?: any | null;
  ngoProfile?: any | null;
  govDeptProfile?: any | null;
  documents: DocumentItem[];
  rawFormData?: any | null;
  users?: Array<{ id: string; email: string; firstName?: string; lastName?: string; designation?: string; mobile?: string }>;
}

function formatCurrency(amount: any): string {
  if (amount === null || amount === undefined || amount === "") return "-";
  const num = Number(amount);
  if (isNaN(num)) return String(amount);
  if (num === 0) return "₹0.00";
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakh`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatStatus(status: string): { label: string; bg: string; text: string; border: string; icon: React.ReactNode } {
  const norm = (status || "").toUpperCase();
  if (norm === "APPROVED" || norm === "ACTIVE" || norm === "VERIFIED") {
    return {
      label: "Approved & Active",
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      border: "border-emerald-200",
      icon: <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />,
    };
  }
  if (norm === "CLARIFICATION_REQUIRED") {
    return {
      label: "Clarification Required",
      bg: "bg-amber-50",
      text: "text-amber-800",
      border: "border-amber-300",
      icon: <HelpCircle size={13} className="text-amber-600 shrink-0" />,
    };
  }
  if (norm === "REJECTED" || norm === "SUSPENDED") {
    return {
      label: norm === "SUSPENDED" ? "Suspended" : "Rejected",
      bg: "bg-rose-50",
      text: "text-rose-800",
      border: "border-rose-200",
      icon: <XCircle size={13} className="text-rose-600 shrink-0" />,
    };
  }
  if (norm === "DRAFT") {
    return {
      label: "Draft Application",
      bg: "bg-slate-100",
      text: "text-slate-800",
      border: "border-slate-300",
      icon: <Clock size={13} className="text-slate-500 shrink-0" />,
    };
  }
  return {
    label: "Under Verification",
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
    icon: <Clock size={13} className="text-blue-600 shrink-0" />,
  };
}

function formatKindBadge(kind: string, govType?: string | null, govLevel?: string | null) {
  if (kind === "GOVERNMENT_DEPARTMENT") {
    const typeLabel = govType ? govType.replace(/_/g, " ") : "GOVERNMENT CELL";
    const levelLabel = govLevel === "SUB_DEPARTMENT" ? "Sub-Department" : "Main Office";
    return {
      label: `${typeLabel} · ${levelLabel}`,
      bg: "bg-purple-50 text-purple-900 border-purple-200",
      icon: <Landmark size={13} className="text-purple-600 shrink-0" />,
    };
  }
  if (kind === "CSR_COMPANY") {
    return {
      label: "Corporate / CSR Company",
      bg: "bg-blue-50 text-blue-900 border-blue-200",
      icon: <Building2 size={13} className="text-blue-700 shrink-0" />,
    };
  }
  if (kind === "NGO" || kind === "IMPLEMENTING_AGENCY") {
    return {
      label: kind === "IMPLEMENTING_AGENCY" ? "Implementing Agency" : "NGO / Trust / Society",
      bg: "bg-emerald-50 text-emerald-900 border-emerald-200",
      icon: <ShieldCheck size={13} className="text-emerald-700 shrink-0" />,
    };
  }
  return {
    label: "Organization",
    bg: "bg-slate-50 text-slate-800 border-slate-200",
    icon: <Building2 size={13} className="text-slate-600 shrink-0" />,
  };
}

export default function OnboardingApprovalsPage() {
  const { isAdmin, hasPermission } = useAuthStore();
  const canPerformActions = isAdmin || hasPermission("organization:approve") || hasPermission("organization:reject");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [govApps, setGovApps] = useState<any[]>([]);
  const [orgRecords, setOrgRecords] = useState<any[]>([]);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const [viewMode, setViewMode] = useResponsiveViewMode();

  const [typeFilter, setTypeFilter] = useState<ApplicationType>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [districtFilter, setDistrictFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [searchQuery, setSearchQuery] = useState("");

  const [decisionModal, setDecisionModal] = useState<{
    open: boolean;
    item: UnifiedOnboardingItem | null;
    decision: "APPROVE" | "CLARIFICATION" | "REJECT" | null;
    remarks: string;
    submitting: boolean;
  }>({
    open: false,
    item: null,
    decision: null,
    remarks: "",
    submitting: false,
  });

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [govRes, orgRes] = await Promise.allSettled([
        apiFetch<any>("/government-onboarding/reviews?status=ALL"),
        apiFetch<any>("/admin/organizations/pending?status=ALL"),
      ]);

      if (govRes.status === "fulfilled") {
        setGovApps(govRes.value?.data || []);
      } else {
        console.warn("Failed to load government onboarding reviews:", govRes.reason);
      }

      if (orgRes.status === "fulfilled") {
        const rawOrgs = Array.isArray(orgRes.value) ? orgRes.value : orgRes.value?.data || [];
        setOrgRecords(rawOrgs);
      } else {
        console.warn("Failed to load pending organizations:", orgRes.reason);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load onboarding applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const unifiedItems: UnifiedOnboardingItem[] = useMemo(() => {
    const list: UnifiedOnboardingItem[] = [];
    const seenOrgIds = new Set<string>();

    for (const g of govApps) {
      const org = g.organization || {};
      seenOrgIds.add(org.id || g.organizationId);

      const form = g.formData || {};
      const head = form.head || form.admin || (org.users && org.users.find((u: any) => u.roleId === 7)) || null;
      const nodal = form.nodal || (org.users && org.users.find((u: any) => u.roleId === 4 || u.roleId === 10)) || null;

      let docs: DocumentItem[] = [];
      if (Array.isArray(org.documents) && org.documents.length > 0) {
        docs = org.documents;
      } else if (g.documentSnapshot) {
        if (Array.isArray(g.documentSnapshot)) {
          docs = g.documentSnapshot;
        } else if (typeof g.documentSnapshot === "object") {
          docs = Object.entries(g.documentSnapshot).map(([key, val]: [string, any]) => ({
            title: key.replace(/_/g, " ").toUpperCase(),
            fileUrl: typeof val === "string" ? val : val?.url || val?.fileUrl || "",
            documentType: key,
          }));
        }
      }

      list.push({
        id: g.id,
        applicationId: g.id,
        organizationId: g.organizationId || org.id,
        source: "GOVERNMENT_APPLICATION",
        kind: "GOVERNMENT_DEPARTMENT",
        name: org.name || form.organizationName || form.name || "Government Entity",
        legalName: org.legalName || org.name,
        governmentType: org.governmentType || form.governmentType || "GOVERNMENT_DEPARTMENT",
        governmentLevel: g.organizationLevel || org.governmentLevel || "MAIN",
        organizationCode: org.organizationCode || form.code || null,
        district: org.district || form.district || "Maharashtra",
        address: org.address || form.address || null,
        officialEmail: org.officialEmail || head?.email || null,
        officialPhone: org.officialPhone || head?.mobile || null,
        status: g.status || org.status || "UNDER_VERIFICATION",
        version: g.version || 1,
        reviewerRoleCode: g.reviewerRoleCode,
        decision: g.decision,
        decisionRemarks: g.decisionRemarks,
        clarificationRemarks: org.clarificationRemarks || g.decisionRemarks,
        rejectionReason: org.rejectionReason,
        submittedAt: g.submittedAt || g.createdAt,
        createdAt: g.createdAt,
        headOfficer: head,
        nodalOfficer: nodal,
        adminOfficer: form.admin || null,
        govDeptProfile: org.govDeptProfile || null,
        documents: docs,
        rawFormData: form,
        users: org.users || [],
      });
    }

    for (const org of orgRecords) {
      if (seenOrgIds.has(org.id)) continue;

      const isCompany = org.kind === "CSR_COMPANY";
      const isNgo = org.kind === "NGO" || org.kind === "IMPLEMENTING_AGENCY";

      const headUser = org.users?.find((u: any) => u.roleId === 1 || u.roleId === 7 || u.roleId === 8 || u.roleId === 9) || null;
      const nodalUser = org.users?.find((u: any) => u.roleId === 4 || u.roleId === 10) || null;

      list.push({
        id: org.id,
        organizationId: org.id,
        source: "ORGANIZATION_RECORD",
        kind: org.kind || (isCompany ? "CSR_COMPANY" : isNgo ? "NGO" : "GOVERNMENT_DEPARTMENT"),
        name: org.name || "Organization",
        legalName: org.legalName || org.name,
        displayName: org.displayName,
        governmentType: org.governmentType,
        governmentLevel: org.governmentLevel,
        organizationCode: org.organizationCode,
        district: org.district || "-",
        taluka: org.taluka,
        state: org.state || "Maharashtra",
        address: org.registeredOfficeAddress || org.address || org.addressLine1 || null,
        pincode: org.pincode,
        officialEmail: org.officialEmail || org.email,
        officialPhone: org.officialPhone || org.phone,
        website: org.website,
        status: org.status || org.onboardingStatus || "UNDER_VERIFICATION",
        clarificationRemarks: org.clarificationRemarks,
        rejectionReason: org.rejectionReason,
        createdAt: org.createdAt,
        submittedAt: org.createdAt,
        headOfficer: headUser ? { name: `${headUser.firstName || ""} ${headUser.lastName || ""}`.trim() || headUser.email, email: headUser.email, mobile: headUser.mobile, designation: headUser.designation } : null,
        nodalOfficer: nodalUser ? { name: `${nodalUser.firstName || ""} ${nodalUser.lastName || ""}`.trim() || nodalUser.email, email: nodalUser.email, mobile: nodalUser.mobile, designation: nodalUser.designation } : null,
        csrProfile: org.csrCompanyProfile,
        ngoProfile: org.ngoProfile,
        govDeptProfile: org.govDeptProfile,
        documents: org.documents || [],
        users: org.users || [],
      });
    }

    return list;
  }, [govApps, orgRecords]);

  const stats = useMemo(() => {
    const pending = unifiedItems.filter((i) => ["UNDER_VERIFICATION", "REGISTERED", "SUBMITTED_FOR_REVIEW", "DOCUMENTS_PENDING", "PROFILE_INCOMPLETE", "DRAFT"].includes(i.status)).length;
    const clarification = unifiedItems.filter((i) => i.status === "CLARIFICATION_REQUIRED").length;
    const approved = unifiedItems.filter((i) => ["APPROVED", "ACTIVE", "VERIFIED"].includes(i.status)).length;
    const gov = unifiedItems.filter((i) => i.kind === "GOVERNMENT_DEPARTMENT").length;
    const comp = unifiedItems.filter((i) => i.kind === "CSR_COMPANY").length;
    const ngo = unifiedItems.filter((i) => i.kind === "NGO" || i.kind === "IMPLEMENTING_AGENCY").length;
    return { pending, clarification, approved, gov, comp, ngo, total: unifiedItems.length };
  }, [unifiedItems]);

  const allDistricts = useMemo(() => {
    const fromMaster = locationData[0]?.districts?.map((d) => d.name) || [];
    const fromItems = unifiedItems.map((i) => i.district).filter((d): d is string => Boolean(d && d !== "-" && d !== "Maharashtra"));
    const combined = Array.from(new Set([...fromMaster, ...fromItems])).sort();
    return combined;
  }, [unifiedItems]);

  const filteredItems = useMemo(() => {
    const filtered = unifiedItems.filter((item) => {
      if (typeFilter === "GOVERNMENT" && item.kind !== "GOVERNMENT_DEPARTMENT") return false;
      if (typeFilter === "COMPANY" && item.kind !== "CSR_COMPANY") return false;
      if (typeFilter === "NGO" && item.kind !== "NGO" && item.kind !== "IMPLEMENTING_AGENCY") return false;

      if (statusFilter === "UNDER_VERIFICATION" && !["UNDER_VERIFICATION", "REGISTERED", "SUBMITTED_FOR_REVIEW", "DOCUMENTS_PENDING", "PROFILE_INCOMPLETE", "DRAFT"].includes(item.status)) return false;
      if (statusFilter === "CLARIFICATION_REQUIRED" && item.status !== "CLARIFICATION_REQUIRED") return false;
      if (statusFilter === "APPROVED" && !["APPROVED", "ACTIVE", "VERIFIED"].includes(item.status)) return false;
      if (statusFilter === "REJECTED" && !["REJECTED", "SUSPENDED"].includes(item.status)) return false;

      if (districtFilter !== "ALL") {
        const itemDist = (item.district || "").toLowerCase().trim();
        if (!itemDist.includes(districtFilter.toLowerCase().trim())) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (item.name || "").toLowerCase().includes(q);
        const matchesEmail = (item.officialEmail || "").toLowerCase().includes(q);
        const matchesDistrict = (item.district || "").toLowerCase().includes(q);
        const matchesCode = (item.organizationCode || "").toLowerCase().includes(q);
        const matchesOfficer = (item.headOfficer?.name || "").toLowerCase().includes(q) || (item.nodalOfficer?.name || "").toLowerCase().includes(q);
        const matchesCin = (item.csrProfile?.cin || item.rawFormData?.cin || "").toLowerCase().includes(q);
        const matchesDarpan = (item.ngoProfile?.darpanNumber || "").toLowerCase().includes(q);

        if (!matchesName && !matchesEmail && !matchesDistrict && !matchesCode && !matchesOfficer && !matchesCin && !matchesDarpan) {
          return false;
        }
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "newest") {
        const dateA = new Date(a.submittedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.submittedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      }
      if (sortBy === "oldest") {
        const dateA = new Date(a.submittedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.submittedAt || b.createdAt || 0).getTime();
        return dateA - dateB;
      }
      if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "name_desc") {
        return b.name.localeCompare(a.name);
      }
      return 0;
    });
  }, [unifiedItems, typeFilter, statusFilter, districtFilter, searchQuery, sortBy]);

  const hasActiveFilters = Boolean(
    typeFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    districtFilter !== "ALL" ||
    searchQuery.trim() ||
    sortBy !== "newest"
  );

  const resetAllFilters = () => {
    setTypeFilter("ALL");
    setStatusFilter("ALL");
    setDistrictFilter("ALL");
    setSearchQuery("");
    setSortBy("newest");
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenDecisionModal = (item: UnifiedOnboardingItem, decision: "APPROVE" | "CLARIFICATION" | "REJECT") => {
    setDecisionModal({
      open: true,
      item,
      decision,
      remarks: "",
      submitting: false,
    });
  };

  const handleSubmitDecision = async () => {
    const { item, decision, remarks } = decisionModal;
    if (!item || !decision) return;

    if (decision !== "APPROVE" && !remarks.trim()) {
      alert(`Please provide mandatory remarks explaining the ${decision === "CLARIFICATION" ? "clarification request" : "rejection reason"}.`);
      return;
    }

    setDecisionModal((prev) => ({ ...prev, submitting: true }));
    try {
      if (item.source === "GOVERNMENT_APPLICATION" && item.applicationId) {
        await apiFetch(`/government-onboarding/reviews/${item.applicationId}/decision`, {
          method: "POST",
          body: JSON.stringify({ decision, remarks: remarks.trim() || undefined }),
        });
      } else {
        const actionType = decision === "APPROVE" ? "approve" : decision === "CLARIFICATION" ? "request-clarification" : "reject";
        await apiFetch(`/admin/organizations/${item.organizationId}/${actionType}`, {
          method: "POST",
          body: JSON.stringify(decision === "REJECT" ? { rejectionReason: remarks.trim() } : { remarks: remarks.trim() }),
        });
      }

      setDecisionModal({ open: false, item: null, decision: null, remarks: "", submitting: false });
      await loadData();
    } catch (err: any) {
      alert(`Decision submission failed: ${err.message || "Unknown error"}`);
      setDecisionModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  return (
    <GovPortalLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-3 py-2 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3 pt-1">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-black tracking-tight text-slate-900 font-heading">Onboarding & Statutory Approvals</h1>
            <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
              Portal Admin
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ViewToggle view={viewMode} onChange={setViewMode} />
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-2xs"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-blue-600" : ""} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
            <button onClick={loadData} className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-2.5 py-1 text-xs font-bold text-rose-800 hover:bg-rose-50 transition-colors">
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          </div>
        )}

        <StatCardGroup columns={5}>
          <StatCard label="Total Records" value={stats.total} icon={Layers} colorTheme="indigo" sublabel="All registered entities" />
          <StatCard label="Gov Departments" value={stats.gov} icon={Landmark} colorTheme="purple" sublabel="Collectorates, ZP & Cells" />
          <StatCard label="CSR Companies" value={stats.comp} icon={Building2} colorTheme="blue" sublabel="Corporate donors & foundations" />
          <StatCard label="NGOs & Agencies" value={stats.ngo} icon={ShieldCheck} colorTheme="emerald" sublabel="12A, 80G & CSR-1" />
          <StatCard label="Pending Review" value={stats.pending} icon={Clock} colorTheme="amber" badge={stats.clarification > 0 ? `${stats.clarification} Clarify` : undefined} sublabel="Under verification queue" />
        </StatCardGroup>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
            <div className="relative lg:col-span-3">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entity, CIN, Darpan, officer..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="lg:col-span-3">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as ApplicationType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
              >
                <option value="ALL">All Applications ({stats.total})</option>
                <option value="GOVERNMENT">Government Departments ({stats.gov})</option>
                <option value="COMPANY">CSR Companies ({stats.comp})</option>
                <option value="NGO">NGOs & Agencies ({stats.ngo})</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
              >
                <option value="ALL">All Statuses ({stats.total})</option>
                <option value="UNDER_VERIFICATION">Awaiting Review ({stats.pending})</option>
                <option value="CLARIFICATION_REQUIRED">Clarification Req ({stats.clarification})</option>
                <option value="APPROVED">Approved & Active ({stats.approved})</option>
                <option value="REJECTED">Rejected / Suspended</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
              >
                <option value="ALL">All Districts ({allDistricts.length})</option>
                {allDistricts.map((dst) => (
                  <option key={dst} value={dst}>
                    {dst}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name_asc">Name (A → Z)</option>
                <option value="name_desc">Name (Z → A)</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-1.5 text-slate-600">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Active Filters:</span>
                {typeFilter !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-bold text-[11px] border border-blue-200">
                    Category: {typeFilter}
                    <button onClick={() => setTypeFilter("ALL")}><X size={10} /></button>
                  </span>
                )}
                {statusFilter !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold text-[11px] border border-amber-200">
                    Status: {statusFilter.replace(/_/g, " ")}
                    <button onClick={() => setStatusFilter("ALL")}><X size={10} /></button>
                  </span>
                )}
                {districtFilter !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 font-bold text-[11px] border border-purple-200">
                    District: {districtFilter}
                    <button onClick={() => setDistrictFilter("ALL")}><X size={10} /></button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-300">
                    Search: &quot;{searchQuery}&quot;
                    <button onClick={() => setSearchQuery("")}><X size={10} /></button>
                  </span>
                )}
              </div>

              <button
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 transition-colors ml-auto"
              >
                <RotateCcw size={11} />
                <span>Reset all filters</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-medium">
          <div>
            Showing <span className="font-extrabold text-slate-900">{filteredItems.length}</span> of{" "}
            <span className="font-bold text-slate-700">{unifiedItems.length}</span> applications
          </div>
          <div className="text-[11px] text-slate-400">
            View: <span className="font-bold text-slate-700 uppercase">{viewMode} mode</span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 shadow-2xs">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <p className="mt-3 text-xs font-bold text-slate-600">Loading applicant dossiers...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-14 text-center shadow-2xs">
            <CheckCircle2 size={40} className="text-emerald-600 mb-2" />
            <h3 className="text-base font-black text-slate-900">No applications match your selected criteria</h3>
            <p className="mt-1 max-w-md text-xs font-medium text-slate-500">
              There are currently no onboarding submissions matching the active filters or search parameters.
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <RotateCcw size={13} />
                <span>Reset all filters</span>
              </button>
            )}
          </div>
        ) : viewMode === "list" ? (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const isExpanded = expandedIds[item.id] ?? false;
              const statusCfg = formatStatus(item.status);
              const kindCfg = formatKindBadge(item.kind, item.governmentType, item.governmentLevel);
              const isGov = item.kind === "GOVERNMENT_DEPARTMENT";
              const isCompany = item.kind === "CSR_COMPANY";
              const isNgo = item.kind === "NGO" || item.kind === "IMPLEMENTING_AGENCY";
              const isActionable = ["UNDER_VERIFICATION", "REGISTERED", "SUBMITTED_FOR_REVIEW", "CLARIFICATION_REQUIRED", "DRAFT"].includes(item.status);

              const raw = item.rawFormData || {};
              const csr = item.csrProfile || {};
              const ngo = item.ngoProfile || {};

              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs transition-all hover:border-slate-300"
                >
                  <div
                    onClick={() => toggleExpand(item.id)}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 sm:p-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(item.id);
                        }}
                        className="mt-0.5 p-1 rounded-lg hover:bg-slate-200/70 text-slate-500 shrink-0 transition-transform"
                      >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${kindCfg.bg}`}>
                            {kindCfg.icon}
                            <span>{kindCfg.label}</span>
                          </span>

                          {item.organizationCode && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                              {item.organizationCode}
                            </span>
                          )}

                          {(csr.cin || raw.cin) && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                              CIN: {csr.cin || raw.cin}
                            </span>
                          )}

                          {ngo.darpanNumber && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              DARPAN: {ngo.darpanNumber}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm sm:text-base font-black text-slate-950 truncate tracking-tight">
                          {item.name}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <MapPin size={12} className="text-slate-400 shrink-0" />
                            <span>{item.district || "Maharashtra"}</span>
                          </span>

                          {item.headOfficer?.name && (
                            <span className="flex items-center gap-1">
                              <User size={12} className="text-slate-400 shrink-0" />
                              <span>{item.headOfficer.name}</span>
                            </span>
                          )}

                          {item.officialEmail && (
                            <span className="hidden sm:flex items-center gap-1">
                              <Mail size={12} className="text-slate-400 shrink-0" />
                              <span className="truncate max-w-[200px]">{item.officialEmail}</span>
                            </span>
                          )}

                          {item.submittedAt && (
                            <span className="hidden md:flex items-center gap-1 text-slate-400">
                              <Calendar size={12} className="shrink-0" />
                              <span>{new Date(item.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-between md:justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100"
                    >
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                        {statusCfg.icon}
                        <span>{statusCfg.label}</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/admin/onboarding-approvals/${item.organizationId}`}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                          title="View Full Profile Page"
                        >
                          <Eye size={14} />
                        </Link>

                        {canPerformActions && isActionable && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenDecisionModal(item, "APPROVE")}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-2xs"
                              title="Approve and activate organization"
                            >
                              <Check size={12} strokeWidth={3} />
                              <span className="hidden sm:inline">Approve</span>
                            </button>
                            <button
                              onClick={() => handleOpenDecisionModal(item, "CLARIFICATION")}
                              className="px-2 py-1 rounded-lg text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-colors"
                              title="Request clarification"
                            >
                              Clarify
                            </button>
                            <button
                              onClick={() => handleOpenDecisionModal(item, "REJECT")}
                              className="px-2 py-1 rounded-lg text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                              title="Reject application"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-200 bg-slate-50/50 p-4 sm:p-5 space-y-4 animate-in fade-in-50 duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-2.5 shadow-2xs">
                          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100">
                            <Building2 size={14} className="text-blue-600" />
                            <span>Entity & Legal Profile</span>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">Category / Type</span>
                              <span className="font-extrabold text-slate-900">
                                {item.governmentType || item.kind.replace(/_/g, " ")}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">Office Address</span>
                              <p className="font-medium text-slate-700 leading-relaxed">
                                {item.address || "Address not provided"}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">District</span>
                                <span className="font-bold text-slate-800">{item.district || "-"}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">State</span>
                                <span className="font-bold text-slate-800">{item.state || "Maharashtra"}</span>
                              </div>
                            </div>

                            {(csr.cin || raw.cin || ngo.darpanNumber || item.organizationCode) && (
                              <div className="pt-2 border-t border-slate-100 space-y-1">
                                {(csr.cin || raw.cin) && (
                                  <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-bold">CIN</span>
                                    <span className="font-mono font-bold text-slate-800">{csr.cin || raw.cin}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-2.5 shadow-2xs">
                          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100">
                            <User size={14} className="text-purple-600" />
                            <span>{isGov ? "Head of Organization" : "Authorized Leadership"}</span>
                          </div>

                          {item.headOfficer ? (
                            <div className="space-y-2 text-xs">
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Full Name</span>
                                <span className="font-black text-slate-900">{item.headOfficer.name || "Officer"}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Designation</span>
                                <span className="font-bold text-purple-900 bg-purple-100/70 px-2 py-0.5 rounded-md inline-block">
                                  {item.headOfficer.designation}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Official Email</span>
                                <a href={`mailto:${item.headOfficer.email}`} className="font-semibold text-blue-700 hover:underline break-all">
                                  {item.headOfficer.email || "-"}
                                </a>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Official Mobile</span>
                                <span className="font-semibold text-slate-800">
                                  {item.headOfficer.mobile || item.headOfficer.phone || "Not provided"}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 italic py-4">No dedicated head officer record attached.</div>
                          )}
                        </div>

                        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-2.5 shadow-2xs">
                          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100">
                            <ShieldCheck size={14} className="text-emerald-600" />
                            <span>{isGov ? "Designated Nodal Officer" : "CSR Coordinator / Nodal"}</span>
                          </div>

                          {item.nodalOfficer ? (
                            <div className="space-y-2 text-xs">
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Officer Name</span>
                                <span className="font-black text-slate-900">{item.nodalOfficer.name || "Nodal Officer"}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Designation</span>
                                <span className="font-bold text-emerald-900 bg-emerald-100/70 px-2 py-0.5 rounded-md inline-block">
                                  {item.nodalOfficer.designation}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Email</span>
                                <span className="font-semibold text-slate-800">{item.nodalOfficer.email || "-"}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 italic py-4">No Nodal Officer designated.</div>
                          )}
                        </div>
                      </div>

                      {isCompany && (
                        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-900">
                            <Coins size={15} className="text-blue-700" />
                            <span>CSR Financial Obligations & Allocations</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                            <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Annual CSR Budget</span>
                                <span className="font-black text-slate-900 block text-sm mt-0.5">{formatCurrency(csr.annualCsrBudget || csr.currentYearCsrBudget)}</span>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Net Worth</span>
                                <span className="font-black text-slate-900 block text-sm mt-0.5">{formatCurrency(csr.netWorth)}</span>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Turnover</span>
                                <span className="font-black text-slate-900 block text-sm mt-0.5">{formatCurrency(csr.turnover)}</span>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Net Profit</span>
                                <span className="font-black text-slate-900 block text-sm mt-0.5">{formatCurrency(csr.netProfit)}</span>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">2% Obligation</span>
                                <span className="font-black text-amber-900 block text-sm mt-0.5">
                                  {formatCurrency(csr.twoPercentCsrObligation || csr.csrObligationAmount || (csr.averageNetProfit ? Number(csr.averageNetProfit) * 0.02 : null))}
                                </span>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Financial Year</span>
                                <span className="font-bold text-slate-800 block text-sm mt-0.5">{csr.financialYear || "Current FY"}</span>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">CSR Reg No</span>
                                <span className="font-mono font-bold text-slate-800 block text-sm mt-0.5">{csr.csrRegistrationNo || "-"}</span>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Unspent CSR</span>
                                <span className="font-black text-slate-900 block text-sm mt-0.5">{formatCurrency(csr.unspentCsrAmount)}</span>
                              </div>
                            </div>

                            {((csr.preferredSectors || []).length > 0 || (csr.preferredDistricts || []).length > 0) && (
                              <div className="pt-2 border-t border-blue-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                {(csr.preferredSectors || []).length > 0 && (
                                  <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Focus Sectors</span>
                                    <div className="flex flex-wrap gap-1">
                                      {csr.preferredSectors.map((sec: string, sIdx: number) => (
                                        <span key={sIdx} className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-bold text-[10px]">
                                          {sec}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {(csr.preferredDistricts || []).length > 0 && (
                                  <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Focus Districts</span>
                                    <div className="flex flex-wrap gap-1">
                                      {csr.preferredDistricts.map((dst: string, dIdx: number) => (
                                        <span key={dIdx} className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 font-bold text-[10px]">
                                          {dst}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                      {isNgo && (
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
                          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-900">
                            <Award size={15} className="text-emerald-700" />
                            <span>NGO Statutory Registrations & Tax Exemptions</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                            <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-2xs">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">NGO Darpan</span>
                              <span className="font-mono font-bold text-slate-900 block mt-0.5">{ngo.darpanNumber || "Registered"}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-700">
                            <FileText size={14} className="text-blue-600" />
                            <span>Attached Statutory Documents ({item.documents?.length || 0})</span>
                          </div>
                        </div>

                        {item.documents && item.documents.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {item.documents.map((doc, dIdx) => {
                              const docUrl = doc.fileUrl || doc.url || "#";
                              const docName = doc.title || doc.fileName || doc.documentType || `Document ${dIdx + 1}`;
                              return (
                                <div key={doc.id || dIdx} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:border-blue-300 transition-all">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <FileText size={16} className="text-blue-600 shrink-0" />
                                    <div className="truncate">
                                      <p className="text-xs font-bold text-slate-900 truncate">{docName}</p>
                                      <span className="text-[10px] font-semibold text-slate-400 uppercase">
                                        {doc.documentType || "Document"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-3 text-xs text-slate-400 font-medium">
                            No separate uploaded document files attached to this record.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => {
              const statusCfg = formatStatus(item.status);
              const kindCfg = formatKindBadge(item.kind, item.governmentType, item.governmentLevel);
              const isCompany = item.kind === "CSR_COMPANY";
              const isNgo = item.kind === "NGO" || item.kind === "IMPLEMENTING_AGENCY";
              const isActionable = ["UNDER_VERIFICATION", "REGISTERED", "SUBMITTED_FOR_REVIEW", "CLARIFICATION_REQUIRED", "DRAFT"].includes(item.status);

              const csr = item.csrProfile || {};
              const ngo = item.ngoProfile || {};

              return (
                <article
                  key={item.id}
                  className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs transition-all hover:border-slate-300"
                >
                  <div className="space-y-2 border-b border-slate-100 bg-slate-50/60 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${kindCfg.bg}`}>
                        {kindCfg.icon}
                        <span>{kindCfg.label}</span>
                      </span>

                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                        {statusCfg.icon}
                        <span>{statusCfg.label}</span>
                      </span>
                    </div>

                    <div>
                      <h2 className="text-base font-black text-slate-950 tracking-tight">{item.name}</h2>
                      {item.legalName && item.legalName !== item.name && (
                        <p className="text-xs text-slate-500 font-medium truncate">{item.legalName}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400" />
                        <span>{item.district || "Maharashtra"}</span>
                      </span>
                      {item.officialEmail && (
                        <span className="flex items-center gap-1 truncate max-w-[180px]">
                          <Mail size={12} className="text-slate-400" />
                          <span className="truncate">{item.officialEmail}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 space-y-3 flex-1 text-xs">
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Head Officer</span>
                        <span className="font-extrabold text-slate-900 block truncate">
                          {item.headOfficer?.name || "Not provided"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Nodal Officer</span>
                        <span className="font-extrabold text-slate-900 block truncate">
                          {item.nodalOfficer?.name || "Not designated"}
                        </span>
                      </div>
                    </div>

                    {isCompany && (csr.annualCsrBudget || csr.twoPercentCsrObligation) && (
                      <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-2.5 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-blue-900">2% CSR Obligation</span>
                        <span className="font-black text-blue-950">
                          {formatCurrency(csr.twoPercentCsrObligation || csr.csrObligationAmount || csr.annualCsrBudget)}
                        </span>
                      </div>
                    )}

                    {isNgo && (
                      <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2.5 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-900">NGO Darpan ID</span>
                        <span className="font-mono font-bold text-emerald-950">{ngo.darpanNumber || "Registered"}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <FileText size={13} className="text-slate-400" />
                        <span>Documents: {item.documents?.length || 0} attached</span>
                      </span>
                      {item.submittedAt && (
                        <span className="text-slate-400">
                          {new Date(item.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 p-3">
                    <Link
                      href={`/admin/onboarding-approvals/${item.organizationId}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-blue-900 bg-white hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs"
                    >
                      <Eye size={12} />
                      <span>Full View</span>
                    </Link>

                    {canPerformActions && isActionable ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenDecisionModal(item, "CLARIFICATION")}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-colors"
                        >
                          Clarify
                        </button>
                        <button
                          onClick={() => handleOpenDecisionModal(item, "APPROVE")}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-2xs"
                        >
                          <Check size={12} strokeWidth={3} />
                          <span>Approve</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400">{statusCfg.label}</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {decisionModal.open && decisionModal.item && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
            <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  {decisionModal.decision === "APPROVE" ? (
                    <CheckCircle2 size={18} className="text-emerald-600" />
                  ) : decisionModal.decision === "CLARIFICATION" ? (
                    <HelpCircle size={18} className="text-amber-600" />
                  ) : (
                    <XCircle size={18} className="text-rose-600" />
                  )}
                  <h3 className="text-sm font-black text-slate-950">
                    {decisionModal.decision === "APPROVE"
                      ? "Approve Organization Onboarding"
                      : decisionModal.decision === "CLARIFICATION"
                      ? "Request Onboarding Clarification"
                      : "Reject Onboarding Application"}
                  </h3>
                </div>
                <button
                  onClick={() => setDecisionModal({ open: false, item: null, decision: null, remarks: "", submitting: false })}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs">
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">Target Applicant</span>
                  <span className="font-extrabold text-slate-900 text-sm block mt-0.5">{decisionModal.item.name}</span>
                  <span className="text-slate-500 font-medium">
                    {decisionModal.item.kind.replace(/_/g, " ")} · {decisionModal.item.district || "Maharashtra"}
                  </span>
                </div>

                {decisionModal.decision === "APPROVE" ? (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Are you sure you want to approve and activate this organization? The organization and its assigned nodal administrators will be granted active portal access.
                  </p>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {decisionModal.decision === "CLARIFICATION"
                        ? "Mandatory Clarification Instructions for Applicant:"
                        : "Mandatory Formal Rejection Reason:"}
                    </label>
                    <textarea
                      rows={4}
                      value={decisionModal.remarks}
                      onChange={(e) => setDecisionModal((prev) => ({ ...prev, remarks: e.target.value }))}
                      placeholder={
                        decisionModal.decision === "CLARIFICATION"
                          ? "Specify exactly which details or statutory documents need correction..."
                          : "State the formal justification for rejection..."
                      }
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDecisionModal({ open: false, item: null, decision: null, remarks: "", submitting: false })}
                  disabled={decisionModal.submitting}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSubmitDecision}
                  disabled={decisionModal.submitting}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black text-white transition-all ${
                    decisionModal.decision === "APPROVE"
                      ? "bg-emerald-700 hover:bg-emerald-800"
                      : decisionModal.decision === "CLARIFICATION"
                      ? "bg-amber-700 hover:bg-amber-800"
                      : "bg-rose-700 hover:bg-rose-800"
                  }`}
                >
                  {decisionModal.submitting && <Loader2 size={12} className="animate-spin" />}
                  <span>
                    {decisionModal.decision === "APPROVE"
                      ? "Confirm & Activate"
                      : decisionModal.decision === "CLARIFICATION"
                      ? "Submit Clarification Request"
                      : "Confirm Rejection"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GovPortalLayout>
  );
}

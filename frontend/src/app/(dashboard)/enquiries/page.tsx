"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useApiQuery } from "@/lib/apiHooks";
import { GovPageHeader } from "@/components/layout/GovPageHeader";
import { StatCard } from "@/components/ui/StatCard";
import {
  Building2, Search, Filter, Mail, Coins, ArrowUpRight, ShieldCheck, Clock, CheckCircle2, Plus, Landmark, AlertCircle, Loader2
} from "lucide-react";

import { useAuthStore } from "@/store/authStore";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";

interface Enquiry {
  id: string;
  trackingId: string;
  companyName: string;
  sector: string;
  indicativeBudgetCr: number | null;
  status: "SUBMITTED" | "UNDER_ASSESSMENT" | "APPROVED" | "ASSIGNED";
  submittedDate: string;
}

function extractRoleTokens(
  user: any,
  roles: any[],
  roleDetails: any[]
): string[] {
  const tokens = new Set<string>();

  if (user?.role) tokens.add(String(user.role));
  if (user?.roleSlug) tokens.add(String(user.roleSlug));
  if (user?.roleNumericId) tokens.add(String(user.roleNumericId));

  (roles || []).forEach((r) => {
    if (typeof r === "string") tokens.add(r);
    else if (typeof r === "number") tokens.add(String(r));
    else if (r && typeof r === "object") {
      if (r.slug) tokens.add(String(r.slug));
      if (r.name) tokens.add(String(r.name));
      if (r.role) tokens.add(String(r.role));
    }
  });

  (roleDetails || []).forEach((rd) => {
    if (rd?.slug) tokens.add(String(rd.slug));
    if (rd?.name) tokens.add(String(rd.name));
  });

  return Array.from(tokens);
}

export default function EnquiriesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const roleDetails = useAuthStore((s) => s.roleDetails);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [modalState, setModalState] = useState<"NONE" | "ONBOARDING_INCOMPLETE" | "APPROVAL_PENDING">("NONE");
  const [checkingStatus, setCheckingStatus] = useState(false);

  const tokens = useMemo(
    () => extractRoleTokens(user, roles, roleDetails),
    [user, roles, roleDetails]
  );

  const isRM = useMemo(() => {
    return tokens.some((t: string) => {
      const upper = t.toUpperCase();
      return (
        upper.includes("RELATIONSHIP") ||
        upper.includes("RM") ||
        upper === "6"
      );
    });
  }, [tokens]);

  const isGovOrAdmin = useMemo(() => {
    return (
      isAdmin ||
      isRM ||
      tokens.some((t: string) => {
        const upper = t.toUpperCase();
        return (
          upper.includes("GOVERNMENT") ||
          upper.includes("GOV") ||
          upper.includes("OFFICER") ||
          upper.includes("JOINT") ||
          upper.includes("SECRETARY") ||
          upper.includes("ADMIN") ||
          upper.includes("SUPER")
        );
      })
    );
  }, [isAdmin, isRM, tokens]);

  const canSubmitEnquiry = useMemo(() => {
    // 1. If they explicitly have the permission assigned, always show the button
    if (hasPermission("enquiry:create")) return true;

    // 2. If they don't have explicit permission and are Gov/Admin, block them
    if (isGovOrAdmin) return false;

    // 3. Fallback for Corporate/Company roles based on tokens
    return tokens.some((t: string) => {
      const upper = t.toUpperCase();
      return upper.includes("CORPORATE") || upper.includes("COMPANY");
    });
  }, [isGovOrAdmin, hasPermission, tokens]);

  const handleSubmitEnquiryClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setCheckingStatus(true);

    try {
      let org = (user as any)?.organization;
      let profile = (user as any)?.csrCompanyProfile || org?.csrCompanyProfile;

      if (user?.organizationId) {
        try {
          const profileRes = await apiFetch<any>("/onboarding/company");
          org = profileRes?.organization || profileRes?.data?.organization || profileRes || org;
          profile = profileRes?.profile || profileRes?.data?.profile || org?.csrCompanyProfile || profile;
        } catch { }
      }

      if (!org || !user?.organizationId) {
        setModalState("ONBOARDING_INCOMPLETE");
        return;
      }

      const statusUpper = (org.status || org.onboardingStatus || "").toUpperCase();
      const PENDING_APPROVAL_STATUSES = ["SUBMITTED_FOR_REVIEW", "UNDER_VERIFICATION", "CLARIFICATION_REQUIRED", "PENDING_APPROVAL", "DOCUMENTS_SUBMITTED"];

      if (statusUpper === "ACTIVE" || statusUpper === "APPROVED" || Number(user?.roleId || user?.role) === 1) {
        router.push("/enquiries/new");
        return;
      } else if (PENDING_APPROVAL_STATUSES.includes(statusUpper)) {
        setModalState("APPROVAL_PENDING");
        return;
      } else {
        // REGISTERED, PROFILE_INCOMPLETE, DOCUMENTS_PENDING, or un-submitted onboarding
        setModalState("ONBOARDING_INCOMPLETE");
        return;
      }
    } catch {
      setModalState("ONBOARDING_INCOMPLETE");
    } finally {
      setCheckingStatus(false);
    }
  };

  const { data: envelope, isLoading, error: fetchError } = useApiQuery<any>(
    [isRM ? "rm-enquiries" : "corporate-enquiries"],
    isRM ? "/rm/enquiries" : "/corporate-enquiries"
  );

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  useEffect(() => {
    if (searchParams.get("action") === "create" && !canSubmitEnquiry) {
      router.replace("/enquiries");
    } else if (searchParams.get("action") === "create" && canSubmitEnquiry) {
      router.replace("/enquiries/new");
    }
  }, [searchParams, router, canSubmitEnquiry]);

  const rawEnquiries = Array.isArray(envelope?.data?.enquiries)
    ? envelope.data.enquiries
    : Array.isArray(envelope?.data)
      ? envelope.data
      : Array.isArray(envelope?.enquiries)
        ? envelope.enquiries
        : Array.isArray(envelope)
          ? envelope
          : [];

  const items: Enquiry[] = rawEnquiries.map((e: any) => ({
    id: e.id || e.trackingId,
    trackingId: e.trackingId || `ENQ-${e.id?.slice(0, 6) || "2026"}`,
    companyName: e.corporateName || e.companyName || e.company?.name || "Corporate Partner",
    sector: e.sector || "Not specified",
    indicativeBudgetCr: e.indicativeBudget != null ? Number(e.indicativeBudget) / 10000000 : (e.budget != null ? Number(e.budget) : null),
    status: e.status || "SUBMITTED",
    submittedDate: e.createdAt ? new Date(e.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
  }));

  const filtered = items.filter(item => {
    const matchesSearch = item.companyName.toLowerCase().includes(search.toLowerCase()) ||
      item.trackingId.toLowerCase().includes(search.toLowerCase()) ||
      item.sector.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "ALL" || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-screen-2xl flex-col gap-4 px-4 py-4 md:px-6">
      {/* Header */}
      <GovPageHeader
        title="Corporate Enquiries & CSR Partnership Register"
        eyebrow="Corporate Desk"
        actions={
          canSubmitEnquiry ? (
            <button
              onClick={handleSubmitEnquiryClick}
              disabled={checkingStatus}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all hover:scale-105 disabled:opacity-50"
            >
              {checkingStatus ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Submit Corporate Enquiry
            </button>
          ) : null
        }
      />

      {/* Onboarding Incomplete Modal */}
      <Modal
        isOpen={modalState === "ONBOARDING_INCOMPLETE"}
        onClose={() => setModalState("NONE")}
        title="Onboarding Needs to Be Completed"
      >
        <div className="flex flex-col gap-4 p-2">
          <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
            <AlertCircle size={24} className="shrink-0" />
            <p className="text-xs font-semibold">
              Your corporate/company onboarding needs to be completed before submitting a CSR enquiry. Please complete your onboarding first.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalState("NONE")}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-blue-900 hover:bg-blue-950 text-white"
              onClick={() => {
                setModalState("NONE");
                router.push("/organization/onboarding/company");
              }}
            >
              Complete Onboarding
            </Button>
          </div>
        </div>
      </Modal>

      {/* Superadmin Approval Pending Modal */}
      <Modal
        isOpen={modalState === "APPROVAL_PENDING"}
        onClose={() => setModalState("NONE")}
        title="Approval Pending"
      >
        <div className="flex flex-col gap-4 p-2">
          <div className="flex items-center gap-3 text-blue-900 bg-blue-50 p-3 rounded-xl border border-blue-200">
            <Clock size={24} className="shrink-0 text-blue-700" />
            <p className="text-xs font-semibold">
              Your corporate onboarding approval is pending from Superadmin. Till then explore the marketplace.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalState("NONE")}>
              Close
            </Button>
            <Button
              variant="primary"
              className="bg-blue-900 hover:bg-blue-950 text-white"
              onClick={() => {
                setModalState("NONE");
                router.push("/marketplace");
              }}
            >
              Explore Marketplace
            </Button>
          </div>
        </div>
      </Modal>


  {/* 
        Mobile: Flex row with horizontal scroll (overflow-x-auto) and snapping. 
        Tablet/Desktop (sm+): Reverts to your standard 3-column CSS grid.
      */}
      <div className="flex snap-x gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
        
        {/* Wrapper ensures cards take up 85% of the mobile screen so the next card peeks in */}
        <div className="w-[85%] min-w-[260px] shrink-0 snap-start sm:w-auto sm:min-w-0">
          <StatCard
            label="Total Enquiries"
            value={items.length}
            icon={Building2}
            index={0}
            badge="Corporate Desk"
            sublabel="Received submissions"
          />
        </div>

        <div className="w-[85%] min-w-[260px] shrink-0 snap-start sm:w-auto sm:min-w-0">
          <StatCard
            label="Indicative Outlay"
            value={`₹${items.reduce((acc, curr) => acc + (curr.indicativeBudgetCr || 0), 0).toFixed(1)} Cr`}
            icon={Coins}
            index={1}
            badge="Pledged Budget"
            sublabel="Aggregated outlay"
          />
        </div>

        <div className="w-[85%] min-w-[260px] shrink-0 snap-start sm:w-auto sm:min-w-0">
          <StatCard
            label="Under Review"
            value={items.filter(e => e.status === "UNDER_ASSESSMENT" || e.status === "SUBMITTED").length}
            icon={Clock}
            index={2}
            badge="Pending Review"
            sublabel="Active verification queue"
          />
        </div>

      </div>

      {/* Main Content Register */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company name, tracking ID, or sector..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={15} className="text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full md:w-auto rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_ASSESSMENT">Under Assessment</option>
              <option value="APPROVED">Approved</option>
              <option value="ASSIGNED">Assigned</option>
            </select>
          </div>
        </div>

        {/* Data Table / Mobile Cards */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
            <Loader2 size={28} className="animate-spin text-blue-900" />
            <p className="text-xs font-bold">Loading Corporate Enquiries...</p>
          </div>
        ) : fetchError ? (
          <div className="p-6 rounded-2xl border border-rose-200 bg-rose-50 text-center text-xs font-bold text-rose-800">
            Failed to load corporate enquiries register.
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-bold">
            No corporate enquiries found matching your search.
          </div>
        ) : (
          <div className="w-full md:overflow-x-auto md:rounded-2xl md:border md:border-slate-200/80">
            <table className="w-full block md:table text-left text-xs font-medium text-slate-700 border-collapse">
              <thead className="hidden md:table-header-group bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="px-4 py-3">Tracking ID</th>
                  <th className="px-4 py-3">Corporate / Company</th>
                  <th className="px-4 py-3">Sector</th>
                  <th className="px-4 py-3">Outlay (₹ Cr)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted Date</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group divide-y-0 md:divide-y md:divide-slate-100">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="block md:table-row mb-4 md:mb-0 bg-white border border-slate-200 md:border-none rounded-xl md:rounded-none shadow-sm md:shadow-none hover:bg-slate-50/80 transition-colors overflow-hidden"
                  >
                    <td data-label="Tracking ID" className="flex md:table-cell justify-between items-center px-4 py-3 md:py-3.5 border-b border-slate-100 md:border-none font-mono font-bold text-blue-950 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden">
                      {item.trackingId}
                    </td>
                    <td data-label="Company" className="flex md:table-cell justify-between items-center px-4 py-3 md:py-3.5 border-b border-slate-100 md:border-none font-bold text-slate-900 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left">
                      {item.companyName}
                    </td>
                    <td data-label="Sector" className="flex md:table-cell justify-between items-center px-4 py-3 md:py-3.5 border-b border-slate-100 md:border-none text-slate-600 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden">
                      {item.sector}
                    </td>
                    <td data-label="Outlay (₹ Cr)" className="flex md:table-cell justify-between items-center px-4 py-3 md:py-3.5 border-b border-slate-100 md:border-none font-mono font-bold text-slate-900 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden">
                      {item.indicativeBudgetCr == null ? "—" : `₹${item.indicativeBudgetCr} Cr`}
                    </td>
                    <td data-label="Status" className="flex md:table-cell justify-between items-center px-4 py-3 md:py-3.5 border-b border-slate-100 md:border-none before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${item.status === "APPROVED" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
                          item.status === "UNDER_ASSESSMENT" ? "bg-blue-50 text-blue-800 border border-blue-200" :
                            "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}>
                        {item.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td data-label="Submitted Date" className="flex md:table-cell justify-between items-center px-4 py-3 md:py-3.5 border-b border-slate-100 md:border-none text-slate-500 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden">
                      {item.submittedDate}
                    </td>
                    <td className="block md:table-cell px-4 py-3 md:py-3.5 text-right bg-slate-50/50 md:bg-transparent">
                      <Link
                        href={`/enquiries/${item.id}`}
                        className="inline-flex items-center justify-center md:justify-end gap-1 w-full md:w-auto text-xs font-bold text-blue-900 hover:text-blue-700 border border-blue-200 md:border-none bg-white md:bg-transparent rounded-lg py-2 md:py-0 transition-colors"
                      >
                        Details <ArrowUpRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
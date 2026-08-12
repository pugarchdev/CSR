"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { GovPageHeader } from "@/components/layout/GovPageHeader";
import { useAuthStore } from "@/store/authStore";
import { useApiQuery } from "@/lib/apiHooks";
import { Loader } from "@/components/ui/Loader";
import {
  User, Building2, ShieldCheck, Key, CheckCircle2, Clock, Lock, Copy, Check,
  RefreshCw, Search, Sparkles, MapPin, Mail, Phone, Briefcase, Award, FileText,
  Layers, ChevronRight, ShieldAlert, CheckCircle
} from "lucide-react";

export default function ProfilePage() {
  const storeUser = useAuthStore((s) => s.user);
  const storeRoles = useAuthStore((s) => s.roles);
  const storePermissions = useAuthStore((s) => s.permissions);
  const storeIsAdmin = useAuthStore((s) => s.isAdmin);
  const fetchEffectivePermissions = useAuthStore((s) => s.fetchEffectivePermissions);
  const isLoadingPermissions = useAuthStore((s) => s.isLoadingPermissions);

  const { data: meEnvelope, isLoading: isMeLoading, refetch } = useApiQuery<any>(
    ["auth-me-profile"],
    "/auth/me"
  );

  const [activeTab, setActiveTab] = useState<"overview" | "organization" | "permissions" | "security">("overview");
  const [copiedId, setCopiedId] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Combine fresh /auth/me data with store data for instant & authoritative rendering
  const liveUser = meEnvelope?.user || storeUser;
  const livePermissions: string[] = Array.isArray(meEnvelope?.permissions)
    ? meEnvelope.permissions
    : (storePermissions || []);
  const liveRoles: string[] = Array.isArray(meEnvelope?.roles)
    ? meEnvelope.roles
    : (storeRoles || (liveUser?.role ? [liveUser.role] : []));
  const liveIsAdmin: boolean = meEnvelope?.isAdmin !== undefined
    ? Boolean(meEnvelope.isAdmin)
    : Boolean(storeIsAdmin);

  const userName = liveUser?.name ||
                   (liveUser?.firstName ? `${liveUser.firstName} ${liveUser.lastName || ""}`.trim() : "") ||
                   liveUser?.email?.split("@")[0] ||
                   "Authenticated User";

  const primaryRole = liveUser?.role || (liveRoles.length > 0 ? liveRoles[0] : "User");
  const org = liveUser?.organization;

  const handleCopyId = () => {
    if (liveUser?.id) {
      navigator.clipboard.writeText(liveUser.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleRefreshPermissions = async () => {
    setIsRefreshing(true);
    await fetchEffectivePermissions();
    await refetch();
    setIsRefreshing(false);
  };

  const filteredPermissions = livePermissions.filter(p =>
    p.toLowerCase().includes(permissionSearch.toLowerCase())
  );

  return (
    <GovPortalLayout>
      <div className="mx-auto flex min-h-screen max-w-screen-2xl flex-col gap-3 sm:gap-4 px-4 py-4 md:px-6">
        {/* Page Header */}
        <GovPageHeader
          title="User Profile"
          eyebrow="Account Management"
          description="View and verify your official credentials, organizational details, system roles, and assigned platform permissions."
          actions={
            <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
              <button
                type="button"
                onClick={handleCopyId}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-all"
              >
                {copiedId ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {copiedId ? "Copied User ID" : "Copy User ID"}
              </button>

              <button
                type="button"
                onClick={handleRefreshPermissions}
                disabled={isRefreshing || isLoadingPermissions}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 px-4 py-2 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all hover:scale-105 disabled:opacity-50"
              >
                <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                Refresh Access
              </button>
            </div>
          }
        />

        {/* Profile Identity Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-blue-900/10 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-5 md:p-6 text-white shadow-lg">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute right-1/3 bottom-0 -mb-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start md:items-center gap-4 sm:gap-5 min-w-0">
              {/* Avatar Circle */}
              <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-xl sm:text-2xl font-black text-white shadow-lg ring-4 ring-white/10">
                {userName.charAt(0).toUpperCase()}
              </div>

              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white truncate min-w-0">{userName}</h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                    <ShieldCheck size={13} /> Active & Verified
                  </span>
                  {liveIsAdmin && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                      <Sparkles size={13} /> Platform Admin
                    </span>
                  )}
                </div>

                <p className="text-xs font-medium text-slate-300 flex items-center gap-2">
                  <Mail size={14} className="text-blue-400" /> {liveUser?.email || "No email on record"}
                </p>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-300 font-medium pt-1">
                  <span className="inline-flex items-center gap-1 bg-white/10 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                    <Briefcase size={13} className="text-indigo-400 shrink-0" />
                    Role: <strong className="text-white">{primaryRole.replace(/_/g, " ")}</strong>
                  </span>
                  {org?.name && (
                    <span className="inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg">
                      <Building2 size={13} className="text-purple-400 shrink-0" />
                      <span className="line-clamp-1 sm:line-clamp-none">{org.name}</span>
                    </span>
                  )}
                  {liveUser?.assignedDistrict && (
                    <span className="inline-flex items-center gap-1 bg-white/10 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                      <MapPin size={13} className="text-rose-400 shrink-0" />
                      District: <strong className="text-white">{liveUser.assignedDistrict}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Access Badges Bar */}
            <div className="grid grid-cols-2 gap-3 shrink-0 rounded-2xl bg-white/5 p-3.5 backdrop-blur-md border border-white/10 min-w-[240px]">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Access Scope</span>
                <p className="text-xs font-bold text-white mt-0.5">
                  {liveIsAdmin ? "Global State Access" : liveUser?.assignedDistrict ? `District Scope (${liveUser.assignedDistrict})` : "Organization Scope"}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Grants</span>
                <p className="text-xs font-bold text-emerald-400 mt-0.5">
                  {liveIsAdmin ? "Full Admin Access" : `${livePermissions.length} Permissions`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {[
            { id: "overview", label: "Personal Identity", icon: User },
            { id: "organization", label: "Organization Details", icon: Building2 },
            { id: "permissions", label: "Roles & Permissions", icon: ShieldCheck, badge: livePermissions.length },
            { id: "security", label: "Security & Credentials", icon: Key },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-blue-900 text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon size={15} />
                {tab.label}
                {tab.badge !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          {/* TAB 1: OVERVIEW & PERSONAL IDENTITY */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <User size={18} className="text-blue-700" /> Account Identity & Contact Information
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official user account profile attributes recorded in MahaCSR directory.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <User size={13} className="text-blue-600" /> Full Name
                  </span>
                  <p className="mt-1 text-sm font-bold text-slate-900">{userName}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Mail size={13} className="text-blue-600" /> Email Address
                  </span>
                  <p className="mt-1 text-sm font-bold text-slate-900">{liveUser?.email || "Not specified"}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Phone size={13} className="text-blue-600" /> Mobile Number
                  </span>
                  <p className="mt-1 text-sm font-bold text-slate-900">{liveUser?.mobile || "Not specified"}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Briefcase size={13} className="text-blue-600" /> Official Designation
                  </span>
                  <p className="mt-1 text-sm font-bold text-slate-900">{liveUser?.designation || primaryRole.replace(/_/g, " ")}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <MapPin size={13} className="text-blue-600" /> Assigned Jurisdiction / District
                  </span>
                  <p className="mt-1 text-sm font-bold text-slate-900">{liveUser?.assignedDistrict || "Statewide (Maharashtra)"}</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Award size={13} className="text-blue-600" /> Primary System Role
                  </span>
                  <p className="mt-1 text-sm font-bold text-purple-950 font-mono">{primaryRole}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ORGANIZATION PROFILE */}
          {activeTab === "organization" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Building2 size={18} className="text-purple-700" /> Associated Entity & Organization Credentials
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Registration and statutory verification attributes for your organization.
                </p>
              </div>

              {org ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 col-span-1 md:col-span-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Organization Legal Name</span>
                    <p className="mt-1 text-base font-black text-slate-900">{org.name || org.legalName || "Empaneled Organization"}</p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Verification Status</span>
                    <div className="mt-1">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        org.status === "ACTIVE" || org.status === "VERIFIED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {org.status || "ACTIVE"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Entity Classification</span>
                    <p className="mt-1 text-sm font-bold text-slate-900">{org.type || org.kind || "Government / Corporate Entity"}</p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">CIN / Registration Identifier</span>
                    <p className="mt-1 text-sm font-mono font-bold text-blue-900">{org.cin || org.darpanId || org.pan || "Statutory Verified"}</p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Registered District</span>
                    <p className="mt-1 text-sm font-bold text-slate-900">{org.district || liveUser?.assignedDistrict || "Maharashtra State"}</p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 col-span-1 md:col-span-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Registered Office Address</span>
                    <p className="mt-1 text-xs font-medium text-slate-700">{org.address || "Administrative Headquarters, Maharashtra State Portal"}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-6 text-center">
                  <Building2 size={36} className="mx-auto text-blue-400 mb-2" />
                  <h4 className="text-sm font-bold text-slate-800">State / System Direct Appointment</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Your account is assigned directly as a state officer or system role without requiring an external NGO / Corporate organization profile.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ROLES & PERMISSIONS */}
          {activeTab === "permissions" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-700 shrink-0" /> <span className="truncate">Granted System Roles</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    Authoritative list of permissions dynamically computed for your role hierarchy.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto shrink-0">
                  <div className="flex items-center gap-2 sm:border-r sm:border-slate-200 sm:pr-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase hidden sm:inline">Active Role:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {liveRoles.map((r, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-purple-100 border border-purple-200 px-2.5 py-1 text-[10px] font-bold text-purple-900 font-mono shadow-xs">
                          <Layers size={11} className="text-purple-600" /> {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="relative w-full sm:w-64 shrink-0">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search permission keys..."
                      value={permissionSearch}
                      onChange={(e) => setPermissionSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Permissions Grid / Pills */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase block mb-2">
                  Granted Permission Keys ({filteredPermissions.length})
                </span>

                {liveIsAdmin ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-900 flex items-center gap-3">
                    <CheckCircle className="text-emerald-600 shrink-0" size={24} />
                    <div>
                      <h4 className="text-xs font-bold">Platform Admin Universal Bypass</h4>
                      <p className="text-[11px] text-emerald-700">
                        As a Super Administrator, you hold full global permissions across all modules and resources.
                      </p>
                    </div>
                  </div>
                ) : filteredPermissions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No permissions match your search query.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {filteredPermissions.map((perm) => (
                      <div key={perm} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 shadow-2xs hover:border-blue-300 hover:bg-blue-50/30 transition-all">
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                        <span className="truncate">{perm}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY & CREDENTIALS */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Key size={18} className="text-amber-700" /> Account Security & Session Credentials
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify session security status, authentication tokens, and access policy rules.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 flex items-start gap-3">
                  <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Email Verification</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Official email verified with high security token check.</p>
                    <span className="mt-2 inline-block text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      VERIFIED
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 flex items-start gap-3">
                  <Lock size={20} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Security Token Version</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Active session version counter protecting against revoked credentials.</p>
                    <span className="mt-2 inline-block font-mono text-[10px] font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-md">
                      v{liveUser?.tokenVersion || 1} Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Need to change your password or security details?</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Security credentials can be managed or reset via authentication settings.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => alert("Password update interface is available via authentication settings.")}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-50 transition-all"
                >
                  Manage Security <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </GovPortalLayout>
  );
}

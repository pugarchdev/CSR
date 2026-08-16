// Access Control Overview — KPI Dashboard with navigation cards
"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Shield, Users, Key,
  ChevronRight, Activity, Clock, ShieldAlert
} from "lucide-react";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import AccessControlTabs from "@/components/access-control/AccessControlTabs";
import { useOverviewStats } from "@/hooks/useAccessControl";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import "@/styles/gov-theme.css";

const NAV_CARDS = [
  {
    title: "Roles",
    description: "View and manage system & custom roles, edit permission matrices, and control role lifecycle.",
    route: "/admin/access-control/roles",
    icon: Shield,
    permission: "role:view",
    colorTheme: "blue" as const,
  },
  {
    title: "Permissions",
    description: "Browse the authoritative permission catalog grouped by module and risk level.",
    route: "/admin/access-control/permissions",
    icon: Key,
    permission: "role:view",
    colorTheme: "purple" as const,
  },
  {
    title: "Assignments",
    description: "Manage user-to-role assignments with scope, validity dates, and revocation controls.",
    route: "/admin/access-control/assignments",
    icon: Users,
    permission: "user:view",
    colorTheme: "emerald" as const,
  },
  {
    title: "Audit Log",
    description: "Inspect all access control changes with actor, action, diff, and correlation tracking.",
    route: "/admin/access-control/audit",
    icon: Activity,
    permission: "user:view",
    colorTheme: "amber" as const,
  },
];

export default function AccessControlOverviewPage() {
  const { data: stats, isLoading, error } = useOverviewStats();
  const { hasPermission } = useAuthStore();
  const router = useRouter();

  return (
    <GovPortalLayout>
      <GovPageHeader
        title="Access Control"
        breadcrumb="Administration"
        description="Manage roles, permissions, assignments, and audit trails."
      />

      <AccessControlTabs />

      <div className="space-y-6">
        {/* KPI Stat Cards */}
        <StatCardGroup columns={4}>
          <StatCard
            label="Total Roles"
            value={stats?.totalRoles ?? 0}
            icon={Shield}
            index={0}
            colorTheme="blue"
            badge={isLoading ? "Loading..." : undefined}
            sublabel={`${stats?.systemRoles ?? 0} system · ${stats?.customRoles ?? 0} custom`}
          />
          <StatCard
            label="Custom Roles"
            value={stats?.customRoles ?? 0}
            icon={Shield}
            index={1}
            colorTheme="purple"
            sublabel="Organization-specific"
          />
          <StatCard
            label="Active Assignments"
            value={stats?.activeAssignments ?? 0}
            icon={Users}
            index={2}
            colorTheme="emerald"
            sublabel="Currently active"
          />
          <StatCard
            label="High-Risk Permissions"
            value={stats?.highRiskPermissionsCount ?? 0}
            icon={ShieldAlert}
            index={3}
            colorTheme="rose"
            sublabel="HIGH + CRITICAL level"
          />
        </StatCardGroup>

        {/* Error state */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-sm text-red-700">
            Failed to load overview statistics. {error instanceof Error ? error.message : "Unknown error"}
          </div>
        )}

        {/* Navigation Cards */}
        <div>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
            Management Areas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {NAV_CARDS.map((card, index) => {
              const isAllowed = hasPermission(card.permission);
              const IconComponent = card.icon;

              return (
                <motion.button
                  key={card.route}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  whileHover={isAllowed ? { y: -4, scale: 1.015 } : undefined}
                  onClick={() => isAllowed && router.push(card.route)}
                  disabled={!isAllowed}
                  className={`group text-left p-5 rounded-2xl border transition-all duration-200 ${
                    isAllowed
                      ? "bg-white/70 backdrop-blur-xl border-slate-200/60 shadow-sm hover:shadow-lg hover:border-blue-300/60 cursor-pointer"
                      : "bg-slate-50/50 border-slate-200/40 opacity-60 cursor-not-allowed"
                  }`}
                  aria-label={`Navigate to ${card.title}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                      <IconComponent size={20} />
                    </div>
                    {isAllowed && (
                      <ChevronRight
                        size={16}
                        className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"
                      />
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">{card.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{card.description}</p>
                  {!isAllowed && (
                    <Badge variant="muted" size="sm" className="mt-3">
                      Requires {card.permission}
                    </Badge>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Quick Stats Footer */}
        {stats && (
          <div className="flex items-center justify-between p-4 bg-slate-50/60 rounded-xl border border-slate-200/40">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock size={12} />
              <span>
                Last updated: {new Date(stats.timestamp).toLocaleString()}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/admin/access-control/roles")}
            >
              Manage Roles →
            </Button>
          </div>
        )}
      </div>
    </GovPortalLayout>
  );
}

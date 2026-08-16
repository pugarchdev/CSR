"use client";

import Link from "next/link";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { StandardPageHeader } from "@/components/layout/StandardPageHeader";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";
import AssignmentTabs from "@/components/assignments/AssignmentTabs";
import { ShieldCheck, Building2, Landmark, Users, ArrowRight } from "lucide-react";
import "@/styles/gov-theme.css";

const QUEUE_CARDS = [
  {
    title: "Government Ownership & Acceptance",
    description: "Assign JS-approved cases to the correct State or District CSR Cell, record Nodal acceptance, Head reassignment, and district correction escalation.",
    href: "/assignments/government",
    icon: Landmark,
    badge: "Role-scoped workflow",
    color: "blue" as const,
  },
  {
    title: "DNC Delegation Queue",
    description: "Manage project delegation to District Nodal Officers (DNO) for your assigned district.",
    href: "/assignments/dnc",
    icon: ShieldCheck,
    badge: "District Nodal Consultant",
    color: "emerald" as const,
  },
  {
    title: "Department Officer Assignment Queue",
    description: "Designate project officers and nodal representatives for approved departmental CSR projects.",
    href: "/assignments/gov-admin",
    icon: Building2,
    badge: "Department Admin",
    color: "indigo" as const,
  },
];

export default function AssignmentsOverviewPage() {
  return (
    <GovPortalLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 text-slate-900">
        <StandardPageHeader
          title="Project Assignments & Nodal Delegation"
          category="Projects & Governance"
          description="Unified delegation workspace for assigning Joint Secretary approved cases to State/District CSR Cells and Department Officers."
        />

        {/* Standard 4-Column KPI Cards */}
        <StatCardGroup columns={4}>
          <StatCard
            label="Active Queues"
            value={3}
            icon={Landmark}
            index={0}
            colorTheme="blue"
            sublabel="Assignment channels"
          />
          <StatCard
            label="State / District Cell"
            value="Operational"
            icon={Building2}
            index={1}
            colorTheme="emerald"
            sublabel="Direct cell routing"
          />
          <StatCard
            label="DNC Delegation"
            value="Active"
            icon={ShieldCheck}
            index={2}
            colorTheme="purple"
            sublabel="District nodal dispatch"
          />
          <StatCard
            label="Officer Designation"
            value="Configured"
            icon={Users}
            index={3}
            colorTheme="amber"
            sublabel="Department admin desk"
          />
        </StatCardGroup>

        <AssignmentTabs />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {QUEUE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group flex flex-col justify-between p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-xl hover:border-blue-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Icon size={22} />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                      {card.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-900 transition-colors mb-2">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="mt-6 flex items-center text-xs font-bold text-blue-700 group-hover:translate-x-1 transition-transform">
                  <span>Open Queue</span>
                  <ArrowRight size={14} className="ml-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </GovPortalLayout>
  );
}


"use client";

import Link from "next/link";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import AssignmentTabs from "@/components/assignments/AssignmentTabs";
import { ShieldCheck, Building2, Landmark } from "lucide-react";
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
    color: "blue" as const,
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
      <GovPageHeader
        title="Project Assignments"
        breadcrumb="Projects"
        description="Unified delegation and officer assignment workspace."
      />

      <AssignmentTabs />

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {QUEUE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group flex flex-col justify-between p-6 bg-white border border-slate-200/80 rounded-2xl shadow-2xs hover:shadow-md hover:border-blue-300 transition-all"
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
                  <span>Open Queue →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </GovPortalLayout>
  );
}

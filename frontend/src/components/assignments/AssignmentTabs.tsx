"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserCheck, ShieldCheck, Building2, Landmark } from "lucide-react";

const TABS = [
  { label: "Overview", href: "/assignments", icon: UserCheck },
  { label: "Government Ownership", href: "/assignments/government", icon: Landmark },
  { label: "DNC Delegation", href: "/assignments/dnc", icon: ShieldCheck },
  { label: "Department Officer Assignment", href: "/assignments/gov-admin", icon: Building2 },
];

export function AssignmentTabs() {
  const pathname = usePathname() || "";

  return (
    <nav
      aria-label="Assignments Queue Navigation"
      className="flex border-b border-slate-200/80 mb-6 space-x-1 overflow-x-auto bg-slate-50/50 p-1 rounded-xl"
    >
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all rounded-lg whitespace-nowrap ${
              isActive
                ? "bg-white text-blue-900 shadow-2xs border border-slate-200 font-extrabold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
            }`}
          >
            <Icon size={15} className={isActive ? "text-blue-700" : "text-slate-400"} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default AssignmentTabs;

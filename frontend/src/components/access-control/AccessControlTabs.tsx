"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Key, Users, Activity } from "lucide-react";

const TABS = [
  { label: "Roles", href: "/admin/access-control/roles", icon: Shield },
  { label: "Permissions", href: "/admin/access-control/permissions", icon: Key },
  { label: "Role Assignments", href: "/admin/access-control/assignments", icon: Users },
  { label: "Audit History", href: "/admin/access-control/audit", icon: Activity },
];

export function AccessControlTabs() {
  const pathname = usePathname() || "";

  return (
    <nav
      aria-label="Access Control Navigation"
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

export default AccessControlTabs;

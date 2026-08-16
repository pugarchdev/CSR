"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { resolveDashboardPath } from "@/lib/roleRouting";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface StandardPageHeaderProps {
  title: string;
  description?: string;
  category?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  className?: string;
}

export function StandardPageHeader({
  title,
  description,
  category,
  breadcrumbs = [],
  actions,
  className = ""
}: StandardPageHeaderProps) {
  const user = useAuthStore((s) => s.user);
  const homeHref = user ? resolveDashboardPath(user, "/dashboard") : "/";

  return (
    <div className={`mb-6 space-y-2 ${className}`}>
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Link
            href={homeHref}
            className="hover:text-blue-700 transition-colors flex items-center gap-1"
            title="Dashboard"
          >
            <Home size={13} className="text-slate-400" />
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center gap-1.5">
              <ChevronRight size={12} className="text-slate-400 shrink-0" />
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="hover:text-blue-700 transition-colors text-slate-600 truncate max-w-[150px] sm:max-w-none"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-semibold text-slate-900 truncate max-w-[150px] sm:max-w-none">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Main Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-0.5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 font-heading tracking-tight">
              {title}
            </h1>
            {category && (
              <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-700 shadow-2xs">
                {category}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export default StandardPageHeader;

"use client";

import { ReactNode } from "react";
import "@/styles/gov-theme.css";

interface GovPageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: string;
  eyebrow?: string;
  actions?: ReactNode;
}

/**
 * Super-compact, space-saving single-line header.
 * Eliminates bulky banner height so workspace cards & main content take center stage immediately.
 */
export function GovPageHeader({
  title,
  description: _description,
  breadcrumb,
  eyebrow,
  actions,
}: GovPageHeaderProps) {
  const badgeText = eyebrow || breadcrumb;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200/60 pb-2.5 mb-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="text-lg font-black tracking-tight text-slate-950 font-heading">
          {title}
        </h1>
        {badgeText && (
          <span className="text-[10.5px] font-bold text-blue-800 bg-blue-50 border border-blue-200/70 px-2.5 py-0.5 rounded-full">
            {badgeText}
          </span>
        )}
      </div>

      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export default GovPageHeader;

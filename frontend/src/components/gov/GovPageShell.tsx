"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import "@/styles/gov-theme.css";

interface GovPageShellProps {
  breadcrumb: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Common inner-page wrapper with breadcrumb, title, subtitle, and right-side actions.
 * Redesigned with Framer Motion entry animations.
 */
export default function GovPageShell({
  breadcrumb,
  title,
  description,
  actions,
  children,
}: GovPageShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-200/60 pb-2.5 mb-3.5">
        <div>
          <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">
            {breadcrumb}
          </div>
          <h1 className="text-xl font-black text-slate-950 tracking-tight font-heading">{title}</h1>
          {description && <p className="text-xs text-slate-500 mt-0.5 leading-normal max-w-4xl">{description}</p>}
        </div>
        {actions && <div className="flex gap-2 flex-shrink-0">{actions}</div>}
      </div>
      <div className="animate-fade-in-up">
        {children}
      </div>
    </motion.div>
  );
}

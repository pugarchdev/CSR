"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, Info, ArrowRight, ShieldAlert } from "lucide-react";

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: "critical" | "warning" | "info";
  entityType?: string;
  actionHref?: string;
  actionLabel?: string;
  createdAt: string;
}

interface AlertsSectionProps {
  alerts: AlertItem[];
}

export const AlertsSection: React.FC<AlertsSectionProps> = ({ alerts }) => {
  if (!alerts || alerts.length === 0) return null;

  const getSeverityTheme = (sev: AlertItem["severity"]) => {
    switch (sev) {
      case "critical":
        return {
          border: "border-rose-200/90",
          bg: "bg-gradient-to-r from-rose-50/90 via-red-50/60 to-white",
          iconBg: "bg-rose-100 text-rose-700",
          titleColor: "text-rose-950",
          textColor: "text-rose-800",
          buttonBg: "bg-rose-700 hover:bg-rose-800 text-white",
          Icon: ShieldAlert
        };
      case "warning":
        return {
          border: "border-amber-200/90",
          bg: "bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-white",
          iconBg: "bg-amber-100 text-amber-800",
          titleColor: "text-amber-950",
          textColor: "text-amber-800",
          buttonBg: "bg-amber-700 hover:bg-amber-800 text-white",
          Icon: AlertTriangle
        };
      default:
        return {
          border: "border-blue-200/90",
          bg: "bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-white",
          iconBg: "bg-blue-100 text-blue-800",
          titleColor: "text-blue-950",
          textColor: "text-blue-800",
          buttonBg: "bg-blue-800 hover:bg-blue-900 text-white",
          Icon: Info
        };
    }
  };

  return (
    <section aria-labelledby="alerts-heading" className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-100 text-rose-800">
          <AlertCircle size={15} />
        </div>
        <h2 id="alerts-heading" className="font-heading text-xs font-extrabold uppercase tracking-wider text-rose-900">
          Active Alerts & Operational Exceptions ({alerts.length})
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {alerts.map((alert) => {
          const theme = getSeverityTheme(alert.severity);
          const Icon = theme.Icon;

          return (
            <div
              key={alert.id}
              className={`relative overflow-hidden rounded-2xl border ${theme.border} ${theme.bg} p-4 shadow-2xs flex flex-col justify-between`}
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-xl p-2 shrink-0 ${theme.iconBg}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={`text-xs font-extrabold ${theme.titleColor}`}>{alert.title}</h3>
                  <p className={`mt-1 text-[11px] font-medium leading-relaxed ${theme.textColor}`}>
                    {alert.message}
                  </p>
                </div>
              </div>

              {alert.actionHref && alert.actionLabel && (
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-end">
                  <Link
                    href={alert.actionHref}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-[11px] font-bold ${theme.buttonBg} shadow-2xs transition hover:no-underline`}
                  >
                    <span>{alert.actionLabel}</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

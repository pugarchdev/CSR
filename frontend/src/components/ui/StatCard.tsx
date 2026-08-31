"use client";

import React, { useState, useEffect } from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  index?: number;
  badge?: string;
  sublabel?: string;
  colorTheme?: "blue" | "purple" | "emerald" | "amber" | "sky" | "indigo" | "teal" | "rose";
  className?: string;
  onClick?: () => void;
}

function Counter({ value }: { value: number | string }) {
  const [display, setDisplay] = useState<string | number>(value);

  useEffect(() => {
    const raw = String(value);
    const match = raw.match(/[\d.]+/);
    if (!match) {
      setDisplay(value);
      return;
    }

    const target = parseFloat(match[0]);
    if (isNaN(target) || target === 0) {
      setDisplay(raw);
      return;
    }

    const hasDecimal = match[0].includes(".");
    const startTime = performance.now();
    const duration = 450;

    let frame: number;

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = target * ease;
      const formatted = hasDecimal ? current.toFixed(1) : Math.round(current);
      setDisplay(raw.replace(/[\d.]+/, String(formatted)));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span>{display}</span>;
}

const THEMES = {
  blue: {
    bg: "bg-gradient-to-br from-white via-white to-blue-50/40 hover:to-blue-50/70",
    border: "border-slate-200/90 hover:border-blue-300/80 hover:shadow-sm hover:shadow-blue-500/5",
    iconBox: "bg-blue-50 text-blue-700 border-blue-200/70 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600",
    badge: "bg-blue-50/90 text-blue-700 border-blue-200/70",
    dot: "bg-blue-600",
  },
  emerald: {
    bg: "bg-gradient-to-br from-white via-white to-emerald-50/40 hover:to-emerald-50/70",
    border: "border-slate-200/90 hover:border-emerald-300/80 hover:shadow-sm hover:shadow-emerald-500/5",
    iconBox: "bg-emerald-50 text-emerald-700 border-emerald-200/70 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600",
    badge: "bg-emerald-50/90 text-emerald-700 border-emerald-200/70",
    dot: "bg-emerald-600",
  },
  amber: {
    bg: "bg-gradient-to-br from-white via-white to-amber-50/40 hover:to-amber-50/70",
    border: "border-slate-200/90 hover:border-amber-300/80 hover:shadow-sm hover:shadow-amber-500/5",
    iconBox: "bg-amber-50 text-amber-700 border-amber-200/70 group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600",
    badge: "bg-amber-50/90 text-amber-800 border-amber-200/70",
    dot: "bg-amber-600",
  },
  purple: {
    bg: "bg-gradient-to-br from-white via-white to-purple-50/40 hover:to-purple-50/70",
    border: "border-slate-200/90 hover:border-purple-300/80 hover:shadow-sm hover:shadow-purple-500/5",
    iconBox: "bg-purple-50 text-purple-700 border-purple-200/70 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600",
    badge: "bg-purple-50/90 text-purple-700 border-purple-200/70",
    dot: "bg-purple-600",
  },
  indigo: {
    bg: "bg-gradient-to-br from-white via-white to-indigo-50/40 hover:to-indigo-50/70",
    border: "border-slate-200/90 hover:border-indigo-300/80 hover:shadow-sm hover:shadow-indigo-500/5",
    iconBox: "bg-indigo-50 text-indigo-700 border-indigo-200/70 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600",
    badge: "bg-indigo-50/90 text-indigo-700 border-indigo-200/70",
    dot: "bg-indigo-600",
  },
  teal: {
    bg: "bg-gradient-to-br from-white via-white to-teal-50/40 hover:to-teal-50/70",
    border: "border-slate-200/90 hover:border-teal-300/80 hover:shadow-sm hover:shadow-teal-500/5",
    iconBox: "bg-teal-50 text-teal-700 border-teal-200/70 group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600",
    badge: "bg-teal-50/90 text-teal-700 border-teal-200/70",
    dot: "bg-teal-600",
  },
  sky: {
    bg: "bg-gradient-to-br from-white via-white to-sky-50/40 hover:to-sky-50/70",
    border: "border-slate-200/90 hover:border-sky-300/80 hover:shadow-sm hover:shadow-sky-500/5",
    iconBox: "bg-sky-50 text-sky-700 border-sky-200/70 group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600",
    badge: "bg-sky-50/90 text-sky-700 border-sky-200/70",
    dot: "bg-sky-600",
  },
  rose: {
    bg: "bg-gradient-to-br from-white via-white to-rose-50/40 hover:to-rose-50/70",
    border: "border-slate-200/90 hover:border-rose-300/80 hover:shadow-sm hover:shadow-rose-500/5",
    iconBox: "bg-rose-50 text-rose-700 border-rose-200/70 group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-600",
    badge: "bg-rose-50/90 text-rose-700 border-rose-200/70",
    dot: "bg-rose-600",
  },
};

const DEFAULT_THEMES = ["blue", "emerald", "amber", "purple", "indigo", "teal", "sky", "rose"] as const;

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  index = 0,
  badge,
  sublabel,
  colorTheme,
  className,
  onClick
}: StatCardProps) {
  const themeKey = colorTheme || DEFAULT_THEMES[index % DEFAULT_THEMES.length];
  const theme = THEMES[themeKey] || THEMES.blue;

  return (
    <article
      onClick={onClick}
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border p-2.5 sm:p-3.5 shadow-2xs transition-all duration-200 ease-out hover:-translate-y-0.5",
        theme.bg,
        theme.border,
        onClick ? "cursor-pointer" : "cursor-default",
        className
      )}
    >
      {/* Top Header: Label on Left, Badge & Compact Icon on Right */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
          {label}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {badge && (
            <span className={cn("hidden sm:inline text-[9px] font-bold px-1.5 py-0.5 rounded-md font-mono border", theme.badge)}>
              {badge}
            </span>
          )}
          <div
            className={cn(
              "w-6 h-6 rounded-lg border shadow-2xs flex items-center justify-center shrink-0 transition-all duration-200 ease-out",
              theme.iconBox
            )}
          >
            <Icon size={13} />
          </div>
        </div>
      </div>

      {/* Metric Value & Trend */}
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <div className="text-xl sm:text-2xl font-black tracking-tight font-heading text-slate-900 leading-none">
          <Counter value={value} />
        </div>

        {trend && (
          <div className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border font-mono shrink-0",
            trend.positive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
          )}>
            {trend.positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            <span>{trend.positive ? "+" : ""}{trend.value}%</span>
          </div>
        )}
      </div>

      {/* Compact Sublabel */}
      {sublabel && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-slate-400 font-medium truncate">
          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", theme.dot)} />
          <span className="truncate">{sublabel}</span>
        </div>
      )}
    </article>
  );
}

// Stat Card Group Container
interface StatCardGroupProps {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
}

export function StatCardGroup({
  children,
  className,
  columns = 4
}: StatCardGroupProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
  };

  return (
    <div className={cn(
      "grid gap-2.5 sm:gap-3.5",
      gridCols[columns],
      className
    )}>
      {children}
    </div>
  );
}

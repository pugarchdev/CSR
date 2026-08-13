// Stat Card Component — Premium Enterprise 3D KPI Card with Animated Counter
"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
}

/** Smooth Count-up Shutter Animation Component */
function AnimatedCounter({ value }: { value: number | string }) {
  const [displayValue, setDisplayValue] = useState<string | number>(0);

  useEffect(() => {
    const strVal = String(value);
    const numericMatch = strVal.match(/[\d.]+/);
    if (!numericMatch) {
      setDisplayValue(value);
      return;
    }

    const targetNum = parseFloat(numericMatch[0]);
    if (isNaN(targetNum) || targetNum === 0) {
      setDisplayValue(strVal);
      return;
    }

    const isFloat = strVal.includes(".");
    const startTime = performance.now();
    const duration = 850; // Smooth 850ms shutter count-up

    let animationFrameId: number;

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Fast ease out cubic formula
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = targetNum * easeProgress;

      const formattedVal = isFloat ? currentVal.toFixed(1) : Math.round(currentVal);
      const output = strVal.replace(/[\d.]+/, String(formattedVal));
      setDisplayValue(output);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCounter);
      }
    };

    animationFrameId = requestAnimationFrame(updateCounter);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value]);

  return <span>{displayValue}</span>;
}

const COLOR_THEMES = {
  blue: {
    gradient: "from-blue-500 to-indigo-600",
    bgTint: "from-white via-blue-50/30 to-slate-50/50",
    borderHover: "hover:border-blue-400/80 hover:shadow-blue-500/10",
    badgeBg: "bg-blue-50/90 border-blue-200/80",
    badgeText: "text-blue-700",
    iconBg: "bg-blue-100/70 border-blue-200/80",
    iconText: "text-blue-600",
    metricColor: "text-blue-950",
  },
  purple: {
    gradient: "from-purple-500 to-indigo-600",
    bgTint: "from-white via-purple-50/30 to-slate-50/50",
    borderHover: "hover:border-purple-400/80 hover:shadow-purple-500/10",
    badgeBg: "bg-purple-50/90 border-purple-200/80",
    badgeText: "text-purple-700",
    iconBg: "bg-purple-100/70 border-purple-200/80",
    iconText: "text-purple-600",
    metricColor: "text-purple-950",
  },
  emerald: {
    gradient: "from-emerald-500 to-teal-600",
    bgTint: "from-white via-emerald-50/30 to-slate-50/50",
    borderHover: "hover:border-emerald-400/80 hover:shadow-emerald-500/10",
    badgeBg: "bg-emerald-50/90 border-emerald-200/80",
    badgeText: "text-emerald-700",
    iconBg: "bg-emerald-100/70 border-emerald-200/80",
    iconText: "text-emerald-600",
    metricColor: "text-emerald-950",
  },
  amber: {
    gradient: "from-amber-500 to-orange-600",
    bgTint: "from-white via-amber-50/30 to-slate-50/50",
    borderHover: "hover:border-amber-400/80 hover:shadow-amber-500/10",
    badgeBg: "bg-amber-50/90 border-amber-200/80",
    badgeText: "text-amber-800",
    iconBg: "bg-amber-100/70 border-amber-200/80",
    iconText: "text-amber-600",
    metricColor: "text-amber-950",
  },
  sky: {
    gradient: "from-sky-500 to-blue-600",
    bgTint: "from-white via-sky-50/30 to-slate-50/50",
    borderHover: "hover:border-sky-400/80 hover:shadow-sky-500/10",
    badgeBg: "bg-sky-50/90 border-sky-200/80",
    badgeText: "text-sky-700",
    iconBg: "bg-sky-100/70 border-sky-200/80",
    iconText: "text-sky-600",
    metricColor: "text-sky-950",
  },
  indigo: {
    gradient: "from-indigo-500 to-purple-600",
    bgTint: "from-white via-indigo-50/30 to-slate-50/50",
    borderHover: "hover:border-indigo-400/80 hover:shadow-indigo-500/10",
    badgeBg: "bg-indigo-50/90 border-indigo-200/80",
    badgeText: "text-indigo-700",
    iconBg: "bg-indigo-100/70 border-indigo-200/80",
    iconText: "text-indigo-600",
    metricColor: "text-indigo-950",
  },
  teal: {
    gradient: "from-teal-500 to-emerald-600",
    bgTint: "from-white via-teal-50/30 to-slate-50/50",
    borderHover: "hover:border-teal-400/80 hover:shadow-teal-500/10",
    badgeBg: "bg-teal-50/90 border-teal-200/80",
    badgeText: "text-teal-700",
    iconBg: "bg-teal-100/70 border-teal-200/80",
    iconText: "text-teal-600",
    metricColor: "text-teal-950",
  },
  rose: {
    gradient: "from-rose-500 to-red-600",
    bgTint: "from-white via-rose-50/30 to-slate-50/50",
    borderHover: "hover:border-rose-400/80 hover:shadow-rose-500/10",
    badgeBg: "bg-rose-50/90 border-rose-200/80",
    badgeText: "text-rose-700",
    iconBg: "bg-rose-100/70 border-rose-200/80",
    iconText: "text-rose-600",
    metricColor: "text-rose-950",
  },
};

const THEME_KEYS = ["blue", "purple", "emerald", "amber", "sky", "indigo", "teal", "rose"] as const;

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  index = 0,
  badge,
  sublabel,
  colorTheme,
  className
}: StatCardProps) {
  const themeKey = colorTheme || THEME_KEYS[index % THEME_KEYS.length];
  const theme = COLOR_THEMES[themeKey];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        y: -4,
        rotateX: 3,
        rotateY: -3,
        scale: 1.018,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className={cn(
        "group relative rounded-xl border border-slate-200/90 bg-gradient-to-br p-3.5 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer transform-gpu flex flex-col justify-between min-h-[112px] h-full overflow-hidden",
        theme.bgTint,
        theme.borderHover,
        className
      )}
      style={{ transformStyle: "preserve-3d", perspective: 1000 }}
    >
      {/* Top Colored Accent Stripe */}
      <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", theme.gradient)} />

      {/* Header Row with 3D Depth */}
      <div className="flex items-center justify-between relative z-10 pt-0.5" style={{ transform: "translateZ(8px)" }}>
        <div className="flex flex-col min-w-0 pr-1 flex-1">
          <span className="text-xs font-bold text-slate-900 group-hover:text-slate-950 transition-colors leading-tight line-clamp-2">
            {label}
          </span>
          {sublabel && (
            <span className="text-[9.5px] text-slate-500 font-medium line-clamp-1 mt-0.5">
              {sublabel}
            </span>
          )}
        </div>

        <div
          className={cn(
            "w-7 h-7 rounded-lg border shadow-2xs group-hover:scale-110 transition-all flex items-center justify-center shrink-0",
            theme.iconBg,
            theme.iconText
          )}
          style={{ transform: "translateZ(14px)" }}
        >
          <Icon size={14} />
        </div>
      </div>

      {/* Metric Value with Shutter Count-up & Context Badge / Trend */}
      <div className="flex items-baseline justify-between relative z-10 mt-1" style={{ transform: "translateZ(14px)" }}>
        <div className={cn("text-2xl font-black tracking-tight font-heading", theme.metricColor)}>
          <AnimatedCounter value={value} />
        </div>

        {trend ? (
          <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold shadow-2xs border font-mono",
            trend.positive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
          )}>
            {trend.positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            <span>{trend.positive ? "+" : ""}{trend.value}%</span>
          </div>
        ) : badge ? (
          <span className={cn("text-[9px] font-bold shadow-2xs px-2 py-0.5 rounded-md font-mono border", theme.badgeBg, theme.badgeText)}>
            {badge}
          </span>
        ) : null}
      </div>
    </motion.div>
  );
}

// Stat Card Group
interface StatCardGroupProps {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
}

export function StatCardGroup({
  children,
  className,
  columns = 4
}: StatCardGroupProps) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn(
      "grid gap-4",
      gridCols[columns],
      className
    )}>
      {children}
    </div>
  );
}


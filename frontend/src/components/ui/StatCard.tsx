// Stat Card Component — Premium SaaS with Animated Counter
"use client";

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
  className?: string;
}

export function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  trend, 
  index = 0,
  className 
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay: index * 0.06, 
        duration: 0.4, 
        ease: [0.16, 1, 0.3, 1] 
      }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={cn(
        "relative overflow-hidden",
        "bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl p-5",
        "shadow-glass hover:shadow-glass-lg transition-all duration-300",
        className
      )}
    >
      {/* Gradient top accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/40 via-indigo-500/40 to-purple-500/40" />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums animate-counter">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {trend && (
            <div className={cn(
              "mt-2 flex items-center gap-1.5 text-sm",
              trend.positive ? "text-emerald-600" : "text-red-600"
            )}>
              {trend.positive ? (
                <TrendingUp size={14} />
              ) : (
                <TrendingDown size={14} />
              )}
              <span className="font-semibold">
                {trend.positive ? "+" : ""}{trend.value}%
              </span>
              <span className="text-slate-400 text-xs">vs last period</span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
          <Icon size={22} />
        </div>
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

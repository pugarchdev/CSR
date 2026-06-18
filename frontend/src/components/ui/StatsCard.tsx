import React from "react";
import { Card } from "./Card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string; size?: string | number }>;
  trend?: {
    value: string;
    positive: boolean;
  };
  className?: string;
}

export function StatsCard({ label, value, icon: Icon, trend, className }: StatsCardProps) {
  return (
    <Card className={cn("flex justify-between items-center", className)}>
      <div className="flex flex-col gap-2">
        <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider">{label}</span>
        <span className="font-heading font-extrabold text-3xl text-slate-900 tracking-tight leading-none">{value}</span>
        
        {trend && (
          <span className={cn(
            "text-xs font-semibold mt-1 flex items-center gap-1",
            trend.positive ? "text-emerald-600" : "text-rose-600"
          )}>
            {trend.positive ? "+" : "-"}{trend.value} from last audit
          </span>
        )}
      </div>

      <div className="bg-[#1e3a8a]/10 border border-[#1e3a8a]/20 p-3.5 rounded-xl text-[#1e3a8a] flex items-center justify-center">
        <Icon size={22} />
      </div>
    </Card>
  );
}

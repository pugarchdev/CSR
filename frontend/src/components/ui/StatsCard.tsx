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
        <span className="text-[#6b7280] font-semibold text-[11px] uppercase tracking-wider">{label}</span>
        <span className="font-heading font-bold text-3xl text-[#14274e] leading-none">{value}</span>

        {trend && (
          <span className={cn(
            "text-xs font-semibold mt-1 flex items-center gap-1",
            trend.positive ? "text-[#2e7d32]" : "text-[#c62828]"
          )}>
            {trend.positive ? "+" : "-"}{trend.value} from last audit
          </span>
        )}
      </div>

      <div className="bg-[#e3f0fa] border border-[#c4ddf2] p-3.5 rounded-lg text-[#14274e] flex items-center justify-center">
        <Icon size={22} />
      </div>
    </Card>
  );
}

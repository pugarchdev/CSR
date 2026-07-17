// Badge Component — Premium SaaS Pill Style
"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "primary" | "success" | "warning" | "danger" | "info" | "muted" | "glass";
type BadgeSize = "sm" | "md";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  primary: "bg-blue-50 text-blue-700 border-blue-200/60",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  warning: "bg-amber-50 text-amber-700 border-amber-200/60",
  danger: "bg-red-50 text-red-700 border-red-200/60",
  info: "bg-sky-50 text-sky-700 border-sky-200/60",
  muted: "bg-slate-50 text-slate-600 border-slate-200/60",
  glass: "bg-white/60 backdrop-blur-sm text-slate-700 border-white/30",
};

const sizes: Record<BadgeSize, string> = {
  sm: "text-[10px] px-2 py-0.5",
  md: "text-xs px-2.5 py-0.5",
};

const dotColors: Record<BadgeVariant, string> = {
  primary: "bg-blue-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-sky-500",
  muted: "bg-slate-400",
  glass: "bg-slate-500",
};

export function Badge({ 
  children, 
  variant = "primary", 
  size = "md",
  dot = false,
  className 
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold rounded-full border tracking-wide uppercase",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span className={cn(
          "w-1.5 h-1.5 rounded-full",
          dotColors[variant],
          dot && "animate-pulse"
        )} />
      )}
      {children}
    </span>
  );
}

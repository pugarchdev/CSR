// Button Component — Premium SaaS Design
"use client";

import { ReactNode } from "react";
import { Loader2, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "warning" | "accent" | "gradient" | "glass";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  title?: string;
  icon?: LucideIcon;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm shadow-blue-500/20 hover:from-blue-700 hover:to-blue-800 hover:shadow-md hover:shadow-blue-500/25 active:from-blue-800 active:to-blue-900",
  secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger: "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm shadow-red-500/20 hover:from-red-600 hover:to-red-700",
  outline: "bg-white/80 backdrop-blur-sm border border-slate-200/80 text-slate-700 hover:bg-white hover:border-slate-300 hover:shadow-sm",
  warning: "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm shadow-amber-500/20 hover:from-amber-600 hover:to-amber-700",
  accent: "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700",
  gradient: "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30",
  glass: "bg-white/60 backdrop-blur-xl border border-white/30 text-slate-700 shadow-glass hover:bg-white/80 hover:shadow-glass-lg",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2.5 rounded-xl",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  onClick,
  className,
  type = "button",
  title,
  icon: Icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      title={title}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center font-semibold",
        "transition-all duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        "active:scale-[0.97]",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {!loading && Icon && <Icon size={size === "sm" ? 14 : 16} />}
      {children}
    </button>
  );
}

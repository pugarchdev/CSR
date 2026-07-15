import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-semibold rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#f7941d]/40 disabled:opacity-50 disabled:pointer-events-none";

  const variantStyles = {
    primary: "bg-[#1789d6] hover:bg-[#146fb0] text-white",
    secondary: "bg-[#f4f5f7] hover:bg-[#e0e4ea] text-[#333333] border border-[#c7cdd6]",
    accent: "bg-[#f7941d] hover:bg-[#e07f00] text-white",
    outline: "bg-transparent border border-[#14274e] hover:bg-[#e3f0fa] text-[#14274e]",
    ghost: "bg-transparent hover:bg-[#f4f5f7] text-[#4b5563] hover:text-[#14274e]",
    danger: "bg-[#c62828] hover:bg-[#a71f1f] text-white"
  };

  const sizeStyles = {
    sm: "py-1.5 px-3 text-xs",
    md: "py-2.5 px-5 text-sm",
    lg: "py-3.5 px-6 text-base"
  };

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

// Alert Component
"use client";

import { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "info" | "success" | "warning" | "error";

interface AlertProps {
  children: ReactNode;
  variant?: AlertVariant;
  className?: string;
  icon?: boolean;
}

const variantStyles: Record<AlertVariant, string> = {
  info: "bg-info-50 border-info-200 text-info-900",
  success: "bg-success-50 border-success-200 text-success-900",
  warning: "bg-warning-50 border-warning-200 text-warning-900",
  error: "bg-danger-50 border-danger-200 text-danger-900",
};

const variantIcons: Record<AlertVariant, typeof AlertCircle> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  error: XCircle,
};

export function Alert({ 
  children, 
  variant = "info", 
  className,
  icon = true 
}: AlertProps) {
  const Icon = variantIcons[variant];
  
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border",
        variantStyles[variant],
        className
      )}
    >
      {icon && (
        <Icon size={20} className="mt-0.5 shrink-0" />
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function AlertTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h4 className={cn("font-semibold text-sm", className)}>
      {children}
    </h4>
  );
}

export function AlertDescription({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-sm mt-1 opacity-90", className)}>
      {children}
    </p>
  );
}

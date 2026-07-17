// Empty State Component — Premium Design
"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  actionText,
  onAction,
  className
}: EmptyStateProps) {
  const primaryAction = action || (actionText && onAction ? { label: actionText, onClick: onAction } : undefined);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex flex-col items-center justify-center py-20 px-4 text-center",
        className
      )}
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl flex items-center justify-center text-blue-500 mb-5 shadow-sm"
      >
        <Icon size={28} />
      </motion.div>
      <h3 className="text-lg font-semibold text-slate-900 tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 max-w-sm leading-relaxed">{description}</p>
      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          {primaryAction && (
            <Button onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// Empty State for Tables
interface EmptyTableStateProps {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyTableState({
  title = "No data found",
  description = "There are no items to display at the moment.",
  action
}: EmptyTableStateProps) {
  return (
    <div className="py-16 px-4 text-center">
      <p className="text-slate-500 font-medium">{title}</p>
      <p className="text-sm text-slate-400 mt-1.5">{description}</p>
      {action && (
        <Button
          variant="outline"
          size="sm"
          onClick={action.onClick}
          className="mt-5"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

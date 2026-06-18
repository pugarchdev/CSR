import React from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ title, description, icon: Icon, actionText, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50 gap-6", className)}>
      <div className="bg-white border border-slate-200 p-4 rounded-xl text-[#1e3a8a] shadow-sm flex items-center justify-center">
        <Icon size={32} />
      </div>

      <div className="flex flex-col gap-1.5 max-w-sm">
        <h3 className="font-heading font-bold text-lg text-slate-900 tracking-tight">{title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
      </div>

      {actionText && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}

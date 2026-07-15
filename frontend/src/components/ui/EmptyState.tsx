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
    <div className={cn("flex flex-col items-center justify-center p-12 text-center rounded-lg border border-dashed border-[#c7cdd6] bg-[#f4f5f7] gap-6", className)}>
      <div className="bg-white border border-[#e0e4ea] p-4 rounded-lg text-[#14274e] flex items-center justify-center">
        <Icon size={32} />
      </div>

      <div className="flex flex-col gap-1.5 max-w-sm">
        <h3 className="font-heading font-bold text-lg text-[#14274e] tracking-tight">{title}</h3>
        <p className="text-[#6b7280] text-sm leading-relaxed">{description}</p>
      </div>

      {actionText && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}

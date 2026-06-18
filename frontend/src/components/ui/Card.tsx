import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverGlow?: boolean;
  clickable?: boolean;
}

export function Card({ children, className, hoverGlow = true, clickable = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-slate-200 p-6 relative overflow-hidden shadow-sm",
        hoverGlow && "hover:border-[#1e3a8a]/30 hover:shadow-md",
        clickable && "cursor-pointer transform hover:translate-y-[-2px] active:translate-y-[0px]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-1.5 pb-4 border-b border-slate-200 mb-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-slate-600 text-sm leading-relaxed", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-3 pt-4 border-t border-slate-200 mt-4", className)} {...props}>
      {children}
    </div>
  );
}

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
        "bg-white rounded-lg border border-[#e0e4ea] p-6 relative overflow-hidden",
        hoverGlow && "hover:border-[#c7cdd6]",
        clickable && "cursor-pointer",
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
    <div className={cn("flex flex-col gap-1.5 pb-4 border-b border-[#e0e4ea] mb-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-[#4b5563] text-sm leading-relaxed", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-3 pt-4 border-t border-[#e0e4ea] mt-4", className)} {...props}>
      {children}
    </div>
  );
}

// Dashboard Layout Component - Unified with SaaSLayout shell to prevent layout duplication
"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
  userRole?: string;
  userName?: string;
  userEmail?: string;
  sidebarItems?: any[];
  notificationCount?: number;
  messageCount?: number;
  className?: string;
}

export function DashboardLayout({
  children,
  className
}: DashboardLayoutProps) {
  return (
    <div className={cn("w-full transition-all duration-150", className)}>
      {children}
    </div>
  );
}

// Module Card Component for Dashboards — Premium SaaS Design
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { LucideIcon, ArrowRight } from "lucide-react";
import { Badge } from "./Badge";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  status?: string;
  statusVariant?: "primary" | "success" | "warning" | "danger" | "info" | "muted" | "glass";
  index?: number;
  className?: string;
}

export function ModuleCard({ 
  title, 
  description, 
  href, 
  icon: Icon, 
  status, 
  statusVariant = "info",
  index = 0,
  className 
}: ModuleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay: index * 0.05, 
        duration: 0.4, 
        ease: [0.16, 1, 0.3, 1] 
      }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      <Link
        href={href}
        className={cn(
          "block h-full bg-white/75 backdrop-blur-xl border border-white/20 rounded-2xl p-5",
          "shadow-glass hover:shadow-glass-lg transition-all duration-300",
          "group",
          className
        )}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:text-blue-700 transition-colors shrink-0 shadow-sm">
            <Icon size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate tracking-tight">
                {title}
              </h3>
              {status && (
                <Badge variant={statusVariant} size="sm">
                  {status}
                </Badge>
              )}
            </div>
            <p className="mt-1.5 text-sm text-slate-500 line-clamp-2 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="mt-5 flex items-center text-xs font-semibold text-blue-600 group-hover:text-blue-700 uppercase tracking-wider">
          Open Module
          <ArrowRight size={14} className="ml-1.5 group-hover:translate-x-1 transition-transform" />
        </div>
      </Link>
    </motion.div>
  );
}

// Module Card Grid
interface ModuleCardGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3;
}

export function ModuleCardGrid({ 
  children, 
  className,
  columns = 3 
}: ModuleCardGridProps) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  };

  return (
    <div className={cn(
      "grid gap-4",
      gridCols[columns],
      className
    )}>
      {children}
    </div>
  );
}

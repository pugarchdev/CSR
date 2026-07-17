// Sidebar Component with Animations
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronLeft, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SidebarItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  children?: SidebarItem[];
}

interface SidebarProps {
  items: SidebarItem[];
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  className?: string;
}

export function Sidebar({ 
  items, 
  collapsed = false,
  onCollapse,
  className 
}: SidebarProps) {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => 
      prev.includes(label) 
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed left-0 top-16 bottom-0 bg-white border-r border-gray-200 z-40",
        className
      )}
    >
      {/* Collapse Toggle */}
      <button
        onClick={() => onCollapse?.(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors shadow-sm"
      >
        <motion.div
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronLeft size={14} />
        </motion.div>
      </button>

      <nav className="p-3 space-y-1 h-full overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedGroups.includes(item.label);
          const Icon = item.icon;

          return (
            <div key={item.label}>
              <Link
                href={item.href}
                onClick={(e) => {
                  if (hasChildren) {
                    e.preventDefault();
                    toggleGroup(item.label);
                  }
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150",
                  isActive 
                    ? "bg-primary-50 text-primary-700 font-medium" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon size={20} className="shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-sm truncate">{item.label}</span>
                    {item.badge && (
                      <span className="bg-primary-100 text-primary-700 text-xs font-medium px-2 py-0.5 rounded-full shrink-0">
                        {item.badge}
                      </span>
                    )}
                    {hasChildren && (
                      <motion.span
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="shrink-0"
                      >
                        <ChevronRight size={14} />
                      </motion.span>
                    )}
                  </>
                )}
              </Link>

              {/* Submenu */}
              <AnimatePresence>
                {!collapsed && hasChildren && isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-6 pl-3 border-l border-gray-200 mt-1 space-y-1">
                      {item.children!.map((child) => (
                        <Link
                          key={child.label}
                          href={child.href}
                          className={cn(
                            "block px-3 py-2 rounded-lg text-sm transition-colors",
                            pathname === child.href
                              ? "text-primary-700 font-medium"
                              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                          )}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>
    </motion.aside>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, ChevronDown, LayoutDashboard, FileText,
  Briefcase, Building2, DollarSign, Shield, HelpCircle, Send, Heart,
  ClipboardCheck, ListTodo, Store, UserCheck, Flag, Search, CheckCircle,
  Building, Users, FileCheck, UserPlus, BarChart3, ShieldAlert, UserCog,
  CheckSquare, Sliders, AlertTriangle, ShieldCheck, LucideIcon
} from "lucide-react";
import {
  NAVIGATION_GROUPS,
  NAVIGATION_MANIFEST,
  isNavItemAllowed,
  NavItemDef,
  NavGroupDef
} from "@/lib/navigationManifest";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, FileText, Send, Heart, ClipboardCheck, ListTodo, Store,
  Briefcase, UserCheck, Flag, Search, CheckCircle, Building2, Building,
  Users, FileCheck, UserPlus, DollarSign, BarChart3, ShieldAlert, UserCog,
  Shield, CheckSquare, Sliders, HelpCircle, AlertTriangle, ShieldCheck
};

export interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  children?: SidebarItem[];
}

export function resolveNavIcon(name: string): LucideIcon {
  return ICON_MAP[name] || FileText;
}

export function getActiveNavContext(pathname: string) {
  let matchedItem = NAVIGATION_MANIFEST.find((item) => item.route === pathname);

  if (!matchedItem) {
    const candidates = NAVIGATION_MANIFEST.filter((item) =>
      pathname === item.route || pathname.startsWith(item.route + "/")
    );
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.route.length - a.route.length);
      matchedItem = candidates[0];
    }
  }

  if (!matchedItem) {
    return { activeItemId: null, activeGroupId: null };
  }

  let activeItemId = matchedItem.id;
  if (matchedItem.navigationLevel === "WORKSPACE_TAB" && matchedItem.parentNavId) {
    activeItemId = matchedItem.parentNavId;
  }

  const activeItemDef = NAVIGATION_MANIFEST.find((i) => i.id === activeItemId);
  const activeGroupId = activeItemDef?.parentNavId || null;

  return { activeItemId, activeGroupId };
}

interface SidebarProps {
  collapsed?: boolean;
  onCollapseToggle?: () => void;
  hovered?: boolean;
  onHoverChange?: (hovered: boolean) => void;
  className?: string;
  tenantFeatures?: Record<string, boolean>;
}

export function Sidebar({
  collapsed = false,
  onCollapseToggle,
  hovered = false,
  onHoverChange,
  className,
  tenantFeatures
}: SidebarProps) {
  const pathname = usePathname() || "";
  const { hasPermission, isAdmin, isLoadingPermissions, fetchStatus } = useAuthStore();

  const [internalHovered, setInternalHovered] = useState(false);
  const isHovered = hovered || internalHovered;
  const isEffectiveExpanded = !collapsed || isHovered;

  const handleMouseEnter = () => {
    setInternalHovered(true);
    if (onHoverChange) onHoverChange(true);
  };

  const handleMouseLeave = () => {
    setInternalHovered(false);
    if (onHoverChange) onHoverChange(false);
  };

  const { activeItemId, activeGroupId } = useMemo(() => getActiveNavContext(pathname), [pathname]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(activeGroupId);

  // Auto-expand group containing the active route
  useEffect(() => {
    if (activeGroupId) {
      setExpandedGroup(activeGroupId);
    }
  }, [activeGroupId]);

  const toggleGroup = (groupId: string) => {
    if (collapsed && onCollapseToggle) {
      onCollapseToggle();
      setExpandedGroup(groupId);
    } else {
      setExpandedGroup((prev) => (prev === groupId ? null : groupId));
    }
  };

  // Filter items by permission, feature flag, and scope
  const { visibleDashboard, visibleGroups } = useMemo(() => {
    if (fetchStatus === "ERROR") {
      return { visibleDashboard: null, visibleGroups: [] };
    }

    const dashboardItem = NAVIGATION_MANIFEST.find((i) => i.id === "dashboard");
    const canSeeDashboard = dashboardItem
      ? isNavItemAllowed(dashboardItem, hasPermission, isAdmin)
      : false;

    const filteredGroups = NAVIGATION_GROUPS.map((group) => {
      const children = group.childIds
        .map((id) => NAVIGATION_MANIFEST.find((item) => item.id === id))
        .filter((item): item is NavItemDef => {
          if (!item) return false;
          if (!item.showInSidebar) return false;
          if (item.featureFlag && tenantFeatures && tenantFeatures[item.featureFlag] === false) {
            return false;
          }
          return isNavItemAllowed(item, hasPermission, isAdmin);
        });

      return {
        ...group,
        children
      };
    }).filter((group) => group.children.length > 0);

    return {
      visibleDashboard: canSeeDashboard ? dashboardItem : null,
      visibleGroups: filteredGroups
    };
  }, [hasPermission, isAdmin, fetchStatus, tenantFeatures]);

  return (
    <aside
      role="navigation"
      aria-label="Main Sidebar Navigation"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "hidden lg:flex flex-col border-r border-slate-200/80 bg-slate-50/80 backdrop-blur-xl shrink-0 transition-all duration-300 ease-in-out fixed left-0 top-[56px] h-[calc(100vh-56px)] z-40 justify-between py-3 select-none",
        isEffectiveExpanded ? "w-64 border-slate-300/80 bg-white/95" : "w-[68px] shadow-xs bg-slate-50/80",
        className
      )}
    >
      {/* Scrollable Navigation Area */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1.5 scrollbar-none">
        {isLoadingPermissions ? (
          <div className="space-y-3 py-2" role="status" aria-label="Loading navigation">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-100/70 animate-pulse">
                <div className="h-4 w-4 rounded-full bg-slate-200 shrink-0" />
                {isEffectiveExpanded && <div className="h-3.5 bg-slate-200 rounded w-28" />}
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Direct Dashboard Link */}
            {visibleDashboard && (
              <Link
                href={visibleDashboard.route}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group relative no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                  activeItemId === "dashboard"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20 font-extrabold"
                    : "text-slate-700 hover:text-blue-900 hover:bg-slate-200/60"
                )}
              >
                <LayoutDashboard
                  size={18}
                  className={activeItemId === "dashboard" ? "text-white shrink-0" : "text-slate-500 group-hover:text-blue-700 shrink-0"}
                />
                {isEffectiveExpanded && <span className="truncate">{visibleDashboard.label}</span>}
                {!isEffectiveExpanded && (
                  <div className="absolute left-[74px] bg-slate-900 text-white py-1 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity text-xs whitespace-nowrap z-50 shadow-md font-medium">
                    Dashboard
                  </div>
                )}
              </Link>
            )}

            {/* Grouped Collapsible Sections */}
            {visibleGroups.map((group) => {
              const GroupIcon = resolveNavIcon(group.iconName);
              const isGroupActive = activeGroupId === group.id;
              const isSectionExpanded = expandedGroup === group.id;

              return (
                <div key={group.id} className="space-y-0.5">
                  {/* Group Trigger Button */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isSectionExpanded}
                    aria-controls={`group-menu-${group.id}`}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all group relative text-left no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                      isGroupActive
                        ? "text-blue-900 bg-blue-50/70 font-extrabold"
                        : "text-slate-700 hover:text-slate-900 hover:bg-slate-200/50"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <GroupIcon
                        size={18}
                        className={isGroupActive ? "text-blue-700 shrink-0" : "text-slate-500 group-hover:text-slate-800 shrink-0"}
                      />
                      {isEffectiveExpanded && <span className="truncate">{group.label}</span>}
                    </div>

                    {isEffectiveExpanded && (
                      <ChevronDown
                        size={14}
                        className={cn("text-slate-400 transition-transform duration-200 shrink-0", isSectionExpanded && "rotate-180")}
                      />
                    )}

                    {!isEffectiveExpanded && (
                      <div className="absolute left-[74px] bg-slate-900 text-white py-1 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity text-xs whitespace-nowrap z-50 shadow-md font-medium">
                        {group.label}
                      </div>
                    )}
                  </button>

                  {/* Group Children Links */}
                  <AnimatePresence initial={false}>
                    {isEffectiveExpanded && isSectionExpanded && (
                      <motion.div
                        id={`group-menu-${group.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: "easeInOut" }}
                        className="overflow-hidden space-y-0.5 ml-4 pl-3 border-l border-slate-200"
                      >
                        {group.children.map((child) => {
                          const isChildActive = activeItemId === child.id;
                          const ChildIcon = resolveNavIcon(child.iconName);

                          return (
                            <Link
                              key={child.id}
                              href={child.route}
                              title={child.formalTitle || child.label}
                              className={cn(
                                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                                isChildActive
                                  ? "bg-blue-600 text-white shadow-2xs font-bold"
                                  : "text-slate-600 hover:text-blue-900 hover:bg-slate-100"
                              )}
                            >
                              <ChildIcon
                                size={15}
                                className={isChildActive ? "text-white shrink-0" : "text-slate-400 shrink-0"}
                              />
                              <span className="truncate">{child.label}</span>
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Secondary Bottom Collapse Control */}
      <div className="px-3 pt-2 border-t border-slate-200/80">
        <button
          type="button"
          onClick={onCollapseToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="w-full h-10 flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 shadow-2xs"
        >
          {collapsed ? (
            <>
              <ChevronRight size={16} />
              {isEffectiveExpanded && <span>Expand sidebar</span>}
            </>
          ) : (
            <>
              <ChevronLeft size={16} />
              {isEffectiveExpanded && <span>Collapse sidebar</span>}
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;

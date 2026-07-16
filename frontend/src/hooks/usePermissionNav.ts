"use client";

import { useMemo } from "react";
import { usePermission } from "@/hooks/usePermission";

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  /**
   * Required permission to show this nav item
   */
  permission?: string;
  /**
   * Required permissions (must have ALL)
   */
  permissions?: string[];
  /**
   * Required permissions (must have ANY)
   */
  anyPermission?: string[];
  /**
   * Required role to show this nav item
   */
  role?: string;
  /**
   * Required roles (must have ANY)
   */
  roles?: string[];
  /**
   * Feature flag key (checked against tenant features)
   */
  featureKey?: string;
  /**
   * Sub-menu items
   */
  children?: NavItem[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * Hook to filter navigation items based on user permissions
 * 
 * @example
 * ```tsx
 * const navItems: NavItem[] = [
 *   { label: "Dashboard", href: "/dashboard" },
 *   { label: "Requirements", href: "/requirements", permission: "requirement:view" },
 *   { label: "Create", href: "/requirements/create", permission: "requirement:create" },
 *   { 
 *     label: "Admin", 
 *     href: "/admin", 
 *     permissions: ["user:invite", "role:create"],
 *     children: [
 *       { label: "Users", href: "/admin/users", permission: "user:invite" },
 *       { label: "Roles", href: "/admin/roles", permission: "role:create" },
 *     ]
 *   },
 * ];
 * 
 * const { filteredItems, isLoading } = usePermissionNav(navItems);
 * ```
 */
export function usePermissionNav(items: NavItem[], tenantFeatures?: Record<string, boolean>) {
  const { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions, 
    hasRole, 
    hasAnyRole,
    isLoading 
  } = usePermission();

  const checkNavItem = (item: NavItem): boolean => {
    // Check feature flags first
    if (tenantFeatures && item.featureKey) {
      if (tenantFeatures[item.featureKey] === false) {
        return false;
      }
    }

    // Check permissions
    if (item.permission) {
      return hasPermission(item.permission);
    }
    if (item.permissions) {
      return hasAllPermissions(item.permissions);
    }
    if (item.anyPermission) {
      return hasAnyPermission(item.anyPermission);
    }

    // Check roles
    if (item.role) {
      return hasRole(item.role);
    }
    if (item.roles) {
      return hasAnyRole(item.roles);
    }

    // No restrictions
    return true;
  };

  const filterNavItems = (navItems: NavItem[]): NavItem[] => {
    return navItems
      .filter(checkNavItem)
      .map((item) => {
        if (item.children) {
          return {
            ...item,
            children: filterNavItems(item.children),
          };
        }
        return item;
      })
      .filter((item) => {
        // Remove items with empty children (all sub-items filtered out)
        if (item.children && item.children.length === 0) {
          return false;
        }
        return true;
      });
  };

  const filteredItems = useMemo(() => {
    if (isLoading) return [];
    return filterNavItems(items);
  }, [items, isLoading, hasPermission, hasAnyPermission, hasAllPermissions, hasRole, hasAnyRole]);

  return {
    filteredItems,
    isLoading,
    hasAccess: filteredItems.length > 0,
  };
}

/**
 * Hook to filter navigation groups based on permissions
 */
export function usePermissionNavGroups(groups: NavGroup[], tenantFeatures?: Record<string, boolean>) {
  const { filteredItems, isLoading } = usePermissionNav(
    groups.flatMap((g) => g.items),
    tenantFeatures
  );

  const filteredGroups = useMemo(() => {
    if (isLoading) return [];
    
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => 
          filteredItems.some((fi) => fi.href === item.href)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, filteredItems, isLoading]);

  return {
    filteredGroups,
    isLoading,
    hasAccess: filteredGroups.length > 0,
  };
}

// Example nav items for different user types
export const getDashboardNavItems = (userRole?: string): NavItem[] => {
  const baseItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard" },
  ];

  const departmentItems: NavItem[] = [
    { label: "Organization Onboarding", href: "/organization/onboarding", permission: "organization:view" },
    { label: "Onboarding Status", href: "/organization/onboarding/status", permission: "organization:view" },
    { label: "Create Requirement", href: "/department/requirements/create", permission: "requirement:create", featureKey: "enableRequirementCreation" },
    { label: "My Requirements", href: "/department/requirements", permission: "requirement:view", featureKey: "enableRequirementCreation" },
    { label: "Company Interest", href: "/department/interests", permission: "interest:view", featureKey: "enableCompanyInterest" },
    { label: "Projects", href: "/convergence-projects", permission: "project:view" },
    { label: "Handover", href: "/department/handover", permission: "project:view" },
    { label: "Reports", href: "/department/reports", permission: "report:view", featureKey: "enableReportsExport" },
    { label: "Users", href: "/organization/users", permission: "user:invite" },
    { label: "Roles", href: "/organization/roles", permission: "role:create" },
    { label: "Settings", href: "/organization/settings", permission: "organization:update" },
  ];

  const companyItems: NavItem[] = [
    { label: "Organization Onboarding", href: "/organization/onboarding", permission: "organization:view" },
    { label: "Onboarding Status", href: "/organization/onboarding/status", permission: "organization:view" },
    { label: "Project Marketplace", href: "/company/marketplace", permission: "marketplace:view", featureKey: "enableCSRMarketplace" },
    { label: "My Interests", href: "/company/interests", permission: "interest:view", featureKey: "enableCompanyInterest" },
    { label: "Funded Projects", href: "/convergence-projects", permission: "project:view" },
    { label: "Fund Releases", href: "/company/funds", permission: "fund:view", featureKey: "enableFundDisbursement" },
    { label: "Reports", href: "/company/reports", permission: "report:view", featureKey: "enableReportsExport" },
    { label: "Users", href: "/organization/users", permission: "user:invite" },
    { label: "Roles", href: "/organization/roles", permission: "role:create" },
    { label: "Settings", href: "/organization/settings", permission: "organization:update" },
  ];

  const ngoItems: NavItem[] = [
    { label: "Organization Onboarding", href: "/organization/onboarding", permission: "organization:view" },
    { label: "Onboarding Status", href: "/organization/onboarding/status", permission: "organization:view" },
    { label: "Proposal Requests", href: "/ngo/proposal-requests", permission: "marketplace:view", featureKey: "enableCSRMarketplace" },
    { label: "Assigned Projects", href: "/ngo/assigned-projects", permission: "project:view" },
    { label: "Milestones", href: "/ngo/milestones", permission: "milestone:view", featureKey: "enableMilestoneMonitoring" },
    { label: "Fund Releases", href: "/ngo/funds", permission: "fund:view", featureKey: "enableFundDisbursement" },
    { label: "Reports", href: "/ngo/reports", permission: "report:view", featureKey: "enableReportsExport" },
    { label: "Users", href: "/organization/users", permission: "user:invite" },
    { label: "Roles", href: "/organization/roles", permission: "role:create" },
    { label: "Settings", href: "/organization/settings", permission: "organization:update" },
  ];

  const adminItems: NavItem[] = [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Users", href: "/admin/users-roles", permission: "user:invite" },
    { label: "Onboarding Approvals", href: "/admin/onboarding-approvals", permission: "organization:approve" },
    { label: "Government Departments", href: "/admin/organizations", permission: "organization:view" },
    { label: "Implementing Agencies", href: "/admin/ngo-registry", permission: "organization:view" },
    { label: "Companies", href: "/admin/companies", permission: "organization:view" },
    { label: "Requirements Pending", href: "/admin/requirements/pending", permission: "requirement:approve", featureKey: "enableRequirementCreation" },
    { label: "Company Interests", href: "/admin/company-interests", permission: "interest:view", featureKey: "enableCompanyInterest" },
    { label: "Agency Selection", href: "/admin/ngo-selection", permission: "project:approve", featureKey: "enableNGOSelection" },
    { label: "Fund Monitoring", href: "/admin/fund-monitoring", permission: "fund:view", featureKey: "enableFundDisbursement" },
    { label: "Projects", href: "/convergence-projects", permission: "project:view" },
    { label: "Verification Queue", href: "/admin/applications", permission: "organization:view" },
    { label: "Executive Dashboard", href: "/admin/executive-dashboard", permission: "report:view" },
    { label: "Reports", href: "/admin/reports", permission: "report:view" },
    { label: "Audit Trail", href: "/admin/audit-trail", permission: "audit:view" },
  ];

  // Add role-specific items
  switch (userRole) {
    case "BENEFICIARY_AGENCY":
      return [...baseItems, ...departmentItems];
    case "COMPANY_ADMIN":
    case "COMPANY_MEMBER":
      return [...baseItems, ...companyItems];
    case "NGO_ADMIN":
    case "NGO_MEMBER":
      return [...baseItems, ...ngoItems];
    case "SUPER_ADMIN":
    case "PORTAL_ADMIN":
    case "CSR_ADMIN":
      return [...baseItems, ...adminItems];
    default:
      return baseItems;
  }
};

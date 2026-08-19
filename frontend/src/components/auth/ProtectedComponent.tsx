"use client";

import { ReactNode } from "react";
import { usePermission } from "@/hooks/usePermission";

interface ProtectedComponentProps {
  /**
   * Required permission to view the component
   */
  permission?: string;

  /**
   * Required permissions (user must have ALL)
   */
  permissions?: string[];

  /**
   * Required permissions (user must have ANY)
   */
  anyPermission?: string[];

  /**
   * Required role to view the component
   */
  role?: string;

  /**
   * Required roles (user must have ANY)
   */
  roles?: string[];

  /**
   * Content to render if user has access
   */
  children: ReactNode;

  /**
   * Content to render if user doesn't have access
   * @default null
   */
  fallback?: ReactNode;

  /**
   * Whether to show loading state
   * @default false
   */
  showLoading?: boolean;

  /**
   * Loading component to show
   */
  loadingComponent?: ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions/roles
 *
 * @example
 * ```tsx
 * // Check single permission
 * <ProtectedComponent permission="pitch:create">
 *   <button>Create Pitch</button>
 * </ProtectedComponent>
 *
 * <ProtectedComponent permissions={["pitch:view", "pitch:edit_before_approval"]}>
 *   <PitchEditor />
 * </ProtectedComponent>
 *
 * <ProtectedComponent anyPermission={["pitch:approve", "pitch:submit"]}>
 *   <ApprovalControls />
 * </ProtectedComponent>
 *
 * // Check role
 * <ProtectedComponent role="NGO_ADMIN">
 *   <AdminPanel />
 * </ProtectedComponent>
 *
 * // With fallback
 * <ProtectedComponent
 *   permission="organization:view"
 *   fallback={<div>You don't have access to view organizations</div>}
 * >
 *   <OrganizationList />
 * </ProtectedComponent>
 * ```
 */
export function ProtectedComponent({
  permission,
  permissions,
  anyPermission,
  role,
  roles,
  children,
  fallback = null,
  showLoading = false,
  loadingComponent,
}: ProtectedComponentProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission, hasRole, hasAnyRole, isLoading } = usePermission();

  // Show loading if requested
  if (isLoading && showLoading) {
    return loadingComponent || <div>Loading...</div>;
  }

  // If still loading but not showing loading state, render nothing
  if (isLoading) {
    return null;
  }

  let hasAccess = false;

  // Check permission-based access
  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = hasAllPermissions(permissions);
  } else if (anyPermission && anyPermission.length > 0) {
    hasAccess = hasAnyPermission(anyPermission);
  }
  // Check role-based access
  else if (role) {
    hasAccess = hasRole(role);
  } else if (roles && roles.length > 0) {
    hasAccess = hasAnyRole(roles);
  }
  // If no checks specified, allow access
  else {
    hasAccess = true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Button wrapper that disables/hides button based on permissions
 */
interface ProtectedButtonProps extends ProtectedComponentProps {
  /**
   * Whether to disable instead of hide
   * @default false
   */
  disableInsteadOfHide?: boolean;

  /**
   * Tooltip text to show when disabled
   */
  disabledTooltip?: string;

  /**
   * Additional className for the wrapper
   */
  className?: string;
}

export function ProtectedButton({
  disableInsteadOfHide = false,
  disabledTooltip = "You don't have permission to perform this action",
  className = "",
  children,
  ...props
}: ProtectedButtonProps) {
  return (
    <ProtectedComponent
      {...props}
      fallback={
        disableInsteadOfHide ? (
          <span className={className} title={disabledTooltip}>
            {children}
          </span>
        ) : null
      }
    >
      <span className={className}>{children}</span>
    </ProtectedComponent>
  );
}

/**
 * Menu item wrapper for navigation
 */
interface ProtectedMenuItemProps extends ProtectedComponentProps {
  /**
   * Menu item href
   */
  href?: string;

  /**
   * Menu item label
   */
  label: string;

  /**
   * Icon component
   */
  icon?: ReactNode;
}

export function ProtectedMenuItem({
  href,
  label,
  icon,
  children,
  ...props
}: ProtectedMenuItemProps) {
  return (
    <ProtectedComponent {...props}>
      {children || (
        <a href={href} className="flex items-center gap-2">
          {icon && <span>{icon}</span>}
          <span>{label}</span>
        </a>
      )}
    </ProtectedComponent>
  );
}

/**
 * Table action column wrapper
 */
interface ProtectedActionProps extends ProtectedComponentProps {
  /**
   * Action type for styling
   */
  actionType?: "edit" | "delete" | "view" | "custom";
}

export function ProtectedAction({
  actionType = "custom",
  children,
  ...props
}: ProtectedActionProps) {
  return (
    <ProtectedComponent {...props}>
      <span className={`action-${actionType}`}>{children}</span>
    </ProtectedComponent>
  );
}

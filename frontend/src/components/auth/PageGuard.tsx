"use client";

import React, { useMemo, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getNavItemForRoute, isNavItemAllowed, isInternalAuthorityUser, isRmUser } from "@/lib/navigationManifest";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";

export default function PageGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const {
    isAuthenticated,
    isAdmin,
    roles,
    user,
    fetchStatus,
    fetchError,
    isLoadingPermissions,
    hasPermission,
    fetchEffectivePermissions
  } = useAuthStore();



  const [lastAllowedChildren, setLastAllowedChildren] = useState<React.ReactNode>(null);
  const [hasNavigatedBack, setHasNavigatedBack] = useState(false);

  const decision = useMemo(() => {
    const userRoles = roles?.length > 0 ? roles : (user?.role ? [user.role] : []);
    // Universal public routes or root
    const publicPrefixes = [
      "/",
      "/login",
      "/register",
      "/activate",
      "/public",
      "/about",
      "/partner-with-maharashtra",
      "/pitch-development-need",
      "/track",
      "/standard-mou-template",
      "/csr-impact-dashboard",
      "/district-csr-ranking",
      "/statistics",
      "/downloads",
      "/faqs",
      "/feedback",
      "/gallery",
      "/stories",
      "/events",
      "/framework-policy",
      "/document-library",
      "/workflow",
      "/success-stories",
      "/csr-events",
      "/directory",
      "/completed-projects",
      "/public-development-needs",
      "/faq-news-recognition",
      "/knowledge",
      "/marketplace",
      "/csr-marketplace",
      "/circulars",
      "/news",
      "/contact",
      "/csr-policy",
      "/convergence",
      "/resources",
      "/reports",
      "/help"
    ];

    if (publicPrefixes.some((prefix) => prefix === "/" ? pathname === "/" : pathname.startsWith(prefix))) {
      return { allowed: true, requiredPerm: undefined };
    }

    if (!isAuthenticated) {
      return { allowed: false, requiredPerm: "authentication:required", reason: "Authentication is required to view this page." };
    }

    // RM, JS, Planning Secretary, Super Admin and internal authorities do not undergo onboarding
    const isInternal = isInternalAuthorityUser(userRoles, isAdmin);
    if (pathname.startsWith("/organization/onboarding") && isInternal) {
      return { allowed: false, requiredPerm: "organization:onboard", reason: "Internal authority roles do not undergo organization onboarding." };
    }

    // Relationship Managers have view-only directory access and cannot access administrative onboarding approvals
    const isRm = isRmUser(userRoles);
    if (pathname.startsWith("/admin/onboarding-approvals") && isRm) {
      return { allowed: false, requiredPerm: "organization:approve", reason: "Relationship Managers have view-only directory access and cannot access administrative onboarding approvals." };
    }

    // Universal authenticated routes — always allowed for any logged-in user
    const universalAuthRoutes = [
      "/dashboard",
      "/profile",
      "/settings",
      "/notifications",
      "/communications",
      "/helpdesk",
      "/interactions",
      "/tasks",
      "/work-queue",
      "/pitches",
      "/pitches/create",
    ];
    if (universalAuthRoutes.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
      return { allowed: true, requiredPerm: undefined };
    }

    // Applicant onboarding routes for non-internal users
    if (pathname.startsWith("/organization/onboarding") && !isInternal) {
      return { allowed: true, requiredPerm: undefined };
    }

    // Super Admin bypass for all other routes
    if (isAdmin) {
      return { allowed: true, requiredPerm: undefined };
    }

    // Look up manifest item for this route
    const manifestItem = getNavItemForRoute(pathname);

    // If route is not listed in manifest but starts with /admin, gate with admin permissions
    if (!manifestItem) {
      if (pathname.startsWith("/admin")) {
        const allowed = hasPermission("user:view") || hasPermission("role:view") || hasPermission("organization:view");
        return { allowed, requiredPerm: "user:view or role:view or organization:view" };
      }
      // Fail closed for unmapped authenticated routes
      return { allowed: false, requiredPerm: "route:authorized", reason: "This page is not classified or authorized for your role." };
    }

    const allowed = isNavItemAllowed(manifestItem, hasPermission, isAdmin, userRoles);
    const requiredPerm = manifestItem.requiredAnyPermissions?.join(" or ") || manifestItem.requiredAllPermissions?.join(" and ");

    return { allowed, requiredPerm };
  }, [pathname, isAuthenticated, isAdmin, roles, user?.role, hasPermission]);

  useEffect(() => {
    if (decision.allowed) {
      setLastAllowedChildren(children);
      setHasNavigatedBack(false);
    } else if (!isAuthenticated) {
      // Instantly purge cached protected UI on logout
      setLastAllowedChildren(null);
    }
  }, [decision.allowed, isAuthenticated, children]);

  useEffect(() => {
    if (!decision.allowed) {
      if (!isAuthenticated) {
        // Direct unauthenticated users straight to /login immediately
        router.replace("/login");
        return;
      }
      if (!hasNavigatedBack) {
        setHasNavigatedBack(true);
        // An authenticated user should never be bounced backwards into /login history.
        // Instead, route them safely to their authorized /dashboard home.
        router.replace("/dashboard");
      }
    }
  }, [decision.allowed, isAuthenticated, router, hasNavigatedBack]);

  // If unauthenticated on a protected route, blank the page immediately with a clean logging out screen
  if (!isAuthenticated && !decision.allowed) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50/90 backdrop-blur-sm" role="status" aria-live="polite">
        <Loader2 className="w-9 h-9 animate-spin text-blue-600 mb-3" />
        <p className="text-xs font-bold text-slate-600">Signing out...</p>
      </div>
    );
  }

  // 1. Loading State
  // Only block the UI with a full-screen loading spinner if the page access is not yet allowed
  if ((isLoadingPermissions || fetchStatus === "LOADING") && !decision.allowed) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-gray-500" role="status" aria-live="polite">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-sm font-medium text-gray-700 dark:text-black">Verifying authorization permissions...</p>
      </div>
    );
  }

  // 2. Permission Fetch Error State (Recoverable Error UI)
  if (fetchStatus === "ERROR") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center" role="alert">
        <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/50 rounded-full flex items-center justify-center text-amber-600 mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Authorization Verification Failed</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mb-6">{fetchError || "Could not fetch your latest permission grants."}</p>
        <button
          onClick={() => fetchEffectivePermissions()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Retry Authorization
        </button>
      </div>
    );
  }

  // 3. Denied State -> Keep authenticated user on the last allowed page silently
  if (!decision.allowed) {
    if (lastAllowedChildren) {
      return <>{lastAllowedChildren}</>;
    }
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-gray-500" role="status" aria-live="polite">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-sm font-medium text-gray-700 dark:text-black">Loading dashboard...</p>
      </div>
    );
  }

  // 4. Allowed State -> Render Children
  return <>{children}</>;
}

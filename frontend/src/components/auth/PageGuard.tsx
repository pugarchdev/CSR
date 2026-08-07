"use client";

import React, { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getNavItemForRoute, isNavItemAllowed } from "@/lib/navigationManifest";
import { AccessRestricted } from "./AccessRestricted";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";

export default function PageGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const {
    isAuthenticated,
    isAdmin,
    permissions,
    fetchStatus,
    fetchError,
    isLoadingPermissions,
    hasPermission,
    fetchEffectivePermissions
  } = useAuthStore();

  const decision = useMemo(() => {
    // Universal public routes or root
    const publicPrefixes = [
      "/",
      "/login",
      "/register",
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
      "/circulars"
    ];

    if (publicPrefixes.some((prefix) => prefix === "/" ? pathname === "/" : pathname.startsWith(prefix))) {
      return { allowed: true, requiredPerm: undefined };
    }

    if (!isAuthenticated) {
      return { allowed: false, requiredPerm: "authentication:required", reason: "Authentication is required to view this page." };
    }

    // Super Admin bypass
    if (isAdmin) {
      return { allowed: true, requiredPerm: undefined };
    }

    // Look up manifest item for this route
    const manifestItem = getNavItemForRoute(pathname);

    // If route is not listed in manifest but starts with /admin, gate with admin permissions
    if (!manifestItem) {
      if (pathname.startsWith("/admin")) {
        const allowed = hasPermission("user:view") || hasPermission("role:view");
        return { allowed, requiredPerm: "user:view or role:view" };
      }
      // Fail closed for unmapped authenticated routes
      return { allowed: false, requiredPerm: "route:authorized", reason: "This page is not classified or authorized for your role." };
    }

    const allowed = isNavItemAllowed(manifestItem, hasPermission, isAdmin);
    const requiredPerm = manifestItem.requiredAnyPermissions?.join(" or ") || manifestItem.requiredAllPermissions?.join(" and ");

    return { allowed, requiredPerm };
  }, [pathname, isAuthenticated, isAdmin, permissions, hasPermission]);

  // 1. Loading State
  if (isLoadingPermissions || fetchStatus === "LOADING") {
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

  // 3. Denied State -> Render 403 Access Restricted
  if (!decision.allowed) {
    return (
      <AccessRestricted
        requiredPermission={decision.requiredPerm}
        reason={decision.reason}
      />
    );
  }

  // 4. Allowed State -> Render Children
  return <>{children}</>;
}

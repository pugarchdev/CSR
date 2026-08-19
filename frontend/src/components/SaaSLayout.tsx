"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Landmark, Search, Bell, Mail, ChevronLeft, ChevronRight,
  Layers, Sparkles, Award, Coins, Compass, FileText, BarChart2,
  HelpCircle, Menu, X, LogOut, ShieldCheck, BookOpen, ShieldAlert,
  Clock, Users, Globe2, ChevronDown, ArrowUp, MapPin, Phone, CheckCircle2, Handshake,
  User, Settings, LayoutDashboard
} from "lucide-react";
import { Button } from "./ui/Button";
import { Loader } from "./ui/Loader";
import { apiFetch, getStoredUser } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import PageGuard from "@/components/auth/PageGuard";
import { isNavItemVisible } from "@/lib/pageRegistry";
import { resolveNavItems, normalizeRole, type NavItem } from "@/lib/navRegistry";
import { resolveDashboardPath } from "@/lib/roleRouting";
import { resolveNotificationUrl } from "@/lib/notificationUtils";
import { Sidebar, resolveNavIcon } from "@/components/layout/Sidebar";
import { NAVIGATION_GROUPS, NAVIGATION_MANIFEST, isNavItemAllowed, NavItemDef } from "@/lib/navigationManifest";
import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";

interface SaaSLayoutProps {
  children: React.ReactNode;
}

const publicNavGroups = [
  {
    label: "About",
    href: "/about",
    links: [
      { label: "Framework & Policy Information", href: "/framework-policy" },
      { label: "CSR Policy", href: "/csr-policy" },
      { label: "Convergence Framework", href: "/convergence" },
      { label: "Workflow Explainer", href: "/workflow" },
    ],
  },
  {
    label: "Projects",
    href: "/public-development-needs",
    links: [
      { label: "Public Development Needs (Live)", href: "/public-development-needs" },
      { label: "Completed Projects Gallery", href: "/completed-projects" },
      { label: "Success Stories & Case Studies", href: "/success-stories" },
    ],
  },
  {
    label: "Documents",
    href: "/document-library",
    links: [
      { label: "Document Library", href: "/document-library" },
      { label: "Resources", href: "/resources" },
      { label: "Circulars", href: "/circulars" },
      { label: "Knowledge Center", href: "/knowledge" },
    ],
  },
  {
    label: "Updates",
    href: "/news",
    links: [
      { label: "News", href: "/news" },
      { label: "CSR Summits & Events", href: "/csr-events" },
      { label: "FAQs, News & Recognition", href: "/faq-news-recognition" },
    ],
  },
  {
    label: "Contact",
    href: "/contact",
    links: [
      { label: "Directory", href: "/directory" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
];

export default function SaaSLayout({ children }: SaaSLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const storeUser = useAuthStore(state => state.user);
  const storeRoles = useAuthStore(state => state.roles) ?? [];
  const storeIsAdmin = useAuthStore(state => state.isAdmin);
  const hasPermission = useAuthStore(state => state.hasPermission);
  const isLoadingPermissions = useAuthStore(state => state.isLoadingPermissions);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("mahacsr_sidebar_collapsed");
      return stored !== null ? JSON.parse(stored) : false;
    }
    return false;
  });
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const isExpanded = !sidebarCollapsed || sidebarHovered;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsDropdownRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const [openNavGroup, setOpenNavGroup] = useState<string | null>(null);
  const [mobileOpenNavGroup, setMobileOpenNavGroup] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; isRead: boolean }>>([]);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("user@mahacsr.gov.in");
  const [tenantFeatures, setTenantFeatures] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const resolvedUser = storeUser || (mounted && typeof window !== "undefined" ? getStoredUser() : null);

  const userName = (() => {
    if (!resolvedUser) return "User Account";
    const fullName = [resolvedUser.firstName, resolvedUser.lastName].filter(Boolean).join(" ").trim();
    if (fullName) return fullName;
    if (resolvedUser.name && typeof resolvedUser.name === "string" && resolvedUser.name.trim()) {
      return resolvedUser.name.trim();
    }
    if (resolvedUser.email && typeof resolvedUser.email === "string") {
      const emailPrefix = resolvedUser.email.split("@")[0];
      return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    }
    return "User Account";
  })();

  const effectiveEmail = resolvedUser?.email || userEmail || "user@mahacsr.gov.in";

  const userInitials = (() => {
    if (!resolvedUser) return "U";
    if (resolvedUser.firstName && resolvedUser.lastName) {
      return `${resolvedUser.firstName[0]}${resolvedUser.lastName[0]}`.toUpperCase();
    }
    if (resolvedUser.firstName) {
      return resolvedUser.firstName.slice(0, 2).toUpperCase();
    }
    if (resolvedUser.name && typeof resolvedUser.name === "string" && resolvedUser.name.trim()) {
      const parts = resolvedUser.name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return resolvedUser.name.slice(0, 2).toUpperCase();
    }
    if (resolvedUser.email && typeof resolvedUser.email === "string") {
      return resolvedUser.email.slice(0, 2).toUpperCase();
    }
    return "U";
  })();

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mahacsr_sidebar_collapsed", JSON.stringify(sidebarCollapsed));
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModalOpen(true);
      } else if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName) &&
        !(e.target as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    const scrollContainer = sidebarScrollRef.current;
    if (!sidebar || !scrollContainer) return;

    const handleWheel = (e: WheelEvent) => {
      if (!scrollContainer.contains(e.target as Node)) {
        scrollContainer.scrollTop += e.deltaY;
        e.preventDefault();
      }
    };

    sidebar.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      sidebar.removeEventListener("wheel", handleWheel);
    };
  }, [mounted]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (notificationsDropdownRef.current && !notificationsDropdownRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isLoggedIn = mounted && typeof window !== "undefined" && !!localStorage.getItem("accessToken");

  const usesGovPortalShell =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/rm") ||
    pathname.startsWith("/js") ||
    pathname.startsWith("/secretary") ||
    pathname.startsWith("/nodal") ||
    pathname.startsWith("/state-cell") ||
    pathname.startsWith("/agency") ||
    pathname === "/partner" ||
    pathname.startsWith("/partner/") ||
    pathname.startsWith("/grievances") ||
    pathname.startsWith("/convergence-projects") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/pitch-development-need") ||
    pathname.startsWith("/public-development-needs") ||
    pathname.startsWith("/partner-with-maharashtra") ||
    pathname.startsWith("/track") ||
    pathname.startsWith("/communications") ||
    pathname.startsWith("/notifications");

  const isDashboard = pathname.startsWith("/ngo-dashboard") ||
                      pathname.startsWith("/company-dashboard") ||
                      pathname.startsWith("/government-portal") ||
                      pathname.startsWith("/department") ||
                      pathname.startsWith("/departments") ||
                      pathname.startsWith("/company") ||
                      pathname.startsWith("/companies") ||
                      pathname.startsWith("/ngo") ||
                      pathname.startsWith("/district") ||
                      pathname.startsWith("/organization") ||
                      pathname.startsWith("/organizations") ||
                      pathname.startsWith("/master") ||
                      pathname.startsWith("/dashboard") ||
                      pathname.startsWith("/onboarding") ||
                      pathname.startsWith("/queries") ||
                      pathname.startsWith("/csr-projects") ||
                      pathname.startsWith("/payments") ||
                      pathname.startsWith("/fund-releases") ||
                      pathname.startsWith("/funds") ||
                      pathname.startsWith("/reports") ||
                      pathname.startsWith("/audit-logs") ||
                      pathname.startsWith("/profile") ||
                      pathname.startsWith("/settings") ||
                      pathname.startsWith("/chat") ||
                      pathname.startsWith("/analytics") ||
                      pathname.startsWith("/beneficiary") ||
                      pathname.startsWith("/department") ||
                      pathname.startsWith("/admin") ||
                      pathname.startsWith("/rm") ||
                      pathname.startsWith("/js") ||
                      pathname.startsWith("/secretary") ||
                      pathname.startsWith("/nodal") ||
                      pathname.startsWith("/dno") ||
                      pathname.startsWith("/state-cell") ||
                      pathname.startsWith("/agency") ||
                      pathname.startsWith("/agencies") ||
                      pathname.startsWith("/implementing-agencies") ||
                      pathname.startsWith("/enquiries") ||
                      pathname.startsWith("/pitches") ||
                      pathname.startsWith("/interests") ||
                      pathname.startsWith("/assessments") ||
                      pathname.startsWith("/assignments") ||
                      pathname.startsWith("/milestones") ||
                      pathname.startsWith("/handover") ||
                      pathname.startsWith("/inspections") ||
                      pathname.startsWith("/escalations") ||
                      pathname.startsWith("/decisions") ||
                      pathname.startsWith("/nodal-appointments") ||
                      pathname.startsWith("/helpdesk") ||
                      pathname.startsWith("/communications") ||
                      pathname.startsWith("/notifications") ||
                      pathname.startsWith("/interactions") ||
                      pathname.startsWith("/tasks") ||
                      pathname.startsWith("/work-queue") ||
                      pathname.startsWith("/meetings") ||
                      pathname.startsWith("/evidence") ||
                      pathname.startsWith("/field-visits") ||
                      pathname.startsWith("/issues") ||
                      pathname.startsWith("/oversight") ||
                      pathname.startsWith("/platform") ||
                      pathname.startsWith("/strategy") ||
                      (pathname === "/partner" || pathname.startsWith("/partner/")) ||
                      pathname.startsWith("/grievances") ||
                      pathname.startsWith("/convergence-projects") ||
                      pathname.startsWith("/projects") ||
                      (pathname.startsWith("/track") && isLoggedIn) ||
                      ((pathname.startsWith("/csr-marketplace") || pathname.startsWith("/marketplace") || pathname.startsWith("/public-development-needs") || pathname.startsWith("/pitch-development-need") || pathname.startsWith("/partner-with-maharashtra")) && isLoggedIn);

  useEffect(() => {
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
    setUserDropdownOpen(false);
    setOpenNavGroup(null);
    setMobileOpenNavGroup(null);
  }, [pathname]);

  useEffect(() => {
    if (!mounted) return;

    const token = localStorage.getItem("accessToken");
    const user = getStoredUser();

    const cleanPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;

    const publicPrefixes = [
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
      "/help",
      "/register"
    ];

    const isPublicRoute =
      cleanPath === "/" ||
      cleanPath === "/login" ||
      cleanPath === "/register" ||
      cleanPath.startsWith("/register/") ||
      publicPrefixes.some(prefix => cleanPath === prefix || cleanPath.startsWith(prefix + "/"));

    // 1. Enforce login for non-public routes
    if (!isPublicRoute) {
      if (!token || !user) {
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
    }

    // 2. Enforce roles permissions for dashboard routes
    if (token && user && isDashboard) {
      setUserEmail(user.email || "user@mahacsr.gov.in");
      useAuthStore.getState().fetchEffectivePermissions(true).catch(() => {});

      const activeRoles = storeRoles.length > 0 ? storeRoles : (user.role ? [user.role] : []);
      const hasAnyAllowedRole = (allowedRoles: string[]) => {
        const normalizedActive = activeRoles.map(r => normalizeRole(r));
        const normalizedAllowed = allowedRoles.map(r => normalizeRole(r));
        return normalizedActive.some(r => normalizedAllowed.includes(r)) || storeIsAdmin;
      };

      const allowed =
        (pathname.startsWith("/ngo-dashboard") && hasAnyAllowedRole(["NGO_ADMIN", "NGO_MEMBER"])) ||
        (pathname.startsWith("/company-dashboard") && hasAnyAllowedRole(["COMPANY_ADMIN", "COMPANY_MEMBER"])) ||
        (pathname.startsWith("/government-portal") && hasAnyAllowedRole(["SUPER_ADMIN", "PORTAL_ADMIN", "DISTRICT_ADMIN"])) ||
        ((pathname === "/company" || pathname.startsWith("/company/")) && hasAnyAllowedRole(["COMPANY_ADMIN", "COMPANY_MEMBER", "SUPER_ADMIN", "CORPORATE_USER"])) ||
        ((pathname === "/ngo" || pathname.startsWith("/ngo/")) && hasAnyAllowedRole(["NGO_ADMIN", "NGO_MEMBER", "SUPER_ADMIN"])) ||
        (pathname.startsWith("/district") && hasAnyAllowedRole(["DISTRICT_ADMIN", "SUPER_ADMIN", "PORTAL_ADMIN", "CSR_ADMIN"])) ||
        (pathname.startsWith("/organization") && hasAnyAllowedRole(["GOVERNMENT_OFFICER", "BENEFICIARY_AGENCY", "COMPANY_ADMIN", "COMPANY_MEMBER", "CORPORATE_USER", "NGO_ADMIN", "NGO_MEMBER", "DISTRICT_ADMIN", "PORTAL_ADMIN", "CSR_ADMIN", "SUPER_ADMIN", "JOINT_SECRETARY", "PLANNING_SECRETARY", "CSR_RELATIONSHIP_MANAGER", "DISTRICT_NODAL_OFFICER", "NODAL_OFFICER", "STATE_CSR_CELL"])) ||
        ((pathname.startsWith("/admin") && !pathname.startsWith("/admin/sla-config")) && hasAnyAllowedRole(["SUPER_ADMIN", "DISTRICT_ADMIN", "PORTAL_ADMIN", "CSR_ADMIN", "JOINT_SECRETARY", "PLANNING_SECRETARY"])) ||
        (pathname.startsWith("/admin/sla-config") && hasAnyAllowedRole(["SUPER_ADMIN", "DISTRICT_ADMIN", "PORTAL_ADMIN", "CSR_ADMIN", "JOINT_SECRETARY", "PLANNING_SECRETARY", "GOVERNMENT_OFFICER"])) ||
        ((pathname.startsWith("/beneficiary") || pathname.startsWith("/department")) && hasAnyAllowedRole(["GOVERNMENT_OFFICER", "BENEFICIARY_AGENCY", "SUPER_ADMIN"])) ||
        (pathname.startsWith("/rm") && hasAnyAllowedRole(["CSR_RELATIONSHIP_MANAGER", "JOINT_SECRETARY", "PLANNING_SECRETARY", "SUPER_ADMIN"])) ||
        (pathname.startsWith("/js") && hasAnyAllowedRole(["JOINT_SECRETARY", "PLANNING_SECRETARY", "SUPER_ADMIN"])) ||
        (pathname.startsWith("/secretary") && hasAnyAllowedRole(["PLANNING_SECRETARY", "SUPER_ADMIN"])) ||
        (pathname.startsWith("/nodal") && hasAnyAllowedRole(["DISTRICT_NODAL_OFFICER", "NODAL_OFFICER", "JOINT_SECRETARY", "PLANNING_SECRETARY", "SUPER_ADMIN"])) ||
        (pathname.startsWith("/state-cell") && hasAnyAllowedRole(["STATE_CSR_CELL", "PLANNING_SECRETARY", "SUPER_ADMIN"])) ||
        (pathname.startsWith("/agency") && hasAnyAllowedRole(["IMPLEMENTING_AGENCY_USER", "CORPORATE_USER", "SUPER_ADMIN"])) ||
        ((pathname === "/partner" || pathname.startsWith("/partner/")) && hasAnyAllowedRole(["CORPORATE_USER", "CORPORATE_PARTNER", "COMPANY_ADMIN", "COMPANY_MEMBER", "SUPER_ADMIN"])) ||
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/onboarding") ||
        pathname.startsWith("/queries") ||
        pathname.startsWith("/csr-projects") ||
        pathname.startsWith("/payments") ||
        pathname.startsWith("/fund-releases") ||
        pathname.startsWith("/reports") ||
        pathname.startsWith("/audit-logs") ||
        pathname.startsWith("/profile") ||
        pathname.startsWith("/settings") ||
        pathname.startsWith("/admin/organizations") ||
        pathname.startsWith("/admin/companies") ||
        pathname.startsWith("/admin/ngo-registry") ||
        pathname.startsWith("/admin/user-management") ||
        pathname.startsWith("/admin/access-control") ||
        pathname.startsWith("/chat") ||
        pathname.startsWith("/analytics") ||
        pathname.startsWith("/grievances") ||
        pathname.startsWith("/convergence-projects") ||
        pathname.startsWith("/projects") ||
        pathname.startsWith("/public-development-needs") ||
        pathname.startsWith("/pitch-development-need") ||
        pathname.startsWith("/partner-with-maharashtra") ||
        pathname.startsWith("/enquiries") ||
        pathname.startsWith("/pitches") ||
        pathname.startsWith("/interests") ||
        pathname.startsWith("/assessments") ||
        pathname.startsWith("/agencies") ||
        pathname.startsWith("/assignments") ||
        pathname.startsWith("/milestones") ||
        pathname.startsWith("/marketplace") ||
        pathname.startsWith("/csr-marketplace") ||
        pathname.startsWith("/escalations") ||
        pathname.startsWith("/decisions") ||
        pathname.startsWith("/nodal-appointments") ||
        pathname.startsWith("/inspections") ||
        pathname.startsWith("/handover") ||
        pathname.startsWith("/communications") ||
        pathname.startsWith("/notifications") ||
        pathname.startsWith("/helpdesk") ||
        pathname.startsWith("/meetings") ||
        pathname.startsWith("/interactions") ||
        pathname.startsWith("/tasks") ||
        pathname.startsWith("/work-queue") ||
        pathname.startsWith("/evidence") ||
        pathname.startsWith("/field-visits") ||
        pathname.startsWith("/issues") ||
        pathname.startsWith("/oversight") ||
        pathname.startsWith("/platform") ||
        pathname.startsWith("/strategy") ||
        pathname.startsWith("/track");

      if (!allowed) {
        // Route to the user's home dashboard by CANONICAL identity
        // (numericId → slug → base enum), never by role name. See roleRouting.ts.
        router.push(
          resolveDashboardPath(
            {
              roleNumericId: user.roleNumericId,
              roleSlug: user.roleSlug,
              role: user.role,
            },
            "/"
          )
        );
      }
    }
  }, [mounted, isDashboard, pathname, router]);

  useEffect(() => {
    // Prefetch authentication routes in the background to ensure instant transition when clicked
    if (router && typeof window !== "undefined") {
      router.prefetch("/login");
      router.prefetch("/register");
      router.prefetch("/register/corporate");
      router.prefetch("/register/government");
    }
  }, [router]);

  useEffect(() => {
    if (!isDashboard || !isLoggedIn) return;

    apiFetch<Array<{ id: string; title: string; message: string; isRead: boolean }>>("/notifications")
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, [isDashboard, isLoggedIn]);

  useEffect(() => {
    if (!isDashboard || !isLoggedIn) return;
    const user = getStoredUser();
    if (!user) {
      setTenantFeatures({});
      return;
    }
    apiFetch<{ features: Record<string, boolean> }>("/platform/features")
      .then((data) => setTenantFeatures(data.features || {}))
      .catch(() => setTenantFeatures({}));
  }, [isDashboard, isLoggedIn]);

  const handleLogout = () => {
    setUserDropdownOpen(false);
    useAuthStore.getState().logout();
    if (typeof window !== "undefined") {
      window.location.replace("/login");
    } else {
      router.replace("/login");
    }
  };

  const storedUser = typeof window !== "undefined" ? getStoredUser() : null;
  const activeRoles = (storeRoles || []).length > 0 ? storeRoles : (storedUser?.role ? [storedUser.role] : []);
  const storedRole = activeRoles.find(r => r !== "GOVERNMENT_OFFICER" && r !== "CORPORATE_USER") || activeRoles[0];
  const storedOrganizationType = storedUser?.organization?.organizationType as string | undefined;

  // Resolve the brand-link destination off the CANONICAL role identity
  const getDashboardHref = (): string =>
    resolveDashboardPath(
      {
        roleNumericId: storedUser?.roleNumericId,
        roleSlug: storedUser?.roleSlug,
        role: storedUser?.role,
      },
      "/"
    );

  const rawSidebarItems = resolveNavItems({
    role: storedRole,
    pathname,
    hasPermission,
    isSuperAdmin: storeIsAdmin
  });

  const filteredNavItems = rawSidebarItems
    .filter((item) => !item.featureKey || tenantFeatures[item.featureKey] !== false)
    .filter((item) => isNavItemVisible(item.href, hasPermission));

  const dashboardNavigationItems = filteredNavItems;
  const routeFeatureKey =
    pathname.includes("/marketplace") ? "enableCSRMarketplace" :
    pathname.includes("/interests") ? "enableCompanyInterest" :
    pathname.includes("/funds") ? "enableFundDisbursement" :
    pathname.includes("/milestones") || pathname.includes("/inspections") ? "enableMilestoneMonitoring" :
    pathname.includes("/reports") ? "enableReportsExport" :
    null;
  const isRouteFeatureDisabled = Boolean(
    isDashboard &&
    routeFeatureKey &&
    tenantFeatures[routeFeatureKey] === false
  );
  const dashboardContent = isRouteFeatureDisabled ? (
    <div className="mx-auto max-w-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
      <div className="text-sm font-extrabold uppercase tracking-widest text-amber-700">Feature Disabled</div>
      <h1 className="mt-2 text-2xl font-extrabold text-gov-navy">This feature is not enabled for your portal instance.</h1>
      <p className="mt-2 text-sm leading-6">Contact your Portal Admin to enable this module for your State Portal.</p>
    </div>
  ) : (
    isDashboard ? <PageGuard>{children}</PageGuard> : children
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#f4f5f7] text-[#333333] font-sans w-full max-w-full">


      {isDashboard && <div className="fixed top-0 left-0 right-0 h-1 z-[60] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600"></div>}

      {isDashboard ? (
        <header
          className="fixed top-1 left-0 right-0 h-[56px] z-50 bg-white/95 border-b border-slate-200/60 flex justify-between items-center px-4 md:px-6 shadow-xs"
        >
          <div className="contents">
            {/* Brand Logo */}
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden text-[#6b7280] hover:text-[#333333] focus:outline-none"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Toggle Navigation Menu"
              >
                <Menu size={20} />
              </button>

              <Link href={getDashboardHref()} className="flex min-w-0 items-center gap-3 hover:no-underline">
                <svg viewBox="0 0 100 100" className="w-9 h-9" fill="none" stroke="currentColor">
                  <polygon points="50,5 82,18 95,50 82,82 50,95 18,82 5,50 18,18" stroke="var(--primary)" strokeWidth="4.5" fill="var(--primary-light)" />
                  <path d="M28,32 L72,32 M32,44 L68,44 M28,56 L72,56 M36,68 L64,68" stroke="var(--saffron)" strokeWidth="3" strokeLinecap="round" />
                  <path d="M42,80 L58,80" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <div className="flex min-w-0 flex-col leading-none">
                  <span className="font-heading font-bold text-base text-slate-900 whitespace-nowrap">
                    Maha<span className="text-blue-600">CSR</span> Setu
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold mt-1 uppercase tracking-wider whitespace-nowrap hidden sm:block">
                    Smart CSR Platform
                  </span>
                </div>
              </Link>
            </div>

            {/* Dashboard Search */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="hidden md:flex items-center gap-2 max-w-sm w-full relative group text-left cursor-pointer"
            >
              <div className="w-full bg-slate-50/70 group-hover:bg-slate-100/90 group-hover:border-slate-300 border border-slate-200/80 rounded-xl py-2 pl-10 pr-16 text-xs text-slate-400 font-sans transition-all flex items-center shadow-2xs">
                <span>Search proposals, NGOs, or metrics...</span>
              </div>
              <Search size={14} className="absolute left-3 text-slate-400 group-hover:text-blue-600 transition-colors" />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none select-none text-[9px] font-semibold text-slate-400 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded-md">
                <span>⌘</span>
                <span>K</span>
              </div>
            </button>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {/* Messages */}
              <Link href="/chat" className="text-slate-400 hover:text-slate-900 transition-colors relative p-2 rounded-xl hover:bg-slate-50/80">
                <Mail size={16} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500" />
              </Link>

              {/* Notifications */}
              <div className="relative" ref={notificationsDropdownRef}>
                <button
                  className="text-slate-400 hover:text-slate-900 transition-colors p-2 rounded-xl hover:bg-slate-50/80"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                >
                  <Bell size={16} />
                  {notifications.some((notification) => !notification.isRead) && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute -right-12 sm:right-0 mt-3 w-[calc(100vw-32px)] max-w-[340px] sm:max-w-none sm:w-96 bg-white backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 z-50 flex flex-col gap-3 shadow-xl">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-900">Notifications</span>
                        {notifications.filter(n => !n.isRead).length > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-extrabold text-[10px]">
                            {notifications.filter(n => !n.isRead).length} new
                          </span>
                        )}
                      </div>
                      {notifications.some(n => !n.isRead) && (
                        <button
                          onClick={() => {
                            apiFetch("/notifications/read-all", { method: "PATCH" })
                              .then(() => setNotifications((items) => items.map((item) => ({ ...item, isRead: true }))))
                              .catch(() => {});
                          }}
                          className="text-[10px] text-blue-700 font-bold cursor-pointer hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div
                      className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1 select-none"
                      data-lenis-prevent="true"
                      style={{ overscrollBehavior: "contain", touchAction: "pan-y" }}
                      onWheel={(e) => e.stopPropagation()}
                    >
                      {notifications.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500 text-center font-medium">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => {
                              if (!notification.isRead) {
                                apiFetch(`/notifications/${notification.id}/read`, { method: "PATCH" }).catch(() => {});
                              }
                              setNotificationsOpen(false);
                              const target = resolveNotificationUrl(notification as any, storeIsAdmin);
                              router.push(target);
                            }}
                            className={`p-3 rounded-xl border flex flex-col gap-1 text-[11px] transition-colors cursor-pointer hover:border-blue-300 ${
                              notification.isRead ? "bg-slate-50/60 border-slate-200/60 text-slate-600" : "bg-orange-50/50 border-orange-200/80 text-slate-900 font-medium"
                            }`}
                          >
                            <div className="flex justify-between items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">{notification.title}</span>
                              {!notification.isRead && <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0 animate-pulse" />}
                            </div>
                            <span className="text-xs text-slate-600 line-clamp-2">{notification.message}</span>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="pt-2 border-t border-slate-100 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setNotificationsOpen(false);
                          router.push("/notifications");
                        }}
                        className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline block w-full py-1 cursor-pointer"
                      >
                        Show all notifications →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* User Dropdown */}
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-50/80 transition-colors cursor-pointer"
                  aria-label="User Account Menu"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-heading font-bold text-xs shadow-sm shadow-blue-500/20">
                    {userInitials}
                  </div>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-white backdrop-blur-xl border border-slate-200/50 rounded-2xl py-2 z-50 shadow-lg">
                    <div className="px-4 py-2.5 border-b border-slate-100 flex flex-col">
                      <span className="text-xs font-bold text-slate-900 truncate" title={userName}>
                        {userName}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate mt-0.5" title={effectiveEmail}>
                        {effectiveEmail}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        router.push("/profile");
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-900 transition-colors flex items-center gap-2 mt-1 cursor-pointer"
                    >
                      <User size={14} className="text-slate-400" /> Profile
                    </button>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        router.push("/settings");
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-900 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Settings size={14} className="text-slate-400" /> Settings
                    </button>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50/40 transition-colors flex items-center gap-2 border-t border-slate-100 mt-1 pt-2 cursor-pointer"
                    >
                      <LogOut size={14} className="text-red-400" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      ) : (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "liquid-glass-nav-scrolled"
            : "liquid-glass-nav"
        }`}>
          <div className="max-w-[1380px] w-full mx-auto px-4 sm:px-6 md:px-8 h-14 sm:h-[60px] flex items-center justify-between">
            {/* Left Block: Brand & Seal combined */}
            <div className="flex items-center gap-3.5 min-w-0">
              <Link href="/" className="flex items-center gap-2 hover:no-underline shrink-0">
                <img
                  src="/maharashtra_seal.png"
                  alt="Government of Maharashtra Seal"
                  className="h-8 w-8 sm:h-9 sm:w-9 object-contain drop-shadow-sm"
                />
                <div className="hidden md:flex flex-col text-[9px] sm:text-[11px] font-semibold leading-tight text-slate-800">
                  <span>Government of Maharashtra</span>
                  <span className="text-slate-400 font-normal">महाराष्ट्र शासन</span>
                </div>
              </Link>

              <div className="h-6 w-[1px] bg-slate-200/80 shrink-0 hidden md:block" />

              <Link href="/" className="flex flex-col leading-none hover:no-underline shrink-0">
                <span className="font-heading font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                  Maha<span className="text-blue-600">CSR</span> Setu
                </span>
                <span className="text-[8px] font-bold text-blue-600 mt-0.5 uppercase tracking-wider">
                  महाराष्ट्र CSR सेतु
                </span>
              </Link>
            </div>

            {/* Middle Block: Menu Links (Desktop) */}
            <nav className="hidden lg:flex items-center gap-1 h-full text-xs font-bold uppercase tracking-wider text-slate-600">
              <Link
                href="/"
                className={`px-3 py-1 rounded-full transition-all hover:no-underline ${
                  pathname === "/"
                    ? "bg-blue-600/10 text-blue-600 font-bold border border-blue-500/20 shadow-sm"
                    : "hover:bg-slate-900/5 hover:text-slate-900"
                }`}
              >
                Home
              </Link>

              {publicNavGroups.map((group) => {
                const isActive = pathname === group.href || group.links.some((link) => pathname === link.href || pathname.startsWith(link.href + "/"));
                const isOpen = openNavGroup === group.label;
                return (
                  <div
                    key={group.label}
                    className="relative py-2"
                    onMouseEnter={() => setOpenNavGroup(group.label)}
                    onMouseLeave={() => setOpenNavGroup(null)}
                    onFocusCapture={() => setOpenNavGroup(group.label)}
                    onBlurCapture={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                        setOpenNavGroup(null);
                      }
                    }}
                  >
                    <Link
                      href={group.href}
                      onClick={() => setOpenNavGroup(null)}
                      className={`px-3 py-1 rounded-full flex items-center gap-1 transition-all hover:no-underline ${
                        isActive
                          ? "bg-blue-600/10 text-blue-600 font-bold border border-blue-500/20 shadow-sm"
                          : "hover:bg-slate-900/5 hover:text-slate-900"
                      }`}
                    >
                      {group.label}
                      <ChevronDown
                        size={11}
                        aria-hidden="true"
                        className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </Link>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                           initial={{ opacity: 0, y: 10, scale: 0.95 }}
                           animate={{ opacity: 1, y: 0, scale: 1 }}
                           exit={{ opacity: 0, y: 10, scale: 0.95 }}
                           transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                           className="absolute left-0 top-full mt-1 z-[70] w-[250px] border border-white/40 bg-white backdrop-blur-2xl p-2 rounded-2xl shadow-[0_12px_40px_-8px_rgba(15,23,42,0.15)]"
                        >
                          {group.links.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setOpenNavGroup(null)}
                              className={`block px-3 py-1.5 rounded-xl text-xs font-medium leading-5 hover:no-underline transition-all ${
                                pathname === link.href || pathname.startsWith(link.href + "/")
                                  ? "bg-blue-50 text-blue-600 font-semibold"
                                  : "text-slate-600 hover:bg-slate-100/60 hover:text-slate-900"
                              }`}
                            >
                              {link.label}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </nav>

            {/* Right Block: Liquid Glass Buttons and Mobile Toggle */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/login"
                  className="liquid-glass-pill-btn inline-flex h-8 items-center justify-center px-4 text-xs font-bold text-slate-700 hover:text-slate-900 hover:no-underline"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 px-4.5 text-xs font-bold text-white hover:no-underline shadow-md shadow-blue-500/25 border border-white/20 transition-all hover:scale-105"
                >
                  Register
                </Link>
              </div>

              {/* Mobile Hamburger menu */}
              <button
                className="lg:hidden p-2 rounded-xl border border-slate-200/80 bg-slate-50/60 text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors focus:outline-none"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Toggle Navigation Menu"
              >
                <Menu size={18} />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Workspace */}
      <div className={isDashboard ? "flex flex-1 pt-[58px]" : (pathname === "/" || pathname === "/login" || pathname === "/register" || pathname.startsWith("/register/")) ? "flex flex-1 pt-0" : "flex flex-1 pt-20 sm:pt-24"}>

        {/* Desktop Sidebar */}
        {isDashboard && (
          <Sidebar
            collapsed={sidebarCollapsed}
            onCollapseToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            hovered={sidebarHovered}
            onHoverChange={setSidebarHovered}
            tenantFeatures={tenantFeatures}
          />
        )}

        {/* Mobile Sidebar */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex bg-black/60 lg:hidden"
            >
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="w-72 bg-white p-5 flex flex-col justify-between h-full border-r border-slate-200 shadow-2xl"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                    <span className="font-heading font-extrabold text-slate-900 text-sm">Navigation Menu</span>
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Close menu"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-160px)]" data-lenis-prevent>
                    {isDashboard ? (
                      isLoadingPermissions ? (
                        Array.from({ length: 6 }).map((_, idx) => (
                          <div key={idx} className="flex items-center rounded-lg py-3 px-3 justify-start gap-3 animate-pulse bg-slate-50">
                            <div className="h-4 w-4 bg-slate-200 rounded-full" />
                            <div className="h-3 bg-slate-200 rounded w-28" />
                          </div>
                        ))
                      ) : (
                        <div className="space-y-1.5">
                          <Link
                            href="/dashboard"
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                              pathname === "/dashboard"
                                ? "bg-blue-600 text-white font-extrabold shadow-2xs"
                                : "text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <LayoutDashboard size={18} className={pathname === "/dashboard" ? "text-white" : "text-slate-500"} />
                            <span>Dashboard</span>
                          </Link>

                          {NAVIGATION_GROUPS.map((group) => {
                            const children = group.childIds
                              .map((id) => NAVIGATION_MANIFEST.find((item) => item.id === id))
                              .filter((item): item is NavItemDef => {
                                if (!item || !item.showInSidebar) return false;
                                return isNavItemAllowed(item, hasPermission, storeIsAdmin);
                              });

                            if (children.length === 0) return null;

                            const isGroupExpanded = mobileOpenNavGroup === group.id;
                            const GroupIcon = resolveNavIcon(group.iconName);

                            return (
                              <div key={group.id} className="space-y-0.5">
                                <button
                                  type="button"
                                  onClick={() => setMobileOpenNavGroup(isGroupExpanded ? null : group.id)}
                                  className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 min-h-[44px]"
                                >
                                  <div className="flex items-center gap-3">
                                    <GroupIcon size={18} className="text-slate-500" />
                                    <span>{group.label}</span>
                                  </div>
                                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${isGroupExpanded ? "rotate-180" : ""}`} />
                                </button>

                                <AnimatePresence initial={false}>
                                  {isGroupExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden space-y-1 ml-4 pl-3 border-l border-slate-200"
                                    >
                                      {children.map((child) => {
                                        const ChildIcon = resolveNavIcon(child.iconName);
                                        const isChildActive = pathname === child.route || pathname.startsWith(child.route + "/");

                                        return (
                                          <Link
                                            key={child.id}
                                            href={child.route}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold min-h-[44px] ${
                                              isChildActive
                                                ? "bg-blue-600 text-white font-bold"
                                                : "text-slate-600 hover:bg-slate-100"
                                            }`}
                                          >
                                            <ChildIcon size={16} className={isChildActive ? "text-white" : "text-slate-400"} />
                                            <span>{child.label}</span>
                                          </Link>
                                        );
                                      })}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      )
                    ) : (
                      <>
                        {/* Home Link */}
                        <Link
                          href="/"
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                            pathname === "/"
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/10"
                              : "text-[#4b5563] hover:text-[#14274e] hover:bg-[#f4f5f7]"
                          }`}
                        >
                          <Layers size={16} className={pathname === "/" ? "text-white" : "text-[#97a0ac]"} />
                          <span>Home</span>
                        </Link>

                        {/* Partner with Maharashtra */}
                        <Link
                          href="/partner-with-maharashtra"
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                            pathname.startsWith("/partner-with-maharashtra")
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/10"
                              : "text-[#4b5563] hover:text-[#14274e] hover:bg-[#f4f5f7]"
                          }`}
                        >
                          <Handshake size={16} className={pathname.startsWith("/partner-with-maharashtra") ? "text-white" : "text-[#97a0ac]"} />
                          <span>Partner with Maharashtra</span>
                        </Link>

                        {/* Pitch a Development Need */}
                        <Link
                          href={isLoggedIn ? "/pitches/create" : "/login?next=/pitches/create"}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                            pathname.startsWith("/pitches/create") || pathname.startsWith("/pitch-development-need")
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/10"
                              : "text-[#4b5563] hover:text-[#14274e] hover:bg-[#f4f5f7]"
                          }`}
                        >
                          <Sparkles size={16} className={pathname.startsWith("/pitches/create") || pathname.startsWith("/pitch-development-need") ? "text-white" : "text-[#97a0ac]"} />
                          <span>Pitch a Development Need</span>
                        </Link>

                        {/* Divider */}
                        <div className="h-[1px] bg-slate-200/60 my-2" />

                        {/* Collapsible Public Nav Groups */}
                        {publicNavGroups.map((group) => {
                          const isGroupExpanded = mobileOpenNavGroup === group.label;
                          const isGroupActive = pathname === group.href || group.links.some((link) => pathname === link.href || pathname.startsWith(link.href + "/"));

                          return (
                            <div key={group.label} className="flex flex-col">
                              {/* Group Header Button */}
                              <button
                                onClick={() => setMobileOpenNavGroup(isGroupExpanded ? null : group.label)}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                                  isGroupActive
                                    ? "bg-blue-50/50 text-blue-700"
                                    : "text-[#4b5563] hover:text-[#14274e] hover:bg-[#f4f5f7]"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {group.label === "About" ? <HelpCircle size={16} className="text-[#97a0ac]" /> :
                                   group.label === "Projects" ? <Compass size={16} className="text-[#97a0ac]" /> :
                                   group.label === "Documents" ? <BookOpen size={16} className="text-[#97a0ac]" /> :
                                   group.label === "Updates" ? <FileText size={16} className="text-[#97a0ac]" /> :
                                   <Phone size={16} className="text-[#97a0ac]" />}
                                  <span>{group.label}</span>
                                </div>
                                <ChevronDown
                                  size={14}
                                  className={`transition-transform duration-200 text-slate-400 ${
                                    isGroupExpanded ? "rotate-180" : ""
                                  }`}
                                />
                              </button>

                              {/* Group Sub-links (Collapsible) */}
                              <AnimatePresence initial={false}>
                                {isGroupExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                    className="overflow-hidden flex flex-col gap-0.5 ml-4 pl-3 border-l border-slate-100 mt-1 mb-2"
                                  >
                                    {group.links.map((link) => {
                                      const isLinkActive = pathname === link.href || pathname.startsWith(link.href + "/");
                                      return (
                                        <Link
                                          key={link.href}
                                          href={link.href}
                                          onClick={() => setMobileMenuOpen(false)}
                                          className={`flex items-center px-3 py-2 rounded-lg text-[11px] font-medium transition-all ${
                                            isLinkActive
                                              ? "bg-blue-50 text-blue-600 font-bold"
                                              : "text-slate-500 hover:text-slate-800 hover:bg-[#f4f5f7]"
                                          }`}
                                        >
                                          {link.label}
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
                </div>
                <div className="flex flex-col gap-2 pt-3 border-t border-[#e0e4ea]">
                  {isDashboard ? (
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2.5 text-xs text-[#c62828] hover:bg-[#fdecea] rounded-lg flex items-center gap-3 transition-all"
                    >
                      <LogOut size={16} />
                      <span>Log Out</span>
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Link
                        href="/login"
                        className="w-full text-center py-2 rounded-lg text-xs font-bold text-[#4b5563] hover:bg-[#f4f5f7] border border-[#e0e4ea]"
                      >
                        Login
                      </Link>
                      <Link
                        href="/register"
                        className="w-full text-center py-2 rounded-lg text-xs font-bold text-white bg-[#1789d6] hover:bg-[#146fb0]"
                      >
                        Register
                      </Link>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className={`flex-grow flex flex-col min-w-0 transition-all duration-300 ease-in-out ${isDashboard ? (isExpanded ? "lg:ml-64" : "lg:ml-[68px]") : ""}`}>
          <main id="main-content" className={`flex-grow ${isDashboard ? "px-3.5 py-3.5 md:px-6 md:py-4" : ""}`}>
            {dashboardContent}
          </main>
          {isDashboard ? (
            <footer className="border-t border-[#e0e4ea] bg-white py-5 px-6 md:px-10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#6b7280] font-medium shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-[#14274e] text-sm">MahaCSR</span>
                <span>Government of Maharashtra Enterprise CSR Platform. Approved under MCA Section 135.</span>
              </div>
              <div className="flex gap-6">
                <Link href="#" className="hover:text-[#14274e] transition-colors">Privacy Policy</Link>
                <Link href="#" className="hover:text-[#14274e] transition-colors">Compliance Audits</Link>
                <Link href="#" className="hover:text-[#14274e] transition-colors">Support Center</Link>
              </div>
            </footer>
          ) : (
            <footer className="bg-gradient-to-b from-slate-900 to-slate-950 text-white">
              {/* Main Footer Content */}
              <div className="mx-auto max-w-[1380px] px-5 py-14 md:px-8">
                <div className="grid gap-12 md:grid-cols-[1.4fr_0.8fr_0.8fr_1.1fr]">
                  {/* Brand Column */}
                  <div>
                    <Link href="/" className="inline-flex items-center gap-3 text-white hover:no-underline group">
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-colors">
                        <svg viewBox="0 0 100 100" className="h-6 w-6" fill="none" stroke="currentColor">
                          <polygon points="50,5 82,18 95,50 82,82 50,95 18,82 5,50 18,18" stroke="#ffffff" strokeWidth="5" fill="rgba(255,255,255,0.06)" />
                          <path d="M28,32 L72,32 M32,44 L68,44 M28,56 L72,56 M36,68 L64,68" stroke="#f7941d" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-lg font-bold tracking-tight">Maha<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">CSR</span> Setu</div>
                        <div className="text-[10px] font-medium text-slate-400 tracking-wide">Government of Maharashtra</div>
                      </div>
                    </Link>
                    <p className="mt-5 text-xs leading-relaxed text-slate-400 max-w-xs">
                      Maharashtra's unified CSR convergence platform — connecting corporates, government departments, and implementing agencies for transparent, district-level development.
                    </p>
                    <div className="mt-6 flex gap-2.5">
                      {[
                        { label: "f", href: "#" },
                        { label: "X", href: "#" },
                        { label: "in", href: "#" },
                        { label: "yt", href: "#" },
                      ].map((item) => (
                        <a
                          key={item.label}
                          href={item.href}
                          className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 border border-white/10 text-[10px] font-extrabold text-slate-400 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all"
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Quick Links */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">Quick Links</h3>
                    <div className="mt-5 flex flex-col gap-3">
                      {[
                        { label: "About MahaCSR", href: "/about" },
                        { label: "Partner with Maharashtra", href: "/partner-with-maharashtra" },
                        { label: "Pitch a Development Need", href: "/pitches/create" },
                        { label: "Development Needs (Live)", href: "/public-development-needs" },
                        { label: "Workflow Explainer", href: "/workflow" },
                        { label: "Knowledge Center", href: "/knowledge" },
                        { label: "Helpdesk", href: "/help" },
                      ].map((link) => (
                        <Link key={link.label} href={link.href} className="text-xs text-slate-400 hover:text-white transition-colors hover:no-underline">
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Information */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">Information</h3>
                    <div className="mt-5 flex flex-col gap-3">
                      {[
                        { label: "Privacy Policy", href: "#" },
                        { label: "Terms of Use", href: "#" },
                        { label: "Compliance Audits", href: "#" },
                        { label: "Sitemap", href: "#" },
                        { label: "Accessibility", href: "#" },
                      ].map((link) => (
                        <Link key={link.label} href={link.href} className="text-xs text-slate-400 hover:text-white transition-colors hover:no-underline">
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Contact */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">Contact Us</h3>
                    <div className="mt-5 flex flex-col gap-4">
                      <div className="flex gap-3 text-xs text-slate-400 leading-relaxed">
                        <div className="h-8 w-8 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                          <MapPin size={14} />
                        </div>
                        <span>Maharashtra CSR Authority, 7th Floor, Mantralaya Annexe, Mumbai - 400 032</span>
                      </div>
                      <div className="flex gap-3 items-center text-xs text-slate-400">
                        <div className="h-8 w-8 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                          <Mail size={14} />
                        </div>
                        <span>support@mahacsr.gov.in</span>
                      </div>
                      <div className="flex gap-3 items-center text-xs text-slate-400">
                        <div className="h-8 w-8 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                          <Phone size={14} />
                        </div>
                        <span>022-2202 1234</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Bar */}
              <div className="border-t border-white/5">
                <div className="mx-auto flex max-w-[1380px] flex-col gap-3 px-5 py-4 text-[11px] font-medium text-slate-500 md:flex-row md:items-center md:justify-between md:px-8">
                  <span>&copy; 2026 Government of Maharashtra. All rights reserved.</span>
                  <span className="hidden md:block">Best viewed in Chrome 90+, Firefox 90+, Edge 90+, Safari 13+</span>
                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="inline-flex items-center gap-1.5 text-slate-500 hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0"
                  >
                    <ArrowUp size={12} /> Back to top
                  </button>
                </div>
              </div>
            </footer>
          )}
        </div>

      </div>

      {/* Global Command Palette & Search Modal */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />

    </div>
  );
}

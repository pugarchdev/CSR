"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Building2, Landmark, Search, Bell, Mail, ChevronLeft, ChevronRight,
  Layers, Sparkles, Award, Coins, Compass, FileText, BarChart2,
  HelpCircle, Menu, X, LogOut, ShieldCheck, BookOpen, ShieldAlert,
  Clock, Users, Globe2, ChevronDown, ArrowUp, MapPin, Phone, CheckCircle2, Handshake
} from "lucide-react";
import { Button } from "./ui/Button";
import { apiFetch, getStoredUser } from "@/lib/api";

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
      { label: "Project Directory", href: "/marketplace" },
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; isRead: boolean }>>([]);
  const [userEmail, setUserEmail] = useState("user@mahacsr.gov.in");
  const [tenantFeatures, setTenantFeatures] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
    pathname.startsWith("/track");

  const isDashboard = pathname.startsWith("/ngo-dashboard") || 
                      pathname.startsWith("/company-dashboard") || 
                      pathname.startsWith("/government-portal") ||
                      pathname.startsWith("/department") ||
                      pathname.startsWith("/company/") ||
                      pathname === "/company" ||
                      pathname.startsWith("/ngo/") ||
                      pathname === "/ngo" ||
                      pathname.startsWith("/district") ||
                      pathname.startsWith("/organization") ||
                      pathname.startsWith("/master") ||
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
                      pathname.startsWith("/chat") || 
                      pathname.startsWith("/analytics") || 
                      pathname.startsWith("/beneficiary") ||
                      pathname.startsWith("/admin") ||
                      ((pathname.startsWith("/csr-marketplace") || pathname.startsWith("/marketplace")) && isLoggedIn);

  useEffect(() => {
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
    setUserDropdownOpen(false);
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
      "/circulars",
      "/news",
      "/contact",
      "/csr-policy",
      "/convergence",
      "/resources",
      "/reports",
      "/help"
    ];

    const isPublicRoute = 
      cleanPath === "/" ||
      cleanPath === "/login" ||
      cleanPath === "/register" ||
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

      const role = user.role as string;
      const allowed =
        (pathname.startsWith("/ngo-dashboard") && ["NGO_ADMIN", "NGO_MEMBER"].includes(role)) ||
        (pathname.startsWith("/company-dashboard") && ["COMPANY_ADMIN", "COMPANY_MEMBER"].includes(role)) ||
        (pathname.startsWith("/government-portal") && ["MASTER_ADMIN", "SUPER_ADMIN", "PORTAL_ADMIN", "DISTRICT_ADMIN"].includes(role)) ||
        ((pathname === "/company" || pathname.startsWith("/company/")) && ["MASTER_ADMIN", "COMPANY_ADMIN", "COMPANY_MEMBER", "SUPER_ADMIN"].includes(role)) ||
        ((pathname === "/ngo" || pathname.startsWith("/ngo/")) && ["MASTER_ADMIN", "NGO_ADMIN", "NGO_MEMBER", "SUPER_ADMIN"].includes(role)) ||
        (pathname.startsWith("/district") && ["MASTER_ADMIN", "DISTRICT_ADMIN", "SUPER_ADMIN", "PORTAL_ADMIN", "CSR_ADMIN"].includes(role)) ||
        (pathname.startsWith("/organization") && ["MASTER_ADMIN", "BENEFICIARY_AGENCY", "COMPANY_ADMIN", "COMPANY_MEMBER", "NGO_ADMIN", "NGO_MEMBER", "DISTRICT_ADMIN", "PORTAL_ADMIN", "CSR_ADMIN", "SUPER_ADMIN"].includes(role)) ||
        (pathname.startsWith("/master") && role === "MASTER_ADMIN") ||
        (pathname.startsWith("/admin") && ["MASTER_ADMIN", "SUPER_ADMIN", "DISTRICT_ADMIN", "PORTAL_ADMIN", "CSR_ADMIN"].includes(role)) ||
        ((pathname.startsWith("/beneficiary") || pathname.startsWith("/department")) && ["MASTER_ADMIN", "BENEFICIARY_AGENCY", "SUPER_ADMIN"].includes(role)) ||
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
        pathname.startsWith("/chat") ||
        pathname.startsWith("/analytics");

      if (!allowed) {
        if (role === "MASTER_ADMIN") router.push("/master/dashboard");
        else if (["NGO_ADMIN", "NGO_MEMBER"].includes(role)) router.push("/ngo/dashboard");
        else if (["COMPANY_ADMIN", "COMPANY_MEMBER"].includes(role)) router.push("/company/dashboard");
        else if (role === "SUPER_ADMIN") router.push("/admin");
        else if (role === "DISTRICT_ADMIN") router.push("/district/dashboard");
        else if (role === "PORTAL_ADMIN") router.push("/government-portal");
        else if (role === "BENEFICIARY_AGENCY") router.push("/department/dashboard");
        else router.push("/");
      }
    }
  }, [mounted, isDashboard, pathname, router]);

  useEffect(() => {
    if (!isDashboard) return;

    apiFetch<Array<{ id: string; title: string; message: string; isRead: boolean }>>("/notifications")
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, [isDashboard, pathname]);

  useEffect(() => {
    if (!isDashboard) return;
    const user = getStoredUser();
    if (!user || user.role === "MASTER_ADMIN") {
      setTenantFeatures({});
      return;
    }
    apiFetch<{ features: Record<string, boolean> }>("/platform/features")
      .then((data) => setTenantFeatures(data.features || {}))
      .catch(() => setTenantFeatures({}));
  }, [isDashboard, pathname]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const storedUser = typeof window !== "undefined" ? getStoredUser() : null;
  const storedRole = storedUser?.role as string | undefined;
  const storedOrganizationType = storedUser?.organization?.organizationType as string | undefined;

  const getSidebarItems = () => {
    const departmentItems = [
      { label: "Dashboard", href: "/department/dashboard", icon: Layers },
      { label: "Organization Onboarding", href: "/organization/onboarding", icon: Landmark },
      { label: "Onboarding Status", href: "/organization/onboarding/status", icon: Clock },
      { label: "Create Requirement", href: "/department/requirements/create", icon: Sparkles, featureKey: "enableRequirementCreation" },
      { label: "My Requirements", href: "/department/requirements", icon: Compass, featureKey: "enableRequirementCreation" },
      { label: "Company Interest", href: "/department/interests", icon: Compass, featureKey: "enableCompanyInterest" },
      { label: "Projects", href: "/department/projects", icon: ShieldCheck },
      { label: "Handover", href: "/department/handover", icon: Layers },
      { label: "Reports", href: "/department/reports", icon: BarChart2, featureKey: "enableReportsExport" },
      { label: "Users", href: "/organization/users", icon: Users },
      { label: "Roles", href: "/organization/roles", icon: ShieldAlert },
      { label: "Settings", href: "/organization/settings", icon: ShieldCheck }
    ];

    const companyItems = [
      { label: "Dashboard", href: "/company/dashboard", icon: Layers },
      { label: "Organization Onboarding", href: "/organization/onboarding", icon: Landmark },
      { label: "Onboarding Status", href: "/organization/onboarding/status", icon: Clock },
      { label: "Project Marketplace", href: "/company/marketplace", icon: Compass, featureKey: "enableCSRMarketplace" },
      { label: "My Interests", href: "/company/interests", icon: Sparkles, featureKey: "enableCompanyInterest" },
      { label: "Funded Projects", href: "/company/projects", icon: ShieldCheck },
      { label: "Fund Releases", href: "/company/funds", icon: Coins, featureKey: "enableFundDisbursement" },
      { label: "Reports", href: "/company/reports", icon: BarChart2, featureKey: "enableReportsExport" },
      { label: "Users", href: "/organization/users", icon: Users },
      { label: "Roles", href: "/organization/roles", icon: ShieldAlert },
      { label: "Settings", href: "/organization/settings", icon: ShieldCheck }
    ];

    const ngoOrganizationItems = [
      { label: "Dashboard", href: "/ngo/dashboard", icon: Layers },
      { label: "Organization Onboarding", href: "/organization/onboarding", icon: Landmark },
      { label: "Onboarding Status", href: "/organization/onboarding/status", icon: Clock },
      { label: "Proposal Requests", href: "/ngo/proposal-requests", icon: Compass, featureKey: "enableCSRMarketplace" },
      { label: "Assigned Projects", href: "/ngo/assigned-projects", icon: ShieldCheck },
      { label: "Milestones", href: "/ngo/milestones", icon: Award, featureKey: "enableMilestoneMonitoring" },
      { label: "Fund Releases", href: "/ngo/funds", icon: Coins, featureKey: "enableFundDisbursement" },
      { label: "Reports", href: "/ngo/reports", icon: BarChart2, featureKey: "enableReportsExport" },
      { label: "Users", href: "/organization/users", icon: Users },
      { label: "Roles", href: "/organization/roles", icon: ShieldAlert },
      { label: "Settings", href: "/organization/settings", icon: ShieldCheck }
    ];

    if (storedRole === "MASTER_ADMIN" || pathname.startsWith("/master")) {
      return [
        { label: "Dashboard", href: "/master/dashboard", icon: Layers },
        { label: "Tenants", href: "/master/tenants", icon: Globe2 },
        { label: "Create Tenant", href: "/master/tenants/create", icon: Sparkles },
        { label: "Organizations", href: "/master/organizations", icon: Landmark },
        { label: "Users", href: "/master/users", icon: Users },
        { label: "Audit Logs", href: "/master/audit-logs", icon: FileText },
        { label: "Settings", href: "/master/settings", icon: ShieldCheck }
      ];
    }

    if (storedRole === "BENEFICIARY_AGENCY" || pathname.startsWith("/beneficiary") || pathname.startsWith("/department")) {
      return departmentItems;
    }

    if (["COMPANY_ADMIN", "COMPANY_MEMBER"].includes(storedRole || "") || pathname === "/company" || pathname.startsWith("/company/")) {
      return companyItems;
    }

    if (["NGO_ADMIN", "NGO_MEMBER"].includes(storedRole || "") || pathname === "/ngo" || pathname.startsWith("/ngo/")) {
      return ngoOrganizationItems;
    }

    if (storedRole === "DISTRICT_ADMIN" || pathname.startsWith("/district")) {
      return [
        { label: "Dashboard", href: "/district/dashboard", icon: Layers },
        { label: "Requirements", href: "/district/requirements", icon: Compass },
        { label: "Projects", href: "/district/projects", icon: ShieldCheck },
        { label: "Inspections", href: "/district/inspections", icon: Landmark, featureKey: "enableMilestoneMonitoring" },
        { label: "Reports", href: "/district/reports", icon: BarChart2, featureKey: "enableReportsExport" }
      ];
    }

    if (storedRole === "PORTAL_ADMIN" || pathname.startsWith("/government-portal")) {
      return [
        { label: "Statewide Monitor", href: "/government-portal/statewide", icon: Layers },
        { label: "District Register", href: "/government-portal/district", icon: Compass },
        { label: "Verification Queues", href: "/government-portal/ngo-verify", icon: Landmark },
        { label: "Project Approvals", href: "/government-portal/project-verify", icon: ShieldCheck },
        { label: "Compliance Audit", href: "/government-portal/compliance", icon: ShieldAlert },
        { label: "GIS Heatmap", href: "/government-portal/heatmaps", icon: Compass },
        { label: "Circulars", href: "/government-portal/circulars", icon: FileText },
        { label: "Reports", href: "/government-portal/reports", icon: BarChart2 }
      ];
    }

    if (["SUPER_ADMIN", "CSR_ADMIN"].includes(storedRole || "") || pathname.startsWith("/admin")) {
      return [
        { label: "Dashboard", href: "/admin/dashboard", icon: Layers },
        { label: "Users", href: "/admin/users-roles", icon: Users },
        { label: "Onboarding Approvals", href: "/admin/onboarding-approvals", icon: ShieldCheck },
        { label: "Organizations", href: "/admin/organizations", icon: Landmark },
        { label: "NGO Registry", href: "/admin/ngo-registry", icon: Landmark },
        { label: "Companies", href: "/admin/companies", icon: Building2 },
        { label: "Requirements Pending", href: "/admin/requirements/pending", icon: Clock, featureKey: "enableRequirementCreation" },
        { label: "Company Interests", href: "/admin/company-interests", icon: Sparkles, featureKey: "enableCompanyInterest" },
        { label: "NGO Selection", href: "/admin/ngo-selection", icon: Award, featureKey: "enableNGOSelection" },
        { label: "Fund Monitoring", href: "/admin/fund-monitoring", icon: Coins, featureKey: "enableFundDisbursement" },
        { label: "Projects", href: "/admin/projects", icon: Compass },
        { label: "Verification Queue", href: "/admin/applications", icon: Clock },
        { label: "Executive Dashboard", href: "/admin/executive-dashboard", icon: BarChart2 },
        { label: "Reports", href: "/admin/reports", icon: BarChart2 },
        { label: "Audit Trail", href: "/admin/audit-trail", icon: FileText }
      ];
    }

    if (pathname.startsWith("/organization")) {
      if (
        pathname.startsWith("/organization/onboarding/department") ||
        storedRole === "BENEFICIARY_AGENCY" ||
        storedOrganizationType === "GOVERNMENT_DEPARTMENT"
      ) {
        return departmentItems;
      }
      if (
        pathname.startsWith("/organization/onboarding/company") ||
        ["COMPANY_ADMIN", "COMPANY_MEMBER"].includes(storedRole || "") ||
        storedOrganizationType === "CSR_COMPANY"
      ) {
        return companyItems;
      }
      if (["NGO_ADMIN", "NGO_MEMBER"].includes(storedRole || "") || storedOrganizationType === "NGO") {
        return ngoOrganizationItems;
      }
      return [
        { label: "Onboarding", href: "/organization/onboarding", icon: Landmark },
        { label: "Status", href: "/organization/onboarding/status", icon: Clock },
        { label: "Users", href: "/organization/users", icon: Users },
        { label: "Roles", href: "/organization/roles", icon: ShieldAlert },
        { label: "Settings", href: "/organization/settings", icon: ShieldCheck }
      ];
    }

    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/queries") ||
      pathname.startsWith("/csr-projects") ||
      pathname.startsWith("/payments") ||
      pathname.startsWith("/fund-releases") ||
      pathname.startsWith("/reports") ||
      pathname.startsWith("/audit-logs") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/settings")
    ) {
      return [
        { label: "Dashboard", href: "/dashboard", icon: Layers },
        { label: "Onboarding", href: "/onboarding", icon: Landmark },
        { label: "Documents", href: "/onboarding/documents", icon: BookOpen },
        { label: "Queries", href: "/queries", icon: Mail },
        { label: "CSR Projects", href: "/csr-projects", icon: Compass },
        { label: "Payments", href: "/payments", icon: Coins },
        { label: "Fund Releases", href: "/fund-releases", icon: ShieldCheck },
        { label: "Reports", href: "/reports", icon: BarChart2 },
        { label: "Audit Logs", href: "/audit-logs", icon: FileText },
        { label: "Profile", href: "/profile", icon: Users },
        { label: "Settings", href: "/settings", icon: ShieldAlert }
      ];
    }

    if (pathname.startsWith("/ngo-dashboard")) {
      return [
        { label: "Overview", href: "/ngo-dashboard/overview", icon: Layers },
        { label: "Organization Profile", href: "/ngo-dashboard/profile", icon: Landmark },
        { label: "Projects", href: "/ngo-dashboard/projects", icon: Compass },
        { label: "Applications", href: "/ngo-dashboard/submitted", icon: Clock },
        { label: "Milestones", href: "/ngo-dashboard/milestones", icon: Award },
        { label: "Documents", href: "/ngo-dashboard/documents", icon: BookOpen },
        { label: "Reports", href: "/ngo-dashboard/reports", icon: BarChart2 }
      ];
    }
    
    if (pathname.startsWith("/company-dashboard")) {
      return [
        { label: "Overview", href: "/company-dashboard/overview", icon: Layers },
        { label: "CSR Budget", href: "/company-dashboard/budget", icon: Coins },
        { label: "Project Directory", href: "/company-dashboard/marketplace", icon: Compass },
        { label: "Recommendations", href: "/company-dashboard/recommendations", icon: Sparkles },
        { label: "Funded Projects", href: "/company-dashboard/funded", icon: ShieldCheck },
        { label: "Milestones", href: "/company-dashboard/milestones", icon: Award },
        { label: "Reports", href: "/company-dashboard/reports", icon: BarChart2 }
      ];
    }

    return [
      { label: "Overview Console", href: "/ngo-dashboard", icon: Layers },
      { label: "Directory", href: "/directory", icon: Compass },
      { label: "Collaboration Hub", href: "/chat", icon: Mail },
      { label: "Knowledge Center", href: "/knowledge", icon: BookOpen },
      { label: "About Mandate", href: "/about", icon: HelpCircle }
    ];
  };

  const dashboardNavigationItems = getSidebarItems().filter((item) => !("featureKey" in item) || !item.featureKey || tenantFeatures[item.featureKey] !== false);
  const routeFeatureKey =
    pathname.includes("/requirements") ? "enableRequirementCreation" :
    pathname.includes("/marketplace") ? "enableCSRMarketplace" :
    pathname.includes("/interests") ? "enableCompanyInterest" :
    pathname.includes("/funds") ? "enableFundDisbursement" :
    pathname.includes("/milestones") || pathname.includes("/inspections") ? "enableMilestoneMonitoring" :
    pathname.includes("/reports") ? "enableReportsExport" :
    null;
  const isRouteFeatureDisabled = Boolean(
    isDashboard &&
    routeFeatureKey &&
    storedRole !== "MASTER_ADMIN" &&
    tenantFeatures[routeFeatureKey] === false
  );
  const dashboardContent = isRouteFeatureDisabled ? (
    <div className="mx-auto max-w-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
      <div className="text-sm font-extrabold uppercase tracking-widest text-amber-700">Feature Disabled</div>
      <h1 className="mt-2 text-2xl font-extrabold text-gov-navy">This feature is not enabled for your portal instance.</h1>
      <p className="mt-2 text-sm leading-6">Contact your Portal Admin or Master Admin to enable this module for your State Portal.</p>
    </div>
  ) : children;

  if (usesGovPortalShell && isLoggedIn) {
    return <>{children}</>;
  }

  if (isDashboard && !mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f6f8fb]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f6f8fb] text-slate-900 font-sans">
     

      {isDashboard && <div className="fixed top-0 left-0 right-0 h-1 z-[60] bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />}

      {isDashboard ? (
        <header
          className="fixed top-1 left-0 right-0 h-[68px] z-50 bg-white border-b border-gov-line flex justify-between items-center px-6 md:px-10 shadow-sm"
        >
          <div className="contents">
            {/* Brand Logo */}
            <div className="flex items-center gap-4">
              <button 
                className="lg:hidden text-slate-500 hover:text-slate-700 focus:outline-none"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Toggle Navigation Menu"
              >
                <Menu size={20} />
              </button>
              
              <Link href="/" className="flex min-w-0 items-center gap-3 hover:no-underline">
                <svg viewBox="0 0 100 100" className="w-9 h-9" fill="none" stroke="currentColor">
                  <polygon points="50,5 82,18 95,50 82,82 50,95 18,82 5,50 18,18" stroke="#1e3a8a" strokeWidth="4.5" fill="#eff6ff" />
                  <path d="M28,32 L72,32 M32,44 L68,44 M28,56 L72,56 M36,68 L64,68" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
                  <path d="M42,80 L58,80" stroke="#1e3a8a" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <div className="flex min-w-0 flex-col leading-none">
                  <span className="font-heading font-extrabold text-lg tracking-tight text-[#1e3a8a]">
                    Maha<span className="text-[#f97316]">CSR</span> Setu
                  </span>
                  <span className="text-[8px] text-gray-500 tracking-wider font-extrabold mt-0.5 uppercase">
                    Government of Maharashtra | महाराष्ट्र शासन
                  </span>
                </div>
              </Link>
            </div>

            {/* Dashboard Search */}
            <div className="hidden md:flex items-center gap-2 max-w-sm w-full relative">
              <input 
                type="text" 
                placeholder="Search proposals, NGOs, or metrics..." 
                className="govt-input pr-10 focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] transition-all font-sans"
                style={{ paddingLeft: "2.5rem" }}
              />
              <Search size={14} className="absolute left-3 text-slate-400" />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none select-none text-[10px] font-extrabold text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md">
                <span>Ctrl</span>
                <span>K</span>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {/* Messages */}
              <Link href="/chat" className="text-slate-400 hover:text-[#1e3a8a] transition-colors relative">
                <Mail size={18} />
                <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-[#f97316]" />
              </Link>

              {/* Notifications */}
              <div className="relative">
                <button 
                  className="text-slate-400 hover:text-[#1e3a8a] transition-colors"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                >
                  <Bell size={18} />
                  {notifications.some((notification) => !notification.isRead) && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white" />
                  )}
                </button>
                
                {notificationsOpen && (
                  <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-xl p-4 shadow-lg z-50 flex flex-col gap-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-xs font-extrabold text-slate-900">Notifications</span>
                      <button
                        onClick={() => {
                          apiFetch("/notifications/read-all", { method: "PATCH" })
                            .then(() => setNotifications((items) => items.map((item) => ({ ...item, isRead: true }))))
                            .catch(() => {});
                        }}
                        className="text-[10px] text-[#1e3a8a] font-bold cursor-pointer hover:underline"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                          No notifications yet.
                        </div>
                      ) : notifications.slice(0, 8).map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-lg border flex flex-col gap-1 text-[11px] ${
                            notification.isRead ? "bg-slate-50 border-slate-200" : "bg-blue-50 border-blue-200"
                          }`}
                        >
                          <span className="font-bold text-slate-800">{notification.title}</span>
                          <span className="text-slate-600">{notification.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#1e3a8a] to-[#f97316] text-white flex items-center justify-center font-heading font-extrabold text-xs shadow-sm">
                    U
                  </div>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-52 bg-white border border-slate-200 rounded-xl py-2 shadow-lg z-50">
                    <div className="px-4 py-2.5 border-b border-slate-100 flex flex-col">
                      <span className="text-xs font-bold text-slate-900">User Account</span>
                      <span className="text-[10px] text-slate-400 truncate">{userEmail}</span>
                    </div>
                    <button
                      onClick={() => router.push("/profile")}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#1e3a8a] transition-colors flex items-center gap-2 mt-1"
                    >
                      <Users size={14} /> Account
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 border-t border-slate-100 mt-1"
                    >
                      <LogOut size={14} /> Log Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      ) : (
        <header className="sticky top-0 z-50 border-b border-[#d8e2ef] bg-white shadow-sm flex flex-col w-full">
          {/* Tier 1: Top Bar (White) */}
          <div className="bg-white border-b border-[#e2e8f0] h-[76px] sm:h-[84px] flex items-center justify-between px-4 sm:px-6 md:px-8 max-w-[1380px] w-full mx-auto">
            {/* Left Block: Government Seal & MahaCSR Setu Brand */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              {/* Gov Seal Logo */}
              <Link href="/" className="flex items-center gap-2 hover:no-underline shrink-0">
                <img 
                  src="/maharashtra_seal.png" 
                  alt="Government of Maharashtra Seal" 
                  className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
                />
                <div className="flex flex-col text-[11px] sm:text-xs font-bold leading-tight text-slate-800 tracking-tight">
                  <span>Government of Maharashtra</span>
                  <span className="text-slate-500">महाराष्ट्र शासन</span>
                </div>
              </Link>

              {/* Vertical Divider */}
              <div className="hidden min-[480px]:block h-8 w-[1px] bg-slate-300 shrink-0" />

              {/* Brand Logo */}
              <Link href="/" className="hidden min-h-0 min-[480px]:flex flex-col leading-none hover:no-underline shrink-0">
                <span className="font-heading font-black text-lg sm:text-[22px] tracking-tight text-[#12325a]">
                  Maha<span className="text-[#f97316]">CSR</span> Setu
                </span>
                <span className="text-[10px] font-bold text-[#d97706] tracking-wider mt-0.5">
                  महाराष्ट्र CSR सेतु
                </span>
              </Link>

              {/* Vertical Divider */}
              <div className="hidden lg:block h-8 w-[1px] bg-slate-300 shrink-0" />

              {/* Subtitle taglines */}
              <div className="hidden lg:flex flex-col text-[11px] leading-tight font-extrabold text-slate-500 shrink-0">
                <span className="text-[#12325a]">Converging Initiatives.</span>
                <span className="text-[#d97706]">Transforming Maharashtra.</span>
              </div>
            </div>

            {/* Right Block: Accessibility, Language, and Auth Actions */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
             

             

              {/* Login & Register buttons */}
              <div className="flex items-center gap-2 sm:gap-3">
                <Link href="/login" className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#12325a]/25 px-4 text-xs font-extrabold text-[#12325a] hover:bg-slate-50 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gov-saffron/50">
                  Login
                </Link>
                <Link href="/register" className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#008080] px-4 sm:px-5 text-xs font-extrabold text-white shadow-sm hover:bg-[#0d9488] hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gov-saffron/50">
                  Register
                </Link>
              </div>

              {/* Mobile Hamburger menu */}
              <button 
                className="lg:hidden text-slate-500 hover:text-slate-700 focus:outline-none"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Toggle Navigation Menu"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>

          {/* Tier 2: Navigation Bar (Deep Navy Blue) */}
          <div className="bg-[#12325a] h-[48px] w-full shadow-sm flex items-center justify-between px-4 sm:px-6 md:px-8">
            <div className="max-w-[1380px] w-full mx-auto flex items-center justify-between h-full">
              {/* Left side: Home button and Menu links */}
              <div className="flex items-center h-full">
                {/* Home Icon button */}
                <Link 
                  href="/" 
                  className="bg-white/10 hover:bg-white/20 h-[48px] w-[54px] flex items-center justify-center border-r border-white/10 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gov-saffron/50"
                  aria-label="Home"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                  </svg>
                </Link>

                {/* Menu links with government-style dropdowns */}
                <nav className="hidden lg:flex items-center h-full text-xs font-bold text-white/95">
                  <Link
                    href="/partner-with-maharashtra"
                    className={`px-4 h-[48px] flex items-center border-b-[3px] transition-all hover:bg-white/5 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gov-saffron/50 ${
                      pathname === "/partner-with-maharashtra"
                        ? "border-[#FF9933] text-white font-extrabold bg-white/10"
                        : "border-transparent text-white/90 hover:text-white"
                    }`}
                  >
                    Partner with Maharashtra
                  </Link>
                  <Link
                    href="/pitch-development-need"
                    className={`px-4 h-[48px] flex items-center border-b-[3px] transition-all hover:bg-white/5 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gov-saffron/50 ${
                      pathname === "/pitch-development-need"
                        ? "border-[#FF9933] text-white font-extrabold bg-white/10"
                        : "border-transparent text-white/90 hover:text-white"
                    }`}
                  >
                    Pitch a Development Need
                  </Link>
                  {publicNavGroups.map((group) => {
                    const isActive = pathname === group.href || group.links.some((link) => pathname === link.href || pathname.startsWith(link.href + "/"));
                    return (
                      <div key={group.label} className="group relative h-[48px]">
                        <Link
                          href={group.href}
                          className={`px-4 h-[48px] flex items-center gap-1 border-b-[3px] transition-all hover:bg-white/5 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gov-saffron/50 ${
                            isActive
                              ? "border-[#FF9933] text-white font-extrabold bg-white/10"
                              : "border-transparent text-white/90 hover:text-white"
                          }`}
                        >
                          {group.label}
                          <ChevronDown size={13} aria-hidden="true" />
                        </Link>
                        <div className="invisible absolute left-0 top-[48px] z-[70] w-[280px] translate-y-1 border border-[#cfdcf0] bg-white py-2 opacity-0 shadow-[0_18px_42px_rgba(15,35,70,0.22)] transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                          {group.links.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              className={`block border-l-4 px-4 py-3 text-[12px] font-extrabold leading-5 hover:bg-[#f5f8fd] hover:no-underline ${
                                pathname === link.href || pathname.startsWith(link.href + "/")
                                  ? "border-[#FF9933] bg-[#f8fbff] text-[#12325a]"
                                  : "border-transparent text-[#344b68]"
                              }`}
                            >
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </nav>
              </div>

              {/* Right side: Search bar */}
              {/* <div className="relative max-w-[200px] sm:max-w-[240px] w-full flex items-center">
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="w-full h-8 bg-white/12 border border-white/25 rounded-md px-3 pr-8 text-xs text-black placeholder-black/60 focus:outline-none focus:bg-white focus:text-[#12325a] focus:placeholder-[#12325a]/60 transition-all focus-visible:ring-2 focus-visible:ring-gov-saffron/50"
                />
                <Search size={14} className="absolute right-2.5 text-white/70 pointer-events-none" />
              </div> */}
            </div>
          </div>
        </header>
      )}

      {/* Main Workspace */}
      <div className={isDashboard ? "flex flex-1 pt-[72px]" : "flex flex-1"}>
        
        {/* Desktop Sidebar */}
        {isDashboard && (
          <aside 
            className={`hidden lg:flex flex-col border-r border-gov-line bg-white shrink-0 transition-all duration-300 relative justify-between py-4 shadow-sm ${
              sidebarCollapsed ? "w-[68px]" : "w-60"
            }`}
          >
            {/* Navigation Links */}
            <div className="flex flex-col gap-0.5 px-2 overflow-y-auto max-h-[calc(100vh-160px)] pr-1">
              {dashboardNavigationItems.map((item) => {
                const isActive = pathname === item.href || 
                                 (item.href.endsWith("/overview") && pathname === item.href.replace("/overview", "")) ||
                                 (item.href.endsWith("/statewide") && pathname === item.href.replace("/statewide", "")) ||
                                 (item.href.endsWith("/dashboard") && pathname === item.href.replace("/dashboard", "")) ||
                                 (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link 
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] font-medium transition-all group relative ${
                      isActive 
                        ? "bg-[#e8f0f8] text-gov-blue shadow-sm border-l-4 border-l-gov-saffron pl-2" 
                        : "text-slate-700 hover:text-gov-blue hover:bg-gov-mist"
                    }`}
                  >
                    <item.icon size={15} className={isActive ? "text-gov-blue" : "text-slate-500 group-hover:text-gov-blue"} />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                    
                    {sidebarCollapsed && (
                      <div className="absolute left-[76px] bg-gov-blue text-white py-1 px-2.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap shadow-md text-[10px] z-50">
                        {item.label}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Sidebar Toggle */}
            <div className="px-2 pt-2">
              <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="w-full flex items-center justify-center p-2 border border-gov-line hover:bg-gov-mist rounded-lg text-slate-500 hover:text-gov-blue transition-colors"
              >
                {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            </div>
          </aside>
        )}

        {/* Mobile Sidebar */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex bg-black/40 backdrop-blur-sm animate-fadeIn lg:hidden">
            <div className="w-64 bg-white p-5 flex flex-col justify-between h-full border-r border-gov-line shadow-xl">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center pb-3 border-b border-gov-line">
                  <span className="font-heading font-extrabold text-gov-ink text-sm">Navigation</span>
                  <button onClick={() => setMobileMenuOpen(false)} className="text-slate-500 hover:text-gov-blue"><X size={18} /></button>
                </div>
                <div className="flex flex-col gap-0.5 overflow-y-auto max-h-[calc(100vh-160px)]">
                  {(isDashboard ? dashboardNavigationItems : [
                    { label: "Home", href: "/", icon: Layers },
                    { label: "Partner with Maharashtra", href: "/partner-with-maharashtra", icon: Handshake },
                    { label: "Pitch a Development Need", href: "/pitch-development-need", icon: Sparkles },
                    ...publicNavGroups.flatMap((group) => group.links.map((link) => ({
                      label: link.label,
                      href: link.href,
                      icon: group.label === "About" ? HelpCircle : group.label === "Projects" ? Compass : group.label === "Documents" ? BookOpen : group.label === "Updates" ? FileText : Phone,
                    }))),
                  ]).map((item) => {
                    const isActive = pathname === item.href || 
                                     (item.href.endsWith("/overview") && pathname === item.href.replace("/overview", "")) ||
                                     (item.href !== "/" && pathname.startsWith(item.href));
                    return (
                      <Link 
                        key={item.label}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                          isActive 
                            ? "bg-[#e8f0f8] text-gov-blue border-l-4 border-l-gov-saffron pl-2" 
                            : "text-slate-700 hover:text-gov-blue hover:bg-gov-mist"
                        }`}
                      >
                        <item.icon size={16} className={isActive ? "text-gov-blue" : "text-slate-500"} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-3 border-t border-gov-line">
                {isDashboard ? (
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-3 transition-all"
                  >
                    <LogOut size={16} />
                    <span>Log Out</span>
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link 
                      href="/login" 
                      className="w-full text-center py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 border border-slate-200"
                    >
                      Login
                    </Link>
                    <Link 
                      href="/register" 
                      className="w-full text-center py-2 rounded-lg text-xs font-bold text-white bg-gov-blue hover:bg-gov-navy shadow-sm"
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-grow flex flex-col min-w-0">
          <main id="main-content" className={`flex-grow ${isDashboard ? "px-6 py-6 md:px-10 md:py-8" : ""}`}>
            {dashboardContent}
          </main>
          {isDashboard ? (
            <footer className="border-t border-gov-line bg-white py-5 px-6 md:px-10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gov-muted font-medium shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold text-[#1e3a8a] text-sm tracking-tight">MahaCSR</span>
                <span>Government of Maharashtra Enterprise CSR Platform. Approved under MCA Section 135.</span>
              </div>
              <div className="flex gap-6">
                <Link href="#" className="hover:text-[#1e3a8a] transition-colors">Privacy Policy</Link>
                <Link href="#" className="hover:text-[#1e3a8a] transition-colors">Compliance Audits</Link>
                <Link href="#" className="hover:text-[#1e3a8a] transition-colors">Support Center</Link>
              </div>
            </footer>
          ) : (
            <footer className="bg-[#062a5d] text-white">
              <div className="mx-auto grid max-w-[1380px] gap-10 px-5 py-10 md:grid-cols-[1.3fr_0.8fr_0.8fr_1.1fr] md:px-8">
                <div>
                  <Link href="/" className="inline-flex items-center gap-3 text-white hover:no-underline">
                    <svg viewBox="0 0 100 100" className="h-12 w-12" fill="none" stroke="currentColor">
                      <polygon points="50,5 82,18 95,50 82,82 50,95 18,82 5,50 18,18" stroke="#ffffff" strokeWidth="4.5" fill="rgba(255,255,255,0.06)" />
                      <path d="M28,32 L72,32 M32,44 L68,44 M28,56 L72,56 M36,68 L64,68" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    <div>
                      <div className="text-2xl font-extrabold">Maha<span className="text-[#ff8a24]">CSR</span></div>
                      <div className="mt-1 text-xs font-medium leading-5 text-blue-100">Corporate Social Responsibility Portal<br />Government of Maharashtra</div>
                    </div>
                  </Link>
                  <div className="mt-8 flex gap-3">
                    {["f", "X", "in", "yt"].map((item) => (
                      <span key={item} className="grid h-9 w-9 place-items-center rounded-full border border-white/35 text-xs font-extrabold">{item}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-extrabold">Quick Links</h3>
                  <div className="mt-4 flex flex-col gap-3 text-sm text-blue-100">
                    <Link href="/about" className="text-blue-100 hover:text-white">About MahaCSR</Link>
                    <Link href="/partner-with-maharashtra" className="text-blue-100 hover:text-white">Partner with Maharashtra</Link>
                    <Link href="/pitch-development-need" className="text-blue-100 hover:text-white">Pitch a Development Need</Link>
                    <Link href="/public-development-needs" className="text-blue-100 hover:text-white">Public Development Needs (Live)</Link>
                    <Link href="/workflow" className="text-blue-100 hover:text-white">Workflow</Link>
                    <Link href="/knowledge" className="text-blue-100 hover:text-white">Knowledge Center</Link>
                    {/* <Link href="/reports" className="text-blue-100 hover:text-white">Reports & Data</Link> */}
                    <Link href="/help" className="text-blue-100 hover:text-white">Helpdesk</Link>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-extrabold">Information</h3>
                  <div className="mt-4 flex flex-col gap-3 text-sm text-blue-100">
                    <Link href="#" className="text-blue-100 hover:text-white">Privacy Policy</Link>
                    <Link href="#" className="text-blue-100 hover:text-white">Terms of Use</Link>
                    <Link href="#" className="text-blue-100 hover:text-white">Compliance Audits</Link>
                    <Link href="#" className="text-blue-100 hover:text-white">Sitemap</Link>
                    <Link href="#" className="text-blue-100 hover:text-white">Accessibility</Link>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-extrabold">Contact Us</h3>
                  <div className="mt-4 flex flex-col gap-3 text-sm leading-6 text-blue-100">
                    <span className="inline-flex gap-2"><MapPin className="mt-1 shrink-0" size={15} /> Maharashtra CSR Authority, 7th Floor, Mantralaya Annexe, Mumbai - 400 032, Maharashtra, India.</span>
                    <span className="inline-flex items-center gap-2"><Mail size={15} /> support@mahacsr.gov.in</span>
                    <span className="inline-flex items-center gap-2"><Phone size={15} /> 022-2202 1234</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-white/10 bg-[#052653]">
                <div className="mx-auto flex max-w-[1380px] flex-col gap-3 px-5 py-4 text-xs font-medium text-blue-100 md:flex-row md:items-center md:justify-between md:px-8">
                  <span>(c) 2026 Government of Maharashtra. All rights reserved.</span>
                  <span>Best viewed in Chrome 90+, Firefox 90+, Edge 90+, Safari 13+</span>
                  <a href="#" className="inline-flex items-center gap-2 text-blue-100 hover:text-white hover:no-underline"><ArrowUp size={14} /> Back to top</a>
                </div>
              </div>
            </footer>
          )}
        </div>

      </div>

    </div>
  );
}

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
  const [openNavGroup, setOpenNavGroup] = useState<string | null>(null);
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
    pathname.startsWith("/public-development-needs") ||
    pathname.startsWith("/partner-with-maharashtra") ||
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
    setOpenNavGroup(null);
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
      { label: "Projects", href: "/convergence-projects", icon: ShieldCheck },
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
      { label: "Funded Projects", href: "/convergence-projects", icon: ShieldCheck },
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
        { label: "Projects", href: "/convergence-projects", icon: ShieldCheck },
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
        { label: "Projects", href: "/convergence-projects", icon: Compass },
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
        { label: "Projects", href: "/convergence-projects", icon: Compass },
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
        { label: "Partner NGOs", href: "/company-dashboard/ngos", icon: Landmark },
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
    <div className="flex flex-col min-h-screen bg-[#f4f5f7] text-[#333333] font-sans">


      {isDashboard && <div className="fixed top-0 left-0 right-0 h-1 z-[60] flex"><span className="flex-1 bg-[#f7941d]" /><span className="flex-1 bg-white" /><span className="flex-1 bg-[#43a047]" /></div>}

      {isDashboard ? (
        <header
          className="fixed top-1 left-0 right-0 h-[56px] z-50 bg-white border-b border-[#e0e4ea] flex justify-between items-center px-4 md:px-6"
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

              <Link href="/" className="flex min-w-0 items-center gap-3 hover:no-underline">
                <svg viewBox="0 0 100 100" className="w-9 h-9" fill="none" stroke="currentColor">
                  <polygon points="50,5 82,18 95,50 82,82 50,95 18,82 5,50 18,18" stroke="#14274e" strokeWidth="4.5" fill="#e3f0fa" />
                  <path d="M28,32 L72,32 M32,44 L68,44 M28,56 L72,56 M36,68 L64,68" stroke="#f7941d" strokeWidth="3" strokeLinecap="round" />
                  <path d="M42,80 L58,80" stroke="#14274e" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <div className="flex min-w-0 flex-col leading-none">
                  <span className="font-heading font-bold text-lg text-[#14274e]">
                    Maha<span className="text-[#f7941d]">CSR</span> Setu
                  </span>
                  <span className="text-[8px] text-[#6b7280] tracking-wider font-semibold mt-0.5 uppercase">
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
                className="govt-input pr-10 focus:border-[#1789d6] transition-all font-sans"
                style={{ paddingLeft: "2.5rem" }}
              />
              <Search size={14} className="absolute left-3 text-[#97a0ac]" />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none select-none text-[10px] font-semibold text-[#97a0ac] bg-[#f4f5f7] border border-[#e0e4ea] px-1.5 py-0.5 rounded-lg">
                <span>Ctrl</span>
                <span>K</span>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {/* Messages */}
              <Link href="/chat" className="text-[#97a0ac] hover:text-[#14274e] transition-colors relative">
                <Mail size={18} />
                <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-[#f7941d]" />
              </Link>

              {/* Notifications */}
              <div className="relative">
                <button
                  className="text-[#97a0ac] hover:text-[#14274e] transition-colors"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                >
                  <Bell size={18} />
                  {notifications.some((notification) => !notification.isRead) && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#c62828] border-2 border-white" />
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-3 w-80 bg-white border border-[#c7cdd6] rounded-lg p-4 z-50 flex flex-col gap-3">
                    <div className="flex justify-between items-center pb-2 border-b border-[#e0e4ea]">
                      <span className="text-xs font-bold text-[#14274e]">Notifications</span>
                      <button
                        onClick={() => {
                          apiFetch("/notifications/read-all", { method: "PATCH" })
                            .then(() => setNotifications((items) => items.map((item) => ({ ...item, isRead: true }))))
                            .catch(() => {});
                        }}
                        className="text-[10px] text-[#1789d6] font-bold cursor-pointer hover:underline"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-3 rounded-lg bg-[#f4f5f7] border border-[#e0e4ea] text-[11px] text-[#6b7280]">
                          No notifications yet.
                        </div>
                      ) : notifications.slice(0, 8).map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-lg border flex flex-col gap-1 text-[11px] ${
                            notification.isRead ? "bg-[#f4f5f7] border-[#e0e4ea]" : "bg-[#e3f0fa] border-[#c4ddf2]"
                          }`}
                        >
                          <span className="font-bold text-[#333333]">{notification.title}</span>
                          <span className="text-[#4b5563]">{notification.message}</span>
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
                  <div className="w-8 h-8 rounded-lg bg-[#14274e] text-white flex items-center justify-center font-heading font-bold text-xs">
                    U
                  </div>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-52 bg-white border border-[#c7cdd6] rounded-lg py-2 z-50">
                    <div className="px-4 py-2.5 border-b border-[#eef0f3] flex flex-col">
                      <span className="text-xs font-bold text-[#14274e]">User Account</span>
                      <span className="text-[10px] text-[#97a0ac] truncate">{userEmail}</span>
                    </div>
                    <button
                      onClick={() => router.push("/profile")}
                      className="w-full text-left px-4 py-2 text-xs text-[#4b5563] hover:bg-[#f4f5f7] hover:text-[#14274e] transition-colors flex items-center gap-2 mt-1"
                    >
                      <Users size={14} /> Account
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-xs text-[#c62828] hover:bg-[#fdecea] transition-colors flex items-center gap-2 border-t border-[#eef0f3] mt-1"
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
        <header className="sticky top-0 z-50 bg-white flex flex-col w-full">
          {/* Tier 0: Utility Bar (Dark Navy) */}
          <div className="bg-[#0e2144] text-white">
            <div className="max-w-[1380px] w-full mx-auto flex items-center justify-between px-4 sm:px-6 md:px-8 h-[28px] text-[11px]">
              <div className="flex items-center gap-6">
                <a href="#main-content" className="text-white/90 hover:text-white hover:no-underline">Skip to main content</a>
                <Link href="/about" className="hidden sm:inline text-white/90 hover:text-white hover:no-underline">Site Map</Link>
              </div>
              <div className="flex items-center gap-4">
                <span className="hidden md:inline text-white/80">Government of Maharashtra | महाराष्ट्र शासन</span>
              </div>
            </div>
          </div>

          {/* Tier 1: Brand Band (White) */}
          <div className="bg-white h-[56px] sm:h-[64px] flex items-center justify-between px-4 sm:px-6 md:px-8 max-w-[1380px] w-full mx-auto">
            {/* Left Block: Government Seal & MahaCSR Setu Brand */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              {/* Gov Seal Logo */}
              <Link href="/" className="flex items-center gap-2 hover:no-underline shrink-0">
                <img
                  src="/maharashtra_seal.png"
                  alt="Government of Maharashtra Seal"
                  className="h-9 w-9 sm:h-10 sm:w-10 object-contain"
                />
                <div className="flex flex-col text-[11px] sm:text-xs font-semibold leading-tight text-[#333333]">
                  <span>Government of Maharashtra</span>
                  <span className="text-[#6b7280]">महाराष्ट्र शासन</span>
                </div>
              </Link>

              {/* Vertical Divider */}
              <div className="hidden min-[480px]:block h-8 w-[1px] bg-[#e0e4ea] shrink-0" />

              {/* Brand Logo */}
              <Link href="/" className="hidden min-h-0 min-[480px]:flex flex-col leading-none hover:no-underline shrink-0">
                <span className="font-heading font-bold text-base sm:text-xl text-[#14274e]">
                  Maha<span className="text-[#f7941d]">CSR</span> Setu
                </span>
                <span className="text-[10px] font-semibold text-[#f7941d] mt-0.5">
                  महाराष्ट्र CSR सेतु
                </span>
              </Link>

              {/* Vertical Divider */}
              <div className="hidden lg:block h-8 w-[1px] bg-[#e0e4ea] shrink-0" />

              {/* Subtitle taglines */}
              <div className="hidden lg:flex flex-col text-[11px] leading-tight font-semibold text-[#6b7280] shrink-0">
                <span className="text-[#14274e]">Converging Initiatives.</span>
                <span className="text-[#f7941d]">Transforming Maharashtra.</span>
              </div>
            </div>

            {/* Right Block: Auth Actions */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              {/* Login & Register buttons */}
              <div className="flex items-center gap-2 sm:gap-3">
                <Link href="/login" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#c7cdd6] px-4 text-xs font-semibold text-[#14274e] hover:bg-[#f4f5f7] hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f7941d]/50">
                  Login
                </Link>
                <Link href="/register" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#1789d6] px-4 sm:px-5 text-xs font-semibold text-white hover:bg-[#146fb0] hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f7941d]/50">
                  Register
                </Link>
              </div>

              {/* Mobile Hamburger menu */}
              <button
                className="lg:hidden text-[#6b7280] hover:text-[#333333] focus:outline-none"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Toggle Navigation Menu"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>

          {/* Tier 2: Navigation Bar (Deep Navy) */}
          <div className="bg-[#0e2144] h-[44px] w-full flex items-center justify-between px-4 sm:px-6 md:px-8">
            <div className="max-w-[1380px] w-full mx-auto flex items-center justify-between h-full">
              {/* Left side: Home button and Menu links */}
              <div className="flex items-center h-full">
                {/* Home tab — solid bright blue when active, per csr.gov.in */}
                <Link
                  href="/"
                  className={`h-[44px] px-6 flex items-center text-[14px] font-semibold hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f7941d]/50 ${
                    pathname === "/"
                      ? "bg-[#1789d6] text-white"
                      : "text-white/90 hover:bg-white/10 hover:text-white"
                  }`}
                  aria-label="Home"
                >
                  Home
                </Link>

                {/* Menu links with government-style dropdowns */}
                <nav className="hidden lg:flex items-center h-full text-[14px] font-medium text-white/95">
                  <Link
                    href="/partner-with-maharashtra"
                    className={`px-4 h-[44px] flex items-center transition-colors hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f7941d]/50 ${
                      pathname === "/partner-with-maharashtra"
                        ? "bg-[#1789d6] text-white font-semibold"
                        : "text-white/90 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    Partner with Maharashtra
                  </Link>
                  <Link
                    href="/pitch-development-need"
                    className={`px-4 h-[44px] flex items-center transition-colors hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f7941d]/50 ${
                      pathname === "/pitch-development-need"
                        ? "bg-[#1789d6] text-white font-semibold"
                        : "text-white/90 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    Pitch a Development Need
                  </Link>
                  {publicNavGroups.map((group) => {
                    const isActive = pathname === group.href || group.links.some((link) => pathname === link.href || pathname.startsWith(link.href + "/"));
                    const isOpen = openNavGroup === group.label;
                    return (
                      <div
                        key={group.label}
                        className="relative h-[44px]"
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
                          className={`px-4 h-[44px] flex items-center gap-1 transition-colors hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f7941d]/50 ${
                            isActive
                              ? "bg-[#1789d6] text-white font-semibold"
                              : "text-white/90 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {group.label}
                          <ChevronDown size={13} aria-hidden="true" />
                        </Link>
                        {isOpen && (
                          <div className="absolute left-0 top-[44px] z-[70] w-[280px] border border-[#e0e4ea] bg-white py-2">
                            {group.links.map((link) => (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setOpenNavGroup(null)}
                                className={`block border-l-4 px-4 py-2.5 text-[13px] font-medium leading-5 hover:bg-[#f4f5f7] hover:no-underline ${
                                  pathname === link.href || pathname.startsWith(link.href + "/")
                                    ? "border-[#f7941d] bg-[#f4f5f7] text-[#14274e] font-semibold"
                                    : "border-transparent text-[#4b5563]"
                                }`}
                              >
                                {link.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Workspace */}
      <div className={isDashboard ? "flex flex-1 pt-[60px]" : "flex flex-1"}>
        
        {/* Desktop Sidebar */}
        {isDashboard && (
          <aside
            className={`hidden lg:flex flex-col border-r border-[#e0e4ea] bg-white shrink-0 transition-all duration-300 relative justify-between py-4 ${
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
                        ? "bg-[#1789d6] text-white"
                        : "text-[#4b5563] hover:text-[#14274e] hover:bg-[#f4f5f7]"
                    }`}
                  >
                    <item.icon size={15} className={isActive ? "text-white" : "text-[#97a0ac] group-hover:text-[#14274e]"} />
                    {!sidebarCollapsed && <span>{item.label}</span>}

                    {sidebarCollapsed && (
                      <div className="absolute left-[76px] bg-[#14274e] text-white py-1 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap text-[10px] z-50">
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
                className="w-full flex items-center justify-center p-2 border border-[#e0e4ea] hover:bg-[#f4f5f7] rounded-lg text-[#6b7280] hover:text-[#14274e] transition-colors"
              >
                {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            </div>
          </aside>
        )}

        {/* Mobile Sidebar */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex bg-black/60 animate-fadeIn lg:hidden">
            <div className="w-64 bg-white p-5 flex flex-col justify-between h-full border-r border-[#e0e4ea]">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center pb-3 border-b border-[#e0e4ea]">
                  <span className="font-heading font-bold text-[#14274e] text-sm">Navigation</span>
                  <button onClick={() => setMobileMenuOpen(false)} className="text-[#6b7280] hover:text-[#14274e]"><X size={18} /></button>
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
                            ? "bg-[#1789d6] text-white"
                            : "text-[#4b5563] hover:text-[#14274e] hover:bg-[#f4f5f7]"
                        }`}
                      >
                        <item.icon size={16} className={isActive ? "text-white" : "text-[#97a0ac]"} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
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
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-grow flex flex-col min-w-0">
          <main id="main-content" className={`flex-grow ${isDashboard ? "px-4 py-4 md:px-6 md:py-5" : ""}`}>
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
            <footer className="bg-[#0e2144] text-white">
              <div className="mx-auto grid max-w-[1380px] gap-10 px-5 py-10 md:grid-cols-[1.3fr_0.8fr_0.8fr_1.1fr] md:px-8">
                <div>
                  <Link href="/" className="inline-flex items-center gap-3 text-white hover:no-underline">
                    <svg viewBox="0 0 100 100" className="h-12 w-12" fill="none" stroke="currentColor">
                      <polygon points="50,5 82,18 95,50 82,82 50,95 18,82 5,50 18,18" stroke="#ffffff" strokeWidth="4.5" fill="rgba(255,255,255,0.06)" />
                      <path d="M28,32 L72,32 M32,44 L68,44 M28,56 L72,56 M36,68 L64,68" stroke="#f7941d" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    <div>
                      <div className="text-2xl font-bold">Maha<span className="text-[#f7941d]">CSR</span></div>
                      <div className="mt-1 text-xs font-medium leading-5 text-white/80">Corporate Social Responsibility Portal<br />Government of Maharashtra</div>
                    </div>
                  </Link>
                  <div className="mt-8 flex gap-3">
                    {["f", "X", "in", "yt"].map((item) => (
                      <span key={item} className="grid h-9 w-9 place-items-center rounded-full border border-white/35 text-xs font-extrabold">{item}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold">Quick Links</h3>
                  <div className="mt-4 flex flex-col gap-3 text-sm text-white/80">
                    <Link href="/about" className="text-white/80 hover:text-white">About MahaCSR</Link>
                    <Link href="/partner-with-maharashtra" className="text-white/80 hover:text-white">Partner with Maharashtra</Link>
                    <Link href="/pitch-development-need" className="text-white/80 hover:text-white">Pitch a Development Need</Link>
                    <Link href="/public-development-needs" className="text-white/80 hover:text-white">Public Development Needs (Live)</Link>
                    <Link href="/workflow" className="text-white/80 hover:text-white">Workflow</Link>
                    <Link href="/knowledge" className="text-white/80 hover:text-white">Knowledge Center</Link>
                    {/* <Link href="/reports" className="text-white/80 hover:text-white">Reports & Data</Link> */}
                    <Link href="/help" className="text-white/80 hover:text-white">Helpdesk</Link>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold">Information</h3>
                  <div className="mt-4 flex flex-col gap-3 text-sm text-white/80">
                    <Link href="#" className="text-white/80 hover:text-white">Privacy Policy</Link>
                    <Link href="#" className="text-white/80 hover:text-white">Terms of Use</Link>
                    <Link href="#" className="text-white/80 hover:text-white">Compliance Audits</Link>
                    <Link href="#" className="text-white/80 hover:text-white">Sitemap</Link>
                    <Link href="#" className="text-white/80 hover:text-white">Accessibility</Link>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold">Contact Us</h3>
                  <div className="mt-4 flex flex-col gap-3 text-sm leading-6 text-white/80">
                    <span className="inline-flex gap-2"><MapPin className="mt-1 shrink-0" size={15} /> Maharashtra CSR Authority, 7th Floor, Mantralaya Annexe, Mumbai - 400 032, Maharashtra, India.</span>
                    <span className="inline-flex items-center gap-2"><Mail size={15} /> support@mahacsr.gov.in</span>
                    <span className="inline-flex items-center gap-2"><Phone size={15} /> 022-2202 1234</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-white/10 bg-[#091730]">
                <div className="mx-auto flex max-w-[1380px] flex-col gap-3 px-5 py-4 text-xs font-medium text-white/80 md:flex-row md:items-center md:justify-between md:px-8">
                  <span>(c) 2026 Government of Maharashtra. All rights reserved.</span>
                  <span>Best viewed in Chrome 90+, Firefox 90+, Edge 90+, Safari 13+</span>
                  <a href="#" className="inline-flex items-center gap-2 text-white/80 hover:text-white hover:no-underline"><ArrowUp size={14} /> Back to top</a>
                </div>
              </div>
            </footer>
          )}
        </div>

      </div>

    </div>
  );
}

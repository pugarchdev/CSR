"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, Landmark, Search, Bell, Mail, ChevronLeft, ChevronRight,
  Layers, Sparkles, Award, Coins, Compass, FileText, BarChart2,
  HelpCircle, Menu, X, LogOut, ShieldCheck, BookOpen, ShieldAlert,
  Clock, Users, Globe2, ChevronDown, ArrowUp, MapPin, Phone, CheckCircle2, Handshake
} from "lucide-react";
import { Button } from "./ui/Button";
import { apiFetch, getStoredUser } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

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
  const { user: storeUser, roles: storeRoles, isAdmin: storeIsAdmin, hasPermission } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [openNavGroup, setOpenNavGroup] = useState<string | null>(null);
  const [mobileOpenNavGroup, setMobileOpenNavGroup] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; isRead: boolean }>>([]);
  const [userEmail, setUserEmail] = useState("user@mahacsr.gov.in");
  const [tenantFeatures, setTenantFeatures] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
                      pathname.startsWith("/rm") ||
                      pathname.startsWith("/js") ||
                      pathname.startsWith("/secretary") ||
                      pathname.startsWith("/nodal") ||
                      pathname.startsWith("/state-cell") ||
                      pathname.startsWith("/agency") ||
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

      const activeRoles = storeRoles.length > 0 ? storeRoles : (user.role ? [user.role] : []);
      const hasAnyAllowedRole = (allowedRoles: string[]) => activeRoles.some(r => allowedRoles.includes(r)) || storeIsAdmin;

      const allowed =
        (pathname.startsWith("/ngo-dashboard") && hasAnyAllowedRole(["NGO_ADMIN", "NGO_MEMBER"])) ||
        (pathname.startsWith("/company-dashboard") && hasAnyAllowedRole(["COMPANY_ADMIN", "COMPANY_MEMBER"])) ||
        (pathname.startsWith("/government-portal") && hasAnyAllowedRole(["SUPER_ADMIN", "PORTAL_ADMIN", "DISTRICT_ADMIN"])) ||
        ((pathname === "/company" || pathname.startsWith("/company/")) && hasAnyAllowedRole(["COMPANY_ADMIN", "COMPANY_MEMBER", "SUPER_ADMIN", "CORPORATE_USER"])) ||
        ((pathname === "/ngo" || pathname.startsWith("/ngo/")) && hasAnyAllowedRole(["NGO_ADMIN", "NGO_MEMBER", "SUPER_ADMIN"])) ||
        (pathname.startsWith("/district") && hasAnyAllowedRole(["DISTRICT_ADMIN", "SUPER_ADMIN", "PORTAL_ADMIN", "CSR_ADMIN"])) ||
        (pathname.startsWith("/organization") && hasAnyAllowedRole(["BENEFICIARY_AGENCY", "COMPANY_ADMIN", "COMPANY_MEMBER", "CORPORATE_USER", "NGO_ADMIN", "NGO_MEMBER", "DISTRICT_ADMIN", "PORTAL_ADMIN", "CSR_ADMIN", "SUPER_ADMIN"])) ||
        (pathname.startsWith("/admin") && hasAnyAllowedRole(["SUPER_ADMIN", "DISTRICT_ADMIN", "PORTAL_ADMIN", "CSR_ADMIN"])) ||
        ((pathname.startsWith("/beneficiary") || pathname.startsWith("/department")) && hasAnyAllowedRole(["BENEFICIARY_AGENCY", "SUPER_ADMIN"])) ||
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
        pathname.startsWith("/chat") ||
        pathname.startsWith("/analytics") ||
        pathname.startsWith("/grievances") ||
        pathname.startsWith("/convergence-projects") ||
        pathname.startsWith("/projects") ||
        pathname.startsWith("/public-development-needs") ||
        pathname.startsWith("/pitch-development-need") ||
        pathname.startsWith("/partner-with-maharashtra") ||
        pathname.startsWith("/track");

      if (!allowed) {
        const primaryRole = activeRoles.find(r => r !== "GOVERNMENT_OFFICER" && r !== "CORPORATE_USER") || activeRoles[0];
        if (["NGO_ADMIN", "NGO_MEMBER"].includes(primaryRole)) router.push("/ngo/dashboard");
        else if (["COMPANY_ADMIN", "COMPANY_MEMBER"].includes(primaryRole)) router.push("/company/dashboard");
        else if (primaryRole === "CORPORATE_USER") router.push("/partner/dashboard");
        else if (primaryRole === "SUPER_ADMIN") router.push("/admin");
        else if (primaryRole === "DISTRICT_ADMIN") router.push("/district/dashboard");
        else if (primaryRole === "PORTAL_ADMIN") router.push("/government-portal");
        else if (primaryRole === "BENEFICIARY_AGENCY") router.push("/department/dashboard");
        else if (primaryRole === "CSR_RELATIONSHIP_MANAGER") router.push("/rm/dashboard");
        else if (primaryRole === "JOINT_SECRETARY") router.push("/js/dashboard");
        else if (primaryRole === "PLANNING_SECRETARY") router.push("/secretary/dashboard");
        else if (["DISTRICT_NODAL_OFFICER", "NODAL_OFFICER"].includes(primaryRole)) router.push("/nodal/dashboard");
        else if (primaryRole === "STATE_CSR_CELL") router.push("/state-cell/dashboard");
        else if (primaryRole === "IMPLEMENTING_AGENCY_USER") router.push("/agency/dashboard");
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
    if (!user) {
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

  const getDashboardHref = (role: string): string => {
    if (["NGO_ADMIN", "NGO_MEMBER"].includes(role)) return "/ngo/dashboard";
    if (["COMPANY_ADMIN", "COMPANY_MEMBER"].includes(role)) return "/company/dashboard";
    if (["CORPORATE_USER", "CORPORATE_PARTNER"].includes(role)) return "/partner/dashboard";
    if (["SUPER_ADMIN", "PORTAL_ADMIN", "CSR_ADMIN"].includes(role)) return "/admin/dashboard";
    if (role === "DISTRICT_ADMIN") return "/district/dashboard";
    if (role === "BENEFICIARY_AGENCY") return "/department/dashboard";
    if (role === "PLANNING_SECRETARY") return "/secretary/dashboard";
    if (role === "JOINT_SECRETARY") return "/js/dashboard";
    if (role === "CSR_RELATIONSHIP_MANAGER") return "/rm/dashboard";
    if (["DISTRICT_NODAL_OFFICER", "NODAL_OFFICER"].includes(role)) return "/nodal/dashboard";
    if (role === "STATE_CSR_CELL") return "/state-cell/dashboard";
    if (role === "IMPLEMENTING_AGENCY_USER") return "/agency/dashboard";
    return "/";
  };

  const storedUser = typeof window !== "undefined" ? getStoredUser() : null;
  const activeRoles = storeRoles.length > 0 ? storeRoles : (storedUser?.role ? [storedUser.role] : []);
  const storedRole = activeRoles.find(r => r !== "GOVERNMENT_OFFICER" && r !== "CORPORATE_USER") || activeRoles[0];
  const storedOrganizationType = storedUser?.organization?.organizationType as string | undefined;

  const getSidebarItems = () => {
    const departmentItems = [
      { label: "Dashboard", href: "/department/dashboard", icon: Layers },
      { label: "Organization Onboarding", href: "/organization/onboarding", icon: Landmark },
      { label: "Onboarding Status", href: "/organization/onboarding/status", icon: Clock },
      { label: "Create Pitch", href: "/department/pitches/create", icon: Sparkles },
      { label: "My Pitches", href: "/department/pitches", icon: Compass },
      { label: "Track Status", href: "/track", icon: Clock },
      { label: "Create Requirement", href: "/department/requirements/create", icon: Sparkles, featureKey: "enableRequirementCreation" },
      { label: "My Requirements", href: "/department/requirements", icon: Compass, featureKey: "enableRequirementCreation" },
      { label: "Company Interest", href: "/department/interests", icon: Compass, featureKey: "enableCompanyInterest" },
      { label: "Projects", href: "/convergence-projects", icon: ShieldCheck },
      { label: "Handover", href: "/department/handover", icon: Layers },
      { label: "Reports", href: "/department/reports", icon: BarChart2, featureKey: "enableReportsExport" },
      { label: "Users", href: "/organization/users", icon: Users, requiredPermission: "user:update" },
      { label: "Roles", href: "/organization/roles", icon: ShieldAlert, requiredPermission: "role:view" },
      { label: "Settings", href: "/organization/settings", icon: ShieldCheck }
    ];

    const companyItems = [
      { label: "Dashboard", href: "/company/dashboard", icon: Layers },
      { label: "My Enquiries", href: "/partner/enquiries", icon: Mail },
      { label: "Track Status", href: "/track", icon: Clock },
      { label: "Organization Onboarding", href: "/organization/onboarding", icon: Landmark },
      { label: "Onboarding Status", href: "/organization/onboarding/status", icon: Clock },
      { label: "Project Marketplace", href: "/company/marketplace", icon: Compass, featureKey: "enableCSRMarketplace" },
      { label: "My Interests", href: "/company/interests", icon: Sparkles, featureKey: "enableCompanyInterest" },
      { label: "Implementing Agencies", href: "/partner/agencies", icon: Building2 },
      { label: "Funded Projects", href: "/convergence-projects", icon: ShieldCheck },
      { label: "Fund Releases", href: "/company/funds", icon: Coins, featureKey: "enableFundDisbursement" },
      { label: "Reports", href: "/company/reports", icon: BarChart2, featureKey: "enableReportsExport" },
      { label: "Users", href: "/organization/users", icon: Users, requiredPermission: "user:update" },
      { label: "Roles", href: "/organization/roles", icon: ShieldAlert, requiredPermission: "role:view" },
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
      { label: "Users", href: "/organization/users", icon: Users, requiredPermission: "user:update" },
      { label: "Roles", href: "/organization/roles", icon: ShieldAlert, requiredPermission: "role:view" },
      { label: "Settings", href: "/organization/settings", icon: ShieldCheck }
    ];

    if (storedRole) {
      if (storedRole === "CSR_RELATIONSHIP_MANAGER") {
        return [
          { label: "Dashboard", href: "/rm/dashboard", icon: Layers },
          { label: "Corporate Enquiries", href: "/rm/enquiries", icon: Mail },
          { label: "Government Pitches", href: "/rm/government-pitches", icon: Compass },
          { label: "Corporate Interests", href: "/rm/interests", icon: Sparkles },
          { label: "Feasibility Reports", href: "/rm/assessments", icon: FileText },
          { label: "Company Directory", href: "/rm/companies", icon: Building2 },
          { label: "Communication Log", href: "/rm/communications", icon: Mail },
          { label: "Reports", href: "/rm/reports", icon: BarChart2 },
        ];
      }

      if (storedRole === "JOINT_SECRETARY") {
        return [
          { label: "JS Dashboard", href: "/js/dashboard", icon: Layers },
          { label: "Corporate Enquiries", href: "/rm/enquiries", icon: Mail },
          { label: "Assessment Reports", href: "/js/assessments", icon: FileText },
          { label: "Government Pitch Approvals", href: "/js/government-pitches", icon: Compass },
          { label: "Nodal Appointments", href: "/js/nodal-appointments", icon: Users },
          { label: "RM Escalations", href: "/js/escalations", icon: ShieldAlert },
          { label: "Projects", href: "/convergence-projects", icon: ShieldCheck },
        ];
      }

      if (storedRole === "PLANNING_SECRETARY") {
        return [
          { label: "Escalations", href: "/secretary/escalations", icon: ShieldAlert },
          { label: "Dashboard", href: "/secretary/dashboard", icon: Layers },
          { label: "Final Decisions", href: "/secretary/decisions", icon: ShieldCheck },
          { label: "JS Dashboard", href: "/js/dashboard", icon: Layers },
          { label: "Feasibility Assessments", href: "/js/assessments", icon: FileText },
          { label: "Final Grievance Review", href: "/state-cell/grievances", icon: ShieldAlert },
        ];
      }

      if (storedRole === "STATE_CSR_CELL") {
        return [
          { label: "Dashboard", href: "/state-cell/dashboard", icon: Layers },
          { label: "Corporate Enquiries", href: "/rm/enquiries", icon: Mail },
          { label: "Government Pitches", href: "/rm/government-pitches", icon: Compass },
          { label: "Grievance Queue", href: "/state-cell/grievances", icon: ShieldAlert },
          { label: "Helpdesk Queue", href: "/state-cell/helpdesk", icon: HelpCircle },
          { label: "Projects", href: "/convergence-projects", icon: ShieldCheck },
        ];
      }

      if (["DISTRICT_NODAL_OFFICER", "NODAL_OFFICER"].includes(storedRole)) {
        return [
          { label: "Dashboard", href: "/nodal/dashboard", icon: Layers },
          { label: "Projects", href: "/convergence-projects", icon: ShieldCheck },
          { label: "Field Inspections", href: "/nodal/inspections", icon: Landmark },
          { label: "Agency Approvals", href: "/nodal/agency-approvals", icon: ShieldCheck },
          { label: "Project Handover", href: "/nodal/handover", icon: Layers },
          { label: "Grievance Queue", href: "/nodal/grievances", icon: ShieldAlert },
        ];
      }

      if (["CORPORATE_USER", "CORPORATE_PARTNER", "COMPANY_ADMIN", "COMPANY_MEMBER"].includes(storedRole)) {
        return [
          { label: "Dashboard", href: "/partner/dashboard", icon: Layers },
          { label: "Organization Onboarding", href: "/organization/onboarding", icon: Landmark },
          { label: "Public Development Needs (Live)", href: "/public-development-needs", icon: Compass },
          { label: "My Enquiries", href: "/partner/enquiries", icon: Mail },
          { label: "My Interests", href: "/company/interests", icon: Sparkles },
          { label: "Projects", href: "/convergence-projects", icon: ShieldCheck },
          { label: "Implementing Agencies", href: "/partner/agencies", icon: Building2 },
          { label: "Grievances", href: "/grievances", icon: ShieldAlert },
          { label: "Track Status", href: "/track", icon: Clock },
        ];
      }

      if (storedRole === "IMPLEMENTING_AGENCY_USER") {
        return [
          { label: "Dashboard", href: "/agency/dashboard", icon: Layers },
          { label: "Projects", href: "/convergence-projects", icon: ShieldCheck },
          { label: "Grievances", href: "/grievances", icon: ShieldAlert },
          { label: "Track Status", href: "/track", icon: Clock },
        ];
      }

    }

    // Fallbacks based on pathname starts (e.g. for unauthenticated paths or direct deep links before user loads)
    if (pathname.startsWith("/rm")) {
      return [
        { label: "Dashboard", href: "/rm/dashboard", icon: Layers },
        { label: "Corporate Enquiries", href: "/rm/enquiries", icon: Mail },
        { label: "Government Pitches", href: "/rm/government-pitches", icon: Compass },
        { label: "Corporate Interests", href: "/rm/interests", icon: Sparkles },
        { label: "Feasibility Reports", href: "/rm/assessments", icon: FileText },
        { label: "Company Directory", href: "/rm/companies", icon: Building2 },
        { label: "Communication Log", href: "/rm/communications", icon: Mail },
        { label: "Reports", href: "/rm/reports", icon: BarChart2 },
      ];
    }

    if (pathname.startsWith("/js")) {
      return [
        { label: "JS Dashboard", href: "/js/dashboard", icon: Layers },
        { label: "Corporate Enquiries", href: "/rm/enquiries", icon: Mail },
        { label: "Assessment Reports", href: "/js/assessments", icon: FileText },
        { label: "Government Pitch Approvals", href: "/js/government-pitches", icon: Compass },
        { label: "Nodal Appointments", href: "/js/nodal-appointments", icon: Users },
        { label: "RM Escalations", href: "/js/escalations", icon: ShieldAlert },
        { label: "Projects", href: "/convergence-projects", icon: ShieldCheck },
      ];
    }

    if (pathname.startsWith("/secretary")) {
      return [
        { label: "Escalations", href: "/secretary/escalations", icon: ShieldAlert },
        { label: "Dashboard", href: "/secretary/dashboard", icon: Layers },
        { label: "Final Decisions", href: "/secretary/decisions", icon: ShieldCheck },
        { label: "JS Dashboard", href: "/js/dashboard", icon: Layers },
        { label: "Feasibility Assessments", href: "/js/assessments", icon: FileText },
        { label: "Final Grievance Review", href: "/state-cell/grievances", icon: ShieldAlert },
      ];
    }

    if (pathname.startsWith("/state-cell")) {
      return [
        { label: "Dashboard", href: "/state-cell/dashboard", icon: Layers },
        { label: "Corporate Enquiries", href: "/rm/enquiries", icon: Mail },
        { label: "Government Pitches", href: "/rm/government-pitches", icon: Compass },
        { label: "Grievance Queue", href: "/state-cell/grievances", icon: ShieldAlert },
        { label: "Helpdesk Queue", href: "/state-cell/helpdesk", icon: HelpCircle },
        { label: "Projects", href: "/convergence-projects", icon: ShieldCheck },
      ];
    }

    if (pathname.startsWith("/nodal")) {
      return [
        { label: "Dashboard", href: "/nodal/dashboard", icon: Layers },
        { label: "Projects", href: "/convergence-projects", icon: ShieldCheck },
        { label: "Field Inspections", href: "/nodal/inspections", icon: Landmark },
        { label: "Agency Approvals", href: "/nodal/agency-approvals", icon: ShieldCheck },
        { label: "Project Handover", href: "/nodal/handover", icon: Layers },
        { label: "Grievance Queue", href: "/nodal/grievances", icon: ShieldAlert },
      ];
    }

    if (pathname === "/partner" || pathname.startsWith("/partner/")) {
      return [
        { label: "Dashboard", href: "/partner/dashboard", icon: Layers },
        { label: "Organization Onboarding", href: "/organization/onboarding", icon: Landmark },
        { label: "Public Development Needs (Live)", href: "/public-development-needs", icon: Compass },
        { label: "My Enquiries", href: "/partner/enquiries", icon: Mail },
        { label: "My Interests", href: "/company/interests", icon: Sparkles },
        { label: "Projects", href: "/convergence-projects", icon: ShieldCheck },
        { label: "Implementing Agencies", href: "/partner/agencies", icon: Building2 },
        { label: "Grievances", href: "/grievances", icon: ShieldAlert },
        { label: "Track Status", href: "/track", icon: Clock },
      ];
    }

    if (pathname.startsWith("/agency")) {
      return [
        { label: "Dashboard", href: "/agency/dashboard", icon: Layers },
        { label: "Projects", href: "/convergence-projects", icon: ShieldCheck },
        { label: "Grievances", href: "/grievances", icon: ShieldAlert },
        { label: "Track Status", href: "/track", icon: Clock },
      ];
    }

    if (pathname.startsWith("/master")) {
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
        { label: "User Management", href: "/admin/user-management", icon: Users },
        { label: "Roles & Permissions", href: "/admin/roles-permissions", icon: ShieldAlert },
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
        { label: "User Management", href: "/admin/user-management", icon: Users },
        { label: "Roles & Permissions", href: "/admin/roles-permissions", icon: ShieldAlert },
        { label: "Onboarding Approvals", href: "/admin/onboarding-approvals", icon: ShieldCheck },
        { label: "Government Departments", href: "/admin/organizations", icon: Landmark },
        { label: "Implementing Agencies", href: "/admin/ngo-registry", icon: Landmark },
        { label: "Companies", href: "/admin/companies", icon: Building2 },
        { label: "Requirements Pending", href: "/admin/requirements/pending", icon: Clock, featureKey: "enableRequirementCreation" },
        { label: "Company Interests", href: "/admin/company-interests", icon: Sparkles, featureKey: "enableCompanyInterest" },
        { label: "Agency Selection", href: "/admin/ngo-selection", icon: Award, featureKey: "enableNGOSelection" },
        { label: "Fund Monitoring", href: "/admin/fund-monitoring", icon: Coins, featureKey: "enableFundDisbursement" },
        { label: "Projects", href: "/convergence-projects", icon: Compass },
        { label: "Verification Queue", href: "/admin/applications", icon: Clock },
        // { label: "Executive Dashboard", href: "/admin/executive-dashboard", icon: BarChart2 },
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

  const dashboardNavigationItems = getSidebarItems()
    .filter((item) => !("featureKey" in item) || !item.featureKey || tenantFeatures[item.featureKey] !== false)
    .filter((item) => !("requiredPermission" in item) || !item.requiredPermission || hasPermission(item.requiredPermission));
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
    tenantFeatures[routeFeatureKey] === false
  );
  const dashboardContent = isRouteFeatureDisabled ? (
    <div className="mx-auto max-w-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
      <div className="text-sm font-extrabold uppercase tracking-widest text-amber-700">Feature Disabled</div>
      <h1 className="mt-2 text-2xl font-extrabold text-gov-navy">This feature is not enabled for your portal instance.</h1>
      <p className="mt-2 text-sm leading-6">Contact your Portal Admin to enable this module for your State Portal.</p>
    </div>
  ) : children;


  if (isDashboard && !mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f6f8fb]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f4f5f7] text-[#333333] font-sans w-full max-w-full overflow-x-hidden">


      {isDashboard && <div className="fixed top-0 left-0 right-0 h-1 z-[60] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600"></div>}

      {isDashboard ? (
        <header
          className="fixed top-1 left-0 right-0 h-[56px] z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50 flex justify-between items-center px-4 md:px-6 shadow-sm"
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

              <Link href={getDashboardHref(storedRole || "")} className="flex min-w-0 items-center gap-3 hover:no-underline">
                <svg viewBox="0 0 100 100" className="w-9 h-9" fill="none" stroke="currentColor">
                  <polygon points="50,5 82,18 95,50 82,82 50,95 18,82 5,50 18,18" stroke="var(--primary)" strokeWidth="4.5" fill="var(--primary-light)" />
                  <path d="M28,32 L72,32 M32,44 L68,44 M28,56 L72,56 M36,68 L64,68" stroke="var(--saffron)" strokeWidth="3" strokeLinecap="round" />
                  <path d="M42,80 L58,80" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <div className="flex min-w-0 flex-col leading-none">
                  <span className="font-heading font-bold text-base text-slate-900">
                    Maha<span className="text-blue-600">CSR</span> Setu
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold mt-1 uppercase tracking-wider">
                    Smart CSR Platform
                  </span>
                </div>
              </Link>
            </div>

            {/* Dashboard Search */}
            <div className="hidden md:flex items-center gap-2 max-w-sm w-full relative">
              <input
                type="text"
                placeholder="Search proposals, NGOs, or metrics..."
                className="w-full bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-xl py-2 pl-10 pr-16 text-xs placeholder:text-slate-400 focus:outline-none focus:border-blue-500/50 focus:bg-white focus:ring-[3px] focus:ring-blue-500/10 transition-all font-sans"
              />
              <Search size={14} className="absolute left-3 text-slate-400" />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none select-none text-[9px] font-semibold text-slate-400 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded-md">
                <span>⌘</span>
                <span>K</span>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {/* Messages */}
              <Link href="/chat" className="text-slate-400 hover:text-slate-900 transition-colors relative p-2 rounded-xl hover:bg-slate-50/80">
                <Mail size={16} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500" />
              </Link>

              {/* Notifications */}
              <div className="relative">
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
                  <div className="absolute right-0 mt-3 w-80 bg-white/90 backdrop-blur-xl border border-slate-200/50 rounded-2xl p-4 z-50 flex flex-col gap-3 shadow-lg">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-900">Notifications</span>
                      <button
                        onClick={() => {
                          apiFetch("/notifications/read-all", { method: "PATCH" })
                            .then(() => setNotifications((items) => items.map((item) => ({ ...item, isRead: true }))))
                            .catch(() => {});
                        }}
                        className="text-[10px] text-blue-600 font-semibold cursor-pointer hover:underline"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-3 rounded-xl bg-slate-50/50 border border-slate-100 text-[11px] text-slate-500 text-center">
                          No notifications yet.
                        </div>
                      ) : notifications.slice(0, 8).map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-xl border flex flex-col gap-1 text-[11px] transition-colors ${
                            notification.isRead ? "bg-slate-50/50 border-slate-100 text-slate-600" : "bg-blue-50/50 border-blue-100/50 text-slate-800"
                          }`}
                        >
                          <span className="font-bold">{notification.title}</span>
                          <span className="text-xs text-slate-500">{notification.message}</span>
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
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-50/80 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-heading font-bold text-xs shadow-sm shadow-blue-500/20">
                    U
                  </div>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-52 bg-white/90 backdrop-blur-xl border border-slate-200/50 rounded-2xl py-2 z-50 shadow-lg">
                    <div className="px-4 py-2.5 border-b border-slate-100 flex flex-col">
                      <span className="text-xs font-bold text-slate-900">User Account</span>
                      <span className="text-[10px] text-slate-400 truncate mt-0.5">{userEmail}</span>
                    </div>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        router.push("/profile");
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-slate-50/80 hover:text-slate-900 transition-colors flex items-center gap-2 mt-1"
                    >
                      <Users size={14} className="text-slate-400" /> Account
                    </button>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50/40 transition-colors flex items-center gap-2 border-t border-slate-100 mt-1 pt-2"
                    >
                      <LogOut size={14} className="text-red-400" /> Log Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      ) : (
        <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled 
            ? "backdrop-blur-md bg-white/80 border-b border-slate-200/50 shadow-sm" 
            : "bg-white/95 border-b border-slate-100 shadow-sm"
        }`}>
          <div className="max-w-[1380px] w-full mx-auto px-4 sm:px-6 md:px-8 h-16 sm:h-[72px] flex items-center justify-between">
            {/* Left Block: Brand & Seal combined */}
            <div className="flex items-center gap-4 min-w-0">
              <Link href="/" className="flex items-center gap-2.5 hover:no-underline shrink-0">
                <img
                  src="/maharashtra_seal.png"
                  alt="Government of Maharashtra Seal"
                  className="h-9 w-9 sm:h-10 sm:w-10 object-contain"
                />
                <div className="hidden md:flex flex-col text-[10px] sm:text-xs font-semibold leading-tight text-slate-800">
                  <span>Government of Maharashtra</span>
                  <span className="text-slate-400 font-normal">महाराष्ट्र शासन</span>
                </div>
              </Link>

              <div className="h-8 w-[1px] bg-slate-200 shrink-0 hidden md:block" />

              <Link href="/" className="flex flex-col leading-none hover:no-underline shrink-0">
                <span className="font-heading font-bold text-base sm:text-lg text-slate-900 tracking-tight">
                  Maha<span className="text-blue-600">CSR</span> Setu
                </span>
                <span className="text-[9px] font-bold text-blue-600 mt-0.5 uppercase tracking-wider">
                  महाराष्ट्र CSR सेतु
                </span>
              </Link>
            </div>

            {/* Middle Block: Menu Links (Desktop) */}
            <nav className="hidden lg:flex items-center gap-1 h-full text-sm font-medium text-slate-600">
              <Link
                href="/"
                className={`px-3.5 py-1.5 rounded-lg transition-colors hover:no-underline ${
                  pathname === "/"
                    ? "bg-blue-50 text-blue-600 font-semibold"
                    : "hover:bg-slate-50 hover:text-slate-900"
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
                      className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors hover:no-underline ${
                        isActive
                          ? "bg-blue-50 text-blue-600 font-semibold"
                          : "hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      {group.label}
                      <ChevronDown 
                        size={12} 
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
                          className="absolute left-0 top-full mt-1.5 z-[70] w-[260px] border border-slate-200/50 bg-white/95 backdrop-blur-xl p-1.5 rounded-2xl shadow-xl"
                        >
                          {group.links.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setOpenNavGroup(null)}
                              className={`block px-3 py-2 rounded-xl text-xs font-medium leading-5 hover:no-underline transition-all ${
                                pathname === link.href || pathname.startsWith(link.href + "/")
                                  ? "bg-blue-50 text-blue-600 font-semibold"
                                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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

            {/* Right Block: Buttons and Mobile Toggle */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/login" className="inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:no-underline transition-colors">
                  Login
                </Link>
                <Link href="/register" className="inline-flex min-h-9 items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 px-4.5 text-xs font-bold text-white hover:no-underline shadow-md shadow-blue-500/10 transition-colors">
                  Register
                </Link>
              </div>

              {/* Mobile Hamburger menu */}
              <button
                className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 focus:outline-none"
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
      <div className={isDashboard ? "flex flex-1 pt-[60px]" : "flex flex-1"}>
        
        {/* Desktop Sidebar */}
        {isDashboard && (
          <aside
            className={`hidden lg:flex flex-col border-r border-slate-200/50 bg-slate-50/75 backdrop-blur-xl shrink-0 transition-all duration-300 relative justify-between py-4 shadow-sm ${
              sidebarCollapsed ? "w-[68px]" : "w-60"
            }`}
          >
            {/* Navigation Links */}
            <div className="flex flex-col gap-0.5 px-2 overflow-y-auto max-h-[calc(100vh-160px)] pr-1">
              {dashboardNavigationItems.map((item) => {
                const isExact = pathname === item.href ||
                                (item.href.endsWith("/overview") && pathname === item.href.replace("/overview", "")) ||
                                (item.href.endsWith("/statewide") && pathname === item.href.replace("/statewide", "")) ||
                                (item.href.endsWith("/dashboard") && pathname === item.href.replace("/dashboard", ""));
                const hasExactMatch = dashboardNavigationItems.some((it) => 
                  pathname === it.href ||
                  (it.href.endsWith("/overview") && pathname === it.href.replace("/overview", "")) ||
                  (it.href.endsWith("/statewide") && pathname === it.href.replace("/statewide", "")) ||
                  (it.href.endsWith("/dashboard") && pathname === it.href.replace("/dashboard", ""))
                );
                const isActive = hasExactMatch ? isExact : (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] font-medium transition-all group relative ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/10"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
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
                className="w-full flex items-center justify-center p-2 border border-slate-200/60 hover:bg-slate-100/80 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"
              >
                {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            </div>
          </aside>
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
                className="w-72 bg-white p-6 flex flex-col justify-between h-full border-r border-[#e0e4ea] shadow-xl"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center pb-3 border-b border-[#e0e4ea]">
                    <span className="font-heading font-bold text-[#14274e] text-sm">Navigation</span>
                    <button onClick={() => setMobileMenuOpen(false)} className="text-[#6b7280] hover:text-[#14274e]"><X size={18} /></button>
                  </div>
                  <div className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-180px)]">
                    {isDashboard ? (
                      dashboardNavigationItems.map((item) => {
                        const isExact = pathname === item.href ||
                                        (item.href.endsWith("/overview") && pathname === item.href.replace("/overview", "")) ||
                                        (item.href.endsWith("/statewide") && pathname === item.href.replace("/statewide", "")) ||
                                        (item.href.endsWith("/dashboard") && pathname === item.href.replace("/dashboard", ""));
                        const hasExactMatch = dashboardNavigationItems.some((it) => 
                          pathname === it.href ||
                          (it.href.endsWith("/overview") && pathname === it.href.replace("/overview", "")) ||
                          (it.href.endsWith("/statewide") && pathname === it.href.replace("/statewide", "")) ||
                          (it.href.endsWith("/dashboard") && pathname === it.href.replace("/dashboard", ""))
                        );
                        const isActive = hasExactMatch ? isExact : (item.href !== "/" && pathname.startsWith(item.href));
                        return (
                          <Link
                            key={item.label}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                              isActive
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/10"
                                : "text-[#4b5563] hover:text-[#14274e] hover:bg-[#f4f5f7]"
                            }`}
                          >
                            <item.icon size={16} className={isActive ? "text-white" : "text-[#97a0ac]"} />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })
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
                          href="/pitch-development-need"
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                            pathname.startsWith("/pitch-development-need")
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/10"
                              : "text-[#4b5563] hover:text-[#14274e] hover:bg-[#f4f5f7]"
                          }`}
                        >
                          <Sparkles size={16} className={pathname.startsWith("/pitch-development-need") ? "text-white" : "text-[#97a0ac]"} />
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
                        { label: "Pitch a Development Need", href: "/pitch-development-need" },
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

    </div>
  );
}

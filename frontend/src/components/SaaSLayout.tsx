"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Building2, Landmark, Search, Bell, Mail, ChevronLeft, ChevronRight,
  Layers, Sparkles, Award, Coins, Compass, FileText, BarChart2,
  HelpCircle, Menu, X, LogOut, ShieldCheck, BookOpen, ShieldAlert,
  Clock, Users, Globe2, ChevronDown, ArrowUp, MapPin, Phone
} from "lucide-react";
import { Button } from "./ui/Button";
import { apiFetch, getStoredUser } from "@/lib/api";

interface SaaSLayoutProps {
  children: React.ReactNode;
}

export default function SaaSLayout({ children }: SaaSLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; isRead: boolean }>>([]);
  const [userEmail, setUserEmail] = useState("user@mahacsr.gov.in");

  const isDashboard = pathname.startsWith("/ngo-dashboard") || 
                      pathname.startsWith("/company-dashboard") || 
                      pathname.startsWith("/government-portal") ||
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
                      pathname.startsWith("/admin");

  useEffect(() => {
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
    setUserDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isDashboard) return;

    const token = localStorage.getItem("accessToken");
    const user = getStoredUser();

    if (!token || !user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    setUserEmail(user.email || "user@mahacsr.gov.in");

    const role = user.role as string;
    const allowed =
      (pathname.startsWith("/ngo-dashboard") && ["NGO_ADMIN", "NGO_MEMBER"].includes(role)) ||
      (pathname.startsWith("/company-dashboard") && ["COMPANY_ADMIN", "COMPANY_MEMBER"].includes(role)) ||
      (pathname.startsWith("/government-portal") && ["SUPER_ADMIN", "PORTAL_ADMIN"].includes(role)) ||
      (pathname.startsWith("/admin") && role === "SUPER_ADMIN") ||
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
      if (["NGO_ADMIN", "NGO_MEMBER"].includes(role)) router.push("/ngo-dashboard");
      else if (["COMPANY_ADMIN", "COMPANY_MEMBER"].includes(role)) router.push("/company-dashboard");
      else if (role === "SUPER_ADMIN") router.push("/admin");
      else if (role === "PORTAL_ADMIN") router.push("/government-portal");
      else router.push("/");
    }
  }, [isDashboard, pathname, router]);

  useEffect(() => {
    if (!isDashboard) return;

    apiFetch<Array<{ id: string; title: string; message: string; isRead: boolean }>>("/notifications")
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, [isDashboard, pathname]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const getSidebarItems = () => {
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

    if (pathname.startsWith("/government-portal")) {
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

    if (pathname.startsWith("/admin")) {
      return [
        { label: "Dashboard", href: "/admin/dashboard", icon: Layers },
        { label: "Users", href: "/admin/users-roles", icon: Users },
        { label: "NGO Registry", href: "/admin/ngo-registry", icon: Landmark },
        { label: "Companies", href: "/admin/companies", icon: Building2 },
        { label: "Projects", href: "/admin/projects", icon: Compass },
        { label: "Verification Queue", href: "/admin/applications", icon: Clock },
        { label: "Reports", href: "/admin/reports", icon: BarChart2 },
        { label: "Audit Trail", href: "/admin/audit-trail", icon: FileText }
      ];
    }

    return [
      { label: "Overview Console", href: "/ngo-dashboard", icon: Layers },
      { label: "Directories", href: "/marketplace", icon: Compass },
      { label: "Collaboration Hub", href: "/chat", icon: Mail },
      { label: "Knowledge Center", href: "/knowledge", icon: BookOpen },
      { label: "About Mandate", href: "/about", icon: HelpCircle }
    ];
  };

  const dashboardNavigationItems = getSidebarItems();

  return (
    <div className="flex flex-col min-h-screen bg-[#f6f8fb] text-slate-900 font-sans">
     

      {isDashboard && <div className="fixed top-0 left-0 right-0 h-1 z-[60] bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />}

      <header
        className={
          isDashboard
            ? "fixed top-1 left-0 right-0 h-[68px] z-50 bg-white border-b border-gov-line flex justify-between items-center px-6 md:px-10 shadow-sm"
            : "sticky top-0 z-50 border-b border-[#d8e2ef] bg-white shadow-sm"
        }
      >
        <div className={isDashboard ? "contents" : "mx-auto flex h-[80px] max-w-[1380px] items-center justify-between gap-3 px-4 sm:px-6 md:px-8"}>
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
            <svg viewBox="0 0 100 100" className={isDashboard ? "w-9 h-9" : "h-10 w-10 sm:h-12 sm:w-12"} fill="none" stroke="currentColor">
              <polygon points="50,5 82,18 95,50 82,82 50,95 18,82 5,50 18,18" stroke="#1e3a8a" strokeWidth="4.5" fill="#eff6ff" />
              <path d="M28,32 L72,32 M32,44 L68,44 M28,56 L72,56 M36,68 L64,68" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
              <path d="M42,80 L58,80" stroke="#1e3a8a" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <div className="flex min-w-0 flex-col leading-none">
              <span className={isDashboard ? "font-heading font-extrabold text-lg tracking-tight text-[#1e3a8a]" : "font-heading text-[22px] font-extrabold tracking-tight text-[#1e3a8a] sm:text-[28px]"}>
                Maha<span className="text-[#f97316]">CSR</span>
              </span>
              <span className={isDashboard ? "text-[8px] text-gray-500 tracking-wider font-extrabold mt-0.5 uppercase" : "mt-1 hidden text-[11px] font-semibold leading-4 text-[#607086] min-[380px]:block"}>
                {isDashboard ? "Government of Maharashtra" : "Corporate Social Responsibility Portal"}
                {!isDashboard && <span className="block">Government of Maharashtra</span>}
              </span>
            </div>
          </Link>
        </div>

        {/* Public Navigation */}
        {!isDashboard && (
          <nav className="hidden items-center gap-4 text-xs font-extrabold text-[#283d5c] lg:flex xl:gap-6">
            <Link href="/" className=" px-1 py-8 text-[#245ddc] hover:no-underline">Home</Link>
            <Link href="/about" className="inline-flex items-center gap-1 py-8 hover:text-[#245ddc] hover:no-underline">About MahaCSR <ChevronDown size={13} /></Link>
            <Link href="/marketplace" className="inline-flex items-center gap-1 py-8 hover:text-[#245ddc] hover:no-underline">Directories <ChevronDown size={13} /></Link>
            <Link href="/knowledge" className="inline-flex items-center gap-1 py-8 hover:text-[#245ddc] hover:no-underline">Knowledge Center <ChevronDown size={13} /></Link>
            {/* <Link href="/reports" className="inline-flex items-center gap-1 py-8 hover:text-[#245ddc] hover:no-underline">Reports & Data <ChevronDown size={13} /></Link> */}
          </nav>
        )}

        {/* Dashboard Search */}
        {isDashboard && (
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
        )}


        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {isDashboard ? (
            <>
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
            </>
          ) : (
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <Link href="/login" className="inline-flex min-h-10 items-center rounded-md border border-[#245ddc] px-4 text-xs font-extrabold text-[#1e3a8a] hover:bg-blue-50 hover:no-underline sm:px-5">
                Login
              </Link>
              <Link href="/register" className="hidden min-h-10 items-center rounded-md bg-[#062a5d] px-5 text-xs font-extrabold text-white shadow-sm hover:bg-[#0b3a78] hover:no-underline sm:inline-flex">
                Register
              </Link>
            </div>
          )}

        </div>
        </div>
      </header>

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
                    { label: "About Mandate", href: "/about", icon: HelpCircle },
                    { label: "Directories", href: "/marketplace", icon: Compass },
                    { label: "Knowledge Center", href: "/knowledge", icon: BookOpen }
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
            {children}
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
                    <Link href="/marketplace" className="text-blue-100 hover:text-white">Directories</Link>
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

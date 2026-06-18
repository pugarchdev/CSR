"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Building2, Landmark, Search, Bell, Mail, ChevronLeft, ChevronRight,
  Layers, Sparkles, Award, Coins, Compass, FileText, Settings, BarChart2,
  HelpCircle, Menu, X, LogOut, ShieldCheck, BookOpen, ShieldAlert,
  Clock, Users, Calendar
} from "lucide-react";
import { Button } from "./ui/Button";

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
  const [activeLanguage, setActiveLanguage] = useState<"EN" | "MH">("EN");

  const isDashboard = pathname.startsWith("/ngo-dashboard") || 
                      pathname.startsWith("/company-dashboard") || 
                      pathname.startsWith("/government-portal") ||
                      pathname.startsWith("/chat") || 
                      pathname.startsWith("/analytics") || 
                      pathname.startsWith("/admin");

  useEffect(() => {
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
    setUserDropdownOpen(false);
  }, [pathname]);

  const toggleLanguage = () => {
    setActiveLanguage(prev => prev === "EN" ? "MH" : "EN");
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const getSidebarItems = () => {
    if (pathname.startsWith("/ngo-dashboard")) {
      return [
        { label: "Overview Console", href: "/ngo-dashboard/overview", icon: Layers },
        { label: "Org Credentials", href: "/ngo-dashboard/profile", icon: Landmark },
        { label: "Active Projects", href: "/ngo-dashboard/projects", icon: Compass },
        { label: "Proposal Drafts", href: "/ngo-dashboard/drafts", icon: FileText },
        { label: "Awaiting Approvals", href: "/ngo-dashboard/submitted", icon: Clock },
        { label: "Marketplace Catalog", href: "/ngo-dashboard/approved", icon: ShieldCheck },
        { label: "Milestone Escrow", href: "/ngo-dashboard/milestones", icon: Award },
        { label: "Drawdown Ledger", href: "/ngo-dashboard/funding", icon: Coins },
        { label: "Annual Reports", href: "/ngo-dashboard/reports", icon: BarChart2 },
        { label: "SDG Allocations", href: "/ngo-dashboard/impact", icon: Sparkles },
        { label: "Beneficiary Logs", href: "/ngo-dashboard/beneficiaries", icon: Users },
        { label: "Volunteer Roster", href: "/ngo-dashboard/volunteers", icon: Users },
        { label: "Documents Vault", href: "/ngo-dashboard/documents", icon: BookOpen },
        { label: "Compliance Check", href: "/ngo-dashboard/compliance", icon: ShieldAlert },
        { label: "Milestone Calendar", href: "/ngo-dashboard/calendar", icon: Calendar },
        { label: "District Analytics", href: "/ngo-dashboard/analytics", icon: BarChart2 },
        { label: "System Settings", href: "/ngo-dashboard/settings", icon: Settings }
      ];
    }
    
    if (pathname.startsWith("/company-dashboard")) {
      return [
        { label: "Overview Console", href: "/company-dashboard/overview", icon: Layers },
        { label: "Budget Sliders", href: "/company-dashboard/budget", icon: Coins },
        { label: "Project Directory", href: "/company-dashboard/marketplace", icon: Compass },
        { label: "Matching Recommendations", href: "/company-dashboard/recommendations", icon: Sparkles },
        { label: "Funded Projects", href: "/company-dashboard/funded", icon: ShieldCheck },
        { label: "Inspection Reviews", href: "/company-dashboard/reviews", icon: BookOpen },
        { label: "Milestone Approvals", href: "/company-dashboard/milestones", icon: Award },
        { label: "Verified NGO Registry", href: "/company-dashboard/ngos", icon: Landmark },
        { label: "Meetings Scheduler", href: "/company-dashboard/meetings", icon: Calendar },
        { label: "Project Documents", href: "/company-dashboard/documents", icon: BookOpen },
        { label: "Compliance Check", href: "/company-dashboard/compliance", icon: ShieldAlert },
        { label: "Executive Reports", href: "/company-dashboard/reports", icon: BarChart2 },
        { label: "Sourcing Analytics", href: "/company-dashboard/analytics", icon: BarChart2 },
        { label: "District Penetration", href: "/company-dashboard/coverage", icon: Compass },
        { label: "SDG Dashboard", href: "/company-dashboard/sdg", icon: Sparkles },
        { label: "Activity Audits", href: "/company-dashboard/audit", icon: FileText },
        { label: "Settings Console", href: "/company-dashboard/settings", icon: Settings }
      ];
    }

    if (pathname.startsWith("/government-portal")) {
      return [
        { label: "Statewide Monitor", href: "/government-portal/statewide", icon: Layers },
        { label: "District Grids", href: "/government-portal/district", icon: Compass },
        { label: "Sourcing Analytics", href: "/government-portal/analytics", icon: BarChart2 },
        { label: "NGO Verifications", href: "/government-portal/ngo-verify", icon: Landmark },
        { label: "Corporate Verifications", href: "/government-portal/company-verify", icon: Building2 },
        { label: "Project Approvals", href: "/government-portal/project-verify", icon: ShieldCheck },
        { label: "Milestone Inspections", href: "/government-portal/monitoring", icon: Award },
        { label: "Compliance Auditing", href: "/government-portal/compliance", icon: ShieldAlert },
        { label: "Impact Assessments", href: "/government-portal/impact", icon: Sparkles },
        { label: "GIS Heatmaps", href: "/government-portal/heatmaps", icon: Compass },
        { label: "Circular Management", href: "/government-portal/circulars", icon: FileText },
        { label: "Knowledge Index", href: "/government-portal/knowledge", icon: BookOpen },
        { label: "Citizen Feedback", href: "/government-portal/feedback", icon: Mail },
        { label: "Audit Trail", href: "/government-portal/audit", icon: FileText },
        { label: "Settings Console", href: "/government-portal/settings", icon: Settings },
        { label: "Reports Desk", href: "/government-portal/reports", icon: BarChart2 }
      ];
    }

    if (pathname.startsWith("/admin")) {
      return [
        { label: "Systems Dashboard", href: "/admin/dashboard", icon: Layers },
        { label: "User Accounts", href: "/admin/users", icon: Users },
        { label: "Role Definitions", href: "/admin/roles", icon: ShieldCheck },
        { label: "Access Permissions", href: "/admin/permissions", icon: Settings },
        { label: "NGO Registry", href: "/admin/ngos", icon: Landmark },
        { label: "Corporate Sourcing", href: "/admin/companies", icon: Building2 },
        { label: "Project Registry", href: "/admin/projects", icon: Compass },
        { label: "Escrow Auditing", href: "/admin/funding", icon: Coins },
        { label: "Verification Backlog", href: "/admin/queue", icon: Clock },
        { label: "Reports Desk", href: "/admin/reports", icon: BarChart2 },
        { label: "Platform Analytics", href: "/admin/analytics", icon: BarChart2 },
        { label: "Circular Registry", href: "/admin/circulars", icon: FileText },
        { label: "Knowledge Editor", href: "/admin/knowledge", icon: BookOpen },
        { label: "CMS Editor", href: "/admin/cms", icon: FileText },
        { label: "District Data Config", href: "/admin/districts", icon: Compass },
        { label: "System Config", href: "/admin/config", icon: Settings },
        { label: "Security Console", href: "/admin/security", icon: ShieldAlert },
        { label: "System Settings", href: "/admin/settings", icon: Settings },
        { label: "System Audit Trail", href: "/admin/audit", icon: FileText }
      ];
    }

    return [
      { label: "Overview Console", href: "/ngo-dashboard", icon: Layers },
      { label: "Directories", href: "/marketplace", icon: Compass },
      { label: "Collaboration Hub", href: "/chat", icon: Mail },
      { label: "Knowledge Center", href: "/knowledge", icon: BookOpen },
      { label: "Government Portal", href: "/government-portal", icon: ShieldAlert },
      { label: "About Mandate", href: "/about", icon: HelpCircle }
    ];
  };

  const dashboardNavigationItems = getSidebarItems();

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      
      {/* Tri-color Top Ribbon */}
      <div className="fixed top-0 left-0 right-0 h-1 z-[60] bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />

      {/* Sticky Navbar */}
      <header className="fixed top-1 left-0 right-0 h-[64px] z-50 bg-white border-b border-slate-200 flex justify-between items-center px-6 md:px-10 shadow-sm">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-4">
          {isDashboard && (
            <button 
              className="lg:hidden text-slate-500 hover:text-slate-700"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
          )}
          
          <Link href="/" className="flex items-center gap-3">
            <svg viewBox="0 0 100 100" className="w-9 h-9" fill="none" stroke="currentColor">
              <polygon points="50,5 82,18 95,50 82,82 50,95 18,82 5,50 18,18" stroke="#1e3a8a" strokeWidth="4.5" fill="#eff6ff" />
              <path d="M28,32 L72,32 M32,44 L68,44 M28,56 L72,56 M36,68 L64,68" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
              <path d="M42,80 L58,80" stroke="#1e3a8a" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <div className="flex flex-col leading-none">
              <span className="font-heading font-extrabold text-lg tracking-tight text-slate-900">
                Maha<span className="text-[#f97316]">CSR</span>
              </span>
              <span className="text-[8px] text-slate-500 tracking-wider font-extrabold mt-0.5 uppercase">
                Govt. of Maharashtra | महाराष्ट्र शासन
              </span>
            </div>
          </Link>
        </div>

        {/* Public Navigation */}
        {!isDashboard && (
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-500">
            <Link href="/" className="hover:text-[#1e3a8a] transition-colors">Home</Link>
            <Link href="/about" className="hover:text-[#1e3a8a] transition-colors">About Mandate</Link>
            <Link href="/marketplace" className="hover:text-[#1e3a8a] transition-colors">Directories</Link>
            <Link href="/knowledge" className="hover:text-[#1e3a8a] transition-colors">Knowledge Center</Link>
            <Link href="/government-portal" className="hover:text-[#1e3a8a] transition-colors">Gov Portal</Link>
          </nav>
        )}

        {/* Dashboard Search */}
        {isDashboard && (
          <div className="hidden md:flex items-center gap-2 max-w-sm w-full relative">
            <input 
              type="text" 
              placeholder="Search proposals, NGOs, or metrics..." 
              className="govt-input pl-9"
            />
            <Search size={14} className="absolute left-3 text-slate-400" />
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          
          {/* Language Switcher */}
          <button 
            onClick={toggleLanguage}
            className="text-[10px] font-bold border border-slate-300 hover:border-[#1e3a8a] bg-white px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-[#1e3a8a] transition-colors"
          >
            {activeLanguage === "EN" ? "मराठी" : "EN"}
          </button>

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
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white" />
                </button>
                
                {notificationsOpen && (
                  <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-xl p-4 shadow-lg z-50 flex flex-col gap-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-xs font-extrabold text-slate-800">Notifications</span>
                      <span className="text-[10px] text-[#1e3a8a] font-bold cursor-pointer hover:underline">Clear all</span>
                    </div>
                    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex flex-col gap-1 text-[11px]">
                        <span className="font-bold text-amber-800">NGO Darpan Filing Outdated</span>
                        <span className="text-amber-600">Compliance documentation requires immediate updating.</span>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex flex-col gap-1 text-[11px]">
                        <span className="font-bold text-blue-800">Milestone Release Approved</span>
                        <span className="text-blue-600">Tranche of ₹5,00,000 has been verified.</span>
                      </div>
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
                      <span className="text-xs font-bold text-slate-800">User Account</span>
                      <span className="text-[10px] text-slate-500 truncate">user@mahacsr.gov.in</span>
                    </div>
                    <button 
                      onClick={() => router.push("/ngo-dashboard")}
                      className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-[#1e3a8a] transition-colors flex items-center gap-2 mt-1"
                    >
                      <Landmark size={14} /> NGO Dashboard
                    </button>
                    <button 
                      onClick={() => router.push("/company-dashboard")}
                      className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-[#1e3a8a] transition-colors flex items-center gap-2"
                    >
                      <Building2 size={14} /> Corporate Dashboard
                    </button>
                    <button 
                      onClick={() => router.push("/government-portal")}
                      className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-[#1e3a8a] transition-colors flex items-center gap-2"
                    >
                      <ShieldAlert size={14} /> Government Portal
                    </button>
                    <button 
                      onClick={() => router.push("/admin")}
                      className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-[#1e3a8a] transition-colors flex items-center gap-2"
                    >
                      <ShieldCheck size={14} /> Admin Console
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
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-xs text-slate-500 hover:text-[#1e3a8a] font-semibold px-2">
                Login
              </Link>
              <Link href="/register" className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm">
                Register
              </Link>
            </div>
          )}

        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 pt-[65px]">
        
        {/* Desktop Sidebar */}
        {isDashboard && (
          <aside 
            className={`hidden lg:flex flex-col border-r border-slate-200 bg-white shrink-0 transition-all duration-300 relative justify-between py-4 ${
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
                        ? "bg-[#1e3a8a] text-white shadow-sm" 
                        : "text-slate-600 hover:text-[#1e3a8a] hover:bg-slate-50"
                    }`}
                  >
                    <item.icon size={15} className={isActive ? "text-white" : "text-slate-400 group-hover:text-[#1e3a8a]"} />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                    
                    {sidebarCollapsed && (
                      <div className="absolute left-[76px] bg-slate-800 text-white py-1 px-2.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap shadow-md text-[10px] z-50">
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
                className="w-full flex items-center justify-center p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-[#1e3a8a] transition-colors"
              >
                {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            </div>
          </aside>
        )}

        {/* Mobile Sidebar */}
        {isDashboard && mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden bg-black/30 backdrop-blur-sm animate-fadeIn">
            <div className="w-64 bg-white p-5 flex flex-col justify-between h-full border-r border-slate-200 shadow-xl">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                  <span className="font-heading font-extrabold text-slate-900 text-sm">Navigation</span>
                  <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
                </div>
                <div className="flex flex-col gap-0.5 overflow-y-auto max-h-[calc(100vh-160px)]">
                  {dashboardNavigationItems.map((item) => {
                    const isActive = pathname === item.href || 
                                     (item.href.endsWith("/overview") && pathname === item.href.replace("/overview", "")) ||
                                     (item.href !== "/" && pathname.startsWith(item.href));
                    return (
                      <Link 
                        key={item.label}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                          isActive 
                            ? "bg-[#1e3a8a] text-white" 
                            : "text-slate-600 hover:text-[#1e3a8a] hover:bg-slate-50"
                        }`}
                      >
                        <item.icon size={16} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-3 border-t border-slate-200">
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-3 transition-all"
                >
                  <LogOut size={16} />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-grow flex flex-col min-w-0">
          <main className="flex-grow">
            {children}
          </main>
          
          {/* Government Footer */}
          <footer className="border-t border-slate-200 bg-white py-5 px-6 md:px-10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-medium shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-[#1e3a8a] text-sm tracking-tight">MahaCSR</span>
              <span>• Government of Maharashtra Enterprise CSR Platform. Approved under MCA Section 135.</span>
            </div>
            <div className="flex gap-6">
              <Link href="#" className="hover:text-[#1e3a8a] transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-[#1e3a8a] transition-colors">Compliance Audits</Link>
              <Link href="#" className="hover:text-[#1e3a8a] transition-colors">Support Center</Link>
            </div>
          </footer>
        </div>

      </div>

    </div>
  );
}

"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "../../styles/gov-theme.css";

interface NavLink {
  label: string;
  to: string;
  icon?: string;
}

interface NavGroup {
  title: string;
  links: NavLink[];
  roles?: string[];
}

const navGroups: NavGroup[] = [
  {
    title: "NGO Portal",
    roles: ["NGO_ADMIN", "NGO_MEMBER"],
    links: [
      { label: "Dashboard", to: "/dashboard" },
      { label: "NGO Onboarding", to: "/onboarding" },
      { label: "Application Status", to: "/onboarding/status" },
      { label: "Documents", to: "/onboarding/documents" },
      { label: "Queries", to: "/queries" },
      { label: "My Projects", to: "/csr-projects" },
      { label: "Marketplace", to: "/marketplace" },
    ],
  },
  {
    title: "Admin Portal",
    roles: ["SUPER_ADMIN", "PORTAL_ADMIN", "CSR_ADMIN"],
    links: [
      { label: "Dashboard", to: "/admin/dashboard" },
      { label: "Users", to: "/admin/users-roles" },
      { label: "NGO Registry", to: "/admin/ngo-registry" },
      { label: "Companies", to: "/admin/companies" },
      { label: "Projects", to: "/admin/projects" },
      { label: "Verification Queue", to: "/admin/applications" },
      { label: "Reports", to: "/admin/reports" },
      { label: "Audit Trail", to: "/admin/audit-trail" },
    ],
  },
  {
    title: "Company Portal",
    roles: ["COMPANY_ADMIN", "COMPANY_MEMBER"],
    links: [
      { label: "Dashboard", to: "/company-dashboard" },
      { label: "Browse Projects", to: "/marketplace" },
      { label: "Funded Projects", to: "/company/funded-projects" },
      { label: "Payments", to: "/company/payments" },
      { label: "Reports", to: "/company/reports" },
    ],
  },
];

interface GovPortalLayoutProps {
  children: ReactNode;
  userRole?: string;
  showSidebar?: boolean;
}

export default function GovPortalLayout({ children, userRole, showSidebar }: GovPortalLayoutProps) {
  const pathname = usePathname();
  const shouldShowSidebar = showSidebar ?? userRole !== "PUBLIC";

  if (userRole !== "PUBLIC") {
    return (
      <main id="main-content" className="gov-main gov-public-main">
        {children}
      </main>
    );
  }

  if (!shouldShowSidebar) {
    return (
      <main id="main-content" className="gov-main gov-public-main">
        {children}
      </main>
    );
  }

  // Filter nav groups based on user role
  const filteredNavGroups = navGroups.filter((group) => {
    if (!group.roles) return true;
    return group.roles.includes(userRole || "");
  });

  return (
    <div className="gov-page">
      {/* Top Strip */}
      <div className="gov-top-strip">
        <div className="gov-container gov-top-strip-inner">
          <div>Maharashtra CSR Facilitation & Monitoring Portal</div>
          <div className="gov-accessibility">
            <button type="button" title="Skip to main content">Skip to main</button>
            <button type="button" title="Screen reader access">Screen Reader</button>
            <button type="button" title="Decrease font size">A-</button>
            <button type="button" title="Normal font size">A</button>
            <button type="button" title="Increase font size">A+</button>
            <button type="button" title="Switch to Hindi">Hindi</button>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="gov-header">
        <div className="gov-container gov-header-inner">
          <Link href="/" className="gov-brand" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="gov-emblem">IND</div>
            <div>
              <h1 className="gov-brand-title">CSR Facilitation & Monitoring Portal</h1>
              <p className="gov-brand-subtitle">
                Corporate Social Responsibility | NGO Verification | Project Monitoring
              </p>
            </div>
          </Link>

          <div className="gov-accessibility">
            <div style={{ textAlign: "right", fontSize: 13 }}>
              <div>Helpdesk: 1800-123-4567</div>
              <div style={{ opacity: 0.8 }}>Last login: {new Date().toLocaleDateString()}</div>
            </div>
            
            {/* User Dropdown */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => {
                  const dropdown = document.getElementById("user-dropdown");
                  if (dropdown) {
                    dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
                  }
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #12325a, #d97706)",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                U
              </button>
              
              <div
                id="user-dropdown"
                style={{
                  display: "none",
                  position: "absolute",
                  right: 0,
                  marginTop: 8,
                  width: 200,
                  background: "white",
                  border: "1px solid var(--gov-border)",
                  borderRadius: "var(--gov-radius)",
                  boxShadow: "var(--gov-shadow)",
                  zIndex: 1000,
                }}
              >
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--gov-border)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gov-text)" }}>User Account</div>
                  <div style={{ fontSize: 10, color: "var(--gov-text-muted)", marginTop: 2 }}>user@mahacsr.gov.in</div>
                </div>
                
                <a
                  href="/profile"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 16px",
                    fontSize: 13,
                    color: "var(--gov-text)",
                    textDecoration: "none",
                    borderBottom: "1px solid var(--gov-border)",
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#f8fafc"}
                  onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <span aria-hidden="true">AC</span>
                  <span>Account</span>
                </a>
                
                <button
                  onClick={() => {
                    localStorage.removeItem("accessToken");
                    localStorage.removeItem("user");
                    window.location.href = "/login";
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 16px",
                    fontSize: 13,
                    color: "#b91c1c",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#fee2e2"}
                  onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <span aria-hidden="true">LO</span>
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className={shouldShowSidebar ? "gov-layout" : "gov-layout gov-layout-no-sidebar"}>
        {/* Sidebar Navigation */}
        {shouldShowSidebar && (
          <aside className="gov-sidebar" aria-label="Main navigation">
            {filteredNavGroups.map((group) => (
              <div key={group.title}>
                <div className="gov-sidebar-section-title">{group.title}</div>
                {group.links.map((link) => {
                  const isActive = pathname === link.to || pathname?.startsWith(link.to + "/");
                  return (
                    <Link
                      key={link.to}
                      href={link.to}
                      className={isActive ? "gov-nav-link active" : "gov-nav-link"}
                    >
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </aside>
        )}

        {/* Main Content */}
        <main id="main-content" className="gov-main">
          {children}
        </main>
      </div>
    </div>
  );
}

// Made with Bob

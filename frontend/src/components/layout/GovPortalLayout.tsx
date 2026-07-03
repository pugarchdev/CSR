"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearApiCache } from "@/lib/api";
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
    title: "CSR Relationship Manager",
    roles: ["CSR_RELATIONSHIP_MANAGER"],
    links: [
      { label: "Dashboard", to: "/rm/dashboard" },
      { label: "Corporate Enquiries", to: "/rm/enquiries" },
      { label: "Government Pitches", to: "/rm/government-pitches" },
      { label: "Corporate Interests", to: "/rm/interests" },
      { label: "Feasibility Reports", to: "/rm/assessments" },
      { label: "Company Directory", to: "/rm/companies" },
      { label: "Communication Log", to: "/rm/communications" },
      { label: "Reports", to: "/rm/reports" },
    ],
  },
  {
    title: "Joint Secretary",
    roles: ["JOINT_SECRETARY"],
    links: [
      { label: "JS Dashboard", to: "/js/dashboard" },
      { label: "Corporate Enquiries", to: "/rm/enquiries" },
      { label: "Assessment Reports", to: "/js/assessments" },
      { label: "Government Pitch Approvals", to: "/js/government-pitches" },
      { label: "Nodal Appointments", to: "/js/nodal-appointments" },
      { label: "RM Escalations", to: "/js/escalations" },
      { label: "Convergence Projects", to: "/convergence-projects" },
    ],
  },
  {
    title: "Planning Secretary",
    roles: ["PLANNING_SECRETARY"],
    links: [
      { label: "Escalations", to: "/secretary/escalations" },
      { label: "Dashboard", to: "/secretary/dashboard" },
      { label: "Final Decisions", to: "/secretary/decisions" },
      { label: "JS Dashboard", to: "/js/dashboard" },
      { label: "Feasibility Assessments", to: "/js/assessments" },
      { label: "Final Grievance Review", to: "/state-cell/grievances" },
    ],
  },
  {
    title: "State CSR Cell",
    roles: ["STATE_CSR_CELL"],
    links: [
      { label: "Dashboard", to: "/state-cell/dashboard" },
      { label: "Corporate Enquiries", to: "/rm/enquiries" },
      { label: "Government Pitches", to: "/rm/government-pitches" },
      { label: "Grievance Queue", to: "/state-cell/grievances" },
      { label: "Convergence Projects", to: "/convergence-projects" },
    ],
  },
  {
    title: "District Nodal Officer",
    roles: ["DISTRICT_NODAL_OFFICER", "NODAL_OFFICER"],
    links: [
      { label: "Dashboard", to: "/nodal/dashboard" },
      { label: "Assigned Projects", to: "/nodal/projects" },
      { label: "Convergence Projects", to: "/convergence-projects" },
      { label: "Field Inspections", to: "/nodal/inspections" },
      { label: "Project Handover", to: "/nodal/handover" },
      { label: "Grievance Queue", to: "/nodal/grievances" },
    ],
  },
  {
    title: "Corporate Partner",
    roles: ["CORPORATE_USER", "CORPORATE_PARTNER"],
    links: [
      { label: "Dashboard", to: "/partner/dashboard" },
      { label: "Public Development Needs (Live)", to: "/public-development-needs" },
      { label: "My Enquiries", to: "/partner/enquiries" },
      { label: "Convergence Projects", to: "/convergence-projects" },
      { label: "Grievances", to: "/grievances" },
      { label: "Track Status", to: "/track" },
    ],
  },
  {
    title: "Implementing Agency",
    roles: ["IMPLEMENTING_AGENCY_USER"],
    links: [
      { label: "Dashboard", to: "/agency/dashboard" },
      { label: "Assigned Projects", to: "/agency/projects" },
      { label: "Milestone Tracking", to: "/convergence-projects" },
      { label: "Grievances", to: "/grievances" },
      { label: "Track Status", to: "/track" },
    ],
  },
  {
    title: "Government Department",
    roles: ["BENEFICIARY_AGENCY"],
    links: [
      { label: "Dashboard", to: "/department/dashboard" },
      { label: "Create Requirement", to: "/department/requirements/create" },
      { label: "My Requirements", to: "/department/requirements" },
      { label: "Company Interest", to: "/department/interests" },
      { label: "Active Projects", to: "/department/projects" },
      { label: "Asset Handover", to: "/department/handover" },
      { label: "Reports", to: "/department/reports" },
    ],
  },
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
      { label: "Convergence Projects", to: "/convergence-projects" },
      { label: "Grievances", to: "/grievances" },
      { label: "Public Development Needs (Live)", to: "/public-development-needs" },
    ],
  },
  {
    title: "Admin Portal",
    roles: ["SUPER_ADMIN", "PORTAL_ADMIN", "CSR_ADMIN"],
    links: [
      { label: "Dashboard", to: "/admin/dashboard" },
      { label: "Users", to: "/admin/users-roles" },
      { label: "Corporate Enquiries", to: "/rm/enquiries" },
      { label: "NGO Registry", to: "/admin/ngo-registry" },
      { label: "Companies", to: "/admin/companies" },
      { label: "Organizations", to: "/admin/organizations" },
      { label: "Projects", to: "/admin/projects" },
      { label: "Convergence Projects", to: "/convergence-projects" },
      { label: "Grievances", to: "/state-cell/grievances" },
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
      { label: "Public Development Needs (Live)", to: "/public-development-needs" },
      { label: "Convergence Projects", to: "/convergence-projects" },
      { label: "Grievances", to: "/grievances" },
      { label: "Track Status", to: "/track" },
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
  const router = useRouter();

  const getDefaultRoleFromPath = (path: string): string => {
    if (path.startsWith("/admin")) return "SUPER_ADMIN";
    if (path.startsWith("/rm")) return "CSR_RELATIONSHIP_MANAGER";
    if (path.startsWith("/js")) return "JOINT_SECRETARY";
    if (path.startsWith("/secretary")) return "PLANNING_SECRETARY";
    if (path.startsWith("/nodal")) return "DISTRICT_NODAL_OFFICER";
    if (path.startsWith("/state-cell")) return "STATE_CSR_CELL";
    if (path.startsWith("/agency")) return "IMPLEMENTING_AGENCY_USER";
    if (path.startsWith("/partner")) return "CORPORATE_USER";
    if (path.startsWith("/dashboard") || path.startsWith("/ngo-dashboard") || path.startsWith("/onboarding")) return "NGO_ADMIN";
    if (path.startsWith("/company-dashboard") || path.startsWith("/company")) return "COMPANY_ADMIN";
    if (path.startsWith("/department")) return "BENEFICIARY_AGENCY";
    // Shared routes — read role from localStorage, default to PUBLIC
    if (path.startsWith("/grievances") || path.startsWith("/convergence-projects") || path.startsWith("/projects")) {
      if (typeof window !== "undefined") {
        try { const u = JSON.parse(localStorage.getItem("user") || "{}"); if (u.role) return u.role; } catch { /* ignore */ }
      }
    }
    return "PUBLIC";
  };

  const [role, setRole] = useState<string>(
    userRole || getDefaultRoleFromPath(pathname || "")
  );
  const [userEmail, setUserEmail] = useState<string>("user@mahacsr.gov.in");
  const [userInitials, setUserInitials] = useState<string>("U");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("user");
      if (user) {
        try {
          const userData = JSON.parse(user);
          if (userData.role) {
            setRole(userData.role);
            return;
          }
        } catch (e) {
          console.error("Error parsing user data", e);
        }
      }
    }
    if (userRole) {
      setRole(userRole);
    }
  }, [userRole]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const user = localStorage.getItem("user");
    if (!user) return;

    try {
      const userData = JSON.parse(user);
      if (userData.email) {
        setUserEmail(userData.email);
      }

      const displayName = userData.name || userData.email || "";
      const initials = displayName.includes(" ")
        ? displayName
            .split(" ")
            .map((part: string) => part[0])
            .join("")
        : displayName.substring(0, 2);

      setUserInitials(initials.toUpperCase() || "U");
    } catch (e) {
      console.error("Error parsing user data", e);
    }
  }, []);

  const isAdminRole = ["SUPER_ADMIN", "PORTAL_ADMIN", "CSR_ADMIN"].includes(role);
  const isNgoRole = ["NGO_ADMIN", "NGO_MEMBER"].includes(role);
  const isCompanyRole = ["COMPANY_ADMIN", "COMPANY_MEMBER"].includes(role);
  const isDepartmentRole = role === "BENEFICIARY_AGENCY";
  const isRMRole = role === "CSR_RELATIONSHIP_MANAGER";
  const isJSRole = role === "JOINT_SECRETARY";
  const isSecretaryRole = role === "PLANNING_SECRETARY";
  const isNodalRole = role === "DISTRICT_NODAL_OFFICER" || role === "NODAL_OFFICER";
  const isCorporatePartnerRole = role === "CORPORATE_USER" || role === "CORPORATE_PARTNER";
  const isStateCellRole = role === "STATE_CSR_CELL";
  const isIARole = role === "IMPLEMENTING_AGENCY_USER";
  const isGovOfficerRole = role === "GOVERNMENT_OFFICER";
  const isPublic = role === "PUBLIC" || (!isAdminRole && !isNgoRole && !isCompanyRole && !isDepartmentRole && !isRMRole && !isJSRole && !isSecretaryRole && !isNodalRole && !isCorporatePartnerRole && !isStateCellRole && !isIARole && !isGovOfficerRole);

  const shouldShowSidebar = showSidebar ?? !isPublic;
  const roleLabel = role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      clearApiCache();
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
    }
    router.push("/login");
  };

  // Filter nav groups based on user role
  const filteredNavGroups = navGroups.filter((group) => {
    if (!group.roles) return true;
    return group.roles.includes(role);
  });

  return (
    <div className="gov-page">
      {shouldShowSidebar && (
        <header className="gov-auth-header">
          <Link href="/" className="gov-auth-brand" aria-label="MahaCSR home">
            <span className="gov-auth-emblem" aria-hidden="true">IND</span>
            <span>
              <span className="gov-auth-title">MahaCSR Portal</span>
              <span className="gov-auth-subtitle">Government of Maharashtra</span>
            </span>
          </Link>

          <div className="gov-auth-actions">
            <div className="gov-auth-role">
              <span>{roleLabel}</span>
              <small>{userEmail}</small>
            </div>
            <div className="gov-auth-avatar" aria-hidden="true">{userInitials}</div>
            <button type="button" className="gov-auth-logout" onClick={handleLogout}>
              Log Out
            </button>
          </div>
        </header>
      )}

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

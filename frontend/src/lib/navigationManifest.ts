export type NavSection =
  | "Overview"
  | "Applications"
  | "Projects"
  | "Organizations"
  | "Finance and Monitoring"
  | "Administration"
  | "Help and Support";

export type NavLevel = "PRIMARY" | "CHILD" | "WORKSPACE_TAB" | "HIDDEN";

export interface NavItemDef {
  id: string;
  label: string; // Concise sidebar label (e.g. "Pitches", "Interests", "Agencies")
  formalTitle?: string; // Formal long title for page headers & breadcrumbs
  route: string;
  iconName: string;
  section: NavSection;
  navigationLevel: NavLevel;
  parentNavId?: string; // Group ID or Parent Item ID
  showInSidebar: boolean;
  requiredAnyPermissions?: string[];
  requiredAllPermissions?: string[];
  featureFlag?: string;
  scopeRequirement?: "GLOBAL" | "ORGANIZATION" | "DISTRICT" | "PROJECT";
  ordering: number;
  breadcrumbMetadata?: {
    title: string;
    parentRoute?: string;
  };
}

export interface NavGroupDef {
  id: string;
  label: string;
  iconName: string;
  section: NavSection;
  ordering: number;
  childIds: string[];
}

export const NAVIGATION_GROUPS: NavGroupDef[] = [
  {
    id: "group-applications",
    label: "Applications",
    iconName: "FileText",
    section: "Applications",
    ordering: 20,
    childIds: ["enquiries", "pitches", "meetings", "track-pitch", "interests", "assessments", "marketplace"]
  },
  {
    id: "group-projects",
    label: "Projects",
    iconName: "Briefcase",
    section: "Projects",
    ordering: 30,
    childIds: ["convergence-projects", "assignments", "milestones", "inspections", "handover"]
  },
  {
    id: "group-organizations",
    label: "Organizations",
    iconName: "Building2",
    section: "Organizations",
    ordering: 40,
    childIds: ["organizations", "companies", "ngo-registry", "organization-onboarding", "sub-logins"]
  },
  {
    id: "group-finance",
    label: "Finance & Monitoring",
    iconName: "DollarSign",
    section: "Finance and Monitoring",
    ordering: 50,
    childIds: ["fund-releases", "reports", "audit-logs"]
  },
  {
    id: "group-administration",
    label: "Administration",
    iconName: "Shield",
    section: "Administration",
    ordering: 60,
    childIds: ["user-management", "access-control", "onboarding-approvals", "sla-config"]
  },
  {
    id: "group-help",
    label: "Help & Support",
    iconName: "HelpCircle",
    section: "Help and Support",
    ordering: 70,
    childIds: ["helpdesk", "grievances"]
  }
];

export const NAVIGATION_MANIFEST: NavItemDef[] = [
  // Overview
  {
    id: "dashboard",
    label: "Dashboard",
    formalTitle: "Executive CSR Dashboard",
    route: "/dashboard",
    iconName: "LayoutDashboard",
    section: "Overview",
    navigationLevel: "PRIMARY",
    showInSidebar: true,
    requiredAnyPermissions: ["dashboard:view", "project:view", "pitch:view", "enquiry:view", "user:view"],
    ordering: 10,
    breadcrumbMetadata: { title: "Dashboard" }
  },
  {
    id: "profile",
    label: "Profile",
    formalTitle: "User Profile Settings",
    route: "/profile",
    iconName: "User",
    section: "Overview",
    navigationLevel: "HIDDEN",
    showInSidebar: false,
    ordering: 20,
    breadcrumbMetadata: { title: "User Profile", parentRoute: "/dashboard" }
  },
  {
    id: "settings",
    label: "Settings",
    formalTitle: "Account Settings",
    route: "/settings",
    iconName: "Settings",
    section: "Overview",
    navigationLevel: "HIDDEN",
    showInSidebar: false,
    ordering: 30,
    breadcrumbMetadata: { title: "Account Settings", parentRoute: "/dashboard" }
  },
  {
    id: "notifications",
    label: "Notifications",
    formalTitle: "System Notifications",
    route: "/notifications",
    iconName: "Bell",
    section: "Overview",
    navigationLevel: "HIDDEN",
    showInSidebar: false,
    ordering: 40,
    breadcrumbMetadata: { title: "Notifications", parentRoute: "/dashboard" }
  },
  {
    id: "chat",
    label: "Messages",
    formalTitle: "Secure Communications & Messages",
    route: "/chat",
    iconName: "MessageSquare",
    section: "Overview",
    navigationLevel: "PRIMARY",
    showInSidebar: true,
    ordering: 50,
    breadcrumbMetadata: { title: "Messages & Chat", parentRoute: "/dashboard" }
  },

  // Applications Group Items
  {
    id: "enquiries",
    label: "Enquiries",
    formalTitle: "Corporate Enquiries",
    route: "/enquiries",
    iconName: "FileText",
    section: "Applications",
    navigationLevel: "CHILD",
    parentNavId: "group-applications",
    showInSidebar: true,
    requiredAnyPermissions: ["enquiry:view", "enquiry:create", "enquiry:respond"],
    ordering: 10,
    breadcrumbMetadata: { title: "Corporate Enquiries", parentRoute: "/dashboard" }
  },
  {
    id: "partner-enquiries",
    label: "Submit Corporate Enquiry",
    formalTitle: "Submit Corporate Enquiry",
    route: "/partner/enquiries",
    iconName: "FileText",
    section: "Applications",
    navigationLevel: "HIDDEN",
    showInSidebar: false,
    requiredAnyPermissions: ["enquiry:view", "enquiry:create", "enquiry:respond"],
    ordering: 11,
    breadcrumbMetadata: { title: "Submit Corporate Enquiry", parentRoute: "/dashboard" }
  },
  {
    id: "partner-workspace",
    label: "Partner Workspace",
    formalTitle: "Partner Workspace",
    route: "/partner",
    iconName: "Handshake",
    section: "Applications",
    navigationLevel: "HIDDEN",
    showInSidebar: false,
    requiredAnyPermissions: ["enquiry:view", "enquiry:create", "enquiry:respond"],
    ordering: 12,
    breadcrumbMetadata: { title: "Partner Workspace", parentRoute: "/dashboard" }
  },
  {
    id: "pitches",
    label: "Pitches",
    formalTitle: "Government Pitches",
    route: "/pitches",
    iconName: "Send",
    section: "Applications",
    navigationLevel: "CHILD",
    parentNavId: "group-applications",
    showInSidebar: true,
    requiredAnyPermissions: ["pitch:view", "pitch:create", "pitch:verify", "pitch:approve", "pitch:assign"],
    ordering: 20,
    breadcrumbMetadata: { title: "Government Pitches", parentRoute: "/dashboard" }
  },
  {
    id: "track-pitch",
    label: "Track Application",
    formalTitle: "Track Application Status",
    route: "/track",
    iconName: "Search",
    section: "Applications",
    navigationLevel: "CHILD",
    parentNavId: "group-applications",
    showInSidebar: true,
    requiredAnyPermissions: ["pitch:view", "pitch:create", "dashboard:view", "enquiry:view"],
    ordering: 25,
    breadcrumbMetadata: { title: "Track Application", parentRoute: "/dashboard" }
  },
  {
    id: "interests",
    label: "Interests",
    formalTitle: "Corporate Interests",
    route: "/interests",
    iconName: "Heart",
    section: "Applications",
    navigationLevel: "CHILD",
    parentNavId: "group-applications",
    showInSidebar: true,
    requiredAnyPermissions: ["interest:view", "interest:express", "interest:create"],
    ordering: 30,
    breadcrumbMetadata: { title: "Corporate Interests", parentRoute: "/dashboard" }
  },

  {
    id: "marketplace",
    label: "Marketplace",
    formalTitle: "CSR Marketplace",
    route: "/marketplace",
    iconName: "Store",
    section: "Applications",
    navigationLevel: "CHILD",
    parentNavId: "group-applications",
    showInSidebar: true,
    requiredAnyPermissions: ["pitch:view", "project:view"],
    ordering: 60,
    breadcrumbMetadata: { title: "CSR Marketplace", parentRoute: "/dashboard" }
  },
  {
    id: "interactions",
    label: "Interactions",
    formalTitle: "Case Interaction Logs & Call Notes",
    route: "/interactions",
    iconName: "PhoneCall",
    section: "Applications",
    navigationLevel: "HIDDEN",
    showInSidebar: false,
    requiredAnyPermissions: ["enquiry:view", "pitch:view", "project:view", "dashboard:view"],
    ordering: 70,
    breadcrumbMetadata: { title: "Interactions & Notes", parentRoute: "/dashboard" }
  },
  {
    id: "work-queue",
    label: "Work Queue",
    formalTitle: "Relationship Manager Work Queue",
    route: "/work-queue",
    iconName: "CheckSquare",
    section: "Applications",
    navigationLevel: "HIDDEN",
    showInSidebar: false,
    requiredAnyPermissions: ["enquiry:view", "pitch:view", "project:view", "dashboard:view"],
    ordering: 80,
    breadcrumbMetadata: { title: "Work Queue", parentRoute: "/dashboard" }
  },
  {
    id: "tasks",
    label: "Tasks",
    formalTitle: "Action Tasks & Reminders",
    route: "/tasks",
    iconName: "ListTodo",
    section: "Applications",
    navigationLevel: "HIDDEN",
    showInSidebar: false,
    requiredAnyPermissions: ["enquiry:view", "pitch:view", "project:view", "dashboard:view"],
    ordering: 90,
    breadcrumbMetadata: { title: "Tasks", parentRoute: "/dashboard" }
  },
  {
    id: "meetings",
    label: "Meetings",
    formalTitle: "Stakeholder Meetings & Calls",
    route: "/meetings",
    iconName: "Calendar",
    section: "Applications",
    navigationLevel: "CHILD",
    parentNavId: "group-applications",
    showInSidebar: true,
    requiredAnyPermissions: ["meeting:schedule"],
    ordering: 45,
    breadcrumbMetadata: { title: "Meetings", parentRoute: "/dashboard" }
  },
  {
    id: "funds",
    label: "Funds",
    formalTitle: "Funds & Disbursements",
    route: "/funds",
    iconName: "DollarSign",
    section: "Finance and Monitoring",
    navigationLevel: "HIDDEN",
    showInSidebar: false,
    requiredAnyPermissions: ["payment:view", "fund:view", "dashboard:view"],
    ordering: 110,
    breadcrumbMetadata: { title: "Funds", parentRoute: "/dashboard" }
  },
  {
    id: "evidence",
    label: "Evidence",
    formalTitle: "Project Evidence & Documentation",
    route: "/evidence",
    iconName: "FileCheck",
    section: "Projects",
    navigationLevel: "HIDDEN",
    showInSidebar: false,
    requiredAnyPermissions: ["project:view", "dashboard:view"],
    ordering: 120,
    breadcrumbMetadata: { title: "Evidence", parentRoute: "/convergence-projects" }
  },
  {
    id: "field-visits",
    label: "Field Visits",
    formalTitle: "Site Inspections & Field Visits",
    route: "/field-visits",
    iconName: "MapPin",
    section: "Projects",
    navigationLevel: "HIDDEN",
    showInSidebar: false,
    requiredAnyPermissions: ["project:view", "dashboard:view"],
    ordering: 130,
    breadcrumbMetadata: { title: "Field Visits", parentRoute: "/convergence-projects" }
  },
  {
    id: "issues",
    label: "Issues",
    formalTitle: "Escalated Issues & Bottlenecks",
    route: "/issues",
    iconName: "AlertTriangle",
    section: "Help and Support",
    navigationLevel: "HIDDEN",
    showInSidebar: false,
    requiredAnyPermissions: ["grievance:view", "project:view", "dashboard:view"],
    ordering: 140,
    breadcrumbMetadata: { title: "Issues", parentRoute: "/dashboard" }
  },
  {
    id: "oversight",
    label: "Oversight",
    formalTitle: "Government Oversight & Reviews",
    route: "/oversight",
    iconName: "Eye",
    section: "Administration",
    navigationLevel: "HIDDEN",
    showInSidebar: false,
    requiredAnyPermissions: ["dashboard:view", "user:view", "project:view"],
    ordering: 150,
    breadcrumbMetadata: { title: "Oversight", parentRoute: "/dashboard" }
  },
  {
    id: "strategy",
    label: "Strategy",
    formalTitle: "CSR Strategic Priorities",
    route: "/strategy",
    iconName: "Compass",
    section: "Overview",
    navigationLevel: "HIDDEN",
    showInSidebar: false,
    requiredAnyPermissions: ["dashboard:view", "project:view"],
    ordering: 160,
    breadcrumbMetadata: { title: "Strategy", parentRoute: "/dashboard" }
  },

  // Projects Group Items
  {
    id: "convergence-projects",
    label: "Projects",
    formalTitle: "Projects Overview",
    route: "/convergence-projects",
    iconName: "Briefcase",
    section: "Projects",
    navigationLevel: "CHILD",
    parentNavId: "group-projects",
    showInSidebar: true,
    requiredAnyPermissions: ["project:view", "project:create", "project:update", "project:approve", "project:assign"],
    ordering: 10,
    breadcrumbMetadata: { title: "Projects", parentRoute: "/dashboard" }
  },
  {
    id: "assignments",
    label: "Assignments",
    formalTitle: "Project Assignments",
    route: "/assignments",
    iconName: "UserCheck",
    section: "Projects",
    navigationLevel: "CHILD",
    parentNavId: "group-projects",
    showInSidebar: true,
    requiredAnyPermissions: ["project:assign", "pitch:assign", "user:assign-role", "project:view"],
    ordering: 20,
    breadcrumbMetadata: { title: "Assignments", parentRoute: "/convergence-projects" }
  },
  // Assignment Workspace Tabs (Hidden in Sidebar)
  {
    id: "dnc-queue",
    label: "DNC Delegation",
    formalTitle: "DNC Delegation Queue",
    route: "/assignments/dnc",
    iconName: "ShieldCheck",
    section: "Projects",
    navigationLevel: "WORKSPACE_TAB",
    parentNavId: "assignments",
    showInSidebar: false,
    requiredAnyPermissions: ["project:view", "project:assign"],
    ordering: 25,
    breadcrumbMetadata: { title: "DNC Delegation Queue", parentRoute: "/assignments" }
  },
  {
    id: "gov-admin-queue",
    label: "Department Officer Assignment",
    formalTitle: "Department Officer Queue",
    route: "/assignments/gov-admin",
    iconName: "Building2",
    section: "Projects",
    navigationLevel: "WORKSPACE_TAB",
    parentNavId: "assignments",
    showInSidebar: false,
    requiredAnyPermissions: ["project:view", "project:assign"],
    ordering: 26,
    breadcrumbMetadata: { title: "Department Officer Queue", parentRoute: "/assignments" }
  },
  {
    id: "milestones",
    label: "Milestones",
    formalTitle: "Milestones Tracking",
    route: "/milestones",
    iconName: "Flag",
    section: "Projects",
    navigationLevel: "CHILD",
    parentNavId: "group-projects",
    showInSidebar: true,
    requiredAnyPermissions: ["milestone:update", "milestone:verify", "project:view"],
    ordering: 30,
    breadcrumbMetadata: { title: "Milestones", parentRoute: "/convergence-projects" }
  },
  {
    id: "inspections",
    label: "Inspections",
    formalTitle: "Field Inspections",
    route: "/inspections",
    iconName: "Search",
    section: "Projects",
    navigationLevel: "CHILD",
    parentNavId: "group-projects",
    showInSidebar: true,
    requiredAnyPermissions: ["inspection:create", "inspection:view"],
    ordering: 40,
    breadcrumbMetadata: { title: "Field Inspections", parentRoute: "/convergence-projects" }
  },
  {
    id: "handover",
    label: "Handover",
    formalTitle: "Project Handover",
    route: "/handover",
    iconName: "CheckCircle",
    section: "Projects",
    navigationLevel: "CHILD",
    parentNavId: "group-projects",
    showInSidebar: true,
    requiredAnyPermissions: ["project:close", "project:update", "project:view"],
    ordering: 50,
    breadcrumbMetadata: { title: "Project Handover", parentRoute: "/convergence-projects" }
  },

  // Organizations Group Items
  {
    id: "organizations",
    label: "Organizations",
    formalTitle: "Organizations Directory",
    route: "/admin/organizations",
    iconName: "Building2",
    section: "Organizations",
    navigationLevel: "CHILD",
    parentNavId: "group-organizations",
    showInSidebar: true,
    requiredAnyPermissions: ["organization:approve", "organization:view"],
    ordering: 10,
    breadcrumbMetadata: { title: "Organizations", parentRoute: "/dashboard" }
  },
  {
    id: "companies",
    label: "Companies",
    formalTitle: "Corporate Partners",
    route: "/admin/companies",
    iconName: "Building",
    section: "Organizations",
    navigationLevel: "CHILD",
    parentNavId: "group-organizations",
    showInSidebar: true,
    requiredAnyPermissions: ["organization:approve", "organization:view"],
    ordering: 20,
    breadcrumbMetadata: { title: "Corporate Partners", parentRoute: "/admin/organizations" }
  },
  {
    id: "ngo-registry",
    label: "Agencies",
    formalTitle: "Implementing Agencies",
    route: "/admin/ngo-registry",
    iconName: "Users",
    section: "Organizations",
    navigationLevel: "CHILD",
    parentNavId: "group-organizations",
    showInSidebar: true,
    requiredAnyPermissions: ["organization:approve", "organization:view"],
    ordering: 30,
    breadcrumbMetadata: { title: "Implementing Agencies", parentRoute: "/admin/organizations" }
  },
  {
    id: "organization-onboarding",
    label: "Onboarding Status",
    formalTitle: "Org Onboarding Status",
    route: "/organization/onboarding",
    iconName: "FileCheck",
    section: "Organizations",
    navigationLevel: "CHILD",
    parentNavId: "group-organizations",
    showInSidebar: true,
    requiredAnyPermissions: ["page:organization/onboarding:view"],
    ordering: 40,
    breadcrumbMetadata: { title: "Onboarding Status", parentRoute: "/dashboard" }
  },
  {
    id: "sub-logins",
    label: "Sub-Logins",
    formalTitle: "Sub-Logins Management",
    route: "/organization/sub-logins",
    iconName: "UserPlus",
    section: "Organizations",
    navigationLevel: "CHILD",
    parentNavId: "group-organizations",
    showInSidebar: true,
    requiredAnyPermissions: ["ngo_login:create", "company_profile:manage"],
    ordering: 50,
    breadcrumbMetadata: { title: "Sub-Logins", parentRoute: "/dashboard" }
  },

  // Finance and Monitoring Group Items
  {
    id: "fund-releases",
    label: "Fund Monitoring",
    formalTitle: "CSR Fund Monitoring",
    route: "/fund-releases",
    iconName: "DollarSign",
    section: "Finance and Monitoring",
    navigationLevel: "CHILD",
    parentNavId: "group-finance",
    showInSidebar: true,
    requiredAnyPermissions: ["fund:view", "fund:commit", "fund:release", "fund:verify"],
    ordering: 10,
    breadcrumbMetadata: { title: "Fund Monitoring", parentRoute: "/dashboard" }
  },
  {
    id: "reports",
    label: "Reports",
    formalTitle: "Analytics & Reports",
    route: "/reports",
    iconName: "BarChart3",
    section: "Finance and Monitoring",
    navigationLevel: "CHILD",
    parentNavId: "group-finance",
    showInSidebar: true,
    requiredAnyPermissions: ["report:view", "report:generate", "report:export"],
    ordering: 20,
    breadcrumbMetadata: { title: "Reports", parentRoute: "/dashboard" }
  },
  {
    id: "audit-logs",
    label: "Audit Trail",
    formalTitle: "Audit Trail",
    route: "/audit-logs",
    iconName: "ShieldAlert",
    section: "Finance and Monitoring",
    navigationLevel: "CHILD",
    parentNavId: "group-finance",
    showInSidebar: true,
    requiredAnyPermissions: ["user:view", "audit:view", "role:view"],
    ordering: 30,
    breadcrumbMetadata: { title: "Audit Trail", parentRoute: "/dashboard" }
  },

  // Administration Group Items
  {
    id: "user-management",
    label: "User Management",
    formalTitle: "User Management",
    route: "/admin/user-management",
    iconName: "UserCog",
    section: "Administration",
    navigationLevel: "CHILD",
    parentNavId: "group-administration",
    showInSidebar: true,
    requiredAnyPermissions: ["user:view", "user:create", "user:update", "user:assign-role"],
    ordering: 10,
    breadcrumbMetadata: { title: "User Management", parentRoute: "/dashboard" }
  },
  {
    id: "access-control",
    label: "Access Control",
    formalTitle: "Access Control",
    route: "/admin/access-control/roles",
    iconName: "Shield",
    section: "Administration",
    navigationLevel: "CHILD",
    parentNavId: "group-administration",
    showInSidebar: true,
    requiredAnyPermissions: ["role:view", "role:create", "role:configure", "user:view", "user:assign-role"],
    ordering: 20,
    breadcrumbMetadata: { title: "Access Control", parentRoute: "/dashboard" }
  },
  // Access Control Workspace Tabs (Hidden in Sidebar)
  {
    id: "access-control-roles",
    label: "Roles",
    formalTitle: "Role Management",
    route: "/admin/access-control/roles",
    iconName: "ShieldCheck",
    section: "Administration",
    navigationLevel: "WORKSPACE_TAB",
    parentNavId: "access-control",
    showInSidebar: false,
    requiredAnyPermissions: ["role:view", "role:create", "role:configure"],
    ordering: 21,
    breadcrumbMetadata: { title: "Role Management", parentRoute: "/admin/access-control" }
  },
  {
    id: "access-control-permissions",
    label: "Permissions",
    formalTitle: "Permissions Catalog",
    route: "/admin/access-control/permissions",
    iconName: "Key",
    section: "Administration",
    navigationLevel: "WORKSPACE_TAB",
    parentNavId: "access-control",
    showInSidebar: false,
    requiredAnyPermissions: ["role:view"],
    ordering: 22,
    breadcrumbMetadata: { title: "Permissions Catalog", parentRoute: "/admin/access-control" }
  },
  {
    id: "access-control-assignments",
    label: "Role Assignments",
    formalTitle: "Role Assignments",
    route: "/admin/access-control/assignments",
    iconName: "Users",
    section: "Administration",
    navigationLevel: "WORKSPACE_TAB",
    parentNavId: "access-control",
    showInSidebar: false,
    requiredAnyPermissions: ["user:view", "user:assign-role"],
    ordering: 23,
    breadcrumbMetadata: { title: "Role Assignments", parentRoute: "/admin/access-control" }
  },
  {
    id: "access-control-audit",
    label: "Audit History",
    formalTitle: "Access Control Audit",
    route: "/admin/access-control/audit",
    iconName: "Activity",
    section: "Administration",
    navigationLevel: "WORKSPACE_TAB",
    parentNavId: "access-control",
    showInSidebar: false,
    requiredAnyPermissions: ["user:view", "role:view"],
    ordering: 24,
    breadcrumbMetadata: { title: "Access Control Audit", parentRoute: "/admin/access-control" }
  },
  {
    id: "onboarding-approvals",
    label: "Onboarding Approvals",
    formalTitle: "Onboarding Approvals Queue",
    route: "/admin/onboarding-approvals",
    iconName: "CheckSquare",
    section: "Administration",
    navigationLevel: "CHILD",
    parentNavId: "group-administration",
    showInSidebar: true,
    requiredAnyPermissions: ["organization:approve", "organization:reject"],
    ordering: 30,
    breadcrumbMetadata: { title: "Onboarding Approvals", parentRoute: "/dashboard" }
  },
  {
    id: "sla-config",
    label: "SLA Configuration",
    formalTitle: "SLA & Escalation Rules",
    route: "/admin/sla-config",
    iconName: "Sliders",
    section: "Administration",
    navigationLevel: "CHILD",
    parentNavId: "group-administration",
    showInSidebar: true,
    requiredAnyPermissions: ["page:sla-config:view", "sla:configure"],
    ordering: 40,
    breadcrumbMetadata: { title: "SLA Configuration", parentRoute: "/dashboard" }
  },

  // Help & Support Group Items
  {
    id: "helpdesk",
    label: "Helpdesk",
    formalTitle: "Helpdesk & Support",
    route: "/helpdesk",
    iconName: "HelpCircle",
    section: "Help and Support",
    navigationLevel: "CHILD",
    parentNavId: "group-help",
    showInSidebar: true,
    requiredAnyPermissions: ["helpdesk:view", "query:respond", "dashboard:view"],
    ordering: 10,
    breadcrumbMetadata: { title: "Helpdesk", parentRoute: "/dashboard" }
  },
  {
    id: "grievances",
    label: "Grievances",
    formalTitle: "Grievance Redressal Portal",
    route: "/grievances",
    iconName: "AlertTriangle",
    section: "Help and Support",
    navigationLevel: "CHILD",
    parentNavId: "group-help",
    showInSidebar: true,
    requiredAnyPermissions: ["dashboard:view", "project:view", "project:assign", "project:approve", "grievance:view", "grievance:resolve"],
    ordering: 20,
    breadcrumbMetadata: { title: "Grievances", parentRoute: "/dashboard" }
  }
];

export function isInternalAuthorityUser(roles?: string[] | string | null, isSuperAdmin?: boolean): boolean {
  if (isSuperAdmin) return true;
  let activeRoles: string[] = [];
  if (Array.isArray(roles)) {
    activeRoles = roles;
  } else if (typeof roles === "string" && roles) {
    activeRoles = [roles];
  } else if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.role) activeRoles.push(parsed.role);
        if (parsed?.roleSlug) activeRoles.push(parsed.roleSlug);
      }
    } catch {
      // ignore
    }
  }

  const normalized = activeRoles.map((r) => String(r).toUpperCase());
  return normalized.some((r) =>
    r.includes("SUPER_ADMIN") ||
    r.includes("PLANNING_SECRETARY") ||
    r.includes("JOINT_SECRETARY") ||
    r.includes("CSR_RELATIONSHIP_MANAGER") ||
    r.includes("RELATIONSHIP_MANAGER") ||
    r.includes("STATE_CSR_CELL") ||
    r.includes("DISTRICT_NODAL") ||
    r.includes("PORTAL_ADMIN") ||
    r.includes("CSR_ADMIN") ||
    r === "ROLE_1" ||
    r === "ROLE_2" ||
    r === "ROLE_3" ||
    r === "ROLE_4" ||
    r === "ROLE_5" ||
    r === "ROLE_6" ||
    r === "ROLE_7" ||
    r === "RM" ||
    r === "JS"
  );
}

export function getNavItemForRoute(pathname: string): NavItemDef | undefined {
  let matched: NavItemDef | undefined;
  for (const item of NAVIGATION_MANIFEST) {
    if (pathname === item.route || pathname.startsWith(item.route + "/")) {
      if (!matched || item.route.length > matched.route.length) {
        matched = item;
      }
    }
  }
  if (!matched && pathname.startsWith("/organization/onboarding")) {
    matched = NAVIGATION_MANIFEST.find((i) => i.id === "organization-onboarding");
  }
  return matched;
}

export function isRmUser(roles?: string[] | string | null): boolean {
  let activeRoles: string[] = [];
  if (Array.isArray(roles)) {
    activeRoles = roles;
  } else if (typeof roles === "string" && roles) {
    activeRoles = [roles];
  } else if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.role) activeRoles.push(parsed.role);
        if (parsed?.roleSlug) activeRoles.push(parsed.roleSlug);
      }
    } catch {
      // ignore
    }
  }

  const normalized = activeRoles.map((r) => String(r).toUpperCase());
  return normalized.some((r) =>
    r.includes("RELATIONSHIP_MANAGER") ||
    r.includes("CSR_RELATIONSHIP_MANAGER") ||
    r === "ROLE_6" ||
    r === "SYSTEM_ROLE_6" ||
    r === "6" ||
    r === "RM"
  );
}

export function isNavItemAllowed(
  item: NavItemDef,
  hasPermission: (perm: string) => boolean,
  isSuperAdmin: boolean,
  userRoles?: string[] | string | null
): boolean {
  const isInternalAuthority = isInternalAuthorityUser(userRoles, isSuperAdmin);
  const isRm = isRmUser(userRoles);

  if (item.id === "organization-onboarding") {
    if (isInternalAuthority) return false;
  }

  if (item.id === "sub-logins") {
    if (isInternalAuthority) return false;
  }

  // Relationship Managers have no permission to view or access the administrative onboarding approvals queue
  if (item.id === "onboarding-approvals" && isRm) {
    return false;
  }

  // Stakeholder Alignment Meetings dashboard is exclusively designated for Relationship Managers,
  // the State CSR Coordination Cell / Internal Authorities, and Portal Administrators / Super Admin.
  if (item.id === "meetings") {
    const isMeetingAllowed = isSuperAdmin || isInternalAuthority || isRm || hasPermission("meeting:schedule");
    if (!isMeetingAllowed) {
      return false;
    }
    return true;
  }

  if (isSuperAdmin) return true;

  if (item.requiredAllPermissions && item.requiredAllPermissions.length > 0) {
    const hasAll = item.requiredAllPermissions.every((p) => hasPermission(p));
    if (!hasAll) return false;
  }

  if (item.requiredAnyPermissions && item.requiredAnyPermissions.length > 0) {
    const hasAny = item.requiredAnyPermissions.some((p) => hasPermission(p));
    if (!hasAny) return false;
  }

  return true;
}

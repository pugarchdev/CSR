export const PAGE_REGISTRY = [
  // Shared
  ["dashboard", "Dashboard", "/dashboard", "General"],
  ["profile", "Profile", "/profile", "General"],
  ["settings", "Settings", "/settings", "General"],
  ["notifications", "Notifications", "/notifications", "General"],
  ["reports", "Reports", "/reports", "General"],
  ["audit-trail", "Audit Trail", "/audit-logs", "General"],

  // Admin / platform administration
  ["user-management", "User Management", "/admin/user-management", "Administration"],
  ["roles-permissions", "Roles & Permissions", "/admin/roles-permissions", "Administration"],
  ["onboarding-approvals", "Onboarding Approvals", "/admin/onboarding-approvals", "Administration"],
  ["organizations", "Organizations", "/admin/organizations", "Administration"],
  ["companies", "Companies", "/admin/companies", "Administration"],
  ["ngo-registry", "Implementing Agencies", "/admin/ngo-registry", "Administration"],
  ["sla-config", "SLA Configuration", "/admin/sla-config", "Administration"],

  // Workflow / applications
  ["enquiries", "Corporate Enquiries", "/enquiries", "Workflow"],
  ["pitches", "Government Pitches", "/pitches", "Workflow"],
  ["interests", "Corporate Interests", "/interests", "Workflow"],
  ["assessments", "Feasibility Assessments", "/assessments", "Workflow"],
  ["assignments", "Assignments", "/assignments", "Workflow"],
  ["convergence-projects", "Projects", "/convergence-projects", "Workflow"],
  ["milestones", "Milestones", "/milestones", "Workflow"],
  ["funds", "Fund Monitoring", "/fund-releases", "Workflow"],
  ["handover", "Handover", "/handover", "Workflow"],
  ["inspections", "Inspections", "/inspections", "Workflow"],
  ["escalations", "Escalations", "/escalations", "Workflow"],
  ["decisions", "Decisions", "/decisions", "Workflow"],
  ["nodal-appointments", "Nodal Appointments", "/nodal-appointments", "Workflow"],
  ["helpdesk", "Helpdesk", "/helpdesk", "Workflow"],
  ["grievances", "Grievances", "/grievances", "Workflow"],
  ["requirements", "Requirements", "/requirements", "Workflow"],
  ["marketplace", "Marketplace", "/marketplace", "Workflow"],
  ["agencies", "Implementing Agencies", "/agencies", "Workflow"],

  // Organization self-service
  ["organization/onboarding", "Organization Onboarding", "/organization/onboarding", "Organization"],
  ["sub-logins", "Implementing Agency Logins", "/organization/sub-logins", "Organization"],
] as const;

/**
 * Complete Enterprise Role-Based Access Control Catalog for Maharashtra CSR Portal.
 * Each tuple: [key, description, module]
 */
export const PERMISSIONS = [
  // ── Dashboard ──
  ["dashboard:view", "View dashboard", "dashboard"],
  ["dashboard:widget-kpis", "See headline KPI cards on the dashboard", "dashboard"],
  ["dashboard:widget-workqueue", "See the personal work-queue widget", "dashboard"],
  ["dashboard:widget-sla", "See SLA / escalation timers on the dashboard", "dashboard"],
  ["dashboard:widget-approvals", "See the pending-approvals widget", "dashboard"],
  ["dashboard:widget-charts", "See analytics charts on the dashboard", "dashboard"],
  ["dashboard:widget-activity", "See the recent-activity feed on the dashboard", "dashboard"],
  ["dashboard:widget-quick-actions", "See quick-action shortcuts on the dashboard", "dashboard"],
  ["dashboard:analytics-global", "See platform-wide (unscoped) analytics on the dashboard", "dashboard"],

  // ── Requirements & Pitches ──
  ["requirement:view", "View CSR requirements", "requirements"],
  ["requirement:create", "Create department CSR requirements", "requirements"],
  ["requirement:update", "Update CSR requirements", "requirements"],
  ["requirement:delete", "Delete requirements", "requirements"],
  ["requirement:submit", "Submit requirements for approval", "requirements"],
  ["requirement:approve", "Approve requirements", "requirements"],
  ["requirement:publish", "Publish requirements", "requirements"],
  ["requirement:assign", "Assign requirements to officers", "requirements"],
  ["requirement:export", "Export requirements data", "requirements"],

  ["pitch:view", "View government pitches", "pitches"],
  ["pitch:create", "Create government development pitches", "pitches"],
  ["pitch:edit_before_approval", "Edit pitch before final approval", "pitches"],
  ["pitch:submit", "Submit pitch for review", "pitches"],
  ["pitch:approve", "Approve government pitches", "pitches"],
  ["pitch:reject", "Reject government pitches", "pitches"],
  ["pitch:verify", "Verify government pitches", "pitches"],

  // ── Need Assessments & Feasibility ──
  ["assessment:view", "View feasibility assessments", "assessments"],
  ["assessment:create", "Create need assessment report", "assessments"],
  ["assessment:update", "Update need assessment report", "assessments"],
  ["assessment:submit", "Submit assessment report to JS", "assessments"],
  ["assessment:review", "Review RM assessment report", "assessments"],

  // ── Marketplace & Interests ──
  ["marketplace:view", "View CSR marketplace", "marketplace"],
  ["marketplace:create", "Create marketplace listings", "marketplace"],
  ["marketplace:update", "Update marketplace listings", "marketplace"],

  ["interest:view", "View company expressions of interest", "interests"],
  ["interest:create", "Create company interest", "interests"],
  ["interest:express", "Express corporate interest in project", "interests"],
  ["interest:update", "Update company interest", "interests"],
  ["interest:delete", "Delete company interest", "interests"],
  ["interest:approve", "Approve company interests", "interests"],
  ["interest:export", "Export interests data", "interests"],

  // ── Projects & Milestones ──
  ["project:view", "View CSR projects", "projects"],
  ["project:view_assigned", "View assigned projects", "projects"],
  ["project:view_district", "View district projects", "projects"],
  ["project:create", "Create CSR projects", "projects"],
  ["project:update", "Update CSR projects", "projects"],
  ["project:delete", "Delete CSR projects", "projects"],
  ["project:approve", "Approve CSR projects", "projects"],
  ["project:reject", "Reject CSR projects", "projects"],
  ["project:record_rejection_reason", "Record project rejection reason", "projects"],
  ["project:assign", "Assign officers to approved projects", "projects"],
  ["project:recommend", "Recommend project for JS approval", "projects"],
  ["project:recommend_rejection", "Recommend project rejection", "projects"],
  ["project:close", "Close completed CSR projects", "projects"],
  ["project:export", "Export projects data", "projects"],

  ["milestone:view", "View milestones", "milestones"],
  ["milestone:create", "Create milestones", "milestones"],
  ["milestone:update", "Update milestones", "milestones"],
  ["milestone:edit", "Edit milestone deliverables", "milestones"],
  ["milestone:verify", "Verify milestone progress", "milestones"],
  ["deliverable_change:approve", "Approve milestone deliverable changes", "milestones"],
  ["progress:verify", "Verify field progress", "milestones"],

  // ── Inspections & Field Verification ──
  ["inspection:upload", "Upload field inspection reports", "inspections"],
  ["photo:upload", "Upload inspection photos", "inspections"],
  ["photo:upload_geotagged", "Upload geo-tagged inspection photos", "inspections"],
  ["site_visit:submit", "Submit site visit logs", "inspections"],
  ["completion:recommend", "Recommend project completion", "inspections"],
  ["completion:approve", "Approve project completion", "inspections"],
  ["issue:raise", "Raise field implementation issues", "inspections"],

  // ── Funds & Utilization Certificates ──
  ["fund:view", "View funds", "funds"],
  ["fund:create", "Create fund entries", "funds"],
  ["fund:update", "Update fund entries", "funds"],
  ["fund:delete", "Delete fund entries", "funds"],
  ["fund:commit", "Commit corporate funds", "funds"],
  ["fund:release", "Release funds to implementing agency", "funds"],
  ["fund:verify-utilization", "Verify fund utilization", "funds"],
  ["bill:upload", "Upload expenditure bills and receipts", "funds"],
  ["uc:upload", "Upload Utilization Certificate (UC)", "funds"],
  ["fund:export", "Export funds data", "funds"],

  // ── Reports & Analytics ──
  ["report:view", "View reports", "reports"],
  ["report:view_district", "View district level reports", "reports"],
  ["report:generate", "Generate analytical reports", "reports"],
  ["report:create", "Create reports", "reports"],
  ["report:export", "Export reports data", "reports"],

  // ── Organizations & Onboarding Approvals ──
  ["organization:view", "View organizations", "organization"],
  ["organization:create", "Create organizations", "organization"],
  ["organization:update", "Update organizations", "organization"],
  ["organization:delete", "Delete organizations", "organization"],
  ["organization:approve", "Approve organization onboarding (Company, Govt Dept, NGO)", "organization"],
  ["organization:suspend", "Suspend organization accounts", "organization"],
  ["company_profile:manage", "Manage corporate profile & KYC", "organization"],

  // ── Users & Dynamic RBAC ──
  ["user:view", "View users", "users"],
  ["user:create", "Create users", "users"],
  ["user:invite", "Invite organization users", "users"],
  ["user:update", "Update organization users", "users"],
  ["user:delete", "Delete users", "users"],
  ["user:suspend", "Suspend user accounts", "users"],
  ["user:activate", "Activate user accounts", "users"],
  ["user:reset_password", "Reset user password", "users"],
  ["user:force_logout", "Force user logout", "users"],
  ["ngo_login:create", "Create sub-logins for implementing agencies", "users"],

  ["role:view", "View roles", "roles"],
  ["role:create", "Create dynamic roles", "roles"],
  ["role:update", "Edit dynamic roles", "roles"],
  ["role:delete", "Delete dynamic roles", "roles"],
  ["role:clone", "Clone existing roles", "roles"],
  ["role:configure", "Assign permissions matrix to roles", "roles"],
  ["company_role:assign", "Assign roles within company", "roles"],

  // ── Workflow & Escalation Governance ──
  ["workflow:view", "View workflow status and SLA", "workflow"],
  ["workflow:configure", "Configure workflow stages & auto-assignment", "workflow"],
  ["workflow:escalate", "Trigger workflow escalations", "workflow"],
  ["override:js_decision", "Override Joint Secretary decision", "workflow"],
  ["assign:joint_secretary", "Assign or reassign Joint Secretary", "workflow"],
  ["dno:assign", "Appoint District Nodal Officer to project", "workflow"],
  ["escalation:resolve", "Resolve escalated workflow issues", "workflow"],
  ["grievance:resolve", "Resolve project grievances", "workflow"],
  ["grievance:final_decision", "Make final grievance decision", "workflow"],

  // ── Meetings, Enquiries & Communication ──
  ["enquiry:view", "View corporate enquiries", "enquiries"],
  ["enquiry:create", "Create corporate enquiries", "enquiries"],
  ["enquiry:update", "Update corporate enquiries", "enquiries"],
  ["enquiry:assign", "Assign RM to corporate enquiry", "enquiries"],
  ["enquiry:respond", "Respond to corporate enquiry", "enquiries"],
  ["meeting:schedule", "Schedule corporate-department meetings", "enquiries"],
  ["followup:assign", "Assign follow-up tasks", "enquiries"],
  ["status:track", "Track pitch & project status", "enquiries"],
  ["query:respond", "Respond to operational queries", "enquiries"],
  ["mou:sign", "Sign Memorandum of Understanding (MoU)", "enquiries"],

  // ── Portal CMS & Content ──
  ["cms:manage", "Manage portal CMS content", "portal"],
  ["banners:manage", "Manage homepage banners", "portal"],
  ["events:manage", "Manage portal events", "portal"],
  ["success_stories:manage", "Manage success stories", "portal"],
  ["policies:manage", "Manage policy documents", "portal"],

  // ── Audit & System Monitoring ──
  ["audit:view", "View audit logs", "audit"],
  ["audit:export", "Export audit logs", "audit"],

  // ── Verification & Identity ──
  ["verification:execute", "Execute identity, GST, PAN & Aadhaar verification", "verification"],
  ["verification:reverify", "Re-verify identity, GST & PAN details", "verification"],
  ["verification:view-history", "View identity verification audit history", "verification"],
  ["verification:dashboard", "View identity verification dashboard metrics", "verification"],

  // ── Bulk Operations ──
  ["record:delete-single", "Delete a single record", "bulk-ops"],
  ["record:delete-bulk", "Delete multiple selected records", "bulk-ops"],
  ["record:import-excel", "Bulk import records from Excel/CSV", "bulk-ops"],
] as const;

export const pageViewKey = (slug: string) => `page:${slug}:view`;

export const PAGE_PERMISSIONS = PAGE_REGISTRY.map(
  ([slug, label]) => [pageViewKey(slug), `Access the ${label} page`, "pages"] as const
);

export const SYSTEM_ROLE_IDS = {
  SUPER_ADMIN: 1,
  PLANNING_SECRETARY: 2,
  JOINT_SECRETARY: 3,
  DISTRICT_NODAL_OFFICER: 4,
  DISTRICT_NODAL_CONSULTANT: 5,
  RELATIONSHIP_MANAGER: 6,
  GOVERNMENT_OFFICER: 7,
  COMPANY_ADMIN: 8,
  NGO_ADMIN: 9,
} as const;

/**
 * Protected Custom Role Templates mandated under static role families.
 * Stored as custom roles but with platform-protected, immutable keys.
 */
export const PROTECTED_CUSTOM_ROLE_TEMPLATES = {
  GOV_MAIN_ORG_HEAD: {
    key: "GOV_MAIN_ORG_HEAD",
    name: "Government Main Organization Head",
    parentSystemRoleId: 7,
    defaultScope: "ORGANIZATION_TREE",
    description: "Administrative Head of one main government organization (Collectorate, Zilla Parishad, Municipal Corporation) and permitted descendants"
  },
  GOV_SUB_DEPARTMENT_HEAD: {
    key: "GOV_SUB_DEPARTMENT_HEAD",
    name: "Government Sub-Department Head",
    parentSystemRoleId: 7,
    defaultScope: "SUB_DEPARTMENT",
    description: "Administrative Head of one approved sub-department"
  },
  STATE_NODAL_OFFICER: {
    key: "STATE_NODAL_OFFICER",
    name: "State Nodal Officer",
    parentSystemRoleId: 7,
    defaultScope: "ASSIGNED",
    description: "State CSR Cell coordinator for multi-district project execution"
  },
  COMPANY_PRIMARY_ADMIN: {
    key: "COMPANY_PRIMARY_ADMIN",
    name: "Company Admin",
    parentSystemRoleId: 8,
    defaultScope: "ORGANIZATION",
    description: "Primary Corporate CSR Administrator"
  },
  NGO_PRIMARY_ADMIN: {
    key: "NGO_PRIMARY_ADMIN",
    name: "NGO Admin",
    parentSystemRoleId: 9,
    defaultScope: "ORGANIZATION",
    description: "Primary NGO Administrator"
  }
} as const;

/**
 * Enterprise Permission Catalog Grants for all 9 System Roles.
 */
export const SEED_ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  // SUPER_ADMIN: Unrestricted access to everything
  SUPER_ADMIN: PERMISSIONS.map(([key]) => key),

  // 2. Planning Secretary: Highest decision authority after Super Admin
  PLANNING_SECRETARY: [
    "dashboard:view", "dashboard:widget-kpis", "dashboard:widget-approvals", "dashboard:widget-sla",
    "dashboard:widget-charts", "dashboard:widget-activity", "dashboard:widget-quick-actions",
    "dashboard:analytics-global",
    "pitch:view", "pitch:approve", "pitch:reject", "pitch:verify", "enquiry:view", "assessment:view", "assessment:review",
    "project:view", "organization:view", "requirement:view", "interest:view",
    "override:js_decision", "assign:joint_secretary", "escalation:resolve", "grievance:final_decision",
    "report:view", "report:export", "audit:view", "audit:export",
    "fund:view", "fund:release", "fund:verify-utilization", "fund:export",
    "verification:execute", "verification:reverify", "verification:view-history", "verification:dashboard",
  ],

  // 3. Joint Secretary: Operational approval authority
  JOINT_SECRETARY: [
    "dashboard:view", "dashboard:widget-kpis", "dashboard:widget-approvals", "dashboard:widget-sla",
    "dashboard:widget-workqueue", "dashboard:widget-charts", "dashboard:widget-activity",
    "pitch:view", "pitch:approve", "pitch:reject", "pitch:verify", "enquiry:view", "assessment:view", "assessment:review",
    "project:view", "project:approve", "project:reject", "project:record_rejection_reason",
    "dno:assign", "report:view_district", "organization:view", "organization:approve",
    "fund:view", "fund:release", "fund:export", "report:view", "report:export",
    "verification:execute", "verification:reverify", "verification:view-history", "verification:dashboard",
  ],

  // 4. CSR Relationship Manager: Operational SPOC
  RELATIONSHIP_MANAGER: [
    "dashboard:view", "dashboard:widget-kpis", "dashboard:widget-workqueue", "dashboard:widget-sla",
    "dashboard:widget-activity", "dashboard:widget-quick-actions",
    "enquiry:view", "enquiry:update", "enquiry:assign", "enquiry:respond", "enquiry:contact",
    "pitch:view", "pitch:verify", "assessment:view", "assessment:create", "assessment:update", "assessment:submit",
    "meeting:schedule", "followup:assign", "project:recommend", "project:recommend_rejection", "organization:view",
    "report:view",
    "verification:execute", "verification:reverify", "verification:view-history", "verification:dashboard",
  ],

  // 5. District Nodal Consultant: District field coordinator
  DISTRICT_NODAL_CONSULTANT: [
    "dashboard:view", "project:view_district", "organization:view", "requirement:view",
    "inspection:upload", "photo:upload", "site_visit:submit", "completion:recommend", "issue:raise",
    "report:view",
    "verification:execute", "verification:reverify", "verification:view-history",
  ],

  // 6. District Nodal Officer: Project-level appointed monitoring & MoU
  DISTRICT_NODAL_OFFICER: [
    "dashboard:view", "dashboard:widget-kpis", "dashboard:widget-workqueue", "dashboard:widget-sla",
    "project:view_assigned", "milestone:edit", "deliverable_change:approve", "progress:verify",
    "completion:approve", "grievance:resolve", "verification:upload", "report:generate", "mou:sign",
    "organization:view", "fund:view", "fund:verify-utilization", "report:view",
    "verification:execute", "verification:reverify", "verification:view-history",
  ],

  // 7. Government Officer: Department Admin
  GOVERNMENT_OFFICER: [
    "dashboard:view", "dashboard:widget-kpis", "dashboard:widget-workqueue",
    "user:view", "user:create", "user:update", "user:assign-role",
    "role:view", "role:create", "role:configure",
    "pitch:view", "pitch:create", "pitch:edit_before_approval", "photo:upload", "project:view_assigned",
    "status:track", "query:respond", "requirement:create", "requirement:view", "organization:view",
    "report:view",
    "verification:execute", "verification:reverify", "verification:view-history",
  ],

  // 7a. Government Main Organization Head (Protected template under GOVERNMENT_OFFICER)
  GOV_MAIN_ORG_HEAD: [
    "dashboard:view", "dashboard:widget-kpis", "dashboard:widget-workqueue",
    "user:view", "user:create", "user:update", "user:assign-role",
    "role:view", "role:create", "role:configure",
    "organization:view", "organization:create", "organization:update",
    "pitch:view", "pitch:create", "pitch:edit_before_approval", "photo:upload",
    "project:view_district", "project:view_assigned", "project:record_rejection_reason",
    "status:track", "query:respond", "requirement:create", "requirement:view",
    "report:view", "report:view_district", "report:generate",
    "verification:execute", "verification:reverify", "verification:view-history",
  ],

  // 7b. Government Sub-Department Head (Protected template under GOVERNMENT_OFFICER)
  GOV_SUB_DEPARTMENT_HEAD: [
    "dashboard:view", "dashboard:widget-kpis", "dashboard:widget-workqueue",
    "user:view", "user:create", "user:update",
    "role:view", "role:create",
    "organization:view",
    "pitch:view", "pitch:create", "pitch:edit_before_approval",
    "project:view_assigned", "milestone:view",
    "status:track", "query:respond",
    "report:view",
    "verification:execute", "verification:reverify", "verification:view-history",
  ],

  // 7c. State Nodal Officer (Protected template under GOVERNMENT_OFFICER)
  STATE_NODAL_OFFICER: [
    "dashboard:view", "dashboard:widget-kpis",
    "project:view", "project:view_assigned", "project:view_district",
    "milestone:view", "escalation:resolve",
    "report:view", "report:export",
    "verification:execute", "verification:view-history",
  ],

  // 8. Company Admin: Corporate CSR Head
  COMPANY_ADMIN: [
    "dashboard:view", "dashboard:widget-kpis", "dashboard:widget-workqueue",
    "user:view", "user:create", "user:update", "user:assign-role",
    "role:view", "role:create", "role:configure",
    "company_profile:manage", "company_role:assign", "enquiry:create", "interest:express",
    "mou:sign", "ngo_login:create", "project:view", "project:close", "fund:view", "fund:commit",
    "report:view",
    "verification:execute", "verification:reverify", "verification:view-history",
  ],
  COMPANY_PRIMARY_ADMIN: [
    "dashboard:view", "dashboard:widget-kpis", "dashboard:widget-workqueue",
    "user:view", "user:create", "user:update", "user:assign-role",
    "role:view", "role:create", "role:configure",
    "company_profile:manage", "company_role:assign", "enquiry:create", "interest:express",
    "mou:sign", "ngo_login:create", "project:view", "project:close", "fund:view", "fund:commit",
    "report:view",
    "verification:execute", "verification:reverify", "verification:view-history",
  ],

  // 9. NGO Admin: Implementing Agency
  NGO_ADMIN: [
    "dashboard:view", "dashboard:widget-kpis", "dashboard:widget-workqueue",
    "user:view", "user:create", "user:update", "user:assign-role",
    "project:view_assigned", "milestone:update", "photo:upload_geotagged", "bill:upload", "uc:upload",
    "issue:raise", "query:respond", "fund:view", "report:view",
    "verification:execute", "verification:reverify", "verification:view-history",
  ],
  NGO_PRIMARY_ADMIN: [
    "dashboard:view", "dashboard:widget-kpis", "dashboard:widget-workqueue",
    "user:view", "user:create", "user:update", "user:assign-role",
    "project:view_assigned", "milestone:update", "photo:upload_geotagged", "bill:upload", "uc:upload",
    "issue:raise", "query:respond", "fund:view", "report:view",
    "verification:execute", "verification:reverify", "verification:view-history",
  ],
};

/**
 * Enterprise Page Visibility grants per role.
 */
export const SEED_ROLE_PAGES: Record<string, readonly string[]> = {
  PLANNING_SECRETARY: [
    "dashboard", "profile", "reports", "audit-trail",
    "organizations", "companies", "ngo-registry", "convergence-projects", "milestones", "funds",
    "enquiries", "pitches", "feasibility", "escalations", "decisions", "grievances",
  ],
  JOINT_SECRETARY: [
    "dashboard", "profile", "reports",
    "organizations", "companies", "ngo-registry", "convergence-projects",
    "enquiries", "pitches", "feasibility", "nodal-appointments", "escalations", "funds",
  ],
  RELATIONSHIP_MANAGER: [
    "dashboard", "profile", "reports",
    "enquiries", "pitches", "interests", "assessments", "companies", "ngo-registry", "communications",
  ],
  DISTRICT_NODAL_CONSULTANT: [
    "dashboard", "profile", "reports",
    "convergence-projects", "requirements", "inspections",
  ],
  DISTRICT_NODAL_OFFICER: [
    "dashboard", "profile", "reports",
    "convergence-projects", "inspections", "ngo-registry", "handover", "grievances",
  ],
  GOVERNMENT_OFFICER: [
    "dashboard", "profile", "reports", "admin/user-management", "admin/access-control",
    "organization/onboarding", "pitches", "requirements", "interests", "convergence-projects", "handover",
  ],
  GOV_MAIN_ORG_HEAD: [
    "dashboard", "profile", "reports", "admin/user-management", "admin/access-control",
    "organization/onboarding", "pitches", "requirements", "convergence-projects", "escalations", "handover",
  ],
  GOV_SUB_DEPARTMENT_HEAD: [
    "dashboard", "profile", "reports", "admin/user-management", "admin/access-control",
    "pitches", "requirements", "convergence-projects", "milestones", "grievances",
  ],
  STATE_NODAL_OFFICER: [
    "dashboard", "profile", "reports",
    "convergence-projects", "assignments", "milestones", "escalations",
  ],
  COMPANY_ADMIN: [
    "dashboard", "profile", "reports", "admin/user-management", "admin/access-control",
    "organization/onboarding", "sub-logins", "enquiries", "marketplace", "interests", "agencies", "convergence-projects", "fund-releases",
  ],
  COMPANY_PRIMARY_ADMIN: [
    "dashboard", "profile", "reports", "admin/user-management", "admin/access-control",
    "organization/onboarding", "sub-logins", "enquiries", "marketplace", "interests", "agencies", "convergence-projects", "fund-releases",
  ],
  NGO_ADMIN: [
    "dashboard", "profile", "reports",
    "organization/onboarding", "proposal-requests", "convergence-projects", "milestones", "fund-releases",
  ],
  NGO_PRIMARY_ADMIN: [
    "dashboard", "profile", "reports",
    "organization/onboarding", "proposal-requests", "convergence-projects", "milestones", "fund-releases",
  ],
};

export const SEED_ROLE_BULK_OPS: Record<string, readonly string[]> = {
  PLANNING_SECRETARY: ["record:delete-single", "record:delete-bulk", "record:import-excel"],
  JOINT_SECRETARY: ["record:delete-single", "record:import-excel"],
  DISTRICT_NODAL_CONSULTANT: ["record:delete-single", "record:import-excel"],
  DISTRICT_NODAL_OFFICER: ["record:import-excel"],
  NGO_ADMIN: ["record:delete-single"],
  NGO_PRIMARY_ADMIN: ["record:delete-single"],
  COMPANY_ADMIN: ["record:delete-single", "record:import-excel"],
  COMPANY_PRIMARY_ADMIN: ["record:delete-single", "record:import-excel"],
  GOVERNMENT_OFFICER: ["record:delete-single", "record:import-excel"],
  GOV_MAIN_ORG_HEAD: ["record:delete-single", "record:import-excel"],
  GOV_SUB_DEPARTMENT_HEAD: ["record:delete-single"],
  STATE_NODAL_OFFICER: ["record:import-excel"],
};

export function resolveSeedRolePermissionKeys(permKey: string): string[] {
  if (permKey === "SUPER_ADMIN") {
    const allActions = PERMISSIONS.map(([key]) => key);
    const allPages = PAGE_PERMISSIONS.map(([key]) => key);
    return Array.from(new Set([...allActions, ...allPages, "*"]));
  }
  const actions = SEED_ROLE_PERMISSIONS[permKey] ?? [];
  const bulk = SEED_ROLE_BULK_OPS[permKey] ?? [];
  const pages = (SEED_ROLE_PAGES[permKey] ?? []).map((slug) => pageViewKey(slug));
  return Array.from(new Set([...actions, ...bulk, ...pages]));
}

/**
 * Validate that a proposed custom role's permissions do not exceed the static parent role ceiling.
 */
export function isPermissionInsideParentCeiling(parentRoleId: number, permissionKey: string): boolean {
  if (parentRoleId === 1) return true; // SUPER_ADMIN
  const systemRoleKey = Object.entries(SYSTEM_ROLE_IDS).find(([_, id]) => id === parentRoleId)?.[0];
  if (!systemRoleKey) return false;
  const parentCeiling = SEED_ROLE_PERMISSIONS[systemRoleKey] ?? [];
  return parentCeiling.includes(permissionKey);
}


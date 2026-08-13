/**
 * Authoritative Route Policy Registry for MahaCSR Platform.
 * Maps every API route to its classification, permission, scope, state transitions, and audit requirements.
 */

export type RouteClassification = "PUBLIC" | "AUTHENTICATED" | "PROTECTED";

export interface RoutePolicy {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  controller: string;
  classification: RouteClassification;
  permission?: string;
  scope?: "GLOBAL" | "ORGANIZATION" | "DISTRICT" | "PROJECT" | "ASSIGNED_RESOURCE";
  resourceLoader?: string;
  allowedWorkflowStates?: string[];
  auditRequired: boolean;
}

export const ROUTE_POLICY_REGISTRY: RoutePolicy[] = [
  // Authentication & OTP (Public & Auth)
  { method: "POST", path: "/api/auth/register", controller: "register", classification: "PUBLIC", auditRequired: true },
  { method: "POST", path: "/api/auth/login", controller: "login", classification: "PUBLIC", auditRequired: true },
  { method: "POST", path: "/api/auth/verify-otp", controller: "verifyOtp", classification: "PUBLIC", auditRequired: true },
  { method: "POST", path: "/api/auth/resend-otp", controller: "resendOtp", classification: "PUBLIC", auditRequired: false },
  { method: "POST", path: "/api/auth/refresh", controller: "refreshToken", classification: "PUBLIC", auditRequired: false },
  { method: "GET", path: "/api/auth/me", controller: "me", classification: "AUTHENTICATED", auditRequired: false },
  { method: "POST", path: "/api/auth/logout", controller: "logout", classification: "AUTHENTICATED", auditRequired: false },

  // Public Endpoints
  { method: "GET", path: "/api/public/requirements", controller: "getPublicRequirements", classification: "PUBLIC", auditRequired: false },
  { method: "GET", path: "/api/public/requirements/:id", controller: "getRequirementById", classification: "PUBLIC", auditRequired: false },
  { method: "GET", path: "/api/csr-requirements/:id", controller: "getRequirementById", classification: "PUBLIC", auditRequired: false },
  { method: "GET", path: "/api/public/stats", controller: "getPublicStats", classification: "PUBLIC", auditRequired: false },
  { method: "GET", path: "/api/public/districts", controller: "getPublicDistricts", classification: "PUBLIC", auditRequired: false },

  // Roles & Permissions
  { method: "GET", path: "/api/roles", controller: "getRoles", classification: "PROTECTED", permission: "role:view", scope: "ORGANIZATION", auditRequired: false },
  { method: "POST", path: "/api/roles", controller: "createRole", classification: "PROTECTED", permission: "role:create", scope: "ORGANIZATION", auditRequired: true },
  { method: "GET", path: "/api/roles/:id", controller: "getRoleById", classification: "PROTECTED", permission: "role:view", scope: "ORGANIZATION", auditRequired: false },
  { method: "PUT", path: "/api/roles/:id", controller: "updateRole", classification: "PROTECTED", permission: "role:configure", scope: "ORGANIZATION", auditRequired: true },
  { method: "DELETE", path: "/api/roles/:id", controller: "deleteRole", classification: "PROTECTED", permission: "role:delete", scope: "ORGANIZATION", auditRequired: true },

  // User Administration
  { method: "GET", path: "/api/admin/users", controller: "getUsers", classification: "PROTECTED", permission: "user:view", scope: "GLOBAL", auditRequired: false },
  { method: "POST", path: "/api/admin/users", controller: "createUser", classification: "PROTECTED", permission: "user:create", scope: "GLOBAL", auditRequired: true },
  { method: "PUT", path: "/api/admin/users/:id", controller: "updateUser", classification: "PROTECTED", permission: "user:update", scope: "GLOBAL", auditRequired: true },
  { method: "POST", path: "/api/admin/users/:id/suspend", controller: "suspendUser", classification: "PROTECTED", permission: "user:suspend", scope: "GLOBAL", auditRequired: true },
  { method: "POST", path: "/api/admin/users/:id/activate", controller: "activateUser", classification: "PROTECTED", permission: "user:activate", scope: "GLOBAL", auditRequired: true },
  { method: "POST", path: "/api/admin/users/:id/assign-role", controller: "assignUserRole", classification: "PROTECTED", permission: "user:assign-role", scope: "GLOBAL", auditRequired: true },

  // Corporate Pitches
  { method: "POST", path: "/api/pitches", controller: "createPitch", classification: "PROTECTED", permission: "pitch:create", scope: "ORGANIZATION", auditRequired: true },
  { method: "GET", path: "/api/pitches", controller: "getPitches", classification: "PROTECTED", permission: "pitch:view", scope: "ORGANIZATION", auditRequired: false },
  { method: "GET", path: "/api/pitches/:id", controller: "getPitchById", classification: "PROTECTED", permission: "pitch:view", scope: "ORGANIZATION", resourceLoader: "loadPitch", auditRequired: false },
  { method: "POST", path: "/api/pitches/:id/verify", controller: "verifyPitch", classification: "PROTECTED", permission: "pitch:verify", scope: "DISTRICT", resourceLoader: "loadPitch", allowedWorkflowStates: ["SUBMITTED", "UNDER_REVIEW"], auditRequired: true },
  { method: "POST", path: "/api/pitches/:id/approve", controller: "approvePitch", classification: "PROTECTED", permission: "pitch:approve", scope: "GLOBAL", resourceLoader: "loadPitch", allowedWorkflowStates: ["UNDER_REVIEW"], auditRequired: true },
  { method: "POST", path: "/api/pitches/:id/reject", controller: "rejectPitch", classification: "PROTECTED", permission: "pitch:reject", scope: "GLOBAL", resourceLoader: "loadPitch", allowedWorkflowStates: ["SUBMITTED", "UNDER_REVIEW"], auditRequired: true },
  { method: "POST", path: "/api/pitches/:id/assign", controller: "assignPitch", classification: "PROTECTED", permission: "pitch:assign", scope: "GLOBAL", resourceLoader: "loadPitch", allowedWorkflowStates: ["APPROVED"], auditRequired: true },

  // Feasibility Assessments
  { method: "POST", path: "/api/assessments", controller: "createAssessment", classification: "PROTECTED", permission: "assessment:create", scope: "DISTRICT", auditRequired: true },
  { method: "GET", path: "/api/assessments", controller: "getAssessments", classification: "PROTECTED", permission: "assessment:view", scope: "DISTRICT", auditRequired: false },
  { method: "POST", path: "/api/assessments/:id/submit", controller: "submitAssessment", classification: "PROTECTED", permission: "assessment:submit", scope: "DISTRICT", allowedWorkflowStates: ["DRAFT"], auditRequired: true },
  { method: "POST", path: "/api/assessments/:id/review", controller: "reviewAssessment", classification: "PROTECTED", permission: "assessment:review", scope: "GLOBAL", allowedWorkflowStates: ["SUBMITTED"], auditRequired: true },
  { method: "POST", path: "/api/assessments/:id/decide", controller: "decideAssessment", classification: "PROTECTED", permission: "assessment:decide", scope: "GLOBAL", allowedWorkflowStates: ["UNDER_REVIEW"], auditRequired: true },

  // CSR Requirements
  { method: "POST", path: "/api/requirements", controller: "createRequirement", classification: "PROTECTED", permission: "requirement:create", scope: "ORGANIZATION", auditRequired: true },
  { method: "GET", path: "/api/requirements", controller: "getRequirements", classification: "PROTECTED", permission: "requirement:view", scope: "ORGANIZATION", auditRequired: false },
  { method: "PUT", path: "/api/requirements/:id", controller: "updateRequirement", classification: "PROTECTED", permission: "requirement:update", scope: "ORGANIZATION", auditRequired: true },
  { method: "DELETE", path: "/api/requirements/:id", controller: "deleteRequirement", classification: "PROTECTED", permission: "requirement:delete", scope: "ORGANIZATION", auditRequired: true },
  { method: "POST", path: "/api/requirements/:id/submit", controller: "submitRequirement", classification: "PROTECTED", permission: "requirement:submit", scope: "ORGANIZATION", allowedWorkflowStates: ["DRAFT"], auditRequired: true },
  { method: "POST", path: "/api/requirements/:id/verify", controller: "verifyRequirement", classification: "PROTECTED", permission: "requirement:verify", scope: "DISTRICT", allowedWorkflowStates: ["SUBMITTED"], auditRequired: true },
  { method: "POST", path: "/api/requirements/:id/approve", controller: "approveRequirement", classification: "PROTECTED", permission: "requirement:approve", scope: "GLOBAL", allowedWorkflowStates: ["VERIFIED"], auditRequired: true },
  { method: "POST", path: "/api/requirements/:id/reject", controller: "rejectRequirement", classification: "PROTECTED", permission: "requirement:reject", scope: "GLOBAL", allowedWorkflowStates: ["SUBMITTED", "VERIFIED"], auditRequired: true },
  { method: "POST", path: "/api/requirements/:id/publish", controller: "publishRequirement", classification: "PROTECTED", permission: "requirement:publish", scope: "GLOBAL", allowedWorkflowStates: ["APPROVED"], auditRequired: true },
  { method: "POST", path: "/api/requirements/:id/handover", controller: "handoverRequirement", classification: "PROTECTED", permission: "requirement:handover", scope: "GLOBAL", allowedWorkflowStates: ["PUBLISHED"], auditRequired: true },

  // Project Execution & Life Cycle
  { method: "GET", path: "/api/projects", controller: "getProjects", classification: "PROTECTED", permission: "project:view", scope: "ORGANIZATION", auditRequired: false },
  { method: "POST", path: "/api/projects", controller: "createProject", classification: "PROTECTED", permission: "project:create", scope: "ORGANIZATION", auditRequired: true },
  { method: "PUT", path: "/api/projects/:id", controller: "updateProject", classification: "PROTECTED", permission: "project:update", scope: "PROJECT", resourceLoader: "loadProject", auditRequired: true },
  { method: "POST", path: "/api/projects/:id/approve", controller: "approveProject", classification: "PROTECTED", permission: "project:approve", scope: "GLOBAL", resourceLoader: "loadProject", allowedWorkflowStates: ["PROPOSED"], auditRequired: true },
  { method: "POST", path: "/api/projects/:id/assign", controller: "assignProject", classification: "PROTECTED", permission: "project:assign", scope: "GLOBAL", resourceLoader: "loadProject", allowedWorkflowStates: ["APPROVED"], auditRequired: true },
  { method: "POST", path: "/api/projects/:id/close", controller: "closeProject", classification: "PROTECTED", permission: "project:close", scope: "PROJECT", resourceLoader: "loadProject", allowedWorkflowStates: ["COMPLETED"], auditRequired: true },

  // Funds & Monitoring
  { method: "GET", path: "/api/funds", controller: "getFunds", classification: "PROTECTED", permission: "fund:view", scope: "ORGANIZATION", auditRequired: false },
  { method: "POST", path: "/api/funds/commit", controller: "commitFund", classification: "PROTECTED", permission: "fund:commit", scope: "ORGANIZATION", auditRequired: true },
  { method: "POST", path: "/api/funds/release", controller: "releaseFund", classification: "PROTECTED", permission: "fund:release", scope: "GLOBAL", auditRequired: true },
  { method: "POST", path: "/api/funds/verify", controller: "verifyFund", classification: "PROTECTED", permission: "fund:verify", scope: "GLOBAL", auditRequired: true },
  { method: "PUT", path: "/api/milestones/:id", controller: "updateMilestone", classification: "PROTECTED", permission: "milestone:update", scope: "PROJECT", resourceLoader: "loadMilestone", auditRequired: true },
  { method: "POST", path: "/api/milestones/:id/verify", controller: "verifyMilestone", classification: "PROTECTED", permission: "milestone:verify", scope: "DISTRICT", resourceLoader: "loadMilestone", auditRequired: true },
  { method: "POST", path: "/api/inspections", controller: "createInspection", classification: "PROTECTED", permission: "inspection:create", scope: "DISTRICT", auditRequired: true },
  { method: "POST", path: "/api/completion/recommend", controller: "recommendCompletion", classification: "PROTECTED", permission: "completion:recommend", scope: "DISTRICT", auditRequired: true },
  { method: "POST", path: "/api/completion/approve", controller: "approveCompletion", classification: "PROTECTED", permission: "completion:approve", scope: "GLOBAL", auditRequired: true },
  { method: "POST", path: "/api/documents/uc", controller: "uploadUC", classification: "PROTECTED", permission: "uc:upload", scope: "PROJECT", auditRequired: true },
  { method: "POST", path: "/api/documents/bill", controller: "uploadBill", classification: "PROTECTED", permission: "bill:upload", scope: "PROJECT", auditRequired: true },

  // Organizations
  { method: "GET", path: "/api/organizations", controller: "getOrganizations", classification: "PROTECTED", permission: "organization:view", scope: "GLOBAL", auditRequired: false },
  { method: "PUT", path: "/api/organizations/:id", controller: "updateOrganization", classification: "PROTECTED", permission: "organization:update", scope: "ORGANIZATION", auditRequired: true },
  { method: "POST", path: "/api/organizations/:id/approve", controller: "approveOrganization", classification: "PROTECTED", permission: "organization:approve", scope: "GLOBAL", auditRequired: true },
  { method: "POST", path: "/api/organizations/:id/reject", controller: "rejectOrganization", classification: "PROTECTED", permission: "organization:reject", scope: "GLOBAL", auditRequired: true },
  { method: "POST", path: "/api/organizations/:id/suspend", controller: "suspendOrganization", classification: "PROTECTED", permission: "organization:suspend", scope: "GLOBAL", auditRequired: true },
  { method: "POST", path: "/api/organizations/:id/users", controller: "manageOrganizationUsers", classification: "PROTECTED", permission: "organization:manage-users", scope: "ORGANIZATION", auditRequired: true }
];

export function getRoutePolicy(method: string, path: string): RoutePolicy | undefined {
  return ROUTE_POLICY_REGISTRY.find(
    (p) => p.method === method.toUpperCase() && p.path === path
  );
}

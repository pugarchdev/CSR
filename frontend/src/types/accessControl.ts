// Access Control — Canonical TypeScript Types
// Mirrors the /api/access-control API surface

// ============================================
// Enums
// ============================================

export type RoleStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type RoleType = "SYSTEM" | "CUSTOM";
export type DefaultScope =
  | "GLOBAL"
  | "ORGANIZATION"
  | "ORGANIZATION_AND_CHILDREN"
  | "DEPARTMENT"
  | "DISTRICT"
  | "DIVISION"
  | "ASSIGNED"
  | "OWN"
  | "MULTI_ORGANIZATION"
  | "PROJECT"
  | "ASSIGNED_RESOURCE";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AssignmentStatus = "ACTIVE" | "INACTIVE" | "EXPIRED" | "REVOKED";

// ============================================
// Role
// ============================================

export interface Role {
  id: number;
  code: string;
  name: string;
  displayName: string;
  description: string | null;
  type: RoleType;
  defaultScope: DefaultScope;
  status: RoleStatus;
  isSystemRole: boolean;
  isProtected: boolean;
  version: number;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
  permissions: string[];
  _count?: {
    roleAssignments: number;
    users: number;
  };
}

// ============================================
// Permission
// ============================================

export interface Permission {
  id: string;
  key: string;
  title: string;
  description: string | null;
  module: string;
  action: string;
  resource: string;
  riskLevel: RiskLevel;
  isDelegable: boolean;
  dependencies: string[];
  scopeBehavior: string | null;
  createdAt: string;
}

export interface PermissionModule {
  module: string;
  permissions: Permission[];
}

// ============================================
// Assignment
// ============================================

export interface Assignment {
  id: string;
  userId: string;
  roleId: number;
  status: AssignmentStatus;
  scope: DefaultScope;
  organizationId: string | null;
  districtId: string | null;
  projectId: string | null;
  validFrom: string | null;
  validUntil: string | null;
  assignedBy: string | null;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  role?: {
    id: number;
    code: string;
    name: string;
    displayName: string;
  };
}

// ============================================
// Audit
// ============================================

export interface AuditEntry {
  id: string;
  actor: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId: string;
  resourceLabel: string;
  reason: string | null;
  scope: string | null;
  correlationId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  timestamp: string;
  ipAddress: string | null;
}

// ============================================
// Overview Stats
// ============================================

export interface OverviewStats {
  totalRoles: number;
  systemRoles: number;
  customRoles: number;
  activeAssignments: number;
  highRiskPermissionsCount: number;
  timestamp: string;
}

// ============================================
// Impact Preview
// ============================================

export interface ImpactPreview {
  roleId: number;
  roleName: string;
  affectedUsers: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }[];
  affectedUserCount: number;
  permissionsToAdd: string[];
  permissionsToRemove: string[];
  activeSessionCount: number;
  highRiskChanges: string[];
  requiresReason: boolean;
}

// ============================================
// API Request Types
// ============================================

export interface CreateRoleRequest {
  code: string;
  name: string;
  displayName?: string;
  description?: string;
  defaultScope: DefaultScope;
  organizationId?: string;
  permissions?: string[];
}

export interface PatchRoleRequest {
  name?: string;
  displayName?: string;
  description?: string;
  defaultScope?: DefaultScope;
  status?: RoleStatus;
  version: number;
}

export interface UpdatePermissionsRequest {
  permissions: string[];
  version: number;
  reason?: string;
}

export interface CloneRoleRequest {
  code: string;
  name: string;
  displayName?: string;
  description?: string;
  defaultScope?: DefaultScope;
  organizationId?: string;
}

export interface CreateAssignmentRequest {
  userId: string;
  roleId: number;
  scope: DefaultScope;
  organizationId?: string;
  districtId?: string;
  projectId?: string;
  validFrom?: string;
  validUntil?: string;
  reason?: string;
}

export interface PatchAssignmentRequest {
  status?: AssignmentStatus;
  validFrom?: string;
  validUntil?: string;
  reason?: string;
}

// ============================================
// API Response Wrappers
// ============================================

export interface RolesResponse {
  data: Role[];
}

export interface PermissionsResponse {
  data: Permission[];
}

export interface AssignmentsResponse {
  data: Assignment[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditResponse {
  data: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

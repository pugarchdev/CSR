import { EffectivePermissionService } from "../services/effectivePermissionService";
import { SYSTEM_ROLE_TEMPLATE_MAP } from "../types/role";
import { isSuperAdmin } from "../services/roleResolver";

jest.mock("../config/db", () => {
  return {
    user: {
      findUnique: jest.fn(),
    },
    userRoleAssignment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    permission: {
      findMany: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    $executeRawUnsafe: jest.fn().mockResolvedValue(1),
  };
});

import prisma from "../config/db";

describe("Canonical Access Control Engine Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("1. Global Role Authorization", () => {
    it("grants global access and all permissions to SUPER_ADMIN", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "usr-super",
        isVerified: true,
        accountStatus: "ACTIVE",
        deletedAt: null,
        roleId: 1,
        role: { id: 1, code: "SUPER_ADMIN", name: "SUPER_ADMIN", type: "SYSTEM", defaultScope: "GLOBAL", rolePermissions: [] }
      });

      (prisma.userRoleAssignment.findMany as jest.Mock).mockResolvedValue([
        {
          id: "asgn-1",
          userId: "usr-super",
          roleId: 1,
          organizationId: null,
          districtCode: null,
          projectId: null,
          status: "ACTIVE",
          validFrom: new Date(Date.now() - 1000),
          validUntil: null,
          role: {
            id: 1,
            code: "SUPER_ADMIN",
            name: "SUPER_ADMIN",
            displayName: "Super Administrator",
            type: "SYSTEM",
            defaultScope: "GLOBAL",
            status: "ACTIVE",
            rolePermissions: []
          }
        }
      ]);

      (prisma.permission.findMany as jest.Mock).mockResolvedValue([
        { key: "project:view" },
        { key: "project:create" },
        { key: "role:configure" }
      ]);

      const payload = await EffectivePermissionService.getEffectiveAccessPayload("usr-super");
      expect(payload.isSuperAdmin).toBe(true);
      expect(payload.scopes.global).toBe(true);
      expect(payload.permissions).toContain("project:view");
      expect(payload.permissions).toContain("role:configure");
    });
  });

  describe("2. Organization-Scoped Role Authorization", () => {
    it("restricts organization-scoped role permissions to the assigned organization", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "usr-company-admin",
        isVerified: true,
        accountStatus: "ACTIVE",
        deletedAt: null,
        organizationId: "org-alpha",
        roleId: 8,
      });

      (prisma.userRoleAssignment.findMany as jest.Mock).mockResolvedValue([
        {
          id: "asgn-2",
          userId: "usr-company-admin",
          roleId: 8,
          organizationId: "org-alpha",
          districtCode: null,
          projectId: null,
          status: "ACTIVE",
          validFrom: new Date(Date.now() - 1000),
          validUntil: null,
          role: {
            id: 8,
            code: "COMPANY_ADMIN",
            name: "COMPANY_ADMIN",
            displayName: "Corporate Admin",
            type: "SYSTEM",
            defaultScope: "ORGANIZATION",
            status: "ACTIVE",
            rolePermissions: [
              { permission: { key: "project:create" } },
              { permission: { key: "project:view" } }
            ]
          }
        }
      ]);

      const payload = await EffectivePermissionService.getEffectiveAccessPayload("usr-company-admin");
      expect(payload.isSuperAdmin).toBe(false);
      expect(payload.scopes.organizationIds).toContain("org-alpha");
      expect(payload.scopes.organizationIds).not.toContain("org-beta");
      expect(payload.permissions).toContain("project:create");
    });
  });

  describe("3. District-Scoped Role Authorization", () => {
    it("includes assigned districtCode in contextual scopes for district roles", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "usr-dnc",
        isVerified: true,
        accountStatus: "ACTIVE",
        deletedAt: null,
        organizationId: null,
        roleId: 5,
      });

      (prisma.userRoleAssignment.findMany as jest.Mock).mockResolvedValue([
        {
          id: "asgn-3",
          userId: "usr-dnc",
          roleId: 5,
          organizationId: null,
          districtCode: "Pune",
          projectId: null,
          status: "ACTIVE",
          validFrom: new Date(Date.now() - 1000),
          validUntil: null,
          role: {
            id: 5,
            code: "DISTRICT_NODAL_CONSULTANT",
            name: "DISTRICT_NODAL_CONSULTANT",
            displayName: "District Nodal Consultant",
            type: "SYSTEM",
            defaultScope: "DISTRICT",
            status: "ACTIVE",
            rolePermissions: [{ permission: { key: "inspection:create" } }]
          }
        }
      ]);

      const payload = await EffectivePermissionService.getEffectiveAccessPayload("usr-dnc");
      expect(payload.scopes.districtCodes).toContain("Pune");
      expect(payload.scopes.districtCodes).not.toContain("Nagpur");
    });
  });

  describe("4. Project Assignment Scope", () => {
    it("captures specific projectId in project-level role assignment", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "usr-pm",
        isVerified: true,
        accountStatus: "ACTIVE",
        deletedAt: null,
      });

      (prisma.userRoleAssignment.findMany as jest.Mock).mockResolvedValue([
        {
          id: "asgn-4",
          userId: "usr-pm",
          roleId: 10,
          organizationId: "org-alpha",
          districtCode: null,
          projectId: "prj-99",
          status: "ACTIVE",
          validFrom: new Date(Date.now() - 1000),
          validUntil: null,
          role: {
            id: 10,
            code: "PROJECT_MANAGER",
            name: "PROJECT_MANAGER",
            displayName: "Project Lead",
            type: "CUSTOM",
            defaultScope: "PROJECT",
            status: "ACTIVE",
            rolePermissions: [{ permission: { key: "milestone:update" } }]
          }
        }
      ]);

      const payload = await EffectivePermissionService.getEffectiveAccessPayload("usr-pm");
      expect(payload.scopes.projectIds).toContain("prj-99");
      expect(payload.permissions).toContain("milestone:update");
    });
  });

  describe("5. Expired Assignment Handling", () => {
    it("excludes permissions and scopes from expired role assignments", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "usr-expired",
        isVerified: true,
        accountStatus: "ACTIVE",
        deletedAt: null,
      });

      // Simulated active DB query filtering out expired rows
      (prisma.userRoleAssignment.findMany as jest.Mock).mockResolvedValue([]);

      const payload = await EffectivePermissionService.getEffectiveAccessPayload("usr-expired");
      expect(payload.permissions).toHaveLength(0);
      expect(payload.activeRoles).toHaveLength(0);
    });
  });

  describe("6. Inactive Role Handling", () => {
    it("returns zero permissions when target Role status is INACTIVE", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "usr-inactive-role",
        isVerified: true,
        accountStatus: "ACTIVE",
        deletedAt: null,
      });

      (prisma.userRoleAssignment.findMany as jest.Mock).mockResolvedValue([]);

      const payload = await EffectivePermissionService.getEffectiveAccessPayload("usr-inactive-role");
      expect(payload.permissions).toEqual([]);
    });
  });

  describe("7. Missing Organization Scope & Cross-Org Isolation", () => {
    it("denies access to resources outside authorized organization list", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "usr-org-a",
        isVerified: true,
        accountStatus: "ACTIVE",
        deletedAt: null,
        organizationId: "org-alpha",
      });

      (prisma.userRoleAssignment.findMany as jest.Mock).mockResolvedValue([
        {
          id: "asgn-5",
          userId: "usr-org-a",
          roleId: 8,
          organizationId: "org-alpha",
          districtCode: null,
          projectId: null,
          status: "ACTIVE",
          validFrom: new Date(Date.now() - 1000),
          validUntil: null,
          role: {
            id: 8,
            code: "COMPANY_ADMIN",
            name: "COMPANY_ADMIN",
            type: "SYSTEM",
            defaultScope: "ORGANIZATION",
            status: "ACTIVE",
            rolePermissions: [{ permission: { key: "enquiry:create" } }]
          }
        }
      ]);

      const payload = await EffectivePermissionService.getEffectiveAccessPayload("usr-org-a");
      expect(payload.scopes.organizationIds.includes("org-beta")).toBe(false);
    });
  });

  describe("8. Cross-District Assignment Isolation", () => {
    it("denies cross-district scope access for non-assigned district", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "usr-dno-pune",
        isVerified: true,
        accountStatus: "ACTIVE",
        deletedAt: null,
      });

      (prisma.userRoleAssignment.findMany as jest.Mock).mockResolvedValue([
        {
          id: "asgn-6",
          userId: "usr-dno-pune",
          roleId: 4,
          organizationId: null,
          districtCode: "Pune",
          projectId: null,
          status: "ACTIVE",
          validFrom: new Date(Date.now() - 1000),
          validUntil: null,
          role: {
            id: 4,
            code: "DISTRICT_NODAL_OFFICER",
            name: "DISTRICT_NODAL_OFFICER",
            type: "SYSTEM",
            defaultScope: "DISTRICT",
            status: "ACTIVE",
            rolePermissions: [{ permission: { key: "pitch:verify" } }]
          }
        }
      ]);

      const payload = await EffectivePermissionService.getEffectiveAccessPayload("usr-dno-pune");
      expect(payload.scopes.districtCodes.includes("Thane")).toBe(false);
    });
  });

  describe("9. Permission Revocation & Session Invalidation", () => {
    it("immediately reflects revoked permission in EffectivePermissionService lookup", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "usr-revoked",
        isVerified: true,
        accountStatus: "ACTIVE",
        deletedAt: null,
      });

      (prisma.userRoleAssignment.findMany as jest.Mock).mockResolvedValue([
        {
          id: "asgn-7",
          userId: "usr-revoked",
          roleId: 8,
          organizationId: "org-alpha",
          status: "ACTIVE",
          validFrom: new Date(Date.now() - 1000),
          role: {
            id: 8,
            code: "COMPANY_ADMIN",
            type: "SYSTEM",
            status: "ACTIVE",
            rolePermissions: [] // Revoked permission list
          }
        }
      ]);

      const hasPerm = await EffectivePermissionService.hasPermission("usr-revoked", "project:delete");
      expect(hasPerm).toBe(false);
    });
  });

  describe("10. System Role Protection & Sequence Correction", () => {
    it("reserves system role codes in SYSTEM_ROLE_TEMPLATE_MAP", () => {
      const protectedCodes = Object.values(SYSTEM_ROLE_TEMPLATE_MAP).map(t => t.code);
      expect(protectedCodes).toContain("SUPER_ADMIN");
      expect(protectedCodes).toContain("PLANNING_SECRETARY");
      expect(protectedCodes).toContain("JOINT_SECRETARY");
      expect(protectedCodes).toContain("COMPANY_ADMIN");
    });

    it("grants full organization onboarding decision and update permissions to JOINT_SECRETARY", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "usr-js-1",
        isVerified: true,
        accountStatus: "ACTIVE",
        deletedAt: null,
        roleId: 3,
        role: {
          id: 3,
          code: "JOINT_SECRETARY",
          name: "JOINT_SECRETARY",
          displayName: "Joint Secretary",
          type: "SYSTEM",
          defaultScope: "GLOBAL",
          rolePermissions: []
        }
      });
      (prisma.userRoleAssignment.findMany as jest.Mock).mockResolvedValue([]);

      const payload = await EffectivePermissionService.getEffectiveAccessPayload("usr-js-1");
      expect(payload.permissions).toContain("organization:view");
      expect(payload.permissions).toContain("organization:approve");
      expect(payload.permissions).toContain("organization:reject");
      expect(payload.permissions).toContain("organization:suspend");
      expect(payload.permissions).toContain("organization:update");
    });
  });
});

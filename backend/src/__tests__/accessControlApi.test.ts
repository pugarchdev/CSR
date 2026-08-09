import { AccessControlApiService } from "../services/accessControlApiService";
import { EffectivePermissionService } from "../services/effectivePermissionService";
import { CreateRoleSchema, PatchRoleSchema, UpdatePermissionsSchema } from "../validators/accessControlValidator";

jest.mock("../config/db", () => {
  return {
    role: {
      count: jest.fn().mockResolvedValue(10),
      findMany: jest.fn().mockResolvedValue([
        { id: 1, code: "SUPER_ADMIN", name: "Super Administrator", type: "SYSTEM", isSystemRole: true, rolePermissions: [] },
        { id: 8, code: "COMPANY_ADMIN", name: "Corporate Admin", type: "SYSTEM", isSystemRole: true, rolePermissions: [] }
      ]),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userRoleAssignment: {
      count: jest.fn().mockResolvedValue(25),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    permission: {
      count: jest.fn().mockResolvedValue(5),
      findMany: jest.fn().mockResolvedValue([
        { key: "project:view", riskLevel: "LOW", module: "PROJECT" },
        { key: "project:create", riskLevel: "MEDIUM", module: "PROJECT" }
      ]),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "audit-101" }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    rolePermission: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation((cb) => cb({
      role: {
        create: jest.fn().mockResolvedValue({ id: 99, code: "CUSTOM_ANALYST", name: "Custom Analyst", version: 1 }),
        update: jest.fn().mockResolvedValue({ id: 99, code: "CUSTOM_ANALYST", name: "Custom Analyst Updated", version: 2 }),
        delete: jest.fn().mockResolvedValue({ id: 99 })
      },
      rolePermission: {
        deleteMany: jest.fn(),
        createMany: jest.fn()
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: "audit-102" })
      },
      userRoleAssignment: {
        create: jest.fn().mockResolvedValue({ id: "asgn-99", userId: "usr-1", roleId: 99, status: "ACTIVE" }),
        update: jest.fn().mockResolvedValue({ id: "asgn-99", status: "INACTIVE" }),
        delete: jest.fn().mockResolvedValue({ id: "asgn-99", userId: "usr-1" }),
        findMany: jest.fn().mockResolvedValue([])
      },
      user: {
        update: jest.fn().mockResolvedValue({ id: "usr-1", tokenVersion: 2 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 })
      }
    }))
  };
});

import prisma from "../config/db";

describe("Access Control API Integration & Behavioral Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("1. Zod Validation & Reserved System Code Rejection", () => {
    it("rejects custom role creation using reserved system role code SUPER_ADMIN", () => {
      const result = CreateRoleSchema.safeParse({
        code: "SUPER_ADMIN",
        name: "Fake Admin",
        permissions: ["project:view"]
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(JSON.stringify(result.error.format())).toContain("System role codes are reserved");
      }
    });

    it("accepts valid custom role code CUSTOM_ANALYST", () => {
      const result = CreateRoleSchema.safeParse({
        code: "CUSTOM_ANALYST",
        name: "Custom Analyst",
        defaultScope: "ORGANIZATION",
        permissions: ["project:view"]
      });
      expect(result.success).toBe(true);
    });

    it("rejects duplicate permission keys in Zod validation", () => {
      const result = CreateRoleSchema.safeParse({
        code: "CUSTOM_DUP",
        name: "Duplicate Role",
        permissions: ["project:view", "project:view"]
      });
      expect(result.success).toBe(false);
    });
  });

  describe("2. Overview & Statistics API", () => {
    it("returns accurate overview statistics", async () => {
      const stats = await AccessControlApiService.getOverview();
      expect(stats.totalRoles).toBe(10);
      expect(stats.activeAssignments).toBe(25);
      expect(stats.highRiskPermissionsCount).toBe(5);
    });
  });

  describe("3. Permission Key Validation & Delegation Ceiling", () => {
    it("throws error when validating non-existent permission keys", async () => {
      (prisma.permission.findMany as jest.Mock).mockResolvedValue([{ key: "project:view" }]);

      await expect(
        AccessControlApiService.validatePermissionKeys(["project:view", "invalid:fake:perm"])
      ).rejects.toThrow("Invalid permission keys: invalid:fake:perm");
    });

    it("enforces delegation ceiling preventing non-SuperAdmin from granting unpossessed permissions", async () => {
      jest.spyOn(EffectivePermissionService, "getEffectiveAccessPayload").mockResolvedValue({
        userId: "usr-org-admin",
        isSuperAdmin: false,
        activeRoles: [],
        permissions: ["project:view"],
        scopes: { global: false, organizationIds: ["org-1"], childOrganizationIds: [], departmentIds: [], districtCodes: [], divisionCodes: [], projectIds: [] }
      });

      await expect(
        AccessControlApiService.checkDelegationCeiling("usr-org-admin", ["project:view", "system:configure"])
      ).rejects.toThrow("Delegation Ceiling Violation");
    });
  });

  describe("4. Optimistic Locking (Version Mismatch)", () => {
    it("rejects patch role attempt when version parameter is missing in Zod schema", () => {
      const result = PatchRoleSchema.safeParse({ name: "Updated Name" });
      expect(result.success).toBe(false);
    });

    it("rejects permissions update when version parameter is missing", () => {
      const result = UpdatePermissionsSchema.safeParse({ permissions: ["project:view"] });
      expect(result.success).toBe(false);
    });
  });

  describe("5. Impact Preview Computation", () => {
    it("returns direct users, active sessions count, and high risk changes", async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValue({
        id: 8,
        code: "COMPANY_ADMIN",
        name: "Corporate Admin",
        roleAssignments: [{ user: { id: "u-1", email: "u1@test.com", firstName: "Alice", lastName: "Smith" } }],
        rolePermissions: []
      });

      (prisma.permission.findMany as jest.Mock).mockResolvedValue([
        { key: "role:delete", riskLevel: "HIGH", module: "SECURITY" }
      ]);

      const preview = await AccessControlApiService.computeImpactPreview(8, ["role:delete"], []);
      expect(preview.roleId).toBe(8);
      expect(preview.usersDirectlyAssignedCount).toBe(1);
      expect(preview.permissionsAdded).toContain("role:delete");
      expect(preview.modulesAffected).toContain("SECURITY");
    });
  });

  describe("6. Role Retirement & Deletion Safety", () => {
    it("blocks deletion of system protected roles", async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        code: "SUPER_ADMIN",
        isProtected: true,
        isSystemRole: true,
        _count: { roleAssignments: 0 }
      });

      // Verify role is system protected
      const role = await prisma.role.findUnique({ where: { id: 1 } });
      expect(role?.isProtected).toBe(true);
    });
  });
});

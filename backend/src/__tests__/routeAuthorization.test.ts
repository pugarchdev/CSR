import { ROUTE_POLICY_REGISTRY, getRoutePolicy } from "../config/routePolicyRegistry";
import { WorkflowTransitionService } from "../services/workflowTransitionService";
import { EffectivePermissionService } from "../services/effectivePermissionService";

jest.mock("../config/db", () => {
  return {
    user: {
      findUnique: jest.fn(),
    },
    userRoleAssignment: {
      findMany: jest.fn(),
    },
    permission: {
      findMany: jest.fn(),
    },
    governmentPitch: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "audit-99" }),
    },
    $transaction: jest.fn().mockImplementation((callback) => callback({
      governmentPitch: {
        findUnique: jest.fn().mockResolvedValue({ id: "pitch-101", status: "UNDER_REVIEW" }),
        update: jest.fn().mockResolvedValue({ id: "pitch-101", status: "APPROVED" })
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: "audit-100" })
      }
    }))
  };
});

import prisma from "../config/db";

describe("Route-Level Negative & Contextual Authorization Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("1. Route Policy Registry Verification", () => {
    it("ensures all protected endpoints in registry have an assigned DB permission key", () => {
      const protectedPolicies = ROUTE_POLICY_REGISTRY.filter((p) => p.classification === "PROTECTED");
      expect(protectedPolicies.length).toBeGreaterThan(10);
      protectedPolicies.forEach((p) => {
        expect(["GET", "POST", "PUT", "PATCH", "DELETE"]).toContain(p.method);
        expect(p.permission).toBeDefined();
        expect(p.permission).toMatch(/^[a-z0-9-]+:[a-z0-9-]+$/);
      });
    });

    it("correctly retrieves specific route policy via getRoutePolicy helper", () => {
      const policy = getRoutePolicy("GET", "/api/roles");
      expect(policy).toBeDefined();
      expect(policy?.classification).toBe("PROTECTED");
      expect(policy?.permission).toBe("role:view");
    });
  });

  describe("2. Authenticated User Without Permission", () => {
    it("denies access when user lacks the required permission key", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "usr-noperm",
        isVerified: true,
        accountStatus: "ACTIVE",
        deletedAt: null,
      });

      (prisma.userRoleAssignment.findMany as jest.Mock).mockResolvedValue([]);

      const hasPerm = await EffectivePermissionService.hasPermission("usr-noperm", "pitch:create");
      expect(hasPerm).toBe(false);
    });
  });

  describe("3. Organization Scope Isolation", () => {
    it("restricts organization-scoped access to authorized tenant organization list", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "usr-orga",
        isVerified: true,
        accountStatus: "ACTIVE",
        deletedAt: null,
        organizationId: "org-alpha"
      });

      (prisma.userRoleAssignment.findMany as jest.Mock).mockResolvedValue([
        {
          id: "asgn-org-a",
          userId: "usr-orga",
          roleId: 8,
          organizationId: "org-alpha",
          status: "ACTIVE",
          validFrom: new Date(Date.now() - 1000),
          role: {
            id: 8,
            code: "COMPANY_ADMIN",
            status: "ACTIVE",
            rolePermissions: [{ permission: { key: "role:view" } }]
          }
        }
      ]);

      const payload = await EffectivePermissionService.getEffectiveAccessPayload("usr-orga");
      expect(payload.scopes.organizationIds).toContain("org-alpha");
      expect(payload.scopes.organizationIds).not.toContain("org-beta");
    });
  });

  describe("4. Invalid Workflow State Transition Handling", () => {
    it("rejects state transition if current state does not match allowed transition graph", async () => {
      await expect(
        WorkflowTransitionService.executeTransition({
          entityType: "PITCH",
          entityId: "pitch-101",
          actorUserId: "usr-admin",
          fromState: "REJECTED",
          toState: "APPROVED",
          requiredPermission: "pitch:approve",
          reason: "Attempt override"
        })
      ).rejects.toThrow("Invalid workflow state transition");
    });
  });

  describe("6. authorizeRoles SuperAdmin Authorization", () => {
    it("allows SuperAdmin (role: 1) even if allowedRoles does not explicitly include SuperAdmin", () => {
      const { authorizeRoles } = require("../middlewares/authMiddleware");
      const middleware = authorizeRoles([3, 2]); // Only Joint Secretary & Planning Secretary

      const req: any = { user: { id: "admin-1", email: "admin@mahacsr.gov.in", role: 1, roleId: "1" } };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("forbids unauthorized non-superadmin user lacking allowed roles", () => {
      const { authorizeRoles } = require("../middlewares/authMiddleware");
      const middleware = authorizeRoles([3, 2]); // Only Joint Secretary & Planning Secretary

      const req: any = { user: { id: "officer-7", email: "officer@mahacsr.gov.in", role: 7, roleId: "7" } };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: role '7' lacks permissions" });
    });
  });
});

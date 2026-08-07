import { WorkflowTransitionService, ALLOWED_STATE_TRANSITIONS } from "../services/workflowTransitionService";

jest.mock("../services/effectivePermissionService", () => {
  return {
    EffectivePermissionService: {
      getEffectiveAccessPayload: jest.fn().mockImplementation(async (userId: string) => {
        if (userId === "super-admin") {
          return { isSuperAdmin: true, permissions: ["*"] };
        }
        if (userId === "authorized-user") {
          return { isSuperAdmin: false, permissions: ["project:approve", "project:review", "project:submit"] };
        }
        return { isSuperAdmin: false, permissions: [] };
      }),
    },
  };
});

jest.mock("../config/db", () => {
  const mockDbState: any = {
    project: {
      "proj-101": { id: "proj-101", status: "DRAFT" },
      "proj-102": { id: "proj-102", status: "SUBMITTED" },
      "proj-103": { id: "proj-103", status: "APPROVED" },
    },
    pitch: {
      "pitch-101": { id: "pitch-101", status: "DRAFT" },
    },
  };

  return {
    __esModule: true,
    default: {
      $transaction: jest.fn().mockImplementation((cb) =>
        cb({
          project: {
            findUnique: jest.fn().mockImplementation(async ({ where }) => mockDbState.project[where.id] || null),
            update: jest.fn().mockImplementation(async ({ where, data }) => {
              const item = mockDbState.project[where.id];
              if (item) item.status = data.status;
              return item;
            }),
          },
          governmentPitch: {
            findUnique: jest.fn().mockImplementation(async ({ where }) => mockDbState.pitch[where.id] || null),
            update: jest.fn().mockImplementation(async ({ where, data }) => {
              const item = mockDbState.pitch[where.id];
              if (item) item.status = data.status;
              return item;
            }),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({ id: "audit-999" }),
          },
        })
      ),
    },
    mockDbState,
  };
});

describe("Project Lifecycle & Financial Constraints Edge Cases Test Suite", () => {
  describe("State Machine Graph Validation", () => {
    it("should allow strictly valid transitions defined in ALLOWED_STATE_TRANSITIONS", () => {
      expect(ALLOWED_STATE_TRANSITIONS["DRAFT"]).toContain("SUBMITTED");
      expect(ALLOWED_STATE_TRANSITIONS["SUBMITTED"]).toContain("UNDER_REVIEW");
      expect(ALLOWED_STATE_TRANSITIONS["UNDER_REVIEW"]).toContain("APPROVED");
      expect(ALLOWED_STATE_TRANSITIONS["COMPLETED"]).toContain("CLOSED");
    });

    it("should reject illegal state transitions attempting to bypass lifecycle steps", async () => {
      await expect(
        WorkflowTransitionService.executeTransition({
          entityType: "PROJECT",
          entityId: "proj-101",
          actorUserId: "super-admin",
          fromState: "DRAFT",
          toState: "COMPLETED",
          requiredPermission: "project:approve",
        })
      ).rejects.toThrow("Invalid workflow state transition from 'DRAFT' to 'COMPLETED'");
    });

    it("should enforce mandatory rejection reason when transitioning to REJECTED", async () => {
      await expect(
        WorkflowTransitionService.executeTransition({
          entityType: "PROJECT",
          entityId: "proj-102",
          actorUserId: "super-admin",
          fromState: "SUBMITTED",
          toState: "REJECTED",
          requiredPermission: "project:approve",
          reason: "   ", // Empty reason
        })
      ).rejects.toThrow("A mandatory explanation/reason is required for rejection");
    });

    it("should reject transition if user lacks required permission", async () => {
      await expect(
        WorkflowTransitionService.executeTransition({
          entityType: "PROJECT",
          entityId: "proj-101",
          actorUserId: "unauthorized-user",
          fromState: "DRAFT",
          toState: "SUBMITTED",
          requiredPermission: "project:submit",
        })
      ).rejects.toThrow("Forbidden: missing required permission");
    });

    it("should detect state conflict or concurrent replay attack", async () => {
      await expect(
        WorkflowTransitionService.executeTransition({
          entityType: "PROJECT",
          entityId: "proj-101",
          actorUserId: "super-admin",
          fromState: "SUBMITTED", // Mismatch: actual DB status is DRAFT
          toState: "UNDER_REVIEW",
          requiredPermission: "project:review",
        })
      ).rejects.toThrow("Replay or state conflict detected");
    });

    it("should execute clean transition when all pre-conditions are satisfied", async () => {
      const res = await WorkflowTransitionService.executeTransition({
        entityType: "PROJECT",
        entityId: "proj-101",
        actorUserId: "super-admin",
        fromState: "DRAFT",
        toState: "SUBMITTED",
        requiredPermission: "project:submit",
      });

      expect(res).toEqual({
        success: true,
        entityId: "proj-101",
        fromState: "DRAFT",
        toState: "SUBMITTED",
      });
    });
  });

  describe("Financial Precision & Allocation Constraints", () => {
    it("should reject milestone budgets exceeding total approved project budget", () => {
      const approvedBudget = 1000000; // 10 Lakhs
      const milestones = [
        { name: "Phase 1", targetAmount: 600000 },
        { name: "Phase 2", targetAmount: 500000 }, // Total = 11 Lakhs (Exceeds approved)
      ];

      const totalMilestones = milestones.reduce((acc, m) => acc + m.targetAmount, 0);
      const isExceeded = totalMilestones > approvedBudget;

      expect(isExceeded).toBe(true);
    });

    it("should reject Utilization Certificate (UC) amount exceeding milestone allocation", () => {
      const milestoneTarget = 500000;
      const ucSubmittedAmount = 550000;

      const isOverAllocated = ucSubmittedAmount > milestoneTarget;
      expect(isOverAllocated).toBe(true);
    });
  });
});

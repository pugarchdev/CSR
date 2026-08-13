import prisma from "../config/db";
import { RmAssignmentService } from "../services/rmAssignmentService";

jest.mock("../config/db", () => {
  const db: any = {
    user: { findMany: jest.fn() },
    portalCase: { groupBy: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    rmAllocationCursor: { findUnique: jest.fn(), upsert: jest.fn() },
    rmAllocationEvent: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  db.$transaction.mockImplementation((callback: (tx: typeof db) => unknown) => callback(db));
  return db;
});

const db = prisma as any;

describe("client-consolidated RM allocation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.$transaction.mockImplementation((callback: (tx: typeof db) => unknown) => callback(db));
    db.user.findMany.mockResolvedValue([
      { id: "rm-a", email: "a@example.test", rmProfile: null },
      { id: "rm-b", email: "b@example.test", rmProfile: null },
      { id: "rm-c", email: "c@example.test", rmProfile: { isAvailable: false, isOutOfOffice: false, leaveStartsAt: null, leaveEndsAt: null, maxActiveWorkload: null } },
    ]);
    db.portalCase.groupBy.mockResolvedValue([
      { assignedRmId: "rm-a", _count: { id: 2 } },
      { assignedRmId: "rm-b", _count: { id: 2 } },
    ]);
    db.portalCase.findUnique.mockResolvedValue({ id: "case-1" });
    db.portalCase.update.mockResolvedValue({ id: "case-1" });
    db.rmAllocationCursor.findUnique.mockResolvedValue(null);
    db.rmAllocationCursor.upsert.mockResolvedValue({ poolKey: "GLOBAL", lastSelectedUserId: "rm-a" });
    db.rmAllocationEvent.create.mockResolvedValue({ id: "allocation-1" });
  });

  it("chooses the lowest active workload without district or sector preference", async () => {
    db.portalCase.groupBy.mockResolvedValue([
      { assignedRmId: "rm-a", _count: { id: 4 } },
      { assignedRmId: "rm-b", _count: { id: 1 } },
    ]);

    const selected = await RmAssignmentService.autoAssignRm({
      caseId: "case-1",
      district: "Pune",
      sector: "Health",
    });

    expect(selected).toBe("rm-b");
    expect(db.portalCase.update).toHaveBeenCalledWith({
      where: { id: "case-1" },
      data: { assignedRmId: "rm-b", currentStage: "RM_REVIEW", status: "SUBMITTED" },
    });
    expect(db.rmAllocationEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        selectedRmId: "rm-b",
        ruleVersion: "lowest-active-workload-round-robin-v1",
        tieCandidateIds: ["rm-b"],
        outcome: "ASSIGNED",
      }),
    });
  });

  it("rotates deterministically across RMs tied at the minimum workload", async () => {
    db.rmAllocationCursor.findUnique.mockResolvedValue({ poolKey: "GLOBAL", lastSelectedUserId: "rm-a", sequence: 7n });

    const selected = await RmAssignmentService.autoAssignRm({ caseId: "case-1" });

    expect(selected).toBe("rm-b");
    expect(db.rmAllocationCursor.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { lastSelectedUserId: "rm-b", sequence: { increment: 1n } },
    }));
  });

  it("keeps a submitted case in the unassigned queue when no RM is eligible", async () => {
    db.user.findMany.mockResolvedValue([]);
    db.portalCase.groupBy.mockResolvedValue([]);

    const selected = await RmAssignmentService.autoAssignRm({ caseId: "case-1" });

    expect(selected).toBeNull();
    expect(db.portalCase.update).toHaveBeenCalledWith({
      where: { id: "case-1" },
      data: { assignedRmId: null, currentStage: "RM_ALLOCATION", status: "UNASSIGNED" },
    });
    expect(db.rmAllocationEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ selectedRmId: null, outcome: "UNASSIGNED" }),
    });
  });
});

import prisma from "../config/db";
import {
  RmAssignmentService,
  RmPortfolioTransferError,
} from "../services/rmAssignmentService";

jest.mock("../config/db", () => {
  const db = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    corporateEnquiry: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    governmentPitch: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    portalCase: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    rmAllocationEvent: {
      createMany: jest.fn(),
    },
    auditLog: {
      createMany: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  db.$transaction.mockImplementation((callback: (tx: typeof db) => unknown) => callback(db));
  return db;
});

const mockedPrisma = prisma as any;

describe("RM portfolio transfer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.$transaction.mockImplementation((callback: (tx: typeof mockedPrisma) => unknown) => callback(mockedPrisma));
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: "rm-source",
      roleId: 6,
      role: { code: "RELATIONSHIP_MANAGER" },
    });
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: "rm-target",
      roleId: 6,
      firstName: "Neha",
      lastName: "Patil",
      role: { code: "RELATIONSHIP_MANAGER" },
    });
    mockedPrisma.corporateEnquiry.findMany.mockResolvedValue([
      { id: "enquiry-1" },
      { id: "enquiry-2" },
    ]);
    mockedPrisma.governmentPitch.findMany.mockResolvedValue([{ id: "pitch-1" }]);
    mockedPrisma.portalCase.findMany.mockResolvedValue([]);
    mockedPrisma.corporateEnquiry.updateMany.mockResolvedValue({ count: 2 });
    mockedPrisma.governmentPitch.updateMany.mockResolvedValue({ count: 1 });
    mockedPrisma.portalCase.updateMany.mockResolvedValue({ count: 0 });
    mockedPrisma.auditLog.createMany.mockResolvedValue({ count: 3 });
    mockedPrisma.notification.create.mockResolvedValue({ id: "notification-1" });
  });

  it("transfers every active item, creates one audit row per item, and notifies the recipient in one transaction", async () => {
    const result = await RmAssignmentService.transferPortfolio(
      "rm-source",
      "rm-target",
      "admin-1",
      "RM transferred to another division"
    );

    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.corporateEnquiry.findMany).toHaveBeenCalledWith({
      where: {
        assignedRelationshipManagerId: "rm-source",
        status: { notIn: ["RESOLVED", "REJECTED", "CLOSED"] },
      },
      select: { id: true },
    });
    expect(mockedPrisma.governmentPitch.findMany).toHaveBeenCalledWith({
      where: {
        assignedRelationshipManagerId: "rm-source",
        status: { notIn: ["APPROVED", "REJECTED", "CANCELLED"] },
      },
      select: { id: true },
    });
    expect(mockedPrisma.corporateEnquiry.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { assignedRelationshipManagerId: "rm-target" },
    }));
    expect(mockedPrisma.governmentPitch.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { assignedRelationshipManagerId: "rm-target" },
    }));

    const auditRows = mockedPrisma.auditLog.createMany.mock.calls[0][0].data;
    expect(auditRows).toHaveLength(3);
    expect(auditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: "TRANSFER_RM_PORTFOLIO", entityType: "ENQUIRY", entityId: "enquiry-1" }),
      expect.objectContaining({ action: "TRANSFER_RM_PORTFOLIO", entityType: "ENQUIRY", entityId: "enquiry-2" }),
      expect.objectContaining({ action: "TRANSFER_RM_PORTFOLIO", entityType: "PITCH", entityId: "pitch-1" }),
    ]));
    for (const auditRow of auditRows) {
      expect(auditRow.details).toEqual(expect.objectContaining({
        previousRmId: "rm-source",
        newRmId: "rm-target",
        reason: "RM transferred to another division",
      }));
    }

    expect(mockedPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "rm-target",
        recipientId: "rm-target",
        message: expect.stringContaining("3 active tracked cases"),
      }),
    });
    expect(result).toEqual(expect.objectContaining({
      enquiryCount: 2,
      pitchCount: 1,
      totalCount: 3,
      targetRmName: "Neha Patil",
    }));
  });

  it("aborts the transaction before auditing or notifying if the portfolio changes concurrently", async () => {
    mockedPrisma.corporateEnquiry.updateMany.mockResolvedValue({ count: 1 });

    await expect(RmAssignmentService.transferPortfolio(
      "rm-source",
      "rm-target",
      "admin-1",
      "Scheduled handover"
    )).rejects.toThrow("Portfolio changed during transfer");

    expect(mockedPrisma.auditLog.createMany).not.toHaveBeenCalled();
    expect(mockedPrisma.notification.create).not.toHaveBeenCalled();
  });

  it("rejects an inactive target RM before changing any portfolio records", async () => {
    mockedPrisma.user.findFirst.mockResolvedValue(null);

    await expect(RmAssignmentService.transferPortfolio(
      "rm-source",
      "rm-inactive",
      "admin-1",
      "Scheduled handover"
    )).rejects.toBeInstanceOf(RmPortfolioTransferError);

    expect(mockedPrisma.corporateEnquiry.findMany).not.toHaveBeenCalled();
    expect(mockedPrisma.governmentPitch.findMany).not.toHaveBeenCalled();
    expect(mockedPrisma.auditLog.createMany).not.toHaveBeenCalled();
    expect(mockedPrisma.notification.create).not.toHaveBeenCalled();
  });
});

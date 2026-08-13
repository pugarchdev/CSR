import { ScopedAssignmentService } from "../services/scopedAssignmentService";
import { RmAssignmentService } from "../services/rmAssignmentService";
import { requireActiveOrganization } from "../middlewares/onboardingGuardMiddleware";
import prisma from "../config/db";

// Mock DB for isolated unit & integration testing
jest.mock("../config/db", () => {
  return {
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    districtDncAssignment: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },
    projectDistrictDncAssignment: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    projectAssignment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    userOfficerProfile: {
      update: jest.fn(),
    },
    corporateEnquiry: {
      groupBy: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    governmentPitch: {
      groupBy: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    portalCase: {
      groupBy: jest.fn(),
    },
    rmAllocationCursor: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation((cb) => cb(prisma)),
  };
});

describe("Scoped Role Assignments & Delegation Workflow Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Test 1: One-or-many DNC support links
  // ---------------------------------------------------------------------------
  test("1. Adds a DNC link without deactivating other supporters in the district", async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: "usr-dnc-new",
      accountStatus: "ACTIVE",
      roleId: 5,
      role: { code: "DISTRICT_NODAL_CONSULTANT" },
      officerProfile: { userId: "usr-dnc-new", district: "Nagpur" },
    });

    (prisma.districtDncAssignment.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.districtDncAssignment.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.districtDncAssignment.create as jest.Mock).mockResolvedValue({
      id: "dnc-asgn-100",
      district: "Nagpur",
      dncUserId: "usr-dnc-new",
      isActive: true,
    });

    const result = await ScopedAssignmentService.assignDistrictDnc("Nagpur", "usr-dnc-new", "usr-admin");

    expect(prisma.districtDncAssignment.updateMany).not.toHaveBeenCalled();
    expect(result.dncUserId).toBe("usr-dnc-new");
    expect(result.isActive).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Test 2: Wrong-district DNO denied
  // ---------------------------------------------------------------------------
  test("2. Denies delegating project to a DNO belonging to another district", async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: "proj-1",
      projectCode: "PRJ-PUNE-01",
      title: "Pune School CSR",
      district: "Pune",
      status: "APPROVED",
    });

    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: "usr-dno-mumbai",
      accountStatus: "ACTIVE",
      roleId: 4,
      role: { code: "DISTRICT_NODAL_OFFICER" },
      officerProfile: { district: "Mumbai" },
      userRoles: [],
    });

    await expect(
      ScopedAssignmentService.delegateDistrictDno("proj-1", "usr-dno-mumbai", "usr-dnc-pune")
    ).rejects.toThrow("Wrong District Error");
  });

  // ---------------------------------------------------------------------------
  // Test 3: Wrong-organization designated officer denied
  // ---------------------------------------------------------------------------
  test("3. Denies delegating project to an officer from a different government organization", async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: "proj-dept-1",
      projectCode: "PRJ-DEPT-01",
      title: "Health Infrastructure",
      organizationId: "org-health-dept",
      status: "APPROVED",
    });

    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: "usr-officer-education",
      accountStatus: "ACTIVE",
      organizationId: "org-education-dept",
    });

    await expect(
      ScopedAssignmentService.delegateGovDesignatedOfficer(
        "proj-dept-1",
        "usr-officer-education",
        "usr-gov-admin-health"
      )
    ).rejects.toThrow("Wrong Organization Error");
  });

  // ---------------------------------------------------------------------------
  // Test 4 & 5: JS approval creates both assignments & is idempotent
  // ---------------------------------------------------------------------------
  test("4 & 5. JS Approval creates DNC and Gov Admin assignments atomically and idempotently", async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: "proj-js-1",
      projectCode: "PRJ-THANE-01",
      title: "Thane Water Project",
      district: "Thane",
      organizationId: "org-water-dept",
      status: "UNDER_REVIEW",
    });

    (prisma.districtDncAssignment.findFirst as jest.Mock).mockResolvedValue({
      id: "dnc-thane-1",
      district: "Thane",
      dncUserId: "usr-dnc-thane",
      dncUser: { id: "usr-dnc-thane", accountStatus: "ACTIVE" },
    });

    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: "usr-gov-admin-water",
      email: "water.admin@maharashtra.gov.in",
      organizationId: "org-water-dept",
      accountStatus: "ACTIVE",
      roleId: 7,
    });

    (prisma.projectDistrictDncAssignment.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.projectAssignment.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.project.update as jest.Mock).mockResolvedValue({
      id: "proj-js-1",
      status: "APPROVED",
    });

    const res = await ScopedAssignmentService.executeJsApprovalWorkflow("proj-js-1", "usr-js-secretary");

    expect(res.project.status).toBe("APPROVED");
    expect(res.dncUserId).toBe("usr-dnc-thane");
    expect(res.govAdminUserId).toBe("usr-gov-admin-water");
    expect(prisma.projectAssignment.create).toHaveBeenCalledTimes(2);
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);

    // Test Idempotency: Re-running when assignments already exist
    (prisma.projectDistrictDncAssignment.findUnique as jest.Mock).mockResolvedValue({ id: "pdnc-1" });
    (prisma.projectAssignment.findFirst as jest.Mock).mockResolvedValue({ id: "pasgn-1" });

    jest.clearAllMocks();
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: "proj-js-1",
      projectCode: "PRJ-THANE-01",
      title: "Thane Water Project",
      district: "Thane",
      organizationId: "org-water-dept",
      status: "APPROVED",
    });
    (prisma.districtDncAssignment.findFirst as jest.Mock).mockResolvedValue({
      id: "dnc-thane-1",
      district: "Thane",
      dncUserId: "usr-dnc-thane",
      dncUser: { id: "usr-dnc-thane", accountStatus: "ACTIVE" },
    });
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: "usr-gov-admin-water",
      email: "water.admin@maharashtra.gov.in",
      organizationId: "org-water-dept",
      accountStatus: "ACTIVE",
    });
    (prisma.project.update as jest.Mock).mockResolvedValue({ id: "proj-js-1", status: "APPROVED" });

    const res2 = await ScopedAssignmentService.executeJsApprovalWorkflow("proj-js-1", "usr-js-secretary");
    expect(res2.project.status).toBe("APPROVED");
    // Idempotent: no duplicate assignment creates
    expect(prisma.projectAssignment.create).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Test 6: Missing DNC fails transaction without partial state
  // ---------------------------------------------------------------------------
  test("6. Fails JS approval cleanly when no active DNC exists for district", async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: "proj-gadchiroli-1",
      projectCode: "PRJ-GAD-01",
      title: "Gadchiroli Solar",
      district: "Gadchiroli",
      organizationId: "org-energy-dept",
      status: "UNDER_REVIEW",
    });

    (prisma.districtDncAssignment.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      ScopedAssignmentService.executeJsApprovalWorkflow("proj-gadchiroli-1", "usr-js")
    ).rejects.toThrow("No active District Nodal Consultant (DNC) configured for district 'Gadchiroli'");

    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Test 7: Missing government admin fails cleanly
  // ---------------------------------------------------------------------------
  test("7. Fails JS approval cleanly when no active Government Org Admin exists", async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: "proj-nashik-1",
      projectCode: "PRJ-NAS-01",
      title: "Nashik School",
      district: "Nashik",
      organizationId: "org-empty-dept",
      status: "UNDER_REVIEW",
    });

    (prisma.districtDncAssignment.findFirst as jest.Mock).mockResolvedValue({
      id: "dnc-nashik-1",
      district: "Nashik",
      dncUserId: "usr-dnc-nashik",
      dncUser: { id: "usr-dnc-nashik", accountStatus: "ACTIVE" },
    });

    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      ScopedAssignmentService.executeJsApprovalWorkflow("proj-nashik-1", "usr-js")
    ).rejects.toThrow("No active Government Organization Admin found for department organization 'org-empty-dept'");

    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Test 8: Concurrent & deterministic RM assignment
  // ---------------------------------------------------------------------------
  test("8. Deterministic RM auto-assignment uses lowest active case workload and ignores district preferences", async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: "rm-1",
        email: "rm1@maharashtra.gov.in",
        firstName: "RM",
        lastName: "One",
        officerProfile: { district: "Pune" },
      },
      {
        id: "rm-2",
        email: "rm2@maharashtra.gov.in",
        firstName: "RM",
        lastName: "Two",
        officerProfile: { district: "Mumbai" },
      },
    ]);

    (prisma.portalCase.groupBy as jest.Mock).mockResolvedValue([
      { assignedRmId: "rm-1", _count: { id: 5 } },
      { assignedRmId: "rm-2", _count: { id: 1 } },
    ]);
    (prisma.rmAllocationCursor.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.rmAllocationCursor.upsert as jest.Mock).mockResolvedValue({ poolKey: "GLOBAL" });

    const rmId = await RmAssignmentService.autoAssignRm({ district: "Pune" });
    expect(rmId).toBe("rm-2");
  });

  // ---------------------------------------------------------------------------
  // Test 9 & 10: Onboarding Security Guard
  // ---------------------------------------------------------------------------
  test("9. Onboarding-pending organization is denied business operations", async () => {
    const req: any = {
      user: { id: "usr-1", role: "COMPANY_ADMIN", roleId: "8", organizationId: "org-pending" },
    };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
      id: "org-pending",
      name: "Pending Corp",
      kind: "CSR_COMPANY",
      status: "REGISTERED",
    });

    await requireActiveOrganization(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "ONBOARDING_PENDING" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("10. Active organization is permitted business operations", async () => {
    const req: any = {
      user: { id: "usr-2", role: "COMPANY_ADMIN", roleId: "8", organizationId: "org-active" },
    };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
      id: "org-active",
      name: "Active Corp",
      kind: "CSR_COMPANY",
      status: "ACTIVE",
    });

    await requireActiveOrganization(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

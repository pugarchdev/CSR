import request from "supertest";
import app from "../app";
import prisma from "../config/db";
import jwt from "jsonwebtoken";

describe("Codex v1.0 Domain Controllers & Workspaces End-to-End Verification", () => {
  let superAdminToken: string;
  let planningSecretaryToken: string;
  let jointSecretaryToken: string;
  let dnoToken: string;
  let dncToken: string;
  let rmToken: string;
  let testProject: any;
  let testMilestone: any;
  jest.setTimeout(30000);

  beforeAll(async () => {
    const jwtSecret = process.env.JWT_SECRET || "development_secret_key_12345";

    // 1. Super Admin User (roleId: 1)
    const superAdmin = await prisma.user.upsert({
      where: { email: "test-sa-codex@mahacsr.gov.in" },
      update: { accountStatus: "ACTIVE", isVerified: true },
      create: {
        email: "test-sa-codex@mahacsr.gov.in",
        passwordHash: "dummy-hash",
        firstName: "Test",
        lastName: "SuperAdmin",
        roleId: 1,
        accountStatus: "ACTIVE",
        isVerified: true
      }
    });
    superAdminToken = jwt.sign(
      { id: superAdmin.id, email: superAdmin.email, roleId: 1, roleCode: "SUPER_ADMIN", tokenVersion: 1 },
      jwtSecret,
      { expiresIn: "1h" }
    );

    // 2. Planning Secretary User (roleId: 2)
    const ps = await prisma.user.upsert({
      where: { email: "test-ps-codex@mahacsr.gov.in" },
      update: { accountStatus: "ACTIVE", isVerified: true },
      create: {
        email: "test-ps-codex@mahacsr.gov.in",
        passwordHash: "dummy-hash",
        firstName: "Test",
        lastName: "PlanningSec",
        roleId: 2,
        accountStatus: "ACTIVE",
        isVerified: true
      }
    });
    planningSecretaryToken = jwt.sign(
      { id: ps.id, email: ps.email, roleId: 2, roleCode: "PLANNING_SECRETARY", tokenVersion: 1 },
      jwtSecret,
      { expiresIn: "1h" }
    );

    // 3. Joint Secretary User (roleId: 3)
    const js = await prisma.user.upsert({
      where: { email: "test-js-codex@mahacsr.gov.in" },
      update: { accountStatus: "ACTIVE", isVerified: true },
      create: {
        email: "test-js-codex@mahacsr.gov.in",
        passwordHash: "dummy-hash",
        firstName: "Test",
        lastName: "JointSec",
        roleId: 3,
        accountStatus: "ACTIVE",
        isVerified: true
      }
    });
    jointSecretaryToken = jwt.sign(
      { id: js.id, email: js.email, roleId: 3, roleCode: "JOINT_SECRETARY", tokenVersion: 1 },
      jwtSecret,
      { expiresIn: "1h" }
    );

    // 4. District Nodal Officer User (roleId: 4)
    const dno = await prisma.user.upsert({
      where: { email: "test-dno-codex@mahacsr.gov.in" },
      update: { accountStatus: "ACTIVE", isVerified: true },
      create: {
        email: "test-dno-codex@mahacsr.gov.in",
        passwordHash: "dummy-hash",
        firstName: "Test",
        lastName: "DNO",
        roleId: 4,
        accountStatus: "ACTIVE",
        isVerified: true
      }
    });
    dnoToken = jwt.sign(
      { id: dno.id, email: dno.email, roleId: 4, roleCode: "DISTRICT_NODAL_OFFICER", tokenVersion: 1 },
      jwtSecret,
      { expiresIn: "1h" }
    );

    // 5. District Nodal Consultant User (roleId: 5)
    const dnc = await prisma.user.upsert({
      where: { email: "test-dnc-codex@mahacsr.gov.in" },
      update: { accountStatus: "ACTIVE", isVerified: true },
      create: {
        email: "test-dnc-codex@mahacsr.gov.in",
        passwordHash: "dummy-hash",
        firstName: "Test",
        lastName: "DNC",
        roleId: 5,
        accountStatus: "ACTIVE",
        isVerified: true
      }
    });
    dncToken = jwt.sign(
      { id: dnc.id, email: dnc.email, roleId: 5, roleCode: "DISTRICT_NODAL_CONSULTANT", tokenVersion: 1 },
      jwtSecret,
      { expiresIn: "1h" }
    );

    // 6. Test Organization and Project
    const org = await prisma.organization.upsert({
      where: { registrationNumberHash: "REG-CODEX-TEST-HASH" },
      update: {},
      create: {
        name: "MahaCSR Test District Collectorate",
        kind: "GOVERNMENT_DEPARTMENT",
        status: "ACTIVE",
        district: "Pune",
        registrationNumberHash: "REG-CODEX-TEST-HASH"
      }
    });

    testProject = await prisma.project.create({
      data: {
        title: "Test Solar Electrification Project",
        description: "Test solar electrification project description for validation",
        projectCode: `PRJ-TEST-${Date.now()}`,
        sector: "Energy",
        district: "Pune",
        taluka: "Haveli",
        approvedBudget: 5000000,
        committedAmount: 5000000,
        status: "IN_PROGRESS",
        organizationId: org.id,
        nodalOfficerUserId: dno.id
      }
    });

    testMilestone = await prisma.projectMilestone.create({
      data: {
        projectId: testProject.id,
        name: "Milestone 1: Solar Panel Installation",
        sequenceOrder: 1,
        targetAmount: 2500000,
        status: "IN_PROGRESS",
        verificationStatus: "PENDING_VERIFICATION"
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testMilestone?.id) {
      await prisma.milestoneEvidence.deleteMany({ where: { milestoneId: testMilestone.id } });
      await prisma.projectMilestone.deleteMany({ where: { id: testMilestone.id } });
    }
    if (testProject?.id) {
      await prisma.projectIssue.deleteMany({ where: { projectId: testProject.id } });
      await prisma.projectInspection.deleteMany({ where: { projectId: testProject.id } });
      await prisma.project.deleteMany({ where: { id: testProject.id } });
    }
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "test-sa-codex@mahacsr.gov.in",
            "test-ps-codex@mahacsr.gov.in",
            "test-js-codex@mahacsr.gov.in",
            "test-dno-codex@mahacsr.gov.in",
            "test-dnc-codex@mahacsr.gov.in"
          ]
        }
      }
    });
  });

  describe("1. Strategy & Macro Oversight API (/api/strategy/*)", () => {
    it("should allow Planning Secretary to get state portfolio overview", async () => {
      const res = await request(app)
        .get("/api/strategy/portfolio")
        .set("Authorization", `Bearer ${planningSecretaryToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("summary");
      expect(res.body.data.summary).toHaveProperty("totalCommittedAmount");
      expect(res.body.data.summary).toHaveProperty("activeProjects");
      expect(res.body.data.summary).toHaveProperty("districtCoverageCount");
      expect(res.body.data).toHaveProperty("sectorBreakdown");
      expect(Array.isArray(res.body.data.districtBreakdown)).toBe(true);
    });

    it("should return Schedule VII sector allocations and funding gaps", async () => {
      const res = await request(app)
        .get("/api/strategy/sector-allocations")
        .set("Authorization", `Bearer ${planningSecretaryToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("totalCommitted");
      expect(Array.isArray(res.body.data.sectors)).toBe(true);
      expect(res.body.data.sectors.length).toBeGreaterThan(0);
      expect(res.body.data.sectors[0]).toHaveProperty("name");
      expect(res.body.data.sectors[0]).toHaveProperty("committedAmount");
    });

    it("should return policy impact indicators", async () => {
      const res = await request(app)
        .get("/api/strategy/impact-indicators")
        .set("Authorization", `Bearer ${planningSecretaryToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("overallIndex");
      expect(Array.isArray(res.body.data.indicators)).toBe(true);
      expect(res.body.data.indicators.length).toBeGreaterThan(0);
      expect(res.body.data.indicators[0]).toHaveProperty("title");
      expect(res.body.data.indicators[0]).toHaveProperty("target");
    });
  });

  describe("2. Field Visits & Inspections API (/api/field-visits/*)", () => {
    let createdVisitId: string;

    it("should allow DNC/DNO to record a ground field inspection with GPS coordinates", async () => {
      const res = await request(app)
        .post("/api/field-visits")
        .set("Authorization", `Bearer ${dncToken}`)
        .send({
          projectId: testProject.id,
          visitDate: new Date().toISOString(),
          latitude: 18.5204,
          longitude: 73.8567,
          geoTaggedImages: ["/evidence/solar-photo-1.jpg", "/evidence/solar-photo-2.jpg"],
          remarks: "Verified solar array structural mounting on school roof. Inverter installation active.",
          issuesFound: "Minor cable routing adjustment needed",
          actionRequired: "NGO engineer notified to sleeve conduits"
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("id");
      expect(res.body.data.latitude).toBe(18.5204);
      expect(res.body.data.longitude).toBe(73.8567);
      expect(res.body.data.geoTaggedImages.length).toBe(2);

      createdVisitId = res.body.data.id;
    });

    it("should allow querying field visit by ID", async () => {
      const res = await request(app)
        .get(`/api/field-visits/${createdVisitId}`)
        .set("Authorization", `Bearer ${dnoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdVisitId);
      expect(res.body.data.project.projectCode).toBe(testProject.projectCode);
    });

    it("should return 400 when creating field visit without project ID", async () => {
      const res = await request(app)
        .post("/api/field-visits")
        .set("Authorization", `Bearer ${dncToken}`)
        .send({
          remarks: "Missing project ID"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("3. Project Roadblocks & Issues API (/api/issues/*)", () => {
    let createdIssueId: string;

    it("should allow raising a project issue / grievance", async () => {
      const res = await request(app)
        .post("/api/issues")
        .set("Authorization", `Bearer ${dnoToken}`)
        .send({
          projectId: testProject.id,
          title: "Grid Feasibility Delay from MSEDCL",
          description: "NOC for net metering pending with sub-division officer.",
          severity: "HIGH"
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("id");
      expect(res.body.data.severity).toBe("HIGH");

      createdIssueId = res.body.data.id;
    });

    it("should list issues filtered by project and severity", async () => {
      const res = await request(app)
        .get(`/api/issues?projectId=${testProject.id}&severity=HIGH`)
        .set("Authorization", `Bearer ${jointSecretaryToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((i: any) => i.id === createdIssueId)).toBe(true);
    });
  });

  describe("4. Geotagged Evidence Repository API (/api/evidence/*)", () => {
    it("should allow recording geotagged evidence for milestone", async () => {
      const res = await request(app)
        .post("/api/evidence")
        .set("Authorization", `Bearer ${dncToken}`)
        .send({
          milestoneId: testMilestone.id,
          projectId: testProject.id,
          fileUrl: "/evidence/solar-inverter.jpg",
          title: "Solar Inverter Assembly",
          description: "5kW hybrid inverter physically verified with grounding connection.",
          isGeoTagged: true,
          latitude: 18.5204,
          longitude: 73.8567
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Solar Inverter Assembly");
      expect(res.body.data.isGeoTagged).toBe(true);
    });

    it("should list evidence records for project and milestone", async () => {
      const res = await request(app)
        .get(`/api/evidence?milestoneId=${testMilestone.id}`)
        .set("Authorization", `Bearer ${dnoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].milestoneName).toBe(testMilestone.name);
    });
  });

  describe("5. Platform Admin Operations API (/api/platform-admin/*)", () => {
    it("should allow Super Admin to fetch system health status", async () => {
      const res = await request(app)
        .get("/api/platform-admin/system-health")
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("HEALTHY");
      expect(res.body.data.database.connectionPool).toBe("ACTIVE");
      expect(Array.isArray(res.body.data.integrations)).toBe(true);
    });

    it("should return master data dictionaries with 36 Maharashtra districts", async () => {
      const res = await request(app)
        .get("/api/platform-admin/master-data")
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.districts.length).toBe(36);
      expect(res.body.data.districts).toContain("Pune");
      expect(res.body.data.districts).toContain("Mumbai Suburban");
      expect(res.body.data.districts).toContain("Amravati");
      expect(res.body.data.districts).toContain("Gadchiroli");
    });

    it("should return client-TBD feature flags matrix with safe defaults", async () => {
      const res = await request(app)
        .get("/api/platform-admin/feature-flags")
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const dnoMouFlag = res.body.data.find((f: any) => f.key === "ENABLE_DNO_MOU_SIGN");
      expect(dnoMouFlag).toBeDefined();
      expect(dnoMouFlag.enabled).toBe(false); // Safe default: disabled per Section 10.8
    });
  });
});

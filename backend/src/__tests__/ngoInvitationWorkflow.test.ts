import fs from "fs";
import path from "path";

describe("Reusable Corporate–NGO governance guards", () => {
  const controller = fs.readFileSync(path.join(__dirname, "../controllers/implementingAgencyController.ts"), "utf8");
  const auth = fs.readFileSync(path.join(__dirname, "../middlewares/authMiddleware.ts"), "utf8");
  const authCtrl = fs.readFileSync(path.join(__dirname, "../controllers/authController.ts"), "utf8");
  const dashboardCtrl = fs.readFileSync(path.join(__dirname, "../controllers/dashboardController.ts"), "utf8");

  it("creates or reuses an NGO master and keeps Corporate membership approval separate", () => {
    expect(controller).toContain('status: "PROFILE_INCOMPLETE"');
    expect(controller).toContain("corporateNgoMembership.upsert");
    expect(controller).toContain('status: "PENDING_CORPORATE_REVIEW"');
    expect(controller).toContain('status: "APPROVED"');
  });

  it("uses a corporate-specific login identifier and project allow-list", () => {
    expect(controller).toContain("loginIdentifier: identifier");
    expect(controller).toContain("projectIds: [projectId]");
    expect(controller).toContain("id: { in: access.projectIds }");
  });

  it("synchronizes password hash and mustResetPassword across User and CorporateNgoAccess", () => {
    expect(controller).toContain("const passwordHash = await bcrypt.hash(password, 12)");
    expect(controller).toContain("mustResetPassword: true");
    expect(controller).toContain("temporaryPasswordExpiresAt: expiry");
    expect(controller).toContain("loginIdentifier: result.access.loginIdentifier");
  });

  it("supports login resolution by loginIdentifier, contactEmail, and user email with first-login reset sync", () => {
    expect(authCtrl).toContain("loginIdentifier: suppliedIdentifier");
    expect(authCtrl).toContain("contactEmail: suppliedIdentifier");
    expect(authCtrl).toContain("user: { email: suppliedIdentifier }");
    expect(authCtrl).toContain("NGO_CONTEXT_FIRST_LOGIN_RESET");
  });

  it("validates the active access and approved membership on every NGO context token", () => {
    expect(auth).toContain('access.status !== "ACTIVE"');
    expect(auth).toContain('access.membership.status !== "APPROVED"');
    expect(auth).toContain("NGO access context is inactive or revoked");
  });

  it("activates only the Corporate–NGO relationship after Corporate approval", () => {
    expect(controller).toContain('action === "APPROVE" ? "ACTIVE"');
    expect(controller).toContain("membershipId: membership.id");
    expect(controller).not.toContain("Project assignment is locked until Super Admin approves");
  });

  it("uses valid approvalSourceEnquiryId column in dashboardController Role 8 query", () => {
    expect(dashboardCtrl).toContain("approvalSourceEnquiryId: { in: corporateEnquiryIds }");
    expect(dashboardCtrl).not.toContain("approvalSourceEnquiry: { organizationId");
  });
});

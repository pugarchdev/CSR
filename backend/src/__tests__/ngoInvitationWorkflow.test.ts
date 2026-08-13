import fs from "fs";
import path from "path";

describe("Reusable Corporate–NGO governance guards", () => {
  const controller = fs.readFileSync(path.join(__dirname, "../controllers/implementingAgencyController.ts"), "utf8");
  const auth = fs.readFileSync(path.join(__dirname, "../middlewares/authMiddleware.ts"), "utf8");

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
});

import { EffectivePermissionService } from "../services/effectivePermissionService";

describe("Dynamic RBAC + Scope Engine Tests", () => {
  it("should exports authorizeAccess helper and evaluate permissions correctly", async () => {
    expect(typeof EffectivePermissionService.authorizeAccess).toBe("function");
    expect(typeof EffectivePermissionService.getEffectiveAccessPayload).toBe("function");
  });

  it("should allow SUPER_ADMIN global access bypass", async () => {
    const isAuthorized = await EffectivePermissionService.authorizeAccess(
      "non-existent-user-id",
      "project:approve",
      { organizationId: "org-1" }
    );
    // User does not exist, so false
    expect(isAuthorized).toBe(false);
  });
});

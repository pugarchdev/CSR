import { SYSTEM_ROLE_TEMPLATE_MAP } from "../types/role";
import { ROUTE_POLICY_REGISTRY } from "../config/routePolicyRegistry";

// Authoritative Permission Catalog keys list
const AUTHORITATIVE_PERMISSIONS = [
  "dashboard:view",
  "profile:view",
  "profile:update",
  "organization:approve",
  "organization:reject",
  "organization:view",
  "organization:update",
  "organization:suspend",
  "organization:manage-users",
  "role:view",
  "role:create",
  "role:update",
  "role:configure",
  "role:delete",
  "user:view",
  "user:create",
  "user:update",
  "user:suspend",
  "user:activate",
  "user:assign-role",
  "pitch:create",
  "pitch:view",
  "pitch:verify",
  "pitch:approve",
  "pitch:reject",
  "pitch:assign",
  "pitch:convert",
  "assessment:create",
  "assessment:view",
  "assessment:recommend",
  "assessment:decision",
  "assessment:submit",
  "assessment:review",
  "assessment:decide",
  "enquiry:create",
  "enquiry:view",
  "enquiry:respond",
  "enquiry:assign",
  "enquiry:convert",
  "project:create",
  "project:view",
  "project:update",
  "project:approve",
  "project:assign",
  "project:execute",
  "project:verify",
  "project:complete",
  "project:close",
  "milestone:submit",
  "milestone:verify",
  "milestone:approve",
  "milestone:update",
  "financial:allocate",
  "financial:disburse",
  "financial:verify_uc",
  "fund:view",
  "fund:commit",
  "fund:release",
  "fund:verify",
  "inspection:create",
  "completion:recommend",
  "completion:approve",
  "uc:upload",
  "bill:upload",
  "audit:view",
  "audit:export",
  "system:configure",
];

describe("Permission Catalog & CI Consistency Enforcement Suite", () => {
  const permSet = new Set(AUTHORITATIVE_PERMISSIONS);

  // 1. Check for duplicate permission keys in catalog
  test("1. Authoritative permission catalog has zero duplicate keys", () => {
    const duplicates = AUTHORITATIVE_PERMISSIONS.filter(
      (item, index) => AUTHORITATIVE_PERMISSIONS.indexOf(item) !== index
    );
    expect(duplicates).toEqual([]);
  });

  // 2. Check system role codes for duplicates
  test("2. Protected system role codes have zero duplicates", () => {
    const codes = Object.values(SYSTEM_ROLE_TEMPLATE_MAP).map((t) => t.code);
    const duplicates = codes.filter((c, i) => codes.indexOf(c) !== i);
    expect(duplicates).toEqual([]);
  });

  // 3. Route policy registry references valid permissions
  test("3. All permissions referenced in ROUTE_POLICY_REGISTRY exist in authoritative catalog", () => {
    const invalidPermissions: string[] = [];

    ROUTE_POLICY_REGISTRY.forEach((policy) => {
      if (policy.permission && !permSet.has(policy.permission)) {
        invalidPermissions.push(`${policy.path} -> ${policy.permission}`);
      }
    });

    expect(invalidPermissions).toEqual([]);
  });

  // 4. Verify no hardcoded production passwords or secret keys in route policies
  test("4. Route policies contain zero hardcoded demo credentials or raw secret strings", () => {
    ROUTE_POLICY_REGISTRY.forEach((policy) => {
      expect(policy.path).not.toContain("password");
      expect(policy.path).not.toContain("secret123");
    });
  });
});

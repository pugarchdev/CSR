/**
 * Row-level authorization — buildScopeFilter(user, entity).
 */
import { ROLE_ID } from "../types/role";
import { getRoleIdentity, isSuperAdmin } from "./roleResolver";

export interface ScopePrincipal {
  id: string;
  role?: string | number | null;
  roleId?: number | string | null;
  organizationId?: string | null;
  assignedDistrict?: string | null;
}

export type ScopableEntity =
  | "corporateEnquiry"
  | "governmentPitch"
  | "convergenceProject"
  | "projectAssignment"
  | "feasibilityAssessment";

export type ScopeFilter = Record<string, unknown>;

const NO_ACCESS: ScopeFilter = { id: "__no_access__" };

const STATE_WIDE_ROLE_IDS: number[] = [
  ROLE_ID.SUPER_ADMIN,
  ROLE_ID.PLANNING_SECRETARY,
  ROLE_ID.JOINT_SECRETARY,
  ROLE_ID.RELATIONSHIP_MANAGER,
];

const DISTRICT_SCOPED_ROLE_IDS: number[] = [
  ROLE_ID.DISTRICT_NODAL_OFFICER,
  ROLE_ID.DISTRICT_NODAL_CONSULTANT,
];

export function buildScopeFilter(
  user: ScopePrincipal | null | undefined,
  entity: ScopableEntity
): ScopeFilter {
  if (!user) return NO_ACCESS;

  if (isSuperAdmin(user)) return {};

  const identity = getRoleIdentity(user);

  if (identity && STATE_WIDE_ROLE_IDS.includes(identity)) {
    return {};
  }

  if (identity && DISTRICT_SCOPED_ROLE_IDS.includes(identity)) {
    const district = user.assignedDistrict;
    if (!district) return NO_ACCESS;
    switch (entity) {
      case "corporateEnquiry":
        return { preferredDistricts: { has: district } };
      case "governmentPitch":
      case "convergenceProject":
        return { district };
      case "projectAssignment":
        return { assignedToId: user.id };
      default:
        return { district };
    }
  }

  return {};
}

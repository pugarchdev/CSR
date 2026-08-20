import prisma from "../config/db";

/**
 * District Scope Service
 * 
 * Provides query helpers for the Collectorate → ZP → MNC hierarchy.
 * 
 * - Collector: district-wide visibility across all MAIN gov orgs
 * - ZP / MNC: org-scoped visibility (own org + child sub-departments)
 */

const MAIN_GOV_TYPES = ["COLLECTORATE", "ZILLA_PARISHAD", "MUNICIPAL_CORPORATION"];

/**
 * Check if an organization is the Collectorate (district boss).
 */
export function isCollectorOrg(org: { governmentType?: string | null; governmentLevel?: string | null } | null): boolean {
  return org?.governmentType === "COLLECTORATE";
}

/**
 * Check if an organization is a main-level ZP or MNC (not a sub-department).
 */
export function isMainDepartmentOrg(org: { governmentType?: string | null; governmentLevel?: string | null } | null): boolean {
  return MAIN_GOV_TYPES.includes(org?.governmentType || "");
}

/**
 * Get a human-readable title for the government organization head.
 */
export function getGovHeadTitle(governmentType: string | null | undefined): string {
  switch (governmentType) {
    case "COLLECTORATE": return "District Collector";
    case "ZILLA_PARISHAD": return "CEO, Zilla Parishad";
    case "MUNICIPAL_CORPORATION": return "Municipal Commissioner";
    case "SUB_DEPARTMENT": return "Department Head";
    case "STATE_CSR_CELL": return "State Nodal Officer";
    default: return "Government Officer";
  }
}

/**
 * For Collector: Get all MAIN-level government organization IDs in the same district.
 * Includes Collectorate, ZP, and MNC organizations and their child sub-departments.
 */
export async function getDistrictOrganizationIds(district: string): Promise<string[]> {
  const mainOrgs = await prisma.organization.findMany({
    where: {
      kind: "GOVERNMENT_DEPARTMENT",
      district: { equals: district, mode: "insensitive" },
      status: { notIn: ["REJECTED", "SUSPENDED"] },
      deletedAt: null,
    },
    select: { id: true },
  });

  const mainOrgIds = mainOrgs.map(o => o.id);

  // Also include child sub-departments of these main orgs
  const childOrgs = await prisma.organization.findMany({
    where: {
      parentOrganizationId: { in: mainOrgIds },
      deletedAt: null,
    },
    select: { id: true },
  });

  return [...new Set([...mainOrgIds, ...childOrgs.map(o => o.id)])];
}

/**
 * For Collector: Get main org breakdown by governmentType in the district.
 * Returns { collectorate: org[], zp: org[], mnc: org[] }
 */
export async function getDistrictOrgBreakdown(district: string) {
  const mainOrgs = await prisma.organization.findMany({
    where: {
      kind: "GOVERNMENT_DEPARTMENT",
      district: { equals: district, mode: "insensitive" },
      status: { notIn: ["REJECTED", "SUSPENDED"] },
      deletedAt: null,
    },
    select: { id: true, name: true, governmentType: true },
  });

  return {
    collectorate: mainOrgs.filter(o => o.governmentType === "COLLECTORATE"),
    zp: mainOrgs.filter(o => o.governmentType === "ZILLA_PARISHAD"),
    mnc: mainOrgs.filter(o => o.governmentType === "MUNICIPAL_CORPORATION"),
    all: mainOrgs,
  };
}

/**
 * For Collector: Build a Prisma project filter spanning ALL government orgs
 * in their district (Collectorate + ZP + MNC + sub-departments).
 */
export async function getDistrictProjectFilter(district: string) {
  const orgIds = await getDistrictOrganizationIds(district);
  return {
    OR: [
      // Projects directly under any district gov org
      ...(orgIds.length > 0 ? [
        { organizationId: { in: orgIds } },
        { parentOrganizationId: { in: orgIds } },
        { departmentOrganizationId: { in: orgIds } },
      ] : []),
      // Fallback: any project located in the district
      { district: { equals: district, mode: "insensitive" } },
    ],
  };
}

/**
 * For ZP / MNC: Build a Prisma project filter scoped to own organization tree only.
 */
export async function getOrgProjectFilter(orgId: string) {
  const childOrgs = await prisma.organization.findMany({
    where: { parentOrganizationId: orgId, deletedAt: null },
    select: { id: true }
  });
  const allOrgIds = [orgId, ...childOrgs.map(c => c.id)];

  return {
    OR: [
      { organizationId: { in: allOrgIds } },
      { parentOrganizationId: { in: allOrgIds } },
      { departmentOrganizationId: { in: allOrgIds } },
    ],
  };
}

/**
 * For Collector: Build a Prisma pitch filter spanning all district orgs.
 */
export async function getDistrictPitchFilter(district: string) {
  const orgIds = await getDistrictOrganizationIds(district);
  return {
    OR: [
      { organizationId: { in: orgIds } },
      { parentOrganizationId: { in: orgIds } },
      { departmentOrganizationId: { in: orgIds } },
      { departmentId: { in: orgIds } },
    ],
  };
}

/**
 * For ZP / MNC: Build a Prisma pitch filter scoped to own org tree.
 */
export function getOrgPitchFilter(orgId: string) {
  return {
    OR: [
      { organizationId: orgId },
      { parentOrganizationId: orgId },
      { departmentOrganizationId: orgId },
      { departmentId: orgId },
    ],
  };
}

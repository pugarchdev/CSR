/**
 * Unified Enterprise Dashboard Routing.
 *
 * Enterprise portals (AWS, Salesforce, Google Cloud, Jira) route ALL authenticated
 * users to a single, unified landing endpoint: `/dashboard`.
 *
 * The unified DashboardEngine on `/dashboard` fetches `GET /api/dashboard/summary`
 * and dynamically renders KPI metrics, action feeds, quick actions, and sidebar
 * navigation unlocked by the user's permissions.
 *
 * This eliminates persona-specific route fragmentation and works identically for
 * all 9 System Roles and any infinite number of Custom Dynamic Roles.
 */

export interface RoutableIdentity {
  roleNumericId?: number | null;
  roleSlug?: string | null;
  role?: string | null;
}

/**
 * Universal Dashboard Resolver — Enterprise Single-Route Standard.
 * Returns `/dashboard` for all authenticated user identities.
 */
export function resolveDashboardPath(
  _identity?: RoutableIdentity | null,
  _fallback = "/dashboard"
): string {
  return "/dashboard";
}

/**
 * Helper to check if a pathname is any dashboard route (legacy or unified).
 */
export function isDashboardRoute(pathname: string): boolean {
  return (
    pathname === "/dashboard" ||
    pathname.endsWith("/dashboard") ||
    pathname.includes("/dashboard/")
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Area authorization (which route-prefix "areas" an identity may enter).
// ────────────────────────────────────────────────────────────────────────────

interface AreaRule {
  prefixes: string[];
  allow: string[] | null;
}

const AREA_RULES: AreaRule[] = [
  // Persona feature areas — gated to the matching canonical identities.
  { prefixes: ["/ngo"], allow: ["ngo-admin", "SUPER_ADMIN"] },
  { prefixes: ["/company"], allow: ["company-admin", "corporate-user", "CORPORATE_USER", "SUPER_ADMIN"] },
  { prefixes: ["/partner"], allow: ["corporate-user", "company-admin", "CORPORATE_USER", "SUPER_ADMIN"] },
  { prefixes: ["/beneficiary", "/department"], allow: ["government-officer", "GOVERNMENT_OFFICER", "SUPER_ADMIN"] },
  { prefixes: ["/rm"], allow: ["relationship-manager", "joint-secretary", "planning-secretary", "SUPER_ADMIN"] },
  { prefixes: ["/js"], allow: ["joint-secretary", "planning-secretary", "SUPER_ADMIN"] },
  { prefixes: ["/secretary"], allow: ["planning-secretary", "SUPER_ADMIN"] },
  { prefixes: ["/nodal"], allow: ["district-nodal-officer", "district-nodal-consultant", "joint-secretary", "planning-secretary", "SUPER_ADMIN"] },
  { prefixes: ["/agency"], allow: ["implementing-agency-user", "corporate-user", "CORPORATE_USER", "SUPER_ADMIN"] },
  { prefixes: ["/admin"], allow: ["SUPER_ADMIN"] },
  { prefixes: ["/organization"], allow: ["ngo-admin", "company-admin", "corporate-user", "government-officer", "CORPORATE_USER", "GOVERNMENT_OFFICER", "SUPER_ADMIN"] },

  // Shared authenticated areas — open to any logged-in user.
  {
    prefixes: [
      "/dashboard", "/onboarding", "/queries", "/csr-projects", "/payments",
      "/fund-releases", "/reports", "/audit-logs", "/profile", "/settings",
      "/chat", "/analytics", "/grievances", "/convergence-projects", "/projects",
      "/public-development-needs", "/pitch-development-need",
      "/partner-with-maharashtra", "/track", "/enquiries", "/pitches",
      "/interests", "/assessments", "/companies", "/communications",
      "/escalations", "/decisions", "/inspections", "/handover", "/agencies",
      "/requirements", "/nodal-appointments", "/helpdesk",
    ],
    allow: null,
  },
];

export function buildIdentityTokens(input: {
  roleSlug?: string | null;
  role?: string | null;
  roleDetailSlugs?: Array<string | null | undefined>;
}): string[] {
  const tokens = new Set<string>();
  if (input.roleSlug) tokens.add(input.roleSlug);
  if (input.role) tokens.add(input.role);
  (input.roleDetailSlugs ?? []).forEach((s) => {
    if (s) tokens.add(s);
  });
  return Array.from(tokens);
}

export function canAccessArea(
  pathname: string,
  identityTokens: string[],
  isAdmin = false
): boolean {
  if (isAdmin) return true;
  if (identityTokens.includes("SUPER_ADMIN") || identityTokens.includes("super-admin")) {
    return true;
  }

  const rule = AREA_RULES.find((r) =>
    r.prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"))
  );

  if (!rule) return true;
  if (rule.allow === null) return true;
  return rule.allow.some((token) => identityTokens.includes(token));
}

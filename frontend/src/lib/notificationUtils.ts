

export interface NotificationLike {
  id?: string;
  title?: string;
  message?: string;
  actionUrl?: string;
  actionButtonUrl?: string;
}

/**
 * Extracts entity names in quotes, e.g. "PugArch Technologies Pvt Ltd" or “PugArch”
 */
export function extractQuotedEntity(text: string): string | null {
  if (!text) return null;
  const match = text.match(/["“]([^"”]+)["”]/);
  if (match && match[1]?.trim()) {
    return match[1].trim();
  }
  return null;
}

/**
 * Extracts tracking IDs like CE-2026-001, GP-2026-001, REQ-2026-9999
 */
export function extractTrackingId(text: string): string | null {
  if (!text) return null;
  const match = text.match(/\b([A-Z]{2,4}-\d{4,8}-[A-Z0-9]+)\b/i);
  return match ? match[1].trim() : null;
}

/**
 * Extracts UUID strings from text or URL paths
 */
export function extractUuid(text: string): string | null {
  if (!text) return null;
  const match = text.match(/\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i);
  return match ? match[1].trim() : null;
}

/**
 * Safely parses pathname and searchParams from a relative or absolute URL string
 */
function parseRawUrl(rawUrl: string): { pathname: string; queryParams: URLSearchParams } {
  if (!rawUrl) return { pathname: "", queryParams: new URLSearchParams() };
  try {
    const dummyBase = "https://mahacsr.internal";
    const parsed = new URL(
      rawUrl.startsWith("/")
        ? `${dummyBase}${rawUrl}`
        : rawUrl.startsWith("http")
        ? rawUrl
        : `${dummyBase}/${rawUrl}`
    );
    return { pathname: parsed.pathname, queryParams: parsed.searchParams };
  } catch {
    const [pathname, search] = rawUrl.split("?");
    return { pathname: pathname || "", queryParams: new URLSearchParams(search || "") };
  }
}

/**
 * Resolves a notification object to its canonical, working frontend route with deep-linking parameters.
 * Automatically extracts entity names, organization IDs, and section anchors to enable dynamic element highlighting.
 */
export function resolveNotificationUrl(
  n: NotificationLike,
  isAdmin: boolean = false,
  _userRole?: string | null
): string {
  const title = (n.title || "").toLowerCase();
  const rawMessage = n.message || "";
  const message = rawMessage.toLowerCase();
  const rawUrl = (n.actionUrl || n.actionButtonUrl || "").trim();

  const { pathname: rawPath, queryParams } = parseRawUrl(rawUrl);

  // Extract entity identifiers from notification content and URL
  const quotedEntity = extractQuotedEntity(n.title || "") || extractQuotedEntity(rawMessage);
  const trackingId = queryParams.get("trackingId") || extractTrackingId(rawMessage) || extractTrackingId(n.title || "");
  const uuidInPath = extractUuid(rawPath);
  const orgId = queryParams.get("orgId") || queryParams.get("organizationId") || uuidInPath || queryParams.get("id");

  // Helper to build search params without duplicate keys
  const buildUrlWithParams = (basePath: string, params: Record<string, string | null | undefined>): string => {
    const search = new URLSearchParams();
    // Copy existing relevant query params from rawUrl first
    queryParams.forEach((val, key) => {
      if (val && !search.has(key)) search.set(key, val);
    });
    // Set or override computed params
    Object.entries(params).forEach(([key, val]) => {
      if (val && String(val).trim()) {
        search.set(key, String(val).trim());
      }
    });
    const qs = search.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const isClarificationAlert =
    title.includes("clarification") ||
    message.includes("clarification") ||
    message.includes("remarks:") ||
    message.includes("action required");

  // 1. Onboarding notifications
  const isOnboarding =
    title.includes("onboarding") ||
    message.includes("onboarding") ||
    title.includes("organization") ||
    title.includes("company") ||
    title.includes("department") ||
    rawPath.includes("onboarding") ||
    rawPath.includes("organization");

  if (isOnboarding) {
    if (isAdmin) {
      return buildUrlWithParams("/admin/onboarding-approvals", {
        orgId: orgId || undefined,
        highlight: quotedEntity || undefined,
        search: quotedEntity || undefined,
      });
    }

    // For applicant/organization user
    if (isClarificationAlert) {
      return buildUrlWithParams("/organization/onboarding/status", {
        highlight: "clarification",
      });
    }
    return "/organization/onboarding/status";
  }

  // 2. Corporate Enquiry notifications
  const isEnquiry =
    title.includes("enquiry") ||
    message.includes("enquiry") ||
    rawPath.startsWith("/corporate-enquiry") ||
    rawPath.startsWith("/partner/enquiries") ||
    rawPath.startsWith("/enquiries");

  if (isEnquiry) {
    if (!isAdmin && trackingId) {
      return `/track?trackingId=${encodeURIComponent(trackingId)}`;
    }
    return buildUrlWithParams("/enquiries", {
      id: queryParams.get("id") || uuidInPath || undefined,
      trackingId: trackingId || undefined,
      highlight: quotedEntity || trackingId || undefined,
      search: quotedEntity || trackingId || undefined,
    });
  }

  // 3. Pitch / Development Need notifications
  const isPitch =
    title.includes("pitch") ||
    message.includes("pitch") ||
    rawPath.startsWith("/government-pitch") ||
    rawPath.startsWith("/pitches");

  if (isPitch) {
    if (!isAdmin && trackingId) {
      return `/track?trackingId=${encodeURIComponent(trackingId)}`;
    }
    return buildUrlWithParams("/pitches", {
      id: queryParams.get("id") || uuidInPath || undefined,
      trackingId: trackingId || undefined,
      highlight: quotedEntity || trackingId || undefined,
      search: quotedEntity || trackingId || undefined,
    });
  }

  // 4. Grievance notifications
  const isGrievance =
    title.includes("grievance") ||
    message.includes("grievance") ||
    rawPath.startsWith("/grievances");

  if (isGrievance) {
    return buildUrlWithParams("/grievances", {
      id: queryParams.get("id") || uuidInPath || undefined,
      highlight: quotedEntity || undefined,
      search: quotedEntity || undefined,
    });
  }

  // 5. Project / Convergence Project notifications
  const isProject =
    title.includes("project") ||
    message.includes("project") ||
    rawPath.startsWith("/projects") ||
    rawPath.startsWith("/convergence-projects");

  if (isProject) {
    return buildUrlWithParams("/convergence-projects", {
      id: queryParams.get("id") || uuidInPath || undefined,
      highlight: quotedEntity || undefined,
      search: quotedEntity || undefined,
    });
  }

  // 6. Handle rawUrl while guarding non-admin users from admin routes
  if (rawUrl && rawUrl.startsWith("/")) {
    if (!isAdmin && (rawUrl.startsWith("/admin") || rawUrl.includes("/admin/"))) {
      if (rawUrl.includes("onboarding") || rawUrl.includes("organization")) {
        return isClarificationAlert
          ? "/organization/onboarding/status?highlight=clarification"
          : "/organization/onboarding/status";
      }
      if (rawUrl.includes("enquiry")) return "/enquiries";
      if (rawUrl.includes("pitch")) return "/pitches";
      if (rawUrl.includes("project")) return "/convergence-projects";
      return "/organization/onboarding/status";
    }

    if (isAdmin && rawUrl === "/organization/onboarding") {
      return buildUrlWithParams("/admin/onboarding-approvals", {
        orgId: orgId || undefined,
        highlight: quotedEntity || undefined,
        search: quotedEntity || undefined,
      });
    }

    // Preserve any existing parameters on rawUrl
    return rawUrl;
  }

  return isAdmin
    ? buildUrlWithParams("/admin/onboarding-approvals", {
        highlight: quotedEntity || undefined,
        search: quotedEntity || undefined,
      })
    : isClarificationAlert
    ? "/organization/onboarding/status?highlight=clarification"
    : "/organization/onboarding/status";
}

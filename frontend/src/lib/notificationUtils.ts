

export interface NotificationLike {
  id?: string;
  title?: string;
  message?: string;
  actionUrl?: string;
  actionButtonUrl?: string;
}

/**
 * Resolves a notification object to its canonical, working frontend route.
 * Prevents non-existent routes (like /corporate-enquiry/CE-...) from throwing logged-in users out to 404/logged-out pages.
 */
export function resolveNotificationUrl(
  n: NotificationLike,
  isAdmin: boolean = false,
  _userRole?: string | null
): string {
  const title = (n.title || "").toLowerCase();
  const message = (n.message || "").toLowerCase();
  const rawUrl = (n.actionUrl || n.actionButtonUrl || "").trim();

  // 1. Normalize backend routes that point to non-existent endpoints
  if (rawUrl.startsWith("/corporate-enquiry") || rawUrl.startsWith("/partner/enquiries")) {
    return "/enquiries";
  }
  if (rawUrl.startsWith("/government-pitch")) {
    return "/pitches";
  }

  // 2. Onboarding notifications
  if (title.includes("onboarding") || message.includes("onboarding")) {
    if (isAdmin) {
      return "/admin/onboarding-approvals";
    }
    return "/organization/onboarding/details";
  }

  // 3. Corporate Enquiry notifications
  if (title.includes("enquiry") || message.includes("enquiry") || title.includes("corporate enquiry")) {
    return "/enquiries";
  }

  // 4. Pitch / Development Need notifications
  if (title.includes("pitch") || message.includes("pitch")) {
    return "/pitches";
  }

  // 5. Grievance notifications
  if (title.includes("grievance") || message.includes("grievance")) {
    return "/grievances";
  }

  // 6. Project / Convergence Project notifications
  if (title.includes("project") || message.includes("project")) {
    return "/convergence-projects";
  }

  // 8. Handle rawUrl while guarding non-admin users from admin routes
  if (rawUrl && rawUrl.startsWith("/")) {
    if (!isAdmin && (rawUrl.startsWith("/admin") || rawUrl.includes("/admin/"))) {
      if (rawUrl.includes("onboarding") || rawUrl.includes("organization")) {
        return "/organization/onboarding/status";
      }
      if (rawUrl.includes("enquiry")) return "/enquiries";
      if (rawUrl.includes("pitch")) return "/pitches";
      if (rawUrl.includes("project")) return "/convergence-projects";
      return "/organization/onboarding/status";
    }
    if (isAdmin && rawUrl === "/organization/onboarding") {
      return "/admin/onboarding-approvals";
    }
    return rawUrl;
  }

  return isAdmin ? "/admin/onboarding-approvals" : "/organization/onboarding/status";
}

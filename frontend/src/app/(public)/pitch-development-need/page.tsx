"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Public anonymous government-pitch creation has been REMOVED.
 * Pitches are now filed from the authenticated department dashboard only,
 * and only after the organization's onboarding is verified (backend enforces
 * this via requireApprovedOrganization on POST /government-pitches).
 *
 * This route is kept as a redirect shim so existing links/bookmarks still work:
 *  - logged-in government user → dashboard pitch form
 *  - anyone else               → login, then bounced back here
 */
export default function PitchDevelopmentNeedPage() {
  const router = useRouter();

  useEffect(() => {
    let isLoggedIn = false;
    try {
      isLoggedIn = Boolean(localStorage.getItem("accessToken"));
    } catch {
      isLoggedIn = false;
    }

    if (isLoggedIn) {
      let isRM = false;
      let isGovtOrAdmin = false;
      try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        const role = String(u.role?.code || u.role?.name || u.role || "").toUpperCase();
        const roleId = Number(u.roleId || u.roleNumericId || u.role?.id || 0);
        isRM = role.includes("RELATIONSHIP_MANAGER") || role.includes("RELATIONSHIP MANAGER") || roleId === 6;
        isGovtOrAdmin = role.includes("GOVT") || role.includes("GOVERNMENT") || role.includes("ADMIN") || role.includes("SECRETARY") || [1, 2, 3, 7].includes(roleId);
      } catch {}

      if (isRM) {
        router.replace("/pitches");
      } else if (isGovtOrAdmin) {
        router.replace("/pitches");
      } else {
        router.replace("/marketplace");
      }
    } else {
      router.replace("/login?next=/pitch-development-need");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f6f8fb] text-slate-600">
      <Loader2 size={28} className="animate-spin text-blue-900" />
      <p className="text-sm">Redirecting you to sign in…</p>
    </div>
  );
}

import { useAuthStore } from "@/store/authStore";
import { NAVIGATION_MANIFEST, getNavItemForRoute, isNavItemAllowed } from "./navigationManifest";

export interface PageDef {
  slug: string;
  label: string;
  route: string;
  group: string;
}

/**
 * Derived from the authoritative NAVIGATION_MANIFEST.
 */
export const PAGE_REGISTRY: PageDef[] = NAVIGATION_MANIFEST.map((item) => ({
  slug: item.id,
  label: item.label,
  route: item.route,
  group: item.section
}));

export const pageViewKey = (slug: string): string => `page:${slug}:view`;

export function resolvePageForPath(pathname: string): PageDef | null {
  const item = getNavItemForRoute(pathname);
  if (!item) return null;
  return {
    slug: item.id,
    label: item.label,
    route: item.route,
    group: item.section
  };
}

export function pagePermissionForPath(pathname: string): string | null {
  const page = resolvePageForPath(pathname);
  return page ? pageViewKey(page.slug) : null;
}

/**
 * Strict fail-closed visibility check for navigation items.
 */
export function isNavItemVisible(
  href: string,
  hasPermission: (permission: string) => boolean
): boolean {
  const store = useAuthStore.getState();

  // 1. Unauthenticated or loading error -> fail closed (hide nav item)
  if (!store.isAuthenticated || store.fetchStatus === "ERROR") return false;

  // 2. Super Admin bypass
  if (store.isAdmin) return true;

  // 3. Find matching manifest entry
  const navItem = getNavItemForRoute(href);
  if (!navItem) return false;

  const userRoles = store.roles?.length > 0 ? store.roles : (store.user?.role ? [store.user.role] : []);
  return isNavItemAllowed(navItem, hasPermission, store.isAdmin, userRoles);
}

export function pageSlugForPath(pathname: string): string | null {
  const page = resolvePageForPath(pathname);
  return page ? page.slug : null;
}

export const findPageByPath = resolvePageForPath;

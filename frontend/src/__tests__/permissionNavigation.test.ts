import { NAVIGATION_MANIFEST, isNavItemAllowed, getNavItemForRoute } from "../lib/navigationManifest";
import { isNavItemVisible } from "../lib/pageRegistry";
import { useAuthStore } from "../store/authStore";

/**
 * Lightweight verification suite for Navigation Manifest & Route Guarding logic.
 */
export function verifyPermissionNavigationLogic() {
  const mockHasPermission = (permission: string) => {
    const state = useAuthStore.getState();
    return state.hasPermission(permission);
  };

  // Test 1: Navigation Manifest item resolution
  const enquiriesItem = getNavItemForRoute("/enquiries");
  if (!enquiriesItem) throw new Error("Manifest item for /enquiries not found");

  // Test 2: Access check with user permissions
  useAuthStore.setState({
    permissions: ["enquiry:view"],
    isAdmin: false,
    fetchStatus: "SUCCESS",
    isAuthenticated: true
  });

  const isAllowed = isNavItemAllowed(enquiriesItem, mockHasPermission, false);
  if (!isAllowed) throw new Error("Expected /enquiries to be allowed with enquiry:view permission");

  // Test 3: Access check with missing permissions
  const rolesItem = getNavItemForRoute("/admin/roles-permissions");
  if (rolesItem && isNavItemAllowed(rolesItem, mockHasPermission, false)) {
    throw new Error("Expected /admin/roles-permissions to be denied when missing role permissions");
  }

  // Test 4: Super Admin bypass
  useAuthStore.setState({ isAdmin: true });
  NAVIGATION_MANIFEST.forEach((item) => {
    if (item.id === "organization-onboarding" || item.id === "sub-logins") return;
    if (!isNavItemAllowed(item, mockHasPermission, true)) {
      throw new Error(`Expected Super Admin to be allowed on ${item.route}`);
    }
  });

  return { success: true, totalManifestItems: NAVIGATION_MANIFEST.length };
}

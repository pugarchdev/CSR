import { NAVIGATION_MANIFEST, isNavItemAllowed, getNavItemForRoute } from "../lib/navigationManifest";
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

  // Test 5: Meetings is denied for standard non-RM users lacking meeting:schedule
  useAuthStore.setState({
    permissions: ["dashboard:view", "enquiry:view", "pitch:view", "project:view"],
    isAdmin: false,
    fetchStatus: "SUCCESS",
    isAuthenticated: true
  });
  const meetingsItem = getNavItemForRoute("/meetings");
  if (!meetingsItem) throw new Error("Manifest item for /meetings not found");
  if (isNavItemAllowed(meetingsItem, mockHasPermission, false, ["ROLE_8"])) {
    throw new Error("Expected /meetings to be denied for Corporate User (ROLE_8) without meeting:schedule");
  }
  if (isNavItemAllowed(meetingsItem, mockHasPermission, false, ["COMPANY_ADMIN"])) {
    throw new Error("Expected /meetings to be denied for COMPANY_ADMIN without meeting:schedule");
  }
  if (isNavItemAllowed(meetingsItem, mockHasPermission, false, ["CSR_COMPANY_ADMIN"])) {
    throw new Error("Expected /meetings to be denied for CSR_COMPANY_ADMIN without meeting:schedule");
  }
  if (isNavItemAllowed(meetingsItem, mockHasPermission, false, ["ROLE_7"])) {
    throw new Error("Expected /meetings to be denied for Government Officer (ROLE_7) without meeting:schedule");
  }
  if (isNavItemAllowed(meetingsItem, mockHasPermission, false, ["GOVERNMENT_OFFICER"])) {
    throw new Error("Expected /meetings to be denied for GOVERNMENT_OFFICER without meeting:schedule");
  }
  if (isNavItemAllowed(meetingsItem, mockHasPermission, false, ["ROLE_4"])) {
    throw new Error("Expected /meetings to be denied for District Nodal Officer (ROLE_4) without meeting:schedule");
  }
  if (isNavItemAllowed(meetingsItem, mockHasPermission, false, ["DISTRICT_NODAL_OFFICER"])) {
    throw new Error("Expected /meetings to be denied for DISTRICT_NODAL_OFFICER without meeting:schedule");
  }
  if (isNavItemAllowed(meetingsItem, mockHasPermission, false, ["ROLE_5"])) {
    throw new Error("Expected /meetings to be denied for District Nodal Consultant (ROLE_5) without meeting:schedule");
  }
  if (isNavItemAllowed(meetingsItem, mockHasPermission, false, ["NGO_ADMIN"])) {
    throw new Error("Expected /meetings to be denied for NGO_ADMIN without meeting:schedule");
  }

  // Test 6: Meetings is allowed for RM roles and Apex State Authorities
  if (!isNavItemAllowed(meetingsItem, mockHasPermission, false, ["ROLE_6"])) {
    throw new Error("Expected /meetings to be allowed for RM (ROLE_6)");
  }
  if (!isNavItemAllowed(meetingsItem, mockHasPermission, false, ["RELATIONSHIP_MANAGER"])) {
    throw new Error("Expected /meetings to be allowed for RELATIONSHIP_MANAGER");
  }
  if (!isNavItemAllowed(meetingsItem, mockHasPermission, false, ["CSR_RELATIONSHIP_MANAGER"])) {
    throw new Error("Expected /meetings to be allowed for CSR_RELATIONSHIP_MANAGER");
  }
  if (!isNavItemAllowed(meetingsItem, mockHasPermission, false, ["ROLE_3"])) {
    throw new Error("Expected /meetings to be allowed for Joint Secretary (ROLE_3)");
  }

  // Test 7: Meetings is allowed for users holding meeting:schedule permission
  const mockPermWithMeeting = (p: string) => p === "meeting:schedule" || p === "dashboard:view";
  if (!isNavItemAllowed(meetingsItem, mockPermWithMeeting, false, ["CUSTOM_ROLE"])) {
    throw new Error("Expected /meetings to be allowed for role possessing meeting:schedule permission");
  }

  return { success: true, totalManifestItems: NAVIGATION_MANIFEST.length, verifiedTestCases: 7 };
}

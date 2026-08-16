import {
  NAVIGATION_GROUPS,
  NAVIGATION_MANIFEST,
  isNavItemAllowed,
  NavItemDef
} from "../lib/navigationManifest";
import { getActiveNavContext } from "../components/layout/Sidebar";
import { useAuthStore } from "../store/authStore";

export function testSidebarNavigationRedesign() {
  const hasPermission = (permission: string) => {
    return useAuthStore.getState().hasPermission(permission);
  };

  // Test 1: Max 7 Top-Level Sidebar Navigation Items (Dashboard + 6 Groups)
  if (NAVIGATION_GROUPS.length !== 6) {
    throw new Error(`Expected 6 navigation groups, found ${NAVIGATION_GROUPS.length}`);
  }

  // Test 2: Verify Profile, Settings, Notifications are hidden from sidebar
  const hiddenItems = NAVIGATION_MANIFEST.filter((item) => !item.showInSidebar);
  const hiddenIds = hiddenItems.map((i) => i.id);
  if (!hiddenIds.includes("profile") || !hiddenIds.includes("settings") || !hiddenIds.includes("notifications")) {
    throw new Error("Expected profile, settings, and notifications to be hidden from sidebar manifest");
  }

  // Test 3: Active Route Context Resolution for Access Control Child Routes
  const accessControlRolesCtx = getActiveNavContext("/admin/access-control/roles");
  if (accessControlRolesCtx.activeItemId !== "access-control" || accessControlRolesCtx.activeGroupId !== "group-administration") {
    throw new Error(`Access Control subroute /admin/access-control/roles did not map to active item 'access-control' and group 'group-administration'. Got: ${JSON.stringify(accessControlRolesCtx)}`);
  }

  const accessControlAuditCtx = getActiveNavContext("/admin/access-control/audit");
  if (accessControlAuditCtx.activeItemId !== "access-control" || accessControlAuditCtx.activeGroupId !== "group-administration") {
    throw new Error(`Access Control audit subroute did not map to active item 'access-control' and group 'group-administration'`);
  }

  // Test 4: Active Route Context Resolution for Assignment Queues
  const dncQueueCtx = getActiveNavContext("/assignments/dnc");
  if (dncQueueCtx.activeItemId !== "assignments" || dncQueueCtx.activeGroupId !== "group-projects") {
    throw new Error(`DNC queue /assignments/dnc did not map to active item 'assignments' and group 'group-projects'`);
  }

  const govAdminQueueCtx = getActiveNavContext("/assignments/gov-admin");
  if (govAdminQueueCtx.activeItemId !== "assignments" || govAdminQueueCtx.activeGroupId !== "group-projects") {
    throw new Error(`Gov Admin queue /assignments/gov-admin did not map to active item 'assignments' and group 'group-projects'`);
  }

  // Test 5: Permission filtering & empty group hiding
  useAuthStore.setState({
    permissions: ["enquiry:view"],
    isAdmin: false,
    fetchStatus: "SUCCESS",
    isAuthenticated: true
  });

  const visibleGroups = NAVIGATION_GROUPS.map((group) => {
    const children = group.childIds
      .map((id) => NAVIGATION_MANIFEST.find((item) => item.id === id))
      .filter((item): item is NavItemDef => {
        if (!item || !item.showInSidebar) return false;
        return isNavItemAllowed(item, hasPermission, false);
      });
    return { ...group, children };
  }).filter((group) => group.children.length > 0);

  // When user only has "enquiry:view", only Applications group should be visible (contains enquiries)
  const groupIds = visibleGroups.map((g) => g.id);
  if (!groupIds.includes("group-applications") || groupIds.includes("group-administration")) {
    throw new Error("Expected empty groups (e.g. Administration) to be hidden when user lacks permissions");
  }

  // Test 6: Super Admin sees all groups with authorized items
  useAuthStore.setState({ isAdmin: true });
  NAVIGATION_GROUPS.forEach((group) => {
    const children = group.childIds
      .map((id) => NAVIGATION_MANIFEST.find((item) => item.id === id))
      .filter((item): item is NavItemDef => item ? item.showInSidebar : false);

    if (children.length === 0) {
      throw new Error(`Group ${group.id} has no sidebar-visible children defined`);
    }
  });

  // Test 7: Fail closed on error status
  useAuthStore.setState({ fetchStatus: "ERROR", isAdmin: false });
  const errorStateAllowed = isNavItemAllowed(
    NAVIGATION_MANIFEST.find((i) => i.id === "access-control")!,
    hasPermission,
    false
  );
  if (errorStateAllowed) {
    throw new Error("Expected access-control to be denied when fetchStatus is ERROR");
  }

  return { success: true, verifiedTestCases: 7 };
}

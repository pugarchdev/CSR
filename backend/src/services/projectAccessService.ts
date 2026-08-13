import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

export type ProjectAccessAction = "VIEW" | "NGO_UPDATE" | "CORPORATE_APPROVE" | "GOVERNMENT_MONITOR" | "MOU_MANAGE";

export async function assertProjectAccess(req: AuthenticatedRequest, projectId: string, action: ProjectAccessAction) {
  const user = req.user;
  if (!user?.id) throw new Error("Authentication required");
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, organizationId: true, parentOrganizationId: true, departmentOrganizationId: true, corporatePartnerId: true, deletedAt: true } });
  if (!project || project.deletedAt) throw new Error("Project not found");
  const roleId = Number(user.roleId);
  if ([1, 2, 3].includes(roleId) && action === "VIEW") return project;

  if (action === "NGO_UPDATE" || user.ngoAccessId) {
    if (!user.ngoAccessId) throw new Error("A Corporate–NGO access context is required");
    const access = await prisma.corporateNgoAccess.findFirst({ where: { id: user.ngoAccessId, userId: user.id, status: "ACTIVE", projectIds: { has: projectId }, membership: { status: "APPROVED" } } });
    if (!access) throw new Error("Project is outside this Corporate–NGO access context");
    if (action !== "VIEW" && action !== "NGO_UPDATE") throw new Error("NGO access cannot perform this project action");
    return project;
  }

  if (action === "CORPORATE_APPROVE") {
    if (!user.organizationId || ![project.corporatePartnerId, project.organizationId].includes(user.organizationId)) throw new Error("Only the scoped Corporate organization may approve this project item");
    return project;
  }

  const governmentAssignment = await prisma.governmentAssignment.findFirst({ where: { projectId, status: { in: ["ACTIVE", "PENDING_ACCEPTANCE"] }, OR: [{ primaryNodalUserId: user.id }, { stateNodalUserId: user.id }, { csrCellHeadUserId: user.id }, { governmentOrganization: { departmentHeadUserId: user.id } }, { dncLinks: { some: { dncUserId: user.id, status: "ACTIVE" } } }] } });
  if (action === "GOVERNMENT_MONITOR") {
    if (!governmentAssignment) throw new Error("You are not assigned to monitor this project");
    return project;
  }

  if (action === "MOU_MANAGE") {
    const orgScoped = Boolean(user.organizationId && [project.organizationId, project.parentOrganizationId, project.departmentOrganizationId, project.corporatePartnerId].includes(user.organizationId));
    if (!orgScoped && !governmentAssignment && ![1, 2, 3].includes(roleId)) throw new Error("Project is outside your MoU scope");
    return project;
  }

  const orgScoped = Boolean(user.organizationId && [project.organizationId, project.parentOrganizationId, project.departmentOrganizationId, project.corporatePartnerId].includes(user.organizationId));
  if (!orgScoped && !governmentAssignment && ![1, 2, 3].includes(roleId)) throw new Error("Project is outside your access scope");
  return project;
}

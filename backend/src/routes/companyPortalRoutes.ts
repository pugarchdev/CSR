import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { checkFeatureEnabled, checkTenantActive, resolveTenantContext } from "../middlewares/tenantMiddleware";
import prisma from "../config/db";
import { listCsrProjects } from "../controllers/csrLifecycleController";
import {
  inviteNgo,
  bulkInviteNgos,
  listInvitations,
  revokeNgoAccess,
  submitPreliminaryReview
} from "../controllers/ngoInvitationController";

const router = Router();

router.use(authenticateToken, authorizeRoles([Role.COMPANY_ADMIN, Role.COMPANY_MEMBER, Role.SUPER_ADMIN, Role.CORPORATE_USER]), resolveTenantContext, checkTenantActive);

router.get("/enquiries", async (req, res, next) => {
  try {
    const user = (req as any).user;
    const tenantId = (req as any).tenantContext?.tenantId || user?.tenantId || undefined;
    const company = user?.companyId
      ? await prisma.company.findUnique({
          where: { id: user.companyId },
          select: { cin: true }
        })
      : null;

    const orFilters = [
      user?.email ? { email: user.email } : null,
      company?.cin ? { mca21Cin: company.cin } : null
    ].filter(Boolean) as Array<{ email: string } | { mca21Cin: string }>;

    if (orFilters.length === 0) return res.json([]);

    const enquiries = await prisma.corporateEnquiry.findMany({
      where: {
        ...(tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : {}),
        AND: [{ OR: orFilters }]
      },
      orderBy: { submittedAt: "desc" }
    });

    return res.json(enquiries);
  } catch (error) {
    return next(error);
  }
});

router.get("/interests", async (req, res, next) => {
  try {
    const user = (req as any).user;
    const tenantId = (req as any).tenantContext?.tenantId || user?.tenantId || undefined;
    const company = user?.companyId
      ? await prisma.company.findUnique({
          where: { id: user.companyId },
          select: { cin: true, name: true }
        })
      : null;

    const orFilters = [
      user?.email ? { email: user.email } : null,
      company?.cin ? { mca21Cin: company.cin } : null
    ].filter(Boolean) as Array<{ email: string } | { mca21Cin: string }>;

    if (orFilters.length === 0) return res.json([]);

    const interests = await prisma.corporatePitchInterest.findMany({
      where: {
        ...(tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : {}),
        AND: [{ OR: orFilters }]
      },
      include: {
        governmentPitch: {
          select: {
            id: true,
            pitchReferenceId: true,
            district: true,
            taluka: true,
            exactLocation: true,
            csrRequirement: true,
            estimatedCost: true,
            department: true,
            officeName: true,
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json(interests);
  } catch (error) {
    return next(error);
  }
});
router.get("/projects", checkFeatureEnabled("enableCSRMarketplace"), listCsrProjects);

router.post("/ngos/invite", inviteNgo);
router.post("/ngos/invite/bulk", bulkInviteNgos);
router.get("/ngos/invitations", listInvitations);
router.post("/ngos/invitations/:id/revoke", revokeNgoAccess);
router.post("/ngos/:ngoId/preliminary-review", submitPreliminaryReview);

export default router;

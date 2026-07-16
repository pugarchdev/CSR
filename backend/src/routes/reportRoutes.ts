import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import {
  checkFeatureEnabled,
  checkOrganizationApproved,
  checkPermission,
  checkTenantActive,
  resolveTenantContext
} from "../middlewares/tenantMiddleware";
import { validateRequest } from "../middlewares/validationMiddleware";
import {
  createReport,
  generateAnnualSummary,
  getCompanyReport,
  getDepartmentReport,
  getGovernmentReport,
  getNgoReport,
  listReports
} from "../controllers/reportController";

const router = Router();

const reportSchema = z.object({
  body: z.object({
    title: z.string().min(2),
    type: z.enum(["CSR", "IMPACT", "BENEFICIARY", "ANNUAL"]),
    content: z.record(z.any()),
    fileUrl: z.string().url().optional()
  })
});

const reportRoles = [
  Role.SUPER_ADMIN,
  Role.PORTAL_ADMIN,
  Role.CSR_ADMIN,
  Role.DISTRICT_ADMIN,
  Role.BENEFICIARY_AGENCY,
  Role.COMPANY_ADMIN,
  Role.COMPANY_MEMBER,
  Role.NGO_ADMIN,
  Role.NGO_MEMBER,
  Role.FINANCE_USER,
  Role.ANALYST_REVIEWER,
  Role.COMPLIANCE_REVIEWER,
  Role.APPROVER,
  Role.AUDITOR
];

const orgReportRoles = new Set<Role>([
  Role.BENEFICIARY_AGENCY,
  Role.COMPANY_ADMIN,
  Role.COMPANY_MEMBER,
  Role.NGO_ADMIN,
  Role.NGO_MEMBER
]);

const blockUnapprovedOrganizationsForReports = (req: any, res: any, next: any) => {
  if (!req.user || !orgReportRoles.has(req.user.role)) return next();
  return checkOrganizationApproved(req, res, next);
};

const reportAccess = [
  authenticateToken,
  authorizeRoles(reportRoles),
  resolveTenantContext,
  checkTenantActive,
  blockUnapprovedOrganizationsForReports,
  checkPermission("report:view")
];

router.get("/", ...reportAccess, listReports);
router.get("/department/:reportType", ...reportAccess, getDepartmentReport);
router.get("/government/:reportType", ...reportAccess, getGovernmentReport);
router.get("/executive/:reportType", ...reportAccess, getGovernmentReport);
router.get("/company/:reportType", ...reportAccess, getCompanyReport);
router.get("/ngo/:reportType", ...reportAccess, getNgoReport);
router.get("/district/:reportType", ...reportAccess, getGovernmentReport);
router.post("/", ...reportAccess, checkFeatureEnabled("enableReportsExport"), checkPermission("report:export"), validateRequest(reportSchema), createReport);
router.post("/annual-summary", ...reportAccess, checkFeatureEnabled("enableReportsExport"), checkPermission("report:export"), generateAnnualSummary);

export default router;

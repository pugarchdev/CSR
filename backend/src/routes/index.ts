import { Router } from "express";

// Core routes
import authRoutes from "./authRoutes";
import companyRoutes from "./companyRoutes";
import analyticsRoutes from "./analyticsRoutes";
import uploadRoutes from "./uploadRoutes";
import notificationRoutes from "./notificationRoutes";
import auditRoutes from "./auditRoutes";
import documentRoutes from "./documentRoutes";
import reportRoutes from "./reportRoutes";
import adminRoutes from "./adminRoutes";
import organizationRoutes from "./organizationRoutes";
import platformRoutes from "./platformRoutes";
import governmentDepartmentRoutes from "./governmentDepartmentRoutes";
import publicRoutes from "./publicRoutes";
import districtRoutes from "./districtRoutes";
import companyPortalRoutes from "./companyPortalRoutes";
import csrLifecycleRoutes from "./csrLifecycleRoutes";
import otpRoutes from "./otpRoutes";
import trackingRoutes from "./trackingRoutes";
import onboardingRoutes from "./onboardingRoutes";
import companyInterestRoutes from "./companyInterestRoutes";
import roleRoutes from "./roleRoutes";
import csrRequirementRoutes from "./csrRequirementRoutes";
import csrDashboardRoutes from "./csrDashboardRoutes";
import dashboardRoutes from "./dashboardRoutes";

// Convergence Framework Routes
import corporateEnquiryRoutes from "./corporateEnquiryRoutes";
import relationshipManagerRoutes from "./relationshipManagerRoutes";
import feasibilityAssessmentRoutes from "./feasibilityAssessmentRoutes";
import governmentPitchRoutes from "./governmentPitchRoutes";
import nodalOfficerRoutes from "./nodalOfficerRoutes";
import convergenceProjectRoutes from "./convergenceProjectRoutes";
import grievanceRoutes from "./grievanceRoutes";
import jsRoutes from "./jsRoutes";
import implementingAgencyRoutes from "./implementingAgencyRoutes";
import helpdeskRoutes from "./helpdeskRoutes";
import secretaryRoutes from "./secretaryRoutes";
import assignmentRoutes from "./assignmentRoutes";

import departmentRoutes from "./departmentRoutes";
import dnoRoutes from "./dnoRoutes";

import accessControlRoutes from "./accessControlRoutes";
import mouRoutes from "./mouRoutes";
import milestoneRoutes from "./milestoneRoutes";

// Verification Module
import verificationRoutes from "../modules/verification";

const router = Router();

router.use("/mou", mouRoutes);
router.use("/milestones", milestoneRoutes);
router.use("/departments", departmentRoutes);
router.use("/dno", dnoRoutes);
router.use("/access-control", accessControlRoutes);
router.use("/auth", authRoutes);
router.use("/companies", companyRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/upload", uploadRoutes);
router.use("/notifications", notificationRoutes);
router.use("/audit-logs", auditRoutes);
router.use("/documents", documentRoutes);
router.use("/reports", reportRoutes);
router.use("/admin", adminRoutes);
router.use("/org", organizationRoutes);
router.use("/platform", platformRoutes);
router.use("/government-departments", governmentDepartmentRoutes);
router.use("/public", publicRoutes);
router.use("/district", districtRoutes);
router.use("/company", companyPortalRoutes);
router.use("/lifecycle", csrLifecycleRoutes);
router.use("/otp", otpRoutes);
router.use("/tracking", trackingRoutes);
router.use("/onboarding", onboardingRoutes);
router.use("/company-interests", companyInterestRoutes);
router.use("/roles", roleRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/csr-dashboard", csrDashboardRoutes);
router.use("/csr-requirements", csrRequirementRoutes);

router.use("/corporate-enquiries", corporateEnquiryRoutes);
router.use("/rm", relationshipManagerRoutes);
router.use("/feasibility", feasibilityAssessmentRoutes);
router.use("/government-pitches", governmentPitchRoutes);
router.use("/pitches", governmentPitchRoutes);
router.use("/nodal", nodalOfficerRoutes);
router.use("/convergence-projects", convergenceProjectRoutes);
router.use("/grievances", grievanceRoutes);
router.use("/js", jsRoutes);
router.use("/implementing-agency", implementingAgencyRoutes);
router.use("/helpdesk", helpdeskRoutes);
router.use("/secretary", secretaryRoutes);
router.use("/assignments", assignmentRoutes);
router.use("/verification", verificationRoutes);

export default router;

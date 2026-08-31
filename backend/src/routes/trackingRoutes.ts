import { Router } from "express";
import prisma from "../config/db";

const router = Router();

router.get("/:trackingId", async (req, res) => {
  const trackingId = req.params.trackingId.trim().toUpperCase();

  // 1. Corporate CSR Enquiry
  if (trackingId.startsWith("CSR-") || trackingId.startsWith("CE-")) {
    const enquiry = await prisma.corporateEnquiry.findFirst({
      where: {
        OR: [
          { trackingId },
          { id: req.params.trackingId.trim() }
        ]
      },
      select: {
        id: true,
        trackingId: true,
        corporateName: true,
        sector: true,
        contactPersonName: true,
        proposedCSRWork: true,
        indicativeBudget: true,
        preferredDistricts: true,
        preferredCities: true,
        preferredTalukas: true,
        status: true,
        assignedRelationshipManagerId: true,
        firstContactedAt: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    if (!enquiry) return res.status(404).json({ error: "Enquiry tracking ID not found" });
    return res.json({
      type: "ENQUIRY",
      trackingId: enquiry.trackingId || trackingId,
      status: enquiry.status,
      submittedAt: enquiry.createdAt,
      updatedAt: enquiry.updatedAt,
      details: {
        ...enquiry,
        companyName: enquiry.corporateName,
        proposedCsrWork: enquiry.proposedCSRWork,
      }
    });
  }

  // 2. Government Development Pitch
  if (trackingId.startsWith("GP-") || trackingId.startsWith("PITCH-")) {
    const pitch = await prisma.governmentPitch.findFirst({
      where: {
        OR: [
          { pitchReferenceId: trackingId },
          { id: req.params.trackingId.trim() }
        ]
      },
      select: {
        id: true,
        pitchReferenceId: true,
        title: true,
        department: true,
        officeName: true,
        officialName: true,
        designation: true,
        districts: true,
        cities: true,
        talukas: true,
        exactLocation: true,
        csrRequirement: true,
        estimatedCost: true,
        budget: true,
        status: true,
        assignedRelationshipManagerId: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    if (!pitch) return res.status(404).json({ error: "Pitch tracking ID not found" });
    return res.json({
      type: "PITCH",
      trackingId: pitch.pitchReferenceId || trackingId,
      status: pitch.status,
      submittedAt: pitch.createdAt,
      updatedAt: pitch.updatedAt,
      details: pitch
    });
  }

  // 3. Corporate Pitch Interest
  if (trackingId.startsWith("INT-") || trackingId.startsWith("CPI-")) {
    const interest = await prisma.corporatePitchInterest.findFirst({
      where: {
        OR: [
          { interestTrackingId: trackingId },
          { id: req.params.trackingId.trim() }
        ]
      }
    });
    if (!interest) return res.status(404).json({ error: "Corporate interest tracking ID not found" });
    return res.json({
      type: "INTEREST",
      trackingId: interest.interestTrackingId || trackingId,
      status: interest.status,
      submittedAt: interest.createdAt,
      updatedAt: interest.updatedAt,
      details: interest
    });
  }

  // 4. Helpdesk Support Query
  if (trackingId.startsWith("HD-") || trackingId.startsWith("TKT-")) {
    const query = await prisma.helpdeskQuery.findFirst({
      where: {
        OR: [
          { trackingId },
          { id: req.params.trackingId.trim() }
        ]
      },
      select: {
        id: true,
        trackingId: true,
        subject: true,
        message: true,
        status: true,
        resolution: true,
        resolutionDueAt: true,
        resolvedAt: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    if (!query) return res.status(404).json({ error: "Support ticket tracking ID not found" });
    return res.json({
      type: "HELPDESK",
      trackingId: query.trackingId || trackingId,
      status: query.status,
      submittedAt: query.createdAt,
      updatedAt: query.updatedAt,
      estimatedCompletion: query.resolutionDueAt,
      details: query
    });
  }

  // 5. Grievance Redressal
  if (trackingId.startsWith("GRV-")) {
    const grievance = await prisma.grievance.findFirst({
      where: {
        OR: [
          { grievanceCode: trackingId },
          { id: req.params.trackingId.trim() }
        ]
      },
      include: {
        project: {
          select: { title: true, district: true, projectCode: true }
        }
      }
    });
    if (!grievance) return res.status(404).json({ error: "Grievance tracking code not found" });
    return res.json({
      type: "GRIEVANCE",
      trackingId: grievance.grievanceCode || trackingId,
      status: grievance.status,
      submittedAt: grievance.createdAt,
      updatedAt: grievance.updatedAt,
      details: {
        subject: grievance.issueTitle,
        description: grievance.issueDescription,
        projectTitle: grievance.project?.title,
        district: grievance.project?.district,
        resolution: grievance.resolutionText,
      }
    });
  }

  // 6. Onboarded Execution Project
  if (trackingId.startsWith("PRJ-")) {
    const project = await prisma.project.findFirst({
      where: {
        OR: [
          { projectCode: trackingId },
          { id: req.params.trackingId.trim() }
        ]
      },
      select: {
        id: true,
        projectCode: true,
        title: true,
        description: true,
        sector: true,
        district: true,
        taluka: true,
        village: true,
        status: true,
        mouStatus: true,
        approvedBudget: true,
        committedAmount: true,
        utilizedAmount: true,
        beneficiaryCount: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    if (!project) return res.status(404).json({ error: "Project code not found" });
    return res.json({
      type: "PROJECT",
      trackingId: project.projectCode || trackingId,
      status: project.status,
      submittedAt: project.createdAt,
      updatedAt: project.updatedAt,
      details: project
    });
  }

  return res.status(404).json({ error: "Tracking ID not found. Verify the prefix (CSR-, GP-, HD-, PRJ-, GRV-, INT-)." });
});

export default router;

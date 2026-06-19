import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { OnboardingStatus, Role, DocumentType } from "@prisma/client";

/**
 * NGO Onboarding Controller
 * Handles the complete multi-step NGO onboarding and verification workflow
 */

// ============================================
// CREATE OR GET DRAFT APPLICATION
// ============================================

export const getOrCreateDraftApplication = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const ngoId = req.user?.ngoId;

    if (!ngoId) {
      return res.status(400).json({ error: "User is not associated with an NGO" });
    }

    // Check if application already exists
    let application = await prisma.onboardingApplication.findUnique({
      where: { ngoId },
      include: {
        ngo: true,
        statusHistory: {
          orderBy: { createdAt: "desc" },
          take: 5
        },
        queries: {
          where: { status: "OPEN" },
          include: {
            raisedBy: {
              select: { id: true, email: true, role: true }
            },
            responses: {
              include: {
                respondedBy: {
                  select: { id: true, email: true }
                }
              }
            }
          }
        }
      }
    });

    if (!application) {
      // Create new draft application
      application = await prisma.onboardingApplication.create({
        data: {
          ngoId,
          legalName: "",
          organizationType: "TRUST",
          registrationNumber: "",
          registrationDate: new Date(),
          registrationAuthority: "",
          stateOfRegistration: "Maharashtra",
          panNumber: "",
          yearEstablished: new Date().getFullYear(),
          officialEmail: req.user?.email || "",
          officialPhone: "",
          headOfficeAddress: "",
          state: "Maharashtra",
          district: "",
          city: "",
          pincode: "",
          areasOfOperation: [],
          csrSectors: [],
          status: OnboardingStatus.DRAFT,
          completenessPercentage: 0
        },
        include: {
          ngo: true,
          statusHistory: {
            orderBy: { createdAt: "desc" },
            take: 5
          },
          queries: {
            where: { status: "OPEN" },
            include: {
              raisedBy: {
                select: { id: true, email: true, role: true }
              },
              responses: {
                include: {
                  respondedBy: {
                    select: { id: true, email: true }
                  }
                }
              }
            }
          }
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: "ONBOARDING_APPLICATION_CREATED",
          details: { ngoId, applicationId: application.id },
          ipAddress: req.ip
        }
      });
    }

    return res.json({
      application,
      canEdit: application.status === OnboardingStatus.DRAFT ||
               application.status === OnboardingStatus.QUERY_RAISED
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// SAVE DRAFT (ANY STEP)
// ============================================

export const saveDraft = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const ngoId = req.user?.ngoId;
    const { step, data } = req.body;

    if (!ngoId) {
      return res.status(400).json({ error: "User is not associated with an NGO" });
    }

    const application = await prisma.onboardingApplication.findUnique({
      where: { ngoId }
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (application.status !== OnboardingStatus.DRAFT && 
        application.status !== OnboardingStatus.QUERY_RAISED) {
      return res.status(400).json({ 
        error: "Cannot edit application in current status",
        currentStatus: application.status
      });
    }

    // Calculate completeness percentage
    const completeness = calculateCompleteness({ ...application, ...data });

    // Update application
    const updated = await prisma.onboardingApplication.update({
      where: { ngoId },
      data: {
        ...data,
        completenessPercentage: completeness,
        updatedAt: new Date()
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "ONBOARDING_DRAFT_SAVED",
        details: { ngoId, applicationId: application.id, step, completeness },
        ipAddress: req.ip
      }
    });

    return res.json({
      message: "Draft saved successfully",
      application: updated,
      completenessPercentage: completeness
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// SUBMIT APPLICATION
// ============================================

export const submitApplication = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const ngoId = req.user?.ngoId;

    if (!ngoId) {
      return res.status(400).json({ error: "User is not associated with an NGO" });
    }

    const application = await prisma.onboardingApplication.findUnique({
      where: { ngoId }
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (application.status !== OnboardingStatus.DRAFT && 
        application.status !== OnboardingStatus.QUERY_RAISED) {
      return res.status(400).json({ 
        error: "Cannot submit application in current status",
        currentStatus: application.status
      });
    }

    // Validate required fields
    const validation = validateApplication(application);
    if (!validation.isValid) {
      return res.status(400).json({
        error: "Application is incomplete",
        missingFields: validation.missingFields,
        errors: validation.errors
      });
    }

    // Check required documents
    const documents = await prisma.ngoDocument.findMany({
      where: { ngoId }
    });

    const requiredDocs = getRequiredDocuments(application);
    const uploadedDocTypes = documents.map(d => d.documentType);
    const missingDocs = requiredDocs.filter(doc => !uploadedDocTypes.includes(doc));

    if (missingDocs.length > 0) {
      return res.status(400).json({
        error: "Required documents are missing",
        missingDocuments: missingDocs
      });
    }

    // Update application status
    const updated = await prisma.onboardingApplication.update({
      where: { ngoId },
      data: {
        status: OnboardingStatus.SUBMITTED,
        submittedAt: new Date(),
        completenessPercentage: 100
      }
    });

    // Create status history
    await prisma.onboardingStatusHistory.create({
      data: {
        applicationId: application.id,
        fromStatus: application.status,
        toStatus: OnboardingStatus.SUBMITTED,
        changedById: userId,
        notes: "Application submitted by NGO"
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "ONBOARDING_APPLICATION_SUBMITTED",
        details: { ngoId, applicationId: application.id },
        ipAddress: req.ip
      }
    });

    // Create notification for admins
    const admins = await prisma.user.findMany({
      where: {
        role: {
          in: [Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.ANALYST_REVIEWER]
        }
      }
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "New NGO Onboarding Application",
          message: `${application.legalName} has submitted their onboarding application for review.`,
          type: "IN_APP"
        }
      });
    }

    return res.json({
      message: "Application submitted successfully",
      application: updated,
      status: OnboardingStatus.SUBMITTED
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// GET APPLICATION STATUS
// ============================================

export const getApplicationStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const ngoId = req.user?.ngoId;

    if (!ngoId) {
      return res.status(400).json({ error: "User is not associated with an NGO" });
    }

    const application = await prisma.onboardingApplication.findUnique({
      where: { ngoId },
      include: {
        statusHistory: {
          orderBy: { createdAt: "desc" },
          include: {
            changedBy: {
              select: { id: true, email: true, role: true }
            }
          }
        },
        queries: {
          include: {
            raisedBy: {
              select: { id: true, email: true, role: true }
            },
            responses: {
              include: {
                respondedBy: {
                  select: { id: true, email: true }
                }
              },
              orderBy: { createdAt: "desc" }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        assignedReviewer: {
          select: { id: true, email: true, role: true }
        }
      }
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    // Get documents
    const documents = await prisma.ngoDocument.findMany({
      where: { ngoId },
      orderBy: { createdAt: "desc" }
    });

    // Get risk score if exists
    const riskScore = await prisma.riskScore.findFirst({
      where: { ngoId },
      include: {
        riskFlags: {
          where: { isResolved: false }
        }
      },
      orderBy: { calculatedAt: "desc" }
    });

    return res.json({
      application,
      documents,
      riskScore,
      timeline: application.statusHistory
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// RESPOND TO QUERY
// ============================================

export const respondToQuery = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { queryId } = req.params;
    const { responseText, attachmentUrls } = req.body;

    const query = await prisma.onboardingQuery.findUnique({
      where: { id: queryId },
      include: { application: true }
    });

    if (!query) {
      return res.status(404).json({ error: "Query not found" });
    }

    // Verify user has access to this query
    if (query.application.ngoId !== req.user?.ngoId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Create response
    const response = await prisma.queryResponse.create({
      data: {
        queryId,
        respondedById: userId!,
        responseText,
        attachmentUrls: attachmentUrls || []
      }
    });

    // Update query status
    await prisma.onboardingQuery.update({
      where: { id: queryId },
      data: { status: "RESPONDED" }
    });

    // Update application status if all queries are responded
    const openQueries = await prisma.onboardingQuery.count({
      where: {
        applicationId: query.applicationId,
        status: "OPEN"
      }
    });

    if (openQueries === 0) {
      await prisma.onboardingApplication.update({
        where: { id: query.applicationId },
        data: { status: OnboardingStatus.RESUBMITTED }
      });

      await prisma.onboardingStatusHistory.create({
        data: {
          applicationId: query.applicationId,
          fromStatus: OnboardingStatus.QUERY_RAISED,
          toStatus: OnboardingStatus.RESUBMITTED,
          changedById: userId,
          notes: "All queries responded"
        }
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "ONBOARDING_QUERY_RESPONDED",
        details: { queryId, applicationId: query.applicationId },
        ipAddress: req.ip
      }
    });

    // Notify reviewer
    if (query.raisedById) {
      await prisma.notification.create({
        data: {
          userId: query.raisedById,
          title: "Query Response Received",
          message: `NGO has responded to your query regarding ${query.application.legalName}`,
          type: "IN_APP"
        }
      });
    }

    return res.json({
      message: "Response submitted successfully",
      response
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateCompleteness(application: any): number {
  const requiredFields = [
    'legalName', 'organizationType', 'registrationNumber', 'registrationDate',
    'registrationAuthority', 'stateOfRegistration', 'panNumber', 'yearEstablished',
    'officialEmail', 'officialPhone', 'headOfficeAddress', 'state', 'district',
    'city', 'pincode'
  ];

  const optionalButImportant = [
    'displayName', 'ngoDarpanId', 'csr1RegistrationNumber', 'website',
    'bankAccountHolder', 'bankName', 'bankAccountNumber', 'ifscCode',
    'auditorName', 'yearsOfOperation'
  ];

  let filledRequired = 0;
  let filledOptional = 0;

  requiredFields.forEach(field => {
    if (application[field] && application[field] !== '') {
      filledRequired++;
    }
  });

  optionalButImportant.forEach(field => {
    if (application[field] && application[field] !== '') {
      filledOptional++;
    }
  });

  // Arrays
  if (application.areasOfOperation && application.areasOfOperation.length > 0) filledOptional++;
  if (application.csrSectors && application.csrSectors.length > 0) filledOptional++;

  // Booleans and JSON
  if (application.blacklistDeclaration) filledOptional++;
  if (application.dataPrivacyConsent) filledOptional++;
  if (application.verificationConsent) filledOptional++;

  const requiredPercentage = (filledRequired / requiredFields.length) * 70;
  const optionalPercentage = (filledOptional / (optionalButImportant.length + 5)) * 30;

  return Math.round(requiredPercentage + optionalPercentage);
}

function validateApplication(application: any): { 
  isValid: boolean; 
  missingFields: string[]; 
  errors: string[] 
} {
  const missingFields: string[] = [];
  const errors: string[] = [];

  // Required fields
  if (!application.legalName) missingFields.push('legalName');
  if (!application.organizationType) missingFields.push('organizationType');
  if (!application.registrationNumber) missingFields.push('registrationNumber');
  if (!application.registrationDate) missingFields.push('registrationDate');
  if (!application.panNumber) missingFields.push('panNumber');
  if (!application.officialEmail) missingFields.push('officialEmail');
  if (!application.officialPhone) missingFields.push('officialPhone');
  if (!application.headOfficeAddress) missingFields.push('headOfficeAddress');
  if (!application.district) missingFields.push('district');
  if (!application.pincode) missingFields.push('pincode');

  // Validate PAN format
  if (application.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(application.panNumber)) {
    errors.push('Invalid PAN format');
  }

  // Validate email
  if (application.officialEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(application.officialEmail)) {
    errors.push('Invalid email format');
  }

  // Validate pincode
  if (application.pincode && !/^[0-9]{6}$/.test(application.pincode)) {
    errors.push('Invalid pincode format');
  }

  // Validate GSTIN if provided
  if (application.gstRegistered && application.gstin) {
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(application.gstin)) {
      errors.push('Invalid GSTIN format');
    }
  }

  // Validate IFSC if bank details provided
  if (application.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(application.ifscCode)) {
    errors.push('Invalid IFSC code format');
  }

  // Declarations
  if (!application.blacklistDeclaration) errors.push('Blacklist declaration required');
  if (!application.dataPrivacyConsent) errors.push('Data privacy consent required');
  if (!application.verificationConsent) errors.push('Verification consent required');

  return {
    isValid: missingFields.length === 0 && errors.length === 0,
    missingFields,
    errors
  };
}

function getRequiredDocuments(application: any): DocumentType[] {
  const required: DocumentType[] = [
    DocumentType.REGISTRATION_CERTIFICATE,
    DocumentType.PAN_CARD,
    DocumentType.CANCELLED_CHEQUE,
    DocumentType.AUTHORIZED_SIGNATORY_PROOF,
    DocumentType.BOARD_RESOLUTION,
    DocumentType.DECLARATION_FORM,
    DocumentType.CONSENT_FORM
  ];

  // Add organization type specific documents
  if (application.organizationType === 'TRUST') {
    required.push(DocumentType.TRUST_DEED);
  } else if (application.organizationType === 'SOCIETY') {
    required.push(DocumentType.SOCIETY_RULES);
  } else if (application.organizationType === 'SECTION_8_COMPANY') {
    required.push(DocumentType.MOA, DocumentType.AOA);
  }

  // Add conditional documents
  if (application.has12A) required.push(DocumentType.CERTIFICATE_12A);
  if (application.has80G) required.push(DocumentType.CERTIFICATE_80G);
  if (application.csr1Status) required.push(DocumentType.CSR1_CERTIFICATE);
  if (application.gstRegistered) required.push(DocumentType.GST_CERTIFICATE);
  if (application.fcraStatus && application.fcraStatus !== 'NOT_APPLICABLE') {
    required.push(DocumentType.FCRA_CERTIFICATE);
  }

  return required;
}

// Made with Bob

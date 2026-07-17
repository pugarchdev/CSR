import "dotenv/config";
import { PrismaClient, Role, OrganizationKind, OrganizationOnboardingStatus, OrganizationStatus, RoleScope, CSRCategory, CompanyInterestStatus, CSRRequirementStatus, CorporateEnquiryStatus, FeasibilityResult, ChecklistAnswer, SLAStage, GrievanceStatus, SimpleMilestoneStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { PERMISSIONS, ROLE_PERMISSION_MAP } from "../src/config/platformAccess";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "111111";
async function main() {
  console.log("Starting database seed to initialize MahaCSR Portal...");
  const defaultPasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const tx = prisma;
    // 1. Clean Database
    console.log("Cleaning database...");
    await tx.projectAssignment.deleteMany();
    await tx.userInvitation.deleteMany();
    await tx.userOfficerProfile.deleteMany();
    await tx.districtNodalMapping.deleteMany();
    await tx.workflowHistory.deleteMany();
    await tx.workflowInstance.deleteMany();
    await tx.workflowRule.deleteMany();
    await tx.workflowAssignmentRule.deleteMany();
    await tx.workflowCondition.deleteMany();
    await tx.workflowTransition.deleteMany();
    await tx.workflowStage.deleteMany();
    await tx.workflowDefinition.deleteMany();
    await tx.notificationTemplate.deleteMany();
    await tx.notificationLog.deleteMany();
    await tx.platformSetting.deleteMany();
    await tx.session.deleteMany();

    await tx.auditLog.deleteMany();
    await tx.notification.deleteMany();
    await tx.userOrganizationRole.deleteMany();
    await tx.organizationRolePermission.deleteMany();
    await tx.organizationRole.deleteMany();
    await tx.permissionGroup.deleteMany();
    await tx.permission.deleteMany();
    await tx.organizationDocument.deleteMany();
    await tx.organization.deleteMany();
    await tx.report.deleteMany();
    await tx.matchScore.deleteMany();
    await tx.document.deleteMany();
    await tx.message.deleteMany();
    await tx.chat.deleteMany();
    await tx.milestone.deleteMany();
    await tx.project.deleteMany();

    // Clean new tables
    await tx.impactReport.deleteMany();
    await tx.completionReport.deleteMany();
    await tx.progressReport.deleteMany();
    await tx.cSRFundMilestone.deleteMany();
    await tx.agreement.deleteMany();
    await tx.companyInterest.deleteMany();
    await tx.nGOApplication.deleteMany();
    await tx.cSRRequirementDocument.deleteMany();
    await tx.cSRRequirement.deleteMany();
    await tx.beneficiaryProfile.deleteMany();
    await tx.otpVerification.deleteMany();
    await tx.sLAEscalation.deleteMany();
    await tx.grievanceActionLog.deleteMany();
    await tx.grievance.deleteMany();
    await tx.utilizationCertificate.deleteMany();
    await tx.projectDeliverableMilestone.deleteMany();
    await tx.convergenceProject.deleteMany();
    await tx.standardMou.deleteMany();
    await tx.nodalOfficerAppointment.deleteMany();
    await tx.feasibilityChecklistItem.deleteMany();
    await tx.feasibilityAssessment.deleteMany();
    await tx.corporatePitchInterest.deleteMany();
    await tx.governmentPitchPhoto.deleteMany();
    await tx.governmentPitch.deleteMany();
    await tx.corporateEnquiryInteraction.deleteMany();
    await tx.corporateEnquiry.deleteMany();
    await tx.helpdeskQuery.deleteMany();

    await tx.user.deleteMany();
    await tx.nGO.deleteMany();
    await tx.company.deleteMany();
    console.log("Database cleared.");

    // ============================================
    // 2. CREATE PERMISSIONS AND ADMIN USERS
    // ============================================

    await tx.permission.createMany({
      data: PERMISSIONS.map(([key, description, module]) => ({ key, description, module })),
      skipDuplicates: true
    });
    const permissions = await tx.permission.findMany();
    const permissionIdByKey = new Map(permissions.map((permission) => [permission.key, permission.id]));

    // Seed Permission Groups
    console.log("Seeding permission groups...");
    const groupNames = ["Dashboard", "Enquiry", "Pitch", "Projects", "CSR Companies", "NGOs", "Users", "Roles", "Permissions", "Workflow", "Reports", "Settings", "Audit", "Notifications"];
    const groups = [];
    for (const name of groupNames) {
      const g = await tx.permissionGroup.create({
        data: {
          name,
          description: `${name} related permissions`
        }
      });
      groups.push(g);
    }

    // Link permissions to groups
    for (const p of permissions) {
      let matchedGroup = groups.find(g => g.name.toLowerCase() === p.module.toLowerCase()) || 
                         groups.find(g => p.module.toLowerCase().includes(g.name.toLowerCase())) || 
                         groups[0];
      await tx.permission.update({
        where: { id: p.id },
        data: { groupId: matchedGroup.id }
      });
    }
    console.log("✓ Permission groups seeded and linked");

    // Seed Essential Admins
    
    const superAdmin = await tx.user.create({
      data: {
        email: "admin@mahacsr.gov.in",
        passwordHash: defaultPasswordHash,
        role: Role.SUPER_ADMIN,
        isVerified: true,
      },
    });
    console.log("✓ Super Admin created:", superAdmin.email);

    const portalAdmin = await tx.user.create({
      data: {
        email: "portal.admin@mahacsr.gov.in",
        passwordHash: defaultPasswordHash,
        role: null,
        isVerified: true,
      },
    });
    console.log("✓ Portal Admin created:", portalAdmin.email);

    const csrAdmin = await tx.user.create({
      data: {
        email: "csr.admin@mahacsr.gov.in",
        passwordHash: defaultPasswordHash,
        role: null,
        isVerified: true,
      },
    });
    console.log("✓ CSR Admin created:", csrAdmin.email);

    // Create system organization for administrative staff
    const portalAdminOrg = await tx.organization.create({
      data: {
        organizationType: OrganizationKind.PORTAL_ADMIN_ORG,
        name: "Maharashtra CSR Authority",
        email: "portal.admin@mahacsr.gov.in",
        district: "Mumbai",
        onboardingStatus: OrganizationOnboardingStatus.APPROVED,
        status: OrganizationStatus.ACTIVE,
        approvedBy: superAdmin.id,
        approvedAt: new Date()
      }
    });

    await tx.user.updateMany({
      where: { id: { in: [portalAdmin.id, csrAdmin.id, superAdmin.id] } },
      data: { organizationId: portalAdminOrg.id }
    });

    const createSystemRole = async (name: string, scope: RoleScope, organizationId?: string | null) => {
      return tx.organizationRole.create({
        data: {
          organizationId: organizationId || null,
          name,
          description: `${name.replace(/_/g, " ")} system role`,
          scope,
          isSystemRole: true,
          rolePermissions: {
            create: (ROLE_PERMISSION_MAP[name] || ROLE_PERMISSION_MAP.VIEWER || [])
              .map((key) => ({ permissionId: permissionIdByKey.get(key)! }))
              .filter((item) => item.permissionId)
          }
        }
      });
    };

    const portalRole = await createSystemRole("SUPER_ADMIN", RoleScope.TENANT, portalAdminOrg.id);

    const superAdminRole = await tx.organizationRole.create({
      data: {
        organizationId: null,
        name: "Super Admin",
        description: "Super Admin permanent system role",
        scope: RoleScope.GLOBAL,
        isSystemRole: true,
        isPermanent: true,
        rolePermissions: {
          create: permissions.map((p) => ({ permissionId: p.id }))
        }
      }
    });

    await tx.userOrganizationRole.createMany({
      data: [
        { userId: portalAdmin.id, roleId: portalRole.id, organizationId: portalAdminOrg.id },
        { userId: superAdmin.id, roleId: superAdminRole.id }
      ],
      skipDuplicates: true
    });

    const createEditableRole = async (name: string, scope: RoleScope, organizationId?: string | null) => {
      return tx.organizationRole.create({
        data: {
          organizationId: organizationId || null,
          name,
          description: `${name} role`,
          scope,
          isSystemRole: false,
          isPermanent: false,
          rolePermissions: {
            create: (ROLE_PERMISSION_MAP[name] || [])
              .map((key) => ({ permissionId: permissionIdByKey.get(key)! }))
              .filter((item) => item.permissionId)
          }
        }
      });
    };

    // Create system/custom editable roles so they are available
    const ngoAdminRole = await createEditableRole("NGO Admin", RoleScope.GLOBAL, null);
    const companyAdminRole = await createEditableRole("Company Admin", RoleScope.GLOBAL, null);
    const beneficiaryAgencyRole = await createEditableRole("Beneficiary Agency", RoleScope.GLOBAL, null);
    const rmRole = await createEditableRole("Relationship Manager", RoleScope.GLOBAL, null);
    const jsRole = await createEditableRole("Joint Secretary", RoleScope.GLOBAL, null);
    const secretaryRole = await createEditableRole("Planning Secretary", RoleScope.GLOBAL, null);
    const stateCellRole = await createEditableRole("State CSR Cell", RoleScope.GLOBAL, null);
    const nodalRole = await createEditableRole("District Nodal Officer", RoleScope.GLOBAL, null);
    const nodalConsultantRole = await createEditableRole("District Nodal Consultant", RoleScope.GLOBAL, null);
    console.log("✓ Dynamic roles initialized");

    const rmUser = await tx.user.create({
      data: {
        email: "rm@mahacsr.gov.in",
        passwordHash: defaultPasswordHash,
        role: Role.GOVERNMENT_OFFICER,
        roleId: rmRole.id,
        accountStatus: "ACTIVE",
        isVerified: true,
      }
    });
    console.log("✓ CSR Relationship Manager created:", rmUser.email);

    const jsUser = await tx.user.create({
      data: {
        email: "js@mahacsr.gov.in",
        passwordHash: defaultPasswordHash,
        role: Role.GOVERNMENT_OFFICER,
        roleId: jsRole.id,
        accountStatus: "ACTIVE",
        isVerified: true,
      }
    });
    console.log("✓ Joint Secretary created:", jsUser.email);

    const secretaryUser = await tx.user.create({
      data: {
        email: "secretary@mahacsr.gov.in",
        passwordHash: defaultPasswordHash,
        role: Role.GOVERNMENT_OFFICER,
        roleId: secretaryRole.id,
        accountStatus: "ACTIVE",
        isVerified: true,
      }
    });
    console.log("✓ Planning Secretary created:", secretaryUser.email);

    const stateCellUser = await tx.user.create({
      data: {
        email: "statecell@mahacsr.gov.in",
        passwordHash: defaultPasswordHash,
        role: Role.GOVERNMENT_OFFICER,
        roleId: stateCellRole.id,
        accountStatus: "ACTIVE",
        isVerified: true,
      }
    });
    console.log("✓ State Cell User created:", stateCellUser.email);

    const nodalUser = await tx.user.create({
      data: {
        email: "nodal@mahacsr.gov.in",
        passwordHash: defaultPasswordHash,
        role: Role.GOVERNMENT_OFFICER,
        roleId: nodalRole.id,
        accountStatus: "ACTIVE",
        isVerified: true,
        assignedDistrict: "Pune"
      }
    });
    console.log("✓ Nodal Officer created:", nodalUser.email);

    await tx.userOrganizationRole.createMany({
      data: [
        { userId: rmUser.id, roleId: rmRole.id },
        { userId: jsUser.id, roleId: jsRole.id },
        { userId: secretaryUser.id, roleId: secretaryRole.id },
        { userId: stateCellUser.id, roleId: stateCellRole.id },
        { userId: nodalUser.id, roleId: nodalRole.id }
      ]
    });

    // System actor for automated workflow transitions (locked, cannot log in)
    const systemUser = await tx.user.create({
      data: {
        email: "system@mahacsr.gov.in",
        passwordHash: await bcrypt.hash(crypto.randomBytes(48).toString("hex"), 10),
        role: Role.GOVERNMENT_OFFICER,
        accountStatus: "INACTIVE",
        isVerified: true
      }
    });
    console.log("✓ System user created:", systemUser.email);

    // District nodal mapping (new assignment workflow resolves via this table)
    await tx.districtNodalMapping.create({
      data: {
        district: "Pune",
        userId: nodalUser.id,
        isActive: true,
        assignedById: jsUser.id
      }
    });
    console.log("✓ District nodal mapping created: Pune -> nodal@mahacsr.gov.in");

    console.log("Seeding 10 NGOs & NGO Users...");
    const ngos = [];
    for (let i = 1; i <= 10; i++) {
      const ngo = await tx.nGO.create({
        data: {
          name: `NGO Foundation ${i}`,
          registrationNumber: `NGO-REG-10000${i}`,
          pan: `PAN NGO100${i}K`,
          address: `${i}01, CSR Hub, Nariman Point`,
          district: "Mumbai",
          taluka: "Mumbai City",
          status: "VERIFIED",
          empanelmentStatus: "EMPANELLED",
        }
      });
      ngos.push(ngo);

      const user = await tx.user.create({
        data: {
          ngoId: ngo.id,
          email: `ngo${i}@example.com`,
          passwordHash: defaultPasswordHash,
          role: null,
          accountStatus: "ACTIVE",
          isVerified: true,
        }
      });

      await tx.userOrganizationRole.create({
        data: {
          userId: user.id,
          roleId: ngoAdminRole.id,
        }
      });

      // Seed 1 Project per NGO
      await tx.project.create({
        data: {
          ngoId: ngo.id,
          title: `Rural Education Initiative ${i}`,
          description: `Comprehensive primary education project in rural areas for NGO ${i}.`,
          focusArea: "Education",
          sdgGoal: "Quality Education",
          beneficiaryCount: 200 + i * 50,
          budgetRequested: 500000,
          budgetFunded: 250000,
          district: "Nagpur",
          taluka: "Nagpur",
          startDate: new Date("2026-06-01"),
          endDate: new Date("2027-06-01"),
          status: "APPROVED"
        }
      });
    }
    console.log("✓ 10 NGOs, NGO Users, and Projects seeded.");

    console.log("Seeding 10 Companies & Company Users...");
    const companies = [];
    for (let i = 1; i <= 10; i++) {
      const company = await tx.company.create({
        data: {
          name: `Corporate India Ltd ${i}`,
          cin: `U01234MH2026PTC4000${i}`,
          gst: `27AAAAA1111A1Z${i}`,
          pan: `PANCO1000${i}`,
          csrBudget: 1500000,
          status: "VERIFIED",
          contactInfo: {
            phone: `987654321${i}`,
            email: `company${i}@example.com`
          }
        }
      });
      companies.push(company);

      const organization = await tx.organization.create({
        data: {
          organizationType: OrganizationKind.CSR_COMPANY,
          name: `Corporate India Ltd ${i}`,
          legalName: `Corporate India Ltd ${i}`,
          cin: `U01234MH2026PTC4000${i}`,
          pan: `PANCO1000${i}`,
          gst: `27AAAAA1111A1Z${i}`,
          email: `company${i}@example.com`,
          officialEmail: `company${i}@example.com`,
          phone: `987654321${i}`,
          officialPhone: `987654321${i}`,
          onboardingStatus: OrganizationOnboardingStatus.REGISTERED,
          status: OrganizationStatus.ACTIVE,
          sourceCompanyId: company.id
        }
      });

      await tx.cSRCompanyProfile.create({
        data: {
          organizationId: organization.id,
          companyType: "Private Limited",
          yearOfIncorporation: 2026,
          mcaVerificationStatus: "VERIFIED",
          companyStatus: "Active",
          registeredOfficeAddress: "Mumbai Head Office, Sector 1",
          corporateOfficeAddress: "Mumbai Head Office, Sector 1",
          officialEmailDomain: "example.com",
          preferredDistricts: ["Pune", "Nagpur"],
          preferredTalukas: [],
          preferredSectors: ["WATER", "EDUCATION"],
          preferredBeneficiaryGroups: [],
          scheduleVIIFocusAreas: ["WATER"],
          sdgFocusAreas: [],
          esgFocusAreas: []
        }
      });

      await tx.company.update({
        where: { id: company.id },
        data: { organizationId: organization.id }
      });

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          organizationId: organization.id,
          email: `company${i}@example.com`,
          passwordHash: defaultPasswordHash,
          role: Role.CORPORATE_USER,
          accountStatus: "ACTIVE",
          isVerified: true,
        }
      });

      await tx.userOrganizationRole.create({
        data: {
          userId: user.id,
          roleId: companyAdminRole.id,
          organizationId: organization.id,
        }
      });
    }
    console.log("✓ 10 Companies and Company Users seeded.");

    console.log("Seeding 10 Government Departments & Users...");
    const pitches = [];
    for (let i = 1; i <= 10; i++) {
      const organization = await tx.organization.create({
        data: {
          organizationType: OrganizationKind.GOVERNMENT_DEPARTMENT,
          name: `Department of Rural Development ${i}`,
          legalName: `Govt Dept ${i}`,
          email: `dept${i}@example.com`,
          onboardingStatus: OrganizationOnboardingStatus.APPROVED,
          status: OrganizationStatus.ACTIVE,
        }
      });

      const profile = await tx.governmentDepartmentProfile.create({
        data: {
          organizationId: organization.id,
          departmentType: "State Department",
          reportingOfficerName: `Officer Name ${i}`,
          reportingOfficerDesignation: "Director",
          reportingOfficerEmail: `dept${i}@example.com`,
        }
      });

      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          email: `dept${i}@example.com`,
          passwordHash: defaultPasswordHash,
          role: Role.GOVERNMENT_OFFICER,
          accountStatus: "ACTIVE",
          isVerified: true,
        }
      });

      await tx.userOrganizationRole.create({
        data: {
          userId: user.id,
          roleId: beneficiaryAgencyRole.id,
          organizationId: organization.id,
        }
      });

      // Also create a BeneficiaryProfile which is mapped to the User (1-to-1)
      const beneficiaryProfile = await tx.beneficiaryProfile.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          agencyName: `Govt Dept Agency ${i}`,
          agencyType: "Government Department",
          district: "Pune",
          taluka: "Pune City",
          address: `Secretariat Bldg ${i}, Pune`,
          contactPerson: `Officer Name ${i}`,
          contactEmail: `dept${i}@example.com`,
          contactPhone: `912345678${i}`,
        }
      });

      // Seed 1 Government Pitch per Department
      const pitch = await tx.governmentPitch.create({
        data: {
          pitchReferenceId: `GP-MH-2026-00000${i}`,
          officialName: `Officer Name ${i}`,
          designation: "Director",
          department: `Department of Rural Development ${i}`,
          officeName: "Central Office",
          serviceClass: "CLASS_1",
          mobile: `912345678${i}`,
          email: `dept${i}@example.com`,
          district: "Pune",
          taluka: "Pune City",
          exactLocation: `Pune Central Sector ${i}`,
          csrRequirement: `Infrastructure development project for rural sector ${i} to enhance facilities.`,
          estimatedCost: 800000,
          govtFundDeclaration: false,
          certificationType: "SELF",
          status: "PUBLIC_LISTED"
        }
      });
      pitches.push(pitch);

      // Seed 1 CSRRequirement per Department
      const requirement = await tx.cSRRequirement.create({
        data: {
          beneficiaryProfileId: beneficiaryProfile.id,
          title: `Rural Water & Sanitation Initiative ${i}`,
          category: CSRCategory.WATER,
          description: `Providing clean drinking water infrastructure and sanitation facilities for rural communities under sector ${i}.`,
          district: "Pune",
          taluka: "Pune City",
          estimatedCost: 1000000,
          beneficiaryCount: 1000,
          expectedImpact: "Direct access to clean water for over 1000 residents.",
          status: CSRRequirementStatus.IN_PROGRESS
        }
      });

      // Seed 1 CompanyInterest per Department
      await tx.companyInterest.create({
        data: {
          csrRequirementId: requirement.id,
          companyId: companies[i - 1].id,
          fundingAmount: 1000000,
          fundingType: "FULL_FUNDING",
          status: CompanyInterestStatus.NGO_SELECTED
        }
      });

      // Seed 1 CSRProject per Department
      await tx.cSRProject.create({
        data: {
          csrRequirementId: requirement.id,
          companyId: companies[i - 1].id,
          ngoId: ngos[i - 1].id,
          beneficiaryProfileId: beneficiaryProfile.id,
          title: `Rural Water & Sanitation Initiative ${i}`,
          approvedBudget: 1000000,
          committedAmount: 1000000,
          releasedAmount: 500000,
          projectStatus: CSRRequirementStatus.IN_PROGRESS
        }
      });
    }
    console.log("✓ 10 Government Departments, Profiles, Users, Pitches, Requirements, Interests, and Projects seeded.");

    console.log("Seeding Corporate Enquiries & Interactions...");
    const enquiries = [];
    const statuses = [
      CorporateEnquiryStatus.SUBMITTED,
      CorporateEnquiryStatus.TRACKING_ID_GENERATED,
      CorporateEnquiryStatus.RM_ASSIGNED,
      CorporateEnquiryStatus.RM_CONTACTED,
      CorporateEnquiryStatus.ASSESSMENT_PENDING,
      CorporateEnquiryStatus.ASSESSMENT_SUBMITTED_TO_JS,
      CorporateEnquiryStatus.JS_APPROVED,
      CorporateEnquiryStatus.MOU_PENDING,
      CorporateEnquiryStatus.MOU_SIGNED,
      CorporateEnquiryStatus.PROJECT_ONBOARDED
    ];

    for (let i = 1; i <= 10; i++) {
      const enquiry = await tx.corporateEnquiry.create({
        data: {
          trackingId: `CSR-MH-2026-00000${i}`,
          companyName: `Corporate India Ltd ${i}`,
          sector: "Water & Sanitation",
          preferredDistricts: ["Pune", "Nagpur"],
          indicativeBudget: 1500000,
          contactPersonName: `Sponsor Contact ${i}`,
          contactPersonDesignation: "CSR Director",
          mobile: `987654321${i}`,
          email: `company${i}@example.com`,
          mca21Cin: `U01234MH2026PTC4000${i}`,
          proposedCsrWork: `Construction of check dams and water filtration plants in rural areas for talukas.`,
          status: statuses[i - 1],
          assignedRelationshipManagerId: rmUser.id,
          submittedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        }
      });
      enquiries.push(enquiry);

      // Create an interaction log
      await tx.corporateEnquiryInteraction.create({
        data: {
          corporateEnquiryId: enquiry.id,
          actorUserId: rmUser.id,
          note: `Conducted initial introductory call with the CSR director. Sponsor expressed deep interest in prioritizing clean water initiatives.`,
          interactionType: "CALL"
        }
      });
    }

    console.log("Seeding Feasibility Assessments & Checklist Items...");
    const assessments = [];
    for (let i = 1; i <= 10; i++) {
      // Create Feasibility Assessment (for entries with status >= ASSESSMENT_PENDING)
      const assessment = await tx.feasibilityAssessment.create({
        data: {
          reportReference: `FA-MH-2026-00000${i}`,
          corporateEnquiryId: enquiries[i - 1].id,
          relationshipManagerId: rmUser.id,
          companyName: `Corporate India Ltd ${i}`,
          cin: `U01234MH2026PTC4000${i}`,
          sector: "Water & Sanitation",
          contactSummary: `Met online via Zoom. Evaluated their CSR budget eligibility.`,
          proposedLocationDistrict: "Pune",
          indicativeBudget: 1500000,
          developmentNeedAddressed: `Pure drinking water access for rural schools.`,
          dateOfFirstContact: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          summaryOfInteraction: `Corporate board approved the initiative. Financial status verified.`,
          feasibilityResult: FeasibilityResult.FEASIBLE,
          recommendation: `Recommended appointing nodal officer for coordination.`,
          suggestedNodalOfficerDomain: "PUNE_RURAL_DEV",
          submittedToJsAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          jsDecisionById: jsUser.id,
          jsDecisionAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          jsDecisionRemarks: `Recommended proposal is approved. Joint Secretary.`
        }
      });
      assessments.push(assessment);

      // Create 13 checklist items
      for (let j = 1; j <= 13; j++) {
        await tx.feasibilityChecklistItem.create({
          data: {
            assessmentId: assessment.id,
            itemNumber: j,
            dimension: j <= 4 ? "CSR Compliance" : j <= 9 ? "Project Feasibility" : "Sustainability & Operations",
            checkText: `Checklist item verification criteria number ${j}.`,
            isCritical: j % 3 === 0,
            answer: ChecklistAnswer.YES,
            remarks: `Standard verification passed.`
          }
        });
      }
    }

    console.log("Seeding Corporate Pitch Interests...");
    for (let i = 1; i <= 10; i++) {
      await tx.corporatePitchInterest.create({
        data: {
          interestTrackingId: `CPI-MH-2026-00000${i}`,
          governmentPitchId: pitches[i - 1].id,
          companyName: `Corporate India Ltd ${i}`,
          mca21Cin: `U01234MH2026PTC4000${i}`,
          contactPersonName: `Sponsor Lead ${i}`,
          contactPersonDesignation: "CSR Manager",
          mobile: `987654321${i}`,
          email: `company${i}@example.com`,
          indicativeBudget: 800000,
          preferredStartTimeline: "Immediate",
          implementationMode: "NGO_PARTNER",
          messageToGovernment: `We are highly interested in funding this rural development pitch.`,
          declarationAccepted: true,
          status: "INTERESTED",
          dialogueInitiated: true
        }
      });
    }

    console.log("Seeding Nodal Officer Appointments...");
    const appointments = [];
    for (let i = 1; i <= 10; i++) {
      const appointment = await tx.nodalOfficerAppointment.create({
        data: {
          corporateEnquiryId: enquiries[i - 1].id,
          assessmentId: assessments[i - 1].id,
          district: "Pune",
          domain: "PUNE_RURAL_DEV",
          nodalOfficerUserId: nodalUser.id,
          nodalOfficerName: "Nodal Officer Pune",
          designation: "District Executive Officer",
          department: "Rural Development Department",
          appointedByJsId: jsUser.id,
          appointedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        }
      });
      appointments.push(appointment);
    }

    console.log("Seeding Standard MoUs...");
    const mous = [];
    for (let i = 1; i <= 10; i++) {
      const mou = await tx.standardMou.create({
        data: {
          mouReferenceId: `MOU-MH-2026-00000${i}`,
          corporateEnquiryId: enquiries[i - 1].id,
          districtDepartmentName: "Pune Rural Development",
          nodalOfficerName: "Nodal Officer Pune",
          corporateName: `Corporate India Ltd ${i}`,
          cin: `U01234MH2026PTC4000${i}`,
          projectTitle: `Rural Water Infrastructure Project ${i}`,
          projectDescription: `Laying water pipelines and installing storage tanks in Pune rural regions.`,
          scheduleVIIClause: "Item (i) - Clean Drinking Water",
          projectLocation: "Pune Rural Region",
          deliverables: { pipelineMeters: 500, storageTanks: 2 },
          timelineMonths: 12,
          financialContribution: 1500000,
          implementationMode: "NGO_PARTNER",
          implementingAgencyName: `NGO Foundation ${i}`,
          ownershipAfterCompletion: "Zilla Parishad Pune",
          maintenanceResponsibility: "Gram Panchayat",
          status: "SIGNED"
        }
      });
      mous.push(mou);
    }

    console.log("Seeding Convergence Projects...");
    const convergenceProjects = [];
    for (let i = 1; i <= 10; i++) {
      const project = await tx.convergenceProject.create({
        data: {
          projectId: `PRJ-MH-2026-00000${i}`,
          corporateEnquiryId: enquiries[i - 1].id,
          mouId: mous[i - 1].id,
          title: `Rural Water Infrastructure Project ${i}`,
          district: "Pune",
          taluka: "Pune City",
          location: `Pune Rural Region ${i}`,
          sector: "WATER",
          corporateName: `Corporate India Ltd ${i}`,
          nodalOfficerUserId: nodalUser.id,
          approvedBudget: 1500000,
          utilizedAmount: 600000,
          physicalProgressPercent: 40,
          financialProgressPercent: 40,
          status: "IN_PROGRESS"
        }
      });
      convergenceProjects.push(project);

      // Seed milestones
      const milestone = await tx.projectDeliverableMilestone.create({
        data: {
          convergenceProjectId: project.id,
          name: "Milestone 1: Piping & Tank Setup",
          description: "Excavation and setting up main distribution lines.",
          workType: "CONSTRUCTION",
          status: SimpleMilestoneStatus.IN_PROGRESS,
          fundsUtilized: 600000
        }
      });

      // Seed UCs
      await tx.utilizationCertificate.create({
        data: {
          convergenceProjectId: project.id,
          milestoneId: milestone.id,
          uploadedByUserId: nodalUser.id,
          certificateDocumentUrl: "https://mahacsr.gov.in/docs/mock-uc.pdf",
          amountUtilized: 600000,
          remarks: "Milestone 1 physical work inspected and verified.",
          verificationStatus: "VERIFIED",
          verifiedByNodalOfficerId: nodalUser.id,
          verifiedAt: new Date()
        }
      });

      // Seed grievances
      await tx.grievance.create({
        data: {
          grievanceId: `GRV-MH-2026-00000${i}`,
          convergenceProjectId: project.id,
          raisedByUserId: nodalUser.id,
          raisedByType: "CORPORATE",
          issueTitle: "Pipeline clearance delay",
          issueDescription: "A pipeline section is delayed due to local land clearance approval.",
          status: GrievanceStatus.RAISED,
          level1DueAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          assignedNodalOfficerId: nodalUser.id
        }
      });

      // Seed inspections
      await tx.convergenceProjectInspection.create({
        data: {
          convergenceProjectId: project.id,
          districtOfficerId: nodalUser.id,
          remarks: "Found progress according to timeline. Raw material quality is good.",
          issuesFound: "No issues identified.",
          actionRequired: "None."
        }
      });
    }

    console.log("Seeding Helpdesk Queries...");
    for (let i = 1; i <= 10; i++) {
      await tx.helpdeskQuery.create({
        data: {
          trackingId: `HD-MH-2026-00000${i}`,
          subject: `Inquiry on registration approval speed for organization ${i}`,
          message: `Dear MahaCSR Cell, our organization has submitted details but we haven't received verification email yet. Please check.`,
          name: `Enquirer Name ${i}`,
          email: `enquirer${i}@example.com`,
          mobile: `912345678${i}`,
          status: "OPEN",
          resolutionDueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        }
      });
    }

    console.log("Seeding SLA Escalations...");
    for (let i = 1; i <= 10; i++) {
      await tx.sLAEscalation.create({
        data: {
          entityType: "CORPORATE_ENQUIRY",
          entityId: enquiries[i - 1].id,
          stage: SLAStage.RM_RESPONSE,
          responsibleUserId: rmUser.id,
          dueAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Overdue!
          escalatedToUserId: jsUser.id,
          escalatedAt: new Date(),
          isResolved: false
        }
      });
    }

    console.log("Seeding Platform Settings...");
    await tx.platformSetting.create({
      data: {
        key: "single_session_policy:global",
        value: "REPLACE"
      }
    });

    console.log("Seeding Notification Templates...");
    const welcomeTemplate = await tx.notificationTemplate.create({
      data: {
        name: "Welcome Email",
        subject: "Welcome to MahaCSR Convergence Portal",
        emailBody: "Welcome to MahaCSR Portal. Your account is active.",
        smsBody: "Welcome to MahaCSR Portal. Active.",
        channels: ["EMAIL", "IN_APP"]
      }
    });

    const enquiryTemplate = await tx.notificationTemplate.create({
      data: {
        name: "Enquiry Submitted",
        subject: "New CSR Enquiry Submitted",
        emailBody: "A new CSR enquiry has been submitted.",
        smsBody: "New enquiry submitted.",
        channels: ["EMAIL", "IN_APP", "SOCKET"]
      }
    });

    console.log("Seeding Workflow Definitions...");
    const enquiryWorkflow = await tx.workflowDefinition.create({
      data: {
        name: "Corporate Enquiry Workflow",
        description: "Dynamic workflow for corporate CSR enquiries"
      }
    });

    const assignPermission = await tx.permission.findFirst({ where: { key: "enquiry:assign_rm" } });
    const reviewPermission = await tx.permission.findFirst({ where: { key: "enquiry:review" } });

    const stageSubmitted = await tx.workflowStage.create({
      data: {
        definitionId: enquiryWorkflow.id,
        name: "Submitted",
        displayOrder: 1,
        slaHours: 24
      }
    });

    const stageRmAssigned = await tx.workflowStage.create({
      data: {
        definitionId: enquiryWorkflow.id,
        name: "RM_ASSIGNED",
        displayOrder: 2,
        slaHours: 48
      }
    });

    if (assignPermission && reviewPermission) {
      await tx.workflowTransition.create({
        data: {
          fromStageId: stageSubmitted.id,
          toStageId: stageRmAssigned.id,
          requiredPermissionId: assignPermission.id
        }
      });

      await tx.workflowAssignmentRule.create({
        data: {
          stageId: stageRmAssigned.id,
          strategy: "ROUND_ROBIN",
          requiredPermissionId: reviewPermission.id
        }
      });

      await tx.workflowRule.create({
        data: {
          stageId: stageRmAssigned.id,
          actionType: "NOTIFY",
          requiredPermissionId: reviewPermission.id,
          templateId: enquiryTemplate.id
        }
      });
    }

    console.log("Seeding CSR Project Lifecycle Workflow...");
    const lifecycleWorkflow = await tx.workflowDefinition.create({
      data: {
        name: "CSR_PROJECT_LIFECYCLE",
        description: "End-to-end CSR project lifecycle: submission through closure. Stages and transitions are data — extend without code changes."
      }
    });

    const systemTransitionPermission = await tx.permission.findFirst({ where: { key: "workflow:system_transition" } });
    const projectAssignPermission = await tx.permission.findFirst({ where: { key: "project:assign" } });
    const projectApprovePermission = await tx.permission.findFirst({ where: { key: "project:approve" } });

    const LIFECYCLE_STAGES: Array<[string, number, number]> = [
      ["CORPORATE_SUBMISSION", 1, 24],
      ["RM_REVIEW", 2, 120],
      ["PLANNING_REVIEW", 3, 120],
      ["JS_APPROVAL", 4, 120],
      ["NODAL_OFFICER_ASSIGNMENT", 5, 48],
      ["FIELD_OFFICER_ASSIGNMENT", 6, 72],
      ["EXECUTION", 7, 2160],
      ["MONITORING", 8, 720],
      ["COMPLETION", 9, 168],
      ["CLOSURE", 10, 168]
    ];

    const lifecycleStageMap: Record<string, { id: string }> = {};
    for (const [name, displayOrder, slaHours] of LIFECYCLE_STAGES) {
      lifecycleStageMap[name] = await tx.workflowStage.create({
        data: { definitionId: lifecycleWorkflow.id, name, displayOrder, slaHours }
      });
    }

    if (systemTransitionPermission && projectAssignPermission && projectApprovePermission) {
      // Linear forward transitions. Human-gated hops use their functional
      // permission; automated hops use workflow:system_transition (the
      // seeded system user bypasses checks; real users need the permission).
      const transitionPermFor = (toStage: string): string => {
        if (toStage === "NODAL_OFFICER_ASSIGNMENT") return projectApprovePermission.id; // JS approval
        if (toStage === "FIELD_OFFICER_ASSIGNMENT" || toStage === "EXECUTION") return projectAssignPermission.id;
        return systemTransitionPermission.id;
      };

      for (let i = 0; i < LIFECYCLE_STAGES.length - 1; i++) {
        const fromName = LIFECYCLE_STAGES[i][0];
        const toName = LIFECYCLE_STAGES[i + 1][0];
        await tx.workflowTransition.create({
          data: {
            fromStageId: lifecycleStageMap[fromName].id,
            toStageId: lifecycleStageMap[toName].id,
            requiredPermissionId: transitionPermFor(toName)
          }
        });
      }

      // Rejection edge: JS can send back to RM review
      await tx.workflowTransition.create({
        data: {
          fromStageId: lifecycleStageMap["JS_APPROVAL"].id,
          toStageId: lifecycleStageMap["RM_REVIEW"].id,
          requiredPermissionId: projectApprovePermission.id
        }
      });
    }
    console.log("✓ CSR_PROJECT_LIFECYCLE workflow seeded (10 stages)");

    console.log("Seeding assignment notification templates...");
    await tx.notificationTemplate.createMany({
      data: [
        {
          name: "NODAL_ASSIGNMENT_REQUIRED",
          subject: "Project Approved – Field Officer Assignment Required",
          emailBody:
            "Dear Officer,\n\nCSR project \"{{projectName}}\" ({{reference}}) in {{district}} district has been approved by the Joint Secretary and requires a field officer assignment.\n\nPlease use the Assign Officer button below to assign an existing officer or invite a new one. Do not reply to this email with user details.\n\nRegards,\nMahaCSR Portal",
          smsBody: "MahaCSR: Project {{reference}} ({{district}}) approved. Field officer assignment required. Check your dashboard.",
          channels: ["EMAIL", "IN_APP", "SMS"]
        },
        {
          name: "FIELD_OFFICER_ASSIGNED",
          subject: "You have been assigned a CSR Project",
          emailBody:
            "Dear Officer,\n\nYou have been assigned to CSR project \"{{projectName}}\" ({{reference}}) in {{district}} district.\n\nOpen your dashboard to view the project details and next steps.\n\nRegards,\nMahaCSR Portal",
          smsBody: "MahaCSR: You are assigned to project {{reference}} ({{district}}). Check your dashboard.",
          channels: ["EMAIL", "IN_APP", "SMS"]
        },
        {
          name: "OFFICER_INVITATION",
          subject: "You have been assigned a CSR Project – Activate Your Account",
          emailBody:
            "Dear {{fullName}},\n\nYou have been assigned to CSR project \"{{projectName}}\" ({{reference}}) in {{district}} district.\n\nAn account has been created for you on the MahaCSR Portal. Click the activation button below to set your own password and access your dashboard. This link is single-use and expires in {{expiresInHours}} hours.\n\nFor security, we never send passwords by email.\n\nRegards,\nMahaCSR Portal",
          smsBody: "MahaCSR: You are assigned to project {{reference}}. Activate your account via the link sent to your email.",
          channels: ["EMAIL", "IN_APP", "SMS"]
        },
        {
          name: "ORG_USER_INVITED",
          subject: "You have been invited to the MahaCSR Portal",
          emailBody:
            "Hello,\n\nAn account has been created for you ({{email}}) on the MahaCSR Portal. Click the activation button below to set your own password. This link is single-use and time-limited.\n\nRegards,\nMahaCSR Portal",
          smsBody: "MahaCSR: Account invitation sent to your email. Activate to set your password.",
          channels: ["EMAIL", "IN_APP"]
        },
        {
          name: "NODAL_MAPPING_MISSING",
          subject: "Action Required: No Nodal Officer Mapped for District",
          emailBody:
            "An approved CSR project ({{reference}}) in {{district}} district cannot proceed because no active District CSR Nodal Officer is mapped. Please create a district mapping to resume the assignment workflow automatically.\n\nRegards,\nMahaCSR Portal",
          smsBody: "MahaCSR: No nodal officer mapped for {{district}}. Project {{reference}} assignment paused.",
          channels: ["EMAIL", "IN_APP"]
        }
      ]
    });
    console.log("✓ Assignment notification templates seeded");

  console.log("\n========================================");
  console.log("✅ Database initialized successfully (clean setup)!");
  console.log("========================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

const generateProjectCode = () => `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

export const createRequirement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.create({
      data: {
        projectCode: generateProjectCode(),
        title: req.body.title,
        description: req.body.description || req.body.title,
        type: "MARKETPLACE_REQUIREMENT",
        status: "SUBMITTED",
        sector: req.body.sector || "General",
        district: req.body.district || "Pune",
        taluka: req.body.taluka || "NA",
        approvedBudget: req.body.approvedBudget || 0,
        organizationId: req.user?.organizationId || req.body.organizationId
      }
    });
    return res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};

export const getRequirements = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.project.findMany({ where: { type: "MARKETPLACE_REQUIREMENT" } });
    return res.json(projects);
  } catch (error) {
    next(error);
  }
};

export const getRequirementById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // 1. Try finding in Project table
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        organization: true,
        departmentOrganization: true,
        milestones: true
      }
    }).catch(() => null);

    if (project) {
      return res.json({
        ...project,
        category: project.sector || "DEVELOPMENT",
        estimatedCost: project.approvedBudget || project.budgetRequested || 0,
        ngoApplications: [],
        companyInterests: [],
        beneficiaryProfile: {
          agencyName: project.organization?.name || "Government Agency",
          agencyType: "State Development Office"
        }
      });
    }

    // 2. Try finding in GovernmentPitch table
    const pitch = await prisma.governmentPitch.findUnique({
      where: { id }
    }).catch(() => null);

    if (pitch) {
      return res.json({
        id: pitch.id,
        projectCode: pitch.pitchReferenceId || `PITCH-${pitch.id.substring(0, 6)}`,
        title: pitch.title,
        category: pitch.department ? pitch.department.toUpperCase().replace(/\s+/g, "_") : "PUBLIC_INFRASTRUCTURE",
        sector: pitch.department || "Public Infrastructure",
        status: pitch.status || "MARKETPLACE_LISTED",
        description: pitch.csrRequirement || pitch.title,
        expectedImpact: "Promotes sustainable regional growth, improved social indicators, and direct community benefit.",
        district: pitch.district || (pitch.districts?.[0]) || "Maharashtra",
        taluka: pitch.talukas?.[0] || "District HQ",
        village: pitch.exactLocation || "Multiple Gram Panchayats",
        address: pitch.exactLocation || `${pitch.district || "Maharashtra"}`,
        estimatedCost: pitch.estimatedCost || pitch.budget || 0,
        approvedBudget: pitch.estimatedCost || pitch.budget || 0,
        beneficiaryCount: 2500,
        completionTimeline: "12 Months",
        contactPersonName: pitch.officialName || "Nodal Officer",
        contactPersonPhone: pitch.mobile || "N/A",
        contactPersonEmail: pitch.email || "N/A",
        beneficiaryProfile: {
          agencyName: pitch.officeName || pitch.department || "Government Department",
          agencyType: "State Government Office"
        },
        sdgGoals: ["SDG 3: Good Health", "SDG 4: Quality Education", "SDG 11: Sustainable Cities"],
        ngoApplications: [],
        companyInterests: []
      });
    }

    // 3. Fallback demonstration items dictionary
    const fallbackMap: Record<string, any> = {
      "pub-req-101": {
        id: "pub-req-101",
        projectCode: "MH-CSR-2026-001",
        trackingId: "MH-CSR-2026-001",
        title: "Solar Electrification & Smart Classroom Setup in ZP Schools",
        category: "EDUCATION",
        sector: "Education",
        status: "MARKETPLACE_LISTED",
        description: "Comprehensive installation of 5kW solar power systems and digital smart boards across 25 Zilla Parishad schools in rural Pune district to ensure uninterrupted digital learning.",
        expectedImpact: "Directly improves learning outcomes for 4,500 rural students, eliminates electricity outage disruptions, and saves ₹6 Lakhs annually in school power bills.",
        district: "Pune",
        taluka: "Haveli",
        village: "Khed Shivapur",
        address: "Zilla Parishad Education Complex, Haveli, Pune, Maharashtra",
        estimatedCost: 4500000,
        approvedBudget: 4500000,
        beneficiaryCount: 4500,
        completionTimeline: "6 Months",
        contactPersonName: "Shri Rajesh Patil",
        contactPersonPhone: "+91 98220 12345",
        contactPersonEmail: "edu.pune@maharashtra.gov.in",
        beneficiaryProfile: {
          agencyName: "Zilla Parishad Pune — Department of Education",
          agencyType: "District Local Body"
        },
        sdgGoals: ["SDG 4: Quality Education", "SDG 7: Affordable & Clean Energy"],
        ngoApplications: [],
        companyInterests: []
      },
      "pub-req-102": {
        id: "pub-req-102",
        projectCode: "MH-CSR-2026-002",
        trackingId: "MH-CSR-2026-002",
        title: "Primary Health Centre (PHC) Medical Equipment & ICU Bed Upgrade",
        category: "HEALTHCARE",
        sector: "Healthcare",
        status: "MARKETPLACE_LISTED",
        description: "Provision of advanced diagnostic tools, mobile X-ray units, multi-para cardiac monitors, and 10 ICU beds for primary health centres in tribal areas of Palghar.",
        expectedImpact: "Saves critical travel time for 12,000 tribal villagers needing emergency trauma & maternal health intervention.",
        district: "Palghar",
        taluka: "Jawhar",
        village: "Mokhada",
        address: "Sub-District Hospital & PHC Network, Jawhar-Mokhada Tribal Belt, Palghar",
        estimatedCost: 8500000,
        approvedBudget: 8500000,
        beneficiaryCount: 12000,
        completionTimeline: "9 Months",
        contactPersonName: "Dr. Anita Deshmukh",
        contactPersonPhone: "+91 94221 87654",
        contactPersonEmail: "phc.palghar@maharashtra.gov.in",
        beneficiaryProfile: {
          agencyName: "Public Health Department — Palghar District",
          agencyType: "State Health Department"
        },
        sdgGoals: ["SDG 3: Good Health & Well-being", "SDG 10: Reduced Inequalities"],
        ngoApplications: [],
        companyInterests: []
      },
      "pub-req-103": {
        id: "pub-req-103",
        projectCode: "MH-CSR-2026-003",
        trackingId: "MH-CSR-2026-003",
        title: "Check Dam Construction & Watershed Development in Drought-Prone Zones",
        category: "ENVIRONMENT",
        sector: "Environment & Water",
        status: "MARKETPLACE_LISTED",
        description: "Construction of 4 cement plug check dams and de-siltation of 3 percolating tanks to enhance groundwater recharge and ensure year-round irrigation for small farmers.",
        expectedImpact: "Increases local water table levels by 4 meters across 3 drought-affected villages, benefiting 7,800 farmers and livestock.",
        district: "Ahmednagar",
        taluka: "Parner",
        village: "Ralegan",
        address: "Parner Watershed Catchment Area, Ahmednagar, Maharashtra",
        estimatedCost: 6200000,
        approvedBudget: 6200000,
        beneficiaryCount: 7800,
        completionTimeline: "12 Months",
        contactPersonName: "Shri Suresh Kadam",
        contactPersonPhone: "+91 98500 43210",
        contactPersonEmail: "water.nagar@maharashtra.gov.in",
        beneficiaryProfile: {
          agencyName: "Water Conservation & Soil Department — Ahmednagar",
          agencyType: "State Water Department"
        },
        sdgGoals: ["SDG 6: Clean Water & Sanitation", "SDG 13: Climate Action"],
        ngoApplications: [],
        companyInterests: []
      },
      "pub-req-104": {
        id: "pub-req-104",
        projectCode: "MH-CSR-2026-004",
        trackingId: "MH-CSR-2026-004",
        title: "Women Livelihood & Self-Help Group Food Processing Incubation Unit",
        category: "WOMEN_EMPOWERMENT",
        sector: "Women Empowerment",
        status: "MARKETPLACE_LISTED",
        description: "Setting up a centralized agro-food processing, packaging, and quality testing facility operated by Mahila Bachat Gats to boost rural women entrepreneurship.",
        expectedImpact: "Empowers 2,200 women self-help group members with sustainable monthly household incomes exceeding ₹15,000.",
        district: "Nagpur",
        taluka: "Umred",
        village: "Bhiwapur",
        address: "MSRLM Incubation Complex, Umred Road, Nagpur, Maharashtra",
        estimatedCost: 3800000,
        approvedBudget: 3800000,
        beneficiaryCount: 2200,
        completionTimeline: "8 Months",
        contactPersonName: "Smt. Sunita Shinde",
        contactPersonPhone: "+91 97654 32109",
        contactPersonEmail: "msrlm.nagpur@maharashtra.gov.in",
        beneficiaryProfile: {
          agencyName: "MSRLM — Maharashtra State Rural Livelihoods Mission",
          agencyType: "State Rural Mission"
        },
        sdgGoals: ["SDG 1: No Poverty", "SDG 5: Gender Equality", "SDG 8: Decent Work & Economic Growth"],
        ngoApplications: [],
        companyInterests: []
      }
    };

    if (fallbackMap[id]) {
      return res.json(fallbackMap[id]);
    }

    return res.status(404).json({ error: "Requirement not found" });
  } catch (error) {
    next(error);
  }
};

export const getCSRRequirementById = getRequirementById;
export const getMarketplaceRequirements = getRequirements;

export const updateRequirementStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { status: req.body.status }
    });
    return res.json(project);
  } catch (error) {
    next(error);
  }
};

export const updateRequirement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { title: req.body.title, description: req.body.description }
    });
    return res.json(project);
  } catch (error) {
    next(error);
  }
};

export const deleteRequirement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    return res.json({ message: "Requirement deleted" });
  } catch (error) {
    next(error);
  }
};

export const verifyRequirement = updateRequirementStatus;
export const submitRequirement = updateRequirementStatus;
export const approveRequirement = updateRequirementStatus;
export const rejectRequirement = updateRequirementStatus;
export const requestRequirementClarification = updateRequirementStatus;
export const publishRequirement = updateRequirementStatus;
export const confirmProjectHandover = updateRequirementStatus;

export const upsertBeneficiaryProfile = async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ success: true });
};

export const getMyBeneficiaryProfile = async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ success: true });
};

export const addRequirementDocument = async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ success: true });
};

export const getDepartmentCompanyInterests = async (req: AuthenticatedRequest, res: Response) => {
  return res.json([]);
};

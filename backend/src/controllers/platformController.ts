import { NextFunction, Response, Request } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import prisma from "../config/db";

const HERO_SLIDES_KEY = "hero_carousel_slides";

const DEFAULT_SLIDES = [
  {
    id: "1",
    image: "/hero_slide_1.png",
    title: "One Platform. Many Partners.",
    highlight: "Greater Impact.",
    subtitle: "MahaCSR Setu is the official convergence platform connecting Government, Corporates and Implementing Agencies to drive sustainable development across Maharashtra.",
    active: true,
  },
  {
    id: "2",
    image: "/hero_slide_2.png",
    title: "Transforming Rural Maharashtra",
    highlight: "Through Convergence.",
    subtitle: "CSR investments aligned with district development priorities, driving sustainable infrastructure, education and healthcare across every taluka.",
    active: true,
  },
  {
    id: "3",
    image: "/hero_slide_3.png",
    title: "State-Led. District-Executed.",
    highlight: "Corporate Powered.",
    subtitle: "A single State CSR Coordinating Unit routes every corporate to one accountable District Nodal Officer for transparent, time-bound project delivery.",
    active: true,
  },
];

// A static list of all platform features, returning all as enabled
export const getMyTenantFeatures = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const features = {
      enableNGORegistration: true,
      enableCompanyRegistration: true,
      enableGovernmentDepartmentRegistration: true,
      enableRequirementCreation: true,
      enableCSRMarketplace: true,
      enableCompanyInterest: true,
      enableNGOSelection: true,
      enableFundDisbursement: true,
      enableMilestoneMonitoring: true,
      enableGISReports: true,
      enableAIReports: true,
      enablePublicTransparency: true,
      enableReportsExport: true,
      enablePaymentModule: true,
      enableMessagingModule: true,
      enableNotifications: true,
      enableDocumentVerification: true
    };

    return res.json({
      tenantId: "global",
      features,
      config: {}
    });
  } catch (error) {
    return next(error);
  }
};

/** Public: returns active hero carousel slides */
export const getHeroSlides = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const setting = await prisma.platformSetting.findUnique({ where: { key: HERO_SLIDES_KEY } });
    const slides = setting ? JSON.parse(setting.value) : DEFAULT_SLIDES;
    return res.json(slides.filter((s: any) => s.active !== false));
  } catch (error) {
    return next(error);
  }
};

/** Admin: update hero carousel slides */
export const updateHeroSlides = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { slides } = req.body;
    if (!Array.isArray(slides)) return res.status(400).json({ error: "slides must be an array" });

    const setting = await prisma.platformSetting.upsert({
      where: { key: HERO_SLIDES_KEY },
      create: { key: HERO_SLIDES_KEY, value: JSON.stringify(slides) },
      update: { value: JSON.stringify(slides) },
    });

    return res.json({ success: true, slides: JSON.parse(setting.value) });
  } catch (error) {
    return next(error);
  }
};

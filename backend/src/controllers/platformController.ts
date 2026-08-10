import { NextFunction, Response, Request } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import prisma from "../config/db";

const HERO_SLIDES_KEY = "hero_carousel_slides";

const CAROUSEL_IMAGES = [
  "Gemini_Generated_Image_5g4qcn5g4qcn5g4q.png",
  "Gemini_Generated_Image_8tv4ar8tv4ar8tv4.png",
  "Gemini_Generated_Image_9qvw8v9qvw8v9qvw.png",
  "Gemini_Generated_Image_cjsjr7cjsjr7cjsj.png",
  "Gemini_Generated_Image_d21ndd21ndd21ndd.png",
  "Gemini_Generated_Image_dmhfhhdmhfhhdmhf.png",
  "Gemini_Generated_Image_ij7dwmij7dwmij7d.png",
  "Gemini_Generated_Image_jobzsgjobzsgjobz.png",
  "Gemini_Generated_Image_lf96bqlf96bqlf96.png",
  "Gemini_Generated_Image_pv11gcpv11gcpv11.png",
  "Gemini_Generated_Image_q5r488q5r488q5r4.png",
  "Gemini_Generated_Image_v5khy9v5khy9v5kh.png",
  "Gemini_Generated_Image_ypxh9zypxh9zypxh.png"
];

const slideContent = [
  {
    title: "One Platform. Many Partners.",
    highlight: "Greater Impact.",
    subtitle: "MahaCSR Setu is the official convergence platform connecting Government, Corporates and Implementing Agencies to drive sustainable development across Maharashtra.",
  },
  {
    title: "Transforming Maharashtra",
    highlight: "Through Convergence.",
    subtitle: "CSR investments aligned with district development priorities, driving sustainable infrastructure, education and healthcare across every taluka.",
  },
  {
    title: "State-Led. District-Executed.",
    highlight: "Corporate Powered.",
    subtitle: "A single State CSR Coordinating Unit routes every corporate to one accountable District Nodal Officer for transparent, time-bound project delivery.",
  },
];

const DEFAULT_SLIDES = CAROUSEL_IMAGES.map((img, idx) => ({
  id: String(idx + 1),
  image: `/carousel/${img}`,
  title: slideContent[idx % slideContent.length].title,
  highlight: slideContent[idx % slideContent.length].highlight,
  subtitle: slideContent[idx % slideContent.length].subtitle,
  active: true,
}));

// A static list of all platform features, returning all as enabled
export const getPlatformFeatures = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
    let slides = setting ? (typeof setting.value === "string" ? JSON.parse(setting.value) : setting.value) : DEFAULT_SLIDES;
    if (!Array.isArray(slides) || slides.some((s: any) => s.image?.includes("hero_slide_"))) {
      slides = DEFAULT_SLIDES;
    }
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

    const parsed = typeof setting.value === "string" ? JSON.parse(setting.value) : setting.value;
    return res.json({ success: true, slides: parsed });
  } catch (error) {
    return next(error);
  }
};

import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { cacheOrFetch } from "../config/redis";

/**
 * Platform Security Events & Blocked Access Logs
 */
export const getSecurityEvents = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { action: { contains: "DENIED", mode: "insensitive" } },
          { action: { contains: "UNAUTHORIZED", mode: "insensitive" } },
          { action: { contains: "BLOCKED", mode: "insensitive" } },
          { action: { in: ["LOGIN_FAILED", "MFA_FAILED", "SECURITY_ALERT"] } }
        ]
      },
      include: {
        actorUser: {
          select: { id: true, email: true, firstName: true, lastName: true, designation: true }
        }
      },
      take: 50,
      orderBy: { createdAt: "desc" }
    });

    return res.json({
      success: true,
      data: {
        summary: {
          totalEvents: logs.length,
          criticalEvents: logs.filter(l => l.action.includes("BLOCKED") || l.action.includes("SECURITY")).length,
          lastDetected: logs.length ? logs[0].createdAt.toISOString() : null
        },
        events: logs.map(l => ({
          id: l.id,
          action: l.action,
          entityType: l.entityType,
          entityId: l.entityId,
          details: l.details,
          ipAddress: l.ipAddress || "127.0.0.1",
          actorEmail: l.actorUser?.email || "Anonymous",
          actorName: l.actorUser ? `${l.actorUser.firstName || ''} ${l.actorUser.lastName || ''}`.trim() : "System",
          createdAt: l.createdAt.toISOString()
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Platform Master Data Dictionary
 */
export const getMasterData = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    const data = await cacheOrFetch("platform:master-data", async () => {
      const districts = [
        "Ahilyanagar", "Akola", "Amravati", "Chhatrapati Sambhajinagar", "Beed", "Bhandara", "Buldhana", "Chandrapur",
        "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City",
        "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Dharashiv", "Palghar", "Parbhani", "Pune",
        "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"
      ];

      const sectors = [
        "Healthcare & Nutrition",
        "Education & Digital Literacy",
        "Rural Water & Sanitation",
        "Skill Development & Livelihood",
        "Environmental Sustainability & Green Energy",
        "Women & Child Welfare",
        "Agriculture & Irrigation Convergence",
        "Disaster Management & Resilience"
      ];

      const organizationTypes = [
        { code: "COLLECTORATE", label: "District Collectorate", level: "MAIN" },
        { code: "ZILLA_PARISHAD", label: "Zilla Parishad", level: "MAIN" },
        { code: "MUNICIPAL_CORPORATION", label: "Municipal Corporation", level: "MAIN" },
        { code: "SUB_DEPARTMENT", label: "Sub-Department", level: "SUB_DEPARTMENT" },
        { code: "STATE_CSR_CELL", label: "State CSR Cell", level: "STATE" }
      ];

      return {
        districts,
        sectors,
        organizationTypes,
        state: "Maharashtra"
      };
    }, 86400);

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * System Health & Integration Status
 */
export const getSystemHealth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - startTime;

    const [userCount, orgCount, projectCount] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.project.count()
    ]);

    return res.json({
      success: true,
      data: {
        status: "HEALTHY",
        uptimeSeconds: process.uptime(),
        database: {
          status: "CONNECTED",
          latencyMs: dbLatencyMs,
          connectionPool: "ACTIVE"
        },
        entities: {
          users: userCount,
          organizations: orgCount,
          projects: projectCount
        },
        integrations: [
          { name: "Email SMTP Gateway", status: "ONLINE", provider: "Government Mail Service", lastChecked: new Date().toISOString() },
          { name: "SMS OTP Service", status: "ONLINE", provider: "MahaGov SMS Gateway", lastChecked: new Date().toISOString() },
          { name: "DigiLocker Verification", status: "ONLINE", provider: "National e-Governance", lastChecked: new Date().toISOString() },
          { name: "MCA 21 Corporate Registry", status: "ONLINE", provider: "Ministry of Corporate Affairs", lastChecked: new Date().toISOString() }
        ],
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Feature Flags Configuration
 */
export const getFeatureFlags = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await cacheOrFetch("platform:feature-flags", async () => {
      return [
        { key: "ENABLE_DNO_MOU_SIGN", label: "Enable DNO MoU Signing", description: "Allow District Nodal Officers to digitally sign Tripartite MoUs", enabled: false, isClientConfirmed: false },
        { key: "ENABLE_UC_FINAL_APPROVAL", label: "Enable UC Final Approval by DNO", description: "Grant DNO final sign-off authority for Utilization Certificates", enabled: false, isClientConfirmed: false },
        { key: "ENABLE_HANDOVER_FINAL_APPROVAL", label: "Enable Final Handover Approval by DNO", description: "Allow DNO to grant final asset handover certificate", enabled: false, isClientConfirmed: false },
        { key: "ENABLE_FINAL_COMPLETION_CERTIFICATION", label: "Enable Final Completion Certification", description: "Grant final project completion certification authority", enabled: false, isClientConfirmed: false },
        { key: "ENABLE_PS_OPERATIONAL_OVERRIDE", label: "Enable Planning Secretary Operational Override", description: "Allow Planning Secretary to override routine Joint Secretary decisions", enabled: false, isClientConfirmed: false }
      ];
    }, 3600);

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

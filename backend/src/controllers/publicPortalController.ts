import { Request, Response } from "express";
import prisma from "../config/db";
import { Role, GovernmentPitchStatus } from "@prisma/client";
import { successResponse, errorResponse, notFoundResponse } from "../utils/apiResponse";

/**
 * Public Portal Controller — Static Part endpoints (no login).
 *
 * Serves the client-mandated public sections:
 *  - Completed Projects Gallery (searchable by district / sector / corporate / year)
 *  - Success Stories (completed projects with impact narrative)
 *  - Directory (State CSR Cell, Relationship Managers, District Nodal Officers)
 *  - Portal statistics for the public homepage
 */

// ─── Completed Projects Gallery ─────────────────────────────────────
// GET /api/public/completed-projects?district=&sector=&corporate=&year=&search=&page=&limit=
export const getCompletedProjectsGallery = async (req: Request, res: Response) => {
  try {
    const { district, sector, corporate, year, search, page = "1", limit = "12" } = req.query;

    const pageNum = Math.max(parseInt(page as string) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit as string) || 12, 1), 50);

    const where: any = { status: "COMPLETED" };

    if (district && district !== "All") where.district = district as string;
    if (sector && sector !== "All") where.sector = { equals: sector as string, mode: "insensitive" };
    if (corporate && corporate !== "All")
      where.corporateName = { contains: corporate as string, mode: "insensitive" };

    if (year && year !== "All") {
      const y = parseInt(year as string);
      if (!isNaN(y)) {
        // Match completedAt in calendar year; fall back to updatedAt for legacy rows
        where.OR = [
          { completedAt: { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) } },
          { completedAt: null, updatedAt: { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) } },
        ];
      }
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { title: { contains: search as string, mode: "insensitive" } },
            { corporateName: { contains: search as string, mode: "insensitive" } },
            { district: { contains: search as string, mode: "insensitive" } },
            { projectId: { contains: search as string, mode: "insensitive" } },
          ],
        },
      ];
    }

    const [projects, total] = await Promise.all([
      prisma.convergenceProject.findMany({
        where,
        select: {
          id: true,
          projectId: true,
          title: true,
          district: true,
          taluka: true,
          location: true,
          sector: true,
          corporateName: true,
          approvedBudget: true,
          utilizedAmount: true,
          completedAt: true,
          updatedAt: true,
          beneficiariesSummary: true,
          impactSummary: true,
          milestones: {
            select: { geoTaggedPhotoUrls: true },
            where: { geoTaggedPhotoUrls: { isEmpty: false } },
            take: 3,
          },
        },
        orderBy: [{ completedAt: "desc" }, { updatedAt: "desc" }],
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      prisma.convergenceProject.count({ where }),
    ]);

    const items = projects.map((p) => {
      const completed = p.completedAt ?? p.updatedAt;
      return {
        id: p.id,
        projectId: p.projectId,
        title: p.title,
        district: p.district,
        taluka: p.taluka,
        location: p.location,
        sector: p.sector,
        corporate: p.corporateName,
        amount: p.approvedBudget,
        utilizedAmount: p.utilizedAmount,
        completedAt: completed,
        year: completed ? new Date(completed).getFullYear() : null,
        beneficiaries: p.beneficiariesSummary,
        impact: p.impactSummary,
        photos: p.milestones.flatMap((m) => m.geoTaggedPhotoUrls).slice(0, 5),
      };
    });

    // Filter facets for the public gallery dropdowns
    const facets = await prisma.convergenceProject.findMany({
      where: { status: "COMPLETED" },
      select: { district: true, sector: true, corporateName: true, completedAt: true, updatedAt: true },
    });

    return successResponse(res, {
      projects: items,
      pagination: { page: pageNum, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) },
      filters: {
        districts: [...new Set(facets.map((f) => f.district))].sort(),
        sectors: [...new Set(facets.map((f) => f.sector))].sort(),
        corporates: [...new Set(facets.map((f) => f.corporateName))].sort(),
        years: [
          ...new Set(
            facets.map((f) => new Date(f.completedAt ?? f.updatedAt).getFullYear())
          ),
        ].sort((a, b) => b - a),
      },
    });
  } catch (error) {
    console.error("Error in getCompletedProjectsGallery:", error);
    return errorResponse(res, "Failed to fetch completed projects", 500);
  }
};

// ─── Success Stories ────────────────────────────────────────────────
// GET /api/public/success-stories — completed projects with impact narrative
export const getSuccessStories = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 6, 20);

    const projects = await prisma.convergenceProject.findMany({
      where: { status: "COMPLETED" },
      select: {
        id: true,
        projectId: true,
        title: true,
        district: true,
        sector: true,
        corporateName: true,
        approvedBudget: true,
        completedAt: true,
        updatedAt: true,
        beneficiariesSummary: true,
        impactSummary: true,
        milestones: {
          select: { geoTaggedPhotoUrls: true },
          where: { geoTaggedPhotoUrls: { isEmpty: false } },
          take: 1,
        },
      },
      orderBy: [{ completedAt: "desc" }, { updatedAt: "desc" }],
      take: limit,
    });

    return successResponse(res, {
      stories: projects.map((p) => ({
        id: p.id,
        projectId: p.projectId,
        title: p.title,
        district: p.district,
        sector: p.sector,
        corporate: p.corporateName,
        investment: p.approvedBudget,
        beneficiaries: p.beneficiariesSummary,
        impact: p.impactSummary,
        completedAt: p.completedAt ?? p.updatedAt,
        photo: p.milestones[0]?.geoTaggedPhotoUrls[0] ?? null,
      })),
    });
  } catch (error) {
    console.error("Error in getSuccessStories:", error);
    return errorResponse(res, "Failed to fetch success stories", 500);
  }
};

// ─── Public Directory ───────────────────────────────────────────────
// GET /api/public/directory — State CSR Cell, RMs, and District Nodal Officers
export const getPublicDirectory = async (req: Request, res: Response) => {
  try {
    const [officials, appointments] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: { in: [Role.STATE_CSR_CELL, Role.CSR_RELATIONSHIP_MANAGER] },
          accountStatus: "ACTIVE",
        },
        select: { id: true, email: true, role: true, assignedDistrict: true },
        orderBy: { role: "asc" },
      }),
      // Nodal officers surface through their formal appointments (letter signed by JS)
      prisma.nodalOfficerAppointment.findMany({
        select: {
          district: true,
          domain: true,
          nodalOfficerName: true,
          designation: true,
          department: true,
          nodalOfficerUser: { select: { email: true } },
          appointedAt: true,
        },
        orderBy: { appointedAt: "desc" },
      }),
    ]);

    // Latest appointment per district+domain
    const seen = new Set<string>();
    const nodalOfficers = appointments
      .filter((a) => {
        const key = `${a.district}::${a.domain}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((a) => ({
        role: "District Nodal Officer",
        name: a.nodalOfficerName,
        designation: a.designation,
        department: a.department,
        district: a.district,
        domain: a.domain,
        email: a.nodalOfficerUser?.email ?? null,
      }));

    return successResponse(res, {
      stateCell: officials
        .filter((o) => o.role === Role.STATE_CSR_CELL)
        .map((o) => ({ role: "State CSR Cell", email: o.email, district: "Maharashtra" })),
      relationshipManagers: officials
        .filter((o) => o.role === Role.CSR_RELATIONSHIP_MANAGER)
        .map((o) => ({
          role: "CSR Relationship Manager",
          email: o.email,
          district: o.assignedDistrict ?? "Maharashtra",
        })),
      nodalOfficers,
    });
  } catch (error) {
    console.error("Error in getPublicDirectory:", error);
    return errorResponse(res, "Failed to fetch directory", 500);
  }
};

// ─── Public Portal Stats (homepage) ─────────────────────────────────
// GET /api/public/portal-stats
export const getPublicPortalStats = async (_req: Request, res: Response) => {
  try {
    const [totalProjects, completedProjects, activePitches, budgetAgg, districtsCovered] =
      await Promise.all([
        prisma.convergenceProject.count(),
        prisma.convergenceProject.count({ where: { status: "COMPLETED" } }),
        prisma.governmentPitch.count({
          where: {
            status: {
              in: [
                GovernmentPitchStatus.JS_APPROVED,
                GovernmentPitchStatus.PUBLIC_LISTED,
                GovernmentPitchStatus.CORPORATE_INTEREST_RECEIVED,
              ],
            },
          },
        }),
        prisma.convergenceProject.aggregate({ _sum: { approvedBudget: true } }),
        prisma.convergenceProject.findMany({ select: { district: true }, distinct: ["district"] }),
      ]);

    return successResponse(res, {
      totalProjects,
      completedProjects,
      activePitches,
      totalCsrCommitted: budgetAgg._sum.approvedBudget ?? 0,
      districtsCovered: districtsCovered.length,
    });
  } catch (error) {
    console.error("Error in getPublicPortalStats:", error);
    return errorResponse(res, "Failed to fetch portal statistics", 500);
  }
};

// ─── Single Completed Project (public detail) ──────────────────────
// GET /api/public/completed-projects/:id
export const getCompletedProjectDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const project = await prisma.convergenceProject.findFirst({
      where: { OR: [{ id }, { projectId: id }], status: "COMPLETED" },
      select: {
        id: true,
        projectId: true,
        title: true,
        district: true,
        taluka: true,
        location: true,
        sector: true,
        corporateName: true,
        approvedBudget: true,
        utilizedAmount: true,
        completedAt: true,
        updatedAt: true,
        beneficiariesSummary: true,
        impactSummary: true,
        milestones: {
          select: { name: true, workType: true, status: true, geoTaggedPhotoUrls: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!project) return notFoundResponse(res, "Completed project not found");

    return successResponse(res, { project });
  } catch (error) {
    console.error("Error in getCompletedProjectDetail:", error);
    return errorResponse(res, "Failed to fetch project", 500);
  }
};

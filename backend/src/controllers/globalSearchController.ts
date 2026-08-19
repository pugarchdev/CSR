import { Response } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
  snippet?: string;
  category: "proposals" | "organizations" | "pitches" | "enquiries" | "users" | "issues" | "navigation";
  badge?: string;
  url: string;
  iconType?: string;
}

// In-memory LRU cache for high-speed sub-millisecond search retrieval
interface CacheEntry {
  results: SearchResultItem[];
  total: number;
  expiresAt: number;
}
const SEARCH_CACHE_TTL_MS = 60_000; // 60 seconds
const searchCache = new Map<string, CacheEntry>();

function getCachedResults(key: string): CacheEntry | null {
  const cached = searchCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    searchCache.delete(key);
    return null;
  }
  return cached;
}

function setCachedResults(key: string, results: SearchResultItem[], total: number) {
  if (searchCache.size >= 1000) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey) searchCache.delete(firstKey);
  }
  searchCache.set(key, {
    results,
    total,
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
  });
}

// Fast contextual snippet extractor
function extractSnippet(text: string | null | undefined, searchWord: string): string | undefined {
  if (!text || !searchWord) return undefined;
  const lowerText = text.toLowerCase();
  const lowerWord = searchWord.toLowerCase();
  const index = lowerText.indexOf(lowerWord);
  if (index === -1) return undefined;

  const start = Math.max(0, index - 20);
  const end = Math.min(text.length, index + searchWord.length + 45);
  let snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) snippet = `...${snippet}`;
  if (end < text.length) snippet = `${snippet}...`;
  return snippet;
}

export const globalSearchHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawQuery = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!rawQuery || rawQuery.length < 2) {
      return res.json({
        success: true,
        data: {
          results: [],
          total: 0,
        },
      });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 6, 1), 15);
    const user = req.user;
    const userRole = user?.role || "GUEST";
    const cacheKey = `${rawQuery.toLowerCase()}:${limit}:${userRole}`;

    // 1. Instant Cache Hit Check (<1ms)
    const cached = getCachedResults(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("Cache-Control", "private, max-age=30");
      return res.json({
        success: true,
        data: {
          results: cached.results,
          total: cached.total,
        },
      });
    }

    const isGovOrAdmin = Boolean(
      user &&
      (user.role === "SUPER_ADMIN" ||
        user.role === "ADMIN" ||
        user.role === "JOINT_SECRETARY" ||
        user.role === "SECRETARY" ||
        user.role === "RELATIONSHIP_MANAGER" ||
        user.role === "GOVERNMENT_OFFICER" ||
        user.role === "NODAL_OFFICER")
    );

    const words = rawQuery.split(/\s+/).filter(Boolean);
    const primaryWord = words[0] || rawQuery;

    // Concurrently execute fast indexed / targeted queries with strict limits
    const [projects, pitches, organizations, enquiries, grievances, helpdeskQueries, users] = await Promise.all([
      // 1. Unified Projects & Proposals
      prisma.project.findMany({
        where: {
          OR: [
            { projectCode: { contains: rawQuery, mode: "insensitive" } },
            { title: { contains: rawQuery, mode: "insensitive" } },
            { sector: { contains: rawQuery, mode: "insensitive" } },
            { district: { contains: rawQuery, mode: "insensitive" } },
            { description: { contains: rawQuery, mode: "insensitive" } },
          ],
        },
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          projectCode: true,
          sector: true,
          district: true,
          status: true,
        },
      }),

      // 2. Government Pitches
      prisma.governmentPitch.findMany({
        where: {
          OR: [
            { pitchReferenceId: { contains: rawQuery, mode: "insensitive" } },
            { title: { contains: rawQuery, mode: "insensitive" } },
            { department: { contains: rawQuery, mode: "insensitive" } },
            { district: { contains: rawQuery, mode: "insensitive" } },
            { csrRequirement: { contains: rawQuery, mode: "insensitive" } },
          ],
        },
        take: limit,
        select: {
          id: true,
          title: true,
          csrRequirement: true,
          department: true,
          district: true,
          status: true,
          pitchReferenceId: true,
        },
      }),

      // 3. Organizations (NGOs, Corporate Companies, Agencies, Departments)
      prisma.organization.findMany({
        where: {
          OR: [
            { registrationNumber: { contains: rawQuery, mode: "insensitive" } },
            { name: { contains: rawQuery, mode: "insensitive" } },
            { pan: { contains: rawQuery, mode: "insensitive" } },
            { cin: { contains: rawQuery, mode: "insensitive" } },
            { legalName: { contains: rawQuery, mode: "insensitive" } },
          ],
        },
        take: limit,
        select: {
          id: true,
          name: true,
          kind: true,
          status: true,
          registrationNumber: true,
        },
      }),

      // 4. Corporate Enquiries
      prisma.corporateEnquiry.findMany({
        where: {
          OR: [
            { trackingId: { contains: rawQuery, mode: "insensitive" } },
            { corporateName: { contains: rawQuery, mode: "insensitive" } },
            { sector: { contains: rawQuery, mode: "insensitive" } },
            { proposedCSRWork: { contains: rawQuery, mode: "insensitive" } },
          ],
        },
        take: limit,
        select: {
          id: true,
          corporateName: true,
          proposedCSRWork: true,
          sector: true,
          status: true,
          trackingId: true,
        },
      }),

      // 5. Grievances
      prisma.grievance.findMany({
        where: {
          OR: [
            { grievanceCode: { contains: rawQuery, mode: "insensitive" } },
            { issueTitle: { contains: rawQuery, mode: "insensitive" } },
          ],
        },
        take: 3,
        select: {
          id: true,
          issueTitle: true,
          grievanceCode: true,
          status: true,
        },
      }),

      // 6. Helpdesk Queries
      prisma.helpdeskQuery.findMany({
        where: {
          OR: [
            { trackingId: { contains: rawQuery, mode: "insensitive" } },
            { subject: { contains: rawQuery, mode: "insensitive" } },
          ],
        },
        take: 3,
        select: {
          id: true,
          subject: true,
          trackingId: true,
          status: true,
        },
      }),

      // 7. Users (Admin / Authority role-protected)
      isGovOrAdmin
        ? prisma.user.findMany({
            where: {
              OR: [
                { firstName: { contains: rawQuery, mode: "insensitive" } },
                { lastName: { contains: rawQuery, mode: "insensitive" } },
                { email: { contains: rawQuery, mode: "insensitive" } },
                { designation: { contains: rawQuery, mode: "insensitive" } },
              ],
            },
            take: 4,
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              designation: true,
              accountStatus: true,
              role: {
                select: {
                  name: true,
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const results: SearchResultItem[] = [];

    // Map Proposals
    projects.forEach((p) => {
      results.push({
        id: p.id,
        title: p.title,
        subtitle: `${p.sector} • ${p.district} • ${p.projectCode}`,
        snippet: extractSnippet(p.description, primaryWord),
        category: "proposals",
        badge: p.status,
        url: `/convergence-projects/${p.id}`,
        iconType: "folder",
      });
    });

    // Map Pitches
    pitches.forEach((pitch) => {
      results.push({
        id: pitch.id,
        title: pitch.title,
        subtitle: `${pitch.department || "Govt Dept"} • ${pitch.district || "Statewide"}${pitch.pitchReferenceId ? ` • ${pitch.pitchReferenceId}` : ""}`,
        snippet: extractSnippet(pitch.csrRequirement, primaryWord),
        category: "pitches",
        badge: pitch.status,
        url: `/pitches/${pitch.id}`,
        iconType: "file-text",
      });
    });

    // Map Organizations
    organizations.forEach((org) => {
      let targetUrl = "/agencies";
      if (org.kind === "CSR_COMPANY") targetUrl = "/companies";
      else if (org.kind === "GOVERNMENT_DEPARTMENT") targetUrl = "/departments";

      results.push({
        id: org.id,
        title: org.name,
        subtitle: `${org.kind.replace(/_/g, " ")} • Reg: ${org.registrationNumber || "N/A"}`,
        category: "organizations",
        badge: org.status,
        url: targetUrl,
        iconType: "building",
      });
    });

    // Map Enquiries
    enquiries.forEach((e) => {
      results.push({
        id: e.id,
        title: e.corporateName,
        subtitle: `${e.sector || "CSR Lead"} • Ref: ${e.trackingId || "Enquiry"}`,
        snippet: extractSnippet(e.proposedCSRWork, primaryWord),
        category: "enquiries",
        badge: e.status,
        url: `/enquiries/${e.id}`,
        iconType: "mail",
      });
    });

    // Map Grievances
    grievances.forEach((g) => {
      results.push({
        id: g.id,
        title: g.issueTitle,
        subtitle: `Grievance: ${g.grievanceCode}`,
        category: "issues",
        badge: g.status,
        url: `/grievances`,
        iconType: "shield-alert",
      });
    });

    // Map Helpdesk Queries
    helpdeskQueries.forEach((h) => {
      results.push({
        id: h.id,
        title: h.subject,
        subtitle: `Ticket: ${h.trackingId}`,
        category: "issues",
        badge: h.status,
        url: `/helpdesk`,
        iconType: "help",
      });
    });

    // Map Users
    users.forEach((u) => {
      const name = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email;
      results.push({
        id: u.id,
        title: name,
        subtitle: `${u.role?.name || u.designation || "Officer"} • ${u.email}`,
        category: "users",
        badge: u.accountStatus,
        url: `/admin/user-management`,
        iconType: "user",
      });
    });

    // Save to Cache
    setCachedResults(cacheKey, results, results.length);

    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "private, max-age=30");
    return res.json({
      success: true,
      data: {
        results,
        total: results.length,
      },
    });
  } catch (error) {
    console.error("Global search error:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to execute search query",
      },
    });
  }
};

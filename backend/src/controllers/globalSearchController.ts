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

// Helper to extract a readable contextual snippet around matched keyword
function extractSnippet(text: string | null | undefined, searchWord: string): string | undefined {
  if (!text || !searchWord) return undefined;
  const lowerText = text.toLowerCase();
  const lowerWord = searchWord.toLowerCase();
  const index = lowerText.indexOf(lowerWord);
  if (index === -1) return undefined;

  const start = Math.max(0, index - 25);
  const end = Math.min(text.length, index + searchWord.length + 50);
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

    const limit = Math.min(Math.max(Number(req.query.limit) || 6, 1), 20);
    const user = req.user;
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

    // Split multi-word queries for thorough word-level search
    const words = rawQuery.split(/\s+/).filter(Boolean);
    const primaryWord = words[0] || rawQuery;

    const [projects, pitches, organizations, enquiries, grievances, helpdeskQueries, users] = await Promise.all([
      // 1. Unified Projects & Proposals
      prisma.project.findMany({
        where: {
          OR: [
            { title: { contains: rawQuery, mode: "insensitive" } },
            { description: { contains: rawQuery, mode: "insensitive" } },
            { sector: { contains: rawQuery, mode: "insensitive" } },
            { focusArea: { contains: rawQuery, mode: "insensitive" } },
            { district: { contains: rawQuery, mode: "insensitive" } },
            { taluka: { contains: rawQuery, mode: "insensitive" } },
            { village: { contains: rawQuery, mode: "insensitive" } },
            { projectCode: { contains: rawQuery, mode: "insensitive" } },
            { beneficiariesSummary: { contains: rawQuery, mode: "insensitive" } },
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
          taluka: true,
          status: true,
          type: true,
        },
      }),

      // 2. Government Pitches
      prisma.governmentPitch.findMany({
        where: {
          OR: [
            { title: { contains: rawQuery, mode: "insensitive" } },
            { csrRequirement: { contains: rawQuery, mode: "insensitive" } },
            { district: { contains: rawQuery, mode: "insensitive" } },
            { department: { contains: rawQuery, mode: "insensitive" } },
            { officeName: { contains: rawQuery, mode: "insensitive" } },
            { designation: { contains: rawQuery, mode: "insensitive" } },
            { officialName: { contains: rawQuery, mode: "insensitive" } },
            { pitchReferenceId: { contains: rawQuery, mode: "insensitive" } },
            { exactLocation: { contains: rawQuery, mode: "insensitive" } },
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
            { name: { contains: rawQuery, mode: "insensitive" } },
            { legalName: { contains: rawQuery, mode: "insensitive" } },
            { displayName: { contains: rawQuery, mode: "insensitive" } },
            { registrationNumber: { contains: rawQuery, mode: "insensitive" } },
            { pan: { contains: rawQuery, mode: "insensitive" } },
            { cin: { contains: rawQuery, mode: "insensitive" } },
            { gstin: { contains: rawQuery, mode: "insensitive" } },
            { officialEmail: { contains: rawQuery, mode: "insensitive" } },
            { address: { contains: rawQuery, mode: "insensitive" } },
          ],
        },
        take: limit,
        select: {
          id: true,
          name: true,
          kind: true,
          status: true,
          registrationNumber: true,
          address: true,
        },
      }),

      // 4. Corporate Enquiries
      prisma.corporateEnquiry.findMany({
        where: {
          OR: [
            { corporateName: { contains: rawQuery, mode: "insensitive" } },
            { proposedCSRWork: { contains: rawQuery, mode: "insensitive" } },
            { sector: { contains: rawQuery, mode: "insensitive" } },
            { trackingId: { contains: rawQuery, mode: "insensitive" } },
            { contactEmail: { contains: rawQuery, mode: "insensitive" } },
            { contactPersonName: { contains: rawQuery, mode: "insensitive" } },
            { mca21CIN: { contains: rawQuery, mode: "insensitive" } },
            { district: { contains: rawQuery, mode: "insensitive" } },
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
            { issueTitle: { contains: rawQuery, mode: "insensitive" } },
            { issueDescription: { contains: rawQuery, mode: "insensitive" } },
            { grievanceCode: { contains: rawQuery, mode: "insensitive" } },
          ],
        },
        take: limit,
        select: {
          id: true,
          issueTitle: true,
          issueDescription: true,
          grievanceCode: true,
          status: true,
        },
      }),

      // 6. Helpdesk Queries
      prisma.helpdeskQuery.findMany({
        where: {
          OR: [
            { subject: { contains: rawQuery, mode: "insensitive" } },
            { message: { contains: rawQuery, mode: "insensitive" } },
            { trackingId: { contains: rawQuery, mode: "insensitive" } },
            { name: { contains: rawQuery, mode: "insensitive" } },
            { email: { contains: rawQuery, mode: "insensitive" } },
          ],
        },
        take: limit,
        select: {
          id: true,
          subject: true,
          message: true,
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
                { mobile: { contains: rawQuery, mode: "insensitive" } },
                { loginIdentifier: { contains: rawQuery, mode: "insensitive" } },
              ],
            },
            take: limit,
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
      const matchSnippet = extractSnippet(p.description, primaryWord);
      results.push({
        id: p.id,
        title: p.title,
        subtitle: `${p.sector} • ${p.district}${p.taluka ? ` (${p.taluka})` : ""} • ${p.projectCode}`,
        snippet: matchSnippet,
        category: "proposals",
        badge: p.status,
        url: `/convergence-projects/${p.id}`,
        iconType: "folder",
      });
    });

    // Map Pitches
    pitches.forEach((pitch) => {
      const matchSnippet = extractSnippet(pitch.csrRequirement, primaryWord);
      results.push({
        id: pitch.id,
        title: pitch.title,
        subtitle: `${pitch.department || "Govt Dept"} • ${pitch.district || "Statewide"}${pitch.pitchReferenceId ? ` • ${pitch.pitchReferenceId}` : ""}`,
        snippet: matchSnippet,
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
        snippet: extractSnippet(org.address, primaryWord),
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
        subtitle: `Grievance Ref: ${g.grievanceCode}`,
        snippet: extractSnippet(g.issueDescription, primaryWord),
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
        subtitle: `Helpdesk Ticket: ${h.trackingId}`,
        snippet: extractSnippet(h.message, primaryWord),
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

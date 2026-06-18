import prisma from "../config/db";
import { createClient } from "redis";

// Optional redis client
let redisClient: any = null;
(async () => {
  try {
    redisClient = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
    await redisClient.connect();
    console.log("Redis connected successfully for Matching Engine Caching.");
  } catch (err) {
    console.warn("Redis connection failed. Matching Engine running in dynamic mode (no cache).");
  }
})();

export class MatchingService {
  public static async calculateMatches(companyId: string): Promise<any[]> {
    const cacheKey = `matching:${companyId}`;

    // 1. Try Cache
    if (redisClient) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        console.error("Cache read error:", err);
      }
    }

    // 2. Fetch Company
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new Error("Company profile not found");

    // Fetch all approved/submitted projects
    const projects = await prisma.project.findMany({
      where: { status: "APPROVED" },
      include: { ngo: true }
    });

    const matches = projects.map((project) => {
      let score = 0;
      const factors: any = {
        focusAreaMatch: false,
        locationMatch: "none",
        budgetFitScore: 0,
        historicalPerformanceScore: 0
      };

      // A. Focus Area Match (35 Points)
      const focusAreas = company.focusAreas.map(f => f.toLowerCase());
      if (focusAreas.includes(project.focusArea.toLowerCase())) {
        score += 35;
        factors.focusAreaMatch = true;
      }

      // B. Location Match (35 Points)
      // Read contact district from company contactInfo JSON
      const companyContact = company.contactInfo as any;
      const companyDistrict = companyContact?.district || "Pune"; // default fallback for seeding

      if (project.district.toLowerCase() === companyDistrict.toLowerCase()) {
        score += 25;
        factors.locationMatch = "district_match";
        
        // Check Taluka match
        const companyTaluka = companyContact?.taluka;
        if (companyTaluka && project.taluka.toLowerCase() === companyTaluka.toLowerCase()) {
          score += 10;
          factors.locationMatch = "district_and_taluka_match";
        }
      } else if (project.state.toLowerCase() === "maharashtra") {
        score += 10;
        factors.locationMatch = "state_match";
      }

      // C. Financial Fit (20 Points)
      const projectBudget = Number(project.budgetRequested);
      const companyRemainingBudget = Number(company.csrBudget);

      if (projectBudget <= companyRemainingBudget * 0.2) {
        score += 20;
        factors.budgetFitScore = 20;
      } else if (projectBudget <= companyRemainingBudget * 0.5) {
        score += 15;
        factors.budgetFitScore = 15;
      } else if (projectBudget <= companyRemainingBudget) {
        score += 10;
        factors.budgetFitScore = 10;
      } else {
        score += 5;
        factors.budgetFitScore = 5;
      }

      // D. NGO Historical Performance (10 Points)
      const ngoStats = project.ngo.impactStatistics as any;
      const completedCount = ngoStats?.projectsCompleted || 0;
      
      if (completedCount >= 5) {
        score += 10;
        factors.historicalPerformanceScore = 10;
      } else if (completedCount > 0) {
        score += 5;
        factors.historicalPerformanceScore = 5;
      } else {
        score += 2;
        factors.historicalPerformanceScore = 2;
      }

      return {
        projectId: project.id,
        projectTitle: project.title,
        ngoId: project.ngoId,
        ngoName: project.ngo.name,
        focusArea: project.focusArea,
        district: project.district,
        budgetRequested: project.budgetRequested,
        score,
        factors
      };
    });

    // Sort matches by score descending
    const sortedMatches = matches.sort((a, b) => b.score - a.score);

    // Save matches to DB (upsert)
    for (const m of sortedMatches) {
      await prisma.matchScore.upsert({
        where: {
          companyId_projectId: {
            companyId,
            projectId: m.projectId
          }
        },
        update: {
          score: m.score,
          factors: m.factors
        },
        create: {
          companyId,
          projectId: m.projectId,
          score: m.score,
          factors: m.factors
        }
      });
    }

    // 3. Cache results
    if (redisClient) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(sortedMatches), { EX: 600 }); // 10 mins cache
      } catch (err) {
        console.error("Cache write error:", err);
      }
    }

    return sortedMatches;
  }

  public static async invalidateCache(companyId: string) {
    if (redisClient) {
      try {
        await redisClient.del(`matching:${companyId}`);
      } catch (err) {
        console.error("Cache invalidate error:", err);
      }
    }
  }
}

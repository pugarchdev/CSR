import prisma from "../config/db";
import { Role } from "../types/role";
import { CorporateEnquiryStatus, GovernmentPitchStatus } from "@prisma/client";

/**
 * Automatically assigns a Relationship Manager (RM) based on workload (fewest active assignments).
 * If multiple RMs have the same lowest workload, one is selected randomly.
 */
export async function getLeastLoadedRM(tenantId?: string | null) {
  // 1. Fetch all active Relationship Managers
  const rms = await prisma.user.findMany({
    where: {
      role: Role.CSR_RELATIONSHIP_MANAGER,
      accountStatus: "ACTIVE",
    },
    select: {
      id: true,
      email: true,
      assignedDistrict: true,
    },
  });

  if (rms.length === 0) {
    return null;
  }

  // 2. Calculate active workload count for each RM
  const rmWorkloads = await Promise.all(
    rms.map(async (rm) => {
      const activeEnquiriesCount = await prisma.corporateEnquiry.count({
        where: {
          assignedRelationshipManagerId: rm.id,
          status: {
            notIn: [CorporateEnquiryStatus.COMPLETED, CorporateEnquiryStatus.CLOSED],
          },
        },
      });

      const activePitchesCount = await prisma.governmentPitch.count({
        where: {
          assignedRelationshipManagerId: rm.id,
          status: {
            notIn: [GovernmentPitchStatus.COMPLETED, GovernmentPitchStatus.CLOSED, GovernmentPitchStatus.JS_REJECTED],
          },
        },
      });

      return {
        rm,
        totalWorkload: activeEnquiriesCount + activePitchesCount,
      };
    })
  );

  // 3. Find minimum workload count
  const minWorkload = Math.min(...rmWorkloads.map((item) => item.totalWorkload));

  // 4. Filter RMs tied for the lowest workload
  const leastLoadedRMs = rmWorkloads
    .filter((item) => item.totalWorkload === minWorkload)
    .map((item) => item.rm);

  // 5. Pick one randomly among the least loaded RMs
  const randomIndex = Math.floor(Math.random() * leastLoadedRMs.length);
  return leastLoadedRMs[randomIndex];
}

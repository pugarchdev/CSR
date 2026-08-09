import { MouService } from "../services/mouService";
import { MilestoneService } from "../services/milestoneService";

describe("MoU & Milestone Governance Engine Tests", () => {
  it("should expose MouService methods correctly", () => {
    expect(typeof MouService.initiateMou).toBe("function");
    expect(typeof MouService.updateMouDraft).toBe("function");
    expect(typeof MouService.recordSignature).toBe("function");
    expect(typeof MouService.getMouByProjectId).toBe("function");
  });

  it("should expose MilestoneService methods correctly", () => {
    expect(typeof MilestoneService.proposeMilestones).toBe("function");
    expect(typeof MilestoneService.approveMilestonePlan).toBe("function");
    expect(typeof MilestoneService.submitProgress).toBe("function");
    expect(typeof MilestoneService.verifyMilestone).toBe("function");
    expect(typeof MilestoneService.getProjectMilestones).toBe("function");
  });
});

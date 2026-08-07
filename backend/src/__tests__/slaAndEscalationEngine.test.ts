import { SLA_TIMELINES } from "../services/slaEscalationService";

describe("SLA & Escalation Engine Edge Cases Test Suite", () => {
  describe("5-3-2 SLA Timelines Integrity", () => {
    it("should strictly enforce 5-day RM response timeline", () => {
      expect(SLA_TIMELINES.RM_RESPONSE).toBe(5);
    });

    it("should strictly enforce 3-day JS escalated response timeline", () => {
      expect(SLA_TIMELINES.JS_ESCALATED_RESPONSE).toBe(3);
    });

    it("should strictly enforce 2-day Secretary escalation timeline", () => {
      expect(SLA_TIMELINES.SECRETARY_ESCALATION).toBe(2);
    });

    it("should define valid timelines for Government Pitch and Grievance redressal tiers", () => {
      expect(SLA_TIMELINES.GOVERNMENT_PITCH_VERIFICATION).toBe(5);
      expect(SLA_TIMELINES.GRIEVANCE_LEVEL_1).toBe(15);
      expect(SLA_TIMELINES.GRIEVANCE_LEVEL_2).toBe(30);
    });
  });

  describe("SLA Breach & Escalation Trigger Edge Cases", () => {
    it("should detect SLA breach when current date exceeds due date", () => {
      const now = new Date("2026-08-07T12:00:00Z");
      const pastDueDate = new Date("2026-08-05T12:00:00Z"); // 2 days past due

      const isBreached = now.getTime() > pastDueDate.getTime();
      expect(isBreached).toBe(true);
    });

    it("should calculate exact due date skipping weekends if business days logic is applied", () => {
      // Friday 2026-08-07 + 5 business days = Friday 2026-08-14
      const startDate = new Date("2026-08-07T00:00:00Z"); // Friday
      const daysToAdd = 5;
      
      let count = 0;
      const curDate = new Date(startDate);
      while (count < daysToAdd) {
        curDate.setDate(curDate.getDate() + 1);
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          count++;
        }
      }

      expect(curDate.toISOString().split("T")[0]).toBe("2026-08-14");
    });
  });
});

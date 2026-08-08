import nodemailer from "nodemailer";

const sendMailMock = jest.fn().mockResolvedValue({
  messageId: "msg-test-123",
  response: "250 OK"
});

jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: (...args: any[]) => sendMailMock(...args)
  })
}));

import { sendTemplateEmail } from "../services/emailService";

describe("Application Status Change Email Notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sendMailMock.mockResolvedValue({
      messageId: "msg-test-123",
      response: "250 OK"
    });
  });

  test("1. Renders APPROVED status email with green branding and status badge", async () => {
    const payload = {
      to: "applicant@example.com",
      templateName: "workflow_notification",
      trackingId: "REQ-2026-9999",
      applicantName: "Aarav Sharma",
      currentStatus: "APPROVED",
      workflowStatus: "Your CSR application has met all mandatory verification criteria.",
      actionButtonUrl: "https://mahacsr.gov.in/applications/REQ-2026-9999",
      subject: "CSR Application Approved"
    };

    const result = await sendTemplateEmail(payload);

    expect(result.messageId).toBeDefined();
    expect(sendMailMock).toHaveBeenCalledTimes(1);

    const mailArgs = sendMailMock.mock.calls[0][0];
    expect(mailArgs.to).toBe("applicant@example.com");
    expect(mailArgs.subject).toBe("CSR Application Approved");

    const html = mailArgs.html;
    expect(html).toContain("APPROVED");
    expect(html).toContain("Aarav Sharma");
    expect(html).toContain("REQ-2026-9999");
    expect(html).toContain("We are pleased to inform you that your application");
    expect(html).toContain("#15803d"); // Approved text color
  });

  test("2. Renders REJECTED status email with red branding and rejection details", async () => {
    const payload = {
      to: "ngo@example.org",
      templateName: "workflow_notification",
      trackingId: "ORG-2026-444",
      applicantName: "Vikas Foundation",
      currentStatus: "REJECTED",
      workflowStatus: "Submission missing 80G validity renewal document.",
      actionButtonUrl: "https://mahacsr.gov.in/onboarding",
      subject: "Organization Onboarding Rejected"
    };

    const result = await sendTemplateEmail(payload);

    expect(result.messageId).toBeDefined();
    const mailArgs = sendMailMock.mock.calls[0][0];
    const html = mailArgs.html;

    expect(html).toContain("REJECTED");
    expect(html).toContain("Vikas Foundation");
    expect(html).toContain("Submission missing 80G validity renewal document.");
    expect(html).toContain("#b91c1c"); // Rejected text color
  });

  test("3. Renders CLARIFICATION_REQUIRED status email with amber branding and action warning", async () => {
    const payload = {
      to: "csr@company.com",
      templateName: "workflow_notification",
      trackingId: "PITCH-2026-789",
      applicantName: "Reliance CSR Wing",
      currentStatus: "CLARIFICATION_REQUIRED",
      workflowStatus: "Please upload the revised project timeline breakdown.",
      actionButtonUrl: "https://mahacsr.gov.in/pitches/789",
      subject: "Action Required - Clarification Needed"
    };

    const result = await sendTemplateEmail(payload);

    expect(result.messageId).toBeDefined();
    const mailArgs = sendMailMock.mock.calls[0][0];
    const html = mailArgs.html;

    expect(html).toContain("CLARIFICATION REQUIRED");
    expect(html).toContain("Reliance CSR Wing");
    expect(html).toContain("Please upload the revised project timeline breakdown.");
    expect(html).toContain("#b45309"); // Clarification text color
  });
});

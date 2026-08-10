import nodemailer from "nodemailer";

const sendMailMock = jest.fn().mockResolvedValue({
  messageId: "msg-test-url-123",
  response: "250 OK"
});

jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: (...args: any[]) => sendMailMock(...args)
  })
}));

import { getAbsoluteUrl, sendUserInvitationEmail } from "../services/emailService";

describe("Email URL Resolution and Environment Routing", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("1. Resolves localhost URLs in development mode", () => {
    process.env.NODE_ENV = "development";
    process.env.FRONTEND_URL = "http://localhost:3000";

    expect(getAbsoluteUrl("/login")).toBe("http://localhost:3000/login");
    expect(getAbsoluteUrl("/dashboard")).toBe("http://localhost:3000/dashboard");
    expect(getAbsoluteUrl("http://localhost:3000/activate?token=abc")).toBe("http://localhost:3000/activate?token=abc");
  });

  test("2. Re-anchors localhost or internal URLs to production domain when FRONTEND_URL is production", () => {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "https://mahacsr.maharashtra.gov.in";

    expect(getAbsoluteUrl("/login")).toBe("https://mahacsr.maharashtra.gov.in/login");
    expect(getAbsoluteUrl("/dashboard")).toBe("https://mahacsr.maharashtra.gov.in/dashboard");
    expect(getAbsoluteUrl("http://localhost:3000/login")).toBe("https://mahacsr.maharashtra.gov.in/login");
    expect(getAbsoluteUrl("http://localhost:3000/activate?token=xyz123")).toBe("https://mahacsr.maharashtra.gov.in/activate?token=xyz123");
  });

  test("3. Renders login and dashboard links in invitation emails matching environment URL", async () => {
    process.env.NODE_ENV = "development";
    process.env.FRONTEND_URL = "http://localhost:3000";

    await sendUserInvitationEmail({
      to: "test.rm@mahacsr.gov.in",
      applicantName: "Anand",
      roleName: "RELATIONSHIP_MANAGER",
      password: "secretpassword",
      loginUrl: "/login",
      dashboardUrl: "/dashboard"
    });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const html = sendMailMock.mock.calls[0][0].html;

    expect(html).toContain('href="http://localhost:3000/login"');
    expect(html).toContain('href="http://localhost:3000/dashboard"');
    expect(html).toContain("Log In to Portal");
    expect(html).toContain("Open Dashboard");
  });
});

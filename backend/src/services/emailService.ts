import nodemailer from "nodemailer";
import { getPrimaryFrontendUrl } from "../config/env";

// SMTP connection pool config
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "1025", 10),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS || ""
  } : undefined,
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 5000
});

interface EmailPayload {
  to: string;
  templateName: string;
  trackingId?: string;
  applicantName: string;
  currentStatus: string;
  workflowStatus?: string;
  actionButtonUrl?: string;
  actionButtonText?: string;
  subject: string;
}

export const getAbsoluteUrl = (url?: string | null): string => {
  const trimmed = (url || "").trim();
  const portalBase = getPrimaryFrontendUrl();
  if (!trimmed) return portalBase;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const rawUrl = trimmed.split(",")[0].trim();
      const parsed = new URL(rawUrl);

      const internalHosts = [
        "localhost",
        "127.0.0.1",
        "mahacsr.gov.in",
        "mahacsr.maharashtra.gov.in",
        "csr-seven.vercel.app",
        "pugarch-csr.vercel.app"
      ];
      const isInternalHost = internalHosts.some(
        (h) => parsed.hostname === h || parsed.hostname.endsWith("." + h)
      );

      if (isInternalHost || rawUrl.includes("localhost") || rawUrl.includes("127.0.0.1")) {
        return `${portalBase}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
      return rawUrl;
    } catch {
      const slashPathIdx = trimmed.indexOf("/", trimmed.indexOf("://") + 3);
      const path = slashPathIdx !== -1 ? trimmed.substring(slashPathIdx) : "";
      return `${portalBase}${path}`;
    }
  }

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${portalBase}${path}`;
};

export async function sendTemplateEmail(payload: EmailPayload): Promise<{ messageId: string; response: string }> {
  const portalLogo = "https://mahacsr.maharashtra.gov.in/assets/logo.png";
  const supportEmail = "support.csr@maharashtra.gov.in";

  const status = (payload.currentStatus || "").toUpperCase();
  const targetUrl = getAbsoluteUrl(payload.actionButtonUrl);

  // Status Theme Configuration
  let theme = {
    badgeBg: "#dbeafe",
    badgeText: "#1e40af",
    borderAccent: "#3b82f6",
    statusBoxBg: "#eff6ff",
    badgeLabel: "STATUS UPDATE",
    introMessage: "Your application or workflow status has been updated on the MahaCSR Portal."
  };

  if (status.includes("APPROVED") || status.includes("VERIFIED") || status.includes("ACTIVE")) {
    theme = {
      badgeBg: "#dcfce7",
      badgeText: "#15803d",
      borderAccent: "#22c55e",
      statusBoxBg: "#f0fdf4",
      badgeLabel: "APPLICATION APPROVED",
      introMessage: "We are pleased to inform you that your application on the Maharashtra State CSR Convergence Portal has been approved!"
    };
  } else if (status.includes("CLARIFICATION")) {
    theme = {
      badgeBg: "#fef3c7",
      badgeText: "#b45309",
      borderAccent: "#f59e0b",
      statusBoxBg: "#fffbeb",
      badgeLabel: "CLARIFICATION REQUIRED",
      introMessage: "Your application requires clarification or minor corrections before proceeding. Please review the details below:"
    };
  } else if (status.includes("REJECTED")) {
    theme = {
      badgeBg: "#ffe4e6",
      badgeText: "#b91c1c",
      borderAccent: "#f43f5e",
      statusBoxBg: "#fff1f2",
      badgeLabel: "APPLICATION REJECTED",
      introMessage: "Your application on the Maharashtra State CSR Convergence Portal has been reviewed. Below is the decision regarding your submission:"
    };
  }

  const formattedStatusName = status.replace(/_/g, " ");

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
          .header { background: #0b192c; padding: 25px; text-align: center; border-bottom: 4px solid #ff9800; }
          .logo { max-height: 45px; }
          .body { padding: 30px; color: #334e68; }
          .badge { display: inline-block; padding: 6px 14px; background: ${theme.badgeBg}; color: ${theme.badgeText}; font-weight: bold; border-radius: 20px; font-size: 12px; margin-bottom: 15px; }
          .h1 { color: #102a43; font-size: 20px; font-weight: bold; margin-bottom: 10px; }
          .detail-box { background: ${theme.statusBoxBg}; border-left: 4px solid ${theme.borderAccent}; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .detail-row { margin-bottom: 8px; font-size: 14px; }
          .detail-label { font-weight: bold; color: #486581; display: inline-block; width: 140px; }
          .button-container { text-align: center; margin: 25px 0; }
          .btn-accent { background: #ff9800; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; }
          .footer { background: #f0f4f8; text-align: center; padding: 20px; font-size: 12px; color: #627d98; border-top: 1px solid #d9e2ec; }
          .footer a { color: #102a43; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${portalLogo}" alt="MahaCSR Portal Logo" class="logo" />
          </div>
          <div class="body">
            <div class="badge">${theme.badgeLabel}</div>
            <div class="h1">${payload.subject}</div>
            <p>Dear <strong>${payload.applicantName}</strong>,</p>
            <p>${theme.introMessage}</p>
            
            <div class="detail-box">
              ${payload.trackingId ? `
              <div class="detail-row">
                <span class="detail-label">Tracking ID:</span>
                <span><strong>${payload.trackingId}</strong></span>
              </div>` : ""}
              <div class="detail-row">
                <span class="detail-label">Current Status:</span>
                <span><strong style="color: ${theme.badgeText};">${formattedStatusName}</strong></span>
              </div>
              ${payload.workflowStatus ? `
              <div class="detail-row">
                <span class="detail-label">Details / Remarks:</span>
                <span>${payload.workflowStatus}</span>
              </div>` : ""}
            </div>

            ${targetUrl ? `
            <div class="button-container">
              <a href="${targetUrl}" class="btn-accent" target="_blank">${payload.actionButtonText || "View Application in Portal"}</a>
            </div>` : ""}

            <p style="font-size: 13px; color: #486581;">If you have any questions regarding this status update, please access your dashboard or contact our support helpdesk.</p>
          </div>
          <div class="footer">
            <p>© 2026 Government of Maharashtra | CSR Convergence Portal</p>
            <p>Need assistance? Email us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.SMTP_FROM || `"MahaCSR Portal" <noreply@mahacsr.gov.in>`,
    to: payload.to,
    subject: payload.subject,
    html: htmlBody
  };

  const info = await transporter.sendMail(mailOptions);
  return {
    messageId: info.messageId,
    response: info.response
  };
}

export interface UserInvitationEmailInput {
  to: string;
  applicantName: string;
  roleName: string;
  password?: string;
  loginUrl?: string;
  dashboardUrl?: string;
  resetUrl?: string;
  isAutogenerated?: boolean;
}

export async function sendUserInvitationEmail(payload: UserInvitationEmailInput): Promise<{ messageId: string; response: string }> {
  const portalLogo = "https://mahacsr.maharashtra.gov.in/assets/logo.png";
  const supportEmail = "support.csr@maharashtra.gov.in";
  const subject = "Welcome to Maharashtra State CSR Portal — Account Credentials";

  const loginUrl = getAbsoluteUrl(payload.loginUrl || "/login");
  const dashboardUrl = getAbsoluteUrl(payload.dashboardUrl || "/dashboard");
  const resetUrl = payload.resetUrl ? getAbsoluteUrl(payload.resetUrl) : undefined;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #334e68; }
          .container { max-width: 600px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); margin: 0 auto; }
          .header { background: #0d1c3a; padding: 30px; text-align: center; border-bottom: 4px solid #ff9800; }
          .logo { max-height: 60px; }
          .body { padding: 30px; line-height: 1.6; }
          .h1 { font-size: 20px; color: #102a43; font-weight: 700; margin-bottom: 15px; }
          .detail-box { background: #f0f4f8; border-left: 4px solid #0d1c3a; padding: 15px 20px; border-radius: 6px; margin: 20px 0; }
          .detail-row { margin-bottom: 8px; font-size: 14px; }
          .detail-label { font-weight: bold; color: #486581; display: inline-block; width: 140px; }
          .button-container { text-align: center; margin: 25px 0; }
          .btn { background: #1e40af; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block; margin: 5px; }
          .btn-dash { background: #0d1c3a; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block; margin: 5px; }
          .btn-sec { background: #ff9800; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block; margin: 5px; }
          .footer { background: #f0f4f8; text-align: center; padding: 20px; font-size: 12px; color: #627d98; border-top: 1px solid #d9e2ec; }
          .footer a { color: #0d1c3a; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${portalLogo}" alt="MahaCSR Portal Logo" class="logo" />
          </div>
          <div class="body">
            <div class="h1">Welcome to Maharashtra CSR Portal</div>
            <p>Dear <strong>${payload.applicantName}</strong>,</p>
            <p>Your user account on the Maharashtra State CSR Convergence Portal has been successfully created. Below are your account details:</p>
            
            <div class="detail-box">
              <div class="detail-row">
                <span class="detail-label">Official Email:</span>
                <span><strong>${payload.to}</strong></span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Assigned Role:</span>
                <span><strong>${payload.roleName}</strong></span>
              </div>
              ${payload.password ? `
              <div class="detail-row">
                <span class="detail-label">Password:</span>
                <span style="font-family: monospace; background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-size: 15px;"><strong>${payload.password}</strong></span>
              </div>` : ""}
            </div>

            <p style="font-size: 13px; color: #475569;">
              ${payload.isAutogenerated 
                ? "A temporary password has been autogenerated for your account. You can log in directly using the credentials above or reset your password using the activation link." 
                : "You can log in directly using the password configured by your administrator, or use the link below if you wish to reset your password."}
            </p>

            <div class="button-container">
              <a href="${loginUrl}" class="btn" target="_blank">Log In to Portal</a>
              <a href="${dashboardUrl}" class="btn-dash" target="_blank">Open Dashboard</a>
              ${resetUrl ? `<a href="${resetUrl}" class="btn-sec" target="_blank">Set / Reset Password</a>` : ""}
            </div>

            <p style="font-size: 11px; color: #64748b; word-break: break-all;">
              Login Link: <a href="${loginUrl}">${loginUrl}</a><br/>
              Dashboard Link: <a href="${dashboardUrl}">${dashboardUrl}</a><br/>
              ${resetUrl ? `Password Reset Link: <a href="${resetUrl}">${resetUrl}</a>` : ""}
            </p>
          </div>
          <div class="footer">
            <p>© 2026 Government of Maharashtra | CSR Convergence Portal</p>
            <p>Need support? Email us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.SMTP_FROM || `"MahaCSR Portal" <noreply@mahacsr.gov.in>`,
    to: payload.to,
    subject,
    html: htmlBody
  };

  const info = await transporter.sendMail(mailOptions);
  return {
    messageId: info.messageId,
    response: info.response
  };
}

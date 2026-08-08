import nodemailer from "nodemailer";

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

export async function sendTemplateEmail(payload: EmailPayload): Promise<{ messageId: string; response: string }> {
  const portalLogo = "https://mahacsr.maharashtra.gov.in/assets/logo.png";
  const supportEmail = "support.csr@maharashtra.gov.in";

  const status = (payload.currentStatus || "").toUpperCase();

  // Status Theme Configuration
  let theme = {
    badgeBg: "#dbeafe",
    badgeText: "#1e40af",
    borderAccent: "#3b82f6",
    statusBoxBg: "#eff6ff",
    bannerTitle: "Status Update",
    introMessage: "Your request on the Maharashtra State CSR Convergence Portal has been updated."
  };

  if (["APPROVED", "ACTIVE", "PUBLIC_LISTED", "JS_APPROVED", "COMPLETED", "FEASIBLE"].includes(status)) {
    theme = {
      badgeBg: "#dcfce7",
      badgeText: "#15803d",
      borderAccent: "#22c55e",
      statusBoxBg: "#f0fdf4",
      bannerTitle: "Application Approved",
      introMessage: "We are pleased to inform you that your application on the Maharashtra State CSR Convergence Portal has been approved!"
    };
  } else if (["REJECTED", "SUSPENDED", "JS_REJECTED", "NOT_FEASIBLE", "CANCELLED"].includes(status)) {
    theme = {
      badgeBg: "#fee2e2",
      badgeText: "#b91c1c",
      borderAccent: "#ef4444",
      statusBoxBg: "#fef2f2",
      bannerTitle: "Application Status Update",
      introMessage: "Your application on the Maharashtra State CSR Convergence Portal has been reviewed. Below is the decision regarding your submission:"
    };
  } else if (["CLARIFICATION_REQUIRED", "RETURNED_FOR_CLARIFICATION", "RETURNED_FOR_CORRECTION", "PROCEED_WITH_CONDITIONS"].includes(status)) {
    theme = {
      badgeBg: "#fef3c7",
      badgeText: "#b45309",
      borderAccent: "#f59e0b",
      statusBoxBg: "#fffbeb",
      bannerTitle: "Action Required - Clarification Needed",
      introMessage: "Your application requires clarification or minor corrections before proceeding. Please review the details below:"
    };
  } else if (["SUBMITTED", "UNDER_VERIFICATION", "UNDER_REVIEW", "UNDER_RM_REVIEW", "JS_APPROVAL_PENDING", "REGISTERED"].includes(status)) {
    theme = {
      badgeBg: "#dbeafe",
      badgeText: "#1d4ed8",
      borderAccent: "#3b82f6",
      statusBoxBg: "#eff6ff",
      bannerTitle: "Application Under Review",
      introMessage: "Your application has been received and is currently under review by the nodal team."
    };
  }

  const formattedStatusName = status ? status.replace(/_/g, " ") : "UPDATED";

  // Build responsive email body
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${payload.subject}</title>
        <style>
          body { font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #334e68; }
          .container { max-width: 600px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); margin: 0 auto; }
          .header { background: #0d1c3a; padding: 25px 30px; text-align: center; border-bottom: 4px solid ${theme.borderAccent}; }
          .logo { max-height: 55px; }
          .body { padding: 35px 30px; line-height: 1.6; }
          .h1 { font-size: 20px; color: #102a43; font-weight: 700; margin-bottom: 12px; }
          .status-badge { display: inline-block; background-color: ${theme.badgeBg}; color: ${theme.badgeText}; padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 13px; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 15px; }
          .detail-box { background: ${theme.statusBoxBg}; border-left: 4px solid ${theme.borderAccent}; padding: 18px 20px; border-radius: 6px; margin: 20px 0; }
          .detail-row { margin-bottom: 10px; font-size: 14px; }
          .detail-row:last-child { margin-bottom: 0; }
          .detail-label { font-weight: bold; color: #486581; display: inline-block; width: 140px; }
          .button-container { text-align: center; margin: 30px 0; }
          .btn { background: #0d1c3a; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 2px 5px rgba(13,28,58,0.2); }
          .btn-accent { background: ${theme.borderAccent}; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 2px 5px rgba(0,0,0,0.15); }
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
            <div class="status-badge">${formattedStatusName}</div>
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

            ${payload.actionButtonUrl ? `
            <div class="button-container">
              <a href="${payload.actionButtonUrl}" class="btn-accent" target="_blank">${payload.actionButtonText || "View Application in Portal"}</a>
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
  loginUrl: string;
  resetUrl: string;
  isAutogenerated: boolean;
}

export async function sendUserInvitationEmail(payload: UserInvitationEmailInput): Promise<{ messageId: string; response: string }> {
  const portalLogo = "https://mahacsr.maharashtra.gov.in/assets/logo.png";
  const supportEmail = "support.csr@maharashtra.gov.in";
  const subject = "Welcome to Maharashtra State CSR Portal — Account Credentials";

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
              <a href="${payload.loginUrl}" class="btn" target="_blank">Log In to Portal</a>
              ${payload.resetUrl ? `<a href="${payload.resetUrl}" class="btn-sec" target="_blank">Set / Reset Password</a>` : ""}
            </div>

            <p style="font-size: 11px; color: #64748b; word-break: break-all;">
              Login Link: <a href="${payload.loginUrl}">${payload.loginUrl}</a><br/>
              ${payload.resetUrl ? `Password Reset Link: <a href="${payload.resetUrl}">${payload.resetUrl}</a>` : ""}
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

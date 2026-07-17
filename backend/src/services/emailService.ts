import nodemailer from "nodemailer";

// SMTP connection pool config
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "1025", 10),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS || ""
  } : undefined
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
          .header { background: #0d1c3a; padding: 30px; text-align: center; border-bottom: 4px solid #ff9800; }
          .logo { max-height: 60px; }
          .body { padding: 40px 30px; line-height: 1.6; }
          .h1 { font-size: 20px; color: #102a43; font-weight: 700; margin-bottom: 20px; }
          .detail-box { background: #f0f4f8; border-left: 4px solid #0d1c3a; padding: 15px 20px; border-radius: 4px; margin: 25px 0; }
          .detail-row { margin-bottom: 10px; font-size: 14px; }
          .detail-label { font-weight: bold; color: #486581; display: inline-block; width: 140px; }
          .button-container { text-align: center; margin: 35px 0; }
          .btn { background: #ff9800; color: #ffffff !important; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 2px 5px rgba(255,152,0,0.3); }
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
            <div class="h1">${payload.subject}</div>
            <p>Dear ${payload.applicantName},</p>
            <p>Your request on the Maharashtra State CSR Convergence Portal has been processed. Below are the details regarding your submission:</p>
            
            <div class="detail-box">
              ${payload.trackingId ? `
              <div class="detail-row">
                <span class="detail-label">Tracking ID:</span>
                <span><strong>${payload.trackingId}</strong></span>
              </div>` : ""}
              <div class="detail-row">
                <span class="detail-label">Current Status:</span>
                <span><strong>${payload.currentStatus}</strong></span>
              </div>
              ${payload.workflowStatus ? `
              <div class="detail-row">
                <span class="detail-label">Workflow Status:</span>
                <span>${payload.workflowStatus}</span>
              </div>` : ""}
            </div>

            ${payload.actionButtonUrl ? `
            <div class="button-container">
              <a href="${payload.actionButtonUrl}" class="btn" target="_blank">${payload.actionButtonText || "View Portal"}</a>
            </div>` : ""}

            <p>If you have any questions or require support, please reach out to our helpdesk at support team.</p>
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
    subject: payload.subject,
    html: htmlBody
  };

  const info = await transporter.sendMail(mailOptions);
  return {
    messageId: info.messageId,
    response: info.response
  };
}

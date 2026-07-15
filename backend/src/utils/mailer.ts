import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
const smtpSecure = process.env.SMTP_SECURE === "true";
const smtpUser = process.env.SMTP_USER || "agadge797@gmail.com";
const smtpPass = process.env.SMTP_PASS || "wrmq ifol neuq vznp";

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
  tls: {
    rejectUnauthorized: false
  }
});

export const sendOtpEmail = async (toEmail: string, otp: string) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>MahaCSR Email Verification</title>
      <style>
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          background-color: #f3f4f6;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          border: 1px solid #e5e7eb;
        }
        .header {
          background-color: #1e3a8a; /* Gov Navy */
          padding: 30px;
          text-align: center;
          border-bottom: 4px solid #f97316; /* Gov Saffron */
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .header p {
          color: #eff6ff;
          margin: 5px 0 0 0;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
          color: #1f2937;
          line-height: 1.6;
        }
        .content h2 {
          color: #111827;
          font-size: 20px;
          margin-top: 0;
        }
        .otp-box {
          background: #fdf2e9; /* Light Saffron tint */
          border: 2px dashed #f97316;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          margin: 30px 0;
        }
        .otp-code {
          font-size: 36px;
          font-weight: 800;
          letter-spacing: 8px;
          color: #f97316;
          margin: 0;
        }
        .warning-text {
          font-size: 13px;
          color: #6b7280;
          margin-top: 15px;
          font-style: italic;
        }
        .footer {
          background-color: #f9fafb;
          padding: 20px 30px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #9ca3af;
        }
        .footer a {
          color: #1e3a8a;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>MahaCSR Portal</h1>
          <p>Government of Maharashtra CSR Collaboration Platform</p>
        </div>
        <div class="content">
          <h2>One-Time Password (OTP) Verification</h2>
          <p>Dear Administrator,</p>
          <p>Thank you for registering your organization on the official MahaCSR portal. To complete your verification and secure your account, please use the 6-digit verification code below:</p>
          
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <div class="warning-text">This OTP is valid for 10 minutes. Please do not share this code with anyone.</div>
          </div>
          
          <p>If you did not initiate this request, please contact the MahaCSR support cell immediately or ignore this email.</p>
          <p>Best regards,<br><strong>MahaCSR Administration Team</strong><br>Government of Maharashtra</p>
        </div>
        <div class="footer">
          <p>This is a system-generated security email. Please do not reply to this message.</p>
          <p>&copy; 2026 Government of Maharashtra. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"MahaCSR Portal" <${smtpUser}>`,
    to: toEmail,
    subject: `[MahaCSR] Account OTP Verification Code - ${otp}`,
    html: htmlContent,
  });
};

export const sendNgoInvitationEmail = async (toEmail: string, ngoName: string, inviteUrl: string, companyName: string) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>MahaCSR NGO Partner Invitation</title>
      <style>
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          background-color: #f3f4f6;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          border: 1px solid #e5e7eb;
        }
        .header {
          background-color: #1e3a8a; /* Gov Navy */
          padding: 30px;
          text-align: center;
          border-bottom: 4px solid #f97316; /* Gov Saffron */
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .header p {
          color: #eff6ff;
          margin: 5px 0 0 0;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
          color: #1f2937;
          line-height: 1.6;
        }
        .content h2 {
          color: #111827;
          font-size: 20px;
          margin-top: 0;
        }
        .btn-box {
          text-align: center;
          margin: 30px 0;
        }
        .btn {
          background-color: #f97316;
          color: #ffffff !important;
          padding: 14px 28px;
          text-decoration: none;
          font-weight: 700;
          border-radius: 8px;
          display: inline-block;
          font-size: 15px;
        }
        .warning-text {
          font-size: 13px;
          color: #6b7280;
          margin-top: 15px;
          font-style: italic;
        }
        .footer {
          background-color: #f9fafb;
          padding: 20px 30px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #9ca3af;
        }
        .footer a {
          color: #1e3a8a;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>MahaCSR Portal</h1>
          <p>Government of Maharashtra CSR Collaboration Platform</p>
        </div>
        <div class="content">
          <h2>Partner NGO Invitation</h2>
          <p>Dear Administrator at ${ngoName},</p>
          <p>You have been invited by <strong>${companyName}</strong> to register as a partner NGO on the official MahaCSR platform.</p>
          <p>Upon completing your registration and uploading required credentials, your account will undergo a two-level verification process (corporate preliminary review and government final approval). Once approved, you will have sub-login access to update project progress and upload geo-tagged evidence.</p>
          
          <div class="btn-box">
            <a href="${inviteUrl}" class="btn">Register on MahaCSR</a>
          </div>
          
          <p>If the button doesn't work, copy and paste the link below in your browser:</p>
          <p style="word-break: break-all;"><a href="${inviteUrl}">${inviteUrl}</a></p>
          
          <p>Best regards,<br><strong>MahaCSR Administration Team</strong><br>Government of Maharashtra</p>
        </div>
        <div class="footer">
          <p>This is an automated system email. Please do not reply directly.</p>
          <p>&copy; 2026 Government of Maharashtra. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"MahaCSR Portal" <${smtpUser}>`,
    to: toEmail,
    subject: `[MahaCSR] Invitation to register as partner NGO - ${ngoName}`,
    html: htmlContent,
  });
};

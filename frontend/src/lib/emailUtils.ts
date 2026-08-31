/**
 * Email utilities for generating cross-platform email links (Gmail Web, Outlook 365, Mailto).
 * Ensures email compose triggers work 100% reliably in production without relying on local OS email client setup.
 */

export type EmailProvider = "gmail" | "outlook" | "mailto";

export interface EmailDraft {
  to: string;
  subject?: string;
  body?: string;
  cc?: string;
  bcc?: string;
}

/**
 * Builds direct Gmail Web Compose URL.
 * Opens pre-filled compose window in Gmail Web (https://mail.google.com/mail/?view=cm&fs=1&to=...).
 */
export function buildGmailComposeUrl({ to, subject = "", body = "", cc, bcc }: EmailDraft): string {
  const params = new URLSearchParams();
  params.set("view", "cm");
  params.set("fs", "1");
  params.set("tf", "cm");
  if (to) params.set("to", to);
  if (subject) params.set("su", subject);
  if (body) params.set("body", body);
  if (cc) params.set("cc", cc);
  if (bcc) params.set("bcc", bcc);

  return `https://mail.google.com/mail/?${params.toString()}`;
}

/**
 * Builds direct Outlook 365 / Web Compose URL.
 */
export function buildOutlookComposeUrl({ to, subject = "", body = "", cc, bcc }: EmailDraft): string {
  const params = new URLSearchParams();
  if (to) params.set("to", to);
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  if (cc) params.set("cc", cc);
  if (bcc) params.set("bcc", bcc);

  return `https://outlook.office.com/mail/deeplink/compose?${params.toString()}`;
}

/**
 * Builds standard mailto URL for desktop mail clients.
 */
export function buildMailtoUrl({ to, subject = "", body = "", cc, bcc }: EmailDraft): string {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  if (cc) params.set("cc", cc);
  if (bcc) params.set("bcc", bcc);

  const qs = params.toString();
  return `mailto:${to || ""}${qs ? `?${qs}` : ""}`;
}

/**
 * Opens email draft in the specified provider.
 * - 'gmail': opens Gmail web compose in a new tab
 * - 'outlook': opens Outlook 365 web compose in a new tab
 * - 'mailto': triggers native mail client safely via hidden anchor to prevent top-frame navigation aborts
 */
export function openEmailInProvider(provider: EmailProvider, draft: EmailDraft): void {
  if (typeof window === "undefined") return;

  if (provider === "gmail") {
    const url = buildGmailComposeUrl(draft);
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  if (provider === "outlook") {
    const url = buildOutlookComposeUrl(draft);
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  // provider === 'mailto'
  const mailtoUrl = buildMailtoUrl(draft);
  const link = document.createElement("a");
  link.href = mailtoUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
  }, 300);
}

/**
 * Formats full email draft as plain text for easy clipboard copying.
 */
export function formatEmailAsText(draft: EmailDraft): string {
  const parts: string[] = [];
  if (draft.to) parts.push(`To: ${draft.to}`);
  if (draft.cc) parts.push(`CC: ${draft.cc}`);
  if (draft.subject) parts.push(`Subject: ${draft.subject}`);
  parts.push("");
  if (draft.body) parts.push(draft.body);

  return parts.join("\n");
}

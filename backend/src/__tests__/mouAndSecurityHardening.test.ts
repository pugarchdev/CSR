import crypto from "crypto";

// HTML Sanitizer helper function under test
function sanitizeInput(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// File Upload validator helper function under test
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

function validateFileUpload(fileName: string, mimeType: string, fileSize: number): { valid: boolean; reason?: string } {
  if (fileSize > 10 * 1024 * 1024) {
    return { valid: false, reason: "File size exceeds 10MB limit" };
  }

  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, reason: "Invalid file extension or MIME type" };
  }

  return { valid: true };
}

describe("MoU & Security Hardening Edge Cases Test Suite", () => {
  describe("XSS Injection Prevention in MoU Generation", () => {
    it("should escape malicious HTML and script tags in user-provided inputs", () => {
      const maliciousCorporateName = "<script>alert('XSS-HACK')</script>";
      const sanitized = sanitizeInput(maliciousCorporateName);

      expect(sanitized).not.toContain("<script>");
      expect(sanitized).toBe("&lt;script&gt;alert(&#x27;XSS-HACK&#x27;)&lt;/script&gt;");
    });
  });

  describe("File Upload Security Controls", () => {
    it("should allow valid PDF, JPEG, and PNG files under 10MB", () => {
      const res = validateFileUpload("proposal_agreement.pdf", "application/pdf", 2 * 1024 * 1024);
      expect(res.valid).toBe(true);
    });

    it("should reject dangerous executable files or scripts (.exe, .sh, .php)", () => {
      const res1 = validateFileUpload("malicious_script.exe", "application/x-msdownload", 1000);
      expect(res1.valid).toBe(false);
      expect(res1.reason).toContain("Invalid file extension");

      const res2 = validateFileUpload("shell.sh", "text/x-shellscript", 1000);
      expect(res2.valid).toBe(false);
    });

    it("should reject files exceeding 10MB maximum size limit", () => {
      const res = validateFileUpload("oversized_report.pdf", "application/pdf", 15 * 1024 * 1024);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("File size exceeds 10MB limit");
    });

    it("should reject MIME type spoofing (e.g. .pdf extension with application/x-executable MIME)", () => {
      const res = validateFileUpload("fake.pdf", "application/x-executable", 1000);
      expect(res.valid).toBe(false);
    });
  });

  describe("Document Integrity & Cryptographic Hash Verification", () => {
    it("should calculate matching SHA-256 hash for document content and detect tampering", () => {
      const originalPdfContent = Buffer.from("%PDF-1.4 Content of MoU Document");
      const tamperedPdfContent = Buffer.from("%PDF-1.4 Content of MoU Document - Tampered!");

      const hashOriginal = crypto.createHash("sha256").update(originalPdfContent).digest("hex");
      const hashTampered = crypto.createHash("sha256").update(tamperedPdfContent).digest("hex");

      expect(hashOriginal).not.toBe(hashTampered);
      expect(hashOriginal.length).toBe(64);
    });
  });

  describe("Mass Assignment Protection", () => {
    it("should strip protected attributes during profile update processing", () => {
      const incomingPayload = {
        firstName: "Jane",
        lastName: "Doe",
        isSystemRole: true, // Malicious attempt to elevate role
        tokenVersion: 999,
        roleId: 1, // Super Admin ID
      };

      const PROTECTED_FIELDS = ["isSystemRole", "tokenVersion", "roleId", "passwordHash"];

      const sanitizedUpdateData = Object.keys(incomingPayload)
        .filter((key) => !PROTECTED_FIELDS.includes(key))
        .reduce((obj: any, key) => {
          obj[key] = (incomingPayload as any)[key];
          return obj;
        }, {});

      expect(sanitizedUpdateData).toEqual({
        firstName: "Jane",
        lastName: "Doe",
      });
      expect(sanitizedUpdateData.isSystemRole).toBeUndefined();
      expect(sanitizedUpdateData.roleId).toBeUndefined();
    });
  });
});

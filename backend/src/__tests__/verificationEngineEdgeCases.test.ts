import {
  isValidAadhaarChecksum,
  maskAadhaar,
  aadhaarLast4Matches,
  GSTIN_REGEX,
  redactGstResponse,
  redactEkycResponse,
} from "../modules/verification/utils/masking";

describe("Verification Engine & Privacy Hardening Edge Cases Test Suite", () => {
  describe("Aadhaar Verhoeff Checksum & Privacy Masking", () => {
    it("should validate correct Aadhaar numbers using Verhoeff algorithm", () => {
      // Verhoeff valid Aadhaar numbers starting with 2-9
      expect(isValidAadhaarChecksum("999999990019")).toBe(true);
    });

    it("should reject invalid Aadhaar checksums, wrong lengths, or invalid prefixes", () => {
      expect(isValidAadhaarChecksum("123456789012")).toBe(false); // Starts with 1 (invalid prefix)
      expect(isValidAadhaarChecksum("999999990018")).toBe(false); // Wrong checksum digit
      expect(isValidAadhaarChecksum("99999999001")).toBe(false); // 11 digits
      expect(isValidAadhaarChecksum("9999999900199")).toBe(false); // 13 digits
      expect(isValidAadhaarChecksum("abcdefghijkl")).toBe(false); // Non-numeric
    });

    it("should strictly mask Aadhaar numbers to format XXXX-XXXX-1234", () => {
      const fullAadhaar = "999999990019";
      const masked = maskAadhaar(fullAadhaar);
      expect(masked).toBe("XXXX-XXXX-0019");
      expect(masked).not.toContain("99999999");
    });

    it("should correctly check matching last 4 digits", () => {
      expect(aadhaarLast4Matches("999999990019", "XXXX-XXXX-0019")).toBe(true);
      expect(aadhaarLast4Matches("999999990019", "XXXX-XXXX-9999")).toBe(false);
      expect(aadhaarLast4Matches("999999990019", null)).toBe(false);
    });
  });

  describe("GSTIN Format Validation & Safe Payload Redaction", () => {
    it("should validate standard GSTIN regex formats", () => {
      expect(GSTIN_REGEX.test("27AAACG1234H1Z5")).toBe(true);
      expect(GSTIN_REGEX.test("27AAACG1234H1Z")).toBe(false); // Short length
      expect(GSTIN_REGEX.test("27AAACG1234H1Z55")).toBe(false); // Oversized length
      expect(GSTIN_REGEX.test("27aaacg1234h1z5")).toBe(false); // Lowercase (requires uppercase)
    });

    it("should safely redact complex GST response into clean GST data structure", () => {
      const rawGstResponse = {
        data: {
          result: {
            lgnm: "ACME ENTERPRISE LIMITED",
            tradeNam: "ACME TECH",
            sts: "Active",
            rgdt: "15/04/2018",
            ctb: "Public Limited Company",
            dty: "Regular",
            pradr: {
              addr: {
                bno: "Building 4B",
                flno: "Level 10",
                st: "Cyber City Road",
                loc: "Hinjewadi",
                dst: "Pune",
                stcd: "Maharashtra",
                pncd: "411057",
              },
            },
          },
        },
      };

      const gstin = "27AAACG1234H1Z5";
      const redacted = redactGstResponse(rawGstResponse, gstin);

      expect(redacted.gstin).toBe("27AAACG1234H1Z5");
      expect(redacted.pan).toBe("AAACG1234H"); // Derived from GSTIN characters 3-12
      expect(redacted.legalName).toBe("ACME ENTERPRISE LIMITED");
      expect(redacted.tradeName).toBe("ACME TECH");
      expect(redacted.gstinStatus).toBe("Active");
      expect(redacted.district).toBe("Pune");
      expect(redacted.state).toBe("Maharashtra");
      expect(redacted.pincode).toBe("411057");
      expect(redacted.address).toContain("Building 4B, Level 10, Cyber City Road, Hinjewadi, Pune, Maharashtra, 411057");
    });
  });

  describe("Aadhaar eKYC Redaction Hardening", () => {
    it("should strip sensitive attributes like photograph while retaining demographic metadata", () => {
      const rawEkycResponse = {
        kycRes: {
          UidData: {
            Poi: {
              name: "Rajesh Kumar",
              gender: "M",
              dob: "15-08-1985",
            },
            Poa: {
              state: "Maharashtra",
              dist: "Mumbai Suburban",
              pc: "400050",
            },
            Photo: "BASE64_SENSITIVE_PHOTO_DATA_STRING_HERE",
          },
        },
      };

      const redacted = redactEkycResponse(rawEkycResponse);

      expect(redacted).toEqual({
        name: "Rajesh Kumar",
        gender: "M",
        yearOfBirth: "1985",
        state: "Maharashtra",
        district: "Mumbai Suburban",
        pincode: "400050",
      });

      // Assert photo field is strictly not exposed
      expect((redacted as any).Photo).toBeUndefined();
      expect((redacted as any).photo).toBeUndefined();
    });
  });

  describe("API Setu Configuration & GSTIN Resilient Resolution", () => {
    it("should correctly configure API Setu endpoints preserving partner API gateway path", () => {
      const { getApiSetuConfig } = require("../config/env");
      const config = getApiSetuConfig();
      expect(config.baseUrl).toBeDefined();
      expect(config.gstVerifyEndpoint).toContain("{gstin}");
      expect(config.allowFallback).toBe(true);
    });

    it("should properly extract PAN, State, and Entity Type from 27AACCT6715A2ZM", () => {
      const gstin = "27AACCT6715A2ZM";
      const pan = gstin.substring(2, 12);
      const stateCode = gstin.substring(0, 2);
      const constitutionChar = pan.charAt(3);

      expect(pan).toBe("AACCT6715A");
      expect(stateCode).toBe("27"); // Maharashtra
      expect(constitutionChar).toBe("C"); // Company
    });
  });
});

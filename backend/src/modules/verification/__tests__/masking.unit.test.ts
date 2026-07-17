import { GSTIN_REGEX, isValidAadhaarChecksum, maskAadhaar, aadhaarLast4Matches, redactGstResponse, redactEkycResponse } from "../utils/masking";

describe("GSTIN format validation", () => {
  const valid = ["27AAPFU0939F1ZV", "29AABCU9603R1ZL", "07AABCS1429B1Z2", "24AAACC1206D1ZM"];
  const invalid = [
    "", // empty
    "27AAPFU0939F1Z", // too short
    "27AAPFU0939F1ZVX", // too long
    "2AAAPFU0939F1ZV", // bad state code
    "27aapfu0939f1zv", // lowercase (schemas uppercase before regex; raw regex rejects)
    "27AAPFU0939F0ZV", // entity number 0 not allowed
    "27AAPFU0939F1XV", // 14th char must be Z
    "27AAPF U0939F1ZV" // whitespace
  ];

  it.each(valid)("accepts %s", (gstin) => {
    expect(GSTIN_REGEX.test(gstin)).toBe(true);
  });

  it.each(invalid)("rejects %s", (gstin) => {
    expect(GSTIN_REGEX.test(gstin)).toBe(false);
  });
});

describe("Aadhaar Verhoeff checksum", () => {
  it("accepts numbers with a valid Verhoeff check digit", () => {
    // 999999990019 is the UIDAI test Aadhaar with valid Verhoeff checksum
    expect(isValidAadhaarChecksum("999999990019")).toBe(true);
  });

  it("rejects numbers with an invalid check digit", () => {
    expect(isValidAadhaarChecksum("999999990018")).toBe(false);
    expect(isValidAadhaarChecksum("234123412345")).toBe(false);
  });

  it("rejects numbers starting with 0 or 1", () => {
    expect(isValidAadhaarChecksum("123456789012")).toBe(false);
    expect(isValidAadhaarChecksum("012345678901")).toBe(false);
  });

  it("rejects non-12-digit input", () => {
    expect(isValidAadhaarChecksum("99999999001")).toBe(false);
    expect(isValidAadhaarChecksum("9999999900199")).toBe(false);
    expect(isValidAadhaarChecksum("abcdefghijkl")).toBe(false);
  });
});

describe("Aadhaar masking", () => {
  it("masks all but the last 4 digits", () => {
    expect(maskAadhaar("999999990019")).toBe("XXXX-XXXX-0019");
  });

  it("mask never contains the first 8 digits", () => {
    const masked = maskAadhaar("234567890123");
    expect(masked).not.toContain("23456789");
    expect(masked).toBe("XXXX-XXXX-0123");
  });

  it("matches last4 against the stored mask", () => {
    expect(aadhaarLast4Matches("999999990019", "XXXX-XXXX-0019")).toBe(true);
    expect(aadhaarLast4Matches("999999990018", "XXXX-XXXX-0019")).toBe(false);
    expect(aadhaarLast4Matches("999999990019", null)).toBe(false);
  });
});

describe("GST response redaction", () => {
  it("maps GSTN payload fields to the safe subset", () => {
    const raw = {
      data: {
        lgnm: "ACME FOUNDATION",
        tradeNam: "ACME",
        sts: "Active",
        rgdt: "01/07/2017",
        ctb: "Private Limited Company",
        dty: "Regular",
        pradr: { addr: { bno: "12", st: "MG Road", loc: "Pune", stcd: "Maharashtra", dst: "Pune", pncd: "411001" } }
      }
    };
    const redacted = redactGstResponse(raw, "27AAPFU0939F1ZV");
    expect(redacted).toEqual({
      gstin: "27AAPFU0939F1ZV",
      legalName: "ACME FOUNDATION",
      tradeName: "ACME",
      gstinStatus: "Active",
      registrationDate: "01/07/2017",
      constitutionOfBusiness: "Private Limited Company",
      taxpayerType: "Regular",
      state: "Maharashtra",
      district: "Pune",
      address: "12, MG Road, Pune",
      pincode: "411001"
    });
  });

  it("tolerates missing fields", () => {
    const redacted = redactGstResponse({}, "27AAPFU0939F1ZV");
    expect(redacted.gstin).toBe("27AAPFU0939F1ZV");
    expect(redacted.legalName).toBeNull();
  });
});

describe("eKYC response redaction", () => {
  it("keeps demographics and drops the photograph", () => {
    const raw = {
      kycRes: {
        UidData: {
          Poi: { name: "Asha Patil", gender: "F", dob: "01-01-1990" },
          Poa: { state: "Maharashtra", dist: "Mumbai", pc: "400001" },
          Pht: "base64photobytes..."
        }
      }
    };
    const redacted = redactEkycResponse(raw);
    expect(redacted).toEqual({
      name: "Asha Patil",
      gender: "F",
      yearOfBirth: "1990",
      state: "Maharashtra",
      district: "Mumbai",
      pincode: "400001"
    });
    expect(JSON.stringify(redacted)).not.toContain("base64photobytes");
  });
});

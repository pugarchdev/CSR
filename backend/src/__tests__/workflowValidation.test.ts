import {
  PUBLIC_PITCH_SELECT,
  validateCorporateEnquirySubmission,
  validateGovernmentPitchSubmission,
  validatePitchVerificationChecklist
} from "../utils/workflowValidation";

describe("MahaCSR transactional workflow validation", () => {
  test("corporate enquiry requires one district and declaration", () => {
    const result = validateCorporateEnquirySubmission({
      companyName: "Acme Foundation", email: "csr@acme.test", contactPersonName: "Asha",
      mca21CIN: "U12345MH2020PTC123456",
      mobile: "9876543210", sector: "HEALTH", indicativeBudget: 500000,
      preferredDistricts: ["Pune", "Thane"], proposedCSRWork: "A sufficiently detailed rural health programme.",
      declarationAccepted: false
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toEqual(expect.arrayContaining([
      "Select exactly one district for this case.",
      "The submission declaration must be accepted."
    ]));
  });

  test("government pitch requires two photographs and the correct certification", () => {
    const result = validateGovernmentPitchSubmission({
      officialName: "Officer", designation: "Engineer", serviceClass: "BELOW_CLASS_2",
      mobile: "9876543210", email: "officer@gov.test", districts: ["Pune"],
      exactLocation: "Village site", csrRequirement: "A sufficiently detailed water project requirement.",
      estimatedCost: 1200000, govtFundDeclaration: true, certificationType: "SELF",
      geoTaggedPhotos: ["one.jpg"]
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/two geotagged|HOD certification/i);
  });

  test("public pitch projection excludes confidential fields", () => {
    expect(PUBLIC_PITCH_SELECT).not.toHaveProperty("mobile");
    expect(PUBLIC_PITCH_SELECT).not.toHaveProperty("email");
    expect(PUBLIC_PITCH_SELECT).not.toHaveProperty("exactLocation");
    expect(PUBLIC_PITCH_SELECT).not.toHaveProperty("hodCertificationDocument");
  });

  test("RM cannot forward an incomplete pitch checklist", () => {
    const result = validatePitchVerificationChecklist({ checklist: { departmentActive: true }, recommendation: "FEASIBLE", summary: "short" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThan(5);
  });
});

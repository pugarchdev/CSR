type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const strings = (value: unknown) => Array.isArray(value)
  ? [...new Set(value.map(text).filter(Boolean))]
  : [];

export interface CorporateEnquirySubmission {
  corporateName: string;
  cin: string;
  contactEmail: string;
  contactPersonName: string;
  mobile: string;
  sector: string;
  indicativeBudget: number;
  district: string;
  departmentId: string;
  proposedCSRWork: string;
  documents: string[];
  declarationAccepted: boolean;
}

export function validateCorporateEnquirySubmission(body: unknown): ValidationResult<CorporateEnquirySubmission> {
  const input = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const districts = strings(input.preferredDistricts ?? (input.district ? [input.district] : []));
  const budget = Number(input.indicativeBudget);
  const documents = strings(input.documents ?? input.supportingDocuments);
  const value = {
    corporateName: text(input.companyName ?? input.corporateName),
    cin: text(input.mca21CIN ?? input.cin).toUpperCase(),
    contactEmail: text(input.email ?? input.contactEmail).toLowerCase(),
    contactPersonName: text(input.contactPersonName),
    mobile: text(input.mobile),
    sector: text(input.sector),
    indicativeBudget: budget,
    district: districts[0] || "",
    departmentId: text(input.departmentId),
    proposedCSRWork: text(input.proposedCSRWork),
    documents,
    declarationAccepted: input.declarationAccepted === true
  };
  const errors: string[] = [];
  if (!value.corporateName) errors.push("Company name is required.");
  // if (!/^[A-Z0-9]{21}$/.test(value.cin)) errors.push("A valid 21-character CIN is required.");
  if (!/^\S+@\S+\.\S+$/.test(value.contactEmail)) errors.push("A valid contact email is required.");
  if (!value.contactPersonName) errors.push("Contact person is required.");
  if (!/^[6-9]\d{9}$/.test(value.mobile)) errors.push("A valid 10-digit Indian mobile number is required.");
  if (!value.sector) errors.push("CSR sector is required.");
  if (!Number.isFinite(budget) || budget <= 0) errors.push("Indicative budget must be greater than zero.");
  if (districts.length !== 1) errors.push("Select exactly one district for this case.");
  if (!value.departmentId) errors.push("Select exactly one government department for this case.");
  if (value.proposedCSRWork.length < 20) errors.push("Proposed CSR work must contain at least 20 characters.");
  if (!value.declarationAccepted) errors.push("The submission declaration must be accepted.");
  return errors.length ? { ok: false, errors } : { ok: true, value };
}

export interface GovernmentPitchSubmission {
  officialName: string;
  designation: string;
  serviceClass: string;
  mobile: string;
  email: string;
  district: string;
  talukas: string[];
  exactLocation: string;
  csrRequirement: string;
  estimatedCost: number;
  certificationType: string;
  hodCertificationDocument: string | null;
  supportingDocuments: string[];
  geoTaggedPhotos: string[];
}

export function validateGovernmentPitchSubmission(body: unknown): ValidationResult<GovernmentPitchSubmission> {
  const input = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const districts = strings(input.districts ?? (input.district ? [input.district] : []));
  const photos = strings(input.geoTaggedPhotos);
  const serviceClass = text(input.serviceClass);
  const certificationType = text(input.certificationType);
  const hodDocument = text(input.hodCertificationDocument) || null;
  const estimatedCost = Number(input.estimatedCost ?? input.budget);
  const value = {
    officialName: text(input.officialName),
    designation: text(input.designation),
    serviceClass,
    mobile: text(input.mobile),
    email: text(input.email).toLowerCase(),
    district: districts[0] || "",
    talukas: strings(input.talukas),
    exactLocation: text(input.exactLocation),
    csrRequirement: text(input.csrRequirement),
    estimatedCost,
    certificationType,
    hodCertificationDocument: hodDocument,
    supportingDocuments: strings(input.supportingDocuments),
    geoTaggedPhotos: photos
  };
  const errors: string[] = [];
  if (!value.officialName) errors.push("Submitting official name is required.");
  if (!value.designation) errors.push("Official designation is required.");
  if (!serviceClass) errors.push("Service class is required.");
  if (!/^[6-9]\d{9}$/.test(value.mobile)) errors.push("A valid 10-digit Indian mobile number is required.");
  if (!/^\S+@\S+\.\S+$/.test(value.email)) errors.push("A valid official email is required.");
  if (districts.length !== 1) errors.push("Select exactly one district for this pitch.");
  if (!value.exactLocation) errors.push("Exact project location is required for internal verification.");
  if (value.csrRequirement.length < 20) errors.push("Development requirement must contain at least 20 characters.");
  if (!Number.isFinite(estimatedCost) || estimatedCost <= 0) errors.push("Estimated cost must be greater than zero.");
  if (input.govtFundDeclaration !== true) errors.push("Government-fund non-availability must be declared.");
  if (photos.length < 2) errors.push("At least two geotagged photographs are required.");
  if (["CLASS_1", "CLASS_2"].includes(serviceClass) && certificationType !== "SELF") {
    errors.push("Class-1 and Class-2 officials must provide self-certification.");
  }
  if (serviceClass === "BELOW_CLASS_2" && (certificationType !== "HOD" || !hodDocument)) {
    errors.push("Officials below Class-2 must provide HOD certification and its document.");
  }
  return errors.length ? { ok: false, errors } : { ok: true, value };
}

export const PUBLIC_PITCH_SELECT = {
  id: true,
  pitchReferenceId: true,
  title: true,
  department: true,
  districts: true,
  talukas: true,
  csrRequirement: true,
  estimatedCost: true,
  budget: true,
  status: true,
  createdAt: true
} as const;

export function validatePitchVerificationChecklist(body: unknown): ValidationResult<{ checklist: Record<string, boolean>; recommendation: string; summary: string }> {
  const input = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const checklist = (input.checklist && typeof input.checklist === "object" ? input.checklist : {}) as Record<string, unknown>;
  const required = ["departmentActive", "officialAuthorized", "serviceClassValid", "certificationPresent", "fundDeclarationComplete", "photosPresent", "coordinatesMatchDistrict", "needGenuine", "csrEligible", "costReasonable", "duplicateReviewComplete"];
  const errors = required.filter((key) => typeof checklist[key] !== "boolean").map((key) => `Verification check '${key}' must be answered.`);
  const recommendation = text(input.recommendation);
  const summary = text(input.summary);
  if (!["FEASIBLE", "PROCEED_WITH_CONDITIONS", "NOT_FEASIBLE"].includes(recommendation)) errors.push("Select a valid RM recommendation.");
  if (summary.length < 20) errors.push("Assessment summary must contain at least 20 characters.");
  if (recommendation === "PROCEED_WITH_CONDITIONS" && text(input.conditions).length < 10) errors.push("Conditions must be documented for a conditional recommendation.");
  if (recommendation === "FEASIBLE" && required.some((key) => checklist[key] !== true)) errors.push("A pitch can be marked feasible only when every verification check is Yes.");
  return errors.length ? { ok: false, errors } : { ok: true, value: { checklist: Object.fromEntries(required.map((key) => [key, Boolean(checklist[key])])), recommendation, summary } };
}

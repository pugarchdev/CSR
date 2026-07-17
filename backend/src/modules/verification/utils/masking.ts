/**
 * Masking and redaction helpers for verification payloads.
 * The full Aadhaar number and OTP must NEVER be persisted or logged.
 */

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const AADHAAR_REGEX = /^[2-9][0-9]{11}$/;

export const maskAadhaar = (aadhaarNumber: string): string => {
  return `XXXX-XXXX-${aadhaarNumber.slice(-4)}`;
};

export const aadhaarLast4Matches = (aadhaarNumber: string, maskedIdentifier: string | null): boolean => {
  if (!maskedIdentifier) return false;
  return maskedIdentifier.endsWith(aadhaarNumber.slice(-4));
};

/**
 * Verhoeff checksum validation (UIDAI Aadhaar numbers use the Verhoeff algorithm).
 */
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

export const isValidAadhaarChecksum = (aadhaarNumber: string): boolean => {
  if (!AADHAAR_REGEX.test(aadhaarNumber)) return false;
  let c = 0;
  const digits = aadhaarNumber.split("").reverse().map(Number);
  for (let i = 0; i < digits.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digits[i]]];
  }
  return c === 0;
};

export interface GstVerifiedData {
  gstin: string;
  legalName: string | null;
  tradeName: string | null;
  gstinStatus: string | null;
  registrationDate: string | null;
  constitutionOfBusiness: string | null;
  taxpayerType: string | null;
  state: string | null;
  district: string | null;
  address: string | null;
  pincode: string | null;
}

/**
 * Redact the GSTN API response into the safe subset stored in plain JSON
 * and used for frontend autofill. GSTN payload shapes vary between the
 * public search API and the API Setu certificate API — cover both.
 */
export const redactGstResponse = (raw: any, gstin: string): GstVerifiedData => {
  const data = raw?.data || raw || {};
  const principalAddress = data.pradr?.addr || data.principalPlaceOfBusiness || {};
  const addressParts = [
    principalAddress.bno,
    principalAddress.flno,
    principalAddress.bnm,
    principalAddress.st,
    principalAddress.loc,
    principalAddress.city
  ].filter(Boolean);

  return {
    gstin,
    legalName: data.lgnm ?? data.legalName ?? null,
    tradeName: data.tradeNam ?? data.tradeName ?? null,
    gstinStatus: data.sts ?? data.status ?? null,
    registrationDate: data.rgdt ?? data.registrationDate ?? null,
    constitutionOfBusiness: data.ctb ?? data.constitutionOfBusiness ?? null,
    taxpayerType: data.dty ?? data.taxpayerType ?? null,
    state: principalAddress.stcd ?? data.state ?? null,
    district: principalAddress.dst ?? data.district ?? null,
    address: addressParts.length > 0 ? addressParts.join(", ") : (data.address ?? null),
    pincode: principalAddress.pncd ?? data.pincode ?? null
  };
};

export interface AadhaarVerifiedData {
  name: string | null;
  gender: string | null;
  yearOfBirth: string | null;
  state: string | null;
  district: string | null;
  pincode: string | null;
}

/**
 * Redact the UIDAI eKYC response into the safe demographic subset.
 * The photograph and full address are intentionally dropped.
 */
export const redactEkycResponse = (raw: any): AadhaarVerifiedData => {
  const kyc = raw?.kycRes || raw?.data || raw || {};
  const poi = kyc.UidData?.Poi || kyc.poi || kyc;
  const poa = kyc.UidData?.Poa || kyc.poa || {};

  const dob: string | null = poi.dob ?? kyc.dateOfBirth ?? null;

  return {
    name: poi.name ?? kyc.name ?? null,
    gender: poi.gender ?? kyc.gender ?? null,
    yearOfBirth: dob ? String(dob).slice(-4) : (kyc.yearOfBirth ? String(kyc.yearOfBirth) : null),
    state: poa.state ?? kyc.state ?? null,
    district: poa.dist ?? kyc.district ?? null,
    pincode: poa.pc ?? kyc.pincode ?? null
  };
};

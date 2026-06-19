export type OnboardingStepKey =
  | "account"
  | "organization"
  | "statutory"
  | "governance"
  | "financial"
  | "experience"
  | "declarations"
  | "documents"
  | "review";

export interface OnboardingStep {
  key: OnboardingStepKey;
  title: string;
  description: string;
}

export const onboardingSteps: OnboardingStep[] = [
  {
    key: "account",
    title: "Account & Contact",
    description: "Create login and verify primary contact details.",
  },
  {
    key: "organization",
    title: "Organization Details",
    description: "Legal identity, registration and operating geography.",
  },
  {
    key: "statutory",
    title: "Statutory Registrations",
    description: "CSR-1, PAN, 12A/12AB, 80G, GST and FCRA details.",
  },
  {
    key: "governance",
    title: "Governance & Signatory",
    description: "Trustees, directors, board members and authorized signatory.",
  },
  {
    key: "financial",
    title: "Financial & Bank Details",
    description: "Bank account, audit reports and financial information.",
  },
  {
    key: "experience",
    title: "Experience & Impact",
    description: "Past CSR projects, sectors, beneficiaries and impact evidence.",
  },
  {
    key: "declarations",
    title: "Declarations",
    description: "Conflict, litigation, blacklist, privacy and consent declarations.",
  },
  {
    key: "documents",
    title: "Documents",
    description: "Upload mandatory and conditional verification documents.",
  },
  {
    key: "review",
    title: "Review & Submit",
    description: "Check completeness and submit for verification.",
  },
];

export interface DocumentChecklistItem {
  key: string;
  label: string;
  required: boolean;
  appliesTo: string[];
  conditionalField?: string;
  conditionalValue?: any;
  help: string;
}

export const documentChecklist: DocumentChecklistItem[] = [
  {
    key: "registration_certificate",
    label: "Registration Certificate",
    required: true,
    appliesTo: ["TRUST", "SOCIETY", "SECTION_8_COMPANY"],
    help: "Upload valid registration certificate issued by the competent authority.",
  },
  {
    key: "trust_deed_moa_aoa",
    label: "Trust Deed / MOA / AOA / Society Rules",
    required: true,
    appliesTo: ["TRUST", "SOCIETY", "SECTION_8_COMPANY"],
    help: "Upload constitutive document based on organization type.",
  },
  {
    key: "pan",
    label: "Organization PAN",
    required: true,
    appliesTo: ["ALL"],
    help: "Upload PAN card or e-PAN of the organization.",
  },
  {
    key: "csr1",
    label: "CSR-1 Certificate / Acknowledgement",
    required: true,
    appliesTo: ["ALL"],
    help: "Required for CSR implementing agency onboarding.",
  },
  {
    key: "twelve_a",
    label: "12A / 12AB Registration Certificate",
    required: true,
    appliesTo: ["TRUST", "SOCIETY", "SECTION_8_COMPANY"],
    help: "Upload latest valid income tax registration certificate.",
  },
  {
    key: "eighty_g",
    label: "80G Certificate",
    required: true,
    appliesTo: ["TRUST", "SOCIETY", "SECTION_8_COMPANY"],
    help: "Upload latest valid 80G approval certificate.",
  },
  {
    key: "cancelled_cheque",
    label: "Cancelled Cheque",
    required: true,
    appliesTo: ["ALL"],
    help: "Cheque should show account holder name, account number and IFSC where possible.",
  },
  {
    key: "bank_statement",
    label: "Bank Statement / Bank Verification Letter",
    required: true,
    appliesTo: ["ALL"],
    help: "Upload recent bank proof matching the legal name of the organization.",
  },
  {
    key: "audited_financials",
    label: "Audited Financial Statements - Last 3 Years",
    required: true,
    appliesTo: ["ALL"],
    help: "Upload balance sheet, income & expenditure, receipts & payments and audit report.",
  },
  {
    key: "annual_reports",
    label: "Annual Reports - Last 2/3 Years",
    required: false,
    appliesTo: ["ALL"],
    help: "Recommended for experience and impact verification.",
  },
  {
    key: "board_resolution",
    label: "Board Resolution / Authority Letter",
    required: true,
    appliesTo: ["ALL"],
    help: "Required to verify authorized signatory.",
  },
  {
    key: "gst_certificate",
    label: "GST Certificate",
    required: false,
    conditionalField: "gstRegistered",
    conditionalValue: true,
    appliesTo: ["ALL"],
    help: "Required only if organization is GST registered.",
  },
  {
    key: "fcra_certificate",
    label: "FCRA Certificate / Prior Permission",
    required: false,
    conditionalField: "fcraApplicable",
    conditionalValue: true,
    appliesTo: ["ALL"],
    help: "Required only if organization receives or manages foreign contribution.",
  },
  {
    key: "fc4_returns",
    label: "FC-4 Annual Returns",
    required: false,
    conditionalField: "fcraApplicable",
    conditionalValue: true,
    appliesTo: ["ALL"],
    help: "Required for FCRA compliance review where applicable.",
  },
];

export const organizationTypes = [
  { value: "TRUST", label: "Trust" },
  { value: "SOCIETY", label: "Society" },
  { value: "SECTION_8_COMPANY", label: "Section 8 Company" },
  { value: "GOVERNMENT_ENTITY", label: "Government Entity" },
  { value: "OTHER", label: "Other" },
];

export const csrSectors = [
  "Education",
  "Healthcare",
  "Livelihood",
  "Rural Development",
  "Women Empowerment",
  "Child Welfare",
  "Elderly Care",
  "Disability Support",
  "Environmental Sustainability",
  "Sanitation & Hygiene",
  "Skill Development",
  "Sports & Culture",
];

export const maharashtraDistricts = [
  "Mumbai",
  "Mumbai Suburban",
  "Thane",
  "Pune",
  "Nagpur",
  "Nashik",
  "Aurangabad",
  "Solapur",
  "Kolhapur",
  "Ahmednagar",
  "Satara",
  "Sangli",
  "Ratnagiri",
  "Sindhudurg",
  "Raigad",
  "Palghar",
  "Dhule",
  "Jalgaon",
  "Nandurbar",
  "Amravati",
  "Akola",
  "Buldhana",
  "Yavatmal",
  "Washim",
  "Wardha",
  "Chandrapur",
  "Gadchiroli",
  "Gondia",
  "Bhandara",
  "Latur",
  "Osmanabad",
  "Beed",
  "Nanded",
  "Parbhani",
  "Hingoli",
  "Jalna",
];

// Made with Bob

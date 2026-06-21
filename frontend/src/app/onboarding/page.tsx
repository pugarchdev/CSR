"use client";

import { useState, useMemo, useEffect } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovInput from "@/components/gov/GovInput";
import GovSelect from "@/components/gov/GovSelect";
import GovTextarea from "@/components/gov/GovTextarea";
import GovAlert from "@/components/gov/GovAlert";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import {
  onboardingSteps,
  documentChecklist,
  organizationTypes,
  csrSectors,
  maharashtraDistricts,
} from "@/modules/onboarding/onboardingConfig";
import "../../styles/gov-theme.css";

interface FormState {
  // Account & Contact
  accountEmail: string;
  accountMobile: string;
  accountPassword: string;
  primaryContactName: string;
  primaryContactDesignation: string;
  primaryContactEmail: string;
  primaryContactMobile: string;
  alternateContactName: string;
  alternateContactMobile: string;
  preferredCommunication: string;
  contactVerificationMode: string;

  // Organization Details
  legalName: string;
  displayName: string;
  organizationType: string;
  registrationNumber: string;
  registrationDate: string;
  registrationAuthority: string;
  pan: string;
  csr1Number: string;
  ngoDarpanId: string;
  yearEstablished: string;
  officialEmail: string;
  officialPhone: string;
  website: string;
  address: string;
  district: string;
  city: string;
  pincode: string;
  selectedSectors: string[];
  
  // Statutory
  gstRegistered: boolean;
  gstin: string;
  fcraApplicable: boolean;
  fcraNumber: string;
  has12A: boolean;
  has80G: boolean;

  // Governance
  governingBodyType: string;
  governingBodyCount: string;
  chairpersonName: string;
  secretaryName: string;
  treasurerName: string;
  authorizedSignatoryName: string;
  authorizedSignatoryDesignation: string;
  authorizedSignatoryEmail: string;
  authorizedSignatoryMobile: string;
  signatoryIdType: string;
  signatoryIdNumber: string;
  boardResolutionNumber: string;
  boardResolutionDate: string;
  lastMeetingDate: string;
  meetingFrequency: string;
  governancePolicies: string[];
  relatedPartyDisclosure: string;
  governanceRemarks: string;
  
  // Financial
  bankAccountHolder: string;
  bankName: string;
  bankBranch: string;
  accountNumber: string;
  ifscCode: string;
  accountType: string;

  // Experience & Impact
  yearsOfOperation: string;
  completedCsrProjects: string;
  ongoingProjects: string;
  totalBeneficiaries: string;
  districtsCovered: string;
  previousCorporatePartners: string;
  annualProjectBudget: string;
  largestProjectValue: string;
  impactBeneficiaryGroups: string[];
  impactEvidenceTypes: string[];
  majorProjectSummary: string;
  impactMeasurementProcess: string;
  thirdPartyAssessment: string;
  awardsOrRecognitions: string;
  
  // Declarations
  blacklistDeclaration: boolean;
  litigationDeclaration: boolean;
  conflictOfInterest: boolean;
  dataPrivacyConsent: boolean;
  verificationConsent: boolean;
}

const initialForm: FormState = {
  accountEmail: "",
  accountMobile: "",
  accountPassword: "",
  primaryContactName: "",
  primaryContactDesignation: "",
  primaryContactEmail: "",
  primaryContactMobile: "",
  alternateContactName: "",
  alternateContactMobile: "",
  preferredCommunication: "EMAIL",
  contactVerificationMode: "EMAIL_OTP",
  legalName: "",
  displayName: "",
  organizationType: "",
  registrationNumber: "",
  registrationDate: "",
  registrationAuthority: "",
  pan: "",
  csr1Number: "",
  ngoDarpanId: "",
  yearEstablished: "",
  officialEmail: "",
  officialPhone: "",
  website: "",
  address: "",
  district: "",
  city: "",
  pincode: "",
  selectedSectors: [],
  gstRegistered: false,
  gstin: "",
  fcraApplicable: false,
  fcraNumber: "",
  has12A: false,
  has80G: false,
  governingBodyType: "",
  governingBodyCount: "",
  chairpersonName: "",
  secretaryName: "",
  treasurerName: "",
  authorizedSignatoryName: "",
  authorizedSignatoryDesignation: "",
  authorizedSignatoryEmail: "",
  authorizedSignatoryMobile: "",
  signatoryIdType: "PAN",
  signatoryIdNumber: "",
  boardResolutionNumber: "",
  boardResolutionDate: "",
  lastMeetingDate: "",
  meetingFrequency: "",
  governancePolicies: [],
  relatedPartyDisclosure: "",
  governanceRemarks: "",
  bankAccountHolder: "",
  bankName: "",
  bankBranch: "",
  accountNumber: "",
  ifscCode: "",
  accountType: "CURRENT",
  yearsOfOperation: "",
  completedCsrProjects: "",
  ongoingProjects: "",
  totalBeneficiaries: "",
  districtsCovered: "",
  previousCorporatePartners: "",
  annualProjectBudget: "",
  largestProjectValue: "",
  impactBeneficiaryGroups: [],
  impactEvidenceTypes: [],
  majorProjectSummary: "",
  impactMeasurementProcess: "",
  thirdPartyAssessment: "",
  awardsOrRecognitions: "",
  blacklistDeclaration: false,
  litigationDeclaration: false,
  conflictOfInterest: false,
  dataPrivacyConsent: false,
  verificationConsent: false,
};

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0); // Start from Account & Contact
  const [form, setForm] = useState<FormState>(initialForm);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          const ngo = user.ngo;
          const company = user.company;
          setForm((prev) => ({
            ...prev,
            accountEmail: prev.accountEmail || user.email || "",
            primaryContactEmail: prev.primaryContactEmail || user.email || "",
            legalName: prev.legalName || ngo?.name || company?.name || "",
            displayName: prev.displayName || ngo?.name || company?.name || "",
            pan: prev.pan || ngo?.pan || company?.pan || "",
            registrationNumber: prev.registrationNumber || ngo?.registrationNumber || company?.cin || "",
            ngoDarpanId: prev.ngoDarpanId || ngo?.darpanNumber || "",
            csr1Number: prev.csr1Number || ngo?.csr1Number || "",
            address: prev.address || ngo?.address || "",
            district: prev.district || ngo?.district || "",
            city: prev.city || ngo?.taluka || "",
            organizationType: prev.organizationType || ngo?.organizationType || "TRUST",
          }));
        } catch (e) {
          console.error("Error parsing user from localStorage:", e);
        }
      }
    }
  }, []);

  const step = onboardingSteps[currentStep];

  const visibleDocuments = useMemo(() => {
    return documentChecklist.filter((doc) => {
      if (doc.conditionalField) {
        return form[doc.conditionalField as keyof FormState] === doc.conditionalValue;
      }
      if (doc.appliesTo[0] === "ALL") return true;
      return doc.appliesTo.includes(form.organizationType);
    });
  }, [form]);

  const updateField = (key: keyof FormState, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSectorToggle = (sector: string) => {
    setForm((prev) => ({
      ...prev,
      selectedSectors: prev.selectedSectors.includes(sector)
        ? prev.selectedSectors.filter((s) => s !== sector)
        : [...prev.selectedSectors, sector],
    }));
  };

  const handleListToggle = (
    key: "governancePolicies" | "impactBeneficiaryGroups" | "impactEvidenceTypes",
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((item) => item !== value)
        : [...prev[key], value],
    }));
  };

  const beneficiaryGroups = [
    "Children",
    "Women",
    "Youth",
    "Senior Citizens",
    "Persons with Disabilities",
    "Farmers",
    "Tribal Communities",
    "Urban Poor",
    "Rural Households",
  ];

  const impactEvidenceTypes = [
    "Completion certificates",
    "Beneficiary registers",
    "Geo-tagged photographs",
    "Utilization certificates",
    "Third-party assessment reports",
    "CSR partner feedback letters",
  ];

  const governancePolicyOptions = [
    "Conflict of interest policy",
    "Procurement policy",
    "Whistleblower policy",
    "Child protection policy",
    "Financial delegation policy",
    "Data privacy policy",
  ];

  return (
    <GovPortalLayout>
      <GovPageHeader
        breadcrumb="Home / NGO Onboarding"
        title="NGO / Implementing Agency Onboarding"
        description="Complete organization profile, statutory registrations, financial documents and declarations for CSR verification."
        actions={<GovButton variant="secondary">Save Draft</GovButton>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        {/* Stepper Sidebar */}
        <aside>
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Application Steps</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              <div className="gov-stepper">
                {onboardingSteps.map((item, index) => (
                  <button
                    key={item.key}
                    type="button"
                    className={[
                      "gov-step",
                      index === currentStep ? "active" : "",
                      index < currentStep ? "completed" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setCurrentStep(index)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <span className="gov-step-number">{index + 1}</span>
                    <span>
                      <strong style={{ display: "block", marginBottom: 2 }}>{item.title}</strong>
                      <small style={{ color: "var(--gov-text-muted)", fontSize: 11 }}>
                        {item.description}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            </GovCardBody>
          </GovCard>
        </aside>

        {/* Main Content */}
        <section>
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>{step.title}</GovCardTitle>
            </GovCardHeader>

            <GovCardBody>
              {/* Account & Contact Step */}
              {step.key === "account" && (
                <div>
                  <h4 className="gov-section-title">Portal Account Details</h4>

                  <div className="gov-form-grid">
                    <div className="gov-field">
                      <label className="gov-label">
                        Login Email <span className="gov-required">*</span>
                      </label>
                      <input
                        type="email"
                        className="gov-input"
                        value={form.accountEmail}
                        onChange={(e) => updateField("accountEmail", e.target.value)}
                        placeholder="admin@organization.org"
                      />
                      <div className="gov-help">This email will be used for application login and alerts.</div>
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Login Mobile <span className="gov-required">*</span>
                      </label>
                      <input
                        type="tel"
                        className="gov-input"
                        value={form.accountMobile}
                        onChange={(e) => updateField("accountMobile", e.target.value)}
                        placeholder="+91 9876543210"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Create Password <span className="gov-required">*</span>
                      </label>
                      <input
                        type="password"
                        className="gov-input"
                        value={form.accountPassword}
                        onChange={(e) => updateField("accountPassword", e.target.value)}
                        placeholder="Enter secure password"
                      />
                      <div className="gov-help">Use at least 8 characters with letters, numbers and a symbol.</div>
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Verification Mode <span className="gov-required">*</span>
                      </label>
                      <select
                        className="gov-select"
                        value={form.contactVerificationMode}
                        onChange={(e) => updateField("contactVerificationMode", e.target.value)}
                      >
                        <option value="EMAIL_OTP">Email OTP</option>
                        <option value="MOBILE_OTP">Mobile OTP</option>
                        <option value="BOTH">Email and Mobile OTP</option>
                      </select>
                    </div>
                  </div>

                  <h4 className="gov-section-title" style={{ marginTop: 24 }}>Primary Contact Person</h4>

                  <div className="gov-form-grid">
                    <div className="gov-field">
                      <label className="gov-label">
                        Contact Person Name <span className="gov-required">*</span>
                      </label>
                      <input
                        className="gov-input"
                        value={form.primaryContactName}
                        onChange={(e) => updateField("primaryContactName", e.target.value)}
                        placeholder="Enter full name"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Designation <span className="gov-required">*</span>
                      </label>
                      <input
                        className="gov-input"
                        value={form.primaryContactDesignation}
                        onChange={(e) => updateField("primaryContactDesignation", e.target.value)}
                        placeholder="e.g., Program Manager, Secretary"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Contact Email <span className="gov-required">*</span>
                      </label>
                      <input
                        type="email"
                        className="gov-input"
                        value={form.primaryContactEmail}
                        onChange={(e) => updateField("primaryContactEmail", e.target.value)}
                        placeholder="contact@organization.org"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Contact Mobile <span className="gov-required">*</span>
                      </label>
                      <input
                        type="tel"
                        className="gov-input"
                        value={form.primaryContactMobile}
                        onChange={(e) => updateField("primaryContactMobile", e.target.value)}
                        placeholder="+91 9876543210"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">Alternate Contact Name</label>
                      <input
                        className="gov-input"
                        value={form.alternateContactName}
                        onChange={(e) => updateField("alternateContactName", e.target.value)}
                        placeholder="Optional"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">Alternate Contact Mobile</label>
                      <input
                        type="tel"
                        className="gov-input"
                        value={form.alternateContactMobile}
                        onChange={(e) => updateField("alternateContactMobile", e.target.value)}
                        placeholder="+91 9876543210"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Preferred Communication <span className="gov-required">*</span>
                      </label>
                      <select
                        className="gov-select"
                        value={form.preferredCommunication}
                        onChange={(e) => updateField("preferredCommunication", e.target.value)}
                      >
                        <option value="EMAIL">Email</option>
                        <option value="SMS">SMS</option>
                        <option value="PHONE">Phone Call</option>
                        <option value="EMAIL_SMS">Email and SMS</option>
                      </select>
                    </div>
                  </div>

                  <h4 className="gov-section-title" style={{ marginTop: 24 }}>Verification Status</h4>
                  <table className="gov-table">
                    <thead>
                      <tr>
                        <th style={{ width: "35%" }}>Verification Item</th>
                        <th style={{ width: "20%" }}>Status</th>
                        <th style={{ width: "45%" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Login Email OTP", form.accountEmail ? "Ready" : "Pending", "OTP will be sent to the login email."],
                        ["Login Mobile OTP", form.accountMobile ? "Ready" : "Pending", "OTP will be sent to the login mobile number."],
                        ["Primary Contact Confirmation", form.primaryContactEmail || form.primaryContactMobile ? "Ready" : "Pending", "Contact details will be verified during application review."],
                      ].map(([item, status, help]) => (
                        <tr key={item}>
                          <td>
                            <strong style={{ display: "block", marginBottom: 4 }}>{item}</strong>
                            <div className="gov-help">{help}</div>
                          </td>
                          <td>
                            <GovStatusBadge variant={status === "Ready" ? "success" : "warning"}>
                              {status}
                            </GovStatusBadge>
                          </td>
                          <td>
                            <GovButton variant="secondary" disabled style={{ fontSize: 12, padding: "6px 12px" }}>
                              Send OTP
                            </GovButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <GovAlert variant="info" className="gov-mt-3">
                    <strong>Note:</strong> Use an official organization email and an active mobile number. These details will receive reviewer queries and submission acknowledgements.
                  </GovAlert>
                </div>
              )}

              {/* Organization Details Step */}
              {step.key === "organization" && (
                <div>
                  <h4 className="gov-section-title">Organization Basic Details</h4>

                  <div className="gov-form-grid">
                    <div className="gov-field full">
                      <label className="gov-label">
                        Legal Name <span className="gov-required">*</span>
                      </label>
                      <input
                        className="gov-input"
                        value={form.legalName}
                        onChange={(e) => updateField("legalName", e.target.value)}
                        placeholder="Enter legal name as per registration certificate"
                      />
                      <div className="gov-help">
                        This name must match PAN, CSR-1 and bank account.
                      </div>
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">Display Name / Short Name</label>
                      <input
                        className="gov-input"
                        value={form.displayName}
                        onChange={(e) => updateField("displayName", e.target.value)}
                        placeholder="Common name used by organization"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Organization Type <span className="gov-required">*</span>
                      </label>
                      <select
                        className="gov-select"
                        value={form.organizationType}
                        onChange={(e) => updateField("organizationType", e.target.value)}
                      >
                        <option value="">Select organization type</option>
                        {organizationTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Registration Number <span className="gov-required">*</span>
                      </label>
                      <input
                        className="gov-input"
                        value={form.registrationNumber}
                        onChange={(e) => updateField("registrationNumber", e.target.value)}
                        placeholder="Enter registration number"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Registration Date <span className="gov-required">*</span>
                      </label>
                      <input
                        type="date"
                        className="gov-input"
                        value={form.registrationDate}
                        onChange={(e) => updateField("registrationDate", e.target.value)}
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Registration Authority <span className="gov-required">*</span>
                      </label>
                      <input
                        className="gov-input"
                        value={form.registrationAuthority}
                        onChange={(e) => updateField("registrationAuthority", e.target.value)}
                        placeholder="e.g., Charity Commissioner, Registrar of Companies"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        PAN Number <span className="gov-required">*</span>
                      </label>
                      <input
                        className="gov-input"
                        value={form.pan}
                        onChange={(e) => updateField("pan", e.target.value.toUpperCase())}
                        placeholder="ABCDE1234F"
                        maxLength={10}
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        CSR-1 Registration Number <span className="gov-required">*</span>
                      </label>
                      <input
                        className="gov-input"
                        value={form.csr1Number}
                        onChange={(e) => updateField("csr1Number", e.target.value)}
                        placeholder="Enter CSR-1 number"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">NGO Darpan ID</label>
                      <input
                        className="gov-input"
                        value={form.ngoDarpanId}
                        onChange={(e) => updateField("ngoDarpanId", e.target.value)}
                        placeholder="Optional"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Year Established <span className="gov-required">*</span>
                      </label>
                      <input
                        type="number"
                        className="gov-input"
                        value={form.yearEstablished}
                        onChange={(e) => updateField("yearEstablished", e.target.value)}
                        placeholder="YYYY"
                        min="1900"
                        max={new Date().getFullYear()}
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Official Email <span className="gov-required">*</span>
                      </label>
                      <input
                        type="email"
                        className="gov-input"
                        value={form.officialEmail}
                        onChange={(e) => updateField("officialEmail", e.target.value)}
                        placeholder="contact@organization.org"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Official Phone <span className="gov-required">*</span>
                      </label>
                      <input
                        type="tel"
                        className="gov-input"
                        value={form.officialPhone}
                        onChange={(e) => updateField("officialPhone", e.target.value)}
                        placeholder="+91 1234567890"
                      />
                    </div>

                    <div className="gov-field full">
                      <label className="gov-label">Website</label>
                      <input
                        type="url"
                        className="gov-input"
                        value={form.website}
                        onChange={(e) => updateField("website", e.target.value)}
                        placeholder="https://www.organization.org"
                      />
                    </div>

                    <div className="gov-field full">
                      <label className="gov-label">
                        Registered Office Address <span className="gov-required">*</span>
                      </label>
                      <textarea
                        className="gov-textarea"
                        value={form.address}
                        onChange={(e) => updateField("address", e.target.value)}
                        placeholder="Enter complete address"
                        rows={3}
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        District <span className="gov-required">*</span>
                      </label>
                      <select
                        className="gov-select"
                        value={form.district}
                        onChange={(e) => updateField("district", e.target.value)}
                      >
                        <option value="">Select district</option>
                        {maharashtraDistricts.map((district) => (
                          <option key={district} value={district}>
                            {district}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        City / Town <span className="gov-required">*</span>
                      </label>
                      <input
                        className="gov-input"
                        value={form.city}
                        onChange={(e) => updateField("city", e.target.value)}
                        placeholder="Enter city name"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Pincode <span className="gov-required">*</span>
                      </label>
                      <input
                        className="gov-input"
                        value={form.pincode}
                        onChange={(e) => updateField("pincode", e.target.value)}
                        placeholder="400001"
                        maxLength={6}
                      />
                    </div>

                    <div className="gov-field full">
                      <label className="gov-label">
                        CSR Focus Sectors <span className="gov-required">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                        {csrSectors.map((sector) => (
                          <label
                            key={sector}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              padding: 8,
                              border: "1px solid var(--gov-border)",
                              borderRadius: "var(--gov-radius-sm)",
                              cursor: "pointer",
                              background: form.selectedSectors.includes(sector)
                                ? "var(--gov-primary-light)"
                                : "#fff",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={form.selectedSectors.includes(sector)}
                              onChange={() => handleSectorToggle(sector)}
                            />
                            <span style={{ fontSize: 13 }}>{sector}</span>
                          </label>
                        ))}
                      </div>
                      <div className="gov-help">Select all applicable sectors</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Statutory Details Step */}
              {step.key === "statutory" && (
                <div>
                  <h4 className="gov-section-title">Statutory Registration Details</h4>

                  <div className="gov-form-grid">
                    <div className="gov-field">
                      <label className="gov-label">
                        12A / 12AB Registration <span className="gov-required">*</span>
                      </label>
                      <select
                        className="gov-select"
                        value={form.has12A ? "yes" : "no"}
                        onChange={(e) => updateField("has12A", e.target.value === "yes")}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                      <div className="gov-help">Income Tax exemption registration</div>
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        80G Certificate <span className="gov-required">*</span>
                      </label>
                      <select
                        className="gov-select"
                        value={form.has80G ? "yes" : "no"}
                        onChange={(e) => updateField("has80G", e.target.value === "yes")}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                      <div className="gov-help">Tax deduction for donors</div>
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">GST Registered?</label>
                      <select
                        className="gov-select"
                        value={form.gstRegistered ? "yes" : "no"}
                        onChange={(e) => updateField("gstRegistered", e.target.value === "yes")}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                      <div className="gov-help">GST certificate will be required if Yes</div>
                    </div>

                    {form.gstRegistered && (
                      <div className="gov-field">
                        <label className="gov-label">
                          GSTIN <span className="gov-required">*</span>
                        </label>
                        <input
                          className="gov-input"
                          value={form.gstin}
                          onChange={(e) => updateField("gstin", e.target.value.toUpperCase())}
                          placeholder="22AAAAA0000A1Z5"
                          maxLength={15}
                        />
                      </div>
                    )}

                    <div className="gov-field">
                      <label className="gov-label">FCRA Applicable?</label>
                      <select
                        className="gov-select"
                        value={form.fcraApplicable ? "yes" : "no"}
                        onChange={(e) => updateField("fcraApplicable", e.target.value === "yes")}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                      <div className="gov-help">Foreign Contribution Regulation Act</div>
                    </div>

                    {form.fcraApplicable && (
                      <div className="gov-field">
                        <label className="gov-label">
                          FCRA Registration Number <span className="gov-required">*</span>
                        </label>
                        <input
                          className="gov-input"
                          value={form.fcraNumber}
                          onChange={(e) => updateField("fcraNumber", e.target.value)}
                          placeholder="Enter FCRA number"
                        />
                      </div>
                    )}
                  </div>

                  <GovAlert variant="info" className="gov-mt-3">
                    <strong>Note:</strong> Conditional documents will appear in the Documents step based on your selections here.
                  </GovAlert>
                </div>
              )}

              {/* Governance & Signatory Step */}
              {step.key === "governance" && (
                <div>
                  <h4 className="gov-section-title">Governing Body Details</h4>

                  <div className="gov-form-grid">
                    <div className="gov-field">
                      <label className="gov-label">
                        Governing Body Type <span className="gov-required">*</span>
                      </label>
                      <select
                        className="gov-select"
                        value={form.governingBodyType}
                        onChange={(e) => updateField("governingBodyType", e.target.value)}
                      >
                        <option value="">Select body type</option>
                        <option value="TRUSTEES">Board of Trustees</option>
                        <option value="EXECUTIVE_COMMITTEE">Executive Committee</option>
                        <option value="BOARD_OF_DIRECTORS">Board of Directors</option>
                        <option value="MANAGING_COMMITTEE">Managing Committee</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        No. of Governing Members <span className="gov-required">*</span>
                      </label>
                      <input
                        type="number"
                        className="gov-input"
                        value={form.governingBodyCount}
                        onChange={(e) => updateField("governingBodyCount", e.target.value)}
                        placeholder="Enter total members"
                        min="1"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Chairperson / President Name <span className="gov-required">*</span>
                      </label>
                      <input
                        className="gov-input"
                        value={form.chairpersonName}
                        onChange={(e) => updateField("chairpersonName", e.target.value)}
                        placeholder="Enter full name"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">Secretary / Managing Trustee Name</label>
                      <input
                        className="gov-input"
                        value={form.secretaryName}
                        onChange={(e) => updateField("secretaryName", e.target.value)}
                        placeholder="Enter full name"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">Treasurer / Finance Lead Name</label>
                      <input
                        className="gov-input"
                        value={form.treasurerName}
                        onChange={(e) => updateField("treasurerName", e.target.value)}
                        placeholder="Enter full name"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Meeting Frequency <span className="gov-required">*</span>
                      </label>
                      <select
                        className="gov-select"
                        value={form.meetingFrequency}
                        onChange={(e) => updateField("meetingFrequency", e.target.value)}
                      >
                        <option value="">Select frequency</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="QUARTERLY">Quarterly</option>
                        <option value="HALF_YEARLY">Half-yearly</option>
                        <option value="ANNUAL">Annual</option>
                        <option value="AS_REQUIRED">As required</option>
                      </select>
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">Last Governing Body Meeting Date</label>
                      <input
                        type="date"
                        className="gov-input"
                        value={form.lastMeetingDate}
                        onChange={(e) => updateField("lastMeetingDate", e.target.value)}
                      />
                    </div>
                  </div>

                  <h4 className="gov-section-title" style={{ marginTop: 24 }}>Authorized Signatory</h4>

                  <div className="gov-form-grid">
                    <div className="gov-field">
                      <label className="gov-label">
                        Authorized Signatory Name <span className="gov-required">*</span>
                      </label>
                      <input
                        className="gov-input"
                        value={form.authorizedSignatoryName}
                        onChange={(e) => updateField("authorizedSignatoryName", e.target.value)}
                        placeholder="Name as per identity proof"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Designation <span className="gov-required">*</span>
                      </label>
                      <input
                        className="gov-input"
                        value={form.authorizedSignatoryDesignation}
                        onChange={(e) => updateField("authorizedSignatoryDesignation", e.target.value)}
                        placeholder="e.g., Secretary, Director, Trustee"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Signatory Email <span className="gov-required">*</span>
                      </label>
                      <input
                        type="email"
                        className="gov-input"
                        value={form.authorizedSignatoryEmail}
                        onChange={(e) => updateField("authorizedSignatoryEmail", e.target.value)}
                        placeholder="signatory@organization.org"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Signatory Mobile <span className="gov-required">*</span>
                      </label>
                      <input
                        type="tel"
                        className="gov-input"
                        value={form.authorizedSignatoryMobile}
                        onChange={(e) => updateField("authorizedSignatoryMobile", e.target.value)}
                        placeholder="+91 9876543210"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Identity Proof Type <span className="gov-required">*</span>
                      </label>
                      <select
                        className="gov-select"
                        value={form.signatoryIdType}
                        onChange={(e) => updateField("signatoryIdType", e.target.value)}
                      >
                        <option value="PAN">PAN</option>
                        <option value="AADHAAR">Aadhaar</option>
                        <option value="PASSPORT">Passport</option>
                        <option value="VOTER_ID">Voter ID</option>
                        <option value="DRIVING_LICENSE">Driving License</option>
                      </select>
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Identity Proof Number <span className="gov-required">*</span>
                      </label>
                      <input
                        className="gov-input"
                        value={form.signatoryIdNumber}
                        onChange={(e) => updateField("signatoryIdNumber", e.target.value.toUpperCase())}
                        placeholder="Enter ID number"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Board Resolution / Authority Letter No. <span className="gov-required">*</span>
                      </label>
                      <input
                        className="gov-input"
                        value={form.boardResolutionNumber}
                        onChange={(e) => updateField("boardResolutionNumber", e.target.value)}
                        placeholder="Resolution or authority reference"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Resolution Date <span className="gov-required">*</span>
                      </label>
                      <input
                        type="date"
                        className="gov-input"
                        value={form.boardResolutionDate}
                        onChange={(e) => updateField("boardResolutionDate", e.target.value)}
                      />
                    </div>
                  </div>

                  <h4 className="gov-section-title" style={{ marginTop: 24 }}>Governance Compliance</h4>

                  <div className="gov-form-grid">
                    <div className="gov-field full">
                      <label className="gov-label">Policies Adopted</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {governancePolicyOptions.map((policy) => (
                          <label
                            key={policy}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              padding: 8,
                              border: "1px solid var(--gov-border)",
                              borderRadius: "var(--gov-radius-sm)",
                              cursor: "pointer",
                              background: form.governancePolicies.includes(policy)
                                ? "var(--gov-primary-light)"
                                : "#fff",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={form.governancePolicies.includes(policy)}
                              onChange={() => handleListToggle("governancePolicies", policy)}
                            />
                            <span style={{ fontSize: 13 }}>{policy}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="gov-field full">
                      <label className="gov-label">
                        Related Party / Conflict Disclosure <span className="gov-required">*</span>
                      </label>
                      <textarea
                        className="gov-textarea"
                        value={form.relatedPartyDisclosure}
                        onChange={(e) => updateField("relatedPartyDisclosure", e.target.value)}
                        placeholder="Declare related party transactions, conflicts of interest, or write Nil if not applicable."
                        rows={3}
                      />
                    </div>

                    <div className="gov-field full">
                      <label className="gov-label">Governance Remarks</label>
                      <textarea
                        className="gov-textarea"
                        value={form.governanceRemarks}
                        onChange={(e) => updateField("governanceRemarks", e.target.value)}
                        placeholder="Mention tenure rules, quorum requirements, signatory limitations or any special governance notes."
                        rows={3}
                      />
                    </div>
                  </div>

                  <h4 className="gov-section-title" style={{ marginTop: 24 }}>Governance Document Uploads</h4>
                  <table className="gov-table">
                    <thead>
                      <tr>
                        <th style={{ width: "35%" }}>Document</th>
                        <th style={{ width: "15%" }}>Requirement</th>
                        <th style={{ width: "50%" }}>Upload</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Governing body member list", "Mandatory", "Upload latest list of trustees, directors or committee members."],
                        ["Board resolution / authority letter", "Mandatory", "Upload signed authorization for portal submission and bank verification."],
                        ["Authorized signatory identity proof", "Mandatory", "Upload identity proof matching the signatory details entered above."],
                        ["Meeting minutes extract", "Optional", "Upload relevant minutes approving CSR onboarding or project authorization."],
                      ].map(([label, requirement, help]) => (
                        <tr key={label}>
                          <td>
                            <strong style={{ display: "block", marginBottom: 4 }}>{label}</strong>
                            <div className="gov-help">{help}</div>
                          </td>
                          <td>
                            <GovStatusBadge variant={requirement === "Mandatory" ? "danger" : "info"}>
                              {requirement}
                            </GovStatusBadge>
                          </td>
                          <td>
                            <div className="gov-document-box">
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                style={{ fontSize: 12, width: "100%" }}
                              />
                              <div className="gov-help" style={{ marginTop: 6 }}>
                                PDF, JPG, PNG. Max 5MB
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <GovAlert variant="warning" className="gov-mt-3">
                    <strong>Important:</strong> The authorized signatory must match the board resolution or authority letter uploaded in this step.
                  </GovAlert>
                </div>
              )}

              {/* Financial Details Step */}
              {step.key === "financial" && (
                <div>
                  <h4 className="gov-section-title">Bank Account Details</h4>

                  <div className="gov-form-grid">
                    <div className="gov-field full">
                      <label className="gov-label">
                        Account Holder Name <span className="gov-required">*</span>
                      </label>
                      <input
                        className="gov-input"
                        value={form.bankAccountHolder}
                        onChange={(e) => updateField("bankAccountHolder", e.target.value)}
                        placeholder="Must match organization legal name"
                      />
                      <div className="gov-help">Should match the legal name of the organization</div>
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Bank Name <span className="gov-required">*</span>
                      </label>
                      <input
                        className="gov-input"
                        value={form.bankName}
                        onChange={(e) => updateField("bankName", e.target.value)}
                        placeholder="e.g., State Bank of India"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Branch Name <span className="gov-required">*</span>
                      </label>
                      <input
                        className="gov-input"
                        value={form.bankBranch}
                        onChange={(e) => updateField("bankBranch", e.target.value)}
                        placeholder="Enter branch name"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Account Number <span className="gov-required">*</span>
                      </label>
                      <input
                        className="gov-input"
                        value={form.accountNumber}
                        onChange={(e) => updateField("accountNumber", e.target.value)}
                        placeholder="Enter account number"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        IFSC Code <span className="gov-required">*</span>
                      </label>
                      <input
                        className="gov-input"
                        value={form.ifscCode}
                        onChange={(e) => updateField("ifscCode", e.target.value.toUpperCase())}
                        placeholder="SBIN0001234"
                        maxLength={11}
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Account Type <span className="gov-required">*</span>
                      </label>
                      <select
                        className="gov-select"
                        value={form.accountType}
                        onChange={(e) => updateField("accountType", e.target.value)}
                      >
                        <option value="CURRENT">Current Account</option>
                        <option value="SAVINGS">Savings Account</option>
                        <option value="FCRA">FCRA Account</option>
                      </select>
                    </div>
                  </div>

                  <GovAlert variant="warning" className="gov-mt-3">
                    <strong>Important:</strong> Bank account will be verified through penny drop or bank statement. Ensure details are accurate.
                  </GovAlert>
                </div>
              )}

              {/* Experience & Impact Step */}
              {step.key === "experience" && (
                <div>
                  <h4 className="gov-section-title">Past CSR Experience</h4>

                  <div className="gov-form-grid">
                    <div className="gov-field">
                      <label className="gov-label">
                        Years of Field Operation <span className="gov-required">*</span>
                      </label>
                      <input
                        type="number"
                        className="gov-input"
                        value={form.yearsOfOperation}
                        onChange={(e) => updateField("yearsOfOperation", e.target.value)}
                        placeholder="e.g., 8"
                        min="0"
                      />
                      <div className="gov-help">Count completed years of active project implementation.</div>
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Completed CSR / Grant Projects <span className="gov-required">*</span>
                      </label>
                      <input
                        type="number"
                        className="gov-input"
                        value={form.completedCsrProjects}
                        onChange={(e) => updateField("completedCsrProjects", e.target.value)}
                        placeholder="Number of completed projects"
                        min="0"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">Ongoing Projects</label>
                      <input
                        type="number"
                        className="gov-input"
                        value={form.ongoingProjects}
                        onChange={(e) => updateField("ongoingProjects", e.target.value)}
                        placeholder="Number of active projects"
                        min="0"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Direct Beneficiaries Served <span className="gov-required">*</span>
                      </label>
                      <input
                        type="number"
                        className="gov-input"
                        value={form.totalBeneficiaries}
                        onChange={(e) => updateField("totalBeneficiaries", e.target.value)}
                        placeholder="Cumulative beneficiary count"
                        min="0"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">
                        Districts Covered <span className="gov-required">*</span>
                      </label>
                      <input
                        type="number"
                        className="gov-input"
                        value={form.districtsCovered}
                        onChange={(e) => updateField("districtsCovered", e.target.value)}
                        placeholder="Number of districts"
                        min="0"
                        max="36"
                      />
                      <div className="gov-help">Enter Maharashtra district coverage where applicable.</div>
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">Previous Corporate / Institutional Partners</label>
                      <input
                        className="gov-input"
                        value={form.previousCorporatePartners}
                        onChange={(e) => updateField("previousCorporatePartners", e.target.value)}
                        placeholder="e.g., ABC Foundation, XYZ Ltd."
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">Average Annual Project Budget</label>
                      <input
                        type="number"
                        className="gov-input"
                        value={form.annualProjectBudget}
                        onChange={(e) => updateField("annualProjectBudget", e.target.value)}
                        placeholder="Amount in INR"
                        min="0"
                      />
                    </div>

                    <div className="gov-field">
                      <label className="gov-label">Largest Project Value Handled</label>
                      <input
                        type="number"
                        className="gov-input"
                        value={form.largestProjectValue}
                        onChange={(e) => updateField("largestProjectValue", e.target.value)}
                        placeholder="Amount in INR"
                        min="0"
                      />
                    </div>

                    <div className="gov-field full">
                      <label className="gov-label">
                        Beneficiary Groups Served <span className="gov-required">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                        {beneficiaryGroups.map((group) => (
                          <label
                            key={group}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              padding: 8,
                              border: "1px solid var(--gov-border)",
                              borderRadius: "var(--gov-radius-sm)",
                              cursor: "pointer",
                              background: form.impactBeneficiaryGroups.includes(group)
                                ? "var(--gov-primary-light)"
                                : "#fff",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={form.impactBeneficiaryGroups.includes(group)}
                              onChange={() => handleListToggle("impactBeneficiaryGroups", group)}
                            />
                            <span style={{ fontSize: 13 }}>{group}</span>
                          </label>
                        ))}
                      </div>
                      <div className="gov-help">Select all groups for which project evidence can be produced.</div>
                    </div>

                    <div className="gov-field full">
                      <label className="gov-label">
                        Available Impact Evidence <span className="gov-required">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {impactEvidenceTypes.map((evidence) => (
                          <label
                            key={evidence}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              padding: 8,
                              border: "1px solid var(--gov-border)",
                              borderRadius: "var(--gov-radius-sm)",
                              cursor: "pointer",
                              background: form.impactEvidenceTypes.includes(evidence)
                                ? "var(--gov-primary-light)"
                                : "#fff",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={form.impactEvidenceTypes.includes(evidence)}
                              onChange={() => handleListToggle("impactEvidenceTypes", evidence)}
                            />
                            <span style={{ fontSize: 13 }}>{evidence}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="gov-field full">
                      <label className="gov-label">
                        Major Project Summary <span className="gov-required">*</span>
                      </label>
                      <textarea
                        className="gov-textarea"
                        value={form.majorProjectSummary}
                        onChange={(e) => updateField("majorProjectSummary", e.target.value)}
                        placeholder="Describe 2-3 major projects, locations, duration, funding source and outcomes."
                        rows={4}
                      />
                    </div>

                    <div className="gov-field full">
                      <label className="gov-label">
                        Impact Measurement Process <span className="gov-required">*</span>
                      </label>
                      <textarea
                        className="gov-textarea"
                        value={form.impactMeasurementProcess}
                        onChange={(e) => updateField("impactMeasurementProcess", e.target.value)}
                        placeholder="Explain beneficiary verification, baseline/endline surveys, monitoring visits, photos, registers or MIS process."
                        rows={3}
                      />
                    </div>

                    <div className="gov-field full">
                      <label className="gov-label">Third-party Assessment / Audit Details</label>
                      <textarea
                        className="gov-textarea"
                        value={form.thirdPartyAssessment}
                        onChange={(e) => updateField("thirdPartyAssessment", e.target.value)}
                        placeholder="Mention external evaluator, audit agency, assessment year and report reference if available."
                        rows={3}
                      />
                    </div>

                    <div className="gov-field full">
                      <label className="gov-label">Awards, Recognitions or Government Empanelment</label>
                      <textarea
                        className="gov-textarea"
                        value={form.awardsOrRecognitions}
                        onChange={(e) => updateField("awardsOrRecognitions", e.target.value)}
                        placeholder="List relevant awards, letters of appreciation, empanelment or accreditation details."
                        rows={3}
                      />
                    </div>
                  </div>

                  <h4 className="gov-section-title" style={{ marginTop: 24 }}>Experience Evidence Uploads</h4>
                  <table className="gov-table">
                    <thead>
                      <tr>
                        <th style={{ width: "35%" }}>Evidence</th>
                        <th style={{ width: "15%" }}>Requirement</th>
                        <th style={{ width: "50%" }}>Upload</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Past project completion certificate", "Mandatory", "Upload completion or closure certificate for key CSR projects."],
                        ["Annual report / impact report", "Mandatory", "Upload latest report showing beneficiary and activity evidence."],
                        ["Corporate partner reference letter", "Optional", "Upload partner feedback or sanction / appreciation letter if available."],
                      ].map(([label, requirement, help]) => (
                        <tr key={label}>
                          <td>
                            <strong style={{ display: "block", marginBottom: 4 }}>{label}</strong>
                            <div className="gov-help">{help}</div>
                          </td>
                          <td>
                            <GovStatusBadge variant={requirement === "Mandatory" ? "danger" : "info"}>
                              {requirement}
                            </GovStatusBadge>
                          </td>
                          <td>
                            <div className="gov-document-box">
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                style={{ fontSize: 12, width: "100%" }}
                              />
                              <div className="gov-help" style={{ marginTop: 6 }}>
                                PDF, JPG, PNG. Max 5MB
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <GovAlert variant="info" className="gov-mt-3">
                    <strong>Verification Note:</strong> Enter conservative, document-backed numbers. Beneficiary counts and project values may be checked against uploaded reports and partner references.
                  </GovAlert>
                </div>
              )}

              {/* Documents Step */}
              {step.key === "documents" && (
                <div>
                  <h4 className="gov-section-title">Document Checklist</h4>

                  <GovAlert variant="warning" className="gov-mb-2">
                    Upload clear scanned copies. Do not upload password-protected files. Mask sensitive information where applicable.
                  </GovAlert>

                  <table className="gov-table">
                    <thead>
                      <tr>
                        <th style={{ width: "35%" }}>Document</th>
                        <th style={{ width: "15%" }}>Requirement</th>
                        <th style={{ width: "15%" }}>Status</th>
                        <th style={{ width: "35%" }}>Upload</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleDocuments.map((doc) => (
                        <tr key={doc.key}>
                          <td>
                            <strong style={{ display: "block", marginBottom: 4 }}>{doc.label}</strong>
                            <div className="gov-help">{doc.help}</div>
                          </td>
                          <td>
                            {doc.required ? (
                              <GovStatusBadge variant="danger">Mandatory</GovStatusBadge>
                            ) : (
                              <GovStatusBadge variant="info">Optional</GovStatusBadge>
                            )}
                          </td>
                          <td>
                            <GovStatusBadge variant="warning">Pending</GovStatusBadge>
                          </td>
                          <td>
                            <div className="gov-document-box">
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                style={{ fontSize: 12, width: "100%" }}
                              />
                              <div className="gov-help" style={{ marginTop: 6 }}>
                                PDF, JPG, PNG. Max 5MB
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Declarations Step */}
              {step.key === "declarations" && (
                <div>
                  <h4 className="gov-section-title">Mandatory Declarations</h4>

                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <label
                      style={{
                        display: "flex",
                        gap: 12,
                        padding: 14,
                        border: "1px solid var(--gov-border)",
                        borderRadius: "var(--gov-radius)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.blacklistDeclaration}
                        onChange={(e) => updateField("blacklistDeclaration", e.target.checked)}
                      />
                      <span>
                        <strong>Blacklist Declaration:</strong> I declare that this organization has not been blacklisted by any government authority or corporate entity.
                      </span>
                    </label>

                    <label
                      style={{
                        display: "flex",
                        gap: 12,
                        padding: 14,
                        border: "1px solid var(--gov-border)",
                        borderRadius: "var(--gov-radius)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.litigationDeclaration}
                        onChange={(e) => updateField("litigationDeclaration", e.target.checked)}
                      />
                      <span>
                        <strong>Litigation Declaration:</strong> I declare that there is no pending litigation or legal proceedings against this organization that would affect CSR eligibility.
                      </span>
                    </label>

                    <label
                      style={{
                        display: "flex",
                        gap: 12,
                        padding: 14,
                        border: "1px solid var(--gov-border)",
                        borderRadius: "var(--gov-radius)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.conflictOfInterest}
                        onChange={(e) => updateField("conflictOfInterest", e.target.checked)}
                      />
                      <span>
                        <strong>Conflict of Interest:</strong> I declare that there is no conflict of interest with any related party or connected person as per Companies Act, 2013.
                      </span>
                    </label>

                    <label
                      style={{
                        display: "flex",
                        gap: 12,
                        padding: 14,
                        border: "1px solid var(--gov-border)",
                        borderRadius: "var(--gov-radius)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.dataPrivacyConsent}
                        onChange={(e) => updateField("dataPrivacyConsent", e.target.checked)}
                      />
                      <span>
                        <strong>Data Privacy Consent:</strong> I consent to the collection, processing and storage of organization data for verification and monitoring purposes.
                      </span>
                    </label>

                    <label
                      style={{
                        display: "flex",
                        gap: 12,
                        padding: 14,
                        border: "1px solid var(--gov-border)",
                        borderRadius: "var(--gov-radius)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.verificationConsent}
                        onChange={(e) => updateField("verificationConsent", e.target.checked)}
                      />
                      <span>
                        <strong>Verification Consent:</strong> I authorize the portal to verify all submitted information with relevant authorities and third parties.
                      </span>
                    </label>
                  </div>

                  <GovAlert variant="danger" className="gov-mt-3">
                    <strong>Legal Notice:</strong> Providing false information or documents may result in rejection, blacklisting, and legal action under applicable laws.
                  </GovAlert>
                </div>
              )}

              {/* Review Step */}
              {step.key === "review" && (
                <div>
                  <h4 className="gov-section-title">Review Application</h4>

                  <GovAlert variant="info" className="gov-mb-2">
                    Please verify all details before final submission. After submission, some fields may be locked until reviewer raises a query.
                  </GovAlert>

                  <div style={{ marginTop: 18 }}>
                    <table className="gov-table">
                      <tbody>
                        <tr>
                          <th style={{ width: "30%" }}>Login Email</th>
                          <td>{form.accountEmail || "Not provided"}</td>
                        </tr>
                        <tr>
                          <th>Login Mobile</th>
                          <td>{form.accountMobile || "Not provided"}</td>
                        </tr>
                        <tr>
                          <th>Primary Contact</th>
                          <td>
                            {form.primaryContactName
                              ? `${form.primaryContactName}${form.primaryContactDesignation ? `, ${form.primaryContactDesignation}` : ""}`
                              : "Not provided"}
                          </td>
                        </tr>
                        <tr>
                          <th>Primary Contact Email</th>
                          <td>{form.primaryContactEmail || "Not provided"}</td>
                        </tr>
                        <tr>
                          <th>Legal Name</th>
                          <td>{form.legalName || "Not provided"}</td>
                        </tr>
                        <tr>
                          <th>Organization Type</th>
                          <td>{form.organizationType || "Not selected"}</td>
                        </tr>
                        <tr>
                          <th>PAN</th>
                          <td>{form.pan || "Not provided"}</td>
                        </tr>
                        <tr>
                          <th>CSR-1</th>
                          <td>{form.csr1Number || "Not provided"}</td>
                        </tr>
                        <tr>
                          <th>District</th>
                          <td>{form.district || "Not selected"}</td>
                        </tr>
                        <tr>
                          <th>12A/12AB Status</th>
                          <td>{form.has12A ? "Yes" : "No"}</td>
                        </tr>
                        <tr>
                          <th>80G Status</th>
                          <td>{form.has80G ? "Yes" : "No"}</td>
                        </tr>
                        <tr>
                          <th>Governing Body Type</th>
                          <td>{form.governingBodyType || "Not selected"}</td>
                        </tr>
                        <tr>
                          <th>Authorized Signatory</th>
                          <td>
                            {form.authorizedSignatoryName
                              ? `${form.authorizedSignatoryName}${form.authorizedSignatoryDesignation ? `, ${form.authorizedSignatoryDesignation}` : ""}`
                              : "Not provided"}
                          </td>
                        </tr>
                        <tr>
                          <th>Board Resolution</th>
                          <td>
                            {form.boardResolutionNumber || form.boardResolutionDate
                              ? `${form.boardResolutionNumber || "No reference"}${form.boardResolutionDate ? ` dated ${form.boardResolutionDate}` : ""}`
                              : "Not provided"}
                          </td>
                        </tr>
                        <tr>
                          <th>Bank Account</th>
                          <td>{form.accountNumber ? `****${form.accountNumber.slice(-4)}` : "Not provided"}</td>
                        </tr>
                        <tr>
                          <th>IFSC Code</th>
                          <td>{form.ifscCode || "Not provided"}</td>
                        </tr>
                        <tr>
                          <th>Completed CSR Projects</th>
                          <td>{form.completedCsrProjects || "Not provided"}</td>
                        </tr>
                        <tr>
                          <th>Beneficiaries Served</th>
                          <td>{form.totalBeneficiaries || "Not provided"}</td>
                        </tr>
                        <tr>
                          <th>Beneficiary Groups</th>
                          <td>
                            {form.impactBeneficiaryGroups.length
                              ? form.impactBeneficiaryGroups.join(", ")
                              : "Not selected"}
                          </td>
                        </tr>
                        <tr>
                          <th>Impact Evidence</th>
                          <td>
                            {form.impactEvidenceTypes.length
                              ? form.impactEvidenceTypes.join(", ")
                              : "Not selected"}
                          </td>
                        </tr>
                        <tr>
                          <th>All Declarations</th>
                          <td>
                            {form.blacklistDeclaration &&
                            form.litigationDeclaration &&
                            form.conflictOfInterest &&
                            form.dataPrivacyConsent &&
                            form.verificationConsent ? (
                              <GovStatusBadge variant="success">Completed</GovStatusBadge>
                            ) : (
                              <GovStatusBadge variant="danger">Incomplete</GovStatusBadge>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Placeholder for other steps */}
              {!["account", "organization", "statutory", "governance", "financial", "experience", "documents", "declarations", "review"].includes(step.key) && (
                <GovAlert variant="info">
                  <strong>{step.title}</strong> section is under development. Use the same official form pattern without fancy cards or AI-style layouts.
                </GovAlert>
              )}

              {/* Navigation Buttons */}
              <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
                <GovButton
                  variant="secondary"
                  disabled={currentStep === 0}
                  onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                >
                  Previous
                </GovButton>

                {currentStep === onboardingSteps.length - 1 ? (
                  <GovButton
                    variant="primary"
                    onClick={() => {
                      alert("Application submitted for verification successfully!");
                    }}
                  >
                    Submit for Verification
                  </GovButton>
                ) : (
                  <GovButton
                    variant="primary"
                    onClick={() => setCurrentStep((s) => Math.min(onboardingSteps.length - 1, s + 1))}
                  >
                    Save & Continue
                  </GovButton>
                )}
              </div>
            </GovCardBody>
          </GovCard>
        </section>
      </div>
    </GovPortalLayout>
  );
}



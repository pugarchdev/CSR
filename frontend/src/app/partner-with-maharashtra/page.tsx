"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import GovInput from "@/components/gov/GovInput";
import GovSelect from "@/components/gov/GovSelect";
import GovTextarea from "@/components/gov/GovTextarea";
import GovButton from "@/components/gov/GovButton";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovAlert from "@/components/gov/GovAlert";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import OtpVerification from "@/components/OtpVerification";
import { Building2, Handshake, CheckCircle, Loader2, Copy, ArrowRight } from "lucide-react";

const SECTORS = [
  { value: "", label: "Select Sector" },
  { value: "EDUCATION", label: "Education" },
  { value: "HEALTH", label: "Health & Sanitation" },
  { value: "WATER", label: "Water & Irrigation" },
  { value: "RURAL_DEVELOPMENT", label: "Rural Development" },
  { value: "ENVIRONMENT", label: "Environment & Climate Change" },
  { value: "WOMEN_EMPOWERMENT", label: "Women Empowerment" },
  { value: "SKILL_DEVELOPMENT", label: "Skill Development" },
  { value: "AGRICULTURE", label: "Agriculture" },
  { value: "SPORTS", label: "Sports" },
  { value: "OTHER", label: "Other" },
];

const DISTRICTS = [
  "Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana",
  "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna",
  "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded",
  "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad",
  "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha",
  "Washim", "Yavatmal"
];

const JOURNEY_STEPS = [
  {
    step: "Step 1",
    title: "Corporate Enquiry Form",
    detail: "Company name, sector, geography, optional budget, CSR contact, OTP-verified mobile and email, MCA21 CIN, and proposed CSR work up to 200 words.",
    tone: "#e3f0fa",
  },
  {
    step: "Step 2",
    title: "Unique Tracking ID",
    detail: "The portal generates a tracking ID instantly. SMS and email notifications are sent, and every interaction is recorded against this ID.",
    tone: "#e8f5e9",
  },
  {
    step: "Step 3",
    title: "CSR Relationship Manager Response",
    detail: "A dedicated Relationship Manager responds within 5 days, understands the requirement, and guides the corporate through the next step.",
    tone: "#e3f0fa",
  },
  {
    step: "Step 4",
    title: "Assessment Report to Joint Secretary",
    detail: "The RM submits an assessment report with the 13-point feasibility checklist and a recommendation to proceed, proceed with conditions, or not proceed.",
    tone: "#e3f0fa",
  },
  {
    step: "Step 5",
    title: "JS Decision and Nodal Officer",
    detail: "The Joint Secretary records the decision. If approved, a District Nodal Officer is appointed and mapped to the project.",
    tone: "#e8f5e9",
  },
  {
    step: "Steps 6-8",
    title: "Dialogue, MoU, and Project Onboarding",
    detail: "The nodal officer and corporate finalize the project, sign the standard MoU, define deliverables, and onboard the project with a Project ID.",
    tone: "#e8f5e9",
  },
];

const SLA_ITEMS = [
  { trigger: "RM silent for 5 days", escalatesTo: "Joint Secretary", within: "3 days" },
  { trigger: "JS silent for 3 days", escalatesTo: "Planning Secretary", within: "2 days" },
  { trigger: "JS decision delayed 5 days", escalatesTo: "Secretary, Planning Department", within: "2 days" },
];

interface CSRPartnerForm {
  companyName: string;
  sector: string;
  preferredDistricts: string[];
  indicativeBudget: string;
  contactPersonName: string;
  mobile: string;
  email: string;
  mca21CIN: string;
  proposedCSRWork: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function PartnerWithMaharashtraPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [mobileVerificationToken, setMobileVerificationToken] = useState("");
  const [emailVerificationToken, setEmailVerificationToken] = useState("");

  const [form, setForm] = useState<CSRPartnerForm>({
    companyName: "",
    sector: "",
    preferredDistricts: [],
    indicativeBudget: "",
    contactPersonName: "",
    mobile: "",
    email: "",
    mca21CIN: "",
    proposedCSRWork: "",
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.companyName.trim()) {
      newErrors.companyName = "Company name is required";
    }

    if (!form.sector) {
      newErrors.sector = "Sector is required";
    }

    if (form.preferredDistricts.length === 0) {
      newErrors.preferredDistricts = "At least one district must be selected";
    }

    if (!form.contactPersonName.trim()) {
      newErrors.contactPersonName = "Contact person name is required";
    }

    if (!form.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      newErrors.mobile = "Enter valid 10-digit Indian mobile number";
    }

    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Enter valid email address";
    }

    if (!mobileVerificationToken) {
      newErrors.mobileOtp = "Mobile OTP verification is required";
    }

    if (!emailVerificationToken) {
      newErrors.emailOtp = "Email OTP verification is required";
    }

    if (!form.mca21CIN.trim()) {
      newErrors.mca21CIN = "MCA21 CIN is required";
    } else if (!/^([LUu]{1})([0-9]{5})([A-Za-z]{2})([0-9]{4})([A-Za-z]{3})([0-9]{6})$/.test(form.mca21CIN)) {
      newErrors.mca21CIN = "Enter valid 21-character CIN (e.g., U12345MH2024PTC123456)";
    }

    if (!form.proposedCSRWork.trim()) {
      newErrors.proposedCSRWork = "Proposed CSR work description is required";
    } else {
      const wordCount = form.proposedCSRWork.trim().split(/\s+/).length;
      if (wordCount > 200) {
        newErrors.proposedCSRWork = `Description exceeds 200 words (current: ${wordCount})`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDistrictToggle = (district: string) => {
    setForm((prev) => ({
      ...prev,
      preferredDistricts: prev.preferredDistricts.includes(district)
        ? prev.preferredDistricts.filter((d) => d !== district)
        : [...prev.preferredDistricts, district],
    }));
    if (errors.preferredDistricts) {
      setErrors((prev) => ({ ...prev, preferredDistricts: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch<any>("/corporate-enquiries", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          mca21Cin: form.mca21CIN,
          proposedCsrWork: form.proposedCSRWork,
          indicativeBudget: form.indicativeBudget ? parseFloat(form.indicativeBudget) : null,
          mobileVerificationToken,
          emailVerificationToken,
        }),
      });

      setTrackingId(response.trackingId ?? response.enquiry?.trackingId ?? response.data?.trackingId ?? response.data?.enquiry?.trackingId);
      setSubmitted(true);
    } catch (err: any) {
      setErrors({
        submit: err.message || "Failed to submit enquiry. Please try again.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  const copyTrackingId = () => {
    navigator.clipboard.writeText(trackingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = form.proposedCSRWork.trim().split(/\s+/).filter(w => w.length > 0).length;

  if (submitted) {
    return (
      <GovPortalLayout showSidebar={false}>
        <div className="gov-public-main">
          <div className="gov-page-header">
            <div className="gov-breadcrumb">
              Home / Partner with Maharashtra
            </div>
            <h1 className="gov-page-title flex items-center gap-3">
              <Handshake size={28} className="text-[#f7941d]" />
              Enquiry Submitted Successfully
            </h1>
            <p className="gov-page-description">
              Thank you for your interest in partnering with Maharashtra for CSR initiatives.
            </p>
          </div>

          <GovCard className="max-w-2xl mx-auto">
            <GovCardBody className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-[#14274e] mb-2">
                Your enquiry has been received
              </h2>
              <p className="text-slate-600 mb-6">
                A dedicated CSR Relationship Manager will respond, understand the need, and guide you within 5 days.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded p-4 mb-6">
                <p className="text-sm text-slate-500 mb-2">Your Tracking ID</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-2xl font-mono font-bold text-[#14274e]">
                    {trackingId}
                  </code>
                  <button
                    onClick={copyTrackingId}
                    className="p-2 hover:bg-slate-200 rounded transition-colors"
                    title="Copy tracking ID"
                  >
                    <Copy size={18} className={copied ? "text-green-600" : "text-slate-500"} />
                  </button>
                </div>
                {copied && (
                  <p className="text-xs text-green-600 mt-1">Copied to clipboard!</p>
                )}
              </div>

              <div className="flex gap-3 justify-center">
                <GovButton onClick={() => router.push(`/track?id=${trackingId}`)}>
                  Track Application
                </GovButton>
                <GovButton variant="secondary" onClick={() => router.push("/")}>
                  Back to Home
                </GovButton>
              </div>
            </GovCardBody>
          </GovCard>
        </div>
      </GovPortalLayout>
    );
  }

  return (
    <GovPortalLayout showSidebar={false}>
      <div className="gov-public-main">
        <div className="gov-page-header">
          <div className="gov-breadcrumb">
            Home / Partner with Maharashtra
          </div>
          <h1 className="gov-page-title flex items-center gap-3">
            <Handshake size={28} className="text-[#f7941d]" />
            Partner with Maharashtra
          </h1>
          <p className="gov-page-description">
            Submit your CSR enquiry to collaborate with the Government of Maharashtra on social development initiatives.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)", gap: 16, marginBottom: 24 }}>
          <GovCard>
            <GovCardHeader>
              <GovCardTitle className="flex items-center gap-2">
                <Handshake size={18} />
                Corporate CSR Partnership Journey
              </GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              <div style={{ display: "grid", gap: 12 }}>
                {JOURNEY_STEPS.map((item) => (
                  <div
                    key={item.step}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "96px minmax(0, 1fr)",
                      gap: 14,
                      padding: 14,
                      border: "1px solid var(--gov-border)",
                      borderLeft: "4px solid var(--gov-primary)",
                      background: item.tone,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 800, color: "var(--gov-primary)", textTransform: "uppercase" }}>
                      {item.step}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gov-text)" }}>{item.title}</div>
                      <div style={{ marginTop: 4, fontSize: 13, color: "var(--gov-text-secondary)", lineHeight: 1.55 }}>{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </GovCardBody>
          </GovCard>

          <div style={{ display: "grid", gap: 16 }}>
            <GovCard>
              <GovCardHeader>
                <GovCardTitle>Red-Carpet SLA</GovCardTitle>
              </GovCardHeader>
              <GovCardBody>
                <div style={{ display: "grid", gap: 10 }}>
                  {SLA_ITEMS.map((item) => (
                    <div key={item.trigger} style={{ padding: 12, border: "1px solid var(--gov-border)", background: "#fef3e0" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "var(--gov-warning)" }}>{item.trigger}</div>
                      <div style={{ marginTop: 4, fontSize: 13, color: "var(--gov-text)" }}>
                        Escalates to <strong>{item.escalatesTo}</strong> within <strong>{item.within}</strong>.
                      </div>
                    </div>
                  ))}
                </div>
              </GovCardBody>
            </GovCard>

            <GovCard>
              <GovCardHeader>
                <GovCardTitle>How to Track</GovCardTitle>
              </GovCardHeader>
              <GovCardBody>
                                <p style={{ margin: 0, color: "var(--gov-text-secondary)", fontSize: 13, lineHeight: 1.6 }}>
                  After submission, use the generated tracking ID at <strong>track Status</strong> to see status updates, RM interactions, escalation movement, JS decision, nodal appointment, and project onboarding progress.
                </p>
                  <Link
                href="/track"
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:no-underline transition-colors w-full sm:w-auto"
              >
                Track Status <ArrowRight size={14} className="ml-1.5" />
              </Link>              </GovCardBody>
            </GovCard>
          </div>
        </div>

        {errors.submit && (
          <GovAlert variant="danger" className="mb-4">
            {errors.submit}
          </GovAlert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="gov-form-grid">
            {/* Company Information */}
            <div className="gov-field full">
              <GovCard>
                <GovCardHeader>
                  <GovCardTitle className="flex items-center gap-2">
                    <Building2 size={18} />
                    Company Information
                  </GovCardTitle>
                </GovCardHeader>
                <GovCardBody>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <GovInput
                      label="Company Name"
                      required
                      value={form.companyName}
                      onChange={(e) => {
                        setForm({ ...form, companyName: e.target.value });
                        if (errors.companyName) setErrors({ ...errors, companyName: "" });
                      }}
                      error={errors.companyName}
                      placeholder="e.g., Tata Consultancy Services Ltd"
                    />

                    <GovSelect
                      label="Sector"
                      required
                      value={form.sector}
                      onChange={(e) => {
                        setForm({ ...form, sector: e.target.value });
                        if (errors.sector) setErrors({ ...errors, sector: "" });
                      }}
                      error={errors.sector}
                    >
                      {SECTORS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </GovSelect>

                    <GovInput
                      label="MCA21 CIN"
                      required
                      format="cin"
                      value={form.mca21CIN}
                      onChange={(e) => {
                        setForm({ ...form, mca21CIN: e.target.value.toUpperCase() });
                        if (errors.mca21CIN) setErrors({ ...errors, mca21CIN: "" });
                      }}
                      error={errors.mca21CIN}
                      placeholder="e.g., U12345MH2024PTC123456"
                      help="21-character Corporate Identification Number"
                    />

                    <GovInput
                      label="Budget"
                      type="number"
                      value={form.indicativeBudget}
                      onChange={(e) => setForm({ ...form, indicativeBudget: e.target.value })}
                      placeholder="e.g., 5000000"
                      help="Optional - indicative CSR budget"
                    />
                  </div>
                </GovCardBody>
              </GovCard>
            </div>

            {/* Preferred Districts */}
            <div className="gov-field full">
              <GovCard>
                <GovCardHeader>
                <GovCardTitle>Geography</GovCardTitle>
                </GovCardHeader>
                <GovCardBody>
                  {errors.preferredDistricts && (
                    <GovAlert variant="danger" className="mb-3">
                      {errors.preferredDistricts}
                    </GovAlert>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {DISTRICTS.map((district) => (
                      <label
                        key={district}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                          form.preferredDistricts.includes(district)
                            ? "bg-[#14274e] text-white"
                            : "bg-slate-50 hover:bg-slate-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={form.preferredDistricts.includes(district)}
                          onChange={() => handleDistrictToggle(district)}
                        />
                        <span className="text-xs font-medium">{district}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    Preferred district(s)/region. Selected: {form.preferredDistricts.length} district(s)
                  </p>
                </GovCardBody>
              </GovCard>
            </div>

            {/* Contact Information */}
            <div className="gov-field full">
              <GovCard>
                <GovCardHeader>
                  <GovCardTitle>Contact Information</GovCardTitle>
                </GovCardHeader>
                <GovCardBody>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <GovInput
                      label="Contact Person Name"
                      required
                      format="name"
                      value={form.contactPersonName}
                      onChange={(e) => {
                        setForm({ ...form, contactPersonName: e.target.value });
                        if (errors.contactPersonName) setErrors({ ...errors, contactPersonName: "" });
                      }}
                      error={errors.contactPersonName}
                      placeholder="Full name"
                    />

                    <div className="relative">
                      <GovInput
                        label="Mobile Number"
                        required
                        format="phone"
                        value={form.mobile}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setForm({ ...form, mobile: value });
                          setMobileVerificationToken("");
                          if (errors.mobile) setErrors({ ...errors, mobile: "" });
                        }}
                        error={errors.mobile}
                        placeholder="10-digit mobile number"
                      />
                      <OtpVerification purpose="CORPORATE_ENQUIRY" channel="MOBILE" target={form.mobile} onVerified={setMobileVerificationToken} />
                      {errors.mobileOtp && <p className="mt-1 text-xs text-red-600">{errors.mobileOtp}</p>}
                    </div>

                    <div className="relative">
                      <GovInput
                      label="Email"
                        type="email"
                        required
                        format="email"
                        value={form.email}
                        onChange={(e) => {
                          setForm({ ...form, email: e.target.value });
                          setEmailVerificationToken("");
                          if (errors.email) setErrors({ ...errors, email: "" });
                        }}
                        error={errors.email}
                        placeholder="email@company.com"
                      />
                      <OtpVerification purpose="CORPORATE_ENQUIRY" channel="EMAIL" target={form.email} onVerified={setEmailVerificationToken} />
                      {errors.emailOtp && <p className="mt-1 text-xs text-red-600">{errors.emailOtp}</p>}
                    </div>
                  </div>
                </GovCardBody>
              </GovCard>
            </div>

            {/* CSR Proposal */}
            <div className="gov-field full">
              <GovCard>
                <GovCardHeader>
                <GovCardTitle>Proposed CSR Work</GovCardTitle>
                </GovCardHeader>
                <GovCardBody>
                  <GovTextarea
                    label="Proposed CSR Work"
                    required
                    value={form.proposedCSRWork}
                    onChange={(e) => {
                      setForm({ ...form, proposedCSRWork: e.target.value });
                      if (errors.proposedCSRWork) setErrors({ ...errors, proposedCSRWork: "" });
                    }}
                    error={errors.proposedCSRWork}
                    placeholder="Describe your proposed CSR initiative, target beneficiaries, expected outcomes, and timeline..."
                    rows={6}
                    help={`Maximum 200 words. Current: ${wordCount} words`}
                  />
                </GovCardBody>
              </GovCard>
            </div>

            {/* Submit */}
            <div className="gov-field full gov-text-center gov-mt-2">
              <GovButton type="submit" disabled={loading || !mobileVerificationToken || !emailVerificationToken}>
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                "Submit Corporate Enquiry"
                )}
              </GovButton>
              <p className="text-xs text-slate-500 mt-3">
                By submitting, you agree to the terms and conditions of Maharashtra CSR Portal.
              </p>
            </div>
          </div>
        </form>
      </div>
    </GovPortalLayout>
  );
}

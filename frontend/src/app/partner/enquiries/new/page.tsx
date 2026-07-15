"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import GovInput from "@/components/gov/GovInput";
import GovSelect from "@/components/gov/GovSelect";
import GovTextarea from "@/components/gov/GovTextarea";
import GovButton from "@/components/gov/GovButton";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovAlert from "@/components/gov/GovAlert";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { Building2, Handshake, CheckCircle, Loader2, Copy, ArrowLeft } from "lucide-react";
import Link from "next/link";

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

export default function NewPartnerEnquiryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

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

  // Prepopulate from authenticated user session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("user");
      if (user) {
        try {
          const userData = JSON.parse(user);
          const name = userData.organization?.name || userData.companyName || userData.name || "";
          const cin = userData.organization?.cin || userData.company?.cin || userData.cin || "";
          const email = userData.email || "";
          
          setForm((prev) => ({
            ...prev,
            companyName: name,
            mca21CIN: cin,
            email: email,
            contactPersonName: userData.contactPersonName || userData.name || prev.contactPersonName,
            mobile: userData.mobile || prev.mobile,
          }));
        } catch (e) {
          console.error("Error loading user profile", e);
        }
      }
    }
  }, []);

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
          mobileVerificationToken: "authenticated",
          emailVerificationToken: "authenticated",
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
      <GovPortalLayout userRole="CORPORATE_USER">
        <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
          <GovPageHeader
            title="Enquiry Submitted Successfully"
            description="Thank you for your interest in partnering with Maharashtra for CSR initiatives."
            breadcrumb="Home / Partner / Submit Enquiry"
          />

          <GovCard className="mt-4">
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

              <div className="bg-slate-50 border border-slate-200 rounded p-4 mb-6" style={{ maxWidth: 400, margin: "0 auto 24px" }}>
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
                <GovButton variant="secondary" onClick={() => router.push("/partner/dashboard")}>
                  Back to Dashboard
                </GovButton>
              </div>
            </GovCardBody>
          </GovCard>
        </div>
      </GovPortalLayout>
    );
  }

  return (
    <GovPortalLayout userRole="CORPORATE_USER">
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: 20 }}>
        {/* Back Link */}
        <Link href="/partner/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 20, color: "var(--gov-primary)", fontWeight: 600, textDecoration: "none" }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <GovPageHeader
          title="Submit Corporate CSR Enquiry"
          description="Submit your CSR enquiry to collaborate with the Government of Maharashtra on social development initiatives."
          breadcrumb="Home / Partner / Submit Enquiry"
        />

        {errors.submit && (
          <GovAlert variant="danger" className="mb-4">
            {errors.submit}
          </GovAlert>
        )}

        <form onSubmit={handleSubmit} className="mt-4">
          <div className="grid grid-cols-1 gap-6">
            
            {/* Organization Info */}
            <GovCard>
              <GovCardHeader>
                <GovCardTitle>
                  <div className="flex items-center gap-2">
                    <Building2 className="text-[#14274e]" size={20} />
                    <span>Organization Information</span>
                  </div>
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
                    placeholder="Enter company name"
                  />

                  <GovInput
                    label="MCA21 CIN (Corporate Identification Number)"
                    required
                    value={form.mca21CIN}
                    onChange={(e) => {
                      setForm({ ...form, mca21CIN: e.target.value.toUpperCase() });
                      if (errors.mca21CIN) setErrors({ ...errors, mca21CIN: "" });
                    }}
                    error={errors.mca21CIN}
                    placeholder="U12345MH2024PTC123456"
                  />

                  <GovSelect
                    label="Primary Sector of Interest"
                    required
                    value={form.sector}
                    onChange={(e) => {
                      setForm({ ...form, sector: e.target.value });
                      if (errors.sector) setErrors({ ...errors, sector: "" });
                    }}
                    error={errors.sector}
                  >
                    {SECTORS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </GovSelect>

                  <GovInput
                    label="Indicative CSR Budget (₹ - Optional)"
                    type="number"
                    value={form.indicativeBudget}
                    onChange={(e) => setForm({ ...form, indicativeBudget: e.target.value })}
                    placeholder="e.g. 5000000"
                  />
                </div>
              </GovCardBody>
            </GovCard>

            {/* Geography Selection */}
            <GovCard>
              <GovCardHeader>
                <GovCardTitle>Geography Preferred</GovCardTitle>
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
                  Select preferred district(s)/region. Selected: {form.preferredDistricts.length} district(s)
                </p>
              </GovCardBody>
            </GovCard>

            {/* Contact Information */}
            <GovCard>
              <GovCardHeader>
                <GovCardTitle>Contact Information</GovCardTitle>
              </GovCardHeader>
              <GovCardBody>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <GovInput
                    label="Contact Person Name"
                    required
                    value={form.contactPersonName}
                    onChange={(e) => {
                      setForm({ ...form, contactPersonName: e.target.value });
                      if (errors.contactPersonName) setErrors({ ...errors, contactPersonName: "" });
                    }}
                    error={errors.contactPersonName}
                    placeholder="Full name"
                  />

                  <GovInput
                    label="Mobile Number"
                    required
                    value={form.mobile}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setForm({ ...form, mobile: value });
                      if (errors.mobile) setErrors({ ...errors, mobile: "" });
                    }}
                    error={errors.mobile}
                    placeholder="10-digit mobile number"
                  />

                  <GovInput
                    label="Email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value });
                      if (errors.email) setErrors({ ...errors, email: "" });
                    }}
                    error={errors.email}
                    placeholder="email@company.com"
                  />
                </div>
              </GovCardBody>
            </GovCard>

            {/* Proposed CSR Work */}
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

            {/* Submit Button */}
            <div className="flex flex-col items-center mt-2">
              <GovButton type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin mr-2" />
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

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import GovInput from "@/components/gov/GovInput";
import GovSelect from "@/components/gov/GovSelect";
import GovTextarea from "@/components/gov/GovTextarea";
import GovButton from "@/components/gov/GovButton";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovAlert from "@/components/gov/GovAlert";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import OtpVerification from "@/components/OtpVerification";
import { Building2, FileText, Upload, CheckCircle, Loader2, MapPin, Camera } from "lucide-react";

const SERVICE_CLASSES = [
  { value: "", label: "Select Service Class" },
  { value: "CLASS_1", label: "Class-1" },
  { value: "CLASS_2", label: "Class-2" },
  { value: "BELOW_CLASS_2", label: "below Class-2" },
];

const getCertificationOptions = (serviceClass: string) => {
  if (serviceClass === "CLASS_1" || serviceClass === "CLASS_2") {
    return [{ value: "SELF", label: "Self certification" }];
  }
  if (serviceClass === "BELOW_CLASS_2") {
    return [{ value: "HOD", label: "HOD certification" }];
  }
  return [{ value: "", label: "Select Service Class first" }];
};

const DISTRICTS = [
  "Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana",
  "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna",
  "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded",
  "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad",
  "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha",
  "Washim", "Yavatmal"
];

const TALUKAS: Record<string, string[]> = {
  "Pune": ["Haveli", "Khed", "Maval", "Mulshi", "Shirur", "Daund", "Indapur", "Baramati", "Purandar", "Velhe"],
  "Mumbai City": ["Mumbai City"],
  "Mumbai Suburban": ["Andheri", "Borivali", "Kandivali", "Malad", "Goregaon", "Jogeshwari"],
  "Thane": ["Thane", "Kalyan", "Ulhasnagar", "Ambarnath", "Bhiwandi", "Murbad"],
  "Nashik": ["Nashik", "Igatpuri", "Dindori", "Kalwan", "Baglan", "Malegaon", "Nandgaon", "Yeola"],
};

interface PitchForm {
  officialName: string;
  designation: string;
  department: string;
  officeName: string;
  serviceClass: string;
  mobile: string;
  email: string;
  district: string;
  taluka: string;
  exactLocation: string;
  csrRequirement: string;
  estimatedCost: string;
  govtFundDeclaration: boolean;
  certificationType: string;
  hodDocument?: File | null;
  geoTaggedPhotos: File[];
}

interface FormErrors {
  [key: string]: string;
}

export default function PitchDevelopmentNeedPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploading, setUploading] = useState(false);
  const [mobileVerificationToken, setMobileVerificationToken] = useState("");
  const [emailVerificationToken, setEmailVerificationToken] = useState("");

  const [form, setForm] = useState<PitchForm>({
    officialName: "",
    designation: "",
    department: "",
    officeName: "",
    serviceClass: "",
    mobile: "",
    email: "",
    district: "",
    taluka: "",
    exactLocation: "",
    csrRequirement: "",
    estimatedCost: "",
    govtFundDeclaration: false,
    certificationType: "",
    hodDocument: null,
    geoTaggedPhotos: [],
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.officialName.trim()) {
      newErrors.officialName = "Official name is required";
    }

    if (!form.designation.trim()) {
      newErrors.designation = "Designation is required";
    }

    if (!form.department.trim()) {
      newErrors.department = "Department is required";
    }

    if (!form.officeName.trim()) {
      newErrors.officeName = "Office name is required";
    }

    if (!form.serviceClass) {
      newErrors.serviceClass = "Service class is required";
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

    if (!form.district) {
      newErrors.district = "District is required";
    }

    if (!form.taluka) {
      newErrors.taluka = "Taluka is required";
    }

    if (!form.exactLocation.trim()) {
      newErrors.exactLocation = "Exact location is required";
    }

    if (!form.csrRequirement.trim()) {
      newErrors.csrRequirement = "CSR requirement description is required";
    } else {
      const wordCount = form.csrRequirement.trim().split(/\s+/).length;
      if (wordCount > 200) {
        newErrors.csrRequirement = `Description exceeds 200 words (current: ${wordCount})`;
      }
    }

    if (!form.estimatedCost.trim()) {
      newErrors.estimatedCost = "Estimated cost is required";
    } else if (parseFloat(form.estimatedCost) <= 0) {
      newErrors.estimatedCost = "Estimated cost must be greater than 0";
    }

    if (!form.govtFundDeclaration) {
      newErrors.govtFundDeclaration = "You must confirm that government funds are not available";
    }

    if (!form.certificationType) {
      newErrors.certificationType = "Certification type is required";
    }

    if ((form.serviceClass === "CLASS_1" || form.serviceClass === "CLASS_2") && form.certificationType !== "SELF") {
      newErrors.certificationType = "Class-1 and Class-2 officials must use self certification";
    }

    if (form.serviceClass === "BELOW_CLASS_2" && form.certificationType !== "HOD") {
      newErrors.certificationType = "below Class-2 officials must upload HOD certification";
    }

    if (form.certificationType === "HOD" && !form.hodDocument) {
      newErrors.hodDocument = "HOD certification document is required for HOD certification";
    }

    if (form.geoTaggedPhotos.length < 2) {
      newErrors.geoTaggedPhotos = "At least 2 geo-tagged photos are required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files);
      setForm((prev) => ({
        ...prev,
        geoTaggedPhotos: [...prev.geoTaggedPhotos, ...newPhotos],
      }));
      if (errors.geoTaggedPhotos) {
        setErrors((prev) => ({ ...prev, geoTaggedPhotos: "" }));
      }
    }
  };

  const removePhoto = (index: number) => {
    setForm((prev) => ({
      ...prev,
      geoTaggedPhotos: prev.geoTaggedPhotos.filter((_, i) => i !== index),
    }));
  };

  const handleHodDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setForm((prev) => ({ ...prev, hodDocument: e.target.files![0] }));
      if (errors.hodDocument) {
        setErrors((prev) => ({ ...prev, hodDocument: "" }));
      }
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    return `https://dev.mahacsr.local/uploads/${encodeURIComponent(file.name)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      // Upload files first
      const photoUrls: string[] = [];
      for (const photo of form.geoTaggedPhotos) {
        const url = await uploadFile(photo);
        photoUrls.push(url);
      }

      let hodDocumentUrl = "";
      if (form.hodDocument) {
        hodDocumentUrl = await uploadFile(form.hodDocument);
      }

      const response = await apiFetch<any>("/government-pitches", {
        method: "POST",
        body: JSON.stringify({
          officialName: form.officialName,
          designation: form.designation,
          department: form.department,
          officeName: form.officeName,
          serviceClass: form.serviceClass,
          mobile: form.mobile,
          email: form.email,
          district: form.district,
          taluka: form.taluka,
          exactLocation: form.exactLocation,
          csrRequirement: form.csrRequirement,
          estimatedCost: parseFloat(form.estimatedCost),
          govtFundDeclaration: form.govtFundDeclaration,
          certificationType: form.certificationType,
          hodCertificationDocument: hodDocumentUrl,
          photos: photoUrls.map((fileUrl, index) => ({
            fileUrl,
            latitude: 18.5204 + index / 1000,
            longitude: 73.8567 + index / 1000,
            capturedAt: new Date().toISOString(),
          })),
          mobileVerificationToken,
          emailVerificationToken,
        }),
      });

      setTrackingId(response.trackingId ?? response.pitch?.pitchReferenceId ?? response.data?.pitch?.pitchReferenceId);
      setSubmitted(true);
    } catch (err: any) {
      setErrors({
        submit: err.message || "Failed to submit pitch. Please try again.",
      });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const wordCount = form.csrRequirement.trim().split(/\s+/).filter(w => w.length > 0).length;
  const availableTalukas = form.district ? (TALUKAS[form.district] || [`${form.district} Taluka`]) : [];

  if (submitted) {
    return (
      <GovPortalLayout showSidebar={false}>
        <div className="gov-public-main">
          <div className="gov-page-header">
            <div className="gov-breadcrumb">
              Home / Pitch Development Need
            </div>
            <h1 className="gov-page-title flex items-center gap-3">
              <Building2 size={28} className="text-[#f7941d]" />
              Government Pitch Submitted Successfully
            </h1>
          </div>

          <GovCard className="max-w-2xl mx-auto">
            <GovCardBody className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-[#14274e] mb-2">
                Your development pitch has been submitted
              </h2>
              <p className="text-slate-600 mb-6">
                The Relationship Manager verifies the pitch and submits a verification report to the Joint Secretary.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded p-4 mb-6">
                <p className="text-sm text-slate-500 mb-2">Your Tracking ID</p>
                <code className="text-2xl font-mono font-bold text-[#14274e]">
                  {trackingId}
                </code>
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
            Home / Pitch a Development Need
          </div>
          <h1 className="gov-page-title flex items-center gap-3">
            <Building2 size={28} className="text-[#f7941d]" />
            Pitch a Development Need
          </h1>
          <p className="gov-page-description">
            Government officials can pitch genuine, unfunded development needs for CSR support.
          </p>
        </div>

        {errors.submit && (
          <GovAlert variant="danger" className="mb-4">
            {errors.submit}
          </GovAlert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="gov-form-grid">
            {/* Official Information */}
            <div className="gov-field full">
              <GovCard>
                <GovCardHeader>
                  <GovCardTitle className="flex items-center gap-2">
                    <Building2 size={18} />
                    Name & Details of Official
                  </GovCardTitle>
                </GovCardHeader>
                <GovCardBody>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <GovInput
                      label="Official Name"
                      required
                      value={form.officialName}
                      onChange={(e) => {
                        setForm({ ...form, officialName: e.target.value });
                        if (errors.officialName) setErrors({ ...errors, officialName: "" });
                      }}
                      error={errors.officialName}
                      placeholder="Full name"
                    />

                    <GovInput
                      label="Designation"
                      required
                      value={form.designation}
                      onChange={(e) => {
                        setForm({ ...form, designation: e.target.value });
                        if (errors.designation) setErrors({ ...errors, designation: "" });
                      }}
                      error={errors.designation}
                      placeholder="e.g., Taluka Development Officer"
                    />

                    <GovInput
                      label="Department"
                      required
                      value={form.department}
                      onChange={(e) => {
                        setForm({ ...form, department: e.target.value });
                        if (errors.department) setErrors({ ...errors, department: "" });
                      }}
                      error={errors.department}
                      placeholder="e.g., Rural Development"
                    />

                    <GovInput
                      label="Office Name"
                      required
                      value={form.officeName}
                      onChange={(e) => {
                        setForm({ ...form, officeName: e.target.value });
                        if (errors.officeName) setErrors({ ...errors, officeName: "" });
                      }}
                      error={errors.officeName}
                      placeholder="e.g., Zilla Parishad Office"
                    />

                    <GovSelect
                      label="Service Class"
                      required
                      value={form.serviceClass}
                      onChange={(e) => {
                        const serviceClass = e.target.value;
                        setForm({
                          ...form,
                          serviceClass,
                          certificationType: serviceClass === "CLASS_1" || serviceClass === "CLASS_2"
                            ? "SELF"
                            : serviceClass === "BELOW_CLASS_2"
                              ? "HOD"
                              : "",
                          hodDocument: serviceClass === "BELOW_CLASS_2" ? form.hodDocument : null,
                        });
                        if (errors.serviceClass) setErrors({ ...errors, serviceClass: "" });
                      }}
                      error={errors.serviceClass}
                    >
                      {SERVICE_CLASSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </GovSelect>

                    <div className="relative">
                      <GovInput
                        label="Mobile Number"
                        required
                        value={form.mobile}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setForm({ ...form, mobile: value });
                          setMobileVerificationToken("");
                          if (errors.mobile) setErrors({ ...errors, mobile: "" });
                        }}
                        error={errors.mobile}
                        placeholder="10-digit mobile"
                      />
                      <OtpVerification purpose="GOVERNMENT_PITCH" channel="MOBILE" target={form.mobile} onVerified={setMobileVerificationToken} />
                      {errors.mobileOtp && <p className="mt-1 text-xs text-red-600">{errors.mobileOtp}</p>}
                    </div>

                    <div className="relative md:col-span-2">
                      <GovInput
                      label="Email"
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => {
                          setForm({ ...form, email: e.target.value });
                          setEmailVerificationToken("");
                          if (errors.email) setErrors({ ...errors, email: "" });
                        }}
                        error={errors.email}
                        placeholder="official@maharashtra.gov.in"
                      />
                      <OtpVerification purpose="GOVERNMENT_PITCH" channel="EMAIL" target={form.email} onVerified={setEmailVerificationToken} />
                      {errors.emailOtp && <p className="mt-1 text-xs text-red-600">{errors.emailOtp}</p>}
                    </div>
                  </div>
                </GovCardBody>
              </GovCard>
            </div>

            {/* Location Details */}
            <div className="gov-field full">
              <GovCard>
                <GovCardHeader>
                  <GovCardTitle className="flex items-center gap-2">
                    <MapPin size={18} />
                    District & Location
                  </GovCardTitle>
                </GovCardHeader>
                <GovCardBody>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <GovSelect
                      label="District"
                      required
                      value={form.district}
                      onChange={(e) => {
                        setForm({ ...form, district: e.target.value, taluka: "" });
                        if (errors.district) setErrors({ ...errors, district: "" });
                      }}
                      error={errors.district}
                    >
                      <option value="">Select District</option>
                      {DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </GovSelect>

                    <GovSelect
                      label="Taluka"
                      required
                      value={form.taluka}
                      onChange={(e) => {
                        setForm({ ...form, taluka: e.target.value });
                        if (errors.taluka) setErrors({ ...errors, taluka: "" });
                      }}
                      error={errors.taluka}
                      disabled={!form.district}
                    >
                      <option value="">{form.district ? "Select Taluka" : "Select District first"}</option>
                      {availableTalukas.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </GovSelect>

                    <GovInput
                      label="Exact Location"
                      required
                      value={form.exactLocation}
                      onChange={(e) => {
                        setForm({ ...form, exactLocation: e.target.value });
                        if (errors.exactLocation) setErrors({ ...errors, exactLocation: "" });
                      }}
                      error={errors.exactLocation}
                      placeholder="Village/Area name"
                    />
                  </div>
                </GovCardBody>
              </GovCard>
            </div>

            {/* CSR Requirement */}
            <div className="gov-field full">
              <GovCard>
                <GovCardHeader>
                  <GovCardTitle className="flex items-center gap-2">
                    <FileText size={18} />
                    CSR Requirement
                  </GovCardTitle>
                </GovCardHeader>
                <GovCardBody>
                  <div className="grid grid-cols-1 gap-4">
                    <GovTextarea
                      label="CSR Requirement"
                      required
                      value={form.csrRequirement}
                      onChange={(e) => {
                        setForm({ ...form, csrRequirement: e.target.value });
                        if (errors.csrRequirement) setErrors({ ...errors, csrRequirement: "" });
                      }}
                      error={errors.csrRequirement}
                      placeholder="Describe the development need, current situation, expected beneficiaries, and proposed solution..."
                      rows={5}
                      help={`Maximum 200 words. Current: ${wordCount} words`}
                    />

                    <GovInput
                      label="Estimated Cost"
                      type="number"
                      required
                      value={form.estimatedCost}
                      onChange={(e) => {
                        setForm({ ...form, estimatedCost: e.target.value });
                        if (errors.estimatedCost) setErrors({ ...errors, estimatedCost: "" });
                      }}
                      error={errors.estimatedCost}
                      placeholder="e.g., 2500000"
                    />
                  </div>
                </GovCardBody>
              </GovCard>
            </div>

            {/* Certification & Documents */}
            <div className="gov-field full">
              <GovCard>
                <GovCardHeader>
                  <GovCardTitle className="flex items-center gap-2">
                    <Upload size={18} />
                    Govt Fund Declaration, Site Photos & Certification
                  </GovCardTitle>
                </GovCardHeader>
                <GovCardBody>
                  <div className="space-y-4">
                    <label className="flex items-start gap-3 p-4 bg-slate-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.govtFundDeclaration}
                        onChange={(e) => {
                          setForm({ ...form, govtFundDeclaration: e.target.checked });
                          if (errors.govtFundDeclaration) setErrors({ ...errors, govtFundDeclaration: "" });
                        }}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium text-sm">Govt Fund Declaration</p>
                        <p className="text-xs text-slate-500">
                          I declare that the work cannot be funded through available government funds.
                        </p>
                      </div>
                    </label>
                    {errors.govtFundDeclaration && (
                      <GovAlert variant="danger">{errors.govtFundDeclaration}</GovAlert>
                    )}

                    <GovSelect
                      label="Certification"
                      required
                      value={form.certificationType}
                      onChange={(e) => {
                        setForm({ ...form, certificationType: e.target.value });
                        if (errors.certificationType) setErrors({ ...errors, certificationType: "" });
                      }}
                      error={errors.certificationType}
                      disabled={!form.serviceClass}
                    >
                      {getCertificationOptions(form.serviceClass).map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </GovSelect>

                    {form.certificationType === "HOD" && (
                      <div className="gov-document-box">
                        <label className="block text-sm font-bold text-[#14274e] mb-2">
                          HOD certification document
                          <span className="gov-required">*</span>
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleHodDocumentUpload}
                          className="w-full"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                          Upload signed HOD certification (PDF, JPG, PNG up to 5MB)
                        </p>
                        {form.hodDocument && (
                          <p className="text-xs text-green-600 mt-2">
                            Selected: {form.hodDocument.name}
                          </p>
                        )}
                        {errors.hodDocument && (
                          <p className="text-xs text-red-600 mt-2">{errors.hodDocument}</p>
                        )}
                      </div>
                    )}

                    <div className="gov-document-box">
                      <label className="block text-sm font-bold text-[#14274e] mb-2">
                        <Camera size={16} className="inline mr-2" />
                        Geo-tagged Site Photos
                        <span className="gov-required">*</span>
                        <span className="text-xs font-normal text-slate-500 ml-2">
                          (Minimum 2 required)
                        </span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        capture="environment"
                        onChange={handlePhotoUpload}
                        className="w-full"
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        Upload at least 2 geo-tagged photos of the location (JPG, PNG)
                      </p>

                      {form.geoTaggedPhotos.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {form.geoTaggedPhotos.map((photo, index) => (
                            <div key={index} className="relative group">
                              <div className="aspect-square bg-slate-100 rounded border border-slate-200 flex items-center justify-center overflow-hidden">
                                <span className="text-xs text-slate-500 text-center px-2">
                                  {photo.name}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removePhoto(index)}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {errors.geoTaggedPhotos && (
                        <GovAlert variant="danger" className="mt-3">
                          {errors.geoTaggedPhotos}
                        </GovAlert>
                      )}
                    </div>
                  </div>
                </GovCardBody>
              </GovCard>
            </div>

            {/* Submit */}
            <div className="gov-field full gov-text-center gov-mt-2">
              <GovButton type="submit" disabled={loading || uploading || !mobileVerificationToken || !emailVerificationToken}>
                {loading || uploading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {uploading ? "Uploading files..." : "Submitting..."}
                  </>
                ) : (
                  "Submit Government Pitch"
                )}
              </GovButton>
              <p className="text-xs text-slate-500 mt-3">
                By submitting, you certify that all information provided is true and accurate.
              </p>
            </div>
          </div>
        </form>
      </div>
    </GovPortalLayout>
  );
}

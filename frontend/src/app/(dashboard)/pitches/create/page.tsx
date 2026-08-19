"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, uploadPortalFile } from "@/lib/api";
import GovInput from "@/components/gov/GovInput";
import GovSelect from "@/components/gov/GovSelect";
import GovTextarea from "@/components/gov/GovTextarea";
import GovButton from "@/components/gov/GovButton";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovAlert from "@/components/gov/GovAlert";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { Modal } from "@/components/ui/Modal";
import {
  CheckCircle, Camera, ArrowLeft, ChevronDown, X,
  FileText, Paperclip, Search, Sparkles, ShieldCheck, CheckCircle2, AlertCircle, Clock
} from "lucide-react";
import { locationData } from "@/lib/locationData";
import { useAuthStore } from "@/store/authStore";

const SERVICE_CLASSES = [
  { value: "", label: "Select Service Class" },
  { value: "CLASS_1", label: "Class-1 Officer" },
  { value: "CLASS_2", label: "Class-2 Officer" },
  { value: "BELOW_CLASS_2", label: "below Class-2 Officer" },
];

const DIVISION_TO_DISTRICTS: Record<string, string[]> = {
  Amravati: ["Akola", "Amravati", "Buldhana", "Washim", "Yavatmal"],
  Aurangabad: ["Aurangabad", "Beed", "Hingoli", "Jalna", "Latur", "Nanded", "Osmanabad", "Parbhani"],
  Konkan: ["Mumbai City", "Mumbai Suburban", "Palghar", "Raigad", "Ratnagiri", "Sindhudurg", "Thane"],
  Nagpur: ["Bhandara", "Chandrapur", "Gadchiroli", "Gondia", "Nagpur", "Wardha"],
  Nashik: ["Ahmednagar", "Dhule", "Jalgaon", "Nandurbar", "Nashik"],
  Pune: ["Kolhapur", "Pune", "Sangli", "Satara", "Solapur"],
};

const getDivisionAndDistrict = (rawDistrict?: string | null) => {
  if (!rawDistrict || typeof rawDistrict !== "string") return { division: "", district: "" };
  const dClean = rawDistrict.trim().toLowerCase();
  for (const [division, districts] of Object.entries(DIVISION_TO_DISTRICTS)) {
    const matched = districts.find((d) => d.toLowerCase() === dClean);
    if (matched) {
      return { division, district: matched };
    }
  }
  return { division: "", district: "" };
};

function MultiSelectField({
  label,
  values,
  options,
  onChange,
  required = false,
  placeholder = "Select options"
}: {
  label: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedSet = new Set(values || []);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (option: string) => {
    const next = new Set(selectedSet);
    if (next.has(option)) {
      next.delete(option);
    } else {
      next.add(option);
    }
    onChange(Array.from(next));
  };

  const removeOption = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedSet);
    next.delete(option);
    onChange(Array.from(next));
  };

  return (
    <div className={`flex flex-col gap-1.5 text-xs font-bold text-slate-800 relative ${isOpen ? "z-[100]" : "z-20"}`} ref={dropdownRef}>
      <label className="flex items-center justify-between">
        <span>
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </span>
        {values && values.length > 0 && (
          <span className="text-[10px] text-blue-800 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
            {values.length} selected
          </span>
        )}
      </label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`min-h-[46px] border bg-slate-50/60 hover:bg-white focus-within:bg-white px-3.5 py-2 flex items-center justify-between gap-2 cursor-pointer outline-none rounded-xl shadow-xs transition-all duration-200 ${
          isOpen ? "border-blue-700 ring-4 ring-blue-800/10 bg-white shadow-md" : "border-slate-200/90"
        }`}
      >
        <div className="flex flex-wrap gap-1.5 items-center">
          {values && values.length > 0 ? (
            values.map(val => (
              <span key={val} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-950 border border-blue-200/70 text-xs font-bold px-2.5 py-1 rounded-lg shadow-2xs">
                {val}
                <button
                  type="button"
                  onClick={(e) => removeOption(val, e)}
                  className="hover:bg-blue-200/80 rounded p-0.5 transition-colors text-blue-900 focus:outline-none"
                >
                  <X size={12} />
                </button>
              </span>
            ))
          ) : (
            <span className="text-slate-400 font-medium text-xs">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={18} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-blue-800" : ""}`} />
      </div>

      {isOpen && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-[999] border border-slate-200/90 bg-white shadow-2xl rounded-2xl overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/90 flex items-center gap-2">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search regions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full border-none bg-transparent text-xs font-semibold outline-none text-slate-800 placeholder:text-slate-400"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="text-xs text-slate-400 hover:text-slate-700">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-grow divide-y divide-slate-100 max-h-52" data-lenis-prevent>
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-xs text-slate-400 font-medium text-center">No options found</div>
            ) : (
              filteredOptions.map(option => {
                const isChecked = selectedSet.has(option);
                return (
                  <div
                    key={option}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOption(option);
                    }}
                    className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold cursor-pointer hover:bg-blue-50/50 transition-colors ${isChecked ? "bg-blue-50/80 text-blue-950 font-bold" : "text-slate-800"}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-slate-300 text-blue-900 focus:ring-blue-800 accent-blue-900"
                      />
                      <span>{option}</span>
                    </div>
                    {isChecked && <CheckCircle2 size={14} className="text-blue-800" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface PitchForm {
  officialName: string;
  designation: string;
  department: string;
  officeName: string;
  serviceClass: string;
  mobile: string;
  email: string;
  divisions: string[];
  districts: string[];
  cities: string[];
  talukas: string[];
  exactLocation: string;
  csrRequirement: string;
  estimatedCost: string;
  govtFundDeclaration: boolean;
  certificationType: string;
  hodDocument?: File | null;
  supportingDocuments: File[];
  geoTaggedPhotos: File[];
}

interface FormErrors {
  [key: string]: string;
}

export default function CreatePitchDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s: any) => s.user);
  const roles = useAuthStore((s: any) => s.roles);
  const activeRoles = (roles || []).length > 0 ? roles : (user?.role ? [user.role] : []);
  const isRM = activeRoles.some((r: any) => {
    const s = String(typeof r === "object" ? r?.code || r?.name || r?.id : r).toUpperCase();
    return s.includes("RELATIONSHIP_MANAGER") || s.includes("RELATIONSHIP MANAGER") || s.includes("SYSTEM_ROLE_6") || s === "6";
  });

  const [onboardingGuardModal, setOnboardingGuardModal] = useState<"NONE" | "ONBOARDING_INCOMPLETE" | "APPROVAL_PENDING">("NONE");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referenceId, setReferenceId] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    let isMounted = true;
    const checkOnboardingAndApproval = async () => {
      let org = (user as any)?.organization;

      if (user?.organizationId) {
        try {
          const res = await apiFetch<any>("/onboarding/profile");
          org = res?.organization || res?.data?.organization || res?.data || res || org;
        } catch {}
      }

      if (!user?.organizationId || !org) {
        if (isMounted) setOnboardingGuardModal("ONBOARDING_INCOMPLETE");
        return;
      }

      const statusUpper = (org.status || org.onboardingStatus || "").toUpperCase();
      const PENDING_APPROVAL_STATUSES = ["SUBMITTED_FOR_REVIEW", "UNDER_VERIFICATION", "CLARIFICATION_REQUIRED", "PENDING_APPROVAL", "DOCUMENTS_SUBMITTED"];

      if (statusUpper === "ACTIVE" || statusUpper === "APPROVED" || Number(user?.roleId || user?.role) === 1) {
        if (isMounted) {
          setOnboardingGuardModal("NONE");
          if (org) {
            useAuthStore.setState((s) => ({
              user: s.user ? { ...s.user, organization: { ...s.user.organization, ...org } } : null
            }));
          }
        }
        return;
      } else if (PENDING_APPROVAL_STATUSES.includes(statusUpper)) {
        if (isMounted) setOnboardingGuardModal("APPROVAL_PENDING");
        return;
      } else {
        // REGISTERED, PROFILE_INCOMPLETE, DOCUMENTS_PENDING, or un-submitted onboarding
        if (isMounted) setOnboardingGuardModal("ONBOARDING_INCOMPLETE");
        return;
      }
    };

    checkOnboardingAndApproval();

    return () => { isMounted = false; };
  }, [user]);

  const [form, setForm] = useState<PitchForm>({
    officialName: "",
    designation: "",
    department: "",
    officeName: "",
    serviceClass: "",
    mobile: "",
    email: "",
    divisions: [],
    districts: [],
    cities: [],
    talukas: [],
    exactLocation: "",
    csrRequirement: "",
    estimatedCost: "",
    govtFundDeclaration: false,
    certificationType: "",
    hodDocument: null,
    supportingDocuments: [],
    geoTaggedPhotos: [],
  });

  // Auto-fetch and prepopulate official identity, credentials, department and location from user session and verified organization profile
  useEffect(() => {
    let isMounted = true;

    const applyUserData = (u: any, orgData?: any, profileData?: any) => {
      if (!u && !orgData && !profileData) return;
      const org = orgData || u?.organization || u?.company || {};
      const profile = profileData || u?.govDeptProfile || org?.govDeptProfile || {};

      const fullName = [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim();
      const officialName = u?.officialName || fullName || u?.name || profile?.nodalOfficerName || profile?.headOfDepartmentName || "";
      const designation = u?.designation || profile?.nodalOfficerDesignation || profile?.headDesignation || "";
      const department = org?.name || org?.legalName || org?.displayName || u?.department || "";
      const officeName = org?.name || org?.legalName || org?.displayName || u?.officeName || "";
      const email = u?.email || org?.officialEmail || org?.officialOfficeEmail || profile?.nodalOfficerEmail || profile?.headEmail || "";
      const mobile = u?.mobile || u?.phone || org?.officialPhone || org?.officialOfficePhone || profile?.nodalOfficerMobile || profile?.headMobile || "";

      const rawDistrict = org?.district || u?.assignedDistrict || u?.district || profile?.district || "";
      const { division, district } = getDivisionAndDistrict(rawDistrict);

      setForm((prev) => {
        const nextDivisions = prev.divisions.length > 0 ? prev.divisions : (division ? [division] : []);
        const nextDistricts = prev.districts.length > 0 ? prev.districts : (district ? [district] : []);

        return {
          ...prev,
          officialName: officialName || prev.officialName,
          designation: designation || prev.designation,
          department: department || prev.department,
          officeName: officeName || prev.officeName,
          email: email || prev.email,
          mobile: mobile ? String(mobile).replace(/\D/g, "").slice(0, 10) : prev.mobile,
          divisions: nextDivisions,
          districts: nextDistricts,
        };
      });
    };

    // 1. Immediate sync prepopulate from localStorage session or active authStore user
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("user");
        if (raw) {
          applyUserData(JSON.parse(raw));
        } else if (user) {
          applyUserData(user);
        }
      } catch {
        if (user) applyUserData(user);
      }
    }

    // 2. Async fetch verified department profile and current auth profile from backend
    const fetchDepartmentDetails = async () => {
      try {
        const [deptRes, meRes] = await Promise.allSettled([
          apiFetch<any>("/onboarding/department"),
          apiFetch<any>("/auth/me")
        ]);

        if (!isMounted) return;

        let resolvedOrg: any = null;
        let resolvedProfile: any = null;
        let resolvedUser: any = user;

        if (deptRes.status === "fulfilled" && deptRes.value) {
          resolvedOrg = deptRes.value?.organization || deptRes.value?.data?.organization || deptRes.value;
          resolvedProfile = deptRes.value?.profile || deptRes.value?.data?.profile || resolvedOrg?.govDeptProfile;
        }

        if (meRes.status === "fulfilled" && meRes.value) {
          resolvedUser = meRes.value?.user || meRes.value?.data?.user || meRes.value;
          if (!resolvedOrg && resolvedUser?.organization) {
            resolvedOrg = resolvedUser.organization;
          }
        }

        applyUserData(resolvedUser, resolvedOrg, resolvedProfile);
      } catch {
        /* fallback to session data */
      }
    };

    fetchDepartmentDetails();

    return () => { isMounted = false; };
  }, [user]);

  const maharashtraState = locationData.find(s => s.name === "Maharashtra");
  const districtsList = maharashtraState ? maharashtraState.districts : [];

  const handleDivisionsChange = (nextDivisions: string[]) => {
    const validDistricts = nextDivisions.flatMap(div => DIVISION_TO_DISTRICTS[div] || []);
    const nextDistricts = form.districts.filter(d => validDistricts.includes(d));
    const validCities = districtsList.filter(d => nextDistricts.includes(d.name)).flatMap(d => d.cities || []);
    const nextCities = form.cities.filter(c => validCities.includes(c));
    const validTalukas = districtsList.filter(d => nextDistricts.includes(d.name)).flatMap(d => d.talukas || []);
    const nextTalukas = form.talukas.filter(t => validTalukas.includes(t));

    setForm(prev => ({
      ...prev,
      divisions: nextDivisions,
      districts: nextDistricts,
      cities: nextCities,
      talukas: nextTalukas
    }));

    if (errors.divisions && nextDivisions.length > 0) {
      setErrors(prev => ({ ...prev, divisions: "" }));
    }
    if (errors.districts && nextDistricts.length > 0) {
      setErrors(prev => ({ ...prev, districts: "" }));
    }
  };

  const handleDistrictsChange = (nextDistricts: string[]) => {
    nextDistricts = nextDistricts.slice(-1);
    const validCities = districtsList.filter(d => nextDistricts.includes(d.name)).flatMap(d => d.cities || []);
    const nextCities = form.cities.filter(c => validCities.includes(c));
    const validTalukas = districtsList.filter(d => nextDistricts.includes(d.name)).flatMap(d => d.talukas || []);
    const nextTalukas = form.talukas.filter(t => validTalukas.includes(t));

    setForm(prev => ({
      ...prev,
      districts: nextDistricts,
      cities: nextCities,
      talukas: nextTalukas
    }));

    if (errors.districts && nextDistricts.length > 0) {
      setErrors(prev => ({ ...prev, districts: "" }));
    }
  };

  const set = (field: keyof PitchForm, value: string | boolean | File[] | File | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateForm = (): boolean => {
    const e: FormErrors = {};
    if (!form.officialName.trim()) e.officialName = "Official name is required";
    if (!form.designation.trim()) e.designation = "Designation is required";
    if (!form.department.trim()) e.department = "Department is required";
    if (!form.officeName.trim()) e.officeName = "Office name is required";
    if (!form.serviceClass) e.serviceClass = "Service class is required";
    if (!form.mobile.trim() || !/^[6-9]\d{9}$/.test(form.mobile)) e.mobile = "Valid 10-digit mobile is required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email is required";
    if (form.divisions.length === 0) e.divisions = "At least one division must be selected";
    if (form.districts.length !== 1) e.districts = "Select exactly one district";
    if (!form.exactLocation.trim()) e.exactLocation = "Exact location is required";
    if (!form.csrRequirement.trim()) e.csrRequirement = "CSR requirement is required";
    const words = form.csrRequirement.trim().split(/\s+/).filter(Boolean).length;
    if (words > 200) e.csrRequirement = "Requirement must not exceed 200 words";
    if (!form.estimatedCost.trim() || Number.isNaN(parseFloat(form.estimatedCost))) e.estimatedCost = "Valid estimated cost is required";
    if (!form.govtFundDeclaration) e.govtFundDeclaration = "You must declare government fund status";
    if (form.serviceClass === "BELOW_CLASS_2" && !form.hodDocument) {
      e.hodDocument = "HOD certification document is required for officials below Class-2";
    }
    if (form.geoTaggedPhotos.length < 2) e.geoTaggedPhotos = "At least 2 geo-tagged site photos are required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePhotoUpload = (ev: React.ChangeEvent<HTMLInputElement>) => {
    if (ev.target.files) {
      const list = Array.from(ev.target.files);
      set("geoTaggedPhotos", [...form.geoTaggedPhotos, ...list]);
    }
  };

  const removePhoto = (index: number) => {
    set("geoTaggedPhotos", form.geoTaggedPhotos.filter((_, i) => i !== index));
  };

  const handleHodDocumentUpload = (ev: React.ChangeEvent<HTMLInputElement>) => {
    if (ev.target.files && ev.target.files[0]) set("hodDocument", ev.target.files[0]);
  };

  const handleSupportingDocumentsUpload = (ev: React.ChangeEvent<HTMLInputElement>) => {
    if (ev.target.files) {
      const files = Array.from(ev.target.files);
      setForm((prev) => ({
        ...prev,
        supportingDocuments: [...prev.supportingDocuments, ...files],
      }));
    }
  };

  const removeSupportingDocument = (index: number) => {
    setForm((prev) => ({
      ...prev,
      supportingDocuments: prev.supportingDocuments.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const photoUrls: string[] = [];
      for (const photo of form.geoTaggedPhotos) photoUrls.push(await uploadPortalFile(photo));
      let hodCertificationDocument = "";
      if (form.hodDocument) hodCertificationDocument = await uploadPortalFile(form.hodDocument);

      const supportingDocumentUrls: string[] = [];
      for (const doc of form.supportingDocuments) {
        supportingDocumentUrls.push(await uploadPortalFile(doc));
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
          divisions: form.divisions,
          districts: form.districts,
          cities: form.cities,
          talukas: form.talukas,
          exactLocation: form.exactLocation,
          csrRequirement: form.csrRequirement,
          estimatedCost: parseFloat(form.estimatedCost),
          govtFundDeclaration: form.govtFundDeclaration,
          certificationType: form.certificationType,
          hodCertificationDocument,
          supportingDocuments: supportingDocumentUrls,
          geoTaggedPhotos: photoUrls,
        }),
      });

      const data = response?.data || response;
      setReferenceId(data?.pitchReferenceId || data?.trackingId || data?.id || `GP-MH-${new Date().getFullYear()}-PENDING`);
      setSubmitted(true);
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Failed to submit government pitch" });
    } finally {
      setLoading(false);
    }
  };

  const wordCount = form.csrRequirement.trim().split(/\s+/).filter(Boolean).length;

  if (isRM) {
    return (
      <GovPortalLayout userRole="RELATIONSHIP_MANAGER">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-600"><ShieldCheck size={32} /></div>
          <h2 className="text-2xl font-bold text-slate-900">Access Restricted</h2>
          <p className="mt-2 text-sm text-slate-600">Relationship Managers review assigned pitches and cannot submit government pitches.</p>
          <div className="mt-6 flex justify-center gap-3"><GovButton variant="primary" onClick={() => router.push("/pitches")}>Go to Pitches Register</GovButton><GovButton variant="secondary" onClick={() => router.push("/dashboard")}>Dashboard</GovButton></div>
        </div>
      </GovPortalLayout>
    );
  }

  if (submitted) {
    return (
      <GovPortalLayout>
        <div className="mx-auto max-w-3xl px-4 py-12">
          <div className="rounded-3xl border border-emerald-200 bg-white p-8 md:p-12 text-center shadow-xl flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-sm">
              <CheckCircle size={36} />
            </div>
            <div>
              <span className="inline-block text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                Proposal Submitted Successfully
              </span>
              <h2 className="text-2xl font-bold text-slate-900">Government Pitch Registered</h2>
              <p className="text-xs text-slate-500 mt-1">Tracking Reference ID</p>
              <div className="mt-2 text-xl font-mono font-extrabold text-blue-900 bg-blue-50 px-4 py-2 rounded-xl inline-block border border-blue-200">
                {referenceId}
              </div>
            </div>
            <p className="text-sm text-slate-600 max-w-lg leading-relaxed">
              Your development proposal has been queued for technical and administrative assessment by the Maharashtra State CSR Cell.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-4 border-t border-slate-100 w-full">
              <GovButton variant="secondary" onClick={() => router.push("/pitches")}>
                View My Pitches
              </GovButton>
              <GovButton variant="primary" onClick={() => { setSubmitted(false); setForm((prev) => ({ ...prev, csrRequirement: "", exactLocation: "" })); }}>
                Submit Another Pitch
              </GovButton>
            </div>
          </div>
        </div>
      </GovPortalLayout>
    );
  }

  if (onboardingGuardModal === "ONBOARDING_INCOMPLETE") {
    return (
      <GovPortalLayout>
        <Modal
          isOpen={true}
          onClose={() => router.push("/pitches")}
          title="Onboarding Needs to Be Completed"
        >
          <div className="flex flex-col gap-4 p-2">
            <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
              <AlertCircle size={24} className="shrink-0" />
              <p className="text-xs font-semibold">
                Your government department onboarding needs to be completed before submitting a government pitch. Please complete your department onboarding first.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <GovButton variant="secondary" onClick={() => router.push("/pitches")}>
                Go Back
              </GovButton>
              <GovButton variant="primary" onClick={() => router.push("/organization/onboarding/government")}>
                Complete Onboarding
              </GovButton>
            </div>
          </div>
        </Modal>
      </GovPortalLayout>
    );
  }

  if (onboardingGuardModal === "APPROVAL_PENDING") {
    return (
      <GovPortalLayout>
        <Modal
          isOpen={true}
          onClose={() => router.push("/marketplace")}
          title="Approval Pending"
        >
          <div className="flex flex-col gap-4 p-2">
            <div className="flex items-center gap-3 text-blue-900 bg-blue-50 p-3 rounded-xl border border-blue-200">
              <Clock size={24} className="shrink-0 text-blue-700" />
              <p className="text-xs font-semibold">
                Your government department onboarding approval is pending from Superadmin. Till then explore the marketplace.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <GovButton variant="secondary" onClick={() => router.push("/pitches")}>
                Go Back
              </GovButton>
              <GovButton variant="primary" onClick={() => router.push("/marketplace")}>
                Explore Marketplace
              </GovButton>
            </div>
          </div>
        </Modal>
      </GovPortalLayout>
    );
  }

  return (
    <GovPortalLayout>
      <div className="mx-auto max-w-7xl flex flex-col gap-6 px-4 py-6 md:px-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-950 transition-colors bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-xs"
          >
            <ArrowLeft size={16} /> Back to Pitches
          </button>

          <div className="flex items-center gap-2 text-[11px] font-bold text-blue-900 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200/60">
            <Sparkles size={14} /> Department Proposal Portal
          </div>
        </div>

        <GovPageHeader
          title="Submit Government Development Pitch"
          breadcrumb="Home / Pitches / Create New Proposal"
          description="Draft and submit a structured project proposal for State Secretariat review and corporate CSR partnership matching."
        />

        {errors.submit && <GovAlert variant="danger">{errors.submit}</GovAlert>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* SECTION 1: OFFICIAL IDENTITY */}
          <GovCard className="rounded-3xl border border-slate-200/80 bg-white shadow-sm relative overflow-visible z-30">
            <GovCardHeader className="bg-slate-50/60 border-b border-slate-100 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-900 text-white flex items-center justify-center font-extrabold text-sm shadow-md">
                  01
                </div>
                <div>
                  <GovCardTitle className="text-base font-bold text-slate-900">Official & Departmental Identity</GovCardTitle>
                  <p className="text-xs text-slate-500 font-normal">Prepopulated official credentials from verified department profile</p>
                </div>
              </div>
            </GovCardHeader>
            <GovCardBody className="p-6 md:p-8 overflow-visible">
              <div className="gov-form-grid">
                <div className="gov-field">
                  <GovInput
                    label="Official Name"
                    required
                    value={form.officialName}
                    error={errors.officialName}
                    onChange={(e) => set("officialName", e.target.value)}
                    placeholder="Full Official Name"
                  />
                </div>

                <div className="gov-field">
                  <GovInput
                    label="Designation"
                    required
                    value={form.designation}
                    error={errors.designation}
                    onChange={(e) => set("designation", e.target.value)}
                    placeholder="e.g. Executive Engineer"
                  />
                </div>

                <div className="gov-field">
                  <GovInput
                    label="Department"
                    required
                    value={form.department}
                    error={errors.department}
                    onChange={(e) => set("department", e.target.value)}
                    placeholder="Government Department"
                  />
                </div>

                <div className="gov-field">
                  <GovInput
                    label="Office / Institution Name"
                    required
                    value={form.officeName}
                    error={errors.officeName}
                    onChange={(e) => set("officeName", e.target.value)}
                    placeholder="Office / Division"
                  />
                </div>

                <div className="gov-field">
                  <GovInput
                    label="Official Mobile"
                    required
                    format="phone"
                    value={form.mobile}
                    error={errors.mobile}
                    onChange={(e) => set("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit mobile number"
                  />
                </div>

                <div className="gov-field">
                  <GovInput
                    label="Official Email"
                    type="email"
                    required
                    format="email"
                    value={form.email}
                    error={errors.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="official@maharashtra.gov.in"
                  />
                </div>

                <div className="gov-field full">
                  <GovSelect
                    label="Service Class Cadre"
                    required
                    value={form.serviceClass}
                    error={errors.serviceClass}
                    onChange={(e) => {
                      const sc = e.target.value;
                      set("serviceClass", sc);
                      if (sc === "CLASS_1" || sc === "CLASS_2") set("certificationType", "SELF");
                      else if (sc === "BELOW_CLASS_2") set("certificationType", "HOD");
                      else set("certificationType", "");
                    }}
                  >
                    {SERVICE_CLASSES.map((sc) => (
                      <option key={sc.value} value={sc.value}>{sc.label}</option>
                    ))}
                  </GovSelect>
                </div>
              </div>
            </GovCardBody>
          </GovCard>

          {/* SECTION 2: TARGET GEOGRAPHY */}
          <GovCard className="rounded-3xl border border-slate-200/80 bg-white shadow-sm relative overflow-visible z-20">
            <GovCardHeader className="bg-slate-50/60 border-b border-slate-100 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-900 text-white flex items-center justify-center font-extrabold text-sm shadow-md">
                  02
                </div>
                <div>
                  <GovCardTitle className="text-base font-bold text-slate-900">Target Region & Geography Location</GovCardTitle>
                  <p className="text-xs text-slate-500 font-normal">Cascading regional filters for target project deployment</p>
                </div>
              </div>
            </GovCardHeader>
            <GovCardBody className="p-6 md:p-8 overflow-visible">
              {errors.divisions && <GovAlert variant="danger" className="mb-4">{errors.divisions}</GovAlert>}
              {errors.districts && <GovAlert variant="danger" className="mb-4">{errors.districts}</GovAlert>}

              <div className="gov-form-grid">
                <div className="gov-field">
                  <MultiSelectField
                    label="Preferred Division(s)"
                    required
                    values={form.divisions}
                    options={Object.keys(DIVISION_TO_DISTRICTS)}
                    onChange={handleDivisionsChange}
                    placeholder="Select administrative division(s)..."
                  />
                </div>

                <div className="gov-field">
                  <MultiSelectField
                    label="Project District"
                    required
                    values={form.districts}
                    options={form.divisions.flatMap(div => DIVISION_TO_DISTRICTS[div] || [])}
                    onChange={handleDistrictsChange}
                    placeholder={form.divisions.length === 0 ? "Select division first..." : "Select one target district..."}
                  />
                </div>

                <div className="gov-field">
                  <MultiSelectField
                    label="Preferred City / Cities (Optional)"
                    values={form.cities}
                    options={
                      districtsList
                        .filter(d => form.districts.includes(d.name))
                        .flatMap(d => d.cities || [])
                    }
                    onChange={(values) => setForm(prev => ({ ...prev, cities: values }))}
                    placeholder={form.districts.length === 0 ? "Select district first..." : "Select city/cities..."}
                  />
                </div>

                <div className="gov-field">
                  <MultiSelectField
                    label="Preferred Taluka(s) (Optional)"
                    values={form.talukas}
                    options={
                      districtsList
                        .filter(d => form.districts.includes(d.name))
                        .flatMap(d => d.talukas || [])
                    }
                    onChange={(values) => setForm(prev => ({ ...prev, talukas: values }))}
                    placeholder={form.districts.length === 0 ? "Select district first..." : "Select taluka(s)..."}
                  />
                </div>

                <div className="gov-field full">
                  <GovTextarea
                    label="Exact Site / Location Landmark Details"
                    required
                    value={form.exactLocation}
                    error={errors.exactLocation}
                    onChange={(e) => set("exactLocation", e.target.value)}
                    placeholder="Specify village name, landmark, survey number, Gram Panchayat, or building address..."
                    rows={2}
                  />
                </div>
              </div>
            </GovCardBody>
          </GovCard>

          {/* SECTION 3: REQUIREMENT & OUTLAY */}
          <GovCard className="rounded-3xl border border-slate-200/80 bg-white shadow-sm relative overflow-visible z-10">
            <GovCardHeader className="bg-slate-50/60 border-b border-slate-100 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-950 text-white flex items-center justify-center font-extrabold text-sm shadow-md">
                  03
                </div>
                <div>
                  <GovCardTitle className="text-base font-bold text-slate-900">CSR Requirement Scope & Estimated Outlay</GovCardTitle>
                  <p className="text-xs text-slate-500 font-normal">Define project scope, estimated cost, and state funding status</p>
                </div>
              </div>
            </GovCardHeader>
            <GovCardBody className="p-6 md:p-8 flex flex-col gap-5 overflow-visible">
              <div>
                <GovTextarea
                  label="CSR Project Requirement Description (Max 200 words)"
                  required
                  value={form.csrRequirement}
                  error={errors.csrRequirement}
                  onChange={(e) => set("csrRequirement", e.target.value)}
                  rows={5}
                  placeholder="Describe the development need, objective, target beneficiaries, and deliverables..."
                />
                <div className="flex items-center justify-between mt-1.5">
                  <p className={`text-xs font-bold ${wordCount > 200 ? "text-rose-600" : "text-slate-500"}`}>
                    {wordCount} / 200 words
                  </p>
                  {wordCount > 200 && <span className="text-xs text-rose-600 font-semibold">Exceeds 200-word limit</span>}
                </div>
              </div>

              <div className="gov-form-grid">
                <div className="gov-field">
                  <GovInput
                    label="Estimated Cost Outlay (₹)"
                    required
                    type="number"
                    value={form.estimatedCost}
                    error={errors.estimatedCost}
                    onChange={(e) => set("estimatedCost", e.target.value)}
                    placeholder="e.g. 5000000"
                  />
                </div>

                <div className="gov-field flex flex-col justify-end">
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-amber-200/80 bg-amber-50/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.govtFundDeclaration}
                      onChange={(e) => set("govtFundDeclaration", e.target.checked)}
                      className="mt-0.5 rounded border-amber-300 text-blue-900 focus:ring-blue-800 accent-blue-900"
                    />
                    <span className="text-xs font-bold text-amber-950 leading-relaxed">
                      I hereby declare that no government fund is currently available or sanctioned for this specific requirement.
                    </span>
                  </label>
                  {errors.govtFundDeclaration && (
                    <p className="text-xs text-rose-600 font-bold mt-1">{errors.govtFundDeclaration}</p>
                  )}
                </div>
              </div>
            </GovCardBody>
          </GovCard>

          {/* SECTION 4: ATTACHMENTS & VERIFICATION */}
          <GovCard className="rounded-3xl border border-slate-200/80 bg-white shadow-sm">
            <GovCardHeader className="bg-slate-50/60 border-b border-slate-100 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-900 text-white flex items-center justify-center font-extrabold text-sm shadow-md">
                  04
                </div>
                <div>
                  <GovCardTitle className="text-base font-bold text-slate-900">Technical Specifications & Site Photos</GovCardTitle>
                  <p className="text-xs text-slate-500 font-normal">Attach site photos (min 2) and technical specifications/DPR</p>
                </div>
              </div>
            </GovCardHeader>
            <GovCardBody className="p-6 md:p-8 flex flex-col gap-6">
              {/* Geo-tagged Site Photos */}
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <Camera size={16} className="text-blue-900" /> Geo-tagged Site Photos (Minimum 2 Photos Required) *
                </label>
                <div className="border-2 border-dashed border-blue-200/80 bg-blue-50/20 hover:bg-blue-50/50 transition-all rounded-2xl p-6 text-center cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                      <Camera size={20} />
                    </div>
                    <p className="text-xs font-bold text-slate-800">Click to upload geo-tagged site images</p>
                    <p className="text-[11px] text-slate-500">JPG, PNG, WEBP (Min 2 required for field validation)</p>
                  </div>
                </div>
                {errors.geoTaggedPhotos && <p className="text-xs font-bold text-rose-600 mt-1.5">{errors.geoTaggedPhotos}</p>}

                {form.geoTaggedPhotos.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {form.geoTaggedPhotos.map((photo, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold">
                        <span className="truncate text-slate-800 font-bold">{photo.name}</span>
                        <button type="button" onClick={() => removePhoto(i)} className="text-rose-600 hover:text-rose-800 font-bold text-xs shrink-0 ml-2">
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Supporting Documents */}
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <Paperclip size={16} className="text-blue-900" /> Supporting Documents / DPR / Blueprint (Optional)
                </label>
                <div className="border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 transition-all rounded-2xl p-5 text-center cursor-pointer relative">
                  <input
                    type="file"
                    accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*"
                    multiple
                    onChange={handleSupportingDocumentsUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center gap-1.5">
                    <Paperclip size={20} className="text-slate-400" />
                    <p className="text-xs font-bold text-slate-700">Attach cost estimates, layout plans, or approval letters</p>
                    <p className="text-[11px] text-slate-400">PDF, DOCX, XLSX, images</p>
                  </div>
                </div>

                {form.supportingDocuments.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2">
                    {form.supportingDocuments.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold">
                        <div className="flex items-center gap-2 truncate">
                          <FileText size={16} className="text-blue-900 shrink-0" />
                          <span className="truncate text-slate-900 font-bold">{doc.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({(doc.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button type="button" onClick={() => removeSupportingDocument(i)} className="text-rose-600 hover:text-rose-800 font-bold text-xs shrink-0 ml-2">
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* HOD Document Upload */}
              {(form.serviceClass === "BELOW_CLASS_2" || form.certificationType === "HOD") && (
                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50">
                  <label className="text-xs font-bold text-amber-950 block mb-1.5">HOD Certification Document Upload *</label>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={handleHodDocumentUpload}
                    className="block text-xs text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-950 file:text-white hover:file:bg-amber-900 cursor-pointer"
                  />
                  {errors.hodDocument && <p className="text-xs font-bold text-rose-600 mt-1.5">{errors.hodDocument}</p>}
                  {form.hodDocument && <p className="text-xs font-bold text-emerald-700 mt-1.5">Attached: {form.hodDocument.name}</p>}
                </div>
              )}
            </GovCardBody>
          </GovCard>

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              Cancel
            </button>
            <GovButton type="submit" variant="primary" loading={loading} loadingText="Submitting Pitch..." className="px-7 py-3 rounded-xl font-bold shadow-md">
              Submit Pitch to State Secretariat
            </GovButton>
          </div>
        </form>
      </div>
    </GovPortalLayout>
  );
}

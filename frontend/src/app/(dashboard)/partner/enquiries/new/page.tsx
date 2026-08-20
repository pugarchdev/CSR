"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { useQueryClient } from "@tanstack/react-query";
import {
  Handshake, CheckCircle, Copy, ArrowLeft, ChevronDown, X,
  Search, ShieldCheck, CheckCircle2, Edit3, Paperclip, FileText, AlertCircle, Clock
} from "lucide-react";
import { locationData } from "@/lib/locationData";
import { useAuthStore } from "@/store/authStore";

const SECTORS = [
  { value: "", label: "Select Sector" },
  { value: "EDUCATION", label: "Education & Digital Literacy" },
  { value: "HEALTH", label: "Health, Telemedicine & Sanitation" },
  { value: "WATER", label: "Water Security & Irrigation" },
  { value: "RURAL_DEVELOPMENT", label: "Rural Infrastructure & Development" },
  { value: "ENVIRONMENT", label: "Environment, Solar & Climate Action" },
  { value: "WOMEN_EMPOWERMENT", label: "Women Empowerment & Livelihood" },
  { value: "SKILL_DEVELOPMENT", label: "Skill Development & Youth Employability" },
  { value: "AGRICULTURE", label: "Agriculture & Agritech Support" },
  { value: "SPORTS", label: "Youth Sports Infrastructure" },
  { value: "OTHER", label: "Other Focus Area" },
];

const DIVISION_TO_DISTRICTS: Record<string, string[]> = {
  Amravati: ["Akola", "Amravati", "Buldhana", "Washim", "Yavatmal"],
  Aurangabad: ["Aurangabad", "Beed", "Hingoli", "Jalna", "Latur", "Nanded", "Osmanabad", "Parbhani"],
  Konkan: ["Mumbai City", "Mumbai Suburban", "Palghar", "Raigad", "Ratnagiri", "Sindhudurg", "Thane"],
  Nagpur: ["Bhandara", "Chandrapur", "Gadchiroli", "Gondia", "Nagpur", "Wardha"],
  Nashik: ["Ahmednagar", "Dhule", "Jalgaon", "Nandurbar", "Nashik"],
  Pune: ["Kolhapur", "Pune", "Sangli", "Satara", "Solapur"],
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

interface EnquiryForm {
  companyName: string;
  mca21CIN: string;
  sector: string;
  customSector: string;
  indicativeBudget: string;
  preferredDivisions: string[];
  preferredDistricts: string[];
  preferredCities: string[];
  contactPersonName: string;
  mobile: string;
  email: string;
  proposedCSRWork: string;
  supportingDocuments: File[];
  departmentId: string;
  declarationAccepted: boolean;
}

interface FormErrors {
  [key: string]: string;
}

const matchSector = (rawSector: string): { sector: string; customSector: string } => {
  if (!rawSector) return { sector: "", customSector: "" };
  const sUpper = rawSector.toUpperCase().trim();
  const directMatch = SECTORS.find(s => s.value === sUpper);
  if (directMatch && directMatch.value) {
    return { sector: directMatch.value, customSector: "" };
  }
  if (sUpper.includes("EDU")) return { sector: "EDUCATION", customSector: "" };
  if (sUpper.includes("HEALTH") || sUpper.includes("MEDIC")) return { sector: "HEALTH", customSector: "" };
  if (sUpper.includes("WATER") || sUpper.includes("IRRIG")) return { sector: "WATER", customSector: "" };
  if (sUpper.includes("RURAL") || sUpper.includes("VILLAGE")) return { sector: "RURAL_DEVELOPMENT", customSector: "" };
  if (sUpper.includes("ENV") || sUpper.includes("SOLAR") || sUpper.includes("CLIMATE")) return { sector: "ENVIRONMENT", customSector: "" };
  if (sUpper.includes("WOMEN") || sUpper.includes("LIVELIHOOD")) return { sector: "WOMEN_EMPOWERMENT", customSector: "" };
  if (sUpper.includes("SKILL") || sUpper.includes("EMPLOY")) return { sector: "SKILL_DEVELOPMENT", customSector: "" };
  if (sUpper.includes("AGRI")) return { sector: "AGRICULTURE", customSector: "" };
  if (sUpper.includes("SPORT")) return { sector: "SPORTS", customSector: "" };
  return { sector: "OTHER", customSector: rawSector };
};

const findDivisionForDistrict = (dist: string): string[] => {
  if (!dist) return [];
  for (const [div, districts] of Object.entries(DIVISION_TO_DISTRICTS)) {
    if (districts.some(d => d.toLowerCase() === dist.toLowerCase())) {
      return [div];
    }
  }
  return [];
};

function CreateCorporateEnquiryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramProjectTitle = searchParams.get("projectTitle") || "";
  const paramProjectId = searchParams.get("projectId") || "";
  const paramDistrict = searchParams.get("district") || "";
  const paramBudget = searchParams.get("budget") || "";
  const paramSector = searchParams.get("sector") || "";
  const paramDeptName = searchParams.get("departmentName") || "";

  const queryClient = useQueryClient();
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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkOnboardingAndApproval = async () => {
      let org = user?.organization;

      if (user?.organizationId) {
        try {
          const res = await apiFetch<any>("/onboarding/company");
          org = res?.organization || res?.data?.organization || res || org;
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

  const [form, setForm] = useState<EnquiryForm>({
    companyName: "",
    mca21CIN: "",
    sector: "",
    customSector: "",
    indicativeBudget: "",
    preferredDivisions: [],
    preferredDistricts: [],
    preferredCities: [],
    contactPersonName: "",
    mobile: "",
    email: "",
    proposedCSRWork: "",
    supportingDocuments: [],
    departmentId: "",
    declarationAccepted: false,
  });
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);

  const [errors, setErrors] = useState<FormErrors>({});

  // Auto-fetch and prepopulate company credentials and contact details from user session and verified onboarding profile
  useEffect(() => {
    let isMounted = true;

    const applyUserData = (u: any) => {
      if (!u) return;
      const org = u.organization || u.company || {};
      const profile = u.csrCompanyProfile || org.csrCompanyProfile || {};

      const companyName = org.name || org.legalName || org.displayName || u.companyName || u.legalName || "";
      const cin = org.cin || org.companyCin || org.cinNumber || profile.companyCin || profile.cinNumber || u.cin || u.mca21CIN || u.mca21Cin || u.registrationNumber || "";
      const contactPersonName = profile.nodalPersonName || u.contactPersonName || u.contactPerson || org.contactPerson || u.name || (u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : "");
      const email = u.email || org.officialEmail || profile.nodalPersonEmail || "";
      const mobile = u.mobile || u.phone || org.officialPhone || profile.nodalPersonMobile || "";

      setForm((prev) => ({
        ...prev,
        companyName: companyName || prev.companyName,
        mca21CIN: cin || prev.mca21CIN,
        contactPersonName: contactPersonName || prev.contactPersonName,
        email: email || prev.email,
        mobile: mobile || prev.mobile,
      }));
    };

    // 1. Immediate sync prepopulate from localStorage session
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("user");
        if (raw) {
          applyUserData(JSON.parse(raw));
        }
      } catch {
        /* ignore */
      }
    }

    // 2. Async fetch verified onboarding profile from backend to ensure CIN & verified contact credentials are autocompleted
    const loadCompanyProfile = async () => {
      try {
        const res = await apiFetch<any>("/onboarding/company");
        if (!isMounted) return;
        const org = res?.organization || res?.data?.organization || res;
        const profile = res?.profile || res?.data?.profile || org?.csrCompanyProfile;

        if (org || profile) {
          const companyName = org?.name || org?.legalName || org?.displayName || "";
          const cin = org?.cin || org?.companyCin || profile?.companyCin || profile?.cinNumber || "";
          const contactPersonName = profile?.nodalPersonName || org?.contactPerson || "";
          const email = org?.officialEmail || profile?.nodalPersonEmail || "";
          const mobile = org?.officialPhone || profile?.nodalPersonMobile || "";

          setForm((prev) => ({
            ...prev,
            companyName: companyName || prev.companyName,
            mca21CIN: cin || prev.mca21CIN,
            contactPersonName: contactPersonName || prev.contactPersonName,
            email: email || prev.email,
            mobile: mobile || prev.mobile,
          }));

          // Sync back to local user store for consistency
          try {
            const rawUser = localStorage.getItem("user");
            if (rawUser) {
              const u = JSON.parse(rawUser);
              u.organization = { ...u.organization, ...org, cin: cin || u.organization?.cin };
              if (cin) u.cin = cin;
              localStorage.setItem("user", JSON.stringify(u));
            }
          } catch {}
        }
      } catch {
        // Fallback endpoint check
        try {
          const org = await apiFetch<any>("/onboarding/profile");
          if (!isMounted || !org) return;
          const companyName = org.name || org.legalName || org.displayName || "";
          const cin = org.cin || org.companyCin || org.csrCompanyProfile?.companyCin || "";
          const contactPersonName = org.contactPerson || org.csrCompanyProfile?.nodalPersonName || "";
          const email = org.officialEmail || org.csrCompanyProfile?.nodalPersonEmail || "";
          const mobile = org.officialPhone || org.csrCompanyProfile?.nodalPersonMobile || "";

          setForm((prev) => ({
            ...prev,
            companyName: companyName || prev.companyName,
            mca21CIN: cin || prev.mca21CIN,
            contactPersonName: contactPersonName || prev.contactPersonName,
            email: email || prev.email,
            mobile: mobile || prev.mobile,
          }));
        } catch {
          /* ignore */
        }
      }
    };

    loadCompanyProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const maharashtraState = locationData.find(s => s.name === "Maharashtra");
  const districtsList = maharashtraState ? maharashtraState.districts : [];

  const handleDivisionsChange = (nextDivisions: string[]) => {
    const validDistricts = nextDivisions.flatMap(div => DIVISION_TO_DISTRICTS[div] || []);
    const nextDistricts = form.preferredDistricts.filter(d => validDistricts.includes(d));

    const validCities = districtsList.filter(d => nextDistricts.includes(d.name)).flatMap(d => d.cities || []);
    const nextCities = form.preferredCities.filter(c => validCities.includes(c));

    setForm(prev => ({
      ...prev,
      preferredDivisions: nextDivisions,
      preferredDistricts: nextDistricts,
      preferredCities: nextCities,
    }));

    if (errors.preferredDivisions && nextDivisions.length > 0) {
      setErrors(prev => ({ ...prev, preferredDivisions: "" }));
    }
    if (errors.preferredDistricts && nextDistricts.length > 0) {
      setErrors(prev => ({ ...prev, preferredDistricts: "" }));
    }
  };

  const handleDistrictChange = (district: string) => {
    const nextDistricts = district ? [district] : [];
    const validCities = districtsList.filter(d => nextDistricts.includes(d.name)).flatMap(d => d.cities || []);
    const nextCities = form.preferredCities.filter(c => validCities.includes(c));

    setForm(prev => ({
      ...prev,
      preferredDistricts: nextDistricts,
      preferredCities: nextCities,
    }));

    if (errors.preferredDistricts && nextDistricts.length > 0) {
      setErrors(prev => ({ ...prev, preferredDistricts: "" }));
    }
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

  // Auto-fill from marketplace project search parameters if navigated from CSR Marketplace
  useEffect(() => {
    if (!paramProjectTitle && !paramProjectId && !paramDistrict && !paramBudget && !paramSector) return;

    setForm((prev) => {
      const { sector, customSector } = matchSector(paramSector);
      const divisions = paramDistrict ? findDivisionForDistrict(paramDistrict) : prev.preferredDivisions;
      const districts = paramDistrict ? [paramDistrict] : prev.preferredDistricts;
      const budget = paramBudget ? paramBudget : prev.indicativeBudget;

      const proposedWork = paramProjectTitle
        ? `We express our CSR funding and partnership interest for "${paramProjectTitle}"${paramProjectId ? ` (Ref: ${paramProjectId})` : ""}. Our organization is keen to support this initiative in ${paramDistrict || "Maharashtra"} in alignment with State development priorities.`
        : prev.proposedCSRWork;

      return {
        ...prev,
        sector: sector || prev.sector,
        customSector: customSector || prev.customSector,
        preferredDivisions: divisions.length > 0 ? divisions : prev.preferredDivisions,
        preferredDistricts: districts.length > 0 ? districts : prev.preferredDistricts,
        indicativeBudget: budget || prev.indicativeBudget,
        proposedCSRWork: proposedWork || prev.proposedCSRWork
      };
    });
  }, [paramProjectTitle, paramProjectId, paramDistrict, paramBudget, paramSector]);

  useEffect(() => {
    apiFetch<any>("/corporate-enquiries/departments/active")
      .then((response) => {
        const depts: Array<{ id: string; name: string }> = response?.data || [];
        setDepartments(depts);
        if (paramDeptName && depts.length > 0) {
          const matched = depts.find(d => 
            d.name.toLowerCase().includes(paramDeptName.toLowerCase()) || 
            paramDeptName.toLowerCase().includes(d.name.toLowerCase())
          );
          if (matched) {
            setForm(prev => prev.departmentId ? prev : { ...prev, departmentId: matched.id });
          }
        }
      })
      .catch(() => setDepartments([]));
  }, [paramDeptName]);

  const validateForm = (): boolean => {
    const errs: FormErrors = {};
    if (!form.companyName.trim()) errs.companyName = "Company name is required";
    // if (!/^[A-Z0-9]{21}$/i.test(form.mca21CIN.trim())) errs.mca21CIN = "Valid 21-character CIN is required";
    if (!form.sector) errs.sector = "Primary sector is required";
    if (form.sector === "OTHER" && !form.customSector.trim()) {
      errs.customSector = "Please specify your custom focus sector";
    }
    if (form.preferredDivisions.length === 0) errs.preferredDivisions = "At least one division must be selected";
    if (form.preferredDistricts.length !== 1) errs.preferredDistricts = "Select exactly one district";
    if (!form.departmentId) errs.departmentId = "Government department is required";
    if (!form.contactPersonName.trim()) errs.contactPersonName = "Contact person name is required";
    if (!form.mobile.trim() || !/^[6-9]\d{9}$/.test(form.mobile)) errs.mobile = "Valid 10-digit mobile number is required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Valid email is required";
    if (!form.proposedCSRWork.trim()) errs.proposedCSRWork = "Proposed CSR work description is required";
    if (!form.declarationAccepted) errs.declarationAccepted = "You must accept the submission declaration";

    const words = form.proposedCSRWork.trim().split(/\s+/).filter(Boolean).length;
    if (words > 200) errs.proposedCSRWork = "Description must not exceed 200 words";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    const finalSector = form.sector === "OTHER"
      ? (form.customSector.trim() ? `Other: ${form.customSector.trim()}` : "OTHER")
      : form.sector;

    try {
      const documentUrls: string[] = [];
      for (const doc of form.supportingDocuments) {
        documentUrls.push(await uploadPortalFile(doc));
      }

 const response = await apiFetch<any>("/corporate-enquiries", {
        method: "POST",
        body: JSON.stringify({
          corporateName: form.companyName,             // CHANGED: Matches backend 'corporateName'
          cin: form.mca21CIN,                          // CHANGED: Matches backend 'cin'
          sector: finalSector,
          indicativeBudget: form.indicativeBudget ? parseFloat(form.indicativeBudget) : undefined,
          preferredDivisions: form.preferredDivisions,
          district: form.preferredDistricts[0],        // CHANGED: Backend expects a single string 'district', not an array
          preferredCities: form.preferredCities,
          contactPersonName: form.contactPersonName,
          mobile: form.mobile,
          contactEmail: form.email,                    // CHANGED: Matches backend 'contactEmail'
          proposedCSRWork: form.proposedCSRWork,
          documents: documentUrls,
          departmentId: form.departmentId,
          declarationAccepted: form.declarationAccepted,
        }),
      });

      const data = response?.data || response;
      setReferenceId(data?.trackingId || data?.id || `ENQ-${Date.now().toString().slice(-5)}`);
      setSubmitted(true);
      
      // Invalidate the cache so the list reflects the new enquiry immediately
      queryClient.invalidateQueries({ queryKey: ["corporate-enquiries"] });
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Failed to submit corporate enquiry" });
    } finally {
      setLoading(false);
    }
  };

  const copyRefId = () => {
    if (!referenceId) return;
    navigator.clipboard.writeText(referenceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = form.proposedCSRWork.trim().split(/\s+/).filter(Boolean).length;

  if (onboardingGuardModal === "ONBOARDING_INCOMPLETE") {
    return (
      <GovPortalLayout>
        <Modal
          isOpen={true}
          onClose={() => router.push("/enquiries")}
          title="Onboarding Needs to Be Completed"
        >
          <div className="flex flex-col gap-4 p-2">
            <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
              <AlertCircle size={24} className="shrink-0" />
              <p className="text-xs font-semibold">
                Your corporate/company onboarding needs to be completed before submitting a CSR enquiry. Please complete your onboarding first.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <GovButton variant="secondary" onClick={() => router.push("/enquiries")}>
                Go Back
              </GovButton>
              <GovButton variant="primary" onClick={() => router.push("/organization/onboarding/company")}>
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
                Your corporate onboarding approval is pending from Superadmin. Till then explore the marketplace.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <GovButton variant="secondary" onClick={() => router.push("/enquiries")}>
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

  if (isRM) {
    return (
      <GovPortalLayout userRole="RELATIONSHIP_MANAGER">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-600"><ShieldCheck size={32} /></div>
          <h2 className="text-2xl font-bold text-slate-900">Access Restricted</h2>
          <p className="mt-2 text-sm text-slate-600">Relationship Managers review assigned enquiries and cannot submit corporate enquiries.</p>
          <div className="mt-6 flex justify-center gap-3"><GovButton variant="primary" onClick={() => router.push("/enquiries")}>Go to Enquiries Register</GovButton><GovButton variant="secondary" onClick={() => router.push("/dashboard")}>Dashboard</GovButton></div>
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
                Enquiry Registered Successfully
              </span>
              <h2 className="text-2xl font-bold text-slate-900">Corporate Partnership Enquiry Received</h2>
              <p className="text-xs text-slate-500 mt-1">Tracking Reference ID</p>
              <div className="mt-2 text-xl font-mono font-extrabold text-blue-900 bg-blue-50 px-4 py-2 rounded-xl inline-flex items-center gap-2 border border-blue-200">
                <span>{referenceId}</span>
                <button onClick={copyRefId} className="text-xs text-blue-700 hover:text-blue-950 font-sans font-bold">
                  {copied ? "Copied!" : <Copy size={16} />}
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-600 max-w-lg leading-relaxed">
              Your partnership expression of interest has been logged. A dedicated Relationship Manager (RM) from Maharashtra State Secretariat will be assigned shortly.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-4 border-t border-slate-100 w-full">
              <GovButton variant="secondary" onClick={() => router.push("/enquiries")}>
                View My Enquiries
              </GovButton>
              <GovButton variant="primary" onClick={() => { setSubmitted(false); setForm((prev) => ({ ...prev, proposedCSRWork: "", supportingDocuments: [] })); }}>
                Submit Another Enquiry
              </GovButton>
            </div>
          </div>
        </div>
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
            <ArrowLeft size={16} /> Back to Enquiries
          </button>

          <div className="flex items-center gap-2 text-[11px] font-bold text-blue-900 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200/60">
            <Handshake size={14} /> Corporate Partnership Desk
          </div>
        </div>

        <GovPageHeader
          title="Submit Corporate CSR Partnership Enquiry"
          breadcrumb="Home / Enquiries / Partner with Maharashtra"
          description="Register your corporate CSR initiative, budget allocation, and target district preferences for direct Relationship Manager alignment."
        />

        {errors.submit && <GovAlert variant="danger">{errors.submit}</GovAlert>}

        {/* Marketplace Project Linked Notice */}
        {paramProjectTitle && (
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-blue-50/50 to-indigo-50/70 p-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-900 p-2 text-white shadow-xs shrink-0">
                <Handshake size={18} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-950">Marketplace Project Linked</span>
                  {paramProjectId && (
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 font-mono text-[11px] font-bold text-blue-900">
                      {paramProjectId}
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-800">{paramProjectTitle}</p>
                <p className="text-xs text-slate-600">
                  Project scope, target district, sector, and requested outlay have been pre-filled. Complete and submit this Corporate Enquiry to initiate Joint Secretary review and dedicated Relationship Manager assignment.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* SECTION 1: CORPORATE IDENTITY */}
          <GovCard className="rounded-3xl border border-slate-200/80 bg-white shadow-sm relative overflow-visible z-30">
            <GovCardHeader className="bg-slate-50/60 border-b border-slate-100 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-900 text-white flex items-center justify-center font-extrabold text-sm shadow-md">
                  01
                </div>
                <div>
                  <GovCardTitle className="text-base font-bold text-slate-900">Corporate & Sector Information</GovCardTitle>
                  <p className="text-xs text-slate-500 font-normal">Prepopulated corporate profile credentials and CSR sector focus</p>
                </div>
              </div>
            </GovCardHeader>
            <GovCardBody className="p-6 md:p-8 overflow-visible">
              <div className="gov-form-grid">
                <div className="gov-field">
                  <GovInput
                    label="Corporate / Company Legal Name"
                    required
                    value={form.companyName}
                    error={errors.companyName}
                    onChange={(e) => {
                      setForm({ ...form, companyName: e.target.value });
                      if (errors.companyName) setErrors({ ...errors, companyName: "" });
                    }}
                    placeholder="Official Company Name"
                  />
                </div>

                <div className="gov-field">
                  <GovInput
                    label="MCA21 CIN Number (Optional)"
                    value={form.mca21CIN}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase().slice(0, 21);
                      setForm({ ...form, mca21CIN: value });
                      if (errors.mca21CIN) setErrors({ ...errors, mca21CIN: "" });
                    }}
                    error={errors.mca21CIN}
                    placeholder="U12345MH2024PTC123456"
                  />
                </div>

                <div className="gov-field">
                  <GovSelect
                    label="Primary Sector of Interest"
                    required
                    value={form.sector}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm({ ...form, sector: val, customSector: val !== "OTHER" ? "" : form.customSector });
                      if (errors.sector) setErrors({ ...errors, sector: "" });
                      if (errors.customSector) setErrors({ ...errors, customSector: "" });
                    }}
                    error={errors.sector}
                  >
                    {SECTORS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </GovSelect>
                </div>

                <div className="gov-field">
                  <GovInput
                    label="Indicative CSR Outlay (₹ - Optional)"
                    type="number"
                    value={form.indicativeBudget}
                    onChange={(e) => setForm({ ...form, indicativeBudget: e.target.value })}
                    placeholder="e.g. 15000000"
                  />
                </div>

                {/* Conditional Custom Sector Input when OTHER is selected */}
                {form.sector === "OTHER" && (
                  <div className="gov-field full bg-blue-50/40 p-4 rounded-2xl border border-blue-200/80 animate-in fade-in duration-200">
                    <GovInput
                      label="Specify Custom Sector / Focus Area"
                      required
                      value={form.customSector}
                      error={errors.customSector}
                      onChange={(e) => {
                        setForm({ ...form, customSector: e.target.value });
                        if (errors.customSector) setErrors({ ...errors, customSector: "" });
                      }}
                      placeholder="e.g. Disaster Relief & Rehabilitation, Heritage Preservation, Animal Welfare..."
                    />
                    <p className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-1">
                      <Edit3 size={12} className="text-blue-700" /> Specify your exact specialized focus area for Secretariat RM routing.
                    </p>
                  </div>
                )}
              </div>
            </GovCardBody>
          </GovCard>

          {/* SECTION 2: PREFERRED GEOGRAPHY */}
          <GovCard className="rounded-3xl border border-slate-200/80 bg-white shadow-sm relative overflow-visible z-20">
            <GovCardHeader className="bg-slate-50/60 border-b border-slate-100 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-900 text-white flex items-center justify-center font-extrabold text-sm shadow-md">
                  02
                </div>
                <div>
                  <GovCardTitle className="text-base font-bold text-slate-900">Preferred Target Geography</GovCardTitle>
                  <p className="text-xs text-slate-500 font-normal">Cascading regional filters for target project matching</p>
                </div>
              </div>
            </GovCardHeader>
            <GovCardBody className="p-6 md:p-8 overflow-visible">
              {errors.preferredDivisions && <GovAlert variant="danger" className="mb-4">{errors.preferredDivisions}</GovAlert>}

              <div className="gov-form-grid">
                <div className="gov-field">
                  <MultiSelectField
                    label="Preferred Division(s)"
                    required
                    values={form.preferredDivisions}
                    options={Object.keys(DIVISION_TO_DISTRICTS)}
                    onChange={handleDivisionsChange}
                    placeholder="Select division(s)..."
                  />
                </div>

                <div className="gov-field">
                  <GovSelect
                    label="Project District"
                    required
                    value={form.preferredDistricts[0] || ""}
                    error={errors.preferredDistricts}
                    disabled={form.preferredDivisions.length === 0}
                    onChange={(event) => handleDistrictChange(event.target.value)}
                  >
                    <option value="">
                      {form.preferredDivisions.length === 0 ? "Select division first" : "Select one district"}
                    </option>
                    {Array.from(new Set(form.preferredDivisions.flatMap(div => DIVISION_TO_DISTRICTS[div] || [])))
                      .sort()
                      .map((district) => <option key={district} value={district}>{district}</option>)}
                  </GovSelect>
                </div>

                <div className="gov-field">
                  <GovSelect
                    label="Responsible Government Department"
                    required
                    value={form.departmentId}
                    error={errors.departmentId}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, departmentId: event.target.value }));
                      if (errors.departmentId) setErrors((current) => ({ ...current, departmentId: "" }));
                    }}
                  >
                    <option value="">Select one active department</option>
                    {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                  </GovSelect>
                </div>

                <div className="gov-field">
                  <MultiSelectField
                    label="Preferred City / Cities (Optional)"
                    values={form.preferredCities}
                    options={
                      districtsList
                        .filter(d => form.preferredDistricts.includes(d.name))
                        .flatMap(d => d.cities || [])
                    }
                    onChange={(values) => setForm(prev => ({ ...prev, preferredCities: values }))}
                    placeholder={form.preferredDistricts.length === 0 ? "Select district first..." : "Select city/cities..."}
                  />
                </div>
              </div>
            </GovCardBody>
          </GovCard>

          {/* SECTION 3: CONTACT PERSON */}
          <GovCard className="rounded-3xl border border-slate-200/80 bg-white shadow-sm relative overflow-visible z-10">
            <GovCardHeader className="bg-slate-50/60 border-b border-slate-100 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-950 text-white flex items-center justify-center font-extrabold text-sm shadow-md">
                  03
                </div>
                <div>
                  <GovCardTitle className="text-base font-bold text-slate-900">Authorized CSR Contact Credentials</GovCardTitle>
                  <p className="text-xs text-slate-500 font-normal">Contact details for Relationship Manager coordination</p>
                </div>
              </div>
            </GovCardHeader>
            <GovCardBody className="p-6 md:p-8 overflow-visible">
              <div className="gov-form-grid">
                <div className="gov-field third">
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
                    placeholder="Full Name"
                  />
                </div>

                <div className="gov-field third">
                  <GovInput
                    label="Official Mobile Number"
                    required
                    format="phone"
                    value={form.mobile}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setForm({ ...form, mobile: value });
                      if (errors.mobile) setErrors({ ...errors, mobile: "" });
                    }}
                    error={errors.mobile}
                    placeholder="10-digit mobile number"
                  />
                </div>

                <div className="gov-field third">
                  <GovInput
                    label="Official Email Address"
                    type="email"
                    required
                    format="email"
                    value={form.email}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value });
                      if (errors.email) setErrors({ ...errors, email: "" });
                    }}
                    error={errors.email}
                    placeholder="csr@company.com"
                  />
                </div>
              </div>
            </GovCardBody>
          </GovCard>

          {/* SECTION 4: PROPOSED WORK */}
          <GovCard className="rounded-3xl border border-slate-200/80 bg-white shadow-sm">
            <GovCardHeader className="bg-slate-50/60 border-b border-slate-100 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-900 text-white flex items-center justify-center font-extrabold text-sm shadow-md">
                  04
                </div>
                <div>
                  <GovCardTitle className="text-base font-bold text-slate-900">Proposed CSR Initiative & Scope</GovCardTitle>
                  <p className="text-xs text-slate-500 font-normal">Outline initiative goals, target outcomes, and implementation timeline</p>
                </div>
              </div>
            </GovCardHeader>
            <GovCardBody className="p-6 md:p-8">
              <GovTextarea
                label="Proposed CSR Work Description (Max 200 words)"
                required
                value={form.proposedCSRWork}
                onChange={(e) => {
                  setForm({ ...form, proposedCSRWork: e.target.value });
                  if (errors.proposedCSRWork) setErrors({ ...errors, proposedCSRWork: "" });
                }}
                error={errors.proposedCSRWork}
                placeholder="Describe your proposed CSR initiative, target beneficiaries, expected outcomes, and timeline..."
                rows={5}
              />
              <div className="flex items-center justify-between mt-1.5">
                <p className={`text-xs font-bold ${wordCount > 200 ? "text-rose-600" : "text-slate-500"}`}>
                  {wordCount} / 200 words
                </p>
                {wordCount > 200 && <span className="text-xs text-rose-600 font-semibold">Exceeds 200-word limit</span>}
              </div>
            </GovCardBody>
          </GovCard>

          {/* SECTION 5: SUPPORTING DOCUMENTS */}
          <GovCard className="rounded-3xl border border-slate-200/80 bg-white shadow-sm">
            <GovCardHeader className="bg-slate-50/60 border-b border-slate-100 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-900 text-white flex items-center justify-center font-extrabold text-sm shadow-md">
                  05
                </div>
                <div>
                  <GovCardTitle className="text-base font-bold text-slate-900">Supporting Documents & CSR Attachments (Optional)</GovCardTitle>
                  <p className="text-xs text-slate-500 font-normal">Attach corporate CSR policy, annual report, budget breakdown, or presentation decks</p>
                </div>
              </div>
            </GovCardHeader>
            <GovCardBody className="p-6 md:p-8 flex flex-col gap-5">
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <Paperclip size={16} className="text-blue-900" /> Supporting Documents / CSR Policy / Decks (Optional)
                </label>
                <div className="border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 transition-all rounded-2xl p-6 text-center cursor-pointer relative">
                  <input
                    type="file"
                    accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*"
                    multiple
                    onChange={handleSupportingDocumentsUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-blue-900 flex items-center justify-center font-bold">
                      <Paperclip size={20} />
                    </div>
                    <p className="text-xs font-bold text-slate-800">Click or drag & drop documents to attach</p>
                    <p className="text-[11px] text-slate-400">PDF, DOCX, XLSX, PPTX, JPG, PNG (Multiple files allowed)</p>
                  </div>
                </div>

                {form.supportingDocuments.length > 0 && (
                  <div className="mt-4 flex flex-col gap-2">
                    {form.supportingDocuments.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs text-xs font-semibold">
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText size={16} className="text-blue-900 shrink-0" />
                          <span className="truncate text-slate-900 font-bold">{doc.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({(doc.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSupportingDocument(i)}
                          className="text-rose-600 hover:text-rose-800 font-bold text-xs shrink-0 ml-2 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </GovCardBody>
          </GovCard>

          <label className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs font-semibold text-blue-950">
            <input
              type="checkbox"
              checked={form.declarationAccepted}
              onChange={(event) => {
                setForm((current) => ({ ...current, declarationAccepted: event.target.checked }));
                if (errors.declarationAccepted) setErrors((current) => ({ ...current, declarationAccepted: "" }));
              }}
              className="mt-0.5 h-4 w-4 rounded border-blue-300 accent-blue-900"
            />
            <span>I confirm that the information and uploaded documents are accurate, and understand that the submitted case will be locked and assigned to a Relationship Manager.</span>
          </label>
          {errors.declarationAccepted && <GovAlert variant="danger">{errors.declarationAccepted}</GovAlert>}

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              Cancel
            </button>
            <GovButton type="submit" variant="primary" loading={loading} loadingText="Submitting Enquiry..." className="px-7 py-3 rounded-xl font-bold shadow-md">
              Submit Corporate Enquiry
            </GovButton>
          </div>
        </form>
      </div>
    </GovPortalLayout>
  );
}

export default function CreateCorporateEnquiryPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500 font-bold">Loading Corporate Partnership Desk...</div>}>
      <CreateCorporateEnquiryForm />
    </Suspense>
  );
}

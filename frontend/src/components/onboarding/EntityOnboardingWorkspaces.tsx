"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState, useRef } from "react";
import { AlertCircle, CheckCircle2, FileText, Loader2, Save, Upload, ChevronDown, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { locationData } from "@/lib/locationData";
import "@/styles/gov-theme.css";

type OrganizationDocument = {
  id: string;
  documentType: string;
  fileUrl: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  verificationStatus: string;
  remarks?: string | null;
  createdAt?: string;
};

type Organization = {
  id: string;
  organizationType: string;
  name: string;
  legalName?: string | null;
  displayName?: string | null;
  cin?: string | null;
  llpin?: string | null;
  pan?: string | null;
  gst?: string | null;
  gstin?: string | null;
  parentDepartment?: string | null;
  departmentCode?: string | null;
  email?: string | null;
  officialEmail?: string | null;
  phone?: string | null;
  officialPhone?: string | null;
  website?: string | null;
  address?: string | null;
  district?: string | null;
  taluka?: string | null;
  onboardingStatus: string;
  status: string;
  documents?: OrganizationDocument[];
  csrCompanyProfile?: Record<string, any> | null;
  governmentDepartmentProfile?: Record<string, any> | null;
  onboardingReviews?: Array<{ id: string; reviewAction: string; remarks?: string | null; createdAt: string }>;
};

type ProfileResponse = {
  organization: Organization;
  profile: Record<string, any> | null;
};

const companySteps = [
  { label: "Profile", key: "profile", description: "Legal identity & registration" },
  { label: "Compliance", key: "compliance", description: "CSR eligibility & budget" },
  { label: "Documents", key: "documents", description: "Required verification documents" },
  { label: "Preferences", key: "preferences", description: "Geographic & sector focus" },
  { label: "Declaration", key: "declaration", description: "Accept declaration & submit" }
];

const departmentSteps = [
  { label: "Profile", key: "profile", description: "Basic details & office address" },
  { label: "Nodal Officer", key: "nodal-officer", description: "Details of nodal officer" },
  { label: "Authorization", key: "authorization", description: "Letter & signing permissions" },
  { label: "Jurisdiction", key: "jurisdiction", description: "Sector & geographic access" },
  { label: "Documents", key: "documents", description: "Official letterhead & orders" },
  { label: "Declaration", key: "declaration", description: "Accept declaration & submit" }
];

const companyDocumentTypes = [
  "CERTIFICATE_OF_INCORPORATION",
  "PAN_CARD",
  "GST_CERTIFICATE",
  "MCA_MASTER_DATA",
  "CSR_POLICY",
  "CSR_DECLARATION",
  "BOARD_RESOLUTION",
  "AUTHORIZATION_LETTER",
  "AUDITED_FINANCIAL_STATEMENT",
  "CSR_ANNUAL_REPORT",
  "SCHEDULE_VII_DECLARATION",
  "ESG_BRSR_REPORT",
  "BANK_VERIFICATION"
];

const departmentDocumentTypes = [
  "DEPARTMENT_AUTHORIZATION",
  "DEPARTMENT_PROOF",
  "OFFICE_ORDER",
  "GOVERNMENT_ORDER",
  "NODAL_OFFICER_APPOINTMENT",
  "NODAL_OFFICER_ID",
  "ADDRESS_PROOF",
  "OFFICIAL_LETTERHEAD",
  "SEAL_SAMPLE",
  "INTERNAL_APPROVAL_NOTE",
  "JURISDICTION_PROOF"
];

const scheduleAreas = [
  "Education",
  "Health",
  "Water and sanitation",
  "Poverty and livelihood",
  "Agriculture and rural development",
  "Environment and sustainability",
  "Animal welfare",
  "Skill development",
  "Women and child development",
  "Disaster management",
  "Heritage, art and culture",
  "Sports promotion",
  "Other Schedule VII permitted area"
];

const departmentSectors = [
  "Education",
  "Health",
  "Water",
  "Agriculture",
  "Animal husbandry",
  "Skill development",
  "Environment",
  "Infrastructure",
  "Asset delivery",
  "Service delivery",
  "Awareness and training",
  "Emergency and disaster"
];

function Badge({ children }: { children: string }) {
  const status = children || "";
  const tone = ["APPROVED", "VERIFIED", "ACTIVE"].includes(status)
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : ["REJECTED", "SUSPENDED"].includes(status)
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-amber-200 bg-amber-50 text-amber-900";
  return <span className={`inline-flex rounded border px-2 py-1 text-[11px] font-bold ${tone}`}>{status.replace(/_/g, " ")}</span>;
}

function Shell({
  title,
  description,
  steps,
  currentStep,
  onStepChange,
  children,
  status
}: {
  title: string;
  description: string;
  steps: Array<{ label: string; key: string; description?: string }>;
  currentStep: string;
  onStepChange: (key: any) => void;
  children: React.ReactNode;
  status?: string;
}) {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 md:px-8">
      <section className="border border-gov-line bg-white shadow-sm">
        <div className="h-1.5 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-gov-saffron">Organization onboarding</div>
            <h1 className="mt-2 text-2xl font-extrabold text-gov-navy">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gov-muted">{description}</p>
          </div>
          {status && <Badge>{status}</Badge>}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        {/* Stepper Sidebar */}
        <aside>
          <div className="border border-gov-line bg-white p-5 shadow-sm">
            <h3 className="text-sm font-extrabold text-gov-navy uppercase tracking-wider mb-4 border-b border-gov-line pb-2">
              Application Steps
            </h3>
            <div className="gov-stepper flex flex-col gap-2">
              {steps.map((step, index) => {
                const isActive = step.key === currentStep;
                const currentIdx = steps.findIndex((s) => s.key === currentStep);
                const isCompleted = index < currentIdx;

                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => onStepChange(step.key)}
                    className={`gov-step flex items-start gap-3 w-full text-left border-none cursor-pointer p-2.5 transition-all rounded-sm ${
                      isActive
                        ? "bg-slate-50 border-l-4 border-gov-blue pl-1.5"
                        : "hover:bg-slate-50 border-l-4 border-transparent"
                    }`}
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isActive 
                        ? "bg-gov-blue text-white" 
                        : isCompleted 
                          ? "bg-emerald-600 text-white" 
                          : "bg-slate-100 text-gov-muted border border-gov-line"
                    }`}>
                      {index + 1}
                    </span>
                    <span>
                      <strong className={`block text-xs font-bold ${isActive ? "text-gov-blue" : isCompleted ? "text-emerald-700" : "text-gov-ink"}`}>
                        {step.label}
                      </strong>
                      {step.description && (
                        <small className="block text-[10px] text-gov-muted mt-0.5 leading-normal">
                          {step.description}
                        </small>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Form Content */}
        <div className="flex flex-col gap-5">
          {children}
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required
}: {
  label: string;
  value: any;
  onChange: (value: any) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-bold text-gov-ink">
      {label}
      <input
        value={value || ""}
        type={type}
        required={required}
        onChange={(event) => onChange(type === "number" ? event.target.value : event.target.value)}
        className="border border-gov-line px-3 py-2.5 text-sm font-medium outline-none focus:border-gov-blue"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options, required }: { label: string; value: string; onChange: (value: string) => void; options: string[]; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-bold text-gov-ink">
      {label}
      <select value={value || ""} required={required} onChange={(event) => onChange(event.target.value)} className="border border-gov-line px-3 py-2.5 text-sm font-medium outline-none focus:border-gov-blue">
        <option value="">Select</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function TextAreaField({ label, value, onChange, placeholder }: { label: string; value: any; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-bold text-gov-ink md:col-span-2">
      {label}
      <textarea
        rows={3}
        value={Array.isArray(value) ? value.join(", ") : value || ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="border border-gov-line px-3 py-2.5 text-sm font-medium outline-none focus:border-gov-blue"
      />
    </label>
  );
}

function CheckboxList({ label, values, options, onChange }: { label: string; values: string[]; options: string[]; onChange: (values: string[]) => void }) {
  const selected = new Set(values || []);
  return (
    <fieldset className="md:col-span-2">
      <legend className="mb-2 text-sm font-bold text-gov-ink">{label}</legend>
      <div className="grid gap-2 md:grid-cols-2">
        {options.map((option) => (
          <label key={option} className="flex items-start gap-2 border border-gov-line bg-white p-3 text-sm text-gov-ink">
            <input
              type="checkbox"
              checked={selected.has(option)}
              onChange={() => {
                const next = new Set(selected);
                if (next.has(option)) next.delete(option);
                else next.add(option);
                onChange(Array.from(next));
              }}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function MultiSelectField({
  label,
  values,
  options,
  onChange,
  placeholder = "Select options"
}: {
  label: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const selectedSet = new Set(values || []);

  useEffect(() => {
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
    <div className="flex flex-col gap-1.5 text-sm font-bold text-gov-ink md:col-span-2 relative" ref={dropdownRef}>
      <span>{label}</span>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[42px] border border-gov-line bg-white px-3 py-1.5 flex items-center justify-between gap-2 cursor-pointer focus-within:border-gov-blue outline-none"
      >
        <div className="flex flex-wrap gap-1">
          {values && values.length > 0 ? (
            values.map(val => (
              <span key={val} className="inline-flex items-center gap-1 bg-[#e8f0f8] text-gov-blue text-xs font-semibold px-2 py-0.5 rounded">
                {val}
                <button 
                  type="button" 
                  onClick={(e) => removeOption(val, e)}
                  className="hover:text-red-655 focus:outline-none"
                >
                  <X size={12} />
                </button>
              </span>
            ))
          ) : (
            <span className="text-gov-muted font-medium">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={16} className="text-gov-muted shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute top-[100%] left-0 right-0 z-50 mt-1 border border-gov-line bg-white shadow-lg max-h-60 flex flex-col">
          <div className="p-2 border-b border-gov-line bg-slate-50">
            <input
              type="text"
              placeholder="Search options..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full border border-gov-line px-2.5 py-1.5 text-xs font-medium outline-none focus:border-gov-blue bg-white"
            />
          </div>
          <div className="overflow-y-auto flex-grow divide-y divide-slate-105">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-xs text-gov-muted font-medium text-center">No options found</div>
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
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-slate-50 transition-colors ${isChecked ? "bg-[#e8f0f8]/40" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by container click
                      className="shrink-0"
                    />
                    <span className="text-slate-800 font-medium">{option}</span>
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

function ErrorBox({ error, validationErrors }: { error: string; validationErrors?: string[] }) {
  if (!error && (!validationErrors || validationErrors.length === 0)) return null;
  return (
    <div className="border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <div className="flex items-center gap-2 font-bold"><AlertCircle size={16} /> {error || "Validation failed"}</div>
      {validationErrors && validationErrors.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {validationErrors.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}

function LoadingPanel() {
  return <section className="border border-gov-line bg-white p-8 text-sm text-gov-muted"><Loader2 className="mr-2 inline animate-spin" size={16} /> Loading onboarding data...</section>;
}

function useEntityProfile(type: "company" | "department") {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [profile, setProfile] = useState<Record<string, any>>({});
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const data = await apiFetch<ProfileResponse>(`/onboarding/${type}/profile`);
      setOrganization(data.organization);
      setProfile(data.profile || {});
    } catch (err: any) {
      setError(err.message || "Unable to load onboarding profile");
    }
  };

  useEffect(() => { load(); }, [type]);
  return { organization, profile, setOrganization, setProfile, error, setError, load };
}

function parseApiError(err: any) {
  let validationErrors: string[] = [];
  try {
    const parsed = JSON.parse(err.message);
    validationErrors = parsed.validationErrors || [];
  } catch {
    validationErrors = err.validationErrors || [];
  }
  return validationErrors;
}

export function CompanyOnboardingStep() {
  const router = useRouter();
  const [step, setStep] = useState<"profile" | "compliance" | "documents" | "preferences" | "declaration">("profile");
  const { organization, profile, setOrganization, setProfile, error, setError, load } = useEntityProfile("company");
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (organization && organization.onboardingStatus !== "REGISTERED" && organization.onboardingStatus !== "PROFILE_INCOMPLETE") {
      router.push("/organization/onboarding/status");
    }
  }, [organization, router]);
  const org = organization || ({} as Organization);
  const data: Record<string, any> = { ...profile, ...org };

  const parseToArray = (val: any): string[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === "string") return val.split(",").map(s => s.trim()).filter(Boolean);
    return [];
  };

  const selectedDistricts = parseToArray(data.preferredDistricts);
  const selectedTalukas = parseToArray(data.preferredTalukas);

  const maharashtraDistrictsList = locationData.find(s => s.name === "Maharashtra")?.districts.map(d => d.name) || [];
  const maharashtraState = locationData.find(s => s.name === "Maharashtra");
  const availableTalukas = maharashtraState
    ? maharashtraState.districts
        .filter(d => selectedDistricts.includes(d.name))
        .flatMap(d => d.talukas)
    : [];
  const allTalukas = maharashtraState
    ? maharashtraState.districts.flatMap(d => d.talukas)
    : [];
  const talukaOptions = availableTalukas.length > 0 ? availableTalukas : allTalukas;
  const dedupedTalukaOptions = Array.from(new Set(talukaOptions)).sort();


  const setData = (key: string, value: any) => {
    if (["legalName", "displayName", "cin", "llpin", "pan", "gstin", "officialEmail", "officialPhone", "website", "district"].includes(key)) {
      setOrganization((current) => current ? { ...current, [key]: value } : current);
    } else {
      setProfile((current) => ({ ...current, [key]: value }));
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setValidationErrors([]);
    try {
      const endpoint = step === "profile" ? "/onboarding/company/profile" : step === "compliance" ? "/onboarding/company/compliance" : "/onboarding/company/preferences";
      await apiFetch(endpoint, { method: "PUT", body: JSON.stringify(data) });
      await load();
      
      const currentIdx = companySteps.findIndex((s) => s.key === step);
      if (currentIdx < companySteps.length - 1) {
        setStep(companySteps[currentIdx + 1].key as any);
      }
    } catch (err: any) {
      setError(err.message || "Unable to save onboarding step");
    } finally {
      setSaving(false);
    }
  };

  if (!organization) return <Shell title="CSR Company Onboarding" description="Complete company verification before CSR marketplace access." steps={companySteps} currentStep={step} onStepChange={setStep}><LoadingPanel /></Shell>;

  if (step === "documents") return <DocumentsStep title="CSR Company Documents" steps={companySteps} currentStep={step} onStepChange={setStep} documentTypes={companyDocumentTypes} status={organization.onboardingStatus} />;

  if (step === "declaration") {
    const submit = async () => {
      setSaving(true);
      setError("");
      setValidationErrors([]);
      try {
        await apiFetch("/onboarding/company/submit", { method: "POST", body: JSON.stringify({ declarationAccepted: true }) });
        await load();
        router.push("/organization/onboarding/status");
      } catch (err: any) {
        setError(err.message || "Unable to submit onboarding");
        setValidationErrors(parseApiError(err));
      } finally {
        setSaving(false);
      }
    };
    return (
      <Shell title="CSR Company Declaration" description="Submit the verified company onboarding application to Portal Admin." steps={companySteps} currentStep={step} onStepChange={setStep} status={organization.onboardingStatus}>
        <ErrorBox error={error} validationErrors={validationErrors} />
        <section className="border border-gov-line bg-white p-5 shadow-sm">
          <div className="space-y-3 text-sm text-gov-ink">
            <p><CheckCircle2 className="mr-2 inline text-emerald-600" size={16} /> Information submitted is true and accurate.</p>
            <p><CheckCircle2 className="mr-2 inline text-emerald-600" size={16} /> Company is authorized to participate in CSR project discovery and funding.</p>
            <p><CheckCircle2 className="mr-2 inline text-emerald-600" size={16} /> Company agrees to portal verification and public-safe impact disclosure.</p>
            <p><CheckCircle2 className="mr-2 inline text-emerald-600" size={16} /> Sensitive payment and compliance documents will not be public.</p>
          </div>
          <div className="mt-5">
            <Button onClick={submit} loading={saving}>Accept Declaration and Submit</Button>
          </div>
        </section>
      </Shell>
    );
  }

  return (
    <Shell title={step === "profile" ? "CSR Company Profile" : step === "compliance" ? "CSR Applicability and Compliance" : "CSR Preference Setup"} description="Approved company onboarding is mandatory before showing interest or recording CSR funding." steps={companySteps} currentStep={step} onStepChange={setStep} status={organization.onboardingStatus}>
      <ErrorBox error={error} />
      <form onSubmit={save} className="grid gap-4 border border-gov-line bg-white p-5 shadow-sm md:grid-cols-2">
        {step === "profile" && (
          <>
            <Field label="Legal company name" required value={data.legalName || data.name} onChange={(value) => setData("legalName", value)} />
            <Field label="Brand / display name" value={data.displayName} onChange={(value) => setData("displayName", value)} />
            <SelectField label="Organization type" required value={data.companyType} onChange={(value) => setData("companyType", value)} options={["Public Limited Company", "Private Limited Company", "Section 8 Company", "Government Company / PSU", "LLP", "Foreign Company", "Other"]} />
            <Field label="CIN / LLPIN" required value={data.cin || data.llpin} onChange={(value) => data.companyType === "LLP" ? setData("llpin", value) : setData("cin", value)} />
            <Field label="PAN" required value={data.pan} onChange={(value) => setData("pan", value)} />
            <Field label="GSTIN" value={data.gstin} onChange={(value) => setData("gstin", value)} />
            <TextAreaField label="Registered office address" value={data.registeredOfficeAddress || data.address} onChange={(value) => setData("registeredOfficeAddress", value)} />
            <TextAreaField label="Corporate office address" value={data.corporateOfficeAddress} onChange={(value) => setData("corporateOfficeAddress", value)} />
            <Field label="District" value={data.district} onChange={(value) => setData("district", value)} />
            <Field label="Official website" value={data.website} onChange={(value) => setData("website", value)} />
            <Field label="Official email" required value={data.officialEmail || data.email} onChange={(value) => setData("officialEmail", value)} />
            <Field label="Official email domain" value={data.officialEmailDomain} onChange={(value) => setData("officialEmailDomain", value)} />
            <Field label="Company phone" value={data.officialPhone || data.phone} onChange={(value) => setData("officialPhone", value)} />
            <Field label="Year of incorporation" type="number" value={data.yearOfIncorporation} onChange={(value) => setData("yearOfIncorporation", value)} />
            <SelectField label="MCA verification status" value={data.mcaVerificationStatus} onChange={(value) => setData("mcaVerificationStatus", value)} options={["Not Started", "Under Verification", "Verified", "Mismatch"]} />
            <SelectField label="Company status" value={data.companyStatus} onChange={(value) => setData("companyStatus", value)} options={["Active", "Inactive", "Under Verification", "Suspended"]} />
          </>
        )}
        {step === "compliance" && (
          <>
            <SelectField label="Covered under Section 135 CSR provisions" value={data.csrApplicable ? "Yes" : "No"} onChange={(value) => setData("csrApplicable", value === "Yes")} options={["Yes", "No"]} />
            <Field label="Financial year" required value={data.financialYear} onChange={(value) => setData("financialYear", value)} />
            <Field label="Net worth" type="number" value={data.netWorth} onChange={(value) => setData("netWorth", value)} />
            <Field label="Turnover" type="number" value={data.turnover} onChange={(value) => setData("turnover", value)} />
            <Field label="Net profit" type="number" value={data.netProfit} onChange={(value) => setData("netProfit", value)} />
            <Field label="Average net profit last 3 years" type="number" value={data.averageNetProfit} onChange={(value) => setData("averageNetProfit", value)} />
            <Field label="Applicable CSR obligation amount" type="number" value={data.csrObligationAmount} onChange={(value) => setData("csrObligationAmount", value)} />
            <Field label="2% CSR obligation value" type="number" value={data.twoPercentCsrObligation} onChange={(value) => setData("twoPercentCsrObligation", value)} />
            <Field label="CSR budget current financial year" required type="number" value={data.currentYearCsrBudget} onChange={(value) => setData("currentYearCsrBudget", value)} />
            <Field label="Unspent CSR amount" type="number" value={data.unspentCsrAmount} onChange={(value) => setData("unspentCsrAmount", value)} />
            <Field label="CSR head name" required value={data.csrHeadName} onChange={(value) => setData("csrHeadName", value)} />
            <Field label="CSR head email" required value={data.csrHeadEmail} onChange={(value) => setData("csrHeadEmail", value)} />
            <Field label="CSR head mobile" value={data.csrHeadMobile} onChange={(value) => setData("csrHeadMobile", value)} />
            <Field label="Finance officer name" value={data.financeOfficerName} onChange={(value) => setData("financeOfficerName", value)} />
            <Field label="Finance officer email" value={data.financeOfficerEmail} onChange={(value) => setData("financeOfficerEmail", value)} />
            <Field label="Authorized signatory name" required value={data.authorizedSignatoryName} onChange={(value) => setData("authorizedSignatoryName", value)} />
            <Field label="Authorized signatory email" required value={data.authorizedSignatoryEmail} onChange={(value) => setData("authorizedSignatoryEmail", value)} />
            <Field label="Authorization reference number" value={data.authorizationReferenceNumber} onChange={(value) => setData("authorizationReferenceNumber", value)} />
            <CheckboxList label="Schedule VII focus areas" values={data.scheduleVIIFocusAreas || []} options={scheduleAreas} onChange={(values) => setData("scheduleVIIFocusAreas", values)} />
          </>
        )}
        {step === "preferences" && (
          <>
            <MultiSelectField
              label="Preferred districts"
              values={selectedDistricts}
              options={maharashtraDistrictsList}
              onChange={(values) => setData("preferredDistricts", values)}
              placeholder="Select preferred districts"
            />
            <MultiSelectField
              label="Preferred talukas"
              values={selectedTalukas}
              options={dedupedTalukaOptions}
              onChange={(values) => setData("preferredTalukas", values)}
              placeholder={selectedDistricts.length > 0 ? "Select preferred talukas" : "Select districts first"}
            />
            <CheckboxList label="Preferred sectors" values={data.preferredSectors || []} options={scheduleAreas} onChange={(values) => setData("preferredSectors", values)} />
            <SelectField label="Preferred project size" value={data.preferredProjectSize} onChange={(value) => setData("preferredProjectSize", value)} options={["Small", "Medium", "Large"]} />
            <Field label="Minimum funding amount" type="number" value={data.minFundingAmount} onChange={(value) => setData("minFundingAmount", value)} />
            <Field label="Maximum funding amount" type="number" value={data.maxFundingAmount} onChange={(value) => setData("maxFundingAmount", value)} />
            <SelectField label="Funding preference" value={data.fundingPreference} onChange={(value) => setData("fundingPreference", value)} options={["Full funding", "Partial funding", "Co-funding"]} />
            <SelectField label="Implementation preference" value={data.implementationPreference} onChange={(value) => setData("implementationPreference", value)} options={["Direct asset delivery", "NGO implementation", "Mixed model"]} />
            <TextAreaField label="Preferred beneficiary groups" value={data.preferredBeneficiaryGroups} onChange={(value) => setData("preferredBeneficiaryGroups", value)} />
            <TextAreaField label="SDG focus areas" value={data.sdgFocusAreas} onChange={(value) => setData("sdgFocusAreas", value)} />
            <TextAreaField label="ESG focus areas" value={data.esgFocusAreas} onChange={(value) => setData("esgFocusAreas", value)} />
          </>
        )}
        <div className="md:col-span-2"><Button type="submit" loading={saving}><Save size={16} className="mr-2" /> Save & Continue</Button></div>
      </form>
    </Shell>
  );
}

function DocumentsStep({
  title,
  steps,
  currentStep,
  onStepChange,
  documentTypes,
  status
}: {
  title: string;
  steps: Array<{ label: string; key: string }>;
  currentStep: string;
  onStepChange: (key: any) => void;
  documentTypes: string[];
  status?: string;
}) {
  const [documents, setDocuments] = useState<OrganizationDocument[]>([]);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ documentType: documentTypes[0], fileUrl: "", fileName: "", mimeType: "application/pdf", fileSize: "" });

  const load = async () => {
    try {
      setDocuments(await apiFetch<OrganizationDocument[]>("/onboarding/documents"));
    } catch (err: any) {
      setError(err.message || "Unable to load documents");
    }
  };
  useEffect(() => { load(); }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // 1. Upload file
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers,
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "File upload failed");

      // 2. Automatically link/save document in database
      await apiFetch("/onboarding/documents", {
        method: "POST",
        body: JSON.stringify({
          documentType: form.documentType,
          fileUrl: data.url,
          fileName: file.name,
          mimeType: file.type || "application/pdf",
          fileSize: Number(data.bytes || file.size)
        })
      });

      // 3. Clear file input and reload
      event.target.value = "";
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to upload and save document");
      event.target.value = ""; // Clear file input
    } finally {
      setUploading(false);
    }
  };

  const handleContinue = () => {
    const currentIdx = steps.findIndex((s) => s.key === currentStep);
    if (currentIdx < steps.length - 1) {
      onStepChange(steps[currentIdx + 1].key);
    }
  };

  return (
    <Shell title={title} description="Upload private onboarding documents. These files are tenant-scoped and not exposed publicly." steps={steps} currentStep={currentStep} onStepChange={onStepChange} status={status}>
      <ErrorBox error={error} />
      
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side: Upload Panel (1/3) */}
        <div className="md:col-span-1 flex flex-col gap-4 border border-gov-line bg-white p-5 shadow-sm">
          <div className="text-xs font-bold text-gov-navy uppercase tracking-wider border-b border-gov-line pb-2 mb-1">
            Upload Document
          </div>
          
          <SelectField 
            label="Document type to upload" 
            value={form.documentType} 
            onChange={(value) => setForm(current => ({ ...current, documentType: value }))} 
            options={documentTypes} 
            required 
          />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold text-gov-ink">Select File *</span>
            <div className="relative border-2 border-dashed border-gov-line hover:border-gov-blue hover:bg-slate-50/50 p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group min-h-[140px]">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileChange}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-8 h-8 text-gov-muted group-hover:text-gov-blue transition-colors" />
              <div className="text-sm font-bold text-gov-ink">Click or drag file here</div>
              <div className="text-[10px] text-gov-muted font-medium">Supports PDF, JPG, PNG, DOC (max 10MB)</div>
            </div>
            
            {uploading && (
              <div className="flex items-center gap-2.5 mt-2 bg-[#f0f4f8] border border-gov-line p-3 text-xs text-gov-blue font-semibold animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-gov-blue shrink-0" />
                <span>Uploading & saving document...</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Uploaded List (2/3) */}
        <div className="md:col-span-2 border border-gov-line bg-white shadow-sm flex flex-col">
          <div className="border-b border-gov-line p-4 flex justify-between items-center bg-slate-50/30">
            <div>
              <div className="text-xs font-bold text-gov-navy uppercase tracking-wider">Uploaded Documents</div>
              <p className="text-[11px] text-gov-muted mt-0.5">Documents submitted for organization verification</p>
            </div>
            <span className="text-xs font-bold bg-[#e8f0f8] text-gov-blue px-2.5 py-1 rounded-full">{documents.length} Uploaded</span>
          </div>

          <div className="flex-grow divide-y divide-gov-line min-h-[250px] bg-white">
            {documents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-2">
                <FileText className="w-12 h-12 text-slate-200" />
                <div className="text-sm font-bold text-gov-muted">No documents uploaded yet</div>
                <p className="text-xs text-gov-muted max-w-xs font-medium">Select a document type and upload your file on the left to begin.</p>
              </div>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3 hover:bg-slate-50/20 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#e8f0f8] flex items-center justify-center text-gov-blue shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-gov-blue hover:underline flex items-center gap-1.5">
                        {doc.documentType.replace(/_/g, " ")}
                      </a>
                      <span className="text-xs text-gov-muted font-medium truncate max-w-[280px]">{doc.fileName || "uploaded_file"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="text-[10px] text-gov-muted font-bold uppercase">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : ""}</span>
                    <Badge>{doc.verificationStatus}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Save & Continue Button */}
      <div className="flex justify-end gap-3 mt-6 border-t border-gov-line pt-4">
        <Button 
          type="button" 
          onClick={handleContinue} 
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded shadow-sm flex items-center gap-2"
        >
          Save & Continue <CheckCircle2 size={16} />
        </Button>
      </div>
    </Shell>
  );
}

export function DepartmentOnboardingStep() {
  const router = useRouter();
  const [step, setStep] = useState<"profile" | "nodal-officer" | "authorization" | "jurisdiction" | "documents" | "declaration">("profile");
  const { organization, profile, setOrganization, setProfile, error, setError, load } = useEntityProfile("department");
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (organization && organization.onboardingStatus !== "REGISTERED" && organization.onboardingStatus !== "PROFILE_INCOMPLETE") {
      router.push("/organization/onboarding/status");
    }
  }, [organization, router]);
  const org = organization || ({} as Organization);
  const data: Record<string, any> = { ...profile, ...org };

  const setData = (key: string, value: any) => {
    if (["legalName", "parentDepartment", "departmentCode", "officialEmail", "officialPhone", "website", "address", "district", "taluka"].includes(key)) {
      setOrganization((current) => current ? { ...current, [key]: value } : current);
    } else {
      setProfile((current) => ({ ...current, [key]: value }));
    }
  };

  const endpoint = useMemo(() => {
    if (step === "profile") return "/onboarding/department/profile";
    if (step === "nodal-officer") return "/onboarding/department/nodal-officer";
    if (step === "authorization") return "/onboarding/department/authorization";
    if (step === "jurisdiction") return "/onboarding/department/jurisdiction";
    return "/onboarding/department/permissions";
  }, [step]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch(endpoint, { method: "PUT", body: JSON.stringify(data) });
      await load();
      
      const currentIdx = departmentSteps.findIndex((s) => s.key === step);
      if (currentIdx < departmentSteps.length - 1) {
        setStep(departmentSteps[currentIdx + 1].key as any);
      }
    } catch (err: any) {
      setError(err.message || "Unable to save onboarding step");
    } finally {
      setSaving(false);
    }
  };

  if (!organization) return <Shell title="Government Department Onboarding" description="Complete department verification before requirement creation." steps={departmentSteps} currentStep={step} onStepChange={setStep}><LoadingPanel /></Shell>;

  if (step === "documents") return <DocumentsStep title="Government Department Documents" steps={departmentSteps} currentStep={step} onStepChange={setStep} documentTypes={departmentDocumentTypes} status={organization.onboardingStatus} />;

  if (step === "declaration") {
    const submit = async () => {
      setSaving(true);
      setError("");
      setValidationErrors([]);
      try {
        await apiFetch("/onboarding/department/submit", { method: "POST", body: JSON.stringify({ declarationAccepted: true }) });
        await load();
        router.push("/organization/onboarding/status");
      } catch (err: any) {
        setError(err.message || "Unable to submit onboarding");
        setValidationErrors(parseApiError(err));
      } finally {
        setSaving(false);
      }
    };
    return (
      <Shell title="Government Department Declaration" description="Submit department onboarding for Portal Admin verification." steps={departmentSteps} currentStep={step} onStepChange={setStep} status={organization.onboardingStatus}>
        <ErrorBox error={error} validationErrors={validationErrors} />
        <section className="border border-gov-line bg-white p-5 shadow-sm">
          <div className="space-y-3 text-sm text-gov-ink">
            <p><CheckCircle2 className="mr-2 inline text-emerald-600" size={16} /> Nodal officer is authorized to use the portal.</p>
            <p><CheckCircle2 className="mr-2 inline text-emerald-600" size={16} /> Requirements created will be genuine public/government needs.</p>
            <p><CheckCircle2 className="mr-2 inline text-emerald-600" size={16} /> Uploaded documents are official and valid.</p>
            <p><CheckCircle2 className="mr-2 inline text-emerald-600" size={16} /> Department agrees to verification and truthful handover confirmation.</p>
          </div>
          <div className="mt-5"><Button onClick={submit} loading={saving}>Accept Declaration and Submit</Button></div>
        </section>
      </Shell>
    );
  }

  return (
    <Shell title={step === "profile" ? "Department Basic Profile" : step === "nodal-officer" ? "Nodal Officer Details" : step === "authorization" ? "Authority and Approval Details" : "Jurisdiction and Requirement Permissions"} description="Approved department onboarding is mandatory before creating or submitting CSR requirements." steps={departmentSteps} currentStep={step} onStepChange={setStep} status={organization.onboardingStatus}>
      <ErrorBox error={error} />
      <form onSubmit={save} className="grid gap-4 border border-gov-line bg-white p-5 shadow-sm md:grid-cols-2">
        {step === "profile" && (
          <>
            <Field label="Department / entity name" required value={data.legalName || data.name} onChange={(value) => setData("legalName", value)} />
            <SelectField label="Department type" required value={data.departmentType} onChange={(value) => setData("departmentType", value)} options={["State Government Department", "District Administration", "Zilla Parishad", "Municipal Corporation", "Municipal Council", "Panchayat Samiti", "Gram Panchayat", "Government School", "Government Hospital", "Public Institution", "Other Government Body"]} />
            <Field label="Parent department / controlling authority" required value={data.parentDepartment} onChange={(value) => setData("parentDepartment", value)} />
            <Field label="Department code" value={data.departmentCode} onChange={(value) => setData("departmentCode", value)} />
            <Field label="District" value={data.district} onChange={(value) => setData("district", value)} />
            <Field label="Taluka" value={data.taluka} onChange={(value) => setData("taluka", value)} />
            <Field label="Village / city" value={data.villageOrCity} onChange={(value) => setData("villageOrCity", value)} />
            <Field label="Official email" required value={data.officialEmail || data.email} onChange={(value) => setData("officialEmail", value)} />
            <Field label="Official email domain" value={data.officialEmailDomain} onChange={(value) => setData("officialEmailDomain", value)} />
            <Field label="Office phone" value={data.officePhone || data.officialPhone} onChange={(value) => setData("officePhone", value)} />
            <Field label="Official website" value={data.website || data.officeWebsite} onChange={(value) => setData("website", value)} />
            <Field label="Government office identifier" value={data.governmentOfficeIdentifier} onChange={(value) => setData("governmentOfficeIdentifier", value)} />
            <TextAreaField label="Office address" value={data.address} onChange={(value) => setData("address", value)} />
          </>
        )}
        {step === "nodal-officer" && (
          <>
            <Field label="Nodal officer name" required value={data.nodalOfficerName} onChange={(value) => setData("nodalOfficerName", value)} />
            <Field label="Designation" required value={data.nodalOfficerDesignation} onChange={(value) => setData("nodalOfficerDesignation", value)} />
            <Field label="Department" value={data.nodalOfficerDepartment} onChange={(value) => setData("nodalOfficerDepartment", value)} />
            <Field label="Official email" required value={data.nodalOfficerEmail} onChange={(value) => setData("nodalOfficerEmail", value)} />
            <Field label="Mobile number" required value={data.nodalOfficerMobile} onChange={(value) => setData("nodalOfficerMobile", value)} />
            <Field label="Office phone" value={data.nodalOfficerOfficePhone} onChange={(value) => setData("nodalOfficerOfficePhone", value)} />
            <Field label="Employee ID" value={data.nodalOfficerEmployeeId} onChange={(value) => setData("nodalOfficerEmployeeId", value)} />
            <Field label="Reporting officer name" value={data.reportingOfficerName} onChange={(value) => setData("reportingOfficerName", value)} />
            <Field label="Reporting officer designation" value={data.reportingOfficerDesignation} onChange={(value) => setData("reportingOfficerDesignation", value)} />
            <Field label="Reporting officer email" value={data.reportingOfficerEmail} onChange={(value) => setData("reportingOfficerEmail", value)} />
          </>
        )}
        {step === "authorization" && (
          <>
            <Field label="Authorization letter number" required value={data.authorizationLetterNumber} onChange={(value) => setData("authorizationLetterNumber", value)} />
            <Field label="Authorization letter date" type="date" required value={data.authorizationLetterDate?.slice?.(0, 10) || data.authorizationLetterDate} onChange={(value) => setData("authorizationLetterDate", value)} />
            <Field label="Issuing authority name" value={data.issuingAuthorityName} onChange={(value) => setData("issuingAuthorityName", value)} />
            <Field label="Issuing authority designation" value={data.issuingAuthorityDesignation} onChange={(value) => setData("issuingAuthorityDesignation", value)} />
            <SelectField label="Authorized to create requirements" value={data.canCreateRequirements ? "Yes" : "No"} onChange={(value) => setData("canCreateRequirements", value === "Yes")} options={["Yes", "No"]} />
            <SelectField label="Authorized to confirm handover" value={data.canConfirmHandover ? "Yes" : "No"} onChange={(value) => setData("canConfirmHandover", value === "Yes")} options={["Yes", "No"]} />
            <SelectField label="Authorized to upload official documents" value={data.canUploadOfficialDocuments ? "Yes" : "No"} onChange={(value) => setData("canUploadOfficialDocuments", value === "Yes")} options={["Yes", "No"]} />
            <SelectField label="Department approval required before submission" value={data.departmentApprovalRequired ? "Yes" : "No"} onChange={(value) => setData("departmentApprovalRequired", value === "Yes")} options={["Yes", "No"]} />
            <TextAreaField label="Internal approval note / file number" value={data.internalApprovalReference} onChange={(value) => setData("internalApprovalReference", value)} />
          </>
        )}
        {step === "jurisdiction" && (
          <>
            <SelectField label="Jurisdiction type" value={data.jurisdictionType} onChange={(value) => setData("jurisdictionType", value)} options={["State", "District", "Taluka", "Village", "Local Body"]} />
            <TextAreaField label="District access" value={data.allowedDistrictIds} onChange={(value) => setData("allowedDistrictIds", value)} placeholder="Comma separated districts" />
            <TextAreaField label="Taluka access" value={data.allowedTalukaIds} onChange={(value) => setData("allowedTalukaIds", value)} />
            <TextAreaField label="Village access" value={data.allowedVillageIds} onChange={(value) => setData("allowedVillageIds", value)} />
            <CheckboxList label="Department sector access" values={data.allowedSectors || []} options={departmentSectors} onChange={(values) => setData("allowedSectors", values)} />
            <CheckboxList label="Requirement creation permissions" values={data.requirementPermissionSectors || []} options={departmentSectors} onChange={(values) => setData("requirementPermissionSectors", values)} />
            <SelectField label="Can create state-level requirements" value={data.canCreateStateLevelRequirement ? "Yes" : "No"} onChange={(value) => setData("canCreateStateLevelRequirement", value === "Yes")} options={["Yes", "No"]} />
            <SelectField label="Can create district-level requirements" value={data.canCreateDistrictLevelRequirement ? "Yes" : "No"} onChange={(value) => setData("canCreateDistrictLevelRequirement", value === "Yes")} options={["Yes", "No"]} />
            <SelectField label="District officer verification required" value={data.requiresDistrictVerification ? "Yes" : "No"} onChange={(value) => setData("requiresDistrictVerification", value === "Yes")} options={["Yes", "No"]} />
          </>
        )}
        <div className="md:col-span-2"><Button type="submit" loading={saving}><Save size={16} className="mr-2" /> Save & Continue</Button></div>
      </form>
    </Shell>
  );
}

"use client";

import { FormEvent, useEffect, useState, useRef, useCallback } from "react";
import { AlertCircle, CheckCircle2, FileText, Loader2, Save, Upload, ChevronDown, X, Sparkles, Building2, ShieldCheck, Eye, Trash2, Check, Plus, UserPlus, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiFetch, API_BASE_URL, getStoredUser } from "@/lib/api";
import { locationData } from "@/lib/locationData";
import { FieldFormat, sanitizeField, validateField, inputModeFor, FIELD_MAX_LENGTH } from "@/lib/validation";
import GstVerificationField from "@/components/verification/GstVerificationField";

const maharashtraState = locationData.find((state) => state.name === "Maharashtra");

const DIVISION_TO_DISTRICTS: Record<string, string[]> = {
  Amravati: ["Akola", "Amravati", "Buldhana", "Washim", "Yavatmal"],
  Aurangabad: ["Aurangabad", "Beed", "Hingoli", "Jalna", "Latur", "Nanded", "Osmanabad", "Parbhani"],
  Konkan: ["Mumbai City", "Mumbai Suburban", "Palghar", "Raigad", "Ratnagiri", "Sindhudurg", "Thane"],
  Nagpur: ["Bhandara", "Chandrapur", "Gadchiroli", "Gondia", "Nagpur", "Wardha"],
  Nashik: ["Ahmednagar", "Dhule", "Jalgaon", "Nandurbar", "Nashik"],
  Pune: ["Kolhapur", "Pune", "Sangli", "Satara", "Solapur"],
};

const yearFromGstRegistrationDate = (value: unknown): string => {
  const date = String(value ?? '').trim();
  if (!date) return '';

  // GSTN commonly returns DD/MM/YYYY, while some API Setu responses use an
  // ISO date or YYYY-MM-DD. Read the year explicitly to avoid timezone shifts.
  const dayFirst = date.match(/^\d{1,2}[/-]\d{1,2}[/-](\d{4})/);
  if (dayFirst) return dayFirst[1];
  const yearFirst = date.match(/^(\d{4})[/-]\d{1,2}[/-]\d{1,2}/);
  if (yearFirst) return yearFirst[1];
  const yearOnly = date.match(/^(\d{4})$/);
  return yearOnly ? yearOnly[1] : '';
};

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
  kind?: string | null;
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
  { label: "Profile", key: "profile", description: "Basic details & office mandate" },
  { label: "Nodal & Head", key: "nodal-officer", description: "Nodal officer & HOD details" },
  { label: "Jurisdiction", key: "jurisdiction", description: "Sector & geographic focus" },
  { label: "Documents", key: "documents", description: "Official letterhead & orders" },
  { label: "Declaration", key: "declaration", description: "Accept declaration & submit" }
];

const companyDocumentTypes = [
  "CERTIFICATE_OF_INCORPORATION",
  "PAN_CARD",
  "GST_CERTIFICATE",
  "MCA_MASTER_DATA"
];

const parentDepartmentDocumentTypes = [
  "NODAL_OFFICER_APPOINTMENT",
  "NODAL_OFFICER_ID",
  "OFFICE_ORDER",
  "GOVERNMENT_ORDER"
];

const subDepartmentDocumentTypes = [
  "DEPARTMENT_AUTHORIZATION",
  "NODAL_OFFICER_APPOINTMENT",
  "NODAL_OFFICER_ID",
  "OFFICE_ORDER",
  "GOVERNMENT_ORDER",
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

const beneficiaryGroupOptions = [
  "Women & Girls",
  "Farmers & Agricultural Workers",
  "Tribal & Marginalized Communities",
  "Persons with Disabilities (PwD)",
  "Children & Primary Education",
  "Youth & Skill Seekers",
  "Elderly & Senior Citizens",
  "Urban Slum Dwellers",
  "Disaster Affected Families"
];

const sdgFocusOptions = [
  "SDG 1: No Poverty",
  "SDG 2: Zero Hunger",
  "SDG 3: Good Health & Well-Being",
  "SDG 4: Quality Education",
  "SDG 5: Gender Equality",
  "SDG 6: Clean Water & Sanitation",
  "SDG 7: Affordable & Clean Energy",
  "SDG 8: Decent Work & Growth",
  "SDG 13: Climate Action",
  "SDG 15: Life on Land"
];

const esgFocusOptions = [
  "Carbon Reduction & Net Zero",
  "Water Conservation & Harvesting",
  "Waste Management & Circular Economy",
  "Community Health & Wellbeing",
  "Diversity, Equity & Inclusion (DEI)",
  "Corporate Ethics & Governance",
  "Sustainable Agriculture",
  "Rural Infrastructure & Energy"
];

function Badge({ children }: { children: string }) {
  const status = children || "";
  const tone = ["APPROVED", "VERIFIED", "ACTIVE"].includes(status)
    ? "border-emerald-200/80 bg-emerald-50 text-emerald-800 shadow-sm"
    : ["REJECTED", "SUSPENDED"].includes(status)
      ? "border-rose-200/80 bg-rose-50 text-rose-800 shadow-sm"
      : "border-amber-200/80 bg-amber-50 text-amber-900 shadow-sm";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${tone}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      {status.replace(/_/g, " ")}
    </span>
  );
}

function Shell({
  title,
  description: _description,
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
    <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-8">
      {/* Compact Space-Saving Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900 font-heading">{title}</h1>
          <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
            Verification Workspace
          </span>
        </div>
        {status && <Badge>{status}</Badge>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* Stepper Sidebar */}
        <aside>
          <div className="sticky top-6 rounded-3xl border border-white/80 bg-white/90 backdrop-blur-2xl p-6 shadow-glass">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-5 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Application Steps</span>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {steps.findIndex(s => s.key === currentStep) + 1} / {steps.length}
              </span>
            </h3>

            <div className="flex flex-col gap-2.5">
              {steps.map((step, index) => {
                const isActive = step.key === currentStep;
                const currentIdx = steps.findIndex((s) => s.key === currentStep);
                const isCompleted = index < currentIdx;

                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => onStepChange(step.key)}
                    className={`group relative flex items-center justify-between gap-3 w-full text-left p-3 rounded-2xl transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 text-white shadow-lg ring-1 ring-blue-500/30 scale-[1.01]"
                        : isCompleted
                        ? "bg-white border border-slate-200/90 hover:border-emerald-300 hover:bg-emerald-50/30 text-slate-900 shadow-sm"
                        : "bg-slate-50/80 border border-slate-200/60 hover:bg-slate-100/80 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold transition-all group-hover:scale-105 ${
                        isActive
                          ? "bg-white/20 text-white shadow-inner border border-white/20"
                          : isCompleted
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200/80"
                          : "bg-white text-slate-400 border border-slate-200"
                      }`}>
                        {isCompleted ? <CheckCircle2 size={15} className="text-emerald-600" /> : index + 1}
                      </span>
                      <div className="overflow-hidden">
                        <strong className={`block text-xs font-bold ${
                          isActive ? "text-white" : isCompleted ? "text-slate-900" : "text-slate-700"
                        }`}>
                          {step.label}
                        </strong>
                        {step.description && (
                          <small className={`block text-[10px] truncate mt-0.5 font-medium ${
                            isActive ? "text-blue-200" : "text-slate-400"
                          }`}>
                            {step.description}
                          </small>
                        )}
                      </div>
                    </div>
                    {isCompleted && !isActive && (
                      <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 shrink-0 hidden sm:inline">
                        Done
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Form Content */}
        <div className="flex flex-col gap-6">
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
  required,
  format,
  placeholder
}: {
  label: string;
  value: any;
  onChange: (value: any) => void;
  type?: string;
  required?: boolean;
  format?: FieldFormat;
  placeholder?: string;
}) {
  const [fieldError, setFieldError] = useState("");
  return (
    <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-800">
      <span className="flex items-center gap-1">
        {label}
        {required && <span className="text-red-500 font-bold">*</span>}
      </span>
      <input
        value={value || ""}
        type={type}
        required={required}
        placeholder={placeholder}
        inputMode={format ? inputModeFor(format) : undefined}
        maxLength={format ? FIELD_MAX_LENGTH[format] : undefined}
        onChange={(event) => {
          const raw = event.target.value;
          const clean = format ? sanitizeField(format, raw) : raw;
          if (fieldError && format && !validateField(format, clean)) setFieldError("");
          onChange(clean);
        }}
        onBlur={(event) => {
          if (!format) return;
          const val = event.target.value;
          if (!val && required) setFieldError(`${label} is required`);
          else setFieldError(validateField(format, val));
        }}
        className={`w-full rounded-xl border bg-slate-50/80 px-3.5 py-2.5 text-xs font-semibold text-slate-900 shadow-sm transition-all focus:bg-white focus:outline-none ${
          fieldError
            ? "border-red-300 bg-red-50/50 text-red-900 focus:border-red-600 focus:ring-2 focus:ring-red-500/20"
            : "border-slate-200/80 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
        }`}
      />
      {fieldError && <span className="text-[10px] font-bold text-red-600 mt-0.5">{fieldError}</span>}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  infoUrl
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
  infoUrl?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-800">
      <span className="flex items-center gap-1">
        {label}
        {required && <span className="text-red-500 font-bold">*</span>}
        {infoUrl && (
          <a
            href={infoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-blue-600 transition-colors inline-flex items-center"
            title="View Section 135 CSR provisions PDF"
            onClick={(e) => e.stopPropagation()}
          >
            <Info size={14} className="ml-0.5 cursor-pointer" />
          </a>
        )}
      </span>
      <select
        value={value || ""}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-2.5 text-xs font-semibold text-slate-900 shadow-sm transition-all focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <option value="">Select option</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function TextAreaField({ label, value, onChange, placeholder, required }: { label: string; value: any; onChange: (value: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-800 md:col-span-2">
      <span className="flex items-center gap-1">
        {label}
        {required && <span className="text-red-500 font-bold">*</span>}
      </span>
      <textarea
        rows={3}
        required={required}
        value={Array.isArray(value) ? value.join(", ") : value || ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-xs font-semibold text-slate-900 shadow-sm transition-all focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
    </label>
  );
}

function TagSelectorField({
  label,
  values,
  options,
  onChange
}: {
  label: string;
  values: string[] | string;
  options: string[];
  onChange: (values: string[]) => void;
}) {
  const allOptions = options.includes("Other") ? options : [...options, "Other"];

  const selectedList = Array.isArray(values)
    ? values
    : typeof values === "string" && values.trim()
    ? values.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const existingOtherItem = selectedList.find(
    (item) => item === "Other" || item.startsWith("Other:") || item.startsWith("Other -")
  );

  const isOtherSelected = Boolean(existingOtherItem);
  const otherCustomText = existingOtherItem
    ? existingOtherItem.replace(/^Other[:\s-]*/i, "").trim()
    : "";

  const [customText, setCustomText] = useState(otherCustomText);

  useEffect(() => {
    setCustomText(otherCustomText);
  }, [otherCustomText]);

  const selectedPresetSet = new Set(
    selectedList.filter((item) => !item.startsWith("Other") && item !== "Other")
  );

  const updateAllValues = (presetSet: Set<string>, otherActive: boolean, text: string) => {
    const nextList = Array.from(presetSet);
    if (otherActive) {
      const cleanText = text.trim();
      nextList.push(cleanText ? `Other: ${cleanText}` : "Other");
    }
    onChange(nextList);
  };

  const toggleTag = (option: string) => {
    if (option === "Other") {
      const nextOtherActive = !isOtherSelected;
      updateAllValues(selectedPresetSet, nextOtherActive, customText);
    } else {
      const nextPresetSet = new Set(selectedPresetSet);
      if (nextPresetSet.has(option)) {
        nextPresetSet.delete(option);
      } else {
        nextPresetSet.add(option);
      }
      updateAllValues(nextPresetSet, isOtherSelected, customText);
    }
  };

  const handleCustomTextChange = (text: string) => {
    setCustomText(text);
    if (isOtherSelected) {
      updateAllValues(selectedPresetSet, true, text);
    }
  };

  return (
    <div className="flex flex-col gap-2 md:col-span-2">
      <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
        <span>{label}</span>
        <span className="text-[10px] text-slate-400 font-normal">Select applicable tags</span>
      </label>

      <div className="flex flex-wrap gap-2 p-3.5 bg-slate-50/60 border border-slate-200/80 rounded-2xl">
        {allOptions.map((option) => {
          const isSelected = option === "Other" ? isOtherSelected : selectedPresetSet.has(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggleTag(option)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? "bg-blue-950 text-white border border-blue-900 shadow-sm scale-[1.02]"
                  : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/70"
              }`}
            >
              {isSelected && <Check size={13} className="text-amber-400" />}
              <span>{option}</span>
            </button>
          );
        })}
      </div>

      {isOtherSelected && (
        <div className="mt-1 p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200/80 flex flex-col gap-1.5 transition-all">
          <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
            <Sparkles size={14} className="text-blue-600" />
            <span>Specify custom {label.toLowerCase()}:</span>
          </label>
          <input
            type="text"
            value={customText}
            onChange={(e) => handleCustomTextChange(e.target.value)}
            placeholder={`Type your custom ${label.toLowerCase()} here...`}
            className="w-full rounded-xl border border-blue-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 shadow-sm transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      )}
    </div>
  );
}

function CheckboxList({ label, values, options, onChange }: { label: string; values: string[]; options: string[]; onChange: (values: string[]) => void }) {
  const selected = new Set(values || []);
  return (
    <fieldset className="md:col-span-2">
      <legend className="mb-2.5 text-xs font-bold text-slate-800">{label}</legend>
      <div className="grid gap-2.5 md:grid-cols-2">
        {options.map((option) => {
          const isChecked = selected.has(option);
          return (
            <label
              key={option}
              className={`flex items-start gap-3 rounded-xl border p-3.5 text-xs font-semibold cursor-pointer transition-all ${
                isChecked
                  ? "bg-blue-50/60 border-blue-300 text-blue-950 shadow-sm"
                  : "bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/60 text-slate-700"
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => {
                  const next = new Set(selected);
                  if (next.has(option)) next.delete(option);
                  else next.add(option);
                  onChange(Array.from(next));
                }}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-900 focus:ring-blue-500"
              />
              <span className="leading-snug">{option}</span>
            </label>
          );
        })}
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
    <div className={`flex flex-col gap-1.5 text-xs font-bold text-slate-800 md:col-span-2 relative ${isOpen ? "z-50" : "z-10"}`} ref={dropdownRef}>
      <span>{label}</span>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[42px] rounded-xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-1.5 flex items-center justify-between gap-2 cursor-pointer focus-within:border-blue-600 focus-within:bg-white shadow-sm transition-all"
      >
        <div className="flex flex-wrap gap-1.5">
          {values && values.length > 0 ? (
            values.map(val => (
              <span key={val} className="inline-flex items-center gap-1.5 bg-blue-100/80 text-blue-900 text-xs font-semibold px-2.5 py-0.5 rounded-lg border border-blue-200">
                {val}
                <button
                  type="button"
                  onClick={(e) => removeOption(val, e)}
                  className="hover:text-red-600 focus:outline-none"
                >
                  <X size={12} />
                </button>
              </span>
            ))
          ) : (
            <span className="text-slate-400 font-medium">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={16} className="text-slate-400 shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute top-[100%] left-0 right-0 z-[100] mt-1 border border-slate-200 bg-white shadow-2xl rounded-2xl max-h-60 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <input
              type="text"
              placeholder="Search options..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium outline-none focus:border-blue-600 bg-white"
            />
          </div>
          <div className="overflow-y-auto flex-grow divide-y divide-slate-100">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-xs text-slate-400 font-medium text-center">No options found</div>
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
                    className={`flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold cursor-pointer hover:bg-slate-50 transition-colors ${isChecked ? "bg-blue-50/50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="shrink-0 rounded border-slate-300 text-blue-900 focus:ring-blue-500"
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
    <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-xs text-red-900 shadow-sm">
      <div className="flex items-center gap-2 font-bold"><AlertCircle size={16} className="text-red-600" /> {error || "Validation failed"}</div>
      {validationErrors && validationErrors.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {validationErrors.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}

function LoadingPanel() {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-8 text-xs font-bold text-slate-600 shadow-glass flex items-center justify-center gap-2">
      <Loader2 className="animate-spin text-blue-600" size={18} /> Loading onboarding dataset...
    </section>
  );
}

function useEntityProfile(type: "company" | "department") {
  const storedUser = getStoredUser();
  const storedOrg = storedUser?.organization || {};

  const initialOrg: Organization | null = storedUser?.organization
    ? storedUser.organization
    : storedUser?.organizationId
    ? ({
        id: storedUser.organizationId,
        name: storedUser.organizationName || (type === "company" ? "MahaCSR Corporate Partner" : "State Department"),
        organizationType: type === "company" ? "COMPANY" : "DEPARTMENT",
        kind: type === "company" ? "CSR_COMPANY" : "GOVERNMENT_DEPARTMENT",
        status: "REGISTERED",
        onboardingStatus: "DRAFT",
        documents: [],
      } as Organization)
    : null;

  const [organization, setOrganization] = useState<Organization | null>(initialOrg);
  const [profile, setProfile] = useState<Record<string, any>>({});
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    let fetchedOrg: any = null;
    let fetchedProfile: any = null;

    try {
      const data = await apiFetch<ProfileResponse>(`/onboarding/${type}/profile`);
      if (data) {
        fetchedOrg = data.organization || ((data as any).id ? data : null);
        fetchedProfile = data.profile || (data as any).govDeptProfile || (data as any).csrCompanyProfile || {};
      }
    } catch (err: any) {
      console.warn(`[useEntityProfile] ${type} profile fetch warning:`, err.message);
    }

    const orgToUse = fetchedOrg || initialOrg || {
      id: storedUser?.organizationId || storedOrg.id || `org-${Date.now()}`,
      organizationType: type === "company" ? "COMPANY" : "DEPARTMENT",
      kind: type === "company" ? "CSR_COMPANY" : "GOVERNMENT_DEPARTMENT",
      onboardingStatus: "DRAFT",
      status: "REGISTERED",
      documents: []
    };

    // Autofetch & prefill registration fields if missing in organization object
    const mergedOrg: Organization = {
      ...orgToUse,
      name: orgToUse.name || storedOrg.name || storedUser?.organizationName || (type === "company" ? "MahaCSR Corporate Partner" : "State Department"),
      legalName: orgToUse.legalName || storedOrg.legalName || orgToUse.name || storedOrg.name || "",
      displayName: orgToUse.displayName || storedOrg.displayName || orgToUse.name || storedOrg.name || "",
      cin: orgToUse.cin || storedOrg.cin || "",
      pan: orgToUse.pan || storedOrg.pan || "",
      gstin: orgToUse.gstin || orgToUse.gst || storedOrg.gstin || storedOrg.gst || "",
      officialEmail: orgToUse.officialEmail || orgToUse.email || storedOrg.officialEmail || storedOrg.email || storedUser?.email || "",
      officialPhone: orgToUse.officialPhone || orgToUse.phone || storedOrg.officialPhone || storedOrg.phone || storedUser?.mobile || storedUser?.phone || "",
      website: orgToUse.website || storedOrg.website || "",
      address: orgToUse.address || storedOrg.address || "",
      district: orgToUse.district || storedOrg.district || "Mumbai City",
      parentDepartment: orgToUse.parentDepartment || storedOrg.parentDepartment || "",
      departmentCode: orgToUse.departmentCode || storedOrg.departmentCode || "",
    };

    // Autofetch & prefill registration fields in profile object
    const rawProfile = fetchedProfile || {};
    const storedDeptProfile = storedOrg.govDeptProfile || {};
    const storedCsrProfile = storedOrg.csrCompanyProfile || {};

    const mergedProfile: Record<string, any> = {
      ...rawProfile,
      ...(type === "department" ? {
        nodalOfficerName: rawProfile.nodalOfficerName || storedDeptProfile.nodalOfficerName || "",
        nodalOfficerDesignation: rawProfile.nodalOfficerDesignation || storedDeptProfile.nodalOfficerDesignation || "",
        nodalOfficerEmail: rawProfile.nodalOfficerEmail || storedDeptProfile.nodalOfficerEmail || "",
        nodalOfficerMobile: rawProfile.nodalOfficerMobile || storedDeptProfile.nodalOfficerMobile || "",
        headOfDepartmentName: rawProfile.headOfDepartmentName || storedDeptProfile.headOfDepartmentName || "",
        headDesignation: rawProfile.headDesignation || storedDeptProfile.headDesignation || "",
        headEmail: rawProfile.headEmail || storedDeptProfile.headEmail || "",
        officeDescription: rawProfile.officeDescription || rawProfile.description || storedDeptProfile.description || (mergedOrg.address ? `Official CSR Cell & Administrative Office for ${mergedOrg.name}` : ""),
      } : {
        currentYearCsrBudget: rawProfile.currentYearCsrBudget ?? storedCsrProfile.currentYearCsrBudget,
        annualCsrBudget: rawProfile.annualCsrBudget ?? storedCsrProfile.annualCsrBudget,
        csrObligationAmount: rawProfile.csrObligationAmount ?? storedCsrProfile.csrObligationAmount,
        preferredDistricts: rawProfile.preferredDistricts?.length ? rawProfile.preferredDistricts : (storedCsrProfile.preferredDistricts || [mergedOrg.district].filter(Boolean)),
        preferredSectors: rawProfile.preferredSectors?.length ? rawProfile.preferredSectors : (storedCsrProfile.preferredSectors || []),
      })
    };

    setOrganization(mergedOrg);
    setProfile(mergedProfile);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const [clarificationResponseNotes, setClarificationResponseNotes] = useState("");
  const [companyDeclarationChecks, setCompanyDeclarationChecks] = useState<boolean[]>([false, false, false, false]);

  const org = organization || ({} as Organization);
  const data: Record<string, any> = { ...org, ...profile };

  const parseToArray = (val: any): string[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === "string") return val.split(",").map(s => s.trim()).filter(Boolean);
    return [];
  };

  const selectedDivisions = parseToArray(data.preferredDivisions);
  const selectedDistricts = parseToArray(data.preferredDistricts);
  const selectedCities = parseToArray(data.preferredCities);
  const selectedTalukas = parseToArray(data.preferredTalukas);

  const maharashtraState = locationData.find(s => s.name === "Maharashtra");
  const maharashtraDistrictsList = maharashtraState?.districts.map(d => d.name) || [];

  const availableDistrictsOptions = selectedDivisions.length > 0
    ? selectedDivisions.flatMap(div => DIVISION_TO_DISTRICTS[div] || [])
    : maharashtraDistrictsList;

  const availableCitiesOptions = selectedDistricts.length > 0
    ? maharashtraState?.districts.filter(d => selectedDistricts.includes(d.name)).flatMap(d => d.cities) || []
    : [];

  const availableTalukasOptions = selectedDistricts.length > 0
    ? maharashtraState?.districts.filter(d => selectedDistricts.includes(d.name)).flatMap(d => d.talukas) || []
    : [];

  const setData = (key: string, value: any) => {
    setOrganization((current) => current ? { ...current, [key]: value } : current);
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setValidationErrors([]);

    const currentIdx = companySteps.findIndex((s) => s.key === step);
    const nextStepKey = currentIdx < companySteps.length - 1 ? companySteps[currentIdx + 1].key : null;

    // Instant UI step transition (<10ms)
    if (nextStepKey) {
      setStep(nextStepKey as any);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Non-blocking background save
    const endpoint = step === "profile" ? "/onboarding/company/profile" : step === "compliance" ? "/onboarding/company/compliance" : "/onboarding/company/preferences";
    const method = step === "profile" ? "PUT" : "PATCH";

    apiFetch(endpoint, { method, body: JSON.stringify(data) }).catch((err) => {
      console.warn("[Company save] API endpoint background warning:", err.message);
    });
  };

  if (!organization) {
    return (
      <Shell title="CSR Company Onboarding" description="Complete company verification before CSR marketplace access." steps={companySteps} currentStep={step} onStepChange={setStep}>
        {error ? <ErrorBox error={error} /> : <LoadingPanel />}
      </Shell>
    );
  }

  if (step === "documents") return <DocumentsStep title="CSR Company Documents" steps={companySteps} currentStep={step} onStepChange={setStep} documentTypes={companyDocumentTypes} status={organization.onboardingStatus} />;

  if (step === "declaration") {
    const isClarification = (organization.onboardingStatus || organization.status || "").toUpperCase() === "CLARIFICATION_REQUIRED";
    const submit = async () => {
      setSaving(true);
      setError("");
      setValidationErrors([]);
      try {
        await apiFetch("/onboarding/company/submit", {
          method: "POST",
          body: JSON.stringify({
            ...data,
            declarationAccepted: true,
            responseNotes: clarificationResponseNotes || undefined
          })
        });
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
        {isClarification && (organization as any).clarificationRemarks && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-xs space-y-2 mb-4">
            <div className="flex items-center gap-2 font-extrabold text-amber-900 text-sm">
              <AlertCircle className="text-amber-600 shrink-0" size={18} />
              <span>Admin Clarification Requested</span>
            </div>
            <p className="text-xs text-amber-900 font-bold leading-relaxed">
              Remarks from Super Admin: <span className="font-normal text-amber-800">{(organization as any).clarificationRemarks}</span>
            </p>
          </div>
        )}
        <section className="rounded-3xl border border-white/80 bg-white/90 backdrop-blur-2xl p-6 md:p-8 shadow-glass space-y-5">
          {isClarification && (
            <div className="space-y-2 pb-4 border-b border-slate-100">
              <label className="block text-xs font-bold text-slate-900">
                Clarification Response Explanation for Super Admin
              </label>
              <textarea
                rows={3}
                value={clarificationResponseNotes}
                onChange={(e) => setClarificationResponseNotes(e.target.value)}
                placeholder="Explain the changes, corrections, or document re-uploads completed in response to the clarification request..."
                className="w-full text-xs p-3 rounded-xl border border-slate-300 outline-none focus:border-blue-700 font-medium"
              />
            </div>
          )}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mandatory Application Declarations</span>
              <button
                type="button"
                onClick={() => setCompanyDeclarationChecks(prev => prev.every(Boolean) ? [false, false, false, false] : [true, true, true, true])}
                className="text-xs font-extrabold text-blue-800 hover:text-blue-900 cursor-pointer hover:underline"
              >
                {companyDeclarationChecks.every(Boolean) ? "Deselect All" : "Select All"}
              </button>
            </div>
            {[
              "Information submitted is true and accurate.",
              "Company is authorized to participate in CSR project discovery and funding.",
              "Company agrees to portal verification and public-safe impact disclosure.",
              "Sensitive payment and compliance documents will not be public."
            ].map((text, idx) => {
              const isChecked = companyDeclarationChecks[idx];
              return (
                <label
                  key={idx}
                  onClick={() => {
                    setCompanyDeclarationChecks(prev => {
                      const next = [...prev];
                      next[idx] = !next[idx];
                      return next;
                    });
                  }}
                  className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none ${
                    isChecked
                      ? "bg-emerald-50/80 border-emerald-300 text-slate-900 shadow-xs ring-1 ring-emerald-500/20"
                      : "bg-slate-50/80 border-slate-200/80 text-slate-700 hover:border-slate-300 hover:bg-slate-100/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer accent-emerald-600 shrink-0"
                  />
                  <span className="text-xs md:text-sm font-semibold leading-relaxed">
                    {text}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <button
              onClick={submit}
              disabled={saving || !companyDeclarationChecks.every(Boolean)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 px-6 py-3 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all hover:scale-105 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <ShieldCheck size={16} />
              {saving ? "Submitting Application..." : isClarification ? "Submit Clarification Response & Re-submit Profile" : "Accept Declaration and Submit"}
            </button>
            {!companyDeclarationChecks.every(Boolean) && (
              <span className="text-[11px] text-amber-800 font-bold bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center gap-1.5">
                <AlertCircle size={14} className="text-amber-600 shrink-0" />
                Please check all declaration boxes above to proceed
              </span>
            )}
          </div>
        </section>
      </Shell>
    );
  }

  return (
    <Shell title={step === "profile" ? "CSR Company Profile" : step === "compliance" ? "CSR Applicability and Compliance" : "CSR Preference Setup"} description="Approved company onboarding is mandatory before showing interest or recording CSR funding." steps={companySteps} currentStep={step} onStepChange={setStep} status={organization.onboardingStatus}>
      <ErrorBox error={error} />
      <form onSubmit={save} className="rounded-3xl border border-white/80 bg-white/90 backdrop-blur-2xl p-6 md:p-8 shadow-glass flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {step === "profile" && (
          <>
            <Field label="Company Legal name" required value={data.legalName || data.name} onChange={(value) => setData("legalName", value)} />
            <Field label="Brand / display name" value={data.displayName} onChange={(value) => setData("displayName", value)} />
            <SelectField label="Organization type" required value={data.companyType} onChange={(value) => setData("companyType", value)} options={["Public Limited Company", "Private Limited Company", "Section 8 Company", "Government Company / PSU", "LLP", "Foreign Company", "Other"]} />
            <Field label="CIN / LLPIN" required format="cin" value={data.cin || data.llpin} onChange={(value) => data.companyType === "LLP" ? setData("llpin", value) : setData("cin", value)} />
            <Field label="PAN" required format="pan" value={data.pan} onChange={(value) => setData("pan", value)} />
            <div className="md:col-span-2">
              <GstVerificationField
                value={data.gstin || ""}
                onChange={(value) => {
                  setData("gstin", value);
                  if (value && value.length >= 12) {
                    const panFromGstin = value.substring(2, 12).toUpperCase();
                    if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panFromGstin)) {
                      setData("pan", panFromGstin);
                    }
                  }
                }}
                entityType="ORGANIZATION"
                entityId={organization.id}
                source="onboarding"
                onVerified={(result) => {
                  const extractedPan = result.data.pan || (data.gstin && data.gstin.length >= 12 ? data.gstin.substring(2, 12).toUpperCase() : "");
                  if (extractedPan) setData("pan", extractedPan);
                  if (result.data.legalName) setData("legalName", result.data.legalName);
                  if (result.data.tradeName) setData("displayName", result.data.tradeName);
                  const incorporationYear = yearFromGstRegistrationDate(result.data.registrationDate);
                  if (incorporationYear) setData("yearOfIncorporation", incorporationYear);
                  if (result.data.address) {
                    setData("address", result.data.address);
                    setData("registeredOfficeAddress", result.data.address);
                    setData("corporateOfficeAddress", result.data.address);
                  }
                  if (result.data.district) setData("district", result.data.district);
                }}
              />
            </div>
            <TextAreaField label="Registered office address" value={data.registeredOfficeAddress || data.address} onChange={(value) => setData("registeredOfficeAddress", value)} />
            <TextAreaField label="Corporate office address" value={data.corporateOfficeAddress} onChange={(value) => setData("corporateOfficeAddress", value)} />
            <SelectField label="District" value={data.district} onChange={(value) => setData("district", value)} options={["Select District", ...(maharashtraState?.districts.map(d => d.name) || [])]} />
            <Field label="Official website" value={data.website} onChange={(value) => setData("website", value)} />
            <Field label="Official email" required format="email" value={data.officialEmail || data.email} onChange={(value) => setData("officialEmail", value)} />
            <Field label="Contact Number" format="phone" value={data.officialPhone || data.phone} onChange={(value) => setData("officialPhone", value)} />
            <Field label="Year of incorporation" type="number" value={data.yearOfIncorporation} onChange={(value) => setData("yearOfIncorporation", value)} />
          </>
        )}
        {step === "compliance" && (
          <>
            <SelectField
              label="Covered under Section 135 CSR provisions"
              value={data.csrApplicable ? "Yes" : "No"}
              onChange={(value) => setData("csrApplicable", value === "Yes")}
              options={["Yes", "No"]}
              infoUrl="/docs/Section_135_CSR (2).pdf"
            />
            <SelectField label="Financial year" required value={data.financialYear || "FY 2025-26"} onChange={(value) => setData("financialYear", value)} options={["FY 2026-27", "FY 2025-26", "FY 2024-25", "FY 2023-24", "FY 2022-23", "FY 2021-22"]} />
            <Field label="Net worth (INR)" type="number" value={data.netWorth} onChange={(value) => setData("netWorth", value)} />
            <Field label="Turnover (INR)" type="number" value={data.turnover} onChange={(value) => setData("turnover", value)} />
            <Field label="Net profit (INR)" type="number" value={data.netProfit} onChange={(value) => setData("netProfit", value)} />
            <Field label="Average net profit last 3 years (INR)" type="number" value={data.averageNetProfit} onChange={(value) => setData("averageNetProfit", value)} />
            <Field label="CSR budget current financial year (INR)" required type="number" value={data.currentYearCsrBudget} onChange={(value) => setData("currentYearCsrBudget", value)} />
          </>
        )}
        {step === "preferences" && (
          <>
            <MultiSelectField
              label="Preferred divisions"
              values={selectedDivisions}
              options={Object.keys(DIVISION_TO_DISTRICTS)}
              onChange={(values) => {
                const validDistricts = values.flatMap(div => DIVISION_TO_DISTRICTS[div] || []);
                const nextDistricts = selectedDistricts.filter(d => validDistricts.includes(d));
                const validCities = maharashtraState?.districts.filter(d => nextDistricts.includes(d.name)).flatMap(d => d.cities) || [];
                const nextCities = selectedCities.filter(c => validCities.includes(c));
                const validTalukas = maharashtraState?.districts.filter(d => nextDistricts.includes(d.name)).flatMap(d => d.talukas) || [];
                const nextTalukas = selectedTalukas.filter(t => validTalukas.includes(t));

                setData("preferredDivisions", values);
                setData("preferredDistricts", nextDistricts);
                setData("preferredCities", nextCities);
                setData("preferredTalukas", nextTalukas);
              }}
              placeholder="Select preferred divisions"
            />
            <MultiSelectField
              label="Preferred districts"
              values={selectedDistricts}
              options={availableDistrictsOptions}
              onChange={(values) => {
                const validCities = maharashtraState?.districts.filter(d => values.includes(d.name)).flatMap(d => d.cities) || [];
                const nextCities = selectedCities.filter(c => validCities.includes(c));
                const validTalukas = maharashtraState?.districts.filter(d => values.includes(d.name)).flatMap(d => d.talukas) || [];
                const nextTalukas = selectedTalukas.filter(t => validTalukas.includes(t));

                setData("preferredDistricts", values);
                setData("preferredCities", nextCities);
                setData("preferredTalukas", nextTalukas);
              }}
              placeholder="Select preferred districts"
            />
            <MultiSelectField
              label="Preferred talukas (Optional)"
              values={selectedTalukas}
              options={availableTalukasOptions}
              onChange={(values) => setData("preferredTalukas", values)}
              placeholder={selectedDistricts.length > 0 ? "Select preferred talukas" : "Select districts first"}
            />
            <MultiSelectField
              label="Preferred cities (Optional)"
              values={selectedCities}
              options={availableCitiesOptions}
              onChange={(values) => setData("preferredCities", values)}
              placeholder={selectedDistricts.length > 0 ? "Select preferred cities" : "Select districts first"}
            />
            <CheckboxList label="Preferred sectors" values={data.preferredSectors || []} options={scheduleAreas} onChange={(values) => setData("preferredSectors", values)} />
            <SelectField label="Funding preference" value={data.fundingPreference} onChange={(value) => setData("fundingPreference", value)} options={["Full funding", "Partial funding", "Co-funding"]} />
            <SelectField label="Implementation preference" value={data.implementationPreference} onChange={(value) => setData("implementationPreference", value)} options={["Direct asset delivery", "NGO/Agency implementation"]} />
            <TagSelectorField
              label="Preferred beneficiary groups"
              values={data.preferredBeneficiaryGroups}
              options={beneficiaryGroupOptions}
              onChange={(values) => setData("preferredBeneficiaryGroups", values)}
            />
            <TagSelectorField
              label="SDG focus areas"
              values={data.sdgFocusAreas}
              options={sdgFocusOptions}
              onChange={(values) => setData("sdgFocusAreas", values)}
            />
            <TagSelectorField
              label="ESG focus areas"
              values={data.esgFocusAreas}
              options={esgFocusOptions}
              onChange={(values) => setData("esgFocusAreas", values)}
            />
          </>
        )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 px-6 py-3 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all hover:scale-105 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Saving Onboarding Step..." : "Save & Proceed to Next Step"}
          </button>
        </div>
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
  const [uploadingMap, setUploadingMap] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);



  const load = async () => {
    try {
      setDocuments(await apiFetch<OrganizationDocument[]>("/onboarding/documents"));
    } catch (err: any) {
      setError(err.message || "Unable to load documents");
    }
  };
  useEffect(() => { load(); }, []);

  const handleSpecificUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingMap((prev) => ({ ...prev, [type]: true }));
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers,
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "File upload failed");

      await apiFetch("/onboarding/documents", {
        method: "POST",
        body: JSON.stringify({
          documentType: type,
          fileUrl: data.url,
          fileName: file.name,
          mimeType: file.type || "application/pdf",
          fileSize: Number(data.bytes || file.size)
        })
      });

      event.target.value = "";
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to upload and save document");
      event.target.value = "";
    } finally {
      setUploadingMap((prev) => {
        const copy = { ...prev };
        delete copy[type];
        return copy;
      });
    }
  };

  const matchFileType = (fileName: string, availableTypes: string[]): string | null => {
    const upper = fileName.toUpperCase().replace(/[^A-Z0-9]/g, " ");
    for (const type of availableTypes) {

      const words = type.split("_");
      if (upper.includes(type) || words.every((w) => upper.includes(w))) {
        return type;
      }
    }
    if (upper.includes("PAN")) return availableTypes.find((t) => t.includes("PAN")) || null;
    if (upper.includes("GST")) return availableTypes.find((t) => t.includes("GST")) || null;
    if (upper.includes("CIN") || upper.includes("INCORPORATION")) return availableTypes.find((t) => t.includes("INCORPORATION")) || null;
    if (upper.includes("BOARD") || upper.includes("RESOLUTION")) return availableTypes.find((t) => t.includes("BOARD")) || null;
    if (upper.includes("POLICY")) return availableTypes.find((t) => t.includes("POLICY")) || null;
    if (upper.includes("DECLARATION")) return availableTypes.find((t) => t.includes("DECLARATION")) || null;
    if (upper.includes("AUTHORIZATION")) return availableTypes.find((t) => t.includes("AUTHORIZATION")) || null;
    if (upper.includes("FINANCIAL") || upper.includes("AUDIT")) return availableTypes.find((t) => t.includes("FINANCIAL")) || null;
    if (upper.includes("REPORT") || upper.includes("ANNUAL")) return availableTypes.find((t) => t.includes("REPORT") || t.includes("ANNUAL")) || null;
    return null;
  };

  const _handleBatchUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setError("");
    const pendingTypes = documentTypes.filter((t) => !documents.some((d) => d.documentType === t));
    const assignedPairs: Array<{ file: File; type: string }> = [];
    const usedTypes = new Set<string>();

    files.forEach((file) => {
      const matched = matchFileType(file.name, documentTypes);
      if (matched && !usedTypes.has(matched) && !documents.some((d) => d.documentType === matched)) {
        usedTypes.add(matched);
        assignedPairs.push({ file, type: matched });
      }
    });

    files.forEach((file) => {
      if (!assignedPairs.some((p) => p.file === file)) {
        const nextAvailable = pendingTypes.find((t) => !usedTypes.has(t));
        if (nextAvailable) {
          usedTypes.add(nextAvailable);
          assignedPairs.push({ file, type: nextAvailable });
        }
      }
    });

    if (assignedPairs.length === 0) return;

    const initialMap: Record<string, boolean> = {};
    assignedPairs.forEach((pair) => {
      initialMap[pair.type] = true;
    });
    setUploadingMap((prev) => ({ ...prev, ...initialMap }));

    await Promise.allSettled(
      assignedPairs.map(async ({ file, type }) => {
        try {
          const formData = new FormData();
          formData.append("file", file);

          const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;

          const res = await fetch(`${API_BASE_URL}/upload`, {
            method: "POST",
            headers,
            body: formData
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "File upload failed");

          await apiFetch("/onboarding/documents", {
            method: "POST",
            body: JSON.stringify({
              documentType: type,
              fileUrl: data.url,
              fileName: file.name,
              mimeType: file.type || "application/pdf",
              fileSize: Number(data.bytes || file.size)
            })
          });
        } catch (err: any) {
          setError((prev) => (prev ? `${prev} | ${type}: ${err.message}` : `${type}: ${err.message}`));
        } finally {
          setUploadingMap((prev) => {
            const copy = { ...prev };
            delete copy[type];
            return copy;
          });
        }
      })
    );

    event.target.value = "";
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    setDeletingId(id);
    setError("");
    try {
      await apiFetch(`/onboarding/documents/${id}`, {
        method: "DELETE"
      });
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  };

  const isMandatoryDoc = (type: string): boolean => {
    const mandatoryList = [
      "CERTIFICATE_OF_INCORPORATION",
      "PAN_CARD",
      "GST_CERTIFICATE",
      "DEPARTMENT_AUTHORIZATION"
    ];
    return mandatoryList.includes(type);
  };

  const handleContinue = () => {
    const currentIdx = steps.findIndex((s) => s.key === currentStep);
    if (currentIdx < steps.length - 1) {
      onStepChange(steps[currentIdx + 1].key);
    }
  };

  return (
    <Shell title={title} description="Upload onboarding verification documents. Each document type below has a dedicated upload slot. Mandatory documents are marked with a red star (*)." steps={steps} currentStep={currentStep} onStepChange={onStepChange} status={status}>
      <ErrorBox error={error} />

      <div className="rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="border-b border-slate-100 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck size={18} className="text-blue-900" />
              <span>Required Verification Documents</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Please provide official files for each required document type below</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-xs font-extrabold text-slate-900">
                {documents.length} of {documentTypes.length} Uploaded
              </span>
              <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200 mt-1">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, (documents.length / documentTypes.length) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

       

        <div className="p-5 sm:p-6 flex flex-col gap-3 bg-slate-50/30">
          {documentTypes.map((type) => {
            const uploadedDoc = documents.find((doc) => doc.documentType === type);
            const isUploading = Boolean(uploadingMap[type]);
            const isMandatory = isMandatoryDoc(type);

            const metaMap: Record<string, { title: string; description: string; tag?: string }> = {
              DEPARTMENT_AUTHORIZATION: {
                title: "Department Authorization / Creation Order",
                description: "Establishes that the sub-department/office is officially recognized under the parent organization.",
                tag: "Mandatory"
              },
              NODAL_OFFICER_APPOINTMENT: {
                title: "Nodal Officer Appointment Order",
                description: "Official nomination or appointment order establishing the authorized Nodal Officer (optional).",
                tag: "Optional"
              },
              NODAL_OFFICER_ID: {
                title: "Nodal Officer ID Proof",
                description: "Government employee or official ID for verifying the Nodal Officer (optional).",
                tag: "Optional"
              },
              OFFICE_ORDER: {
                title: "Office Order",
                description: "Useful where the authorization or officer nomination isn't sufficiently clear.",
                tag: "Optional"
              },
              GOVERNMENT_ORDER: {
                title: "Government Order (GR/GO)",
                description: "Official GR/GO establishing the sub-department (optional).",
                tag: "Optional"
              },
              JURISDICTION_PROOF: {
                title: "Jurisdiction Proof",
                description: "Require only where the sub-department's geographic/administrative jurisdiction cannot be determined from parent or authorization order.",
                tag: "Conditional"
              }
            };

            const meta = metaMap[type];
            const displayTitle = meta?.title || type.replace(/_/g, " ");
            const displayDesc = meta?.description;

            return (
              <div
                key={type}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-4.5 rounded-2xl border transition-all duration-200 gap-4 ${
                  isUploading
                    ? "bg-blue-50/70 border-blue-400/80 ring-2 ring-blue-500/20 shadow-md"
                    : uploadedDoc
                    ? "bg-white border-slate-200/80 hover:border-emerald-300 hover:shadow-sm"
                    : "bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 flex items-center justify-center shrink-0 rounded-2xl border transition-colors ${
                    isUploading
                      ? "bg-blue-100 border-blue-300 text-blue-700"
                      : uploadedDoc
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                      : "bg-slate-100 border-slate-200 text-slate-500"
                  }`}>
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    ) : uploadedDoc ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex flex-col">
                    <div className="text-xs font-extrabold text-slate-900 flex items-center gap-2 flex-wrap">
                      <span>{displayTitle}</span>
                      {isMandatory ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200">
                          Mandatory *
                        </span>
                      ) : meta?.tag === "Conditional" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                          Conditional
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
                          Optional
                        </span>
                      )}
                    </div>
                    {displayDesc && (
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5 max-w-xl">
                        {displayDesc}
                      </p>
                    )}

                    {isUploading ? (
                      <span className="text-[11px] text-blue-700 font-bold flex items-center gap-1.5 mt-0.5">
                        <Loader2 size={12} className="animate-spin text-blue-600" /> Encrypting & Uploading...
                      </span>
                    ) : uploadedDoc ? (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-600 font-medium truncate max-w-[240px] sm:max-w-[320px]">
                          {uploadedDoc.fileName || "uploaded_document.pdf"}
                        </span>
                        {uploadedDoc.fileSize && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({(uploadedDoc.fileSize / 1024).toFixed(0)} KB)
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        Pending Upload
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center">
                  {uploadedDoc ? (
                    <>
                      <Badge>{uploadedDoc.verificationStatus}</Badge>
                      <a
                        href={uploadedDoc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                      >
                        <Eye size={13} className="text-slate-500" />
                        <span>View</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(uploadedDoc.id)}
                        disabled={deletingId === uploadedDoc.id}
                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-red-200 bg-red-50/60 px-3 text-xs font-bold text-red-700 hover:bg-red-100 transition-all"
                      >
                        {deletingId === uploadedDoc.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                        <span>{deletingId === uploadedDoc.id ? "Deleting..." : "Delete"}</span>
                      </button>
                    </>
                  ) : (
                    <label className={`inline-flex h-9 items-center justify-center gap-2 rounded-xl text-xs font-bold shadow-sm transition-all px-4 ${
                      isUploading
                        ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-wait opacity-90"
                        : "bg-white text-blue-950 border border-slate-300 hover:border-blue-900 hover:bg-blue-50/50 hover:shadow cursor-pointer"
                    }`}>
                      {isUploading ? (
                        <>
                          <Loader2 size={14} className="animate-spin text-blue-600" />
                          <span>Uploading…</span>
                        </>
                      ) : (
                        <>
                          <Upload size={14} className="text-blue-900" />
                          <span>Upload File</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        onChange={(e) => handleSpecificUpload(e, type)}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-5 border-t border-slate-100 bg-white flex justify-end">
          <button
            type="button"
            onClick={handleContinue}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 px-7 py-3 text-xs font-extrabold text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.01]"
          >
            <span>Save & Continue to Next Step</span>
            <ChevronDown size={16} className="-rotate-90" />
          </button>
        </div>
      </div>
    </Shell>
  );
}

export function DepartmentOnboardingStep() {
  const router = useRouter();
  const [step, setStep] = useState<"profile" | "nodal-officer" | "jurisdiction" | "documents" | "declaration">("profile");
  const { organization, profile, setOrganization, setProfile, error, setError, load } = useEntityProfile("department");
  const [saving, setSaving] = useState(false);
  const [clarificationResponseNotes, setClarificationResponseNotes] = useState("");
  const [deptDeclarationChecks, setDeptDeclarationChecks] = useState<boolean[]>([false, false, false]);

  const org = organization || ({} as Organization);
  const data: Record<string, any> = { ...org, ...profile };

  const storedUser = getStoredUser();
  const parentOrgName =
    data.parentOrganization?.name ||
    data.parentOrganizationName ||
    storedUser?.organization?.parentOrganization?.name ||
    storedUser?.parentOrganizationName ||
    "";

  const isSubDeptEntity = Boolean(
    data.parentOrganizationId ||
    data.parentOrganization ||
    data.isSubDept ||
    parentOrgName
  );

  const nameLower = (data.name || "").toLowerCase();
  const isMainApexEntity =
    !isSubDeptEntity &&
    (nameLower.includes("collectorate") ||
      nameLower.includes("zilla parishad") ||
      nameLower.includes("municipal") ||
      nameLower.includes("secretariat") ||
      nameLower.includes("mantralaya") ||
      nameLower.includes("commissionerate") ||
      ["COLLECTORATE", "ZILLA_PARISHAD", "MUNICIPAL_CORPORATION"].includes(
        (data.governmentType || "").toUpperCase()
      ));

  const setData = (key: string, value: any) => {
    setOrganization((current) => current ? { ...current, [key]: value } : current);
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const parseToArray = (val: any): string[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === "string") return val.split(",").map(s => s.trim()).filter(Boolean);
    return [];
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    const currentIdx = departmentSteps.findIndex((s) => s.key === step);
    const nextStepKey = currentIdx < departmentSteps.length - 1 ? departmentSteps[currentIdx + 1].key : null;

    // Instant UI step transition (<10ms)
    if (nextStepKey) {
      setStep(nextStepKey as any);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Non-blocking background save
    const endpoint =
      step === "profile"
        ? "/onboarding/department/profile"
        : step === "nodal-officer"
        ? "/onboarding/department/nodal"
        : step === "jurisdiction"
        ? "/onboarding/department/jurisdiction"
        : "/onboarding/department/profile";

    apiFetch(endpoint, { method: "PUT", body: JSON.stringify(data) }).catch((err) => {
      console.warn("[Dept save] API endpoint background warning:", err.message);
    });
  };

  if (!organization) {
    return (
      <Shell title="Government Department Onboarding" description="Register state department office details for CSR proposal creation." steps={departmentSteps} currentStep={step} onStepChange={setStep}>
        {error ? <ErrorBox error={error} /> : <LoadingPanel />}
      </Shell>
    );
  }

  if (step === "documents") {
    const docTypes = isMainApexEntity ? parentDepartmentDocumentTypes : subDepartmentDocumentTypes;
    const docTitle = isMainApexEntity ? "Main Parent Organization Documents" : "Sub-Department Documents";
    return <DocumentsStep title={docTitle} steps={departmentSteps} currentStep={step} onStepChange={setStep} documentTypes={docTypes} status={organization.onboardingStatus} />;
  }

  if (step === "declaration") {
    const isClarification = (organization.onboardingStatus || organization.status || "").toUpperCase() === "CLARIFICATION_REQUIRED";
    const submit = async () => {
      setSaving(true);
      setError("");
      try {
        await apiFetch("/onboarding/department/submit", {
          method: "POST",
          body: JSON.stringify({
            declarationAccepted: true,
            responseNotes: clarificationResponseNotes || undefined
          })
        }).catch(async () => {
          await apiFetch(`/government-onboarding/${organization.id}/submit`, {
            method: "POST",
            body: JSON.stringify({
              formData: data,
              documents: organization.documents || []
            })
          });
        });
        await load();
        router.push("/organization/onboarding/status");
      } catch (err: any) {
        setError(err.message || "Unable to submit onboarding");
      } finally {
        setSaving(false);
      }
    };
    return (
      <Shell title="Government Department Declaration" description="Submit verified department onboarding details." steps={departmentSteps} currentStep={step} onStepChange={setStep} status={organization.onboardingStatus}>
        <ErrorBox error={error} />
        {isClarification && (organization as any).clarificationRemarks && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-xs space-y-2 mb-4">
            <div className="flex items-center gap-2 font-extrabold text-amber-900 text-sm">
              <AlertCircle className="text-amber-600 shrink-0" size={18} />
              <span>Admin Clarification Requested</span>
            </div>
            <p className="text-xs text-amber-900 font-bold leading-relaxed">
              Remarks from Approval Authority: <span className="font-normal text-amber-800">{(organization as any).clarificationRemarks}</span>
            </p>
          </div>
        )}
        <section className="rounded-3xl border border-white/80 bg-white/90 backdrop-blur-2xl p-6 md:p-8 shadow-glass space-y-5">
          {isClarification && (
            <div className="space-y-2 pb-4 border-b border-slate-100">
              <label className="block text-xs font-bold text-slate-900">
                Clarification Response Explanation for Reviewing Authority
              </label>
              <textarea
                rows={3}
                value={clarificationResponseNotes}
                onChange={(e) => setClarificationResponseNotes(e.target.value)}
                placeholder="Explain the changes, corrections, or document re-uploads completed in response to the clarification request..."
                className="w-full text-xs p-3 rounded-xl border border-slate-300 outline-none focus:border-blue-700 font-medium"
              />
            </div>
          )}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mandatory Department Declarations</span>
              <button
                type="button"
                onClick={() => setDeptDeclarationChecks(prev => prev.every(Boolean) ? [false, false, false] : [true, true, true])}
                className="text-xs font-extrabold text-blue-800 hover:text-blue-900 cursor-pointer hover:underline"
              >
                {deptDeclarationChecks.every(Boolean) ? "Deselect All" : "Select All"}
              </button>
            </div>
            {[
              "Department details, government orders, and office mandates are authentic government records.",
              "Designated Nodal Officer and Head of Department hold legal authorization to submit CSR pitches.",
              "I have read, understood, and accept the Government CSR Portal Terms & Conditions and Platform Usage Policy."
            ].map((text, idx) => {
              const isChecked = deptDeclarationChecks[idx];
              return (
                <label
                  key={idx}
                  onClick={() => {
                    setDeptDeclarationChecks(prev => {
                      const next = [...prev];
                      next[idx] = !next[idx];
                      return next;
                    });
                  }}
                  className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none ${
                    isChecked
                      ? "bg-emerald-50/80 border-emerald-300 text-slate-900 shadow-xs ring-1 ring-emerald-500/20"
                      : "bg-slate-50/80 border-slate-200/80 text-slate-700 hover:border-slate-300 hover:bg-slate-100/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer accent-emerald-600 shrink-0"
                  />
                  <span className="text-xs md:text-sm font-semibold leading-relaxed">
                    {text}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <button
              onClick={submit}
              disabled={saving || !deptDeclarationChecks.every(Boolean)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 px-6 py-3.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all hover:scale-105 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <ShieldCheck size={16} />
              {saving ? "Submitting Application..." : isClarification ? "Submit Clarification Response & Re-submit Profile" : "Accept Declaration and Submit for Verification"}
            </button>
            {!deptDeclarationChecks.every(Boolean) && (
              <span className="text-[11px] text-amber-800 font-bold bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center gap-1.5">
                <AlertCircle size={14} className="text-amber-600 shrink-0" />
                Please check all declaration boxes above to proceed
              </span>
            )}
          </div>
        </section>
      </Shell>
    );
  }

  return (
    <Shell title={step === "profile" ? (isMainApexEntity ? "Organization Profile" : "Department Profile") : step === "nodal-officer" ? "Nodal Officer & HOD Details" : "Department Jurisdiction & Focus"} description="Official government onboarding before creating CSR pitches." steps={departmentSteps} currentStep={step} onStepChange={setStep} status={organization.onboardingStatus}>
      <ErrorBox error={error} />
      <form onSubmit={save} className="rounded-3xl border border-white/80 bg-white/90 backdrop-blur-2xl p-6 md:p-8 shadow-glass flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {step === "profile" && (
          <>
            <Field label={isMainApexEntity ? "Organization name" : "Department name"} required value={data.name} onChange={(value) => setData("name", value)} />
            {!isMainApexEntity && (
              <Field
                label="Parent administrative department"
                required={!isMainApexEntity}
                value={data.parentDepartment || parentOrgName}
                onChange={(value) => setData("parentDepartment", value)}
                placeholder={isSubDeptEntity ? "Autofilled from parent organization" : "e.g. Department of Public Health"}
              />
            )}
            <Field label={isMainApexEntity ? "Organization code / identifier" : "Department code / identifier"} value={data.departmentCode} onChange={(value) => setData("departmentCode", value)} placeholder="e.g. MH-GOV-PN-01" />
            <TextAreaField label="Office mandate / description" required value={data.officeDescription || data.description} onChange={(value) => setData("officeDescription", value)} placeholder="Describe the statutory role, office mandate, and key objectives of this department..." />
            <TextAreaField label="Office address" required value={data.address} onChange={(value) => setData("address", value)} />
            <SelectField label="District" required value={data.district} onChange={(value) => setData("district", value)} options={["Select District", ...(maharashtraState?.districts.map(d => d.name) || [])]} />
            <Field label="Official website" value={data.website} onChange={(value) => setData("website", value)} placeholder="https://..." />
            <Field label="Official email" required format="email" value={data.officialEmail || data.email} onChange={(value) => setData("officialEmail", value)} />
            <Field label="Office landline / phone" format="phone" value={data.officialPhone || data.phone} onChange={(value) => setData("officialPhone", value)} />
          </>
        )}
        {step === "nodal-officer" && (
          <>
            <div className="md:col-span-2 p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 mb-2">
              <h4 className="text-xs font-extrabold text-blue-950 mb-1">
                {isMainApexEntity ? "Head of Organization Details" : "Head of Department Details"}
              </h4>
              <p className="text-[11px] text-blue-800 font-medium">
                {isMainApexEntity ? "Head of Organization details are recorded for administrative accountability and official verification." : "Head of Department details are recorded for administrative accountability and official verification."}
              </p>
            </div>
            <Field
              label={isMainApexEntity ? "Head of Organization full name" : "Head of Department full name"}
              required
              value={data.headOfDepartmentName}
              onChange={(value) => setData("headOfDepartmentName", value)}
            />
            <Field label="Head official designation" required value={data.headDesignation} onChange={(value) => setData("headDesignation", value)} />
            <Field label="Head official email" required format="email" value={data.headEmail} onChange={(value) => setData("headEmail", value)} />

            <div className="md:col-span-2 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 my-2">
              <h4 className="text-xs font-extrabold text-indigo-950 mb-1">Designated Nodal Officer Details (Optional)</h4>
              <p className="text-[11px] text-indigo-800 font-medium">The Nodal Officer can be assigned now or added later by the Organization Head from the dashboard.</p>
            </div>
            <Field label="Nodal officer full name" value={data.nodalOfficerName} onChange={(value) => setData("nodalOfficerName", value)} />
            <Field label="Official designation" value={data.nodalOfficerDesignation} onChange={(value) => setData("nodalOfficerDesignation", value)} />
            <Field label="Official email address" format="email" value={data.nodalOfficerEmail} onChange={(value) => setData("nodalOfficerEmail", value)} />
            <Field label="Mobile number" format="phone" value={data.nodalOfficerMobile} onChange={(value) => setData("nodalOfficerMobile", value)} />
            <SelectField label="Government ID type" value={data.nodalOfficerGovtIdType} onChange={(value) => setData("nodalOfficerGovtIdType", value)} options={["Government Employee ID Card", "Aadhaar Card", "PAN Card", "Official Passport"]} />
            <Field label="Government ID number" value={data.nodalOfficerGovtIdNumber} onChange={(value) => setData("nodalOfficerGovtIdNumber", value)} />
          </>
        )}

        {step === "jurisdiction" && (
          <>
            <TextAreaField label="Jurisdiction & service area description" value={data.jurisdiction} onChange={(value) => setData("jurisdiction", value)} placeholder="Specify administrative boundaries, talukas/wards covered, or target service zones (e.g., Entire Pune District covering 14 Talukas, Gram Panchayats, and Municipal zones for district-level CSR initiatives)..." />
            <TagSelectorField label="Department focus sectors" values={parseToArray(data.departmentSectors)} options={departmentSectors} onChange={(values: string[]) => setData("departmentSectors", values)} />
            <MultiSelectField label="Target beneficiary groups" values={parseToArray(data.preferredBeneficiaryGroups)} options={beneficiaryGroupOptions} onChange={(values) => setData("preferredBeneficiaryGroups", values)} placeholder="Select beneficiary groups" />
            <MultiSelectField label="Priority Sustainable Development Goals (SDGs)" values={parseToArray(data.sdgFocusAreas)} options={sdgFocusOptions} onChange={(values) => setData("sdgFocusAreas", values)} placeholder="Select target SDGs" />
          </>
        )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 px-6 py-3.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all hover:scale-105 disabled:opacity-50 cursor-pointer"
          >
            <Save size={16} />
            {saving ? "Saving Department Step..." : "Save & Proceed to Next Step"}
          </button>
        </div>
      </form>
    </Shell>
  );
}

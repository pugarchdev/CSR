"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileCheck,
  Landmark,
  Building2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  Edit2,
  Check,
  X,
  RotateCcw
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { locationData, allStatesList } from "@/lib/locationData";
import { FieldFormat, sanitizeField, validateField } from "@/lib/validation";
import { useAuthStore } from "@/store/authStore";

const FIELD_FORMATS: Record<string, FieldFormat> = {
  email: "email",
  pan: "pan",
  gst: "gst"
};

const MAX_RESENDS = 5;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStepState] = useState<number>(2);

  const setStep = (newStep: number) => {
    setStepState(newStep);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("corporate_register_step", String(newStep));
      const url = new URL(window.location.href);
      url.searchParams.set("step", String(newStep));
      window.history.replaceState({}, "", url.toString());
    }
  };

  const [role, setRole] = useState<"GOV_ENTITY" | "CORPORATE">("CORPORATE");
  const [otp, setOtp] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [isRegisteringInBackground, setIsRegisteringInBackground] = useState(false);
  const [isVerifiedSuccess, setIsVerifiedSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Timer & Resend state
  const [timer, setTimer] = useState(60);
  const [resendAttempts, setResendAttempts] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Email Editing state
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editEmailInput, setEditEmailInput] = useState("");
  const [editEmailError, setEditEmailError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    registrationCategory: "GOVT_PARENT_ORG" as "GOVT_PARENT_ORG" | "GOVT_DEPARTMENT",
    parentOrganizationId: "",
    parentRegistrationCode: "",
    orgType: "Municipal Corporation",
    adminLevel: "Local Body",
    parentOrganization: "None / Not Applicable",
    officialRegNo: "",
    deptOfficeCode: "",
    website: "",
    addressLine1: "",
    addressLine2: "",
    city: "Nagpur City",
    taluka: "Nagpur Urban",
    district: "Nagpur",
    state: "Maharashtra",
    pincode: "",
    firstName: "",
    lastName: "",
    designation: "",
    employeeId: "",
    mobile: "",
    email: "",
    password: "",
    pan: "",
    address: "",
    registrationNumber: "",
    darpanNumber: "",
    csr1Number: "",
    cin: "",
    gst: "",
    csrBudget: ""
  });

  const [customState, setCustomState] = useState("");
  const [customDistrict, setCustomDistrict] = useState("");
  const [customCity, _setCustomCity] = useState("");
  const [customTaluka, _setCustomTaluka] = useState("");

  const selectedStateInfo = locationData.find((s) => s.name === formData.state);
  const availableDistricts = selectedStateInfo ? selectedStateInfo.districts : [];

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const stepParam = params.get("step");
      const emailParam = params.get("email");
      
      let initialStep = 2;
      if (stepParam && [2, 3].includes(Number(stepParam))) {
        initialStep = Number(stepParam);
      } else {
        const saved = sessionStorage.getItem("corporate_register_step");
        if (saved && [2, 3].includes(Number(saved))) {
          initialStep = Number(saved);
        }
      }
      
      if (initialStep !== 2) {
        setStepState(initialStep);
      }

      if (emailParam) {
        setFormData((prev) => ({ ...prev, email: emailParam }));
      }
    }
  }, []);



  // Timer countdown effect for Step 3
  useEffect(() => {
    if (step !== 3) return;
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const handleStateChange = (stateName: string) => {
    setFormData((prev) => {
      const stateInfo = locationData.find((s) => s.name === stateName);
      const defaultDistrict = stateInfo && stateInfo.districts.length > 0 ? stateInfo.districts[0].name : "Other";
      const districtInfo = stateInfo && stateInfo.districts.length > 0 ? stateInfo.districts[0] : null;
      const defaultCity = districtInfo && districtInfo.cities.length > 0 ? districtInfo.cities[0] : "Other";
      const defaultTaluka = districtInfo && districtInfo.talukas.length > 0 ? districtInfo.talukas[0] : "Other";

      return {
        ...prev,
        state: stateName,
        district: defaultDistrict,
        city: defaultCity,
        taluka: defaultTaluka
      };
    });

    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy.state;
      delete copy.district;
      delete copy.city;
      delete copy.taluka;
      return copy;
    });
  };

  const handleDistrictChange = (districtName: string) => {
    setFormData((prev) => {
      const stateInfo = locationData.find((s) => s.name === prev.state);
      const districtInfo = stateInfo ? stateInfo.districts.find((d) => d.name === districtName) : null;
      const defaultCity = districtInfo && districtInfo.cities.length > 0 ? districtInfo.cities[0] : "Other";
      const defaultTaluka = districtInfo && districtInfo.talukas.length > 0 ? districtInfo.talukas[0] : "Other";

      return {
        ...prev,
        district: districtName,
        city: defaultCity,
        taluka: defaultTaluka
      };
    });

    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy.district;
      delete copy.city;
      delete copy.taluka;
      return copy;
    });
  };

  const formatFor = (name: string): FieldFormat | undefined => {
    if (name === "cin") return role === "CORPORATE" ? "cin" : undefined;
    return FIELD_FORMATS[name];
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const fmt = formatFor(name);
    const clean = fmt ? sanitizeField(fmt, value) : value;
    setFormData((prev) => ({ ...prev, [name]: clean }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleBlurValidate = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const fmt = formatFor(name);
    if (!fmt || !value) return;
    const message = validateField(fmt, value);
    if (message) setFieldErrors((prev) => ({ ...prev, [name]: message }));
  };

  const validateStep2Form = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = role === "GOV_ENTITY" ? "Government Organization is required" : "Organization Name is required";
    }

    if (!formData.firstName.trim()) {
      errors.firstName = "Representative First Name is required";
    }

    if (!formData.lastName.trim()) {
      errors.lastName = "Representative Last Name is required";
    }

    if (!formData.designation.trim()) {
      errors.designation = "Official designation is required";
    }

    if (!formData.email.trim()) {
      errors.email = "Official email address is required";
    } else {
      const emailErr = validateField("email", formData.email);
      if (emailErr) errors.email = emailErr;
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (role === "GOV_ENTITY") {
      if (!formData.website.trim()) {
        errors.website = "Official website URL is required";
      }
      if (!formData.addressLine1.trim() && !formData.address.trim()) {
        errors.addressLine1 = "Address Line 1 is required";
      }
      if (!formData.pincode.trim()) {
        errors.pincode = "PIN Code is required";
      }
      if (!formData.mobile.trim()) {
        errors.mobile = "Official mobile number is required";
      }
    } else {
      if (!formData.pan.trim()) {
        errors.pan = "PAN Card number is required";
      } else {
        const panErr = validateField("pan", formData.pan);
        if (panErr) errors.pan = panErr;
      }
      if (!formData.cin.trim()) {
        errors.cin = "MCA21 CIN number is required";
      } else {
        const cinErr = validateField("cin", formData.cin);
        if (cinErr) errors.cin = cinErr;
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Background registration worker
  const executeRegister = async (dataToSubmit = formData) => {
    setIsRegisteringInBackground(true);
    setErrorMsg("");

    try {
      const isGovEntity = role === "GOV_ENTITY";
      const stateVal = dataToSubmit.state === "Other" ? customState : dataToSubmit.state;
      const districtVal = dataToSubmit.district === "Other" ? customDistrict : dataToSubmit.district;
      const cityVal = dataToSubmit.city === "Other" ? customCity : dataToSubmit.city;
      const talukaVal = dataToSubmit.taluka === "Other" ? customTaluka : dataToSubmit.taluka;

      const payload = {
        email: dataToSubmit.email,
        password: dataToSubmit.password,
        firstName: dataToSubmit.firstName,
        lastName: dataToSubmit.lastName,
        designation: dataToSubmit.designation,
        role: isGovEntity ? 7 : 8,
        accountType: isGovEntity ? "GOVERNMENT_DEPARTMENT" : "CSR_COMPANY",
        profile: {
          name: dataToSubmit.name,
          registrationCategory: dataToSubmit.registrationCategory,
          parentOrganizationId: dataToSubmit.parentOrganizationId || undefined,
          parentRegistrationCode: dataToSubmit.parentRegistrationCode || undefined,
          firstName: dataToSubmit.firstName,
          lastName: dataToSubmit.lastName,
          designation: dataToSubmit.designation,
          pan: dataToSubmit.pan ? dataToSubmit.pan.toUpperCase() : "",
          address: [
            dataToSubmit.addressLine1,
            dataToSubmit.addressLine2,
            cityVal,
            talukaVal,
            districtVal,
            stateVal,
            dataToSubmit.pincode
          ].filter(Boolean).join(", ") || dataToSubmit.address,
          state: stateVal,
          district: districtVal,
          city: cityVal,
          taluka: talukaVal,
          ...(isGovEntity
            ? {
                orgType: dataToSubmit.orgType,
                adminLevel: dataToSubmit.adminLevel,
                parentOrganization: dataToSubmit.parentOrganization,
                officialRegNo: dataToSubmit.officialRegNo || dataToSubmit.registrationNumber,
                deptOfficeCode: dataToSubmit.deptOfficeCode,
                website: dataToSubmit.website,
                addressLine1: dataToSubmit.addressLine1,
                addressLine2: dataToSubmit.addressLine2,
                pincode: dataToSubmit.pincode,
                employeeId: dataToSubmit.employeeId,
                mobile: dataToSubmit.mobile,
                representativeMobile: dataToSubmit.mobile,
                registrationNumber: dataToSubmit.officialRegNo || dataToSubmit.registrationNumber,
                contactInfo: { entityType: "GOVERNMENT_ENTITY" }
              }
            : {
                cin: dataToSubmit.cin
              })
        }
      };

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        const errors: Record<string, string> = {};
        const details = data.details || data.error?.details;
        if (details && Array.isArray(details)) {
          details.forEach((err: any) => {
            const cleanKey = err.field?.replace(/^body\.profile\./, "").replace(/^body\./, "") || "field";
            errors[cleanKey] = err.message;
          });
        }
        const msg = typeof data.error === "string"
          ? data.error
          : data.error?.message || data.message || "Failed to register";

        // Map backend errors to exact fields so they get highlighted in red
        const upperMsg = msg.toUpperCase();
        if (upperMsg.includes("PAN")) errors.pan = msg;
        if (upperMsg.includes("EMAIL")) errors.email = msg;
        if (upperMsg.includes("CIN")) errors.cin = msg;

        setFieldErrors(errors);
        setErrorMsg(msg);
        // Switch back to Step 2 so user sees highlighted field errors
        setStep(2);
      } else {
        setSuccessMsg("Registration initiated. A 6-digit verification code has been sent to your email.");
        setTimer(60);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during registration");
      setStep(2);
    } finally {
      setIsRegisteringInBackground(false);
    }
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    const isValid = validateStep2Form();
    if (!isValid) return;

    // Immediately switch to Step 3 while register works in background
    setStep(3);
    setTimer(60);
    executeRegister();
  };

  const handleResendOtp = async () => {
    if (resendAttempts >= MAX_RESENDS) {
      setErrorMsg(`Maximum resend limit of ${MAX_RESENDS} attempts reached. Please check your spam folder or change your email address.`);
      return;
    }

    if (timer > 0) return;

    setIsResending(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email })
      });

      const data = await response.json();
      if (!response.ok) {
        const msg = typeof data.error === "string" ? data.error : data.error?.message || data.message || "Failed to resend OTP";
        throw new Error(msg);
      }

      const newAttempts = resendAttempts + 1;
      setResendAttempts(newAttempts);
      setTimer(60);
      setSuccessMsg(`New 6-digit verification code sent to ${formData.email}. (Resend ${newAttempts}/${MAX_RESENDS})`);
    } catch (err: any) {
      setErrorMsg(err.message || "Could not resend OTP. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const handleSaveNewEmail = async () => {
    setEditEmailError("");
    const trimmed = editEmailInput.trim();
    if (!trimmed) {
      setEditEmailError("Email address is required");
      return;
    }
    const valErr = validateField("email", trimmed);
    if (valErr) {
      setEditEmailError(valErr);
      return;
    }

    const updatedFormData = { ...formData, email: trimmed };
    setFormData(updatedFormData);
    setIsEditingEmail(false);
    setResendAttempts(0);
    setOtp("");
    setSuccessMsg(`Email updated to ${trimmed}. Sending new verification code...`);

    executeRegister(updatedFormData);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          otpCode: otp
        })
      });

      const data = await response.json();
      if (!response.ok) {
        const msg = typeof data.error === "string"
          ? data.error
          : data.error?.message || data.message || "Failed to verify OTP code";
        throw new Error(msg);
      }

      const user = data.data?.user || data.user;
      const accessToken = data.data?.accessToken || data.accessToken;

      if (accessToken && user) {
        useAuthStore.getState().login(user);
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("user", JSON.stringify(user));
        document.cookie = 'mahacsr_auth=1; path=/; max-age=86400; SameSite=Lax';
      }

      // Immediately render full-card Success Screen
      setIsVerifiedSuccess(true);

      // Navigate immediately to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setErrorMsg(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const getInputClassName = (name: string, extraClasses = "") => {
    const hasErr = Boolean(fieldErrors[name]);
    return `w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm ${
      hasErr
        ? "bg-red-50/40 border-2 border-red-500 text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
        : "bg-slate-50/80 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white"
    } ${extraClasses}`;
  };

  const renderFieldError = (name: string) => {
    if (!fieldErrors[name]) return null;
    return (
      <motion.span
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-red-600 text-[11px] font-bold flex items-center gap-1.5 mt-1 bg-red-50 px-2 py-0.5 rounded-md border border-red-100"
      >
        <AlertCircle size={13} className="shrink-0 text-red-500" />
        <span>{fieldErrors[name]}</span>
      </motion.span>
    );
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center pt-28 sm:pt-32 pb-16 px-4 bg-gradient-to-br from-[#050c18] via-[#09162e] to-[#0d1d3a] text-slate-900 relative overflow-hidden font-sans">
      {/* Decorative background glows */}
      <div className="absolute top-0 right-0 w-[38rem] h-[38rem] bg-gradient-to-br from-amber-500/15 via-orange-600/10 to-transparent rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-gradient-to-tr from-blue-600/20 via-indigo-600/15 to-transparent rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-3xl bg-white/95 backdrop-blur-3xl p-7 sm:p-9 rounded-[2.25rem] border border-white/60 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.6)] relative z-10 flex flex-col gap-6">

        {/* Header Branding */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-[#09152b] rounded-[14px] flex items-center justify-center">
                <Sparkles size={20} className="text-amber-400" />
              </div>
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-xl text-slate-900 tracking-tight">
                MahaCSR Setu Entity Registration
              </h1>
              <p className="text-xs text-slate-500 font-semibold">
                Government & Corporate Onboarding Portal
              </p>
            </div>
          </div>
          <Link href="/login" className="text-xs font-extrabold text-blue-900 hover:text-amber-600 transition-colors">
            Back to Sign In
          </Link>
        </div>

        {/* Full Success Screen once Verified */}
        {isVerifiedSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-10 flex flex-col items-center text-center gap-6"
          >
            <div className="relative flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center animate-pulse">
                <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
                  <CheckCircle2 size={36} />
                </div>
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md animate-bounce">
                <Sparkles size={18} />
              </div>
            </div>

            <div className="flex flex-col gap-2 max-w-md">
              <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
                Email Verified & Account Activated!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                Your organization <strong className="text-slate-900 font-bold">{formData.name || "profile"}</strong> has been verified. Launching your workspace dashboard...
              </p>
            </div>

            {/* Animated loading progress bar */}
            <div className="w-full max-w-xs bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200 shadow-inner mt-2">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 rounded-full"
              />
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="mt-2 py-3.5 px-8 rounded-xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 text-white font-extrabold text-xs shadow-lg hover:shadow-xl transition-all flex items-center gap-2 hover:scale-[1.02]"
            >
              <span>Go to Dashboard Now</span>
              <ArrowRight size={16} />
            </button>
          </motion.div>
        ) : (
          <>
            {/* Animated Step Tracker */}
            <div className="grid grid-cols-3 gap-2.5 text-center text-xs font-extrabold">
              <div className={`py-2.5 px-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                step === 1
                  ? "bg-blue-950 text-white border-blue-950 shadow-md"
                  : step > 1
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-slate-50 text-slate-400 border-slate-200"
              }`}>
                <span className="w-5 h-5 rounded-full bg-white/20 text-current text-[11px] font-extrabold flex items-center justify-center">1</span>
                <span className="hidden sm:inline">Entity Category</span>
              </div>

              <div className={`py-2.5 px-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                step === 2
                  ? "bg-blue-950 text-white border-blue-950 shadow-md"
                  : step > 2
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-slate-50 text-slate-400 border-slate-200"
              }`}>
                <span className="w-5 h-5 rounded-full bg-white/20 text-current text-[11px] font-extrabold flex items-center justify-center">2</span>
                <span className="hidden sm:inline">Details & Location</span>
              </div>

              <div className={`py-2.5 px-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                step === 3
                  ? "bg-blue-950 text-white border-blue-950 shadow-md"
                  : "bg-slate-50 text-slate-400 border-slate-200"
              }`}>
                <span className="w-5 h-5 rounded-full bg-white/20 text-current text-[11px] font-extrabold flex items-center justify-center">3</span>
                <span className="hidden sm:inline">OTP Verification</span>
              </div>
            </div>

            {/* Alerts */}
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 p-3.5 rounded-2xl text-red-700 text-xs flex items-center gap-2.5 font-bold shadow-sm"
              >
                <AlertCircle size={18} className="text-red-500 shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-emerald-800 text-xs flex items-center gap-2.5 font-bold shadow-sm"
              >
                <FileCheck size={18} className="text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {/* STEP 1: CATEGORY SELECTION */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-6"
                >
                  <div className="text-center">
                    <h2 className="font-heading font-extrabold text-xl text-slate-900">
                      Select Registration Profile
                    </h2>
                    <p className="text-xs text-slate-500 font-semibold mt-1">
                      Choose your organization category to customize your onboarding workspace
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      onClick={() => setRole("CORPORATE")}
                      className={`p-6 rounded-3xl border-2 cursor-pointer flex flex-col gap-3 transition-all duration-300 relative ${
                        role === "CORPORATE"
                          ? "border-blue-900 bg-blue-50/50 shadow-xl scale-[1.02]"
                          : "border-slate-200/80 bg-slate-50/50 hover:border-slate-300"
                      }`}
                    >
                      {role === "CORPORATE" && (
                        <CheckCircle2 size={22} className="absolute top-5 right-5 text-blue-900" />
                      )}
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        role === "CORPORATE" ? "bg-blue-950 text-amber-400 shadow-md" : "bg-slate-200 text-slate-600"
                      }`}>
                        <Building2 size={24} />
                      </div>
                      <div>
                        <h3 className="font-heading font-extrabold text-base text-slate-900">
                          Corporate Partner
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium mt-1">
                          Register with MCA21 CIN to submit CSR enquiries, commit funds, sign MoUs, and review project progress.
                        </p>
                      </div>
                    </div>

                    <div
                      onClick={() => router.push("/register/government")}
                      className={`p-6 rounded-3xl border-2 cursor-pointer flex flex-col gap-3 transition-all duration-300 relative ${
                        role === "GOV_ENTITY"
                          ? "border-blue-900 bg-blue-50/50 shadow-xl scale-[1.02]"
                          : "border-slate-200/80 bg-slate-50/50 hover:border-slate-300"
                      }`}
                    >
                      {role === "GOV_ENTITY" && (
                        <CheckCircle2 size={22} className="absolute top-5 right-5 text-blue-900" />
                      )}
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        role === "GOV_ENTITY" ? "bg-blue-950 text-amber-400 shadow-md" : "bg-slate-200 text-slate-600"
                      }`}>
                        <Landmark size={24} />
                      </div>
                      <div>
                        <h3 className="font-heading font-extrabold text-base text-slate-900">
                          Government Department
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium mt-1">
                          Register state departments or district local bodies to post CSR requirements and receive corporate proposals.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 text-white font-extrabold text-xs shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 group mt-2 hover:scale-[1.01]"
                  >
                    <span>Continue to Registration Details</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              )}

              {/* STEP 2: FORM DETAILS */}
              {step === 2 && (
                <motion.form
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleStep2Submit}
                  className="flex flex-col gap-6"
                >
                  <div className="text-center mb-1">
                    <h2 className="font-heading font-extrabold text-xl text-slate-900">
                      {role === "GOV_ENTITY" ? "Government Entity Registration" : "Corporate Partner Registration"}
                    </h2>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      {role === "GOV_ENTITY"
                        ? "Provide official government entity credentials and authorized representative details"
                        : "Provide official registration credentials for automated verification"}
                    </p>
                  </div>

                  {role === "GOV_ENTITY" ? (
                    <div className="flex flex-col gap-6">
                      {/* SECTION A — Government Organization Details */}
                      <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col gap-4">
                        <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider bg-blue-950 text-white px-2.5 py-0.5 rounded-md">
                            SECTION A
                          </span>
                          <h3 className="font-heading font-extrabold text-sm text-slate-900">
                            Government Entity Category & Details
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-800">Organization Type *</label>
                            <select
                              name="orgType"
                              value={formData.orgType}
                              onChange={handleChange}
                              className={getInputClassName("orgType")}
                            >
                              <option value="Collectorate / District Administration">Collectorate / District Administration</option>
                              <option value="Zilla Parishad">Zilla Parishad</option>
                              <option value="Municipal Corporation">Municipal Corporation</option>
                              <option value="Municipal Council">Municipal Council</option>
                              <option value="Nagar Panchayat">Nagar Panchayat</option>
                              <option value="Government Department">Government Department</option>
                              <option value="State CSR Cell">State CSR Cell</option>
                              <option value="Development Authority">Development Authority</option>
                              <option value="Other">Other</option>
                            </select>
                            {renderFieldError("orgType")}
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-800">Administrative Level *</label>
                            <select
                              name="adminLevel"
                              value={formData.adminLevel}
                              onChange={handleChange}
                              className={getInputClassName("adminLevel")}
                            >
                              <option value="Local Body">Local Body</option>
                              <option value="District">District Administration</option>
                              <option value="Division">Division Level</option>
                              <option value="State">State Level</option>
                              <option value="Department">Department</option>
                            </select>
                            {renderFieldError("adminLevel")}
                          </div>

                          <div className="flex flex-col gap-1 md:col-span-2">
                            <label className="text-xs font-bold text-slate-800">Official Organization Name *</label>
                            <input
                              name="name"
                              value={formData.name}
                              onChange={handleChange}
                              placeholder="e.g. Collectorate, Pune / Nagpur Municipal Corporation"
                              className={getInputClassName("name")}
                            />
                            {renderFieldError("name")}
                          </div>
                        </div>
                      </div>

                      {/* SECTION B — Location & Official Website */}
                      <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col gap-4">
                        <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider bg-blue-950 text-white px-2.5 py-0.5 rounded-md">
                            SECTION B
                          </span>
                          <h3 className="font-heading font-extrabold text-sm text-slate-900">
                            Location & Official Website
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1 md:col-span-2">
                            <label className="text-xs font-bold text-slate-800">Official Website *</label>
                            <input
                              type="url"
                              name="website"
                              value={formData.website}
                              onChange={handleChange}
                              placeholder="e.g. https://pune.gov.in"
                              className={getInputClassName("website")}
                            />
                            {renderFieldError("website")}
                          </div>

                          <div className="flex flex-col gap-1 md:col-span-2">
                            <label className="text-xs font-bold text-slate-800">Address Line 1 *</label>
                            <input
                              name="addressLine1"
                              value={formData.addressLine1}
                              onChange={handleChange}
                              placeholder="Official office building / street address"
                              className={getInputClassName("addressLine1")}
                            />
                            {renderFieldError("addressLine1")}
                          </div>

                          <div className="flex flex-col gap-1 md:col-span-2">
                            <label className="text-xs font-bold text-slate-800">Address Line 2</label>
                            <input
                              name="addressLine2"
                              value={formData.addressLine2}
                              onChange={handleChange}
                              placeholder="Landmark / Area / Locality"
                              className={getInputClassName("addressLine2")}
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-800">State *</label>
                            <select
                              name="state"
                              value={formData.state}
                              onChange={(e) => handleStateChange(e.target.value)}
                              className={getInputClassName("state")}
                            >
                              {allStatesList.map((st) => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                              <option value="Other">Other</option>
                            </select>
                            {renderFieldError("state")}
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-800">District *</label>
                            <select
                              name="district"
                              value={formData.district}
                              onChange={(e) => handleDistrictChange(e.target.value)}
                              className={getInputClassName("district")}
                            >
                              {availableDistricts.map((d) => (
                                <option key={d.name} value={d.name}>{d.name}</option>
                              ))}
                              <option value="Other">Other</option>
                            </select>
                            {renderFieldError("district")}
                          </div>

                          <div className="flex flex-col gap-1 md:col-span-2">
                            <label className="text-xs font-bold text-slate-800">PIN Code *</label>
                            <input
                              name="pincode"
                              value={formData.pincode}
                              onChange={handleChange}
                              maxLength={6}
                              placeholder="e.g. 411001"
                              className={getInputClassName("pincode")}
                            />
                            {renderFieldError("pincode")}
                          </div>
                        </div>
                      </div>

                      {/* SECTION C — Authorized Representative */}
                      <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col gap-4">
                        <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider bg-blue-950 text-white px-2.5 py-0.5 rounded-md">
                            SECTION C
                          </span>
                          <h3 className="font-heading font-extrabold text-sm text-slate-900">
                            Authorized Representative Details
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-800">First Name *</label>
                            <input
                              name="firstName"
                              value={formData.firstName}
                              onChange={handleChange}
                              placeholder="e.g. John"
                              className={getInputClassName("firstName")}
                            />
                            {renderFieldError("firstName")}
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-800">Last Name *</label>
                            <input
                              name="lastName"
                              value={formData.lastName}
                              onChange={handleChange}
                              placeholder="e.g. Doe"
                              className={getInputClassName("lastName")}
                            />
                            {renderFieldError("lastName")}
                          </div>

                          <div className="flex flex-col gap-1 md:col-span-2">
                            <label className="text-xs font-bold text-slate-800">Official Designation *</label>
                            <input
                              name="designation"
                              value={formData.designation}
                              onChange={handleChange}
                              placeholder="e.g. Collector / Chief Executive Officer / Commissioner"
                              className={getInputClassName("designation")}
                            />
                            {renderFieldError("designation")}
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-800">Official Email *</label>
                            <input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleChange}
                              onBlur={handleBlurValidate}
                              placeholder="e.g. john.doe@example.com"
                              className={getInputClassName("email")}
                            />
                            {renderFieldError("email")}
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-800">Official Mobile Number *</label>
                            <input
                              name="mobile"
                              value={formData.mobile}
                              onChange={handleChange}
                              maxLength={10}
                              placeholder="e.g. 1234567890"
                              className={getInputClassName("mobile")}
                            />
                            {renderFieldError("mobile")}
                          </div>

                          <div className="flex flex-col gap-1 md:col-span-2">
                            <label className="text-xs font-bold text-slate-800">Account Password *</label>
                            <div className="relative">
                              <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                minLength={6}
                                placeholder="Min 6 characters"
                                className={getInputClassName("password", "pr-10")}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                              >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                            {renderFieldError("password")}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* CORPORATE REGISTRATION FORM */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1 md:col-span-2">
                        <label className="text-xs font-bold text-slate-800">Organization Name *</label>
                        <input
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="e.g. Acme Corporation Pvt Ltd"
                          className={getInputClassName("name")}
                        />
                        {renderFieldError("name")}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-800">Authorized Person First Name *</label>
                        <input
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          placeholder="e.g. John"
                          className={getInputClassName("firstName")}
                        />
                        {renderFieldError("firstName")}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-800">Authorized Person Last Name *</label>
                        <input
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          placeholder="e.g. Doe"
                          className={getInputClassName("lastName")}
                        />
                        {renderFieldError("lastName")}
                      </div>

                      <div className="flex flex-col gap-1 md:col-span-2">
                        <label className="text-xs font-bold text-slate-800">Official Designation *</label>
                        <input
                          name="designation"
                          value={formData.designation}
                          onChange={handleChange}
                          placeholder="e.g. Head of CSR / Vice President"
                          className={getInputClassName("designation")}
                        />
                        {renderFieldError("designation")}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-800">Corporate Email *</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          onBlur={handleBlurValidate}
                          placeholder="e.g. john.doe@example.com"
                          className={getInputClassName("email")}
                        />
                        {renderFieldError("email")}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-800">Password *</label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            minLength={6}
                            placeholder="Min 6 characters"
                            className={getInputClassName("password", "pr-10")}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {renderFieldError("password")}
                      </div>

                      <div className="flex flex-col gap-1 md:col-span-2">
                        <label className="text-xs font-bold text-slate-800">MCA21 CIN Number *</label>
                        <input
                          name="cin"
                          value={formData.cin}
                          onChange={handleChange}
                          onBlur={handleBlurValidate}
                          maxLength={21}
                          placeholder="U99999MH2099PTC999999"
                          className={getInputClassName("cin", "uppercase")}
                        />
                        {renderFieldError("cin")}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-800">PAN Card Number *</label>
                        <input
                          name="pan"
                          value={formData.pan}
                          onChange={handleChange}
                          onBlur={handleBlurValidate}
                          maxLength={10}
                          minLength={10}
                          placeholder="ABCDE1234F"
                          className={getInputClassName("pan", "uppercase")}
                        />
                        {renderFieldError("pan")}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-800">State *</label>
                        <select
                          name="state"
                          value={formData.state}
                          onChange={(e) => handleStateChange(e.target.value)}
                          className={getInputClassName("state")}
                        >
                          {allStatesList.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                          <option value="Other">Other</option>
                        </select>
                        {renderFieldError("state")}
                      </div>

                      {formData.state === "Other" && (
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-slate-800">Specify Custom State *</label>
                          <input
                            type="text"
                            value={customState}
                            onChange={(e) => setCustomState(e.target.value)}
                            placeholder="Enter State Name"
                            className={getInputClassName("customState")}
                          />
                        </div>
                      )}

                      <div className="flex flex-col gap-1 md:col-span-2">
                        <label className="text-xs font-bold text-slate-800">District *</label>
                        <select
                          name="district"
                          value={formData.district}
                          onChange={(e) => handleDistrictChange(e.target.value)}
                          className={getInputClassName("district")}
                        >
                          {availableDistricts.map((d) => (
                            <option key={d.name} value={d.name}>{d.name}</option>
                          ))}
                          <option value="Other">Other</option>
                        </select>
                        {renderFieldError("district")}
                      </div>

                      {formData.district === "Other" && (
                        <div className="flex flex-col gap-1 md:col-span-2">
                          <label className="text-xs font-bold text-slate-800">Specify Custom District *</label>
                          <input
                            type="text"
                            value={customDistrict}
                            onChange={(e) => setCustomDistrict(e.target.value)}
                            placeholder="Enter District Name"
                            className={getInputClassName("customDistrict")}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-4">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => router.push("/register")}
                      className="w-1/3 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft size={16} />
                      <span>Back</span>
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-2/3 py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01] cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin text-white shrink-0" />
                          <span>Submitting Details...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit & Send OTP</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </motion.form>
              )}

              {/* STEP 3: OTP VERIFICATION */}
              {step === 3 && (
                <motion.form
                  key="step3"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onSubmit={handleVerifyOtp}
                  className="flex flex-col items-center gap-6 text-center py-2"
                >
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shadow-inner">
                    <KeyRound size={28} />
                  </div>

                  <div>
                    <h2 className="font-heading font-extrabold text-2xl text-slate-900">
                      Verify Email Address
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1 max-w-sm">
                      Enter the 6-digit security code to finalize your organization onboarding
                    </p>
                  </div>

                  {/* Background Status Indicator */}
                  {isRegisteringInBackground && (
                    <div className="w-full max-w-md bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3 text-blue-900 text-xs font-semibold text-left">
                      <Loader2 size={20} className="animate-spin text-blue-700 shrink-0" />
                      <div>
                        <p className="font-bold text-blue-950">Sending verification code in background...</p>
                        <p className="text-slate-600 text-[11px] mt-0.5">Your request is processing. Enter the OTP code as soon as it arrives.</p>
                      </div>
                    </div>
                  )}

                  {/* Email Display & Change Email Section */}
                  <div className="w-full max-w-md bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                        <Mail size={16} className="text-blue-900 shrink-0" />
                        <span>Sent to:</span>
                        <strong className="text-slate-900 font-bold break-all">{formData.email}</strong>
                      </div>
                      {!isEditingEmail && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditEmailInput(formData.email);
                            setEditEmailError("");
                            setIsEditingEmail(true);
                          }}
                          className="text-xs font-extrabold text-blue-900 hover:text-amber-600 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50 shrink-0"
                        >
                          <Edit2 size={13} />
                          <span>Change</span>
                        </button>
                      )}
                    </div>

                    {/* Inline Email Editor */}
                    {isEditingEmail && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="pt-2 border-t border-slate-200 flex flex-col gap-2 text-left"
                      >
                        <p className="text-[11px] font-bold text-slate-700">Enter correct email address:</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <input
                              type="email"
                              value={editEmailInput}
                              onChange={(e) => {
                                setEditEmailInput(e.target.value);
                                if (editEmailError) setEditEmailError("");
                              }}
                              placeholder="official.email@domain.com"
                              className={`w-full px-3 py-1.5 text-xs rounded-lg border font-semibold ${
                                editEmailError ? "border-red-500 bg-red-50/50" : "border-slate-300 bg-white"
                              }`}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleSaveNewEmail}
                            className="px-3 py-1.5 bg-blue-950 text-white text-xs font-bold rounded-lg hover:bg-blue-900 transition-colors flex items-center gap-1 shrink-0"
                          >
                            <Check size={14} />
                            <span>Save</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingEmail(false)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors shrink-0"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        {editEmailError && (
                          <p className="text-red-500 text-[11px] font-bold flex items-center gap-1">
                            <AlertCircle size={12} />
                            <span>{editEmailError}</span>
                          </p>
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* OTP Input Field */}
                  <div className="w-full max-w-xs flex flex-col gap-1.5 items-center">
                    <input
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      disabled={loading || isRegisteringInBackground}
                      className="w-full text-center bg-slate-50 border-2 border-slate-200 focus:border-blue-900 rounded-2xl py-3 text-2xl font-extrabold tracking-[0.4em] text-blue-950 focus:outline-none focus:bg-white transition-all shadow-inner disabled:opacity-50"
                    />
                    <p className="text-[11px] text-slate-400 font-semibold">Enter 6-digit OTP code</p>
                  </div>

                  {/* Resend OTP & Countdown Timer */}
                  <div className="w-full max-w-xs flex flex-col items-center gap-2">
                    <div className="flex items-center justify-between w-full text-xs font-semibold px-1">
                      <span className="text-slate-500">Didn't get the code?</span>
                      <span className="text-slate-400 text-[11px]">
                        Resends left: <strong className={resendAttempts >= MAX_RESENDS ? "text-red-500 font-bold" : "text-slate-700 font-bold"}>{MAX_RESENDS - resendAttempts}/{MAX_RESENDS}</strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={timer > 0 || isResending || resendAttempts >= MAX_RESENDS || isRegisteringInBackground}
                      className={`w-full py-2.5 px-4 rounded-xl border text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                        timer > 0 || isResending || resendAttempts >= MAX_RESENDS || isRegisteringInBackground
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                          : "bg-white text-blue-950 border-blue-950/30 hover:bg-blue-50 shadow-sm hover:shadow"
                      }`}
                    >
                      {isResending ? (
                        <>
                          <Loader2 size={15} className="animate-spin text-blue-900" />
                          <span>Resending OTP...</span>
                        </>
                      ) : timer > 0 ? (
                        <>
                          <RotateCcw size={14} className="text-slate-400" />
                          <span>Resend OTP in {formatTimer(timer)}</span>
                        </>
                      ) : resendAttempts >= MAX_RESENDS ? (
                        <span>Resend Limit Reached ({MAX_RESENDS}/{MAX_RESENDS})</span>
                      ) : (
                        <>
                          <RefreshCw size={14} />
                          <span>Resend OTP</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Submit & Back Navigation */}
                  <div className="w-full max-w-xs flex flex-col gap-3 mt-1">
                    <button
                      type="submit"
                      disabled={loading || otp.length !== 6 || isRegisteringInBackground}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01]"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin text-white shrink-0" />
                          <span>Verifying OTP...</span>
                        </>
                      ) : (
                        "Complete Verification"
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStep(2);
                        setErrorMsg("");
                      }}
                      className="text-xs font-extrabold text-slate-500 hover:text-slate-800 transition-colors py-1 flex items-center justify-center gap-1"
                    >
                      <ArrowLeft size={14} />
                      <span>Back to Registration Details</span>
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}

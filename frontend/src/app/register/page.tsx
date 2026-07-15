"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, FileCheck, Landmark, Building2, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { locationData, allStatesList } from "@/lib/locationData";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Select Role, 2: Fill Details, 3: OTP
  const [role, setRole] = useState<"NGO" | "COMPANY" | "GOV_ENTITY">("COMPANY");
  const [otp, setOtp] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    pan: "",
    address: "",
    state: "Maharashtra",
    district: "Pune",
    city: "Pune City",
    taluka: "Haveli",
    registrationNumber: "",
    darpanNumber: "",
    csr1Number: "",
    cin: "",
    gst: "",
    csrBudget: ""
  });

  const [customState, setCustomState] = useState("");
  const [customDistrict, setCustomDistrict] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [customTaluka, setCustomTaluka] = useState("");

  const selectedStateInfo = locationData.find(s => s.name === formData.state);
  const availableDistricts = selectedStateInfo ? selectedStateInfo.districts : [];
  const selectedDistrictInfo = selectedStateInfo ? selectedStateInfo.districts.find(d => d.name === formData.district) : null;
  const availableCities = selectedDistrictInfo ? selectedDistrictInfo.cities : [];
  const availableTalukas = selectedDistrictInfo ? selectedDistrictInfo.talukas : [];


  // Handle redirect query parameters if directed from login for pending verification
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const stepParam = params.get("step");
      const emailParam = params.get("email");
      if (stepParam) {
        setStep(parseInt(stepParam, 10));
      }
      if (emailParam) {
        setFormData(prev => ({ ...prev, email: emailParam }));
      }
    }
  }, []);

  const handleStateChange = (stateName: string) => {
    setFormData(prev => {
      const stateInfo = locationData.find(s => s.name === stateName);
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

    // Clear field errors
    setFieldErrors(prev => {
      const copy = { ...prev };
      delete copy.state;
      delete copy.district;
      delete copy.city;
      delete copy.taluka;
      return copy;
    });
  };

  const handleDistrictChange = (districtName: string) => {
    setFormData(prev => {
      const stateInfo = locationData.find(s => s.name === prev.state);
      const districtInfo = stateInfo ? stateInfo.districts.find(d => d.name === districtName) : null;
      const defaultCity = districtInfo && districtInfo.cities.length > 0 ? districtInfo.cities[0] : "Other";
      const defaultTaluka = districtInfo && districtInfo.talukas.length > 0 ? districtInfo.talukas[0] : "Other";

      return {
        ...prev,
        district: districtName,
        city: defaultCity,
        taluka: defaultTaluka
      };
    });

    // Clear field errors
    setFieldErrors(prev => {
      const copy = { ...prev };
      delete copy.district;
      delete copy.city;
      delete copy.taluka;
      return copy;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    setFieldErrors({});

    try {
      const isNgo = role === "NGO";
      const isGovEntity = role === "GOV_ENTITY";
      const stateVal = formData.state === "Other" ? customState : formData.state;
      const districtVal = formData.district === "Other" ? customDistrict : formData.district;
      const cityVal = formData.city === "Other" ? customCity : formData.city;
      const talukaVal = formData.taluka === "Other" ? customTaluka : formData.taluka;

      const payload = {
        email: formData.email,
        password: formData.password,
        role: isNgo ? "NGO_ADMIN" : isGovEntity ? "BENEFICIARY_AGENCY" : "COMPANY_ADMIN",
        profile: {
          name: formData.name,
          pan: formData.pan.toUpperCase(),
          address: formData.address,
          state: stateVal,
          district: districtVal,
          city: cityVal,
          taluka: talukaVal,
          ...(isNgo ? {
            registrationNumber: formData.registrationNumber,
            darpanNumber: formData.darpanNumber,
            csr1Number: formData.csr1Number,
          } : isGovEntity ? {
            registrationNumber: formData.registrationNumber,
            contactInfo: { entityType: "GOVERNMENT_ENTITY" },
          } : {
            cin: formData.cin,
            gst: formData.gst || undefined,
            csrBudget: parseFloat(formData.csrBudget) || 0,
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
        if (data.details && Array.isArray(data.details)) {
          const errors: Record<string, string> = {};
          data.details.forEach((err: any) => {
            const cleanKey = err.field.replace(/^body\.profile\./, "").replace(/^body\./, "");
            errors[cleanKey] = err.message;
          });
          setFieldErrors(errors);
        }
        throw new Error(data.error || "Failed to register");
      }

      setSuccessMsg("Registration received. A verification OTP has been sent to your email.");
      setStep(3);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during registration");
    } finally {
      setLoading(false);
    }
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
        throw new Error(data.error || "Failed to verify OTP code");
      }

      setSuccessMsg("Email verified. Please login to continue.");
      setTimeout(() => {
        const nextPath = role === "NGO" ? "/onboarding" : role === "COMPANY" ? "/company-dashboard" : "/department/dashboard";
        router.push(`/login?next=${encodeURIComponent(nextPath)}`);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center px-6 py-16 bg-[#f4f5f7] text-[#333333] min-h-screen relative">
      <div className="w-full max-w-3xl bg-white border border-[#e0e4ea] p-8 flex flex-col gap-6 relative rounded-lg">
        
        {/* Step Indicator */}
        <div className="flex justify-between items-center text-xs font-semibold text-[#97a0ac]">
          <span className={step >= 1 ? "text-[#1789d6] font-bold" : ""}>1. Profile Type</span>
          <span className={`w-12 h-px ${step >= 2 ? "bg-[#1789d6]" : "bg-[#c7cdd6]"}`} />
          <span className={step >= 2 ? "text-[#1789d6] font-bold" : ""}>2. Details</span>
          <span className={`w-12 h-px ${step >= 3 ? "bg-[#1789d6]" : "bg-[#c7cdd6]"}`} />
          <span className={step >= 3 ? "text-[#1789d6] font-bold" : ""}>3. Verification</span>
        </div>

        {errorMsg && (
          <div className="bg-[#fdecea] border border-[#f5c6cb] p-4 rounded-lg text-[#c62828] text-xs flex items-center gap-2">
            <AlertCircle size={16} className="text-[#c62828] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-[#e8f5e9] border border-[#c8e6c9] p-4 rounded-lg text-[#2e7d32] text-xs flex items-center gap-2">
            <FileCheck size={16} className="text-[#2e7d32] shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1 text-center items-center">
              <svg viewBox="0 0 100 100" className="w-12 h-12 mb-2" fill="none" stroke="currentColor">
                <polygon points="50,5 82,18 95,50 82,82 50,95 18,82 5,50 18,18" stroke="#14274e" strokeWidth="4.5" fill="#e3f0fa" />
                <path d="M28,32 L72,32 M32,44 L68,44 M28,56 L72,56 M36,68 L64,68" stroke="#f7941d" strokeWidth="3" strokeLinecap="round" />
                <path d="M42,80 L58,80" stroke="#14274e" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <h1 className="font-heading font-bold text-xl text-[#14274e] tracking-tight">Select Registration Category</h1>
              <p className="text-[#6b7280] text-xs mt-0.5 font-bold uppercase tracking-wider">Account activation happens only after onboarding and admin document verification</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option Company */}
              <div
                className={`p-6 rounded-lg border cursor-pointer flex flex-col gap-4 transition-colors ${
                  role === "COMPANY"
                    ? "border-[#14274e] bg-[#e3f0fa]"
                    : "border-[#e0e4ea] bg-white hover:border-[#14274e]"
                }`}
                onClick={() => setRole("COMPANY")}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  role === "COMPANY" ? "bg-[#14274e] text-white" : "bg-[#f4f5f7] text-[#6b7280]"
                }`}>
                  <Building2 size={20} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-heading font-bold text-base text-[#14274e]">Company / CSR Donor</span>
                  <span className="text-xs text-[#4b5563] leading-relaxed">Submit company details, CSR budget and policy documents for verification before participation.</span>
                </div>
              </div>

              <div
                className={`p-6 rounded-lg border cursor-pointer flex flex-col gap-4 transition-colors ${
                  role === "GOV_ENTITY"
                    ? "border-[#14274e] bg-[#e3f0fa]"
                    : "border-[#e0e4ea] bg-white hover:border-[#14274e]"
                }`}
                onClick={() => setRole("GOV_ENTITY")}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  role === "GOV_ENTITY" ? "bg-[#14274e] text-white" : "bg-[#f4f5f7] text-[#6b7280]"
                }`}>
                  <ShieldAlert size={20} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-heading font-bold text-base text-[#14274e]">Government Department</span>
                  <span className="text-xs text-[#4b5563] leading-relaxed">Register a department or local body to create CSR requirements, track company interest, and confirm delivery.</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full bg-[#1789d6] hover:bg-[#146fb0] text-white font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 mt-2 transition-colors"
            >
              Continue <ArrowRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 text-center">
              <h1 className="font-heading font-bold text-xl text-[#14274e] tracking-tight">Registration Details</h1>
              <p className="text-[#6b7280] text-xs">Fill the details required to begin onboarding and document verification</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-800 text-xs font-bold">{role === "GOV_ENTITY" ? "Department / Local Body Name" : "Organization Name"}</label>
                <input 
                  required 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  placeholder="e.g. Sahyadri Foundation" 
                  className={`govt-input ${fieldErrors.name ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`} 
                />
                {fieldErrors.name && <span className="text-rose-600 text-[10px] font-semibold mt-0.5">{fieldErrors.name}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-800 text-xs font-bold">{role === "GOV_ENTITY" ? "Official Department Email" : "Corporate / NGO Email"}</label>
                <input 
                  required 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  placeholder="e.g. contact@domain.org" 
                  className={`govt-input ${fieldErrors.email ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`} 
                />
                {fieldErrors.email && <span className="text-rose-600 text-[10px] font-semibold mt-0.5">{fieldErrors.email}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-800 text-xs font-bold">Password</label>
                <div className="relative">
                  <input 
                    required 
                    type={showPassword ? "text" : "password"} 
                    name="password" 
                    value={formData.password} 
                    onChange={handleChange} 
                    minLength={6} 
                    placeholder="Password (min 6 chars)" 
                    className={`govt-input !pr-10 ${fieldErrors.password ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-[11px] text-slate-400 hover:text-slate-650 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.password && <span className="text-rose-600 text-[10px] font-semibold mt-0.5">{fieldErrors.password}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-800 text-xs font-bold">PAN Card Number</label>
                <input 
                  required 
                  name="pan" 
                  value={formData.pan} 
                  onChange={handleChange} 
                  maxLength={10} 
                  minLength={10} 
                  placeholder="ABCDE1234F" 
                  className={`govt-input ${fieldErrors.pan ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`} 
                />
                {fieldErrors.pan && <span className="text-rose-600 text-[10px] font-semibold mt-0.5">{fieldErrors.pan}</span>}
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-gray-800 text-xs font-bold">Registered Office Address</label>
                <input 
                  required 
                  name="address" 
                  value={formData.address} 
                  onChange={handleChange} 
                  minLength={5} 
                  placeholder="e.g. Plot No 42, Bandra East, Mumbai" 
                  className={`govt-input ${fieldErrors.address ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`} 
                />
                {fieldErrors.address && <span className="text-rose-600 text-[10px] font-semibold mt-0.5">{fieldErrors.address}</span>}
              </div>

              {role === "NGO" ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-800 text-xs font-bold">NGO Registration Number</label>
                    <input 
                      required 
                      name="registrationNumber" 
                      value={formData.registrationNumber} 
                      onChange={handleChange} 
                      placeholder="MH/MUM/123/2026" 
                      className={`govt-input ${fieldErrors.registrationNumber ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`} 
                    />
                    {fieldErrors.registrationNumber && <span className="text-rose-600 text-[10px] font-semibold mt-0.5">{fieldErrors.registrationNumber}</span>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-800 text-xs font-bold">CSR-1 Registry Code</label>
                    <input 
                      required 
                      name="csr1Number" 
                      value={formData.csr1Number} 
                      onChange={handleChange} 
                      placeholder="CSR00012345" 
                      className={`govt-input ${fieldErrors.csr1Number ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`} 
                    />
                    {fieldErrors.csr1Number && <span className="text-rose-600 text-[10px] font-semibold mt-0.5">{fieldErrors.csr1Number}</span>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-800 text-xs font-bold">NGO Darpan ID</label>
                    <input 
                      required 
                      name="darpanNumber" 
                      value={formData.darpanNumber} 
                      onChange={handleChange} 
                      placeholder="MH/2021/012345" 
                      className={`govt-input ${fieldErrors.darpanNumber ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`} 
                    />
                    {fieldErrors.darpanNumber && <span className="text-rose-600 text-[10px] font-semibold mt-0.5">{fieldErrors.darpanNumber}</span>}
                  </div>
                </>
              ) : role === "GOV_ENTITY" ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-800 text-xs font-bold">Department / Local Body Code</label>
                    <input 
                      required 
                      name="registrationNumber" 
                      value={formData.registrationNumber} 
                      onChange={handleChange} 
                      placeholder="e.g. ZP-PUNE-CSR" 
                      className={`govt-input ${fieldErrors.registrationNumber ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`} 
                    />
                    {fieldErrors.registrationNumber && <span className="text-rose-600 text-[10px] font-semibold mt-0.5">{fieldErrors.registrationNumber}</span>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-800 text-xs font-bold">Nodal Officer Designation</label>
                    <input 
                      required 
                      name="cin" 
                      value={formData.cin} 
                      onChange={handleChange} 
                      placeholder="e.g. District CSR Nodal Officer" 
                      className={`govt-input ${fieldErrors.cin ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`} 
                    />
                    {fieldErrors.cin && <span className="text-rose-600 text-[10px] font-semibold mt-0.5">{fieldErrors.cin}</span>}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-800 text-xs font-bold">Corporate CIN Code</label>
                    <input 
                      required 
                      name="cin" 
                      value={formData.cin} 
                      onChange={handleChange} 
                      placeholder="L72200MH2018PLC309876" 
                      className={`govt-input ${fieldErrors.cin ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`} 
                    />
                    {fieldErrors.cin && <span className="text-rose-600 text-[10px] font-semibold mt-0.5">{fieldErrors.cin}</span>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-800 text-xs font-bold">GST Registration Number</label>
                    <input 
                      required 
                      name="gst" 
                      value={formData.gst} 
                      onChange={handleChange} 
                      placeholder="27AAAAA1111A1Z1" 
                      className={`govt-input ${fieldErrors.gst ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`} 
                    />
                    {fieldErrors.gst && <span className="text-rose-600 text-[10px] font-semibold mt-0.5">{fieldErrors.gst}</span>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-800 text-xs font-bold">CSR Funding Budget (INR)</label>
                    <input 
                      required 
                      type="number" 
                      name="csrBudget" 
                      value={formData.csrBudget} 
                      onChange={handleChange} 
                      placeholder="e.g. 5000000" 
                      className={`govt-input ${fieldErrors.csrBudget ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`} 
                    />
                    {fieldErrors.csrBudget && <span className="text-rose-600 text-[10px] font-semibold mt-0.5">{fieldErrors.csrBudget}</span>}
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-800 text-xs font-bold font-sans">State</label>
                <select 
                  name="state" 
                  value={formData.state} 
                  onChange={(e) => handleStateChange(e.target.value)} 
                  className={`govt-input ${fieldErrors.state ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
                >
                  {allStatesList.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                  <option value="Other">Other (Type manually)</option>
                </select>
                {fieldErrors.state && <span className="text-rose-600 text-[10px] font-semibold mt-0.5">{fieldErrors.state}</span>}
              </div>

              {formData.state === "Other" && (
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-gray-800 text-xs font-bold font-sans">State Name (Custom)</label>
                  <input 
                    required 
                    type="text"
                    value={customState} 
                    onChange={(e) => setCustomState(e.target.value)} 
                    placeholder="Enter state name" 
                    className="govt-input" 
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-800 text-xs font-bold font-sans">District</label>
                {availableDistricts.length > 0 ? (
                  <select 
                    name="district" 
                    value={formData.district} 
                    onChange={(e) => handleDistrictChange(e.target.value)} 
                    className={`govt-input ${fieldErrors.district ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
                  >
                    {availableDistricts.map(d => (
                      <option key={d.name} value={d.name}>{d.name}</option>
                    ))}
                    <option value="Other">Other (Type manually)</option>
                  </select>
                ) : (
                  <input 
                    required 
                    name="district"
                    value={formData.district === "Other" ? customDistrict : formData.district} 
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, district: "Other" }));
                      setCustomDistrict(e.target.value);
                    }} 
                    placeholder="Enter district name" 
                    className={`govt-input ${fieldErrors.district ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`} 
                  />
                )}
                {fieldErrors.district && <span className="text-rose-600 text-[10px] font-semibold mt-0.5">{fieldErrors.district}</span>}
              </div>

              {formData.district === "Other" && availableDistricts.length > 0 && (
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-gray-800 text-xs font-bold font-sans">District Name (Custom)</label>
                  <input 
                    required 
                    type="text"
                    value={customDistrict} 
                    onChange={(e) => setCustomDistrict(e.target.value)} 
                    placeholder="Enter district name" 
                    className="govt-input" 
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-800 text-xs font-bold font-sans">City</label>
                {availableCities.length > 0 ? (
                  <select 
                    name="city" 
                    value={formData.city} 
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))} 
                    className={`govt-input ${fieldErrors.city ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
                  >
                    {availableCities.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="Other">Other (Type manually)</option>
                  </select>
                ) : (
                  <input 
                    required 
                    name="city"
                    value={formData.city === "Other" ? customCity : formData.city} 
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, city: "Other" }));
                      setCustomCity(e.target.value);
                    }} 
                    placeholder="Enter city name" 
                    className={`govt-input ${fieldErrors.city ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`} 
                  />
                )}
                {fieldErrors.city && <span className="text-rose-600 text-[10px] font-semibold mt-0.5">{fieldErrors.city}</span>}
              </div>

              {formData.city === "Other" && availableCities.length > 0 && (
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-gray-800 text-xs font-bold font-sans">City Name (Custom)</label>
                  <input 
                    required 
                    type="text"
                    value={customCity} 
                    onChange={(e) => setCustomCity(e.target.value)} 
                    placeholder="Enter city name" 
                    className="govt-input" 
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-800 text-xs font-bold font-sans">Taluka</label>
                {availableTalukas.length > 0 ? (
                  <select 
                    name="taluka" 
                    value={formData.taluka} 
                    onChange={(e) => setFormData(prev => ({ ...prev, taluka: e.target.value }))} 
                    className={`govt-input ${fieldErrors.taluka ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`}
                  >
                    {availableTalukas.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    <option value="Other">Other (Type manually)</option>
                  </select>
                ) : (
                  <input 
                    required 
                    name="taluka"
                    value={formData.taluka === "Other" ? customTaluka : formData.taluka} 
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, taluka: "Other" }));
                      setCustomTaluka(e.target.value);
                    }} 
                    placeholder="Enter taluka name" 
                    className={`govt-input ${fieldErrors.taluka ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`} 
                  />
                )}
                {fieldErrors.taluka && <span className="text-rose-600 text-[10px] font-semibold mt-0.5">{fieldErrors.taluka}</span>}
              </div>

              {formData.taluka === "Other" && availableTalukas.length > 0 && (
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-gray-800 text-xs font-bold font-sans">Taluka Name (Custom)</label>
                  <input 
                    required 
                    type="text"
                    value={customTaluka} 
                    onChange={(e) => setCustomTaluka(e.target.value)} 
                    placeholder="Enter taluka name" 
                    className="govt-input" 
                  />
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-2 font-bold text-sm">
              <button 
                type="button" 
                disabled={loading}
                onClick={() => setStep(1)}
                className="w-1/3 bg-[#f4f5f7] border border-[#c7cdd6] text-[#4b5563] hover:bg-[#e0e4ea] py-3.5 rounded-lg transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 bg-[#1789d6] hover:bg-[#146fb0] text-white py-3.5 rounded-lg transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {loading ? "Registering..." : "Submit & Verify OTP"}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-6">
            <div className="flex flex-col gap-1 text-center">
              <h1 className="font-heading font-bold text-xl text-[#14274e] tracking-tight">Enter OTP Code</h1>
              <p className="text-[#6b7280] text-xs font-semibold">We sent a 6-digit OTP code to your registered email <strong className="text-[#14274e]">{formData.email}</strong></p>
            </div>

            <div className="flex flex-col gap-2">
              <input 
                required 
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456" 
                disabled={loading}
                className="w-full text-center bg-white border border-[#c7cdd6] rounded-lg py-4 text-2xl font-bold tracking-widest text-[#14274e] focus:outline-none focus:border-[#1789d6] transition-colors disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1789d6] hover:bg-[#146fb0] text-white font-bold py-3.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify Account"}
            </button>
          </form>
        )}

        {/* Footer Link */}
        {step < 3 && (
          <div className="text-center text-xs text-[#6b7280] mt-2 font-medium">
            Already have an account?{" "}
            <Link href="/login" className="text-[#1789d6] hover:underline font-bold">
              Sign In
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}

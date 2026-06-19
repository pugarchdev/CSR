"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, FileCheck, Landmark, Building2, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Select Role, 2: Fill Details, 3: OTP
  const [role, setRole] = useState<"NGO" | "COMPANY" | "GOV_ENTITY">("NGO");
  const [otp, setOtp] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    pan: "",
    address: "",
    district: "Pune",
    taluka: "",
    registrationNumber: "",
    darpanNumber: "",
    csr1Number: "",
    cin: "",
    gst: "",
    csrBudget: ""
  });

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const isNgo = role === "NGO";
      const isGovEntity = role === "GOV_ENTITY";
      const payload = {
        email: formData.email,
        password: formData.password,
        role: isNgo ? "NGO_ADMIN" : isGovEntity ? "PORTAL_ADMIN" : "COMPANY_ADMIN",
        profile: {
          name: formData.name,
          pan: formData.pan.toUpperCase(),
          address: formData.address,
          district: formData.district,
          taluka: formData.taluka,
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

      setSuccessMsg("Email verified. Please login to continue onboarding and submit documents for admin approval.");
      setTimeout(() => {
        const nextPath = role === "NGO" ? "/onboarding" : role === "COMPANY" ? "/company-dashboard" : "/login";
        router.push(`/login?next=${encodeURIComponent(nextPath)}`);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center px-6 py-16 bg-[#f5f6f8] text-slate-900 min-h-screen relative">
      <div className="w-full max-w-3xl bg-white border border-slate-200 p-8 flex flex-col gap-6 relative shadow-sm">
        
        {/* Step Indicator */}
        <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
          <span className={step >= 1 ? "text-indigo-700 font-bold" : ""}>1. Profile Type</span>
          <span className={`w-12 h-px ${step >= 2 ? "bg-indigo-700" : "bg-slate-800"}`} />
          <span className={step >= 2 ? "text-indigo-700 font-bold" : ""}>2. Details</span>
          <span className={`w-12 h-px ${step >= 3 ? "bg-indigo-700" : "bg-slate-800"}`} />
          <span className={step >= 3 ? "text-indigo-700 font-bold" : ""}>3. Verification</span>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <FileCheck size={16} className="text-emerald-500 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1 text-center items-center">
              <svg viewBox="0 0 100 100" className="w-12 h-12 mb-2" fill="none" stroke="currentColor">
                <polygon points="50,5 82,18 95,50 82,82 50,95 18,82 5,50 18,18" stroke="#1e3a8a" strokeWidth="4.5" fill="#eff6ff" />
                <path d="M28,32 L72,32 M32,44 L68,44 M28,56 L72,56 M36,68 L64,68" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
                <path d="M42,80 L58,80" stroke="#1e3a8a" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <h1 className="font-heading font-extrabold text-xl text-slate-900 tracking-tight">Select Registration Category</h1>
              <p className="text-slate-500 text-xs mt-0.5 font-bold uppercase tracking-wider">Account activation happens only after onboarding and admin document verification</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option NGO */}
              <div 
                className={`p-6 rounded-2xl border cursor-pointer flex flex-col gap-4 transition-all ${
                  role === "NGO" 
                    ? "border-[#12325a] bg-[#e8f0f8] shadow-sm" 
                    : "border-slate-200 bg-white hover:border-[#12325a]"
                }`}
                onClick={() => setRole("NGO")}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  role === "NGO" ? "bg-[#12325a] text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  <Landmark size={20} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-heading font-bold text-base text-slate-900">NGO / Implementing Agency</span>
                  <span className="text-xs text-slate-600 leading-relaxed">Complete onboarding, upload CSR-1 and statutory documents, then submit proposals after approval.</span>
                </div>
              </div>

              {/* Option Company */}
              <div 
                className={`p-6 rounded-2xl border cursor-pointer flex flex-col gap-4 transition-all ${
                  role === "COMPANY" 
                    ? "border-[#12325a] bg-[#e8f0f8] shadow-sm" 
                    : "border-slate-200 bg-white hover:border-[#12325a]"
                }`}
                onClick={() => setRole("COMPANY")}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  role === "COMPANY" ? "bg-[#12325a] text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  <Building2 size={20} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-heading font-bold text-base text-slate-900">Company / CSR Donor</span>
                  <span className="text-xs text-slate-600 leading-relaxed">Submit company details, CSR budget and policy documents for verification before participation.</span>
                </div>
              </div>

              <div 
                className={`p-6 border cursor-pointer flex flex-col gap-4 transition-all ${
                  role === "GOV_ENTITY" 
                    ? "border-[#12325a] bg-[#e8f0f8] shadow-sm" 
                    : "border-slate-200 bg-white hover:border-[#12325a]"
                }`}
                onClick={() => setRole("GOV_ENTITY")}
              >
                <div className={`w-10 h-10 flex items-center justify-center ${
                  role === "GOV_ENTITY" ? "bg-[#12325a] text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  <ShieldAlert size={20} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-heading font-bold text-base text-slate-900">Government Entity</span>
                  <span className="text-xs text-slate-600 leading-relaxed">Register a department or local body for restricted review access after administrator approval.</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setStep(2)}
              className="w-full bg-[#12325a] hover:bg-[#0b2e4a] text-white font-bold py-3.5 flex items-center justify-center gap-2 mt-2 transition-all shadow-sm"
            >
              Continue <ArrowRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 text-center">
              <h1 className="font-heading font-extrabold text-xl text-slate-900 tracking-tight">Registration Details</h1>
              <p className="text-slate-500 text-xs">Fill the details required to begin onboarding and document verification</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-800 text-xs font-bold">Organization Name</label>
                <input required name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Sahyadri Foundation" className="govt-input" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-800 text-xs font-bold">Corporate / NGO Email</label>
                <input required type="email" name="email" value={formData.email} onChange={handleChange} placeholder="e.g. contact@domain.org" className="govt-input" />
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
                    className="govt-input !pr-10" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-[11px] text-slate-400 hover:text-slate-650 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-800 text-xs font-bold">PAN Card Number</label>
                <input required name="pan" value={formData.pan} onChange={handleChange} maxLength={10} minLength={10} placeholder="ABCDE1234F" className="govt-input" />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-gray-800 text-xs font-bold">Registered Office Address</label>
                <input required name="address" value={formData.address} onChange={handleChange} minLength={5} placeholder="e.g. Plot No 42, Bandra East, Mumbai" className="govt-input" />
              </div>

              {role === "NGO" ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-800 text-xs font-bold">NGO Registration Number</label>
                    <input required name="registrationNumber" value={formData.registrationNumber} onChange={handleChange} placeholder="MH/MUM/123/2026" className="govt-input" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-800 text-xs font-bold">CSR-1 Registry Code</label>
                    <input required name="csr1Number" value={formData.csr1Number} onChange={handleChange} placeholder="CSR00012345" className="govt-input" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-800 text-xs font-bold">NGO Darpan ID</label>
                    <input required name="darpanNumber" value={formData.darpanNumber} onChange={handleChange} placeholder="MH/2021/012345" className="govt-input" />
                  </div>
                </>
              ) : role === "GOV_ENTITY" ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-800 text-xs font-bold">Department / Local Body Code</label>
                    <input required name="registrationNumber" value={formData.registrationNumber} onChange={handleChange} placeholder="e.g. ZP-PUNE-CSR" className="govt-input" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-800 text-xs font-bold">Official Designation</label>
                    <input required name="cin" value={formData.cin} onChange={handleChange} placeholder="e.g. District CSR Nodal Officer" className="govt-input" />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-800 text-xs font-bold">Corporate CIN Code</label>
                    <input required name="cin" value={formData.cin} onChange={handleChange} placeholder="L72200MH2018PLC309876" className="govt-input" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-800 text-xs font-bold">GST Registration Number</label>
                    <input required name="gst" value={formData.gst} onChange={handleChange} placeholder="27AAAAA1111A1Z1" className="govt-input" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-800 text-xs font-bold">CSR Funding Budget (INR)</label>
                    <input required type="number" name="csrBudget" value={formData.csrBudget} onChange={handleChange} placeholder="e.g. 5000000" className="govt-input" />
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-800 text-xs font-bold">District (Maharashtra)</label>
                <select name="district" value={formData.district} onChange={handleChange} className="govt-input">
                  <option>Pune</option>
                  <option>Nagpur</option>
                  <option>Thane</option>
                  <option>Gadchiroli</option>
                  <option>Nashik</option>
                  <option>Mumbai City</option>
                  <option>Mumbai Suburban</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-800 text-xs font-bold">Taluka</label>
                <input required name="taluka" value={formData.taluka} onChange={handleChange} placeholder="e.g. Haveli" className="govt-input" />
              </div>
            </div>

            <div className="flex gap-4 mt-2 font-bold text-sm">
              <button 
                type="button" 
                disabled={loading}
                onClick={() => setStep(1)}
                className="w-1/3 bg-[#f8fafc] border border-gray-300 text-gray-700 hover:bg-gray-100 py-3.5 rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                Back
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="w-2/3 bg-[#1e3a8a] hover:bg-[#1e40af] text-white py-3.5 rounded-xl transition-all shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {loading ? "Registering..." : "Submit & Verify OTP"}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-6">
            <div className="flex flex-col gap-1 text-center">
              <h1 className="font-heading font-extrabold text-xl text-gray-900 tracking-tight">Enter OTP Code</h1>
              <p className="text-gray-500 text-xs font-semibold">We sent a 6-digit OTP code to your registered email <strong className="text-[#1e3a8a]">{formData.email}</strong></p>
            </div>

            <div className="flex flex-col gap-2">
              <input 
                required 
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456" 
                disabled={loading}
                className="w-full text-center bg-white border border-gray-250 rounded-xl py-4 text-2xl font-bold tracking-widest text-[#1e3a8a] focus:outline-none focus:border-[#1e3a8a] transition-all disabled:opacity-50" 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold py-3.5 rounded-xl transition-all shadow-sm disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify Account"}
            </button>
          </form>
        )}

        {/* Footer Link */}
        {step < 3 && (
          <div className="text-center text-xs text-slate-400 mt-2 font-medium">
            Already have an account?{" "}
            <Link href="/login" className="text-[#1e3a8a] hover:underline font-bold">
              Sign In
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}

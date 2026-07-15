"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Landmark, ArrowRight, AlertCircle, Eye, EyeOff, FileCheck } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { locationData } from "@/lib/locationData";

function RegisterInvitedForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const [invitationDetails, setInvitationDetails] = useState({
    email: "",
    ngoName: "",
    companyName: "",
    companyId: ""
  });

  const [formData, setFormData] = useState({
    password: "",
    pan: "",
    address: "",
    state: "Maharashtra",
    district: "Pune",
    city: "Pune City",
    taluka: "Haveli",
    village: "",
    registrationNumber: "",
    darpanNumber: "",
    csr1Number: "",
    website: ""
  });

  const selectedStateInfo = locationData.find(s => s.name === formData.state);
  const availableDistricts = selectedStateInfo ? selectedStateInfo.districts : [];
  const selectedDistrictInfo = selectedStateInfo ? selectedStateInfo.districts.find(d => d.name === formData.district) : null;
  const availableCities = selectedDistrictInfo ? selectedDistrictInfo.cities : [];
  const availableTalukas = selectedDistrictInfo ? selectedDistrictInfo.talukas : [];

  useEffect(() => {
    if (!token) {
      setErrorMsg("Invitation token is missing. Please use the link provided in your invitation email.");
      setLoading(false);
      return;
    }

    // Verify token & fetch invitation details
    fetch(`${API_BASE_URL}/auth/ngo/invitation-details?token=${token}`)
      .then(res => {
        if (!res.ok) {
          throw new Error("Invalid or expired invitation token. Please request a new invite.");
        }
        return res.json();
      })
      .then(resData => {
        if (resData.success) {
          setInvitationDetails(resData.data);
        } else {
          setErrorMsg(resData.error || "Failed to fetch invitation details.");
        }
      })
      .catch(err => {
        setErrorMsg(err.message || "Connection error verifying invitation.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleStateChange = (stateName: string) => {
    setFormData(prev => {
      const stateInfo = locationData.find(s => s.name === stateName);
      const defaultDistrict = stateInfo && stateInfo.districts.length > 0 ? stateInfo.districts[0].name : "";
      const districtInfo = stateInfo && stateInfo.districts.length > 0 ? stateInfo.districts[0] : null;
      const defaultCity = districtInfo && districtInfo.cities.length > 0 ? districtInfo.cities[0] : "";
      const defaultTaluka = districtInfo && districtInfo.talukas.length > 0 ? districtInfo.talukas[0] : "";

      return {
        ...prev,
        state: stateName,
        district: defaultDistrict,
        city: defaultCity,
        taluka: defaultTaluka
      };
    });
  };

  const handleDistrictChange = (districtName: string) => {
    setFormData(prev => {
      const stateInfo = locationData.find(s => s.name === prev.state);
      const districtInfo = stateInfo ? stateInfo.districts.find(d => d.name === districtName) : null;
      const defaultCity = districtInfo && districtInfo.cities.length > 0 ? districtInfo.cities[0] : "";
      const defaultTaluka = districtInfo && districtInfo.talukas.length > 0 ? districtInfo.talukas[0] : "";

      return {
        ...prev,
        district: districtName,
        city: defaultCity,
        taluka: defaultTaluka
      };
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");
    setFieldErrors({});

    try {
      const payload = {
        token,
        password: formData.password,
        pan: formData.pan.toUpperCase(),
        address: formData.address,
        state: formData.state,
        district: formData.district,
        city: formData.city,
        taluka: formData.taluka,
        village: formData.village || undefined,
        website: formData.website || undefined,
        registrationNumber: formData.registrationNumber,
        darpanNumber: formData.darpanNumber,
        csr1Number: formData.csr1Number
      };

      const response = await fetch(`${API_BASE_URL}/auth/ngo/register-invited`, {
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
        throw new Error(data.error || "Failed to complete registration");
      }

      setSuccessMsg("Registration successful! Redirecting you to login...");
      setTimeout(() => {
        router.push(`/login?next=${encodeURIComponent("/onboarding")}`);
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during registration");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-screen bg-[#f5f6f8] text-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-indigo-700 border-t-transparent animate-spin" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verifying Invitation Token...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex items-center justify-center px-6 py-16 bg-[#f5f6f8] text-slate-900 min-h-screen relative">
      <div className="w-full max-w-3xl bg-white border border-slate-200 p-8 flex flex-col gap-6 relative shadow-sm">
        
        <div className="flex flex-col gap-1 text-center items-center">
          <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-2">
            <Landmark size={24} className="text-indigo-700" />
          </div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight">NGO Partner Registration</h1>
          {invitationDetails.companyName && (
            <p className="text-slate-500 text-xs mt-0.5 font-bold uppercase tracking-wider bg-indigo-50 text-indigo-800 px-3 py-1 rounded-full">
              Invited by: {invitationDetails.companyName}
            </p>
          )}
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

        {!errorMsg && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            <div className="bg-slate-50 p-4 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">NGO Name</label>
                <p className="text-slate-900 font-bold text-sm">{invitationDetails.ngoName}</p>
              </div>
              <div>
                <label className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Authorized Email</label>
                <p className="text-slate-900 font-bold text-sm">{invitationDetails.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
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
                    placeholder="Set Account Password" 
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
                  placeholder="Plot No, Street, Landmark" 
                  className={`govt-input ${fieldErrors.address ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}`} 
                />
                {fieldErrors.address && <span className="text-rose-600 text-[10px] font-semibold mt-0.5">{fieldErrors.address}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-800 text-xs font-bold">State</label>
                <select 
                  name="state" 
                  value={formData.state} 
                  onChange={(e) => handleStateChange(e.target.value)} 
                  className="govt-input"
                >
                  <option value="Maharashtra">Maharashtra</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-800 text-xs font-bold">District</label>
                <select 
                  name="district" 
                  value={formData.district} 
                  onChange={(e) => handleDistrictChange(e.target.value)} 
                  className="govt-input"
                >
                  {availableDistricts.map(d => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-800 text-xs font-bold">Taluka</label>
                <select 
                  name="taluka" 
                  value={formData.taluka} 
                  onChange={handleChange} 
                  className="govt-input"
                >
                  {availableTalukas.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-800 text-xs font-bold">City / Town</label>
                <select 
                  name="city" 
                  value={formData.city} 
                  onChange={handleChange} 
                  className="govt-input"
                >
                  {availableCities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-800 text-xs font-bold">Village (Optional)</label>
                <input 
                  name="village" 
                  value={formData.village} 
                  onChange={handleChange} 
                  placeholder="Village Name" 
                  className="govt-input" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-800 text-xs font-bold">Website URL (Optional)</label>
                <input 
                  name="website" 
                  value={formData.website} 
                  onChange={handleChange} 
                  placeholder="https://myngo.org" 
                  className="govt-input" 
                />
              </div>

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

              <div className="flex flex-col gap-1.5 md:col-span-2">
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

            </div>

            <button 
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-750 hover:bg-indigo-800 text-white font-bold py-3.5 flex items-center justify-center gap-2 mt-2 transition-all shadow-sm rounded-lg"
            >
              {submitting ? "Registering..." : "Complete Registration"} <ArrowRight size={18} />
            </button>
          </form>
        )}

        <div className="text-center text-xs text-slate-500 mt-4">
          Already registered?{" "}
          <Link href="/login" className="text-indigo-700 font-bold hover:underline">
            Login here
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function RegisterInvitedPage() {
  return (
    <Suspense fallback={
      <div className="flex-grow flex items-center justify-center min-h-screen bg-[#f5f6f8] text-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-indigo-700 border-t-transparent animate-spin" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading...</p>
        </div>
      </div>
    }>
      <RegisterInvitedForm />
    </Suspense>
  );
}

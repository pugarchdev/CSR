"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, LogIn, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!email || !password) {
      setError("Please fill out all fields.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://csr-backend-five.vercel.app/api"}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        // Handle unverified user redirection to verification page
        if (response.status === 403 && data.error && data.error.toLowerCase().includes("verify")) {
          setError("Account not verified. Redirecting to OTP verification...");
          setTimeout(() => {
            router.push(`/register?step=3&email=${encodeURIComponent(email)}`);
          }, 1500);
          return;
        }
        throw new Error(data.error || "Invalid email or password");
      }

      // Save credentials in Zustand auth store
      useAuthStore.getState().login(data.user);

      // Save credentials in localStorage for session preservation
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect depending on user role
      const userRole = data.user.role;
      if (userRole === "NGO_ADMIN" || userRole === "NGO_MEMBER") {
        router.push("/ngo-dashboard");
      } else if (userRole === "COMPANY_ADMIN" || userRole === "COMPANY_MEMBER") {
        router.push("/company-dashboard");
      } else if (userRole === "SUPER_ADMIN") {
        router.push("/admin");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center px-6 py-16 bg-slate-955 text-slate-200 min-h-screen relative">
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-blue-600/5 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-orange-600/5 rounded-full filter blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl flex flex-col gap-6 relative shadow-xl">
        
        {/* Logo & Title */}
        <div className="flex flex-col gap-2 text-center items-center">
          <svg viewBox="0 0 100 100" className="w-14 h-14" fill="none" stroke="currentColor">
            <polygon points="50,5 82,18 95,50 82,82 50,95 18,82 5,50 18,18" stroke="#1e3a8a" strokeWidth="4.5" fill="#eff6ff" />
            <path d="M28,32 L72,32 M32,44 L68,44 M28,56 L72,56 M36,68 L64,68" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
            <path d="M42,80 L58,80" stroke="#1e3a8a" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="flex flex-col mt-2">
            <h1 className="font-heading font-extrabold text-xl text-slate-50 tracking-tight">MahaCSR Portal Sign In</h1>
            <p className="text-slate-400 text-[9px] mt-0.5 font-bold uppercase tracking-wider">Enterprise Collaboration Workspace</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          
          {/* Email input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#1e3a8a] text-xs font-bold">Corporate / NGO Email</label>
            <div className="relative">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. contact@ngo.org"
                disabled={loading}
                className="govt-input !pl-10"
              />
              <Mail size={16} className="absolute left-3.5 top-[11px] text-slate-400" />
            </div>
          </div>

          {/* Password input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#1e3a8a] text-xs font-bold">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="govt-input !pl-10 !pr-10"
              />
              <Lock size={16} className="absolute left-3.5 top-[11px] text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-[11px] text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 mt-2 transition-all disabled:opacity-50 shadow-sm"
          >
            {loading ? "Authenticating..." : <><LogIn size={18} /> Sign In</>}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center text-xs text-slate-400 mt-2 font-medium">
          Don't have an account?{" "}
          <Link href="/register" className="text-[#1e3a8a] hover:underline font-bold">
            Register your organization
          </Link>
        </div>
      </div>
    </div>
  );
}

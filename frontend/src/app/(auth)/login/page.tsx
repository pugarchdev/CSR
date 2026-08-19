"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Award,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Landmark,
  CheckCircle2,
  Loader2,
  KeyRound,
  RotateCcw
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";

import { API_BASE_URL, clearApiCache } from "@/lib/api";
import { Loader } from "@/components/ui/Loader";

// Quick login presets for rapid role testing during development & demo reviews
const DEMO_LOGINS = [
  { label: "Super Admin", email: "admin@mahacsr.gov.in", role: "PORTAL_ADMIN" },
  { label: "Relationship Mgr", email: "rm@mahacsr.gov.in", role: "RM" },
  { label: "Joint Secretary", email: "js@mahacsr.gov.in", role: "JS" },
  { label: "Nodal Officer", email: "nodal@mahacsr.gov.in", role: "NODAL" },
  { label: "CSR Company", email: "company.admin@mahacsr.gov.in", role: "COMPANY" }
];

type AuthMode = "LOGIN" | "FORGOT_REQUEST" | "FORGOT_VERIFY";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("LOGIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Forgot password flow state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("111111");
    setError("");
    setSuccessMsg("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    if (!email || !password) {
      setError("Please fill out all required fields.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 428 && data.passwordResetRequired && data.resetToken) {
          console.log("[LOGIN] 428 received — switching to password reset form", { resetToken: data.resetToken.substring(0, 20) + "..." });
          setResetToken(data.resetToken);
          setError("");
          setSuccessMsg("");
          setLoading(false);
          return;
        }
        if (response.status === 403 && data.error && typeof data.error === "string" && data.error.toLowerCase().includes("verify")) {
          setError("Account not verified. Redirecting to OTP verification...");
          setTimeout(() => {
            router.push(`/register?step=3&email=${encodeURIComponent(email)}`);
          }, 1500);
          return;
        }
        const errMsg = typeof data.error === "string" ? data.error : data.error?.message || data.message || "Invalid email or password";
        throw new Error(errMsg);
      }

      const user = data.data?.user || data.user;
      const accessToken = data.data?.accessToken || data.accessToken || data.data?.token || data.token;

      if (!user || !accessToken) {
        throw new Error("Invalid response payload from authentication gateway");
      }

      const permissionData = data.data ?? data;
      const hasFoldedPermissions = Array.isArray(permissionData?.permissions);

      useAuthStore.getState().login(
        user,
        hasFoldedPermissions
          ? {
              permissions: permissionData.permissions ?? [],
              roles: permissionData.roles ?? [],
              roleDetails: permissionData.roleDetails ?? [],
              isAdmin: permissionData.isAdmin ?? false
            }
          : undefined
      );

      clearApiCache();
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("user", JSON.stringify(user));
      document.cookie = 'mahacsr_auth=1; path=/; max-age=86400; SameSite=Lax';

      const invalidNextPaths = ["/partner/dashboard", "/department/dashboard", "/company/dashboard", "/ngo/dashboard", "/nodal/dashboard", "/rm/dashboard"];
      const rawNextPath = searchParams.get("next") || searchParams.get("redirect");
      const nextPath = rawNextPath && !invalidNextPaths.includes(rawNextPath) && rawNextPath.startsWith("/") ? rawNextPath : null;

      if (nextPath) {
        router.push(nextPath);
        setLoginSuccess(true);
        return;
      }

      router.push("/dashboard");
      setLoginSuccess(true);
    } catch (err: any) {
      const msg = typeof err === "string" ? err : err?.message || "An error occurred during authentication";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
      setLoading(false);
    }
  };

  const handleFirstLoginReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (newPassword.length < 6 || newPassword !== confirmPassword) {
      return setError("Use at least 6 characters and ensure both passwords match.");
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/first-login-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword })
      });
      const data = await response.json();
      if (!response.ok) {
        const msg = typeof data.error === "string"
          ? data.error
          : data.error?.message || data.error?.details?.[0]?.message || data.message || "Password reset failed";
        throw new Error(msg);
      }
      setResetToken("");
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMsg("Password updated successfully. Sign in with your new password.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const targetEmail = (forgotEmail || email).trim();
    if (!targetEmail) {
      return setError("Please enter your registered official email address.");
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail })
      });
      const data = await response.json();
      if (!response.ok) {
        const msg = typeof data.error === "string"
          ? data.error
          : data.error?.message || data.message || "Unable to send password reset code";
        throw new Error(msg);
      }

      setForgotEmail(targetEmail);
      setResendCooldown(data.data?.resendAfterSeconds || 60);
      setMode("FORGOT_VERIFY");
      setSuccessMsg(data.message || `Password reset code sent to ${targetEmail}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendForgotOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : data.message || "Unable to resend OTP");
      }

      setResendCooldown(data.data?.resendAfterSeconds || 60);
      setSuccessMsg(`A new reset OTP has been sent to ${forgotEmail}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!forgotOtp || forgotOtp.trim().length < 6) {
      return setError("Please enter the 6-digit OTP verification code.");
    }
    if (forgotNewPassword.length < 6) {
      return setError("Password must be at least 6 characters in length.");
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      return setError("New passwords do not match. Please re-enter.");
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail,
          otp: forgotOtp.trim(),
          newPassword: forgotNewPassword
        })
      });
      const data = await response.json();
      if (!response.ok) {
        const msg = typeof data.error === "string"
          ? data.error
          : data.error?.message || data.message || "Failed to reset password";
        throw new Error(msg);
      }

      // Success! Prepopulate email and reset form
      setEmail(forgotEmail);
      setPassword("");
      setForgotOtp("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
      setMode("LOGIN");
      setSuccessMsg(data.message || "Password reset successfully! You can now sign in with your new password.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center pt-28 sm:pt-32 pb-16 px-4 bg-gradient-to-br from-[#050c18] via-[#09162e] to-[#0d1d3a] relative overflow-hidden text-slate-100 font-sans">
      {loading && loginSuccess && <Loader label="Initializing workspace & permissions..." fullscreen />}

      {/* Radiant 3D ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[38rem] h-[38rem] bg-gradient-to-br from-amber-500/15 via-orange-600/10 to-transparent rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[42rem] h-[42rem] bg-gradient-to-tl from-blue-600/20 via-indigo-600/15 to-transparent rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center z-10">

        {/* Left Side: Brand Showcase & Emblem */}
        <motion.div
          initial={{ opacity: 0, x: -25 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="lg:col-span-6 flex flex-col gap-6 text-white pr-0 lg:pr-4"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-amber-400 backdrop-blur-xl w-fit shadow-glass">
            <Sparkles size={14} className="animate-pulse text-amber-400" />
            <span>Government of Maharashtra CSR Portal</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-0.5 shadow-2xl shadow-amber-500/30 flex items-center justify-center shrink-0 transform-gpu hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#09152b] rounded-[14px] flex items-center justify-center">
                <Landmark size={32} className="text-amber-400" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-heading">
                Maha<span className="text-blue-400">CSR</span> Setu
              </h1>
              <p className="text-xs text-amber-300/90 font-bold tracking-widest uppercase mt-0.5">
                State CSR Convergence & Impact Platform
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            Unified digital gateway connecting Corporate CSR capital with verified Maharashtra State Government development priorities and District execution workflows under MCA Section 135.
          </p>

          <div className="grid grid-cols-2 gap-3.5 pt-2">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center gap-3.5 shadow-glass hover:bg-white/10 transition-colors">
              <ShieldCheck className="text-amber-400 shrink-0" size={24} />
              <div>
                <p className="text-xs font-extrabold text-white">API Setu Verified</p>
                <p className="text-[11px] text-slate-300 font-medium">GSTN & eKYC Audit</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center gap-3.5 shadow-glass hover:bg-white/10 transition-colors">
              <Award className="text-emerald-400 shrink-0" size={24} />
              <div>
                <p className="text-xs font-extrabold text-white">SLA Engine</p>
                <p className="text-[11px] text-slate-300 font-medium">Verified Turnarounds</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Sleek Glassmorphism Login / Forgot Password Card */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          className="lg:col-span-6 bg-white/95 backdrop-blur-3xl p-7 sm:p-9 rounded-[2.25rem] border border-white/60 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.6)] text-slate-900"
        >
          {/* Card Headers */}
          <div className="mb-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight font-heading">
                {mode === "LOGIN" && "Sign In to Your Workspace"}
                {mode === "FORGOT_REQUEST" && "Reset Your Password"}
                {mode === "FORGOT_VERIFY" && "Set New Password"}
              </h2>
              {mode !== "LOGIN" && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("LOGIN");
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="text-xs font-extrabold text-blue-900 hover:text-amber-600 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Sign In</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              {mode === "LOGIN" && "Enter your official credentials to access your persona dashboard"}
              {mode === "FORGOT_REQUEST" && "Enter your registered official email to receive a 6-digit verification code"}
              {mode === "FORGOT_VERIFY" && `Enter the 6-digit OTP code sent to ${forgotEmail} to reset your password`}
            </p>
          </div>

          {/* Quick Demo Role Selector Pills (development / staging mode only) */}
          {mode === "LOGIN" && process.env.NODE_ENV !== "production" && (
            <div className="mb-5 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                Quick Role Switcher (Demo Review):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DEMO_LOGINS.map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => handleQuickLogin(demo.email)}
                    className={`text-[11px] px-3 py-1.5 rounded-xl border font-bold transition-all duration-200 cursor-pointer ${
                      email === demo.email
                        ? "bg-blue-900 text-white border-blue-900 shadow-md scale-[1.02]"
                        : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200/90 shadow-2xs"
                    }`}
                  >
                    {demo.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-emerald-800 text-xs flex items-center gap-3 font-bold shadow-sm"
            >
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 bg-red-50 border border-red-200 p-3.5 rounded-2xl text-red-700 text-xs flex items-center gap-3 font-bold shadow-2xs"
            >
              <AlertCircle size={18} className="text-red-500 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {resetToken ? (
            /* First Login Mandatory Reset */
            <form onSubmit={handleFirstLoginReset} className="flex flex-col gap-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-900">
                A password change is mandatory before this account can access the portal.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  New Password *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-700 focus:bg-white transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-700 focus:bg-white transition-all shadow-2xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#0f2142] via-[#14274e] to-[#1e3a8a] hover:from-[#0a162d] hover:to-[#172e6b] text-white font-extrabold text-xs shadow-lg shadow-blue-950/20 hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01] cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white shrink-0" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Set Password</span>
                )}
              </button>
            </form>
          ) : mode === "FORGOT_REQUEST" ? (
            /* Forgot Password: Step 1 Request Code */
            <form onSubmit={handleRequestForgotOtp} className="flex flex-col gap-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-xs font-medium text-blue-950 flex items-start gap-3">
                <KeyRound size={20} className="text-blue-700 shrink-0 mt-0.5" />
                <p>
                  We will send a 6-digit One-Time Password (OTP) to your registered corporate or official email address to securely reset your password.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Corporate / Official Email Address *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. user@mahacsr.gov.in"
                    disabled={loading}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-700 focus:bg-white transition-all disabled:opacity-50 shadow-2xs"
                  />
                  <Mail size={17} className="absolute left-3.5 top-3.5 text-slate-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#0f2142] via-[#14274e] to-[#1e3a8a] hover:from-[#0a162d] hover:to-[#172e6b] text-white font-extrabold text-xs shadow-lg shadow-blue-950/20 hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 hover:scale-[1.01] cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white shrink-0" />
                    <span>Sending Reset Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          ) : mode === "FORGOT_VERIFY" ? (
            /* Forgot Password: Step 2 Verify OTP & Set New Password */
            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-3.5 text-xs text-amber-900 flex items-center justify-between">
                <span className="font-semibold truncate">Target: {forgotEmail}</span>
                <button
                  type="button"
                  onClick={() => {
                    setMode("FORGOT_REQUEST");
                    setError("");
                  }}
                  className="text-[11px] font-bold text-blue-900 hover:underline shrink-0 ml-2"
                >
                  Change Email
                </button>
              </div>

              {/* 6-Digit OTP */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    6-Digit Verification Code (OTP) *
                  </label>
                  <button
                    type="button"
                    onClick={handleResendForgotOtp}
                    disabled={resendCooldown > 0 || loading}
                    className="text-[11px] font-bold text-blue-900 hover:text-amber-600 disabled:text-slate-400 transition-colors flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <RotateCcw size={12} />
                    <span>{resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}</span>
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="e.g. 123456"
                  disabled={loading}
                  required
                  className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200/90 rounded-xl text-center text-lg tracking-[6px] font-black text-slate-900 placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-700 focus:bg-white transition-all shadow-2xs"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showForgotNewPassword ? "text" : "password"}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    disabled={loading}
                    required
                    className="w-full pl-10 pr-10 py-3 bg-slate-50/80 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-700 focus:bg-white transition-all shadow-2xs"
                  />
                  <Lock size={17} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showForgotNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    type={showForgotConfirmPassword ? "text" : "password"}
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    disabled={loading}
                    required
                    className="w-full pl-10 pr-10 py-3 bg-slate-50/80 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-700 focus:bg-white transition-all shadow-2xs"
                  />
                  <Lock size={17} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showForgotConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#0f2142] via-[#14274e] to-[#1e3a8a] hover:from-[#0a162d] hover:to-[#172e6b] text-white font-extrabold text-xs shadow-lg shadow-blue-950/20 hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 hover:scale-[1.01] cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white shrink-0" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <span>Reset Password & Return to Login</span>
                    <CheckCircle2 size={16} className="group-hover:scale-110 transition-transform text-emerald-400" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Standard Login Form */
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Corporate / Official Email Address *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@mahacsr.gov.in"
                    disabled={loading}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-700 focus:bg-white transition-all disabled:opacity-50 shadow-2xs"
                  />
                  <Mail size={17} className="absolute left-3.5 top-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("FORGOT_REQUEST");
                      setForgotEmail(email);
                      setError("");
                      setSuccessMsg("");
                    }}
                    className="text-[11px] font-extrabold text-blue-900 hover:text-amber-600 transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={loading}
                    required
                    className="w-full pl-10 pr-10 py-3 bg-slate-50/80 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-700 focus:bg-white transition-all disabled:opacity-50 shadow-2xs"
                  />
                  <Lock size={17} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#0f2142] via-[#14274e] to-[#1e3a8a] hover:from-[#0a162d] hover:to-[#172e6b] text-white font-extrabold text-xs shadow-lg shadow-blue-950/20 hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 hover:scale-[1.01] cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white shrink-0" />
                    <span>Signing in to Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="text-center text-xs text-slate-500 mt-6 pt-5 border-t border-slate-100 font-semibold">
            New corporate or government entity?{" "}
            <Link href="/register" className="text-blue-900 hover:text-amber-600 font-extrabold transition-colors">
              Register Organization
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}


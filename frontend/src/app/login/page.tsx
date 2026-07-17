"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, LogIn, AlertCircle } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { API_BASE_URL, clearApiCache } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Warm up the serverless database connection in the background on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/public/requirements?limit=1`).catch(() => {});
  }, []);

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
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 403 && data.error && data.error.toLowerCase().includes("verify")) {
          setError("Account not verified. Redirecting to OTP verification...");
          setTimeout(() => {
            router.push(`/register?step=3&email=${encodeURIComponent(email)}`);
          }, 1500);
          return;
        }
        throw new Error(data.error || "Invalid email or password");
      }

      const user = data.data?.user || data.user;
      const accessToken = data.data?.accessToken || data.accessToken;

      if (!user) {
        throw new Error("Invalid response format: user data missing");
      }

      // Save credentials in Zustand auth store
      useAuthStore.getState().login(user);

      // Save credentials in localStorage for session preservation
      clearApiCache();
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("user", JSON.stringify(user));

      // Redirect depending on user role
      const nextPath = searchParams.get("next");
      if (nextPath?.startsWith("/")) {
        router.push(nextPath);
        return;
      }

      const userRole = user.role;
      const onboardingStatus = user.organization?.onboardingStatus;
      if (userRole === "CSR_RELATIONSHIP_MANAGER") {
        router.push("/rm/dashboard");
      } else if (userRole === "JOINT_SECRETARY") {
        router.push("/js/dashboard");
      } else if (userRole === "PLANNING_SECRETARY") {
        router.push("/secretary/escalations");
      } else if (userRole === "STATE_CSR_CELL") {
        router.push("/state-cell/dashboard");
      } else if (userRole === "DISTRICT_NODAL_OFFICER") {
        router.push("/nodal/dashboard");
      } else if (userRole === "IMPLEMENTING_AGENCY_USER") {
        router.push("/convergence-projects");
      } else if (userRole === "CORPORATE_USER") {
        router.push("/partner/dashboard");
      } else if (onboardingStatus && onboardingStatus !== "APPROVED" && !["SUPER_ADMIN", "PORTAL_ADMIN", "CSR_ADMIN", "DISTRICT_ADMIN"].includes(userRole)) {
        router.push("/organization/onboarding/status");
      } else if (userRole === "NGO_ADMIN" || userRole === "NGO_MEMBER") {
        router.push("/ngo/dashboard");
      } else if (userRole === "COMPANY_ADMIN" || userRole === "COMPANY_MEMBER") {
        router.push("/company/dashboard");
      } else if (["SUPER_ADMIN", "PORTAL_ADMIN", "CSR_ADMIN", "DISTRICT_ADMIN"].includes(userRole)) {
        router.push("/admin/dashboard");
      } else if (userRole === "BENEFICIARY_AGENCY") {
        router.push("/department/dashboard");
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
    <div className="flex-grow flex items-center justify-center px-6 py-20 bg-slate-50 text-slate-800 min-h-screen relative overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" />
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: "2s" }} />

      <div className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-white/30 p-8 rounded-2xl flex flex-col gap-6 relative shadow-glass hover:shadow-glass-lg transition-all duration-300">
        
        {/* Logo & Title */}
        <div className="flex flex-col gap-2 text-center items-center">
          <svg viewBox="0 0 100 100" className="w-14 h-14" fill="none" stroke="currentColor">
            <polygon points="50,5 82,18 95,50 82,82 50,95 18,82 5,50 18,18" stroke="var(--primary)" strokeWidth="4.5" fill="var(--primary-light)" />
            <path d="M28,32 L72,32 M32,44 L68,44 M28,56 L72,56 M36,68 L64,68" stroke="var(--saffron)" strokeWidth="3" strokeLinecap="round" />
            <path d="M42,80 L58,80" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="flex flex-col mt-2">
            <h1 className="font-heading font-bold text-xl text-slate-900 tracking-tight">MahaCSR Portal Sign In</h1>
            <p className="text-slate-400 text-[10px] mt-1 font-bold uppercase tracking-wider">Enterprise Collaboration Workspace</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200/60 p-4 rounded-xl text-red-700 text-xs flex items-center gap-3">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          
          <div className="relative">
            <Input
              label="Corporate Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. contact@ngo.org"
              disabled={loading}
              className="pl-10"
              required
            />
            <Mail size={16} className="absolute left-3.5 bottom-3 text-slate-400" />
          </div>

          <div className="relative">
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              disabled={loading}
              required
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            variant="gradient"
            loading={loading}
            fullWidth
            className="mt-2"
          >
            Sign In
          </Button>
        </form>

        {/* Footer Link */}
        <div className="text-center text-xs text-slate-500 mt-2 font-medium">
          Don't have an account?{" "}
          <Link href="/register" className="text-blue-600 hover:underline font-bold transition-colors">
            Register your organization
          </Link>
        </div>
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

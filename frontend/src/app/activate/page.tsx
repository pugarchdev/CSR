"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ShieldCheck, AlertCircle, CheckCircle2, Lock } from "lucide-react";
import GovButton from "@/components/gov/GovButton";
import GovInput from "@/components/gov/GovInput";
import GovAlert from "@/components/gov/GovAlert";
import { API_BASE_URL } from "@/lib/api";

interface InvitationDetails {
  email: string;
  fullName: string | null;
  designation: string | null;
  department: string | null;
  district: string | null;
  expiresAt: string;
  purpose: string;
}

function ActivatePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [loadError, setLoadError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError("Missing activation token. Please use the link from your invitation email.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/invitations/${encodeURIComponent(token)}`);
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok) {
          setLoadError(data?.error || "This invitation link is invalid or has expired.");
        } else {
          setDetails(data?.data ?? data);
        }
      } catch {
        if (!cancelled) setLoadError("Could not reach the server. Please try again later.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError("");

    if (password.length < 8) {
      setSubmitError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/invitations/${encodeURIComponent(token)}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setSubmitError(data?.error || "Activation failed. Please try again or contact your administrator.");
        return;
      }

      const payload = data?.data ?? data;
      if (payload?.accessToken && typeof window !== "undefined") {
        localStorage.setItem("accessToken", payload.accessToken);
        if (payload.user) localStorage.setItem("user", JSON.stringify(payload.user));
      }
      setActivated(true);
      setTimeout(() => router.push("/dashboard"), 1800);
    } catch {
      setSubmitError("Could not reach the server. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-amber-400" />
          <div>
            <h1 className="text-lg font-semibold">Activate Your Account</h1>
            <p className="text-xs text-slate-300">MahaCSR Convergence Portal</p>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Validating invitation…
            </div>
          ) : loadError ? (
            <div className="space-y-4">
              <GovAlert variant="danger">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{loadError}</span>
                </div>
              </GovAlert>
              <p className="text-sm text-slate-500">
                If your link has expired, please contact your administrator to request a new invitation.
              </p>
              <Link href="/login" className="text-sm text-blue-700 hover:underline">
                Go to login
              </Link>
            </div>
          ) : activated ? (
            <div className="flex flex-col items-center py-8 text-center gap-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Account activated</h2>
              <p className="text-sm text-slate-500">Redirecting you to your dashboard…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded p-4 text-sm space-y-1">
                {details?.fullName && (
                  <p><span className="text-slate-500">Name:</span> <span className="font-medium text-slate-900">{details.fullName}</span></p>
                )}
                <p><span className="text-slate-500">Email:</span> <span className="font-medium text-slate-900">{details?.email}</span></p>
                {details?.designation && (
                  <p><span className="text-slate-500">Designation:</span> <span className="font-medium text-slate-900">{details.designation}</span></p>
                )}
                {details?.district && (
                  <p><span className="text-slate-500">District:</span> <span className="font-medium text-slate-900">{details.district}</span></p>
                )}
              </div>

              <GovAlert variant="info">
                <div className="flex items-start gap-2 text-sm">
                  <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Set your own password below. For security, passwords are never sent by email. This link is single-use.</span>
                </div>
              </GovAlert>

              <GovInput
                label="New Password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                help="Minimum 8 characters"
                autoComplete="new-password"
              />
              <GovInput
                label="Confirm Password"
                type="password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
              />

              {submitError && <GovAlert variant="danger">{submitError}</GovAlert>}

              <GovButton type="submit" disabled={submitting} className="w-full justify-center">
                {submitting ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Activating…</span>
                ) : (
                  "Activate Account"
                )}
              </GovButton>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
        </div>
      }
    >
      <ActivatePageInner />
    </Suspense>
  );
}

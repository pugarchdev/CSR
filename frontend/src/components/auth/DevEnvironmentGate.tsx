"use client";

import React, { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

const DEV_GATE_STORAGE_KEY = "mahacsr_dev_gate_unlocked_v1";
const REQUIRED_DEV_PASSWORD = "PugArch@mahacsr";

export default function DevEnvironmentGate({
  children
}: {
  children: React.ReactNode;
}) {
  const isDev = process.env.NODE_ENV === "development";

  const [isUnlocked, setIsUnlocked] = useState(!isDev);
  const [mounted, setMounted] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isDev) {
      setIsUnlocked(true);
      return;
    }

    try {
      const stored = localStorage.getItem(DEV_GATE_STORAGE_KEY);
      if (stored === "true") {
        setIsUnlocked(true);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [isDev]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("Please enter the password.");
      return;
    }

    setIsSubmitting(true);

    if (password === REQUIRED_DEV_PASSWORD) {
      try {
        localStorage.setItem(DEV_GATE_STORAGE_KEY, "true");
        sessionStorage.setItem(DEV_GATE_STORAGE_KEY, "true");
        document.cookie = `mahacsr_dev_unlocked=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      } catch {
        // Ignore
      }
      setIsUnlocked(true);
      setIsSubmitting(false);
    } else {
      setError("Incorrect password. Please try again.");
      setIsSubmitting(false);
    }
  };

  // If in production, render children directly without any gate
  if (!isDev) {
    return <>{children}</>;
  }

  // Prevent flash before mounted
  if (!mounted) {
    return null;
  }

  // If unlocked in development mode, show content
  if (isUnlocked) {
    return <>{children}</>;
  }

  // Simple, clean, minimalist access screen
  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Simple Header */}
        <div className="space-y-1.5 text-center">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mx-auto mb-3">
            <Lock size={18} />
          </div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Development Access
          </h1>
          <p className="text-xs text-slate-500">
            Enter password to access MahaCSR
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                autoFocus
                placeholder="Enter password..."
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? "Verifying..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

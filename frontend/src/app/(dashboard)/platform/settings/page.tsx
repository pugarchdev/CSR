"use client";

import React, { useState } from "react";
import { Sliders, ShieldAlert, CheckCircle2, Lock, Info, Save } from "lucide-react";
import { useApiQuery } from "@/lib/apiHooks";

interface FeatureFlag {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  isClientConfirmed: boolean;
}

export default function PlatformSettingsPage() {
  const { data: response, isLoading } = useApiQuery<{ success: boolean; data: FeatureFlag[] }>(
    ["platform", "feature-flags"],
    "/platform-admin/feature-flags"
  );

  const [flags, setFlags] = useState<Record<string, boolean>>({
    ENABLE_DNO_MOU_SIGN: false,
    ENABLE_UC_FINAL_APPROVAL: false,
    ENABLE_HANDOVER_FINAL_APPROVAL: false,
    ENABLE_FINAL_COMPLETION_CERTIFICATION: false,
    ENABLE_PS_OPERATIONAL_OVERRIDE: false,
  });

  const toggleFlag = (key: string) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const featureFlags = response?.data || [
    { key: "ENABLE_DNO_MOU_SIGN", label: "Enable DNO MoU Signing", description: "Allow District Nodal Officers to digitally sign Tripartite MoUs (Disabled by default per Section 10.8)", enabled: false, isClientConfirmed: false },
    { key: "ENABLE_UC_FINAL_APPROVAL", label: "Enable UC Final Approval by DNO", description: "Grant DNO final sign-off authority for Utilization Certificates (Disabled by default)", enabled: false, isClientConfirmed: false },
    { key: "ENABLE_HANDOVER_FINAL_APPROVAL", label: "Enable Final Handover Approval by DNO", description: "Allow DNO to grant final asset handover certificate (Disabled by default)", enabled: false, isClientConfirmed: false },
    { key: "ENABLE_FINAL_COMPLETION_CERTIFICATION", label: "Enable Final Completion Certification", description: "Grant final project completion certification authority (Disabled by default)", enabled: false, isClientConfirmed: false },
    { key: "ENABLE_PS_OPERATIONAL_OVERRIDE", label: "Enable Planning Secretary Operational Override", description: "Allow Planning Secretary to override routine Joint Secretary decisions (Disabled by default)", enabled: false, isClientConfirmed: false },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
              Super Admin Settings
            </span>
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              Feature Gating Matrix
            </span>
          </div>
          <h1 className="mt-1 font-heading text-xl font-extrabold text-slate-950">
            Platform Feature Flags & Authority Controls
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Strict client-unconfirmed authority guards as mandated by Section 10.8 of Codex Specification v1.0
          </p>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
        <Lock size={18} className="text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Authoritative Constraint:</strong> All unconfirmed authority actions
          (such as DNO MoU digital signing, final UC sign-off, and handover decisions) remain safely disabled by default.
          Enabling any flag requires formal administrative sign-off and an immutable audit log entry.
        </div>
      </div>

      {/* Feature Flags List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Client-TBD Authority Controls
          </h3>
        </div>

        <div className="divide-y divide-slate-100">
          {featureFlags.map((flag) => {
            const isEnabled = flags[flag.key] ?? flag.enabled;

            return (
              <div key={flag.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 transition hover:bg-slate-50/80">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      {flag.key}
                    </span>
                    {!flag.isClientConfirmed && (
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                        Client TBD
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-900">{flag.label}</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{flag.description}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleFlag(flag.key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                      isEnabled ? "bg-emerald-600" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className={`text-xs font-bold ${isEnabled ? "text-emerald-700" : "text-slate-400"}`}>
                    {isEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

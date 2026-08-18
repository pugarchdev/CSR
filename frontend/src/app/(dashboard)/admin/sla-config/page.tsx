"use client";

import { FormEvent, useEffect, useState } from "react";
import { Clock, ShieldCheck, CheckCircle2, Calendar, RotateCcw, Save } from "lucide-react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { StandardPageHeader } from "@/components/layout/StandardPageHeader";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";

import GovInput from "@/components/gov/GovInput";
import GovButton from "@/components/gov/GovButton";
import AccessDenied from "@/components/gov/AccessDenied";
import { apiFetch } from "@/lib/api";
import { isAdmin } from "@/lib/roleAccess";
import { useAuthStore } from "@/store/authStore";

type SlaValues = Record<string, number>;
type SlaResponse = { config: SlaValues; defaults: SlaValues; holidays?: string[] };

const labels: Record<string, string> = {
  RM_RESPONSE: "RM First Response Window",
  JS_DECISION: "Joint Secretary Decision Window",
  DISTRICT_ASSIGNMENT: "District Assignment Window",
  EXECUTION: "Execution Review Window",
  GRIEVANCE_LEVEL_1: "Level 1 Grievance Resolution",
  GRIEVANCE_LEVEL_2: "Level 2 Grievance Escalation",
};

export default function SlaConfigurationPage() {
  const [values, setValues] = useState<SlaValues>({});
  const [defaults, setDefaults] = useState<SlaValues>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [holidayText, setHolidayText] = useState("");

  useEffect(() => {
    apiFetch<SlaResponse>("/admin/sla/config")
      .then((response) => {
        setValues(response.config || {});
        setDefaults(response.defaults || {});
        setHolidayText((response.holidays || []).join(", "));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load SLA configuration"))
      .finally(() => setLoading(false));
  }, []);

  const { hasPermission, isAdmin: storeIsAdmin } = useAuthStore();
  const canAccess =
    storeIsAdmin ||
    hasPermission("page:sla-config:view") ||
    hasPermission("sla:configure") ||
    hasPermission("role:configure") ||
    isAdmin();

  if (!canAccess) {
    return <AccessDenied requiredRoles={["Super Admin", "Administrator"]} />;
  }

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await apiFetch<{ config: SlaValues }>("/admin/sla/config", {
        method: "PUT",
        body: JSON.stringify({ updates: values, holidays: holidayText.split(",").map((date) => date.trim()).filter(Boolean) }),
      });
      setValues(response.config || values);
      setMessage("SLA configuration saved successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to save SLA configuration");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => setValues({ ...defaults });

  return (
    <GovPortalLayout userRole="SUPER_ADMIN">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 text-slate-900">
        <StandardPageHeader
          title="SLA & Escalation Engine"
          category="Admin / SLA Configuration"
          description="Configure statutory turnaround timelines (in working days) across coordination stages and citizen grievance redressal."
        />

        {/* 4-Column Animated KPI Cards */}
        <StatCardGroup columns={4}>
          <StatCard
            label="RM Response Window"
            value={loading ? "…" : `${values.RM_RESPONSE ?? 2} Days`}
            icon={Clock}
            colorTheme="blue"
            sublabel="Intake & first touch"
            index={0}
          />
          <StatCard
            label="JS Decision Window"
            value={loading ? "…" : `${values.JS_DECISION ?? 7} Days`}
            icon={ShieldCheck}
            colorTheme="purple"
            sublabel="Secretariat sanction"
            index={1}
          />
          <StatCard
            label="District Assignment"
            value={loading ? "…" : `${values.DISTRICT_ASSIGNMENT ?? 3} Days`}
            icon={CheckCircle2}
            colorTheme="emerald"
            sublabel="Field nodal allocation"
            index={2}
          />
          <StatCard
            label="L1 Grievance Redressal"
            value={loading ? "…" : `${values.GRIEVANCE_LEVEL_1 ?? 15} Days`}
            icon={Calendar}
            colorTheme="amber"
            sublabel="Citizen & NGO disputes"
            index={3}
          />
        </StatCardGroup>

        {/* Form Container */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-xs font-semibold text-slate-500">
              Loading authoritative SLA parameters…
            </div>
          ) : (
            <form onSubmit={save} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {Object.keys(values).map((stage) => (
                  <GovInput
                    key={stage}
                    type="number"
                    min={1}
                    max={365}
                    required
                    label={labels[stage] || stage.replaceAll("_", " ")}
                    help={`Default baseline: ${defaults[stage] ?? "—"} working day(s)`}
                    value={values[stage] ?? ""}
                    onChange={(event) => setValues((current) => ({ ...current, [stage]: Number(event.target.value) }))}
                  />
                ))}
              </div>

              <div className="border-t border-slate-100 pt-5">
                <GovInput
                  label="Maharashtra Public Holidays Exclusions"
                  help="Comma-separated YYYY-MM-DD dates. Weekends (Saturdays, Sundays) and these dates do not consume SLA working hours."
                  value={holidayText}
                  onChange={(event) => setHolidayText(event.target.value)}
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
                  {error}
                </div>
              )}
              {message && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
                  {message}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <GovButton type="submit" disabled={saving || loading}>
                  <Save size={14} className="mr-1.5 inline" />
                  {saving ? "Saving Configuration…" : "Save Configuration"}
                </GovButton>
                <GovButton type="button" variant="secondary" onClick={reset} disabled={saving || loading}>
                  <RotateCcw size={14} className="mr-1.5 inline" />
                  Reset to Defaults
                </GovButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </GovPortalLayout>
  );
}


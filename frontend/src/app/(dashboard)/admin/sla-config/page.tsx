"use client";

import { FormEvent, useEffect, useState } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardBody } from "@/components/gov/GovCard";
import GovInput from "@/components/gov/GovInput";
import GovButton from "@/components/gov/GovButton";
import AccessDenied from "@/components/gov/AccessDenied";
import { apiFetch } from "@/lib/api";
import { isAdmin } from "@/lib/roleAccess";
import { useAuthStore } from "@/store/authStore";

type SlaValues = Record<string, number>;
type SlaResponse = { config: SlaValues; defaults: SlaValues; holidays?: string[] };

const labels: Record<string, string> = {
  RM_RESPONSE: "RM first response",
  JS_DECISION: "Joint Secretary decision",
  DISTRICT_ASSIGNMENT: "District assignment",
  EXECUTION: "Execution review",
  GRIEVANCE_LEVEL_1: "Level 1 grievance",
  GRIEVANCE_LEVEL_2: "Level 2 grievance",
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
  const canAccess = storeIsAdmin || hasPermission("role:configure") || isAdmin();

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
      <GovPageHeader
        breadcrumb="Home / Admin / SLA Configuration"
        title="SLA Configuration"
        description="Configure workflow windows in working days. Changes are audited and apply to new SLA calculations."
      />
      <GovCard>
        <GovCardBody>
          {loading ? <p>Loading configuration…</p> : (
            <form onSubmit={save}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {Object.keys(values).map((stage) => (
                  <GovInput
                    key={stage}
                    type="number"
                    min={1}
                    max={365}
                    required
                    label={labels[stage] || stage.replaceAll("_", " ")}
                    help={`Default: ${defaults[stage] ?? "—"} day(s)`}
                    value={values[stage] ?? ""}
                    onChange={(event) => setValues((current) => ({ ...current, [stage]: Number(event.target.value) }))}
                  />
                ))}
              </div>
              <GovInput
                label="Maharashtra public holidays"
                help="Comma-separated YYYY-MM-DD dates. Saturdays, Sundays and these dates do not consume SLA days."
                value={holidayText}
                onChange={(event) => setHolidayText(event.target.value)}
              />
              {error && <p className="gov-error-text" role="alert">{error}</p>}
              {message && <p className="gov-help" role="status">{message}</p>}
              <div className="flex gap-3 mt-6">
                <GovButton type="submit" disabled={saving || loading}>{saving ? "Saving…" : "Save configuration"}</GovButton>
                <GovButton type="button" variant="secondary" onClick={reset} disabled={saving || loading}>Reset to defaults</GovButton>
              </div>
            </form>
          )}
        </GovCardBody>
      </GovCard>
    </GovPortalLayout>
  );
}

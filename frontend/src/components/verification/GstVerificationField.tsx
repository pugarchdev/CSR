"use client";

import { useState } from "react";
import GovButton from "@/components/gov/GovButton";
import GovInput from "@/components/gov/GovInput";
import GovAlert from "@/components/gov/GovAlert";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import GovModal from "@/components/gov/GovModal";
import GovTextarea from "@/components/gov/GovTextarea";
import VerifiedDetailsCard from "./VerifiedDetailsCard";
import {
  GstVerifiedData,
  GstVerifyResult,
  VerificationApiError,
  VerificationEntityType,
  reverifyGstin,
  verifyGstin
} from "@/lib/verificationApi";
import { validateField } from "@/lib/validation";

interface GstVerificationFieldProps {
  value: string;
  onChange: (value: string) => void;
  entityType: VerificationEntityType;
  /** Without an entityId the field runs in format-validation-only mode (no live GSTN call). */
  entityId?: string;
  source?: string;
  onVerified?: (result: GstVerifyResult) => void;
  /** Show the Reverify action (gate by role in the caller). */
  canReverify?: boolean;
  initialStatus?: "unverified" | "verified";
  initialData?: GstVerifiedData | null;
  disabled?: boolean;
  label?: string;
  required?: boolean;
}

/**
 * Reusable GSTIN verification field backed by API Setu (GSTN).
 * Verified details become read-only; re-verification is restricted
 * to authorized roles and requires a reason (audited server-side).
 */
export default function GstVerificationField({
  value,
  onChange,
  entityType,
  entityId,
  source,
  onVerified,
  canReverify = false,
  initialStatus = "unverified",
  initialData = null,
  disabled = false,
  label = "GSTIN",
  required = false
}: GstVerificationFieldProps) {
  const [status, setStatus] = useState<"unverified" | "verifying" | "verified">(initialStatus);
  const [verifiedData, setVerifiedData] = useState<GstVerifiedData | null>(initialData);
  const [error, setError] = useState("");
  const [reverifyOpen, setReverifyOpen] = useState(false);
  const [reverifyReason, setReverifyReason] = useState("");

  const liveMode = Boolean(entityId);
  const formatError = value ? validateField("gst", value) : "";
  const canSubmit = Boolean(value) && !formatError && !disabled && status !== "verifying";

  const runVerify = async (reverify: boolean) => {
    if (!entityId) return;
    setStatus("verifying");
    setError("");
    try {
      const result = reverify
        ? await reverifyGstin({ gstin: value, entityType, entityId, source, reason: reverifyReason })
        : await verifyGstin({ gstin: value, entityType, entityId, source });
      setVerifiedData(result.data);
      setStatus("verified");
      setReverifyOpen(false);
      setReverifyReason("");
      onVerified?.(result);
    } catch (err) {
      const apiError = err as VerificationApiError;
      setStatus(verifiedData ? "verified" : "unverified");
      setError(apiError.message || "GST verification failed. Please try again.");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 8 }}>
        <div style={{ flex: "1 1 260px" }}>
          <GovInput
            label={label}
            required={required}
            format="gst"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="e.g. 27AAPFU0939F1ZV"
            readOnly={status === "verified" || status === "verifying"}
            disabled={disabled}
          />
        </div>
        {liveMode && status !== "verified" && (
          <GovButton
            type="button"
            onClick={() => runVerify(false)}
            disabled={!canSubmit}
            style={{ minHeight: 40 }}
          >
            {status === "verifying" ? "Verifying…" : "Verify GSTIN"}
          </GovButton>
        )}
        {status === "verified" && (
          <>
            <GovStatusBadge variant="success">GSTIN Verified</GovStatusBadge>
            {canReverify && (
              <GovButton
                type="button"
                variant="secondary"
                onClick={() => setReverifyOpen(true)}
                disabled={disabled}
                style={{ minHeight: 40 }}
              >
                Reverify GST
              </GovButton>
            )}
          </>
        )}
      </div>

      {error && (
        <GovAlert variant="danger" style={{ marginTop: 8 }}>
          {error}
        </GovAlert>
      )}

      {status === "verified" && verifiedData && <VerifiedDetailsCard data={verifiedData} />}

      <GovModal open={reverifyOpen} onClose={() => setReverifyOpen(false)} title="Re-verify GSTIN" width={480}>
        <p style={{ fontSize: 13, marginBottom: 8 }}>
          Re-verification fetches fresh details from GSTN and appends a new entry to the immutable verification
          history. A reason is required and will be recorded in the audit trail.
        </p>
        <GovTextarea
          label="Reason for re-verification"
          required
          value={reverifyReason}
          onChange={(event) => setReverifyReason(event.target.value)}
          rows={3}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <GovButton type="button" variant="muted" onClick={() => setReverifyOpen(false)}>
            Cancel
          </GovButton>
          <GovButton
            type="button"
            onClick={() => runVerify(true)}
            disabled={reverifyReason.trim().length < 5 || status === "verifying"}
          >
            {status === "verifying" ? "Verifying…" : "Confirm Re-verify"}
          </GovButton>
        </div>
      </GovModal>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import GovButton from "@/components/gov/GovButton";
import GovInput from "@/components/gov/GovInput";
import GovAlert from "@/components/gov/GovAlert";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import {
  AadhaarVerifyOtpResult,
  VerificationApiError,
  VerificationEntityType,
  generateAadhaarOtp,
  verifyAadhaarOtp
} from "@/lib/verificationApi";
import { validateField } from "@/lib/validation";

interface AadhaarVerificationFieldProps {
  entityType: VerificationEntityType;
  entityId?: string;
  source?: string;
  personName?: string;
  onVerified?: (result: AadhaarVerifyOtpResult) => void;
  disabled?: boolean;
  initialStatus?: "unverified" | "verified";
  initialMasked?: string;
}

/**
 * Reusable Aadhaar OTP eKYC field backed by API Setu (UIDAI).
 *
 * PRIVACY: the Aadhaar number lives only in this component's state while the
 * flow is active and is cleared immediately after verification. The backend
 * stores only the masked form (XXXX-XXXX-1234). The OTP is never stored.
 */
export default function AadhaarVerificationField({
  entityType,
  entityId,
  source,
  personName,
  onVerified,
  disabled = false,
  initialStatus = "unverified",
  initialMasked = ""
}: AadhaarVerificationFieldProps) {
  const [step, setStep] = useState<"input" | "otp" | "verified">(initialStatus === "verified" ? "verified" : "input");
  const [aadhaar, setAadhaar] = useState("");
  const [consent, setConsent] = useState(false);
  const [otp, setOtp] = useState("");
  const [recordId, setRecordId] = useState("");
  const [maskedAadhaar, setMaskedAadhaar] = useState(initialMasked);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const aadhaarRef = useRef("");

  // Countdown for the OTP validity window.
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const formatError = aadhaar ? validateField("aadhaar", aadhaar) : "";
  const canGenerate = Boolean(entityId) && Boolean(aadhaar) && !formatError && consent && !disabled && !loading;

  const handleGenerateOtp = async () => {
    if (!entityId) return;
    setLoading(true);
    setError("");
    try {
      const result = await generateAadhaarOtp({ aadhaarNumber: aadhaar, entityType, entityId, source });
      aadhaarRef.current = aadhaar; // held transiently for the verify call only
      setRecordId(result.recordId);
      setMaskedAadhaar(result.maskedAadhaar);
      setExpiresAt(new Date(result.expiresAt).getTime());
      setAttemptsLeft(null);
      setOtp("");
      setStep("otp");
    } catch (err) {
      const apiError = err as VerificationApiError;
      setError(apiError.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await verifyAadhaarOtp({ recordId, otp, aadhaarNumber: aadhaarRef.current });
      // Clear the Aadhaar number from memory as soon as verification completes.
      aadhaarRef.current = "";
      setAadhaar("");
      setOtp("");
      setStep("verified");
      setMaskedAadhaar(result.maskedAadhaar);
      onVerified?.(result);
    } catch (err) {
      const apiError = err as VerificationApiError & { validationErrors?: unknown };
      const meta = (apiError as any).meta as { attemptsLeft?: number } | undefined;
      if (typeof meta?.attemptsLeft === "number") {
        setAttemptsLeft(meta.attemptsLeft);
      }
      setError(apiError.message || "OTP verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes}:${String(rest).padStart(2, "0")}`;
  };

  if (step === "verified") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <GovStatusBadge variant="success">e-KYC Verified (UIDAI)</GovStatusBadge>
        {maskedAadhaar && <span style={{ fontSize: 13, color: "#555" }}>Aadhaar {maskedAadhaar}</span>}
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid var(--gov-border, #d8d8d8)", background: "var(--gov-surface-muted, #fafafa)", padding: 12, borderRadius: 4 }}>
      {step === "input" && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 8 }}>
            <div style={{ flex: "1 1 220px" }}>
              <GovInput
                label={personName ? `Aadhaar Number (${personName})` : "Aadhaar Number"}
                format="aadhaar"
                value={aadhaar}
                onChange={(event) => setAadhaar(event.target.value)}
                placeholder="12-digit Aadhaar number"
                disabled={disabled || loading}
              />
            </div>
            <GovButton type="button" onClick={handleGenerateOtp} disabled={!canGenerate} style={{ minHeight: 40 }}>
              {loading ? "Sending OTP…" : "Generate OTP"}
            </GovButton>
          </div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 8, fontSize: 12, color: "#444", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              disabled={disabled || loading}
              style={{ marginTop: 2 }}
            />
            <span>
              I voluntarily consent to the use of my Aadhaar number for e-KYC verification through API Setu / UIDAI
              for the Maharashtra CSR Portal. Only my masked Aadhaar and verification status will be stored.
            </span>
          </label>
          {!entityId && (
            <GovAlert variant="info" style={{ marginTop: 8 }}>
              Aadhaar e-KYC will be available once the record is saved.
            </GovAlert>
          )}
        </>
      )}

      {step === "otp" && (
        <>
          <div style={{ fontSize: 13, marginBottom: 8 }}>
            OTP sent to the mobile number registered with Aadhaar <strong>{maskedAadhaar}</strong>.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 8 }}>
            <div style={{ width: 160 }}>
              <GovInput
                label="Enter OTP"
                format="otp"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit OTP"
                disabled={loading}
              />
            </div>
            <GovButton
              type="button"
              onClick={handleVerifyOtp}
              disabled={otp.length !== 6 || loading || secondsLeft === 0}
              style={{ minHeight: 40 }}
            >
              {loading ? "Verifying…" : "Verify OTP"}
            </GovButton>
            <GovButton
              type="button"
              variant="secondary"
              onClick={() => {
                setStep("input");
                setExpiresAt(null);
                setError("");
              }}
              disabled={loading || secondsLeft > 0}
              style={{ minHeight: 40 }}
            >
              Resend OTP
            </GovButton>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: secondsLeft > 60 ? "#555" : "#b91c1c" }}>
            {secondsLeft > 0 ? (
              <>OTP expires in {formatCountdown(secondsLeft)}</>
            ) : (
              <>OTP expired. Use Resend OTP to try again.</>
            )}
            {attemptsLeft !== null && attemptsLeft > 0 && <> · {attemptsLeft} attempt(s) remaining</>}
          </div>
        </>
      )}

      {error && (
        <GovAlert variant="danger" style={{ marginTop: 8 }}>
          {error}
        </GovAlert>
      )}
    </div>
  );
}

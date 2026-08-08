"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import GovButton from "@/components/gov/GovButton";
import GovModal from "@/components/gov/GovModal";
import GovSelect from "@/components/gov/GovSelect";
import GovTextarea from "@/components/gov/GovTextarea";

export interface PortfolioTransferResult {
  sourceRmId: string;
  targetRmId: string;
  targetRmName: string | null;
  enquiryCount: number;
  pitchCount: number;
  totalCount: number;
}

interface RelationshipManagerOption {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  designation?: string | null;
}

interface TransferPortfolioModalProps {
  open: boolean;
  onClose: () => void;
  sourceRmId: string;
  sourceRmLabel: string;
  endpoint: "/rm/transfer-portfolio" | "/admin/rm/transfer-portfolio";
  includeSourceRmId?: boolean;
  onTransferred: (result: PortfolioTransferResult) => void;
}

export default function TransferPortfolioModal({
  open,
  onClose,
  sourceRmId,
  sourceRmLabel,
  endpoint,
  includeSourceRmId = false,
  onTransferred,
}: TransferPortfolioModalProps) {
  const [relationshipManagers, setRelationshipManagers] = useState<RelationshipManagerOption[]>([]);
  const [targetRmId, setTargetRmId] = useState("");
  const [reason, setReason] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !sourceRmId) return;

    let active = true;
    setTargetRmId("");
    setReason("");
    setError("");
    setLoadingOptions(true);

    apiFetch<any>(`/rm/available?excludeId=${encodeURIComponent(sourceRmId)}`)
      .then((response) => {
        if (active) setRelationshipManagers(response?.data || []);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load active Relationship Managers.");
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });

    return () => {
      active = false;
    };
  }, [open, sourceRmId]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (!targetRmId) {
      setError("Select the Relationship Manager who will receive this portfolio.");
      return;
    }
    if (trimmedReason.length < 5) {
      setError("Enter a transfer reason of at least 5 characters.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await apiFetch<any>(endpoint, {
        method: "POST",
        body: JSON.stringify({
          ...(includeSourceRmId ? { sourceRmId } : {}),
          targetRmId,
          reason: trimmedReason,
        }),
      });
      onTransferred(response?.data || response);
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Portfolio transfer failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GovModal open={open} onClose={submitting ? () => undefined : onClose} title="Transfer Portfolio" width={560}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="gov-alert gov-alert-info" style={{ fontSize: 13 }}>
          All active corporate enquiries and government pitches assigned to <strong>{sourceRmLabel}</strong> will move together. Completed, rejected, closed, and cancelled records remain unchanged.
        </div>

        {error && <div className="gov-alert gov-alert-danger">{error}</div>}

        <GovSelect
          label="Transfer To"
          required
          value={targetRmId}
          disabled={loadingOptions || submitting}
          onChange={(event) => setTargetRmId(event.target.value)}
        >
          <option value="">{loadingOptions ? "Loading active RMs..." : "Select an active Relationship Manager"}</option>
          {relationshipManagers.map((rm) => {
            const name = [rm.firstName, rm.lastName].filter(Boolean).join(" ") || rm.email;
            return <option key={rm.id} value={rm.id}>{name} — {rm.email}</option>;
          })}
        </GovSelect>

        {!loadingOptions && relationshipManagers.length === 0 && !error && (
          <p className="text-xs font-semibold text-amber-700">No other active Relationship Manager is currently available.</p>
        )}

        <GovTextarea
          label="Reason for Transfer"
          required
          rows={4}
          value={reason}
          disabled={submitting}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Describe the handover, transfer, leave, or offboarding reason."
        />

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <GovButton type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </GovButton>
          <GovButton
            type="submit"
            variant="primary"
            disabled={submitting || loadingOptions || relationshipManagers.length === 0}
          >
            {submitting ? "Transferring..." : "Transfer Entire Portfolio"}
          </GovButton>
        </div>
      </form>
    </GovModal>
  );
}

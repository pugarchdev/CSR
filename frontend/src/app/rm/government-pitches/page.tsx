"use client";

import { useState } from "react";
import Link from "next/link";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovStatusBadge, { statusToVariant } from "@/components/gov/GovStatusBadge";
import GovButton from "@/components/gov/GovButton";
import GovDataTable from "@/components/gov/GovDataTable";
import GovAlert from "@/components/gov/GovAlert";
import { useApiQuery } from "@/lib/apiHooks";
import { Eye, MapPin, Calendar, Clock, AlertTriangle } from "lucide-react";

interface Pitch {
  id: string;
  pitchReferenceId: string;
  officialName: string;
  designation: string;
  department: string;
  district: string;
  taluka: string;
  estimatedCost: number;
  status: string;
  submittedAt: string | null;
  verificationDueAt: string | null;
}

export default function RMPitchesPage() {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const { data: response, isLoading, error } = useApiQuery<{ success: boolean; data: Pitch[] }>(
    ["rm", "pitches", "list"],
    "/rm/pitches",
    { staleTime: 30 * 1000 }
  );

  const pitches = response?.data || [];

  const filteredPitches = pitches.filter((p) => {
    if (filterStatus === "ALL") return true;
    return p.status === filterStatus;
  });

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, " ");
  };

  const columns = [
    {
      key: "pitchReferenceId",
      label: "Reference ID",
      render: (v: unknown) => <span style={{ fontWeight: 700, color: "var(--gov-primary)" }}>{v as string}</span>,
    },
    {
      key: "department",
      label: "Department & Official",
      render: (v: unknown, row: Record<string, unknown>) => {
        const castRow = row as unknown as Pitch;
        return (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 600 }}>{castRow.department}</span>
            <span style={{ fontSize: 11, color: "var(--gov-text-muted)" }}>
              {castRow.officialName} ({castRow.designation})
            </span>
          </div>
        );
      },
    },
    {
      key: "location",
      label: "Location",
      render: (_: unknown, row: Record<string, unknown>) => {
        const castRow = row as unknown as Pitch;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
            <MapPin size={14} style={{ color: "var(--gov-text-muted)" }} />
            <span>{castRow.taluka}, {castRow.district}</span>
          </div>
        );
      },
    },
    {
      key: "estimatedCost",
      label: "Estimated Cost",
      render: (v: unknown) => {
        const cost = Number(v ?? 0);
        if (cost >= 10000000) return `₹${(cost / 10000000).toFixed(2)} Cr`;
        return `₹${(cost / 100000).toFixed(2)} Lakh`;
      },
    },
    {
      key: "status",
      label: "Verification Status",
      render: (v: unknown) => (
        <GovStatusBadge variant={statusToVariant(v as string)}>
          {getStatusLabel(v as string)}
        </GovStatusBadge>
      ),
    },
    {
      key: "verificationDueAt",
      label: "SLA Due",
      render: (v: unknown) => {
        if (!v) return "—";
        const date = new Date(v as string);
        const diffDays = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const color = diffDays < 0 ? "var(--gov-danger)" : diffDays <= 2 ? "var(--gov-warning)" : "inherit";
        return (
          <span style={{ color, fontWeight: diffDays <= 2 ? 600 : "normal" }}>
            {date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
            {diffDays < 0 ? ` (Overdue)` : diffDays <= 2 ? ` (${diffDays}d left)` : ""}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (_: unknown, row: Record<string, unknown>) => (
        <Link href={`/rm/government-pitches/${row.id}`}>
          <GovButton variant="secondary" style={{ minHeight: 28, padding: "4px 10px", fontSize: 12 }}>
            <Eye size={14} style={{ marginRight: 4 }} /> Verify Pitch
          </GovButton>
        </Link>
      ),
    },
  ];

  return (
    <GovPortalLayout>
      <GovPageHeader
        title="Government Pitch Verification Queue"
        description="Verify genuine development needs proposed by government officials, check geo-tagged images, and submit verification report"
        breadcrumb="Home / Pitches"
      />

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {["ALL", "RM_VERIFICATION_PENDING", "RM_VERIFIED", "JS_APPROVAL_PENDING", "PUBLIC_LISTED"].map((st) => (
          <GovButton
            key={st}
            variant={filterStatus === st ? "primary" : "secondary"}
            onClick={() => setFilterStatus(st)}
          >
            {st.replace(/_/g, " ")}
          </GovButton>
        ))}
      </div>

      <GovCard>
        <GovCardHeader>
          <GovCardTitle>Government Pitches ({filteredPitches.length})</GovCardTitle>
        </GovCardHeader>
        <GovCardBody style={{ padding: 0 }}>
          {error && (
            <div style={{ padding: 16 }}>
              <GovAlert variant="danger">Failed to load government pitches. Please try again.</GovAlert>
            </div>
          )}
          <GovDataTable
            columns={columns}
            data={filteredPitches as unknown as Record<string, unknown>[]}
            loading={isLoading}
            emptyMessage="No government pitches found in this queue."
          />
        </GovCardBody>
      </GovCard>
    </GovPortalLayout>
  );
}

"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Loader2, MapPin, ArrowRight } from "lucide-react";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovStatusBadge, { statusToVariant } from "@/components/gov/GovStatusBadge";
import { apiFetch } from "@/lib/api";

interface AssignmentEntry {
  id: string;
  entityType: string;
  entityId: string;
  assignmentType: string;
  status: string;
  assignedAt: string;
  assignedRole: { id: string; name: string } | null;
  assignedBy: { id: string; email: string; officerProfile: { fullName: string | null } | null } | null;
  entity: {
    title: string;
    reference: string;
    district: string;
    currentStage: string | null;
  } | null;
}

/**
 * "My Project Assignments" dashboard widget — shared across Nodal Officer,
 * Field Officer, JS and Corporate dashboards. Reads /assignments/mine.
 */
export default function MyAssignmentsWidget({
  title = "My Project Assignments",
  limit = 5,
  emptyMessage = "No project assignments yet.",
}: {
  title?: string;
  limit?: number;
  emptyMessage?: string;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-assignments"],
    queryFn: () =>
      apiFetch<any>("/assignments/mine").then(
        (response: any) => ((response?.data ?? response)?.assignments ?? []) as AssignmentEntry[]
      ),
  });

  const assignments = (data ?? []).slice(0, limit);

  return (
    <GovCard>
      <GovCardHeader>
        <GovCardTitle>
          <span className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" /> {title}
          </span>
        </GovCardTitle>
      </GovCardHeader>
      <GovCardBody>
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-slate-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading assignments…
          </div>
        ) : isError ? (
          <p className="text-sm text-slate-500 py-4 text-center">Could not load assignments.</p>
        ) : assignments.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">{emptyMessage}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {assignments.map((assignment) => (
              <li key={assignment.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {assignment.entity?.title || assignment.entity?.reference || assignment.entityId}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                      {assignment.entity?.district && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {assignment.entity.district}
                        </span>
                      )}
                      <span>{assignment.assignmentType.replace(/_/g, " ")}</span>
                      {assignment.assignedRole && <span>· {assignment.assignedRole.name}</span>}
                      {assignment.entity?.currentStage && (
                        <span>· Stage: {assignment.entity.currentStage.replace(/_/g, " ")}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <GovStatusBadge variant={statusToVariant(assignment.status)}>
                      {assignment.status.replace(/_/g, " ")}
                    </GovStatusBadge>
                    <Link
                      href={`/nodal/assignments/${assignment.entityType}/${assignment.entityId}`}
                      className="text-blue-700 hover:text-blue-900"
                      title="Open assignment"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </GovCardBody>
    </GovCard>
  );
}

import { ReactNode, CSSProperties } from "react";

interface GovStatusBadgeProps {
  children: ReactNode;
  variant?: "success" | "warning" | "danger" | "info" | "muted";
  className?: string;
  style?: CSSProperties;
}

/**
 * Map any convergence framework status string to a badge variant color.
 */
export function statusToVariant(status: string): "success" | "warning" | "danger" | "info" | "muted" {
  const s = (status || "").toUpperCase().replace(/\s+/g, "_");
  const map: Record<string, "success" | "warning" | "danger" | "info" | "muted"> = {
    // Grievance
    RAISED: "warning",
    ACKNOWLEDGED: "info",
    LEVEL_1_REVIEW: "info",
    LEVEL_1_RESOLVED: "success",
    ESCALATED_TO_STATE_CELL: "danger",
    LEVEL_2_RESOLVED: "success",
    ESCALATED_TO_JS_SECRETARY: "danger",
    CLOSED: "muted",
    REJECTED: "danger",
    // General
    SUBMITTED: "info",
    PENDING: "warning",
    RM_ASSIGNED: "info",
    JS_APPROVED: "success",
    JS_REJECTED: "danger",
    JS_APPROVAL_PENDING: "warning",
    RM_VERIFICATION_PENDING: "warning",
    RM_VERIFIED: "success",
    NODAL_OFFICER_APPOINTED: "info",
    MOU_PENDING: "warning",
    MOU_SIGNED: "success",
    PROJECT_ONBOARDED: "info",
    // Milestone
    NOT_STARTED: "muted",
    IN_PROGRESS: "info",
    COMPLETED: "success",
    // Escalation
    ESCALATED: "danger",
    OVERDUE: "danger",
    // Verification
    VERIFIED: "success",
    PENDING_VERIFICATION: "warning",
    // Project
    ONBOARDED: "info",
    EXECUTION_STARTED: "info",
    // Interest
    INTERESTED: "info",
    CORPORATE_INTEREST_RECEIVED: "info",
  };
  return map[s] || "muted";
}

export default function GovStatusBadge({
  children,
  variant = "info",
  className = "",
  style,
}: GovStatusBadgeProps) {
  const variantClass = `gov-status-${variant}`;
  return <span className={`gov-status ${variantClass} ${className}`} style={style}>{children}</span>;
}

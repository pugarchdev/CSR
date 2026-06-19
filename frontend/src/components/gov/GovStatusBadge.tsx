import { ReactNode, CSSProperties } from "react";

interface GovStatusBadgeProps {
  children: ReactNode;
  variant?: "success" | "warning" | "danger" | "info" | "muted";
  className?: string;
  style?: CSSProperties;
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

// Made with Bob

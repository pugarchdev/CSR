import { ReactNode } from "react";

interface GovAlertProps {
  children: ReactNode;
  variant?: "info" | "warning" | "danger" | "success";
  className?: string;
}

export default function GovAlert({
  children,
  variant = "info",
  className = "",
}: GovAlertProps) {
  return <div className={`gov-alert ${variant} ${className}`}>{children}</div>;
}

// Made with Bob

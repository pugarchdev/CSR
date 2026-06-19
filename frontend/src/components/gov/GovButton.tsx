import { ReactNode, ButtonHTMLAttributes } from "react";
import "../../styles/gov-theme.css";

interface GovButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "muted" | "danger";
  className?: string;
}

export default function GovButton({
  children,
  variant = "primary",
  className = "",
  ...props
}: GovButtonProps) {
  const variantClass = `gov-btn-${variant}`;
  return (
    <button className={`gov-btn ${variantClass} ${className}`} {...props}>
      {children}
    </button>
  );
}

// Made with Bob

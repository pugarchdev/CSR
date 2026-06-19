import { ReactNode } from "react";
import "../../styles/gov-theme.css";

interface GovPageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: string;
  actions?: ReactNode;
}

export default function GovPageHeader({
  title,
  description,
  breadcrumb,
  actions,
}: GovPageHeaderProps) {
  return (
    <div className="gov-page-header">
      {breadcrumb && <div className="gov-breadcrumb">{breadcrumb}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h2 className="gov-page-title">{title}</h2>
          {description && <p className="gov-page-description">{description}</p>}
        </div>
        {actions && <div style={{ flexShrink: 0 }}>{actions}</div>}
      </div>
    </div>
  );
}

// Made with Bob

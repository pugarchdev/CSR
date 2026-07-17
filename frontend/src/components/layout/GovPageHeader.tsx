import { ReactNode } from "react";
import "../../styles/gov-theme.css";

interface GovPageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: string;
  actions?: ReactNode;
}

/**
 * Modernized space-saving inline page header layout.
 * Replaces the bulky card banner with a clean, typography-only header.
 */
export default function GovPageHeader({
  title,
  description,
  breadcrumb,
  actions,
}: GovPageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/60 pb-4 mb-6">
      <div>
        {breadcrumb && (
          <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">
            {breadcrumb}
          </div>
        )}
        <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
        {description && <p className="text-xs text-slate-500 mt-1 leading-normal max-w-4xl">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

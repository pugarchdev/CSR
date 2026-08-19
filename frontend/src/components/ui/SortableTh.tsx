"use client";

import React from "react";
import { ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { SortDirection } from "@/hooks/useTableSort";

export interface SortableThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortKey?: string;
  currentSortKey?: string | null;
  currentSortDirection?: SortDirection;
  onSort?: (key: string) => void;
  align?: "left" | "center" | "right";
  children: React.ReactNode;
}

export function SortableTh({
  sortKey,
  currentSortKey,
  currentSortDirection,
  onSort,
  align = "left",
  className = "",
  children,
  ...props
}: SortableThProps) {
  const isSortable = Boolean(sortKey && onSort);
  const isActive = isSortable && currentSortKey === sortKey && Boolean(currentSortDirection);

  const handleClick = () => {
    if (isSortable && sortKey && onSort) {
      onSort(sortKey);
    }
  };

  const alignClass =
    align === "right"
      ? "justify-end text-right"
      : align === "center"
      ? "justify-center text-center"
      : "justify-start text-left";

  return (
    <th
      {...props}
      onClick={isSortable ? handleClick : undefined}
      aria-sort={
        isActive
          ? currentSortDirection === "asc"
            ? "ascending"
            : "descending"
          : undefined
      }
      className={`px-4 py-3.5 text-[11px] font-extrabold uppercase tracking-wider transition-colors ${
        isSortable
          ? "cursor-pointer select-none group hover:bg-slate-100/70 hover:text-slate-900"
          : ""
      } ${
        isActive
          ? "text-blue-900 bg-blue-50/50"
          : "text-slate-500"
      } ${className}`}
    >
      <div className={`flex items-center gap-1.5 ${alignClass}`}>
        <span>{children}</span>
        {isSortable && (
          <span className="inline-flex items-center shrink-0 transition-transform">
            {isActive && currentSortDirection === "asc" ? (
              <ChevronUp size={14} className="text-blue-700 stroke-[2.5]" />
            ) : isActive && currentSortDirection === "desc" ? (
              <ChevronDown size={14} className="text-blue-700 stroke-[2.5]" />
            ) : (
              <ArrowUpDown
                size={12}
                className="text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity"
              />
            )}
          </span>
        )}
      </div>
    </th>
  );
}

export default SortableTh;

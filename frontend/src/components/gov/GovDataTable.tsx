"use client";

import { ReactNode } from "react";
import { Skeleton } from "../ui/Skeleton";
import "../../styles/gov-theme.css";

interface Column {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  render?: (value: unknown, row: Record<string, unknown>) => ReactNode;
}

interface GovDataTableProps {
  columns: Column[];
  data: Record<string, unknown>[];
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  onRowClick?: (row: Record<string, unknown>) => void;
  rowClassName?: (row: Record<string, unknown>) => string;
}

/**
 * Government-styled data table redesigned to look like a premium SaaS data table.
 */
export default function GovDataTable({
  columns,
  data,
  loading = false,
  error,
  emptyMessage = "No records found.",
  onRowClick,
  rowClassName,
}: GovDataTableProps) {
  if (loading) {
    return (
      <div className="gov-card p-6">
        <div className="h-10 shimmer-loader rounded-lg mb-3" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 border-t border-slate-100/50 flex items-center gap-4 py-2">
            {[...Array(columns.length)].map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1 rounded-full" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="gov-alert danger bg-red-50 text-red-700 border-red-200/60 p-4 rounded-xl border flex items-center gap-3">
        <span className="font-semibold">{error}</span>
      </div>
    );
  }

  return (
    <div className="gov-card overflow-hidden">
      <div className="gov-table-container overflow-x-auto">
        <table className="gov-table w-full">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={{ textAlign: col.align || "left" }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: "center", padding: 48, color: "var(--gov-text-muted)" }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={(row.id as string) || idx}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={onRowClick ? { cursor: "pointer" } : undefined}
                  className={`${rowClassName ? rowClassName(row) : ""} transition-colors`}
                >
                  {columns.map((col) => (
                    <td key={col.key} style={{ textAlign: col.align || "left" }}>
                      {col.render ? col.render(row[col.key], row) : (row[col.key] as ReactNode) ?? "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

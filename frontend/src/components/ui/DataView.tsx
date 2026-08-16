"use client";

import React from "react";
import { Search, Filter } from "lucide-react";
import { ViewToggle, ViewMode } from "./ViewToggle";
import { useResponsiveViewMode } from "@/hooks/useResponsiveViewMode";

export interface FilterConfig {
  key: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
}

export interface DataViewProps<T> {
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderCard: (item: T, index: number) => React.ReactNode;
  renderRow: (item: T, index: number) => React.ReactNode;
  headers?: string[];
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  defaultView?: ViewMode;
  onItemClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
}

export function DataView<T>({
  data,
  keyExtractor,
  renderCard,
  renderRow,
  headers = [],
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  defaultView,
  onItemClick,
  emptyMessage = "No records found matching your criteria",
  className = "",
}: DataViewProps<T>) {
  const [viewMode, setViewMode] = useResponsiveViewMode(defaultView);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Control Bar: Search, Filters, and View Toggle */}
      {(onSearchChange || filters.length > 0) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/90 p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          {onSearchChange && (
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-10 pr-4 text-xs font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none transition-all placeholder-slate-400"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 ml-auto">
            {filters.map((filter) => (
              <div key={filter.key} className="flex items-center gap-2">
                <Filter size={14} className="text-slate-400" />
                <select
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600"
                >
                  {filter.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <ViewToggle view={viewMode} onChange={setViewMode} />
          </div>
        </div>
      )}

      {/* Content Rendering */}
      {data.length === 0 ? (
        <div className="p-12 text-center bg-white/60 rounded-2xl border border-slate-200/80 text-xs font-medium text-slate-500">
          {emptyMessage}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((item, idx) => (
            <div
              key={keyExtractor(item, idx)}
              onClick={() => onItemClick && onItemClick(item)}
              className={onItemClick ? "cursor-pointer" : ""}
            >
              {renderCard(item, idx)}
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            {headers.length > 0 && (
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className="p-3.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-slate-100">
              {data.map((item, idx) => (
                <tr
                  key={keyExtractor(item, idx)}
                  onClick={() => onItemClick && onItemClick(item)}
                  className={onItemClick ? "hover:bg-blue-50/40 transition-colors cursor-pointer" : ""}
                >
                  {renderRow(item, idx)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Filter Bar Component - Reusable search and filter component
"use client";

import { ReactNode } from "react";
import { Search, Filter, RefreshCw, X } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

// ============================================
// Filter Bar Component
// ============================================

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: {
    key: string;
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;
  }[];
  onReset?: () => void;
  onRefresh?: () => void;
  actions?: ReactNode;
  className?: string;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  onReset,
  onRefresh,
  actions,
  className,
}: FilterBarProps) {
  const hasActiveFilters = searchQuery || filters.some(f => f.value);

  return (
    <div className={cn(
      "bg-white border border-gray-200 rounded-lg p-4",
      className
    )}>
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-10 pl-10 pr-10 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filters */}
        {filters.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {filters.map((filter) => (
              <select
                key={filter.key}
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="h-10 px-4 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors min-w-[140px]"
              >
                <option value="">{filter.label}</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && onReset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-gray-500"
            >
              <X size={14} className="mr-1" />
              Clear
            </Button>
          )}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
            >
              <RefreshCw size={14} className="mr-1" />
              Refresh
            </Button>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Results Summary Component
// ============================================

interface ResultsSummaryProps {
  total: number;
  filtered: number;
  label?: string;
  badges?: {
    label: string;
    count: number;
    variant?: "primary" | "success" | "warning" | "danger" | "info" | "muted";
  }[];
  className?: string;
}

export function ResultsSummary({
  total,
  filtered,
  label = "items",
  badges = [],
  className,
}: ResultsSummaryProps) {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
      className
    )}>
      <p className="text-sm text-gray-500">
        Showing {filtered} of {total} {label}
      </p>
      {badges.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {badges.map((badge, index) => (
            <span
              key={index}
              className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                badge.variant === "primary" && "bg-primary-100 text-primary-700",
                badge.variant === "success" && "bg-success-100 text-success-700",
                badge.variant === "warning" && "bg-warning-100 text-warning-700",
                badge.variant === "danger" && "bg-danger-100 text-danger-700",
                badge.variant === "info" && "bg-info-100 text-info-700",
                badge.variant === "muted" && "bg-gray-100 text-gray-600",
                !badge.variant && "bg-gray-100 text-gray-600"
              )}
            >
              {badge.count} {badge.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Quick Filter Chips
// ============================================

interface QuickFilterChipsProps {
  options: {
    label: string;
    value: string;
    count?: number;
  }[];
  selected: string;
  onChange: (value: string) => void;
  className?: string;
}

export function QuickFilterChips({
  options,
  selected,
  onChange,
  className,
}: QuickFilterChipsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value === selected ? "" : option.value)}
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
            selected === option.value
              ? "bg-primary-100 text-primary-700 border border-primary-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent"
          )}
        >
          {option.label}
          {option.count !== undefined && (
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full",
              selected === option.value
                ? "bg-primary-200 text-primary-800"
                : "bg-gray-200 text-gray-700"
            )}>
              {option.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

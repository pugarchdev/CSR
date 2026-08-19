"use client";

import { useState, useMemo, useCallback } from "react";

export type SortDirection = "asc" | "desc" | null;

export interface UseTableSortOptions<T> {
  initialKey?: string | null;
  initialDirection?: SortDirection;
  customGetters?: Record<string, (item: T) => unknown>;
}

/**
 * Safely extracts nested property by path (e.g. "ngoProfile.darpanNumber" or "company.name")
 */
export function getNestedValue(obj: any, path: string): unknown {
  if (!obj || typeof obj !== "object" || !path) return undefined;
  if (path in obj) return obj[path];
  
  const segments = path.split(".");
  let current: any = obj;
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    current = current[segment];
  }
  return current;
}

/**
 * Parses values into comparable formats (handling Indian currency ₹Cr/Lakh, percentages, dates, numbers, strings).
 */
export function normalizeSortValue(val: unknown): number | string | boolean | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "boolean") return val ? 1 : 0;
  if (typeof val === "number") return isNaN(val) ? null : val;
  if (val instanceof Date) return val.getTime();

  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed || trimmed === "—" || trimmed === "-") return null;

    // Check for Indian currency format: ₹12.5 Cr, ₹50 Lakh, ₹1,50,000, 10 Cr, 40L, etc.
    const cleanCur = trimmed.replace(/[₹,\s]/g, "");
    const crMatch = cleanCur.match(/^([\d.]+)(?:cr|crore|crores)?$/i);
    if (/cr|crore/i.test(trimmed)) {
      const numPart = parseFloat(cleanCur.replace(/cr|crore|crores/gi, ""));
      if (!isNaN(numPart)) return numPart * 10000000;
    }
    if (/lakh|lakhs|lac|lacs|l/i.test(trimmed)) {
      const numPart = parseFloat(cleanCur.replace(/lakh|lakhs|lac|lacs|l/gi, ""));
      if (!isNaN(numPart)) return numPart * 100000;
    }
    if (/k$/i.test(cleanCur)) {
      const numPart = parseFloat(cleanCur.replace(/k/gi, ""));
      if (!isNaN(numPart)) return numPart * 1000;
    }
    if (/%$/.test(cleanCur)) {
      const numPart = parseFloat(cleanCur.replace(/%/g, ""));
      if (!isNaN(numPart)) return numPart;
    }

    // Pure numeric check
    if (!isNaN(Number(cleanCur)) && cleanCur !== "") {
      return Number(cleanCur);
    }

    // Date check (e.g. 2026-08-19, 19 Aug 2026, 19/08/2026)
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed) || /^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/.test(trimmed) || /^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
      const parsedDate = Date.parse(trimmed);
      if (!isNaN(parsedDate)) return parsedDate;
    }

    return trimmed.toLowerCase();
  }

  return String(val).toLowerCase();
}

/**
 * Universal comparator with ascending/descending order and nulls-at-bottom behavior.
 */
export function compareValues(a: unknown, b: unknown, direction: "asc" | "desc"): number {
  const normA = normalizeSortValue(a);
  const normB = normalizeSortValue(b);

  // Nulls always sort to the bottom
  if (normA === null && normB === null) return 0;
  if (normA === null) return 1;
  if (normB === null) return -1;

  let comparison = 0;
  if (typeof normA === "number" && typeof normB === "number") {
    comparison = normA - normB;
  } else {
    comparison = String(normA).localeCompare(String(normB), undefined, { numeric: true, sensitivity: "base" });
  }

  return direction === "asc" ? comparison : -comparison;
}

/**
 * Hook for intelligent client-side sorting of table data.
 */
export function useTableSort<T>(items: T[], options?: UseTableSortOptions<T>) {
  const [sortKey, setSortKey] = useState<string | null>(options?.initialKey ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(options?.initialDirection ?? null);

  const requestSort = useCallback((key: string) => {
    setSortKey((currentKey) => {
      if (currentKey !== key) {
        setSortDirection("asc");
        return key;
      }
      // Toggle cycle: asc -> desc -> null (reset)
      setSortDirection((currentDir) => {
        if (currentDir === "asc") return "desc";
        if (currentDir === "desc") return null;
        return "asc";
      });
      return key;
    });
  }, []);

  const resetSort = useCallback(() => {
    setSortKey(null);
    setSortDirection(null);
  }, []);

  const sortedItems = useMemo(() => {
    if (!sortKey || !sortDirection || !Array.isArray(items) || items.length <= 1) {
      return items;
    }

    const getter = options?.customGetters?.[sortKey];

    return [...items].sort((a, b) => {
      const aVal = getter ? getter(a) : getNestedValue(a, sortKey);
      const bVal = getter ? getter(b) : getNestedValue(b, sortKey);
      return compareValues(aVal, bVal, sortDirection);
    });
  }, [items, sortKey, sortDirection, options?.customGetters]);

  return {
    sortedItems,
    sortKey,
    sortDirection,
    requestSort,
    resetSort,
    setSortKey,
    setSortDirection,
  };
}

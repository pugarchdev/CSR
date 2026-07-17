// Data Table Component — Premium SaaS Design
"use client";

import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

// ============================================
// Types
// ============================================

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  render?: (row: T) => ReactNode;
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  pagination?: PaginationConfig;
  searchable?: boolean;
  onSearch?: (query: string) => void;
  filterable?: boolean;
  bulkActions?: {
    label: string;
    onClick: (selectedRows: T[]) => void;
  }[];
  className?: string;
}

// ============================================
// Data Table Component
// ============================================

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  loading = false,
  emptyState,
  onRowClick,
  pagination,
  searchable = false,
  onSearch,
  filterable = false,
  bulkActions,
  className
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (!current || current.key !== key) {
        return { key, direction: "asc" };
      }
      return { key, direction: current.direction === "asc" ? "desc" : "asc" };
    });
  };

  const sortedData = sortConfig
    ? [...data].sort((a, b) => {
        const aValue = (a as any)[sortConfig.key];
        const bValue = (b as any)[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      })
    : data;

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const toggleRowSelection = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(data.map(keyExtractor)));
    }
  };

  const selectedData = data.filter(row => selectedRows.has(keyExtractor(row)));

  if (loading) {
    return <TableSkeleton columns={columns.length} />;
  }

  if (data.length === 0 && emptyState) {
    return (
      <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl shadow-glass">
        {emptyState}
      </div>
    );
  }

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      {(searchable || filterable || bulkActions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            {searchable && (
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search..."
                  className="h-10 pl-10 pr-4 bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-[3px] focus:ring-blue-500/10 w-full sm:w-64 transition-all"
                />
              </div>
            )}
            {filterable && (
              <Button variant="outline" size="sm" className="gap-2">
                <Filter size={14} />
                Filters
              </Button>
            )}
          </div>

          {selectedRows.size > 0 && bulkActions && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2"
            >
              <span className="text-sm text-slate-500 font-medium">
                {selectedRows.size} selected
              </span>
              {bulkActions.map((action, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => action.onClick(selectedData)}
                >
                  {action.label}
                </Button>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-glass">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-100/80 sticky top-0 z-10">
              <tr>
                {bulkActions && (
                  <th className="w-12 px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={data.length > 0 && selectedRows.size === data.length}
                      onChange={toggleAllSelection}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/40"
                      aria-label="Select all rows"
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      "px-4 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap",
                      column.sortable && "cursor-pointer hover:text-slate-700 select-none group",
                      column.align === "right" && "text-right",
                      column.align === "center" && "text-center"
                    )}
                    style={{ width: column.width }}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className={cn("flex items-center gap-1.5", column.align === "right" && "justify-end")}>
                      {column.header}
                      {column.sortable && sortConfig?.key === column.key && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.15 }}
                        >
                          {sortConfig.direction === "asc" ? 
                            <ChevronUp size={14} className="text-blue-500" /> : 
                            <ChevronDown size={14} className="text-blue-500" />
                          }
                        </motion.span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              <AnimatePresence mode="wait">
                {sortedData.map((row, index) => (
                  <motion.tr
                    key={keyExtractor(row)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: index * 0.02, duration: 0.2 }}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "hover:bg-blue-50/30 transition-colors duration-150 group",
                      onRowClick && "cursor-pointer"
                    )}
                  >
                    {bulkActions && (
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedRows.has(keyExtractor(row))}
                          onChange={() => toggleRowSelection(keyExtractor(row))}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/40"
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          "px-4 py-3.5 text-sm text-slate-700",
                          column.align === "right" && "text-right",
                          column.align === "center" && "text-center"
                        )}
                      >
                        {column.render
                          ? column.render(row)
                          : (row as any)[column.key]}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-5 py-3.5 border-t border-slate-100/60 gap-4 bg-slate-50/30">
            <div className="text-sm text-slate-500">
              Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{" "}
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
              <span className="font-medium text-slate-700">{pagination.total}</span> entries
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <ChevronLeft size={14} />
              </Button>
              {/* Page numbers */}
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => pagination.onPageChange(pageNum)}
                    className={cn(
                      "h-8 w-8 rounded-lg text-xs font-medium transition-all",
                      pagination.page === pageNum
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page >= totalPages}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Table Skeleton
// ============================================

function TableSkeleton({ columns }: { columns: number }) {
  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-glass">
      <div className="h-12 shimmer-loader rounded-none" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-14 border-t border-slate-100/50 flex items-center px-5">
          {[...Array(columns)].map((_, j) => (
            <div key={j} className="flex-1 px-3">
              <div className="h-4 shimmer-loader rounded-full w-3/4" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

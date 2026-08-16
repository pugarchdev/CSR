"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 10,
  className = ""
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const actualTotalItems = totalItems ?? (totalPages * itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, actualTotalItems);

  // Generate page numbers
  const pages: number[] = [];
  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200/80 text-xs ${className}`}>
      <div className="text-slate-500 font-medium">
        Showing <span className="font-bold text-slate-800">{startItem}</span> to{" "}
        <span className="font-bold text-slate-800">{endItem}</span> of{" "}
        <span className="font-bold text-slate-900">{totalItems}</span> results
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-2xs"
        >
          <ChevronLeft size={14} /> Previous
        </button>

        {startPage > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all shadow-2xs"
            >
              1
            </button>
            {startPage > 2 && <span className="px-1 text-slate-400 font-bold">...</span>}
          </>
        )}

        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all shadow-2xs ${
              currentPage === page
                ? "bg-blue-900 text-white border border-blue-900"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-1 text-slate-400 font-bold">...</span>}
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all shadow-2xs"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-2xs"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default Pagination;

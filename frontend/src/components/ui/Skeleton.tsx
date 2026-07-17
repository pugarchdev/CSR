// Skeleton Loading Components — Premium Shimmer
"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "shimmer-loader rounded-lg",
        className
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl p-5 shadow-glass">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl p-5 shadow-glass">
      <div className="absolute top-0 left-0 right-0 h-[2px] shimmer-loader rounded-none" />
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
        <Skeleton className="w-12 h-12 rounded-xl" />
      </div>
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
}

export function TableSkeleton({ rows = 5 }: TableSkeletonProps) {
  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-glass">
      <div className="h-12 shimmer-loader rounded-none" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 border-t border-slate-100/50 flex items-center px-5 gap-5"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <Skeleton className="h-4 w-24 flex-1 rounded-full" />
          <Skeleton className="h-4 w-32 flex-1 rounded-full" />
          <Skeleton className="h-4 w-20 flex-1 rounded-full" />
          <Skeleton className="h-6 w-16 flex-shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>
      <TableSkeleton rows={6} />
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-glass">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-10 rounded-xl" />
            </div>
          ))}
        </div>
        <Skeleton className="h-12 w-40 mt-6 rounded-xl" />
      </div>
    </div>
  );
}

interface ListSkeletonProps {
  items?: number;
}

export function ListSkeleton({ items = 5 }: ListSkeletonProps) {
  return (
    <div className="space-y-3 animate-fade-in">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-glass">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3 rounded-full" />
            <Skeleton className="h-3 w-1/2 rounded-full" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

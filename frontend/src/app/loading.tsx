// Route-level loading UI — premium shimmer skeleton
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1380px] px-4 py-6 sm:px-6 md:px-8 animate-fade-in" aria-busy="true" aria-label="Loading page">
      {/* Page header skeleton */}
      <div className="mb-6 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/20 shadow-glass p-5">
        <div className="h-3 w-40 shimmer-loader rounded-full" />
        <div className="mt-4 h-7 w-72 shimmer-loader rounded-lg" />
        <div className="mt-3 h-3 w-96 max-w-full shimmer-loader rounded-full" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/20 shadow-glass p-5"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-3 flex-1">
                <div className="h-3 w-20 shimmer-loader rounded-full" />
                <div className="h-8 w-16 shimmer-loader rounded-lg" />
              </div>
              <div className="w-12 h-12 shimmer-loader rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/20 shadow-glass overflow-hidden">
        <div className="h-12 shimmer-loader rounded-none" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-14 border-t border-slate-100/50 flex items-center px-5 gap-6"
            style={{ animationDelay: `${(i + 4) * 60}ms` }}
          >
            <div className="h-4 shimmer-loader rounded-full flex-[2]" />
            <div className="h-4 shimmer-loader rounded-full flex-[3]" />
            <div className="h-4 shimmer-loader rounded-full flex-1" />
            <div className="h-6 w-16 shimmer-loader rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

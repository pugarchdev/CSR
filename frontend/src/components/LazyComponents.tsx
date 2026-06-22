import dynamic from "next/dynamic";

export const ImpactSphere = dynamic(() => import("@/components/ImpactSphere"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[320px] md:h-[450px] lg:h-[500px] flex items-center justify-center bg-slate-50 rounded-lg">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        <span className="text-sm text-slate-500">Loading visualization...</span>
      </div>
    </div>
  ),
});

export const GisMap = dynamic(() => import("@/components/GisMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] flex items-center justify-center bg-slate-50 rounded-lg">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-green-600 rounded-full animate-spin" />
        <span className="text-sm text-slate-500">Loading map...</span>
      </div>
    </div>
  ),
});
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Banknote,
  Building2,
  FolderKanban,
  HeartHandshake,
  Landmark,
  Layers,
  MapPin,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  DistrictCsr,
  resolveDistrict,
  stateTotals,
} from "./districtCsrData";

/* ------------------------------------------------------------------ */
/* GeoJSON types + projection                                          */
/* ------------------------------------------------------------------ */

type Ring = [number, number][];

interface GeoFeature {
  type: "Feature";
  properties: Record<string, string>;
  geometry:
    | { type: "Polygon"; coordinates: Ring[] }
    | { type: "MultiPolygon"; coordinates: Ring[][] };
}

interface GeoJson {
  type: "FeatureCollection";
  features: GeoFeature[];
}

const VIEW_W = 760;
const VIEW_H = 620;
const PAD = 14;

const NAME_KEYS = ["district", "District", "DISTRICT", "name", "NAME_2", "dtname", "DIST_NAME"];

function featureName(feature: GeoFeature): string {
  for (const key of NAME_KEYS) {
    const value = feature.properties?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "Unknown";
}

function eachCoord(feature: GeoFeature, fn: (lon: number, lat: number) => void) {
  const { geometry } = feature;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [lon, lat] of ring) fn(lon, lat);
    }
  }
}

interface Projector {
  toXY: (lon: number, lat: number) => [number, number];
}

function buildProjector(geo: GeoJson): Projector {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const feature of geo.features) {
    eachCoord(feature, (lon, lat) => {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });
  }
  // Correct horizontal stretch at Maharashtra's latitude.
  const midLat = (minLat + maxLat) / 2;
  const lonScaleFix = Math.cos((midLat * Math.PI) / 180);
  const geoW = (maxLon - minLon) * lonScaleFix;
  const geoH = maxLat - minLat;
  const scale = Math.min((VIEW_W - PAD * 2) / geoW, (VIEW_H - PAD * 2) / geoH);
  const offsetX = (VIEW_W - geoW * scale) / 2;
  const offsetY = (VIEW_H - geoH * scale) / 2;

  return {
    toXY: (lon, lat) => [
      offsetX + (lon - minLon) * lonScaleFix * scale,
      offsetY + (maxLat - lat) * scale,
    ],
  };
}

interface DistrictShape {
  geoName: string;
  data: DistrictCsr | undefined;
  path: string;
  centroid: [number, number];
}

function buildShapes(geo: GeoJson, projector: Projector): DistrictShape[] {
  return geo.features.map((feature) => {
    const { geometry } = feature;
    const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

    let d = "";
    let cx = 0, cy = 0, count = 0;
    for (const polygon of polygons) {
      for (const ring of polygon) {
        ring.forEach(([lon, lat], i) => {
          const [x, y] = projector.toXY(lon, lat);
          d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
          cx += x; cy += y; count += 1;
        });
        d += "Z";
      }
    }

    const geoName = featureName(feature);
    return {
      geoName,
      data: resolveDistrict(geoName),
      path: d,
      centroid: [cx / Math.max(count, 1), cy / Math.max(count, 1)],
    };
  });
}

/* ------------------------------------------------------------------ */
/* Choropleth scale                                                    */
/* ------------------------------------------------------------------ */

const BUCKETS = [
  { max: 0, label: "Zero", fill: "#eef2f7" },
  { max: 25, label: "0 - 25 Cr", fill: "#dbeafe" },
  { max: 75, label: "25 - 75 Cr", fill: "#93c5fd" },
  { max: 200, label: "75 - 200 Cr", fill: "#3b82f6" },
  { max: 600, label: "200 - 600 Cr", fill: "#1d4ed8" },
  { max: Infinity, label: "> 600 Cr", fill: "#0a3f92" },
];

function bucketFill(spend: number | undefined): string {
  if (spend === undefined) return "#e2e8f0";
  return BUCKETS.find((bucket) => spend <= bucket.max)?.fill ?? "#0a3f92";
}

const formatCr = (value: number) =>
  `₹${value >= 1000 ? (value / 1000).toFixed(2) + "K" : value.toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

interface HoverState {
  shape: DistrictShape;
  x: number;
  y: number;
}

export default function MaharashtraCsrMap() {
  const [geo, setGeo] = useState<GeoJson | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [selected, setSelected] = useState<DistrictCsr | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/maharashtra-districts.geojson")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: GeoJson) => {
        if (!cancelled) setGeo(json);
      })
      .catch(() => {
        if (!cancelled) setGeoError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shapes = useMemo(() => {
    if (!geo?.features?.length) return [];
    return buildShapes(geo, buildProjector(geo));
  }, [geo]);

  const handleMove = useCallback((event: React.MouseEvent, shape: DistrictShape) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setHover({
      shape,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  }, []);

  return (
    <div className="w-full overflow-hidden rounded-lg border border-[#d8e2ef] bg-white text-[#10244a]">
      <div className={cn("grid gap-5 p-4 lg:p-5", selected ? "lg:grid-cols-[1fr_340px]" : "lg:grid-cols-1")}>
        {/* ------------------------------ Map panel ------------------------------ */}
        <div className="flex min-w-0 flex-col rounded-md border border-[#d8e2ef] bg-[#f8fbff] p-4">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-heading text-base font-extrabold text-[#102c60]">Geographical Distribution</h3>
              <p className="mt-1 text-xs font-medium text-[#5b6b80]">
                Hover a district for a quick summary. Click to open full details with charts.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-[#d8e2ef] bg-white px-3 py-2 text-[10px] font-bold text-[#516986]">
              <span className="mr-1 font-extrabold uppercase tracking-wide">CSR Expenditure (₹)</span>
              {BUCKETS.map((bucket) => (
                <span key={bucket.label} className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm border border-black/10" style={{ backgroundColor: bucket.fill }} />
                  {bucket.label}
                </span>
              ))}
            </div>
          </div>

          <div
            ref={containerRef}
            className="relative mt-4 min-h-[320px] flex-1 rounded-md border border-[#d8e2ef] bg-white p-2 sm:p-3"
          >
            {!geo && !geoError && (
              <div className="flex h-full min-h-[320px] items-center justify-center text-xs font-semibold text-[#5b6b80]">
                Loading Maharashtra map…
              </div>
            )}
            {geoError && (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 p-6 text-center">
                <MapPin className="text-[#b6c6dd]" size={28} />
                <p className="text-xs font-semibold text-[#5b6b80]">
                  Map data unavailable — place <code className="rounded bg-[#eef4fb] px-1">maharashtra-districts.geojson</code> in <code className="rounded bg-[#eef4fb] px-1">frontend/public/</code>.
                </p>
              </div>
            )}

            {shapes.length > 0 && (
              <svg
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                className="h-full w-full max-h-[560px]"
                role="img"
                aria-label="Maharashtra district-wise CSR expenditure map"
                onMouseLeave={() => setHover(null)}
              >
                {shapes.map((shape) => {
                  const isSelected = selected?.name === shape.data?.name && !!shape.data;
                  const isHovered = hover?.shape.geoName === shape.geoName;
                  return (
                    <path
                      key={shape.geoName}
                      d={shape.path}
                      fill={bucketFill(shape.data?.csrSpend)}
                      stroke={isSelected ? "#f7941d" : isHovered ? "#0a3f92" : "#ffffff"}
                      strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
                      className="cursor-pointer transition-[filter] duration-150"
                      style={{ filter: isHovered ? "brightness(1.08) drop-shadow(0 2px 4px rgba(10,63,146,0.35))" : undefined }}
                      onMouseMove={(event) => handleMove(event, shape)}
                      onMouseEnter={(event) => handleMove(event, shape)}
                      onClick={() => shape.data && setSelected(shape.data)}
                    />
                  );
                })}
                {shapes.map((shape) =>
                  shape.data && shape.data.csrSpend >= 150 ? (
                    <text
                      key={`label-${shape.geoName}`}
                      x={shape.centroid[0]}
                      y={shape.centroid[1]}
                      textAnchor="middle"
                      className="pointer-events-none select-none fill-white text-[10px] font-bold"
                      style={{ paintOrder: "stroke", stroke: "rgba(10,44,96,0.55)", strokeWidth: 2 }}
                    >
                      {shape.data.name.split(" ")[0]}
                    </text>
                  ) : null
                )}
              </svg>
            )}

            {/* ------------------------- Hover tooltip ------------------------- */}
            <AnimatePresence>
              {hover?.shape.data && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="pointer-events-none absolute z-20 w-56 rounded-lg border border-[#d8e2ef] bg-white p-3 shadow-xl"
                  style={{
                    left: Math.min(hover.x + 14, (containerRef.current?.clientWidth ?? 400) - 235),
                    top: Math.max(hover.y - 10, 8),
                  }}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-[#eef2f7] pb-2">
                    <span className="font-heading text-sm font-extrabold text-[#102c60]">{hover.shape.data.name}</span>
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600">
                      <TrendingUp size={11} /> +{hover.shape.data.yoyGrowth}%
                    </span>
                  </div>
                  <div className="mt-2 space-y-1.5 text-[11px] font-semibold text-[#4b5f7d]">
                    <TooltipRow icon={Banknote} label="CSR Spent" value={formatCr(hover.shape.data.csrSpend)} strong />
                    <TooltipRow icon={Building2} label="Companies" value={hover.shape.data.companies.toLocaleString("en-IN")} />
                    <TooltipRow icon={FolderKanban} label="Projects" value={hover.shape.data.projects.toLocaleString("en-IN")} />
                    <TooltipRow icon={HeartHandshake} label="Active NGOs" value={hover.shape.data.activeNgos.toLocaleString("en-IN")} />
                    <TooltipRow icon={Users} label="Beneficiaries" value={hover.shape.data.beneficiaries.toLocaleString("en-IN")} />
                  </div>
                  <p className="mt-2 border-t border-[#eef2f7] pt-1.5 text-center text-[10px] font-bold text-[#1789d6]">
                    Click to view details ↗
                  </p>
                </motion.div>
              )}
              {hover && !hover.shape.data && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute z-20 rounded-md border border-[#d8e2ef] bg-white px-3 py-1.5 text-xs font-bold text-[#102c60] shadow-lg"
                  style={{ left: hover.x + 14, top: Math.max(hover.y - 10, 8) }}
                >
                  {hover.shape.geoName} — data coming soon
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* --------------------------- State totals --------------------------- */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StateStat icon={Banknote} label="Total CSR Spent" value={formatCr(stateTotals.totalSpend)} delta="+8.2%" />
            <StateStat icon={Building2} label="Total Companies" value={stateTotals.totalCompanies.toLocaleString("en-IN")} delta="+6.1%" />
            <StateStat icon={Landmark} label="Total Districts" value={String(stateTotals.totalDistricts)} sub="Maharashtra" />
            <StateStat icon={MapPin} label="Top District" value={stateTotals.topDistrict} sub={formatCr(districtSpend(stateTotals.topDistrict))} />
            <StateStat icon={Layers} label="Total Sectors" value={String(stateTotals.totalSectors)} sub="Covered" />
          </div>
        </div>

        {/* --------------------------- Details panel --------------------------- */}
        <AnimatePresence mode="wait">
          {selected && (
            <motion.aside
              key={selected.name}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.18 }}
              className="flex min-w-0 flex-col rounded-md border border-[#d8e2ef] bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#456aa4]">District Details</span>
                  <h4 className="mt-0.5 font-heading text-2xl font-extrabold leading-none tracking-tight text-[#102c60]">
                    {selected.name}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-md p-1.5 text-[#5b6b80] transition-colors hover:bg-[#eef4fb] hover:text-[#102c60]"
                  aria-label="Close district details"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 rounded-md border border-[#d8e2ef] bg-[#f8fbff] p-4">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#5b6b80]">
                  <span className="flex items-center gap-1"><Banknote size={12} /> CSR Spent</span>
                  <span className="flex items-center gap-0.5 font-bold text-emerald-600">
                    <TrendingUp size={11} /> +{selected.yoyGrowth}% vs 2023-24
                  </span>
                </div>
                <div className="mt-1 font-heading text-2xl font-extrabold text-[#0a3f92]">{formatCr(selected.csrSpend)}</div>
                <div className="mt-2 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={selected.trend} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
                      <defs>
                        <linearGradient id="districtTrend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1557c4" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#1557c4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="year" hide />
                      <YAxis hide domain={["dataMin", "dataMax"]} />
                      <ReTooltip
                        formatter={(value: number) => [formatCr(value), "Spend"]}
                        labelStyle={{ fontSize: 11, fontWeight: 700, color: "#102c60" }}
                        contentStyle={{ borderRadius: 8, borderColor: "#d8e2ef", fontSize: 11 }}
                      />
                      <Area type="monotone" dataKey="spend" stroke="#1557c4" strokeWidth={2} fill="url(#districtTrend)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <MiniStat icon={Building2} label="Total Companies" value={selected.companies.toLocaleString("en-IN")} />
                <MiniStat icon={FolderKanban} label="Total Projects" value={selected.projects.toLocaleString("en-IN")} />
                <MiniStat icon={HeartHandshake} label="Active NGOs" value={selected.activeNgos.toLocaleString("en-IN")} />
                <MiniStat icon={Users} label="Beneficiaries" value={selected.beneficiaries.toLocaleString("en-IN")} />
              </div>

              {/* Sector donut */}
              <div className="mt-4 rounded-md border border-[#d8e2ef] p-4">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#456aa4]">Top Sectors</span>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-28 w-28 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={selected.sectors}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={32}
                          outerRadius={52}
                          paddingAngle={2}
                          strokeWidth={0}
                        >
                          {selected.sectors.map((sector) => (
                            <Cell key={sector.name} fill={sector.color} />
                          ))}
                        </Pie>
                        <ReTooltip
                          formatter={(value: number, name: string) => [`${value}%`, name]}
                          contentStyle={{ borderRadius: 8, borderColor: "#d8e2ef", fontSize: 11 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="min-w-0 flex-1 space-y-1">
                    {selected.sectors.map((sector) => (
                      <li key={sector.name} className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[#4b5f7d]">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: sector.color }} />
                          <span className="truncate">{sector.name}</span>
                        </span>
                        <span className="font-bold text-[#102c60]">{sector.value}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Top companies */}
              <div className="mt-3 rounded-md border border-[#d8e2ef] p-4">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#456aa4]">Top Companies</span>
                <div className="mt-2 space-y-2.5">
                  {selected.topCompanies.map((company) => {
                    const maxSpend = selected.topCompanies[0]?.spend || 1;
                    return (
                      <div key={company.name}>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-[#4b5f7d]">
                          <span className="truncate">{company.name}</span>
                          <span className="font-bold text-[#102c60]">{formatCr(company.spend)}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#eef2f7]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(company.spend / maxSpend) * 100}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="h-full rounded-full bg-[#1557c4]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function districtSpend(name: string): number {
  return resolveDistrict(name)?.csrSpend ?? 0;
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

function TooltipRow({
  icon: Icon,
  label,
  value,
  strong,
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-[#5b6b80]">
        <Icon size={11} className="text-[#1557c4]" /> {label}
      </span>
      <span className={cn("text-[#102c60]", strong ? "text-xs font-extrabold" : "font-bold")}>{value}</span>
    </div>
  );
}

function StateStat({
  icon: Icon,
  label,
  value,
  delta,
  sub,
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
  delta?: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-[#d8e2ef] bg-white p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-[#1557c4]">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <span className="block truncate text-[10px] font-semibold text-[#5b6b80]">{label}</span>
        <span className="block truncate font-heading text-sm font-extrabold text-[#102c60]">{value}</span>
        {delta && <span className="text-[10px] font-bold text-emerald-600">{delta}</span>}
        {sub && <span className="text-[10px] font-semibold text-[#5b6b80]">{sub}</span>}
      </div>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-[#d8e2ef] bg-[#f8fbff] p-3">
      <span className="flex items-center gap-1 text-[10px] font-semibold text-[#5b6b80]">
        <Icon size={11} className="text-[#1557c4]" /> {label}
      </span>
      <span className="mt-0.5 block font-heading text-lg font-extrabold text-[#102c60]">{value}</span>
    </div>
  );
}

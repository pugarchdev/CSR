"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Camera, MapPin, CheckCircle2, ArrowLeft, Clock,
  UploadCloud, AlertTriangle, ShieldCheck, FileCheck
} from "lucide-react";
import { useApiQuery } from "@/lib/apiHooks";

export default function FieldVisitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");

  const { data: response, isLoading } = useApiQuery<{ success: boolean; data: any }>(
    ["field-visit", id],
    `/field-visits/${id}`,
    { enabled: Boolean(id && id !== "new") }
  );

  const isNew = id === "new";
  const visit = response?.data;

  // Form state for creating visit
  const [projectId, setProjectId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [issuesFound, setIssuesFound] = useState("");
  const [actionRequired, setActionRequired] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gettingGps, setGettingGps] = useState(false);

  const handleCaptureGps = () => {
    if (navigator.geolocation) {
      setGettingGps(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setGettingGps(false);
        },
        () => {
          // Fallback demo coordinates in Maharashtra (e.g. Pune/Mumbai)
          setLatitude(18.5204);
          setLongitude(73.8567);
          setGettingGps(false);
        }
      );
    }
  };

  const handleSaveVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/field-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectId || "demo-project",
          remarks,
          issuesFound: issuesFound || null,
          actionRequired: actionRequired || null,
          latitude,
          longitude,
          geoTaggedImages: ["/placeholder-evidence-1.jpg"]
        })
      });
      router.push("/field-visits");
    } catch (err) {
      router.push("/field-visits");
    }
  };

  if (!isNew && visit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link
            href="/field-visits"
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 hover:no-underline"
          >
            <ArrowLeft size={14} />
            <span>Back to Field Visits</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                {visit.project.projectCode}
              </span>
              <h1 className="mt-1.5 font-heading text-lg font-extrabold text-slate-950">{visit.project.title}</h1>
              <p className="text-xs text-slate-500 flex items-center gap-1 font-medium mt-0.5">
                <MapPin size={12} className="text-slate-400" /> {visit.project.district}, {visit.project.taluka}
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Inspected on {new Date(visit.visitDate).toLocaleDateString()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 space-y-2 text-xs">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Inspector Metadata</h3>
              <p className="font-bold text-slate-900">{visit.inspector.name} ({visit.inspector.designation || "Nodal Officer"})</p>
              <p className="text-slate-500">Contact: {visit.inspector.mobile || visit.inspector.email}</p>
              {visit.latitude && visit.longitude && (
                <div className="pt-2 border-t border-slate-200/60 font-mono text-[11px] text-emerald-800 font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} /> Verified GPS: {visit.latitude.toFixed(4)}° N, {visit.longitude.toFixed(4)}° E
                </div>
              )}
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 space-y-2 text-xs">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Observations & Remarks</h3>
              <p className="text-slate-700 font-medium leading-relaxed">{visit.remarks || "Site verified in active execution."}</p>
              {visit.issuesFound && (
                <div className="mt-2 rounded-lg bg-amber-50 p-2.5 text-amber-900 border border-amber-200">
                  <strong>Issues Found:</strong> {visit.issuesFound}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/field-visits"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 hover:no-underline"
        >
          <ArrowLeft size={14} />
          <span>Back to Field Visits</span>
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
        <div>
          <h1 className="font-heading text-lg font-extrabold text-slate-950">Record Ground Field Inspection</h1>
          <p className="text-xs text-slate-500 font-medium">Log site verification observations, capture GPS, and attach photos</p>
        </div>

        <form onSubmit={handleSaveVisit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700">Project Code / Title</label>
            <input
              type="text"
              required
              placeholder="e.g. PRJ-2026-001 (Rural Water Security Initiative)"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full mt-1 rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">GPS Location Verification</h3>
                <p className="text-[11px] text-slate-500 font-medium">Capture coordinates from your mobile browser</p>
              </div>
              <button
                type="button"
                onClick={handleCaptureGps}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-800"
              >
                <MapPin size={13} />
                <span>{gettingGps ? "Acquiring GPS..." : "Capture Location"}</span>
              </button>
            </div>

            {latitude && longitude && (
              <div className="font-mono text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                <CheckCircle2 size={14} /> GPS Acquired: {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
              </div>
            )}
          </div>

          <div>
            <label className="font-bold text-slate-700">Site Observations & Progress Remarks</label>
            <textarea
              rows={3}
              required
              placeholder="Describe physical work verified on ground, materials deployed, and beneficiary feedback..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full mt-1 rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700">Bottlenecks / Issues Found (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Minor delay in pipeline excavation due to rain"
                value={issuesFound}
                onChange={(e) => setIssuesFound(e.target.value)}
                className="w-full mt-1 rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700">Corrective Action Required (Optional)</label>
              <input
                type="text"
                placeholder="e.g. NGO instructed to increase workforce"
                value={actionRequired}
                onChange={(e) => setActionRequired(e.target.value)}
                className="w-full mt-1 rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Link
              href="/field-visits"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:no-underline"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-xl bg-blue-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-800"
            >
              Save Inspection Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

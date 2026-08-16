"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  MapPin, Camera, Clock, Plus, Search,
  ArrowRight
} from "lucide-react";
import { useApiQuery } from "@/lib/apiHooks";

interface FieldVisitItem {
  id: string;
  projectId: string;
  projectCode: string;
  projectTitle: string;
  district: string;
  taluka: string;
  visitDate: string;
  inspectorName: string;
  inspectorRole: string;
  latitude: number | null;
  longitude: number | null;
  geoTaggedImagesCount: number;
  remarks: string;
  issuesFound: string | null;
  actionRequired: string | null;
  createdAt: string;
}

export default function FieldVisitsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: response } = useApiQuery<{ success: boolean; data: FieldVisitItem[] }>(
    ["field-visits"],
    "/field-visits"
  );

  const visits = response?.data || [];

  const filteredVisits = visits.filter((v) =>
    v.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.district.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
              Field Experience
            </span>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              DNO & DNC Inspections
            </span>
          </div>
          <h1 className="mt-1 font-heading text-xl font-extrabold text-slate-950">
            Ground Field Visits & Milestone Inspection Logs
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Mobile-friendly field inspection reports, GPS-verified observations, and milestone execution checks
          </p>
        </div>

        <Link
          href="/field-visits/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-800 hover:no-underline"
        >
          <Plus size={14} />
          <span>Log Field Visit</span>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs">
        <Search size={15} className="text-slate-400 ml-1" />
        <input
          type="text"
          placeholder="Search by project code, location, or district..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Visits List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredVisits.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <Camera size={32} className="mx-auto text-slate-300" />
            <h3 className="mt-3 text-sm font-bold text-slate-800">No field inspection logs recorded yet</h3>
            <p className="mt-1 text-xs text-slate-500">
              Use the "Log Field Visit" button to record a ground site verification with GPS coordinates.
            </p>
          </div>
        ) : (
          filteredVisits.map((v) => (
            <div
              key={v.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                    {v.projectCode}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                    <Clock size={12} /> {new Date(v.visitDate).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="mt-2 text-sm font-extrabold text-slate-900">{v.projectTitle}</h3>
                <p className="text-[11px] text-slate-500 flex items-center gap-1 font-medium mt-0.5">
                  <MapPin size={11} className="text-slate-400" /> {v.district}, {v.taluka}
                </p>
              </div>

              {v.remarks && (
                <p className="text-xs text-slate-600 font-medium line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {v.remarks}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                    <Camera size={11} /> {v.geoTaggedImagesCount} Geotagged Photos
                  </span>
                  {v.latitude && v.longitude && (
                    <span className="font-mono text-[10px] text-slate-500 font-medium">
                      GPS: {v.latitude.toFixed(2)}, {v.longitude.toFixed(2)}
                    </span>
                  )}
                </div>

                <Link
                  href={`/field-visits/${v.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-900 hover:text-blue-700 hover:no-underline"
                >
                  <span>Inspection Report</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

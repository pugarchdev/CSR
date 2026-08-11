"use client";

import { useState } from "react";
import { Camera, MapPin, Calendar, CheckCircle2, Clock, Upload, Search, ShieldCheck } from "lucide-react";
import { GovPageHeader } from "@/components/layout/GovPageHeader";
import { StatCard } from "@/components/ui/StatCard";

interface InspectionRecord {
  id: string;
  project: string;
  location: string;
  milestone: string;
  inspector: string;
  inspectionDate: string;
  geoCoords: string;
  status: "VERIFIED" | "NEEDS_REINSPECTION" | "PENDING_VERIFICATION";
  photosUploaded: number;
}

const mockInspections: InspectionRecord[] = [
  {
    id: "insp-1",
    project: "Gadchiroli Tribal Tele-ICU Facilities",
    location: "Gadchiroli DH, Block A",
    milestone: "Phase 1: Solar Backup & Equipment Installation",
    inspector: "Shri V. K. Mane (DNC)",
    inspectionDate: "2026-07-24",
    geoCoords: "19.9823° N, 79.9864° E",
    status: "VERIFIED",
    photosUploaded: 6,
  },
  {
    id: "insp-2",
    project: "Solapur Rural RO Water Purification Plants",
    location: "Karmala Tehsil, Solapur",
    milestone: "Civil Works & Piping Network",
    inspector: "Shri A. R. Patil (DNO)",
    inspectionDate: "2026-07-22",
    geoCoords: "17.6599° N, 75.9064° E",
    status: "PENDING_VERIFICATION",
    photosUploaded: 4,
  },
  {
    id: "insp-3",
    project: "Nandurbar Smart Classroom Project",
    location: "Navapur Tribal Ashram School",
    milestone: "Hardware Setup & Broadband Connection",
    inspector: "Dr. S. K. Jadhav",
    inspectionDate: "2026-07-19",
    geoCoords: "21.1684° N, 73.7915° E",
    status: "VERIFIED",
    photosUploaded: 8,
  },
];

export default function InspectionsPage() {
  const [items, setItems] = useState<InspectionRecord[]>(mockInspections);
  const [search, setSearch] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);

  const filtered = items.filter(item =>
    item.project.toLowerCase().includes(search.toLowerCase()) ||
    item.location.toLowerCase().includes(search.toLowerCase()) ||
    item.milestone.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
      <GovPageHeader
        title="Field Inspections & Site Verification"
        description="Record ground-level site visit observations, upload geo-tagged photo evidence, and verify milestone completion."
        eyebrow="District Field Monitoring Desk"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Verified Inspections"
          value={items.filter(i => i.status === "VERIFIED").length}
          icon={CheckCircle2}
          index={0}
          colorTheme="emerald"
          badge="Validated"
          sublabel="Site proof validated"
        />
        <StatCard
          label="Pending Field Reviews"
          value={items.filter(i => i.status === "PENDING_VERIFICATION").length}
          icon={Clock}
          index={1}
          colorTheme="amber"
          badge="Awaiting DNO"
          sublabel="Awaiting verification"
        />
        <StatCard
          label="Geo-Tagged Evidence"
          value={`${items.reduce((acc, curr) => acc + curr.photosUploaded, 0)} Photos`}
          icon={Camera}
          index={2}
          colorTheme="blue"
          badge="Audit Vault"
          sublabel="Stored in audit vault"
        />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 md:mb-6">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by project, location, or milestone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex w-full justify-center md:w-auto items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-800 transition-colors shadow-sm shrink-0"
          >
            <Camera size={16} /> Record New Site Visit
          </button>
        </div>

        {/* Wrapper: Removes horizontal scroll on mobile, applies borders on desktop */}
        <div className="w-full md:overflow-x-auto md:rounded-xl md:border md:border-slate-200/80">
          <table className="w-full block md:table text-left text-xs border-collapse">
            {/* Headers: Hidden on mobile, shown on desktop */}
            <thead className="hidden md:table-header-group border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
              <tr>
                <th className="px-4 py-3">Project & Location</th>
                <th className="px-4 py-3">Milestone Verified</th>
                <th className="px-4 py-3">Inspector</th>
                <th className="px-4 py-3">Geo Coordinates</th>
                <th className="px-4 py-3">Photos</th>
                <th className="px-4 py-3 text-right md:text-left">Status</th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group divide-y-0 md:divide-y md:divide-slate-100 font-medium">
              {filtered.map((item) => (
                <tr 
                  key={item.id} 
                  className="block md:table-row mb-4 md:mb-0 bg-white border border-slate-200 md:border-none rounded-xl md:rounded-none shadow-sm md:shadow-none hover:bg-slate-50/80 transition-colors overflow-hidden"
                >
                  <td 
                    data-label="Project & Location" 
                    className="flex md:table-cell flex-col md:flex-row items-start md:items-center px-4 py-3 md:py-3.5 border-b border-slate-100 md:border-none before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden before:mb-1"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{item.project}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} className="text-blue-600 shrink-0" /> {item.location}
                      </p>
                    </div>
                  </td>
                  <td 
                    data-label="Milestone Verified" 
                    className="flex md:table-cell justify-between items-center px-4 py-3 md:py-3.5 border-b border-slate-100 md:border-none text-slate-700 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left"
                  >
                    {item.milestone}
                  </td>
                  <td 
                    data-label="Inspector" 
                    className="flex md:table-cell justify-between items-center px-4 py-3 md:py-3.5 border-b border-slate-100 md:border-none text-slate-700 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left"
                  >
                    {item.inspector}
                  </td>
                  <td 
                    data-label="Geo Coordinates" 
                    className="flex md:table-cell justify-between items-center px-4 py-3 md:py-3.5 border-b border-slate-100 md:border-none text-slate-600 font-mono text-[11px] before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left"
                  >
                    {item.geoCoords}
                  </td>
                  <td 
                    data-label="Photos" 
                    className="flex md:table-cell justify-between items-center px-4 py-3 md:py-3.5 border-b border-slate-100 md:border-none font-bold text-blue-900 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left"
                  >
                    {item.photosUploaded} photos
                  </td>
                  <td 
                    data-label="Status" 
                    className="flex md:table-cell justify-between items-center px-4 py-3 md:py-3.5 md:border-none before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden bg-slate-50/50 md:bg-transparent text-right md:text-left"
                  >
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      item.status === "VERIFIED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Record Inspection Log</h3>
            <p className="mt-1 text-xs text-slate-500">Upload geotagged inspection evidence</p>
            <div className="mt-4 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center bg-slate-50">
              <Upload className="mx-auto text-blue-600 mb-2" size={32} />
              <p className="text-xs font-bold text-slate-700">Drop inspection images here</p>
              <p className="text-[10px] text-slate-400 mt-1">Automatic EXIF GPS Extraction enabled</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowUploadModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

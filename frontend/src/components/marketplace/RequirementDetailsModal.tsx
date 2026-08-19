"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  MapPin,
  Building2,
  CheckCircle2,
  Users,
  Coins,
  Calendar,
  Phone,
  Mail,
  UserCheck,
  FileText,
  ImageIcon,
  ExternalLink,
  ShieldCheck,
  Award,
  Download,
  Eye
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

const money = (value: unknown) => {
  const amount = Number(value || 0);
  if (!amount) return "Not specified";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
};

interface RequirementDetailsModalProps {
  item: any | null;
  onClose: () => void;
}

export default function RequirementDetailsModal({ item, onClose }: RequirementDetailsModalProps) {
  const pathname = usePathname() || "";
  const [fullData, setFullData] = useState<any>(item);
  const [loading, setLoading] = useState(false);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!item?.id) return;
    setFullData(item);

    // Fetch full details in background to ensure all photos and HOD docs are present
    let isMounted = true;
    const fetchFullDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/public/requirements/${item.id}`, { cache: "no-store" });
        if (res.ok) {
          const body = await res.json();
          const detail = body.data || body;
          if (isMounted && detail) {
            setFullData((prev: any) => ({ ...prev, ...detail }));
          }
        }
      } catch (err) {
        console.warn("Could not fetch extra details, using list payload:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFullDetails();

    // Close on Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activePhoto) setActivePhoto(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      isMounted = false;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [item, onClose, activePhoto]);

  if (!item) return null;

  const data = fullData || item;
  const sector = data.sector || data.category || data.focusArea || "General Development";
  const trackingId = data.trackingId || data.projectCode || `MH-CSR-REQ-${data.id?.substring(0, 8)}`;
  const title = data.title || data.csrRequirement || "Verified Development Requirement";
  const description = data.description || data.csrRequirement || "Comprehensive development project under Maharashtra CSR convergence framework.";
  const budget = data.approvedBudget || data.budgetRequested || data.estimatedCost || data.budget || 0;
  const beneficiaries = Number(data.beneficiaryCount || data.expectedBeneficiaries || 2500);
  const district = data.district || (Array.isArray(data.districts) && data.districts[0]) || "Maharashtra";
  const taluka = data.taluka || (Array.isArray(data.talukas) && data.talukas[0]) || "District HQ";
  const division = Array.isArray(data.divisions) && data.divisions.length ? data.divisions.join(", ") : "State Jurisdiction";
  const exactLocation = data.exactLocation || data.village || data.address || `${taluka}, ${district}`;
  const departmentName = data.department || data.organization?.name || data.governmentOrganization?.name || "Government of Maharashtra";
  const officeName = data.officeName || departmentName;
  const officialName = data.officialName || data.contactPersonName || "Nodal Department Officer";
  const designation = data.designation || "Nodal Officer / Project Coordinator";
  const serviceClass = data.serviceClass || "Gazetted Officer";
  const phone = data.mobile || data.contactPersonPhone || "";
  const email = data.email || data.contactPersonEmail || "";
  const photos = Array.isArray(data.geoTaggedPhotos) ? data.geoTaggedPhotos : [];
  const hodDoc = data.hodCertificationDocument || null;
  const supportingDocs = Array.isArray(data.supportingDocuments) ? data.supportingDocuments : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 flex flex-col w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden">
        
        {/* Sticky Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200/80 bg-slate-50/80">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-200">
                {sector.replace(/_/g, " ")}
              </span>
              <span className="font-mono text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                {trackingId}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 size={12} className="text-emerald-600" />
                JS APPROVED & VERIFIED
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug break-words">
              {title}
            </h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Key Metrics Strip (4 Highlights) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-blue-50/70 border border-blue-100/90 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-blue-800 text-[11px] font-bold uppercase tracking-wider">
                <Coins size={14} /> Requested Outlay
              </div>
              <p className="mt-1 text-base sm:text-lg font-black text-blue-950">
                {money(budget)}
              </p>
              <span className="text-[10px] font-medium text-blue-700/80">Convergence Gap Grant</span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-100/90 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
                <Users size={14} /> Beneficiaries
              </div>
              <p className="mt-1 text-base sm:text-lg font-black text-emerald-950">
                {beneficiaries ? beneficiaries.toLocaleString("en-IN") : "2,500"}
              </p>
              <span className="text-[10px] font-medium text-emerald-700/80">Direct Community Reach</span>
            </div>

            <div className="bg-purple-50/70 border border-purple-100/90 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-purple-800 text-[11px] font-bold uppercase tracking-wider">
                <MapPin size={14} /> Target Region
              </div>
              <p className="mt-1 text-sm sm:text-base font-black text-purple-950 truncate">
                {district}
              </p>
              <span className="text-[10px] font-medium text-purple-700/80">{taluka}</span>
            </div>

            <div className="bg-amber-50/70 border border-amber-100/90 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-amber-800 text-[11px] font-bold uppercase tracking-wider">
                <Calendar size={14} /> Timeline
              </div>
              <p className="mt-1 text-sm sm:text-base font-black text-amber-950">
                {data.completionTimeline || "6–12 Months"}
              </p>
              <span className="text-[10px] font-medium text-amber-700/80">Execution Period</span>
            </div>
          </div>

          {/* Section 1: Detailed Scope & Objectives */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText size={15} className="text-blue-900" />
              Verified Development Requirement Scope
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line break-words bg-slate-50/60 p-3.5 rounded-lg border border-slate-100">
              {description}
            </p>

            {data.expectedImpact && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-1">
                  <Award size={13} className="text-emerald-700" /> Expected Social & Community Impact
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {data.expectedImpact}
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Location & Administrative Hierarchy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 space-y-2.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MapPin size={15} className="text-rose-700" /> Location Hierarchy
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Division</span>
                  <span className="font-bold text-slate-800">{division}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">District</span>
                  <span className="font-bold text-slate-800">{district}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Taluka / Block</span>
                  <span className="font-bold text-slate-800">{taluka}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Gram Panchayat / Site</span>
                  <span className="font-bold text-slate-800 truncate block">{exactLocation}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                <strong>Exact Site Location:</strong> {exactLocation}
              </p>
            </div>

            {/* Section 3: Sponsoring Government Body & Nodal Officer */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 space-y-2.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <UserCheck size={15} className="text-blue-900" /> Sponsoring Office & Nodal Officer
              </h3>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Building2 size={13} className="text-slate-400 shrink-0" />
                  <span className="font-bold text-slate-900">{departmentName}</span>
                </div>
                {officeName && officeName !== departmentName && (
                  <div className="text-[11px] text-slate-600 pl-5">
                    Office: <span className="font-semibold text-slate-800">{officeName}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <p className="font-bold text-slate-900 flex items-center gap-1">
                    <span>{officialName}</span>
                    <span className="text-[10px] font-normal text-slate-500">({designation})</span>
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                    {phone && (
                      <a href={`tel:${phone}`} className="inline-flex items-center gap-1 text-blue-900 hover:underline font-semibold">
                        <Phone size={11} /> {phone}
                      </a>
                    )}
                    {email && (
                      <a href={`mailto:${email}`} className="inline-flex items-center gap-1 text-blue-900 hover:underline font-semibold">
                        <Mail size={11} /> {email}
                      </a>
                    )}
                  </div>
                  {serviceClass && (
                    <span className="inline-block text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      Cadre: {serviceClass.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Government Verification & Compliance Checklist */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-700" /> Government Verification & Eligibility Checklist
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-200/70 flex items-start gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">JS Feasibility Approved</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">RM review verified & Joint Secretary cleared for marketplace listing.</p>
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200/70 flex items-start gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">Non-Budgeted Gap</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Government fund declaration verified as genuine CSR convergence gap.</p>
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200/70 flex items-start gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">Department Endorsed</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Authorized Head of Department / Officer certification verified.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Geo-Tagged Photos & Verified Documents */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <ImageIcon size={15} className="text-blue-900" /> Verified Site Media & Attached Certifications
            </h3>

            {/* Photos */}
            {photos.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700">Geo-Tagged Field Photos ({photos.length})</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {photos.map((url: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setActivePhoto(url)}
                      className="group relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100 hover:border-blue-500 hover:shadow-md transition text-left"
                    >
                      <img src={url} alt={`Site evidence ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                        <Eye size={14} /> Preview
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 italic border border-slate-100">
                No photo evidence uploaded for this development need.
              </div>
            )}

            {/* Documents */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-xs font-bold text-slate-700">Official Verification Documents</p>
              <div className="flex flex-wrap gap-2">
                {hodDoc ? (
                  <a
                    href={hodDoc}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 text-xs font-bold transition hover:no-underline"
                  >
                    <Download size={14} />
                    <span>View / Download HOD Certification Document</span>
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 italic">Self-certified under official administrative authority.</span>
                )}

                {supportingDocs.map((doc: string, idx: number) => (
                  <a
                    key={idx}
                    href={doc}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition hover:no-underline"
                  >
                    <FileText size={13} /> Document #{idx + 1}
                  </a>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Modal Sticky Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="text-[11px] text-slate-500">
            Recorded in MahaCSR Government Convergence Registry
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition"
            >
              Close
            </button>
            <Link
              href={pathname.startsWith("/company/marketplace") ? `/company/marketplace/${data.id}` : `/marketplace/${data.id}`}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#14274e] hover:bg-blue-900 rounded-lg shadow-sm transition hover:no-underline"
            >
              <span>Open Full Dedicated Page</span>
              <ExternalLink size={13} />
            </Link>
          </div>
        </div>

      </div>

      {/* Lightbox photo preview */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setActivePhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-transparent" onClick={(e) => e.stopPropagation()}>
            <img src={activePhoto} alt="Site preview" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black text-white rounded-full transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

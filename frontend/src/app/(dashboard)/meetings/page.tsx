"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  CalendarDays, Clock, Video, Users, Plus, CheckCircle2, ShieldAlert,
  MapPin, Search, RefreshCw, ChevronRight
} from "lucide-react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { useAuthStore } from "@/store/authStore";
import { useApiQuery } from "@/lib/apiHooks";

interface MeetingItem {
  id: string;
  title: string;
  proposalRef?: string;
  proposalTitle?: string;
  targetLink?: string;
  date: string;
  time?: string;
  mode: string;
  participants: string[];
  status: "CONFIRMED" | "SCHEDULED" | "COMPLETED";
  type: "PITCH_ALIGNMENT" | "CORPORATE_ENQUIRY" | "DISTRICT_FEASIBILITY";
  agenda?: string;
}

export default function MeetingsPage() {
  const { user, roles, roleDetails, isAdmin } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"ALL" | "UPCOMING" | "VIRTUAL" | "IN_PERSON">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const isRM = useMemo(() => {
    if (!mounted) return false;
    if (isAdmin) return true;
    const roleDetailTokens = Array.isArray(roleDetails)
      ? roleDetails.flatMap((rd) => [rd.name, rd.slug])
      : [];
    const tokens = [
      user?.role,
      user?.roleSlug,
      user?.roleId,
      ...(Array.isArray(roles) ? roles : []),
      ...roleDetailTokens
    ].filter(Boolean).map((t) => String(t).toUpperCase());

    return tokens.some((t) =>
      t.includes("RELATIONSHIP") ||
      t.includes("RM") ||
      t === "6" ||
      t === "ROLE_6"
    );
  }, [user, roles, roleDetails, isAdmin, mounted]);

  const isInternalAuthority = useMemo(() => {
    if (!mounted) return false;
    if (isAdmin || isRM) return true;
    const tokens = [
      user?.role,
      user?.roleSlug,
      user?.roleId,
      ...(Array.isArray(roles) ? roles : [])
    ].filter(Boolean).map((t) => String(t).toUpperCase());

    return tokens.some((t) =>
      t.includes("SUPER_ADMIN") ||
      t.includes("SECRETARY") ||
      t.includes("JOINT_SECRETARY") ||
      t.includes("PLANNING_SECRETARY") ||
      t.includes("PORTAL_ADMIN")
    );
  }, [user, roles, isAdmin, isRM, mounted]);

  // Fetch assigned pitches and enquiries for the RM
  const { data: pitchesData, isLoading: loadingPitches, refetch: refetchPitches } = useApiQuery<any>(
    ["rm-pitches-meetings"],
    "/rm/pitches",
    { enabled: Boolean(isRM || isAdmin) }
  );

  const { data: enquiriesData, isLoading: loadingEnquiries, refetch: refetchEnquiries } = useApiQuery<any>(
    ["rm-enquiries-meetings"],
    "/rm/enquiries",
    { enabled: Boolean(isRM || isAdmin) }
  );

  // Extract real meeting interactions from assigned pitches and enquiries
  const dynamicMeetings = useMemo(() => {
    const list: MeetingItem[] = [];

    const pitches = Array.isArray(pitchesData?.data)
      ? pitchesData.data
      : Array.isArray(pitchesData)
      ? pitchesData
      : [];

    pitches.forEach((p: any) => {
      if (Array.isArray(p.interactions)) {
        p.interactions.forEach((int: any) => {
          if (int.channel === "MEETING" || int.channel === "VIDEO_CALL" || int.interactionType === "MEETING") {
            const dateObj = new Date(int.occurredAt || int.createdAt);
            list.push({
              id: int.id || `pitch-meet-${p.id}-${Math.random()}`,
              title: `Proposal Alignment: ${p.title || p.pitchReferenceId}`,
              proposalRef: p.pitchReferenceId || p.id,
              proposalTitle: p.title,
              targetLink: `/pitches/${p.id}`,
              date: dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
              time: dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
              mode: int.note?.includes("In-Person") ? "In-Person (Collectorate Office)" : "Virtual (MahaGov VC)",
              participants: [
                p.officialName ? `${p.officialName} (${p.department || "Dept Officer"})` : "Department Submitting Officer",
                [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Assigned RM"
              ],
              status: dateObj > new Date() ? "SCHEDULED" : "CONFIRMED",
              type: "PITCH_ALIGNMENT",
              agenda: int.note || "Feasibility assessment and proposal review."
            });
          }
        });
      }
    });

    const enquiries = Array.isArray(enquiriesData?.data)
      ? enquiriesData.data
      : Array.isArray(enquiriesData)
      ? enquiriesData
      : [];

    enquiries.forEach((e: any) => {
      if (Array.isArray(e.interactions)) {
        e.interactions.forEach((int: any) => {
          if (int.channel === "MEETING" || int.interactionType === "MEETING" || int.interactionType === "VIDEO_CALL") {
            const dateObj = new Date(int.occurredAt || int.createdAt);
            list.push({
              id: int.id || `enq-meet-${e.id}-${Math.random()}`,
              title: `Corporate Alignment: ${e.companyName || e.trackingId || "CSR Donor"}`,
              proposalRef: e.trackingId || e.id,
              proposalTitle: e.focusAreas?.join(", ") || "Corporate CSR Investment",
              targetLink: `/enquiries/${e.id}`,
              date: dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
              time: dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
              mode: int.note?.includes("In-Person") ? "In-Person (State CSR Cell, Mantralaya)" : "Virtual (MahaGov VC)",
              participants: [
                e.contactPerson ? `${e.contactPerson} (${e.companyName || "CSR Lead"})` : "Corporate CSR Lead",
                [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Assigned RM"
              ],
              status: dateObj > new Date() ? "SCHEDULED" : "CONFIRMED",
              type: "CORPORATE_ENQUIRY",
              agenda: int.summary || int.note || "Corporate requirement review and priority alignment."
            });
          }
        });
      }
    });

    // Default reference meetings if none scheduled yet
    if (list.length === 0) {
      list.push(
        {
          id: "seed-1",
          title: "Tripartite Alignment: Melghat Solar Electrification",
          proposalRef: "PTCH-MH-2026-004",
          proposalTitle: "Solar Micro-Grids for Tribal Schools",
          targetLink: "/pitches",
          date: "Tomorrow",
          time: "11:00 AM",
          mode: "Virtual (MahaGov VC)",
          participants: ["CSR Lead (Tata Power)", "Collectorate Focal SPOC", "RM (State CSR Cell)"],
          status: "SCHEDULED",
          type: "PITCH_ALIGNMENT",
          agenda: "Discussion on site NOC, equipment grant clearance, and timeline agreement."
        },
        {
          id: "seed-2",
          title: "13-Point Feasibility Review with District Health Officer",
          proposalRef: "PTCH-MH-2026-012",
          proposalTitle: "Telemedicine Rural Clinics in Thane",
          targetLink: "/pitches",
          date: "22 Aug 2026",
          time: "03:00 PM",
          mode: "In-Person (Collectorate Office)",
          participants: ["Civil Surgeon Thane", "RM (State CSR Cell)"],
          status: "SCHEDULED",
          type: "DISTRICT_FEASIBILITY",
          agenda: "Comprehensive 13-point checklist evaluation and doctor staffing feasibility."
        }
      );
    }

    return list;
  }, [pitchesData, enquiriesData, user]);

  const filteredMeetings = useMemo(() => {
    return dynamicMeetings.filter((m) => {
      if (activeTab === "UPCOMING" && m.status !== "SCHEDULED") return false;
      if (activeTab === "VIRTUAL" && !m.mode.toLowerCase().includes("virtual")) return false;
      if (activeTab === "IN_PERSON" && !m.mode.toLowerCase().includes("in-person")) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchRef = m.proposalRef?.toLowerCase().includes(q);
        const matchPart = m.participants.some((p) => p.toLowerCase().includes(q));
        const matchAgenda = m.agenda?.toLowerCase().includes(q);
        if (!matchTitle && !matchRef && !matchPart && !matchAgenda) return false;
      }
      return true;
    });
  }, [dynamicMeetings, activeTab, searchQuery]);

  if (mounted && !isInternalAuthority) {
    return (
      <GovPortalLayout>
        <main className="mx-auto min-h-[70vh] max-w-4xl px-4 py-16 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 text-amber-900 flex items-center justify-center border border-amber-200">
            <ShieldAlert size={28} />
          </div>
          <h1 className="text-xl font-black text-slate-900">RM Workflow Restricted Area</h1>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            The Stakeholder Alignment Meetings dashboard is exclusively designated for <strong>Relationship Managers</strong>, the <strong>State CSR Coordination Cell</strong>, and Portal Administrators.
          </p>
          <div className="pt-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-900 text-white text-xs font-extrabold hover:bg-blue-950 transition-all shadow-sm"
            >
              Return to Dashboard
            </Link>
          </div>
        </main>
      </GovPortalLayout>
    );
  }

  return (
    <GovPortalLayout>
      <main className="mx-auto min-h-screen max-w-7xl space-y-6 px-4 py-6 md:px-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-blue-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900 border border-blue-200">
                RM Coordination Workspace
              </span>
              <span className="rounded-md bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-900 border border-purple-200">
                Stakeholder Calendar
              </span>
            </div>
            <h1 className="font-heading text-xl md:text-2xl font-black text-slate-950">
              Stakeholder Alignment Meetings & Calendar
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Scheduled tripartite alignment sessions, district feasibility discussions, and corporate donor consultations.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                refetchPitches();
                refetchEnquiries();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            >
              <RefreshCw size={13} className={loadingPitches || loadingEnquiries ? "animate-spin" : ""} />
              Refresh
            </button>
            <Link
              href="/pitches"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-blue-950 transition"
            >
              <Plus size={14} />
              <span>Schedule from Pitch</span>
            </Link>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/80">
            {(["ALL", "UPCOMING", "VIRTUAL", "IN_PERSON"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab
                    ? "bg-white text-blue-900 shadow-xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                {tab === "ALL" && "All Meetings"}
                {tab === "UPCOMING" && "Upcoming"}
                {tab === "VIRTUAL" && "Virtual VC"}
                {tab === "IN_PERSON" && "In-Person"}
              </button>
            ))}
          </div>

          <div className="relative max-w-xs w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search meetings, agendas, attendees..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Meetings Grid */}
        {filteredMeetings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-2">
            <CalendarDays size={32} className="mx-auto text-slate-300" />
            <h3 className="text-sm font-extrabold text-slate-900">No Meetings Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No meetings matching your current filter criteria. You can schedule meetings directly on any Proposal or Corporate Enquiry page.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMeetings.map((m) => (
              <div
                key={m.id}
                className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                      m.status === "SCHEDULED"
                        ? "bg-purple-50 text-purple-800 border-purple-200"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200"
                    }`}>
                      <CheckCircle2 size={11} /> {m.status}
                    </span>
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1 font-mono">
                      <Clock size={12} className="text-blue-900" /> {m.date} {m.time && `at ${m.time}`}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 leading-snug">{m.title}</h3>
                    {m.proposalTitle && (
                      <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5">{m.proposalTitle}</p>
                    )}
                  </div>

                  {m.agenda && (
                    <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2 leading-relaxed">
                      <strong>Agenda:</strong> {m.agenda}
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="rounded-2xl bg-slate-50/70 p-3 border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      {m.mode.toLowerCase().includes("virtual") ? (
                        <Video size={13} className="text-purple-700 shrink-0" />
                      ) : (
                        <MapPin size={13} className="text-emerald-700 shrink-0" />
                      )}
                      <span className="font-semibold text-[11px]">{m.mode}</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-slate-600">
                      <Users size={13} className="text-slate-400 mt-0.5 shrink-0" />
                      <span className="text-[11px] leading-relaxed line-clamp-2">{m.participants.join(" · ")}</span>
                    </div>
                  </div>

                  {m.targetLink && (
                    <div className="flex items-center justify-between pt-1">
                      {m.proposalRef && (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          Ref: {m.proposalRef}
                        </span>
                      )}
                      <Link
                        href={m.targetLink}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-900 hover:text-blue-950 transition-colors ml-auto group"
                      >
                        <span>Open Details</span>
                        <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </GovPortalLayout>
  );
}


"use client";

import { useState, useEffect, useCallback } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { StatCard } from "@/components/ui/StatCard";

import AccessDenied from "@/components/gov/AccessDenied";
import { Loader } from "@/components/ui/Loader";
import { apiFetch, invalidateCache } from "@/lib/api";
import { hasPageAccess, ADMIN_ACCESS_PERMS } from "@/lib/roleAccess";
import {
  Award,
  MapPin,
  Clock,
  Building2,
  CheckCircle2,
  XCircle,
  UserCheck,
  Building
} from "lucide-react";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTh } from "@/components/ui/SortableTh";

interface NodalAppointment {
  id: string;
  district: string;
  domain: string;
  nodalOfficerName: string;
  designation: string;
  department: string;
  appointedAt: string;
  nodalOfficerUser?: { email: string } | null;
  corporateEnquiry?: { trackingId: string; companyName: string; status: string } | null;
  governmentPitch?: { pitchReferenceId: string; officialName: string; status: string } | null;
}

interface PendingAgency {
  id: string;
  email: string;
  iaAgencyName: string | null;
  iaCsr1Number: string | null;
  parentCorporateUser?: { id: string; email: string } | null;
  createdAt: string;
}

const ACCESS_PERMS = ADMIN_ACCESS_PERMS;

export default function NgoSelectionPage() {
  const [mounted, setMounted] = useState(false);
  const [appointments, setAppointments] = useState<NodalAppointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState("");
  const [agencies, setAgencies] = useState<PendingAgency[]>([]);
  const [agenciesLoading, setAgenciesLoading] = useState(true);
  const [agenciesError, setAgenciesError] = useState("");
  const [actionError, setActionError] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const {
    sortedItems: sortedAgencies,
    sortKey: agencySortKey,
    sortDirection: agencySortDirection,
    requestSort: requestAgencySort
  } = useTableSort(agencies, {
    customGetters: {
      agency: (a) => a.iaAgencyName || "",
      email: (a) => a.email || "",
      csr1: (a) => a.iaCsr1Number || "",
      corporate: (a) => a.parentCorporateUser?.email || "",
      createdAt: (a) => a.createdAt || "",
    }
  });

  const {
    sortedItems: sortedAppointments,
    sortKey: apptSortKey,
    sortDirection: apptSortDirection,
    requestSort: requestApptSort
  } = useTableSort(appointments, {
    customGetters: {
      nodalOfficer: (app) => `${app.nodalOfficerName} ${app.nodalOfficerUser?.email || ""}`,
      district: (app) => app.district,
      domain: (app) => app.domain,
      department: (app) => app.department,
      designation: (app) => app.designation,
      source: (app) => app.corporateEnquiry?.companyName || app.governmentPitch?.officialName || "",
      appointedAt: (app) => app.appointedAt,
    }
  });

  useEffect(() => { setMounted(true); }, []);

  const fetchAppointments = useCallback(async () => {
    setAppointmentsLoading(true);
    setAppointmentsError("");
    try {
      const res = await apiFetch<{ success: boolean; data: NodalAppointment[] }>("/js/nodal-appointments");
      setAppointments(res?.data || []);
    } catch (err: unknown) {
      setAppointmentsError(err instanceof Error ? err.message : "Failed to load nodal appointments");
    } finally {
      setAppointmentsLoading(false);
    }
  }, []);

  const fetchAgencies = useCallback(async () => {
    setAgenciesLoading(true);
    setAgenciesError("");
    try {
      const res = await apiFetch<{ success: boolean; data: PendingAgency[] }>("/implementing-agency/approvals/pending");
      setAgencies(res?.data || []);
    } catch (err: unknown) {
      setAgenciesError(err instanceof Error ? err.message : "Failed to load pending implementing agencies");
    } finally {
      setAgenciesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted && hasPageAccess(ACCESS_PERMS)) {
      fetchAppointments();
      fetchAgencies();
    }
  }, [mounted, fetchAppointments, fetchAgencies]);

  const decideAgency = async (id: string, decision: "APPROVE" | "REJECT") => {
    setActionError("");
    setProcessingId(id);
    try {
      await apiFetch(`/implementing-agency/approvals/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ decision }),
      });
      invalidateCache("/implementing-agency");
      fetchAgencies();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to submit decision");
    } finally {
      setProcessingId(null);
    }
  };

  if (!mounted) return null;
  if (!hasPageAccess(ACCESS_PERMS)) {
    return <AccessDenied />;
  }

  const districtsCount = new Set(appointments.map((a) => a.district).filter(Boolean)).size;

  return (
    <GovPortalLayout>
      <GovPageHeader
        breadcrumb="Home / Admin / Agency Selection"
        title="Implementing Agency & Nodal Selection"
        description="District nodal officer appointments for approved CSR initiatives, and pending implementing-agency (NGO) account approvals."
      />

      <div className="space-y-6">
        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Nodal Appointments"
            value={appointments.length}
            icon={Award}
            index={0}
            colorTheme="purple"
            badge="District Nodal"
            sublabel="Officer Appointments"
          />
          <StatCard
            label="Districts Covered"
            value={districtsCount}
            icon={MapPin}
            index={1}
            colorTheme="emerald"
            badge="Coverage"
            sublabel="Statewide Districts"
          />
          <StatCard
            label="Pending IA Approvals"
            value={agencies.length}
            icon={Clock}
            index={2}
            colorTheme="amber"
            badge="Pending Approvals"
            sublabel="Implementing Agencies"
          />
        </div>

        {/* Action Error Alert */}
        {actionError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 flex items-center justify-between">
            <span>{actionError}</span>
            <button type="button" onClick={() => setActionError("")} className="text-rose-600 hover:text-rose-900 font-extrabold">✕</button>
          </div>
        )}

        {/* Section 1: Pending Implementing Agency Approvals */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="text-amber-600" size={20} />
              <h2 className="text-base font-extrabold text-slate-900">Pending Implementing Agency Approvals</h2>
              <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                {agencies.length} Pending
              </span>
            </div>
          </div>

          {agenciesLoading ? (
            <div className="py-8 flex justify-center">
              <Loader label="Loading pending implementing agency approvals..." />
            </div>
          ) : agenciesError ? (
            <div className="py-6 text-center text-xs font-semibold text-rose-600">
              {agenciesError}
            </div>
          ) : agencies.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Building className="mx-auto text-slate-300" size={40} />
              <p className="text-xs font-semibold text-slate-500">No implementing agency accounts awaiting approval.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="gov-table w-full text-xs">
                <thead>
                  <tr>
                    <SortableTh sortKey="agency" currentSortKey={agencySortKey} currentSortDirection={agencySortDirection} onSort={requestAgencySort}>Agency</SortableTh>
                    <SortableTh sortKey="email" currentSortKey={agencySortKey} currentSortDirection={agencySortDirection} onSort={requestAgencySort}>Email</SortableTh>
                    <SortableTh sortKey="csr1" currentSortKey={agencySortKey} currentSortDirection={agencySortDirection} onSort={requestAgencySort}>CSR-1 Number</SortableTh>
                    <SortableTh sortKey="corporate" currentSortKey={agencySortKey} currentSortDirection={agencySortDirection} onSort={requestAgencySort}>Sponsoring Corporate</SortableTh>
                    <SortableTh sortKey="createdAt" currentSortKey={agencySortKey} currentSortDirection={agencySortDirection} onSort={requestAgencySort}>Requested</SortableTh>
                    <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase tracking-wider text-right text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAgencies.map((agency) => (
                    <tr key={agency.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="font-bold text-slate-900">{agency.iaAgencyName || "—"}</td>
                      <td className="text-slate-700 font-medium">{agency.email}</td>
                      <td className="font-mono text-xs text-purple-700 font-semibold">{agency.iaCsr1Number || "—"}</td>
                      <td className="text-slate-600 font-medium">{agency.parentCorporateUser?.email || "—"}</td>
                      <td className="text-slate-500">{agency.createdAt ? new Date(agency.createdAt).toLocaleDateString() : "—"}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={processingId === agency.id}
                            onClick={() => decideAgency(agency.id, "APPROVE")}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition-all"
                          >
                            <CheckCircle2 size={13} /> Approve
                          </button>
                          <button
                            type="button"
                            disabled={processingId === agency.id}
                            onClick={() => decideAgency(agency.id, "REJECT")}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition-all"
                          >
                            <XCircle size={13} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: Nodal Officer Appointments */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="text-purple-600" size={20} />
              <h2 className="text-base font-extrabold text-slate-900">Nodal Officer Appointments</h2>
              <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                {appointments.length} Total
              </span>
            </div>
          </div>

          {appointmentsLoading ? (
            <div className="py-8 flex justify-center">
              <Loader label="Loading nodal officer appointments..." />
            </div>
          ) : appointmentsError ? (
            <div className="py-6 text-center text-xs font-semibold text-rose-600">
              {appointmentsError}
            </div>
          ) : appointments.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Award className="mx-auto text-slate-300" size={40} />
              <p className="text-xs font-semibold text-slate-500">No nodal officer appointments recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="gov-table w-full text-xs">
                <thead>
                  <tr>
                    <SortableTh sortKey="nodalOfficer" currentSortKey={apptSortKey} currentSortDirection={apptSortDirection} onSort={requestApptSort}>Nodal Officer</SortableTh>
                    <SortableTh sortKey="district" currentSortKey={apptSortKey} currentSortDirection={apptSortDirection} onSort={requestApptSort}>District</SortableTh>
                    <SortableTh sortKey="domain" currentSortKey={apptSortKey} currentSortDirection={apptSortDirection} onSort={requestApptSort}>Domain</SortableTh>
                    <SortableTh sortKey="department" currentSortKey={apptSortKey} currentSortDirection={apptSortDirection} onSort={requestApptSort}>Department</SortableTh>
                    <SortableTh sortKey="designation" currentSortKey={apptSortKey} currentSortDirection={apptSortDirection} onSort={requestApptSort}>Designation</SortableTh>
                    <SortableTh sortKey="source" currentSortKey={apptSortKey} currentSortDirection={apptSortDirection} onSort={requestApptSort}>Source</SortableTh>
                    <SortableTh sortKey="appointedAt" currentSortKey={apptSortKey} currentSortDirection={apptSortDirection} onSort={requestApptSort}>Appointed</SortableTh>
                  </tr>
                </thead>
                <tbody>
                  {sortedAppointments.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                      <td>
                        <div className="font-bold text-slate-900">{app.nodalOfficerName || "—"}</div>
                        <div className="text-[11px] text-slate-400 font-medium">{app.nodalOfficerUser?.email || ""}</div>
                      </td>
                      <td className="text-slate-700 font-semibold">{app.district}</td>
                      <td className="text-slate-600 font-medium">{app.domain}</td>
                      <td className="text-slate-600 font-medium">{app.department}</td>
                      <td className="text-slate-600 font-medium">{app.designation}</td>
                      <td>
                        {app.corporateEnquiry ? (
                          <span className="font-mono text-xs font-bold text-blue-700">
                            {app.corporateEnquiry.trackingId} · {app.corporateEnquiry.companyName}
                          </span>
                        ) : app.governmentPitch ? (
                          <span className="font-mono text-xs font-bold text-indigo-700">
                            {app.governmentPitch.pitchReferenceId}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="text-slate-500">
                        {app.appointedAt ? new Date(app.appointedAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </GovPortalLayout>
  );
}

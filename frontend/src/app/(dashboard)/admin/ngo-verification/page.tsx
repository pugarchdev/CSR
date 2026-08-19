"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { Button } from "@/components/ui/Button";
import { Search, Landmark } from "lucide-react";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTh } from "@/components/ui/SortableTh";

export default function NGOEmpanelmentVerification() {
  const [ngos, setNgos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNgo, setSelectedNgo] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Empanelment form states
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState("EMPANELLED");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchNgos();
  }, []);

  const fetchNgos = async () => {
    setLoading(true);
    try {
      // Get all NGOs
      const data = await apiFetch<any[]>("/ngos");
      setNgos(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load NGO empanelment list");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmpanelment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNgo) return;

    setSubmitting(true);
    try {
      await apiFetch(`/ngos/${selectedNgo.id}/empanelment`, {
        method: "PATCH",
        body: JSON.stringify({
          empanelmentStatus: status,
          empanelmentRemarks: remarks
        })
      });
      alert("NGO Empanelment status updated successfully!");
      setSelectedNgo(null);
      setRemarks("");
      fetchNgos();
    } catch (err: any) {
      alert(err.message || "Failed to update empanelment status");
    } finally {
      setSubmitting(false);
    }
  };

  const getEmpanelmentBadgeVariant = (empStatus: string) => {
    switch (empStatus) {
      case "EMPANELLED":
        return "success";
      case "PROFILE_SUBMITTED":
      case "DOCUMENT_REVIEW":
      case "FIELD_VERIFICATION":
        return "warning";
      case "EMPANELMENT_REJECTED":
      case "BLACKLISTED":
      case "SUSPENDED":
        return "danger";
      case "PROFILE_INCOMPLETE":
      default:
        return "muted";
    }
  };

  const filteredNgos = ngos.filter(ngo =>
    ngo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ngo.registrationNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ngo.district || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { sortedItems: sortedNgos, sortKey, sortDirection, requestSort } = useTableSort(filteredNgos, {
    customGetters: {
      name: (n) => n.name || "",
      registrationNumber: (n) => n.registrationNumber || "",
      district: (n) => n.district || "",
      status: (n) => n.status || "",
      empanelmentStatus: (n) => n.empanelmentStatus || "",
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900 font-sans"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b pb-4 border-slate-200">
        <h1 className="text-xl font-bold font-heading text-blue-950">NGO Empanelment Verification</h1>
        <p className="text-xs text-slate-500">Manage NGO empanelment status, verification checks, and review compliance parameters for CSR marketplaces</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Filter search */}
      <div className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search NGOs by name, reg, district..."
            className="w-full pl-9 pr-4 py-2 border rounded-md text-xs focus:ring-1 focus:ring-blue-900 focus:outline-none bg-slate-50 hover:bg-slate-100/50 transition-colors"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* NGO list table */}
        <div className="lg:col-span-2 space-y-4">
          <GovCard>
            <GovCardHeader className="bg-slate-50 border-b">
              <GovCardTitle>NGO Directory</GovCardTitle>
            </GovCardHeader>
            <GovCardBody className="p-0">
              {filteredNgos.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No NGOs found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 font-bold text-slate-700">
                      <tr>
                        <SortableTh sortKey="name" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-6 py-3 text-left">NGO Name</SortableTh>
                        <SortableTh sortKey="registrationNumber" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-6 py-3 text-left">Registration</SortableTh>
                        <SortableTh sortKey="district" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-6 py-3 text-left">District</SortableTh>
                        <SortableTh sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-6 py-3 text-left">MahaCSR Verification</SortableTh>
                        <SortableTh sortKey="empanelmentStatus" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-6 py-3 text-left">Empanelment Status</SortableTh>
                        <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {sortedNgos.map((ngo) => (
                        <tr
                          key={ngo.id}
                          onClick={() => {
                            setSelectedNgo(ngo);
                            setRemarks(ngo.empanelmentRemarks || "");
                            setStatus(ngo.empanelmentStatus || "EMPANELLED");
                          }}
                          className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                            selectedNgo?.id === ngo.id ? "bg-slate-50 font-semibold" : ""
                          }`}
                        >
                          <td className="px-6 py-4 font-bold text-slate-900">{ngo.name}</td>
                          <td className="px-6 py-4 text-slate-600 text-xs">{ngo.registrationNumber}</td>
                          <td className="px-6 py-4 text-slate-600">{ngo.district}</td>
                          <td className="px-6 py-4">
                            <GovStatusBadge variant={ngo.status === "VERIFIED" ? "success" : "warning"}>
                              {ngo.status}
                            </GovStatusBadge>
                          </td>
                          <td className="px-6 py-4">
                            <GovStatusBadge variant={getEmpanelmentBadgeVariant(ngo.empanelmentStatus)}>
                              {ngo.empanelmentStatus.replace(/_/g, " ")}
                            </GovStatusBadge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button className="bg-blue-900 text-white hover:bg-blue-950 font-bold text-xs py-1 px-3">
                              Manage
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GovCardBody>
          </GovCard>
        </div>

        {/* Action Panel */}
        <div className="space-y-4">
          {selectedNgo ? (
            <GovCard className="sticky top-20">
              <GovCardHeader className="bg-slate-50 border-b">
                <GovCardTitle>Manage NGO Empanelment</GovCardTitle>
              </GovCardHeader>
              <GovCardBody className="space-y-4 text-xs">
                <div className="border-b pb-3 space-y-1">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Landmark size={16} className="text-slate-500" />
                    {selectedNgo.name}
                  </h3>
                  <p className="text-slate-500">PAN: <span className="font-semibold">{selectedNgo.pan}</span></p>
                  <p className="text-slate-500">FCRA Details: <span className="font-semibold">{selectedNgo.fcraDetails || "Not Provided"}</span></p>
                </div>

                <form onSubmit={handleUpdateEmpanelment} className="space-y-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Set Empanelment Status</label>
                    <select
                      className="w-full border rounded px-2.5 py-1.5 bg-white text-slate-700"
                      value={status}
                      onChange={e => setStatus(e.target.value)}
                    >
                      <option value="PROFILE_INCOMPLETE">PROFILE INCOMPLETE</option>
                      <option value="PROFILE_SUBMITTED">PROFILE SUBMITTED</option>
                      <option value="DOCUMENT_REVIEW">DOCUMENT REVIEW</option>
                      <option value="FIELD_VERIFICATION">FIELD VERIFICATION</option>
                      <option value="EMPANELLED">EMPANELLED (Allows Marketplace Bids)</option>
                      <option value="EMPANELMENT_REJECTED">EMPANELMENT REJECTED</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                      <option value="BLACKLISTED">BLACKLISTED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Remarks & Audit Notes</label>
                    <textarea
                      placeholder="Write notes about NGO empanelment details, physical verifications, or compliance issues."
                      className="w-full border rounded px-2.5 py-1.5"
                      rows={4}
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => setSelectedNgo(null)}
                      className="bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold w-1/3"
                    >
                      Close
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="bg-blue-900 text-white hover:bg-blue-950 font-bold w-2/3 flex items-center justify-center gap-1"
                    >
                      {submitting ? "Updating..." : "Update Status"}
                    </Button>
                  </div>
                </form>
              </GovCardBody>
            </GovCard>
          ) : (
            <div className="bg-slate-50 border rounded-lg p-6 text-center text-slate-400 italic text-xs">
              Select an NGO from the directory to verify or change its empanelment status.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

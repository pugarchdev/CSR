"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { Button } from "@/components/ui/Button";
import { Search, Eye, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";

export default function DepartmentHandoverPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Handover confirmation modal state
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [submittingHandover, setSubmittingHandover] = useState(false);
  const [handoverForm, setHandoverForm] = useState({
    assetDescription: "",
    handoverDate: new Date().toISOString().split("T")[0],
    remarks: "",
    handoverCertificate: "https://mahacsr.gov.in/docs/mock-handover-certificate.pdf"
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any[]>("/department/projects");
      setProjects(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const getHandoverStatus = (proj: any) => {
    if (proj.assetHandovers && proj.assetHandovers.length > 0) {
      return proj.assetHandovers[0].confirmationStatus || "CONFIRMED";
    }
    const status = proj.projectStatus || proj.status || "";
    return status === "COMPLETED" ? "CONFIRMED" : "PENDING";
  };

  const handleOpenHandoverModal = (proj: any) => {
    setSelectedProject(proj);
    setHandoverForm({
      assetDescription: `Physical infrastructure created for requirement: ${proj.title}`,
      handoverDate: new Date().toISOString().split("T")[0],
      remarks: "All assets checked and found to be in standard operating condition.",
      handoverCertificate: "https://mahacsr.gov.in/docs/mock-handover-certificate.pdf"
    });
    setShowHandoverModal(true);
  };

  const handleConfirmHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    setSubmittingHandover(true);
    try {
      await apiFetch(`/projects/${selectedProject.id}/confirm-handover`, {
        method: "POST",
        body: JSON.stringify({
          ...handoverForm,
          confirmationStatus: "CONFIRMED"
        })
      });
      alert("Asset handover confirmed successfully!");
      setShowHandoverModal(false);
      fetchProjects();
    } catch (err: any) {
      alert(err.message || "Failed to confirm handover");
    } finally {
      setSubmittingHandover(false);
    }
  };

  const filteredProjects = projects.filter(proj => {
    const matchesSearch = 
      proj.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (proj.ngo?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4 border-slate-200">
        <div>
          <h1 className="text-xl font-bold font-heading text-blue-950">Asset Handover Confirmation</h1>
          <p className="text-xs text-slate-500">Confirm delivery, verify work quality, and accept handover certificates for completed CSR projects</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Search bar */}
      <div className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search projects..."
            className="w-full pl-9 pr-4 py-2 border rounded-md text-xs focus:ring-1 focus:ring-blue-900 focus:outline-none bg-slate-50"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Handover List */}
      <GovCard>
        <GovCardBody className="p-0">
          {filteredProjects.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p className="font-medium text-slate-700">No projects found.</p>
              <p className="text-xs mt-1">Projects must be in progress or completed to manage asset handover.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left">Project Title</th>
                    <th className="px-6 py-3 text-left">NGO Implementer</th>
                    <th className="px-6 py-3 text-left">CSR Sponsor</th>
                    <th className="px-6 py-3 text-left">Project Status</th>
                    <th className="px-6 py-3 text-left">Handover Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredProjects.map((proj) => {
                    const status = getHandoverStatus(proj);
                    return (
                      <tr key={proj.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900 max-w-[220px] truncate">
                          {proj.title}
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          {proj.ngo?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-slate-655 font-medium">
                          {proj.company?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          <GovStatusBadge variant={(proj.projectStatus || proj.status) === "COMPLETED" ? "success" : "info"}>
                            {(proj.projectStatus || proj.status || "").replace(/_/g, " ")}
                          </GovStatusBadge>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                            status === "CONFIRMED" ? "text-green-700" : "text-amber-700"
                          }`}>
                            <ShieldCheck size={14} className={status === "CONFIRMED" ? "text-green-700" : "text-amber-500"} />
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() => router.push(`/department/requirements/${proj.csrRequirementId}`)}
                              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
                              title="View Details"
                            >
                              <Eye size={14} />
                            </Button>
                            {status !== "CONFIRMED" && (
                              <Button
                                onClick={() => handleOpenHandoverModal(proj)}
                                className="bg-[#14274e] hover:bg-[#0e2144] text-white text-xs font-bold py-1.5 px-3 flex items-center gap-1 border-none shadow-sm"
                              >
                                <CheckCircle2 size={13} /> Confirm Handover
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GovCardBody>
      </GovCard>

      {/* Modal: Handover Confirmation */}
      {showHandoverModal && selectedProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 text-slate-700">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-900 text-sm">Asset Handover Confirmation</h3>
              <button onClick={() => setShowHandoverModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmHandover} className="space-y-4 text-xs font-semibold">
              <div className="bg-slate-50 border p-3 rounded-lg">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Confirming Handover For</span>
                <span className="text-[#14274e] text-sm font-bold block mt-0.5">{selectedProject.title}</span>
                <span className="text-slate-600 mt-1 block">NGO: {selectedProject.ngo?.name}</span>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Asset Description *</label>
                <textarea
                  required
                  placeholder="e.g. 50 school desks, toilet blocks, and 2 sanitization stations built."
                  className="w-full border rounded px-2.5 py-1.5 bg-slate-50"
                  rows={3}
                  value={handoverForm.assetDescription}
                  onChange={e => setHandoverForm({ ...handoverForm, assetDescription: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">Handover Date *</label>
                  <input
                    type="date"
                    required
                    className="w-full border rounded px-2.5 py-1.5 bg-slate-50"
                    value={handoverForm.handoverDate}
                    onChange={e => setHandoverForm({ ...handoverForm, handoverDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Handover Certificate URL</label>
                  <input
                    type="text"
                    className="w-full border rounded px-2.5 py-1.5 bg-slate-100 text-slate-500 cursor-not-allowed"
                    disabled
                    value={handoverForm.handoverCertificate}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Inspector Remarks *</label>
                <textarea
                  required
                  placeholder="Remarks on quality checks, physical confirmation..."
                  className="w-full border rounded px-2.5 py-1.5 bg-slate-50"
                  rows={2}
                  value={handoverForm.remarks}
                  onChange={e => setHandoverForm({ ...handoverForm, remarks: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" onClick={() => setShowHandoverModal(false)} className="bg-slate-200 text-slate-800">Cancel</Button>
                <Button type="submit" disabled={submittingHandover} className="bg-green-700 hover:bg-green-800 text-white font-bold">
                  {submittingHandover ? "Submitting..." : "Confirm & Complete Project"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

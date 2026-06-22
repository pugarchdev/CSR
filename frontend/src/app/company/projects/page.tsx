"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { Button } from "@/components/ui/Button";
import { Search, Eye, Landmark, Building } from "lucide-react";

export default function CompanyProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any[]>("/company/projects");
      setProjects(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    const s = status || "";
    switch (s) {
      case "COMPLETED":
      case "IMPACT_REPORT_GENERATED":
        return "success";
      case "EXECUTION_STARTED":
      case "IN_PROGRESS":
      case "AGREEMENT_SIGNED":
        return "info";
      case "AGREEMENT_PENDING":
      case "NGO_SELECTED":
        return "warning";
      default:
        return "muted";
    }
  };

  const filteredProjects = projects.filter(proj => {
    const title = proj.title || "";
    const matchesSearch = 
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (proj.beneficiaryProfile?.agencyName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          <h1 className="text-xl font-bold font-heading text-blue-950">My Funded CSR Projects</h1>
          <p className="text-xs text-slate-500">Track and manage active corporate sponsored projects, released funds, and NGO implementation</p>
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

      {/* Projects Table */}
      <GovCard>
        <GovCardBody className="p-0">
          {filteredProjects.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p className="font-medium text-slate-700">No active projects found.</p>
              <p className="text-xs mt-1">Projects will appear here once tripartite agreements are signed and conversion is complete.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left">Project Title</th>
                    <th className="px-6 py-3 text-left">Implementing NGO</th>
                    <th className="px-6 py-3 text-left">Committed Amount</th>
                    <th className="px-6 py-3 text-left">Released / Utilized</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredProjects.map((proj) => (
                    <tr key={proj.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 max-w-[240px] truncate">
                        {proj.title}
                      </td>
                      <td className="px-6 py-4 text-slate-655 font-medium">
                        <span className="flex items-center gap-1">
                          <Building size={13} className="text-slate-400" />
                          {proj.ngo?.name || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        ₹{Number(proj.committedAmount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="flex flex-col gap-0.5">
                          <span>Released: <span className="font-bold text-green-700">₹{Number(proj.releasedAmount || 0).toLocaleString()}</span></span>
                          <span>Utilized: <span className="font-bold text-indigo-700">₹{Number(proj.utilizedAmount || 0).toLocaleString()}</span></span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <GovStatusBadge variant={getStatusVariant(proj.projectStatus || proj.status)}>
                          {(proj.projectStatus || proj.status || "").replace(/_/g, " ")}
                        </GovStatusBadge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          onClick={() => router.push(`/company/marketplace/${proj.csrRequirementId}`)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
                          title="View Details"
                        >
                          <Eye size={14} />
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
  );
}

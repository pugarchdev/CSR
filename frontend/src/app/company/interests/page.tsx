"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { GovCard, GovCardBody } from "@/components/gov/GovCard";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { Button } from "@/components/ui/Button";
import { Search, Eye, Calendar } from "lucide-react";

export default function CompanyInterestsPage() {
  const router = useRouter();
  const [interests, setInterests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchInterests();
  }, []);

  const fetchInterests = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any[]>("/company/interests");
      setInterests(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load company interests");
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "CI_AGREEMENT_SIGNED":
      case "FUND_RELEASED":
      case "CI_COMPLETED":
        return "success";
      case "INTEREST_SUBMITTED":
      case "UNDER_DISCUSSION":
        return "info";
      case "NGO_SELECTED":
      case "FUNDING_APPROVED":
      case "CI_AGREEMENT_PENDING":
        return "warning";
      case "WITHDRAWN":
      default:
        return "muted";
    }
  };

  const filteredInterests = interests.filter(item => {
    const matchesSearch = 
      (item.governmentPitch?.csrRequirement || item.companyName || "").toLowerCase().includes(searchTerm.toLowerCase());
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
          <h1 className="text-xl font-bold font-heading text-blue-950">My Interests</h1>
          <p className="text-xs text-slate-500">Track public development needs where your company has expressed CSR interest.</p>
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
            placeholder="Search development need..."
            className="w-full pl-9 pr-4 py-2 border rounded-md text-xs focus:ring-1 focus:ring-blue-900 focus:outline-none bg-slate-50"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Interests Table */}
      <GovCard>
        <GovCardBody className="p-0">
          {filteredInterests.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p className="font-medium text-slate-700">No interests expressed yet.</p>
              <p className="text-xs mt-1">Browse public development needs and express interest to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left">Development Need</th>
                    <th className="px-6 py-3 text-left">District</th>
                    <th className="px-6 py-3 text-left">Estimated Cost</th>
                    <th className="px-6 py-3 text-left">Indicative Budget</th>
                    <th className="px-6 py-3 text-left">Implementation Mode</th>
                    <th className="px-6 py-3 text-left">Submission Date</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredInterests.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 max-w-[220px] truncate">
                        {item.governmentPitch?.csrRequirement || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-slate-655 font-medium">
                        {item.governmentPitch?.district || "N/A"}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700">
                        ₹{Number(item.governmentPitch?.estimatedCost || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4 font-bold text-[#14274e]">
                        ₹{Number(item.indicativeBudget || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {(item.implementationMode || "N/A").replace(/_/g, " ")}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        <span className="flex items-center gap-1 text-xs">
                          <Calendar size={13} className="text-slate-450" />
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <GovStatusBadge variant={getStatusVariant(item.status)}>
                          {item.status.replace(/_/g, " ")}
                        </GovStatusBadge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          onClick={() => router.push("/company/marketplace")}
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

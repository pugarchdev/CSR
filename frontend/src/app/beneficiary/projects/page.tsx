"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { Button } from "@/components/ui/Button";
import { PlusCircle, Search, FileText, ArrowRight, Eye, Edit, Trash } from "lucide-react";

export default function MyCSRRequirements() {
  const router = useRouter();
  const pathname = usePathname();
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");

  useEffect(() => {
    fetchRequirements();
  }, []);

  const fetchRequirements = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any[]>("/csr-requirements/my");
      setRequirements(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load requirements");
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "VERIFIED":
      case "MARKETPLACE_LISTED":
      case "AGREEMENT_SIGNED":
      case "COMPLETED":
        return "success";
      case "PENDING_VERIFICATION":
      case "FIELD_VERIFICATION_REQUIRED":
      case "AGREEMENT_PENDING":
        return "warning";
      case "REJECTED":
      case "CANCELLED":
        return "danger";
      case "DRAFT":
      default:
        return "muted";
    }
  };

  const filteredRequirements = requirements.filter(req => {
    const matchesSearch = req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.district.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === "ALL") return matchesSearch;
    if (activeTab === "DRAFT") return matchesSearch && req.status === "DRAFT";
    if (activeTab === "PENDING") return matchesSearch && ["PENDING_VERIFICATION", "FIELD_VERIFICATION_REQUIRED", "CLARIFICATION_REQUIRED"].includes(req.status);
    if (activeTab === "VERIFIED") return matchesSearch && ["VERIFIED", "MARKETPLACE_LISTED", "NGO_APPLICATIONS_OPEN", "COMPANY_INTEREST_RECEIVED"].includes(req.status);
    if (activeTab === "ACTIVE") return matchesSearch && ["NGO_SELECTED", "AGREEMENT_PENDING", "AGREEMENT_SIGNED", "EXECUTION_STARTED", "IN_PROGRESS"].includes(req.status);
    if (activeTab === "COMPLETED") return matchesSearch && ["COMPLETION_SUBMITTED", "COMPLETED", "IMPACT_REPORT_GENERATED"].includes(req.status);
    
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
          <h1 className="text-xl font-bold font-heading text-blue-950">Department CSR Requirements</h1>
          <p className="text-xs text-slate-500">Track department-created requirements, company interest, NGO selection, and project conversion</p>
        </div>
        <Button 
          onClick={() => router.push("/beneficiary/projects/new")}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold flex items-center gap-2 border-none shadow self-stretch sm:self-auto justify-center"
        >
          <PlusCircle size={18} />
          Post New Requirement
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Tabs and Search */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-3 rounded-lg border shadow-sm">
        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1 border-b md:border-b-0 pb-2 md:pb-0 scrollbar-none">
          {["ALL", "DRAFT", "PENDING", "VERIFIED", "ACTIVE", "COMPLETED"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-colors shrink-0 ${
                activeTab === tab 
                  ? "bg-blue-900 text-white shadow-sm" 
                  : "text-slate-600 hover:text-blue-900 hover:bg-slate-50"
              }`}
            >
              {tab === "PENDING" ? "Verification" : tab === "VERIFIED" ? "Marketplace" : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative md:max-w-xs w-full">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search requirements..."
            className="w-full pl-9 pr-4 py-2 border rounded-md text-xs focus:ring-1 focus:ring-blue-900 focus:outline-none bg-slate-50 hover:bg-slate-100/50 transition-colors"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Requirements Table */}
      <GovCard>
        <GovCardBody className="p-0">
          {filteredRequirements.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p className="font-medium text-slate-700">No requirements found matching filters.</p>
              <p className="text-xs mt-1">Change tab filters or create a new requirement to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left">Title</th>
                    <th className="px-6 py-3 text-left">Category</th>
                    <th className="px-6 py-3 text-left">District</th>
                    <th className="px-6 py-3 text-left">Estimated Cost</th>
                    <th className="px-6 py-3 text-left">Beneficiaries</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Bids/Interests</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRequirements.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 max-w-[220px] truncate">
                        {req.title}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {req.category.replace(/_/g, " ")}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {req.district}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        ₹{Number(req.estimatedCost).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {req.beneficiaryCount}
                      </td>
                      <td className="px-6 py-4">
                        <GovStatusBadge variant={getStatusVariant(req.status)}>
                          {req.status.replace(/_/g, " ")}
                        </GovStatusBadge>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        <div className="flex flex-col gap-0.5">
                          <span>NGO Apps: <span className="font-bold text-blue-900">{req._count.ngoApplications}</span></span>
                          <span>Company: <span className="font-bold text-indigo-700">{req._count.companyInterests}</span></span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => {
                              const dest = pathname.startsWith("/department") || pathname.startsWith("/beneficiary")
                                ? `/department/requirements/${req.id}`
                                : `/csr-marketplace/${req.id}`;
                              router.push(dest);
                            }}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
                            title="View details"
                          >
                            <Eye size={14} />
                          </Button>
                          {["DRAFT", "CLARIFICATION_REQUIRED"].includes(req.status) && (
                            <Button
                              onClick={() => router.push(`/beneficiary/projects/edit/${req.id}`)}
                              className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-md"
                              title="Edit requirement"
                            >
                              <Edit size={14} />
                            </Button>
                          )}
                        </div>
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

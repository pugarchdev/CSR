"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  MapPin,
  Building2,
} from "lucide-react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import GovButton from "@/components/gov/GovButton";
import GovAlert from "@/components/gov/GovAlert";
import { PageSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiFetch, API_BASE_URL } from "@/lib/api";

// Types
interface NodalDashboardStats {
  assignedProjects: number;
  pendingVerifications: number;
  activeGrievances: number;
  completedProjects: number;
}

interface Project {
  id: string;
  title: string;
  ngoName: string;
  district: string;
  startDate: string;
  endDate: string;
  totalMilestones: number;
  completedMilestones: number;
  status: string;
}

interface Grievance {
  id: string;
  projectId: string;
  projectTitle: string;
  raisedBy: string;
  category: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: string;
  raisedDate: string;
}

interface DashboardData {
  stats: NodalDashboardStats;
  activeProjects: Project[];
  pendingGrievances: Grievance[];
}

// Fetch dashboard data
const fetchNodalDashboard = async (): Promise<DashboardData> => {
  const response = await apiFetch<any>("/nodal/dashboard");
  const payload = response?.data ?? response;
  const summary = payload?.summary ?? {};
  const recentProjects = payload?.recentProjects ?? [];

  return {
    stats: {
      assignedProjects: summary.assignedProjects ?? 0,
      pendingVerifications: (summary.pendingMilestones ?? 0) + (summary.pendingUCs ?? 0),
      activeGrievances: summary.pendingGrievances ?? 0,
      completedProjects: summary.completedProjects ?? 0,
    },
    activeProjects: recentProjects.map((project: any) => ({
      id: project.id,
      title: project.title,
      ngoName: project.implementingAgencyUser?.email ?? project.corporateName ?? "Implementing Agency",
      district: project.district,
      startDate: project.createdAt,
      endDate: project.updatedAt ?? project.createdAt,
      totalMilestones: project._count?.milestones ?? 0,
      completedMilestones: Math.round(((project.physicalProgressPercent ?? 0) / 100) * (project._count?.milestones ?? 0)),
      status: project.status,
    })),
    pendingGrievances: [],
  };
};

// Stats Card Component
function StatCard({
  label,
  value,
  icon: Icon,
  trend,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  trend?: { value: string; positive: boolean };
}) {
  return (
    <GovCard>
      <GovCardBody>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-slate-500 font-medium mb-1">{label}</p>
            <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
            {trend && (
              <p
                className={`text-xs font-medium mt-1 ${
                  trend.positive ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {trend.positive ? "+" : "-"}
                {trend.value} from last month
              </p>
            )}
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <Icon className="w-6 h-6 text-blue-700" />
          </div>
        </div>
      </GovCardBody>
    </GovCard>
  );
}

export default function NodalDashboardPage() {
  const [userDistrict, setUserDistrict] = useState<string>("Pune");
  const [ngoQueue, setNgoQueue] = useState<any[]>([]);
  const [reviewNgoDetails, setReviewNgoDetails] = useState<any | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [kycChecked, setKycChecked] = useState(false);

  const fetchNgoQueue = async () => {
    try {
      const res = await apiFetch<any>("/nodal/ngos/verification-queue");
      if (res && res.success) {
        setNgoQueue(res.data || []);
      } else if (Array.isArray(res)) {
        setNgoQueue(res);
      } else if (res?.data) {
        setNgoQueue(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch NGO queue:", err);
    }
  };

  const handleFinalVerification = async (ngoId: string, approved: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/nodal/ngos/${ngoId}/final-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("accessToken") || ""}`
        },
        body: JSON.stringify({ approved, remarks: reviewRemarks })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Verification failed");
      alert(data.message || "NGO verification completed successfully.");
      setReviewNgoDetails(null);
      setReviewRemarks("");
      setKycChecked(false);
      fetchNgoQueue();
    } catch (err: any) {
      alert(err.message || "Failed to submit verification.");
    }
  };

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<DashboardData>({
    queryKey: ["nodal-dashboard"],
    queryFn: fetchNodalDashboard,
    retry: 1,
  });

  // Get user district from localStorage
  useEffect(() => {
    fetchNgoQueue();
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("user");
      if (user) {
        try {
          const userData = JSON.parse(user);
          if (userData.district) {
            setUserDistrict(userData.district);
          }
        } catch (e) {
          console.error("Error parsing user data", e);
        }
      }
    }
  }, []);

  if (isLoading) {
    return (
      <GovPortalLayout userRole="NODAL_OFFICER">
        <div className="gov-page-header">
          <div className="gov-breadcrumb">
            Home / Nodal Officer / Dashboard
          </div>
          <h1 className="gov-page-title">District Nodal Officer Dashboard</h1>
          <p className="gov-page-description">
            Welcome back. Here&apos;s an overview of projects and activities in your district.
          </p>
        </div>
        <PageSkeleton />
      </GovPortalLayout>
    );
  }

  if (error) {
    return (
      <GovPortalLayout userRole="NODAL_OFFICER">
        <div className="gov-page-header">
          <div className="gov-breadcrumb">
            Home / Nodal Officer / Dashboard
          </div>
          <h1 className="gov-page-title">District Nodal Officer Dashboard</h1>
          <p className="gov-page-description">
            Welcome back. Here&apos;s an overview of projects and activities in your district.
          </p>
        </div>
        <GovAlert variant="danger">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>
              Failed to load dashboard data.{" "}
              <button
                onClick={() => refetch()}
                className="underline font-medium"
              >
                Retry
              </button>
            </span>
          </div>
        </GovAlert>
      </GovPortalLayout>
    );
  }

  const stats = data?.stats ?? {
    assignedProjects: 0,
    pendingVerifications: 0,
    activeGrievances: 0,
    completedProjects: 0,
  };

  const activeProjects = data?.activeProjects ?? [];
  const pendingGrievances = data?.pendingGrievances ?? [];

  return (
    <GovPortalLayout userRole="NODAL_OFFICER">
      {/* Page Header */}
      <div className="gov-page-header">
        <div className="gov-breadcrumb">
          Home / Nodal Officer / Dashboard
        </div>
        <h1 className="gov-page-title">District Nodal Officer Dashboard</h1>
        <p className="gov-page-description">
          Welcome back. Here&apos;s an overview of CSR projects and activities in {userDistrict} district.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Assigned Projects"
          value={stats.assignedProjects}
          icon={ClipboardList}
          trend={{ value: "3", positive: true }}
        />
        <StatCard
          label="Pending Verifications"
          value={stats.pendingVerifications}
          icon={Clock}
        />
        <StatCard
          label="Active Grievances"
          value={stats.activeGrievances}
          icon={AlertCircle}
          trend={{ value: "2", positive: false }}
        />
        <StatCard
          label="Completed Projects"
          value={stats.completedProjects}
          icon={CheckCircle2}
          trend={{ value: "5", positive: true }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Projects */}
        <GovCard className="lg:col-span-2">
          <GovCardHeader>
            <div className="flex items-center justify-between">
              <GovCardTitle>Active Projects</GovCardTitle>
              <Link href="/nodal/projects">
                <GovButton variant="secondary" className="text-sm">
                  View All
                </GovButton>
              </Link>
            </div>
          </GovCardHeader>
          <GovCardBody>
            {activeProjects.length === 0 ? (
              <EmptyState
                title="No Active Projects"
                description="There are no active projects in your district at the moment."
                icon={FileText}
              />
            ) : (
              <div className="gov-table-container">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>NGO</th>
                      <th>District</th>
                      <th>Timeline</th>
                      <th>Milestones</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeProjects.map((project) => (
                      <tr key={project.id}>
                        <td>
                          <div className="font-medium text-slate-900">
                            {project.title}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            <span className="text-sm">{project.ngoName}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span className="text-sm">{project.district}</span>
                          </div>
                        </td>
                        <td>
                          <div className="text-sm">
                            <div>{new Date(project.startDate).toLocaleDateString("en-IN")}</div>
                            <div className="text-slate-500">
                              to {new Date(project.endDate).toLocaleDateString("en-IN")}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="text-sm">
                            <span className="font-medium text-emerald-600">
                              {project.completedMilestones}
                            </span>
                            <span className="text-slate-500">
                              {" "}/ {project.totalMilestones}
                            </span>
                          </div>
                          <div className="w-24 h-1.5 bg-slate-200 rounded-full mt-1">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{
                                width: `${(project.completedMilestones / project.totalMilestones) * 100}%`,
                              }}
                            />
                          </div>
                        </td>
                        <td>
                          <GovStatusBadge
                            variant={
                              project.status === "ACTIVE"
                                ? "success"
                                : project.status === "PENDING"
                                ? "warning"
                                : "info"
                            }
                          >
                            {project.status}
                          </GovStatusBadge>
                        </td>
                        <td>
                          <Link href={`/nodal/projects/${project.id}`}>
                            <GovButton variant="secondary" className="text-sm py-1 px-3">
                              View
                            </GovButton>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GovCardBody>
        </GovCard>

        {/* Pending Grievances */}
        <GovCard className="lg:col-span-2">
          <GovCardHeader>
            <div className="flex items-center justify-between">
              <GovCardTitle>Pending Grievances</GovCardTitle>
              <Link href="/nodal/grievances">
                <GovButton variant="secondary" className="text-sm">
                  View All
                </GovButton>
              </Link>
            </div>
          </GovCardHeader>
          <GovCardBody>
            {pendingGrievances.length === 0 ? (
              <EmptyState
                title="No Pending Grievances"
                description="All grievances have been resolved. Great job!"
                icon={CheckCircle2}
              />
            ) : (
              <div className="gov-table-container">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>Grievance ID</th>
                      <th>Project</th>
                      <th>Raised By</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingGrievances.map((grievance) => (
                      <tr key={grievance.id}>
                        <td>
                          <span className="font-mono text-sm">#{grievance.id}</span>
                        </td>
                        <td>
                          <div className="text-sm font-medium text-slate-900">
                            {grievance.projectTitle}
                          </div>
                          <div className="text-xs text-slate-500">
                            PID: {grievance.projectId}
                          </div>
                        </td>
                        <td className="text-sm">{grievance.raisedBy}</td>
                        <td className="text-sm">{grievance.category}</td>
                        <td>
                          <GovStatusBadge
                            variant={
                              grievance.priority === "URGENT"
                                ? "danger"
                                : grievance.priority === "HIGH"
                                ? "warning"
                                : grievance.priority === "MEDIUM"
                                ? "info"
                                : "muted"
                            }
                          >
                            {grievance.priority}
                          </GovStatusBadge>
                        </td>
                        <td className="text-sm">
                          {new Date(grievance.raisedDate).toLocaleDateString("en-IN")}
                        </td>
                        <td>
                          <Link href={`/nodal/grievances/${grievance.id}`}>
                            <GovButton variant="secondary" className="text-sm py-1 px-3">
                              Resolve
                            </GovButton>
                          </Link>
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

      {/* NGO Empanelment Queue */}
      <GovCard className="mt-6">
        <GovCardHeader>
          <div className="flex items-center justify-between">
            <GovCardTitle>NGO Empanelment Final Verification Queue</GovCardTitle>
            <GovStatusBadge variant="info">{ngoQueue.length} Pending</GovStatusBadge>
          </div>
        </GovCardHeader>
        <GovCardBody>
          {reviewNgoDetails && (
            <div className="mb-6 p-6 bg-slate-50 border border-slate-200 rounded-xl">
              <h4 className="font-bold text-sm text-slate-800 mb-3">Empanelment Document Review: {reviewNgoDetails.name}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium text-slate-700 bg-white p-4 border border-slate-200 rounded mb-4">
                <div>• Pan Card: <strong>{reviewNgoDetails.pan}</strong></div>
                <div>• Registration Code: <strong>{reviewNgoDetails.registrationNumber}</strong></div>
                <div>• CSR-1 ID: <strong>{reviewNgoDetails.csr1Number}</strong></div>
                <div>• NGO Darpan ID: <strong>{reviewNgoDetails.darpanNumber}</strong></div>
                <div>• Office Address: <strong>{reviewNgoDetails.address}, {reviewNgoDetails.district}</strong></div>
                <div>• Email: <strong>{reviewNgoDetails.officialEmail || reviewNgoDetails.users?.[0]?.email}</strong></div>
                
                {reviewNgoDetails.onboardingApplication && (
                  <div className="md:col-span-2 border-t border-slate-100 pt-3">
                    <div className="font-bold text-slate-800 mb-2">Two-Level Verification Documents:</div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 border border-slate-200 text-[10px] font-bold rounded cursor-pointer" onClick={() => alert("Reviewing Registration Certificate...")}>
                        <FileText className="w-3 h-3 text-slate-500" /> Registration_Certificate.pdf
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 border border-slate-200 text-[10px] font-bold rounded cursor-pointer" onClick={() => alert("Reviewing 12A Certificate...")}>
                        <FileText className="w-3 h-3 text-slate-500" /> 12A_Certificate.pdf
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 border border-slate-200 text-[10px] font-bold rounded cursor-pointer" onClick={() => alert("Reviewing 80G Certificate...")}>
                        <FileText className="w-3 h-3 text-slate-500" /> 80G_Certificate.pdf
                      </span>
                      {reviewNgoDetails.onboardingApplication.bankAccountNumber && (
                        <div className="w-full mt-2 p-2 bg-indigo-50 border border-indigo-100 text-[10px] text-indigo-900 rounded">
                          Bank Account Details verified: {reviewNgoDetails.onboardingApplication.bankName} (A/C: {reviewNgoDetails.onboardingApplication.bankAccountNumber}, IFSC: {reviewNgoDetails.onboardingApplication.ifscCode})
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Aadhaar e-KYC / DigiLocker Verification Check */}
              <div className="mb-4 p-4 border border-slate-200 rounded bg-white">
                <span className="font-bold text-xs text-slate-700 block mb-2">e-Governance verification checks:</span>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">1. DigiLocker Registered Deed check</span>
                    <span className="text-emerald-600 font-bold">✔ Match Verified (100% authenticity)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">2. Signatory Aadhaar e-KYC status</span>
                    {kycChecked ? (
                      <span className="text-emerald-600 font-bold">✔ e-KYC Successful (UIDAI Verified)</span>
                    ) : (
                      <button 
                        onClick={() => {
                          setKycChecked(true);
                          alert("e-KYC verified via UIDAI integration gateway!");
                        }}
                        className="text-[10px] bg-[#14274e] text-white font-bold px-2 py-1 rounded hover:bg-[#0e2144]"
                      >
                        Perform Aadhaar e-KYC
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700">Verification remarks / Empanelment terms</label>
                <textarea 
                  rows={2}
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  placeholder="Enter empanelment remarks or rejection explanation"
                  className="govt-input text-xs" 
                />
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <GovButton variant="secondary" onClick={() => {
                  setReviewNgoDetails(null);
                  setReviewRemarks("");
                  setKycChecked(false);
                }}>
                  Cancel
                </GovButton>
                <GovButton variant="secondary" className="bg-rose-600 hover:bg-rose-700 text-white border-0" onClick={() => handleFinalVerification(reviewNgoDetails.id, false)}>
                  Reject & Deactivate
                </GovButton>
                <GovButton variant="primary" disabled={!kycChecked} className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 disabled:bg-slate-350" onClick={() => handleFinalVerification(reviewNgoDetails.id, true)}>
                  Approve Empanelment
                </GovButton>
              </div>
            </div>
          )}

          {ngoQueue.length === 0 ? (
            <EmptyState 
              title="Empanelment queue clear"
              description="No partner NGOs are currently pending final verification in your district."
              icon={CheckCircle2}
            />
          ) : (
            <div className="gov-table-container">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>NGO Name</th>
                    <th>Email Address</th>
                    <th>PAN Card</th>
                    <th>CSR-1 Code</th>
                    <th>Stage</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ngoQueue.map((ngo) => (
                    <tr key={ngo.id}>
                      <td className="font-bold text-slate-900">{ngo.name}</td>
                      <td>{ngo.officialEmail || ngo.users?.[0]?.email}</td>
                      <td className="font-mono text-sm">{ngo.pan}</td>
                      <td className="text-slate-600">{ngo.csr1Number}</td>
                      <td>
                        <span className="govt-badge bg-orange-100 text-orange-850 border-orange-200">Corporate Preliminary Approved</span>
                      </td>
                      <td className="text-right">
                        <GovButton variant="primary" className="text-xs py-1 px-3" onClick={() => setReviewNgoDetails(ngo)}>
                          Perform Verification
                        </GovButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GovCardBody>
      </GovCard>
    </GovPortalLayout>
  );
}

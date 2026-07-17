// RM Dashboard - Redesigned with New Components
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Inbox, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  FileText,
  ChevronRight,
  Phone,
  Mail,
  Layers,
  BarChart2,
  Building2,
  Sparkles,
  Compass
} from "lucide-react";

// New UI Components
import { DashboardLayout } from "@/components/layout";
import { PageHeader } from "@/components/layout";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";
import { DataTable, Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";

// API
import { apiFetch } from "@/lib/api";
import { useApiQuery } from "@/lib/apiHooks";

// Types
interface DashboardStats {
  totalEnquiries: number;
  pendingResponse: number;
  slaDueSoon: number;
  pendingVerifications: number;
}

interface Enquiry {
  id: string;
  trackingId: string;
  companyName: string;
  sector: string;
  status: "PENDING" | "IN_PROGRESS" | "UNDER_VERIFICATION" | "APPROVED" | "REJECTED" | "ESCALATED";
  slaDue: string;
  submittedAt: string;
  district: string;
}

interface GovernmentPitch {
  id: string;
  trackingId: string;
  departmentName: string;
  projectTitle: string;
  estimatedCost: number;
  status: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED";
  submittedAt: string;
}

// Status badge variant mapper
const getStatusVariant = (status: string) => {
  const statusMap: Record<string, "warning" | "info" | "success" | "danger" | "muted"> = {
    PENDING: "warning",
    IN_PROGRESS: "info",
    UNDER_VERIFICATION: "info",
    APPROVED: "success",
    REJECTED: "danger",
    ESCALATED: "danger",
    PENDING_VERIFICATION: "warning",
    VERIFIED: "success",
  };
  return statusMap[status] || "muted";
};

// Format date helper
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Calculate days remaining for SLA
const getDaysRemaining = (slaDue: string): number => {
  const due = new Date(slaDue);
  const today = new Date();
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Sidebar items for RM
const sidebarItems = [
  { label: "Dashboard", href: "/rm/dashboard", icon: Layers },
  { label: "Corporate Enquiries", href: "/rm/enquiries", icon: Mail },
  { label: "Government Pitches", href: "/rm/government-pitches", icon: Compass },
  { label: "Corporate Interests", href: "/rm/interests", icon: Sparkles },
  { label: "Feasibility Reports", href: "/rm/assessments", icon: FileText },
  { label: "Company Directory", href: "/rm/companies", icon: Building2 },
  { label: "Communication Log", href: "/rm/communications", icon: Mail },
  { label: "Reports", href: "/rm/reports", icon: BarChart2 },
];

export default function RMDashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("Relationship Manager");

  const { data: rawStats, isLoading: statsLoading } = useApiQuery<any>(
    ["rm", "dashboard", "stats"],
    "/rm/dashboard?view=summary",
    { staleTime: 60 * 1000 }
  );

  const { data: enquiriesResponse, isLoading: enquiriesLoading } = useApiQuery<any>(
    ["rm", "enquiries", "recent"],
    "/rm/enquiries?limit=5&view=dashboard",
    { staleTime: 60 * 1000 }
  );

  const { data: pitchesResponse, isLoading: pitchesLoading } = useApiQuery<any>(
    ["rm", "pitches", "pending"],
    "/rm/pitches?limit=5&view=dashboard",
    { staleTime: 60 * 1000 }
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("user");
      if (user) {
        try {
          const userData = JSON.parse(user);
          setUserName(userData.name || "Relationship Manager");
        } catch {
          console.error("Error parsing user data");
        }
      }
    }
  }, []);

  const stats: DashboardStats = {
    totalEnquiries: rawStats?.corporateEnquiries?.total ?? 0,
    pendingResponse: rawStats?.corporateEnquiries?.pending ?? 0,
    slaDueSoon: rawStats?.performance?.slaItemsDueSoon ?? 0,
    pendingVerifications: rawStats?.governmentPitches?.pendingVerification ?? 0,
  };

  const recentEnquiries: Enquiry[] = (enquiriesResponse?.data ?? []).map((item: any) => ({
    id: item.id,
    trackingId: item.trackingId,
    companyName: item.companyName,
    sector: item.sector,
    status: item.status,
    slaDue: item.firstResponseDueAt ?? item.updatedAt ?? item.submittedAt,
    submittedAt: item.submittedAt,
    district: item.preferredDistricts?.join(", ") ?? item.preferredDistrict ?? item.district ?? "",
  }));

  const pendingPitches: GovernmentPitch[] = (pitchesResponse?.data ?? []).map((item: any) => ({
    id: item.id,
    trackingId: item.pitchReferenceId,
    departmentName: item.department,
    projectTitle: item.csrRequirement,
    estimatedCost: Number(item.estimatedCost ?? 0),
    status: item.status,
    submittedAt: item.submittedAt,
  }));

  // Table columns
  const enquiryColumns: Column<Enquiry>[] = [
    {
      key: "trackingId",
      header: "Tracking ID",
      render: (row) => (
        <Link 
          href={`/rm/enquiries/${row.id}`}
          className="font-medium text-primary-600 hover:text-primary-700"
        >
          {row.trackingId}
        </Link>
      ),
    },
    {
      key: "companyName",
      header: "Company",
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.companyName}</div>
          <div className="text-sm text-gray-500">{row.sector}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>
          {row.status.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "slaDue",
      header: "SLA Due",
      render: (row) => {
        const daysRemaining = getDaysRemaining(row.slaDue);
        return (
          <div>
            <div className={daysRemaining <= 2 ? "text-danger-600 font-medium" : ""}>
              {formatDate(row.slaDue)}
            </div>
            <div className={`text-xs ${daysRemaining <= 2 ? "text-danger-500" : "text-gray-400"}`}>
              {daysRemaining > 0 
                ? `${daysRemaining} days remaining` 
                : daysRemaining === 0 
                  ? "Due today" 
                  : `${Math.abs(daysRemaining)} days overdue`}
            </div>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => router.push(`/rm/enquiries/${row.id}`)}
        >
          <Eye size={14} />
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout
      userRole="CSR Relationship Manager"
      userName={userName}
      userEmail={`${userName.toLowerCase().replace(/\s/g, ".")}@mahacsr.gov.in`}
      sidebarItems={sidebarItems}
    >
      <PageHeader
        title={`Welcome, ${userName}`}
        description="CSR Relationship Manager Dashboard - Monitor enquiries, manage corporate interests, and facilitate CSR partnerships"
        breadcrumbs={[{ label: "Dashboard" }]}
        actions={
          <Button onClick={() => router.push("/rm/enquiries")}>
            View All Enquiries
          </Button>
        }
      />

      {/* Stats Grid */}
      <StatCardGroup columns={4} className="mb-8">
        <StatCard
          label="Total Enquiries"
          value={statsLoading ? "—" : stats.totalEnquiries}
          icon={Inbox}
          index={0}
        />
        <StatCard
          label="Pending Response"
          value={statsLoading ? "—" : stats.pendingResponse}
          icon={Clock}
          index={1}
        />
        <StatCard
          label="SLA Due Soon"
          value={statsLoading ? "—" : stats.slaDueSoon}
          icon={AlertTriangle}
          trend={stats.slaDueSoon > 5 ? { value: 12, positive: false } : undefined}
          index={2}
        />
        <StatCard
          label="Pending Verifications"
          value={statsLoading ? "—" : stats.pendingVerifications}
          icon={CheckCircle}
          index={3}
        />
      </StatCardGroup>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Enquiries */}
        <div className="lg:col-span-2">
          <Card className="h-full" hover={false}>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Corporate Enquiries</h3>
              <Link 
                href="/rm/enquiries"
                className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                View All
                <ChevronRight size={14} />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={recentEnquiries}
                columns={enquiryColumns}
                keyExtractor={(row) => row.id}
                loading={enquiriesLoading}
                emptyState={
                  <EmptyState
                    icon={Inbox}
                    title="No recent enquiries"
                    description="There are no recent enquiries to display."
                    action={{
                      label: "Create Enquiry",
                      onClick: () => router.push("/rm/enquiries/create")
                    }}
                  />
                }
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Content */}
        <div className="space-y-6">
          {/* Pending Pitches */}
          <Card hover={false}>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Pending Pitches</h3>
            </CardHeader>
            <CardContent className="p-0">
              {pitchesLoading ? (
                <div className="p-4 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : pendingPitches.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {pendingPitches.slice(0, 5).map((pitch) => (
                    <div 
                      key={pitch.id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-primary-600 text-sm truncate">
                            {pitch.trackingId}
                          </p>
                          <p className="text-sm text-gray-900 mt-0.5 line-clamp-1">
                            {pitch.projectTitle}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {pitch.departmentName}
                          </p>
                        </div>
                        <Badge variant="warning" size="sm">Pending</Badge>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm font-medium text-success-600">
                          ₹{(pitch.estimatedCost / 100000).toFixed(1)}L
                        </span>
                        <Link
                          href={`/rm/pitches/${pitch.id}`}
                          className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
                        >
                          Review
                          <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={CheckCircle}
                  title="No pending pitches"
                  description="All pitches have been reviewed."
                />
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card hover={false}>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="secondary" fullWidth className="justify-start gap-2">
                  <FileText size={18} />
                  Create New Enquiry
                </Button>
                <Button variant="secondary" fullWidth className="justify-start gap-2">
                  <Phone size={18} />
                  Schedule Company Call
                </Button>
                <Button variant="secondary" fullWidth className="justify-start gap-2">
                  <Mail size={18} />
                  Send Bulk Communication
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

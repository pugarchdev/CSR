// Admin Dashboard - Redesigned with New Components
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Layers,
  Users,
  ShieldCheck,
  Clock,
  Building2,
  Landmark,
  Award,
  Coins,
  Compass,
  FileText,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

// New UI Components
import { DashboardLayout } from "@/components/layout";
import { PageHeader } from "@/components/layout";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";
import { ModuleCard, ModuleCardGrid } from "@/components/ui/ModuleCard";
import { DataTable, Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";

// API
import { apiFetch } from "@/lib/api";
import { useApiQuery } from "@/lib/apiHooks";

// Types
interface AdminStats {
  totalUsers: number;
  totalOrganizations: number;
  pendingApprovals: number;
  totalProjects: number;
  activeProjects: number;
  totalFunds: number;
}

interface PendingApplication {
  id: string;
  organizationName: string;
  organizationType: string;
  submittedAt: string;
  status: string;
}

interface RecentActivity {
  id: string;
  action: string;
  entity: string;
  timestamp: string;
  user: string;
}

// Sidebar items for Admin
const sidebarItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: Layers },
  { label: "Users", href: "/admin/users-roles", icon: Users },
  { label: "Onboarding Approvals", href: "/admin/onboarding-approvals", icon: ShieldCheck, badge: 12 },
  { label: "Government Departments", href: "/admin/organizations", icon: Landmark },
  { label: "Implementing Agencies", href: "/admin/ngo-registry", icon: Building2 },
  { label: "Companies", href: "/admin/companies", icon: Building2 },
  { label: "Requirements Pending", href: "/admin/requirements/pending", icon: Clock },
  { label: "Company Interests", href: "/admin/company-interests", icon: Award },
  { label: "Agency Selection", href: "/admin/ngo-selection", icon: Award },
  { label: "Fund Monitoring", href: "/admin/fund-monitoring", icon: Coins },
  { label: "Projects", href: "/convergence-projects", icon: Compass },
  { label: "Verification Queue", href: "/admin/applications", icon: Clock, badge: 8 },
  { label: "Reports", href: "/admin/reports", icon: FileText },
  { label: "Audit Trail", href: "/admin/audit-trail", icon: FileText },
];

// Module data
const adminModules = [
  {
    title: "Onboarding Approvals",
    description: "Review and verify NGO and company onboarding applications",
    href: "/admin/onboarding-approvals",
    icon: ShieldCheck,
    status: "12 Pending",
    statusVariant: "warning" as const,
  },
  {
    title: "Verification Queue",
    description: "Process pending document verifications and risk assessments",
    href: "/admin/applications",
    icon: Clock,
    status: "8 Pending",
    statusVariant: "warning" as const,
  },
  {
    title: "Fund Monitoring",
    description: "Monitor fund disbursement and utilization across projects",
    href: "/admin/fund-monitoring",
    icon: Coins,
    status: "Active",
    statusVariant: "success" as const,
  },
  {
    title: "Agency Selection",
    description: "Manage implementing agency selection for CSR projects",
    href: "/admin/ngo-selection",
    icon: Award,
    status: "Available",
    statusVariant: "info" as const,
  },
  {
    title: "User Management",
    description: "Manage user accounts, roles and permissions",
    href: "/admin/users-roles",
    icon: Users,
    status: "Available",
    statusVariant: "info" as const,
  },
  {
    title: "Reports & Analytics",
    description: "Generate reports and view system analytics",
    href: "/admin/reports",
    icon: FileText,
    status: "Available",
    statusVariant: "info" as const,
  },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("Administrator");

  // Mock data - replace with actual API calls
  const stats: AdminStats = {
    totalUsers: 1248,
    totalOrganizations: 486,
    pendingApprovals: 12,
    totalProjects: 892,
    activeProjects: 156,
    totalFunds: 2450000000, // 245 Cr
  };

  const pendingApplications: PendingApplication[] = [
    {
      id: "1",
      organizationName: "Green Earth Foundation",
      organizationType: "NGO",
      submittedAt: "2026-07-15T10:30:00Z",
      status: "PENDING_VERIFICATION",
    },
    {
      id: "2",
      organizationName: "Tech Solutions Ltd",
      organizationType: "Company",
      submittedAt: "2026-07-14T14:20:00Z",
      status: "UNDER_REVIEW",
    },
    {
      id: "3",
      organizationName: "Education First Trust",
      organizationType: "NGO",
      submittedAt: "2026-07-13T09:15:00Z",
      status: "DOCUMENTS_PENDING",
    },
  ];

  const recentActivities: RecentActivity[] = [
    {
      id: "1",
      action: "Approved",
      entity: "Green Earth Foundation",
      timestamp: "2026-07-17T08:30:00Z",
      user: "Admin User",
    },
    {
      id: "2",
      action: "Verified Documents",
      entity: "Tech Solutions Ltd",
      timestamp: "2026-07-16T16:45:00Z",
      user: "Admin User",
    },
    {
      id: "3",
      action: "Created Project",
      entity: "School Development Initiative",
      timestamp: "2026-07-16T11:20:00Z",
      user: "Admin User",
    },
  ];

  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("user");
      if (user) {
        try {
          const userData = JSON.parse(user);
          setUserName(userData.name || "Administrator");
        } catch {
          console.error("Error parsing user data");
        }
      }
    }
  }, []);

  // Table columns
  const applicationColumns: Column<PendingApplication>[] = [
    {
      key: "organizationName",
      header: "Organization",
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.organizationName}</div>
          <div className="text-sm text-gray-500">{row.organizationType}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant="warning">
          {row.status.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "submittedAt",
      header: "Submitted",
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.submittedAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: () => (
        <Button variant="outline" size="sm">
          Review
        </Button>
      ),
    },
  ];

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString()}`;
  };

  return (
    <DashboardLayout
      userRole="Super Admin"
      userName={userName}
      userEmail={`${userName.toLowerCase().replace(/\s/g, ".")}@mahacsr.gov.in`}
      sidebarItems={sidebarItems}
      notificationCount={3}
    >
      <PageHeader
        title={`Welcome, ${userName}`}
        description="Administrative Dashboard - Manage users, organizations, and oversee portal operations"
        breadcrumbs={[{ label: "Dashboard" }]}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline">
              Export Report
            </Button>
            <Button>
              Create New
            </Button>
          </div>
        }
      />

      {/* Stats Grid */}
      <StatCardGroup columns={4} className="mb-8">
        <StatCard
          label="Total Users"
          value={stats.totalUsers}
          icon={Users}
          trend={{ value: 8, positive: true }}
          index={0}
        />
        <StatCard
          label="Organizations"
          value={stats.totalOrganizations}
          icon={Building2}
          trend={{ value: 12, positive: true }}
          index={1}
        />
        <StatCard
          label="Pending Approvals"
          value={stats.pendingApprovals}
          icon={Clock}
          trend={{ value: 3, positive: false }}
          index={2}
        />
        <StatCard
          label="Total Funds"
          value={formatCurrency(stats.totalFunds)}
          icon={Coins}
          trend={{ value: 15, positive: true }}
          index={3}
        />
      </StatCardGroup>

      {/* Modules Grid */}
      <ModuleCardGrid columns={3} className="mb-8">
        {adminModules.map((module, index) => (
          <ModuleCard
            key={module.title}
            {...module}
            index={index}
          />
        ))}
      </ModuleCardGrid>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Applications */}
        <Card hover={false}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Pending Applications</h3>
              <p className="text-sm text-slate-500 mt-1">
                Review and process pending onboarding applications
              </p>
            </div>
            <Link 
              href="/admin/onboarding-approvals"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View All
              <ChevronRight size={14} />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              data={pendingApplications}
              columns={applicationColumns}
              keyExtractor={(row) => row.id}
            />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card hover={false}>
          <CardHeader>
            <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
            <p className="text-sm text-slate-500 mt-1">
              Latest actions and updates in the portal
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100/60">
              {recentActivities.map((activity) => (
                <div 
                  key={activity.id}
                  className="p-4 flex items-start gap-3 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-50/50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                    {activity.action.includes("Approved") ? (
                      <CheckCircle2 size={16} />
                    ) : activity.action.includes("Created") ? (
                      <TrendingUp size={16} />
                    ) : (
                      <AlertCircle size={16} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900">
                      <span className="font-medium">{activity.action}</span>
                      {" "}{activity.entity}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      by {activity.user} · {new Date(activity.timestamp).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-100">
              <Link 
                href="/admin/audit-trail"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1"
              >
                View All Activity
                <ChevronRight size={14} />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

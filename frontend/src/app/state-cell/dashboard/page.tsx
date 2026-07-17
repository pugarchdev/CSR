// State CSR Cell Dashboard - Redesigned with New Components
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Layers,
  Mail,
  Compass,
  Users,
  ShieldAlert,
  HelpCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Building2
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

// Sidebar items for State CSR Cell
const sidebarItems = [
  { label: "Dashboard", href: "/state-cell/dashboard", icon: Layers },
  { label: "Corporate Enquiries", href: "/rm/enquiries", icon: Mail },
  { label: "Government Pitches", href: "/rm/government-pitches", icon: Compass },
  { label: "Grievance Queue", href: "/state-cell/grievances", icon: ShieldAlert, badge: 12 },
  { label: "Helpdesk Queue", href: "/state-cell/helpdesk", icon: HelpCircle, badge: 8 },
  { label: "Projects", href: "/convergence-projects", icon: Compass },
];

// Mock data
const stateCellModules = [
  {
    title: "Grievance Queue",
    description: "Manage and resolve stakeholder grievances",
    href: "/state-cell/grievances",
    icon: ShieldAlert,
    status: "12 Pending",
    statusVariant: "warning" as const,
  },
  {
    title: "Helpdesk Queue",
    description: "Respond to helpdesk queries and support requests",
    href: "/state-cell/helpdesk",
    icon: HelpCircle,
    status: "8 Open",
    statusVariant: "info" as const,
  },
  {
    title: "Corporate Enquiries",
    description: "Track corporate partnership enquiries",
    href: "/rm/enquiries",
    icon: Mail,
    status: "45 Active",
    statusVariant: "info" as const,
  },
  {
    title: "Government Pitches",
    description: "Manage government development pitches",
    href: "/rm/government-pitches",
    icon: Compass,
    status: "18 Pending",
    statusVariant: "warning" as const,
  },
  {
    title: "Projects",
    description: "Monitor all convergence projects",
    href: "/convergence-projects",
    icon: Layers,
    status: "156 Active",
    statusVariant: "success" as const,
  },
  {
    title: "Reports",
    description: "Generate operational reports",
    href: "/state-cell/reports",
    icon: TrendingUp,
    status: "Available",
    statusVariant: "info" as const,
  },
];

interface Grievance {
  id: string;
  grievanceId: string;
  title: string;
  submitter: string;
  type: string;
  status: string;
  priority: "high" | "medium" | "low";
  submittedAt: string;
}

export default function StateCellDashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("State CSR Cell Officer");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("user");
      if (user) {
        try {
          const userData = JSON.parse(user);
          setUserName(userData.name || "State CSR Cell Officer");
        } catch {
          console.error("Error parsing user data");
        }
      }
    }
  }, []);

  const stats = {
    pendingGrievances: 12,
    openHelpdesk: 8,
    activeEnquiries: 45,
    activeProjects: 156,
  };

  const grievances: Grievance[] = [
    {
      id: "1",
      grievanceId: "GRV-2026-00128",
      title: "Project Delay - School Construction",
      submitter: "Village Education Committee",
      type: "Implementation",
      status: "UNDER_REVIEW",
      priority: "high",
      submittedAt: "2026-07-17T08:30:00Z",
    },
    {
      id: "2",
      grievanceId: "GRV-2026-00127",
      title: "Fund Disbursement Query",
      submitter: "Implementing Agency",
      type: "Finance",
      status: "PENDING_RESPONSE",
      priority: "medium",
      submittedAt: "2026-07-16T14:20:00Z",
    },
    {
      id: "3",
      grievanceId: "GRV-2026-00126",
      title: "Quality Concerns - Health Center",
      submitter: "District Health Officer",
      type: "Quality",
      status: "UNDER_REVIEW",
      priority: "high",
      submittedAt: "2026-07-16T11:00:00Z",
    },
  ];

  const grievanceColumns: Column<Grievance>[] = [
    {
      key: "grievanceId",
      header: "ID",
      render: (row) => (
        <span className="font-medium text-primary-600 text-sm">
          {row.grievanceId}
        </span>
      ),
    },
    {
      key: "title",
      header: "Grievance",
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.title}</div>
          <div className="text-sm text-gray-500">{row.submitter}</div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) => (
        <Badge variant="info" size="sm">
          {row.type}
        </Badge>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (row) => (
        <Badge 
          variant={row.priority === "high" ? "danger" : "warning"}
          size="sm"
        >
          {row.priority}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span className="text-sm text-gray-500">
          {row.status.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: () => (
        <Button variant="outline" size="sm">
          Resolve
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout
      userRole="State CSR Cell"
      userName={userName}
      userEmail={`${userName.toLowerCase().replace(/\s/g, ".")}@mahacsr.gov.in`}
      sidebarItems={sidebarItems}
      notificationCount={12}
    >
      <PageHeader
        title={`Welcome, ${userName}`}
        description="State CSR Cell Dashboard - Coordinate CSR activities and manage grievances across Maharashtra"
        breadcrumbs={[{ label: "Dashboard" }]}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline">
              Generate Report
            </Button>
            <Button>
              Create Grievance
            </Button>
          </div>
        }
      />

      {/* Stats Grid */}
      <StatCardGroup columns={4} className="mb-8">
        <StatCard
          label="Pending Grievances"
          value={stats.pendingGrievances}
          icon={ShieldAlert}
          trend={{ value: 5, positive: false }}
          index={0}
        />
        <StatCard
          label="Helpdesk Tickets"
          value={stats.openHelpdesk}
          icon={HelpCircle}
          index={1}
        />
        <StatCard
          label="Active Enquiries"
          value={stats.activeEnquiries}
          icon={Mail}
          trend={{ value: 8, positive: true }}
          index={2}
        />
        <StatCard
          label="Active Projects"
          value={stats.activeProjects}
          icon={Layers}
          trend={{ value: 12, positive: true }}
          index={3}
        />
      </StatCardGroup>

      {/* Modules Grid */}
      <ModuleCardGrid columns={3} className="mb-8">
        {stateCellModules.map((module, index) => (
          <ModuleCard
            key={module.title}
            {...module}
            index={index}
          />
        ))}
      </ModuleCardGrid>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Grievances */}
        <Card hover={false}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Pending Grievances</h3>
              <p className="text-sm text-gray-500 mt-1">
                Grievances requiring resolution
              </p>
            </div>
            <Link href="/state-cell/grievances">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              data={grievances}
              columns={grievanceColumns}
              keyExtractor={(row) => row.id}
            />
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card hover={false}>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Performance Summary</h3>
            <p className="text-sm text-gray-500 mt-1">
              Monthly performance metrics
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg border border-success-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center text-success-600">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-success-900">Grievances Resolved</p>
                    <p className="text-sm text-success-700">24 this month</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-success-600">85%</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg border border-primary-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-primary-900">Avg Resolution Time</p>
                    <p className="text-sm text-primary-700">Target: 5 days</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-primary-600">4.2</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-warning-50 rounded-lg border border-warning-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center text-warning-600">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-warning-900">Escalated Items</p>
                    <p className="text-sm text-warning-700">To Secretary</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-warning-600">3</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

// Joint Secretary Dashboard - Redesigned with New Components
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Layers,
  Mail,
  FileText,
  Users,
  ShieldAlert,
  Compass,
  CheckCircle,
  Clock,
  ChevronRight,
  AlertTriangle,
  Building2,
  Gavel
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
import MyAssignmentsWidget from "@/components/assignments/MyAssignmentsWidget";

// Sidebar items for JS
const sidebarItems = [
  { label: "JS Dashboard", href: "/js/dashboard", icon: Layers },
  { label: "Corporate Enquiries", href: "/rm/enquiries", icon: Mail },
  { label: "Assessment Reports", href: "/js/assessments", icon: FileText },
  { label: "Pitch Approvals", href: "/js/government-pitches", icon: Gavel, badge: 5 },
  { label: "Nodal Appointments", href: "/js/nodal-appointments", icon: Users },
  { label: "RM Escalations", href: "/js/escalations", icon: ShieldAlert, badge: 3 },
  { label: "Projects", href: "/convergence-projects", icon: Compass },
];

// Mock data
const jsModules = [
  {
    title: "Pitch Approvals",
    description: "Review and approve government development pitches",
    href: "/js/government-pitches",
    icon: Gavel,
    status: "5 Pending",
    statusVariant: "warning" as const,
  },
  {
    title: "Assessment Reports",
    description: "Review feasibility assessment reports from RMs",
    href: "/js/assessments",
    icon: FileText,
    status: "12 New",
    statusVariant: "info" as const,
  },
  {
    title: "Nodal Appointments",
    description: "Manage district nodal officer appointments",
    href: "/js/nodal-appointments",
    icon: Users,
    status: "3 Pending",
    statusVariant: "warning" as const,
  },
  {
    title: "RM Escalations",
    description: "Handle escalations from Relationship Managers",
    href: "/js/escalations",
    icon: ShieldAlert,
    status: "3 Active",
    statusVariant: "danger" as const,
  },
  {
    title: "Projects",
    description: "Monitor convergence project progress",
    href: "/convergence-projects",
    icon: Compass,
    status: "Active",
    statusVariant: "success" as const,
  },
  {
    title: "Corporate Enquiries",
    description: "View all corporate partnership enquiries",
    href: "/rm/enquiries",
    icon: Mail,
    status: "28 Total",
    statusVariant: "info" as const,
  },
];

interface PendingApproval {
  id: string;
  type: string;
  title: string;
  submittedBy: string;
  submittedAt: string;
  priority: "high" | "medium" | "low";
}

export default function JSDashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("Joint Secretary");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("user");
      if (user) {
        try {
          const userData = JSON.parse(user);
          setUserName(userData.name || "Joint Secretary");
        } catch {
          console.error("Error parsing user data");
        }
      }
    }
  }, []);

  const stats = {
    pendingApprovals: 5,
    assessmentsReview: 12,
    escalations: 3,
    activeProjects: 156,
  };

  const pendingApprovals: PendingApproval[] = [
    {
      id: "1",
      type: "Government Pitch",
      title: "School Infrastructure Development - Thane District",
      submittedBy: "District Collector, Thane",
      submittedAt: "2026-07-17T08:30:00Z",
      priority: "high",
    },
    {
      id: "2",
      type: "Nodal Appointment",
      title: "Appointment of Nodal Officer - Health Department",
      submittedBy: "State CSR Cell",
      submittedAt: "2026-07-16T14:20:00Z",
      priority: "medium",
    },
    {
      id: "3",
      type: "Assessment Report",
      title: "Feasibility Report - Tech Solutions CSR Proposal",
      submittedBy: "Relationship Manager",
      submittedAt: "2026-07-16T11:00:00Z",
      priority: "high",
    },
  ];

  const approvalColumns: Column<PendingApproval>[] = [
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
      key: "title",
      header: "Title",
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.title}</div>
          <div className="text-sm text-gray-500">{row.submittedBy}</div>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (row) => (
        <Badge 
          variant={row.priority === "high" ? "danger" : row.priority === "medium" ? "warning" : "muted"}
          size="sm"
        >
          {row.priority}
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
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: () => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Review
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      userRole="Joint Secretary"
      userName={userName}
      userEmail={`${userName.toLowerCase().replace(/\s/g, ".")}@mahacsr.gov.in`}
      sidebarItems={sidebarItems}
      notificationCount={5}
    >
      <PageHeader
        title={`Welcome, ${userName}`}
        description="Joint Secretary Dashboard - Oversee CSR proposals, review assessments, and manage escalations"
        breadcrumbs={[{ label: "Dashboard" }]}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline">
              View Reports
            </Button>
            <Button>
              Review Pending
            </Button>
          </div>
        }
      />

      {/* Stats Grid */}
      <StatCardGroup columns={4} className="mb-8">
        <StatCard
          label="Pending Approvals"
          value={stats.pendingApprovals}
          icon={CheckCircle}
          trend={{ value: 20, positive: false }}
          index={0}
        />
        <StatCard
          label="Assessments to Review"
          value={stats.assessmentsReview}
          icon={FileText}
          index={1}
        />
        <StatCard
          label="Active Escalations"
          value={stats.escalations}
          icon={ShieldAlert}
          trend={{ value: 1, positive: false }}
          index={2}
        />
        <StatCard
          label="Active Projects"
          value={stats.activeProjects}
          icon={Compass}
          trend={{ value: 8, positive: true }}
          index={3}
        />
      </StatCardGroup>

      {/* Modules Grid */}
      <ModuleCardGrid columns={3} className="mb-8">
        {jsModules.map((module, index) => (
          <ModuleCard
            key={module.title}
            {...module}
            index={index}
          />
        ))}
      </ModuleCardGrid>

      {/* Assignment workflow tracking */}
      <div className="mb-8">
        <MyAssignmentsWidget title="Project Assignment Tracking" emptyMessage="No assignment activity yet." />
      </div>

      {/* Pending Approvals */}
      <Card hover={false}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
            <p className="text-sm text-gray-500 mt-1">
              Items requiring your review and approval
            </p>
          </div>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={pendingApprovals}
            columns={approvalColumns}
            keyExtractor={(row) => row.id}
          />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

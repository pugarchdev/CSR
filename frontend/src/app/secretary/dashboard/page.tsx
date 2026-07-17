// Planning Secretary Dashboard - Redesigned with New Components
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Layers,
  ShieldAlert,
  Gavel,
  FileText,
  Users,
  Mail,
  Compass,
  CheckCircle,
  AlertTriangle,
  ChevronRight
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

// Sidebar items for Planning Secretary
const sidebarItems = [
  { label: "Dashboard", href: "/secretary/dashboard", icon: Layers },
  { label: "Escalations", href: "/secretary/escalations", icon: ShieldAlert, badge: 4 },
  { label: "Final Decisions", href: "/secretary/decisions", icon: Gavel, badge: 7 },
  { label: "JS Dashboard", href: "/js/dashboard", icon: Layers },
  { label: "Assessments", href: "/js/assessments", icon: FileText },
  { label: "Grievance Review", href: "/state-cell/grievances", icon: Users },
];

// Mock data
const secretaryModules = [
  {
    title: "Escalations",
    description: "Review escalated items from Joint Secretary",
    href: "/secretary/escalations",
    icon: ShieldAlert,
    status: "4 Pending",
    statusVariant: "danger" as const,
  },
  {
    title: "Final Decisions",
    description: "Make final decisions on contested proposals",
    href: "/secretary/decisions",
    icon: Gavel,
    status: "7 Pending",
    statusVariant: "warning" as const,
  },
  {
    title: "Grievance Review",
    description: "Final review of escalated grievances",
    href: "/state-cell/grievances",
    icon: Users,
    status: "2 Critical",
    statusVariant: "danger" as const,
  },
  {
    title: "JS Assessments",
    description: "View all assessments pending JS approval",
    href: "/js/assessments",
    icon: FileText,
    status: "12 Pending",
    statusVariant: "info" as const,
  },
  {
    title: "Projects Overview",
    description: "High-level view of all active projects",
    href: "/convergence-projects",
    icon: Compass,
    status: "156 Active",
    statusVariant: "success" as const,
  },
  {
    title: "Reports",
    description: "Generate executive reports",
    href: "/secretary/reports",
    icon: FileText,
    status: "Available",
    statusVariant: "info" as const,
  },
];

interface EscalationItem {
  id: string;
  type: string;
  title: string;
  escalatedFrom: string;
  reason: string;
  priority: "critical" | "high" | "medium";
}

export default function SecretaryDashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("Planning Secretary");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("user");
      if (user) {
        try {
          const userData = JSON.parse(user);
          setUserName(userData.name || "Planning Secretary");
        } catch {
          console.error("Error parsing user data");
        }
      }
    }
  }, []);

  const stats = {
    escalations: 4,
    pendingDecisions: 7,
    criticalGrievances: 2,
    activeProjects: 156,
  };

  const escalations: EscalationItem[] = [
    {
      id: "1",
      type: "Project Approval",
      title: "Disputed Infrastructure Project - Pune District",
      escalatedFrom: "Joint Secretary",
      reason: "Budget exceeds district allocation",
      priority: "critical",
    },
    {
      id: "2",
      type: "Grievance",
      title: "Implementation Delay - Education Project",
      escalatedFrom: "State CSR Cell",
      reason: "Contractor performance issues",
      priority: "high",
    },
    {
      id: "3",
      type: "Policy Exception",
      title: "CSR Fund Utilization Exception Request",
      escalatedFrom: "Joint Secretary",
      reason: "Emergency relief requirements",
      priority: "high",
    },
  ];

  const escalationColumns: Column<EscalationItem>[] = [
    {
      key: "type",
      header: "Type",
      render: (row) => (
        <Badge variant="danger" size="sm">
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
          <div className="text-sm text-gray-500">{row.reason}</div>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (row) => (
        <Badge 
          variant={row.priority === "critical" ? "danger" : "warning"}
          size="sm"
        >
          {row.priority}
        </Badge>
      ),
    },
    {
      key: "escalatedFrom",
      header: "Escalated From",
      render: (row) => (
        <span className="text-sm text-gray-500">{row.escalatedFrom}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: () => (
        <Button variant="primary" size="sm">
          Review
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout
      userRole="Planning Secretary"
      userName={userName}
      userEmail={`${userName.toLowerCase().replace(/\s/g, ".")}@mahacsr.gov.in`}
      sidebarItems={sidebarItems}
      notificationCount={8}
    >
      <PageHeader
        title={`Welcome, ${userName}`}
        description="Planning Secretary Dashboard - Final decision authority for escalations and contested matters"
        breadcrumbs={[{ label: "Dashboard" }]}
        actions={
          <Button variant="outline">
            Executive Report
          </Button>
        }
      />

      {/* Stats Grid */}
      <StatCardGroup columns={4} className="mb-8">
        <StatCard
          label="Active Escalations"
          value={stats.escalations}
          icon={ShieldAlert}
          trend={{ value: 1, positive: false }}
          index={0}
        />
        <StatCard
          label="Pending Decisions"
          value={stats.pendingDecisions}
          icon={Gavel}
          index={1}
        />
        <StatCard
          label="Critical Grievances"
          value={stats.criticalGrievances}
          icon={AlertTriangle}
          trend={{ value: 1, positive: false }}
          index={2}
        />
        <StatCard
          label="Active Projects"
          value={stats.activeProjects}
          icon={Compass}
          index={3}
        />
      </StatCardGroup>

      {/* Priority Alert */}
      <Card className="mb-8 border-danger-200 bg-danger-50" hover={false}>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-danger-100 rounded-lg flex items-center justify-center text-danger-600">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-danger-900">Critical Items Requiring Attention</h3>
              <p className="text-sm text-danger-700">
                You have {stats.escalations} escalations and {stats.criticalGrievances} critical grievances pending your review.
              </p>
            </div>
            <Button variant="danger" className="ml-auto">
              Review Critical Items
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modules Grid */}
      <ModuleCardGrid columns={3} className="mb-8">
        {secretaryModules.map((module, index) => (
          <ModuleCard
            key={module.title}
            {...module}
            index={index}
          />
        ))}
      </ModuleCardGrid>

      {/* Escalations Table */}
      <Card hover={false}>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Recent Escalations</h3>
          <p className="text-sm text-gray-500 mt-1">
            Items escalated for your final decision
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={escalations}
            columns={escalationColumns}
            keyExtractor={(row) => row.id}
          />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

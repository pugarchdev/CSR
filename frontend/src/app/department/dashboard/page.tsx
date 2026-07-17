// Department Dashboard - Redesigned with New Components
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Layers,
  Landmark,
  Clock,
  Sparkles,
  Compass,
  ShieldCheck,
  BarChart2,
  Users,
  ShieldAlert,
  FileText,
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

// Sidebar items for Department
const sidebarItems = [
  { label: "Dashboard", href: "/department/dashboard", icon: Layers },
  { label: "Organization Onboarding", href: "/organization/onboarding", icon: Landmark },
  { label: "Onboarding Status", href: "/organization/onboarding/status", icon: Clock },
  { label: "Create Pitch", href: "/department/pitches/create", icon: Sparkles },
  { label: "My Pitches", href: "/department/pitches", icon: Compass },
  { label: "Company Interest", href: "/department/interests", icon: Compass },
  { label: "Projects", href: "/convergence-projects", icon: ShieldCheck },
  { label: "Asset Handover", href: "/department/handover", icon: Layers },
  { label: "Reports", href: "/department/reports", icon: BarChart2 },
  { label: "Users", href: "/organization/users", icon: Users },
  { label: "Roles", href: "/organization/roles", icon: ShieldAlert },
];

// Mock data
const departmentModules = [
  {
    title: "Create Pitch",
    description: "Submit a new development need pitch for CSR funding",
    href: "/department/pitches/create",
    icon: Sparkles,
    status: "Create New",
    statusVariant: "primary" as const,
  },
  {
    title: "My Pitches",
    description: "View and track your submitted development pitches",
    href: "/department/pitches",
    icon: Compass,
    status: "8 Active",
    statusVariant: "info" as const,
  },
  {
    title: "Company Interests",
    description: "View corporate interest in your requirements",
    href: "/department/interests",
    icon: Building2,
    status: "3 New",
    statusVariant: "success" as const,
  },
  {
    title: "Projects",
    description: "Track your department's CSR projects",
    href: "/convergence-projects",
    icon: ShieldCheck,
    status: "5 Active",
    statusVariant: "success" as const,
  },
  {
    title: "Asset Handover",
    description: "Manage asset handover to government",
    href: "/department/handover",
    icon: Layers,
    status: "2 Pending",
    statusVariant: "warning" as const,
  },
  {
    title: "Reports",
    description: "Generate department reports",
    href: "/department/reports",
    icon: BarChart2,
    status: "Available",
    statusVariant: "info" as const,
  },
];

interface Pitch {
  id: string;
  pitchId: string;
  title: string;
  sector: string;
  estimatedCost: number;
  status: string;
  submittedAt: string;
}

export default function DepartmentDashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("Department Officer");
  const [departmentName, setDepartmentName] = useState<string>("Education Department");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("user");
      if (user) {
        try {
          const userData = JSON.parse(user);
          setUserName(userData.name || "Department Officer");
          setDepartmentName(userData.department || "Education Department");
        } catch {
          console.error("Error parsing user data");
        }
      }
    }
  }, []);

  const stats = {
    totalPitches: 8,
    approvedPitches: 3,
    activeProjects: 5,
    companyInterests: 3,
  };

  const pitches: Pitch[] = [
    {
      id: "1",
      pitchId: "PIT-2026-0042",
      title: "School Infrastructure Development",
      sector: "Education",
      estimatedCost: 2500000,
      status: "APPROVED",
      submittedAt: "2026-07-10T08:30:00Z",
    },
    {
      id: "2",
      pitchId: "PIT-2026-0041",
      title: "Digital Classroom Setup",
      sector: "Education",
      estimatedCost: 1500000,
      status: "UNDER_REVIEW",
      submittedAt: "2026-07-08T14:20:00Z",
    },
    {
      id: "3",
      pitchId: "PIT-2026-0038",
      title: "Teacher Training Program",
      sector: "Education",
      estimatedCost: 800000,
      status: "CORPORATE_INTEREST",
      submittedAt: "2026-07-05T11:00:00Z",
    },
  ];

  const pitchColumns: Column<Pitch>[] = [
    {
      key: "pitchId",
      header: "Pitch ID",
      render: (row) => (
        <span className="font-medium text-primary-600 text-sm">
          {row.pitchId}
        </span>
      ),
    },
    {
      key: "title",
      header: "Development Need",
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.title}</div>
          <div className="text-sm text-gray-500">{row.sector}</div>
        </div>
      ),
    },
    {
      key: "estimatedCost",
      header: "Est. Cost",
      align: "right",
      render: (row) => (
        <span className="font-medium text-gray-900">
          ₹{(row.estimatedCost / 100000).toFixed(1)}L
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const statusColors: Record<string, string> = {
          APPROVED: "success",
          UNDER_REVIEW: "warning",
          CORPORATE_INTEREST: "primary",
          PENDING: "muted",
        };
        return (
          <Badge variant={statusColors[row.status] as any || "muted"} size="sm">
            {row.status.replace(/_/g, " ")}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: () => (
        <Button variant="outline" size="sm">
          View
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout
      userRole="Department Officer"
      userName={userName}
      userEmail={`${userName.toLowerCase().replace(/\s/g, ".")}@mahacsr.gov.in`}
      sidebarItems={sidebarItems}
    >
      <PageHeader
        title={`${departmentName}`}
        description="Department Dashboard - Manage development needs, track pitches, and monitor projects"
        breadcrumbs={[{ label: "Dashboard" }]}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline">
              View Reports
            </Button>
            <Button onClick={() => router.push("/department/pitches/create")}>
              Create Pitch
            </Button>
          </div>
        }
      />

      {/* Stats Grid */}
      <StatCardGroup columns={4} className="mb-8">
        <StatCard
          label="Total Pitches"
          value={stats.totalPitches}
          icon={Compass}
          index={0}
        />
        <StatCard
          label="Approved"
          value={stats.approvedPitches}
          icon={ShieldCheck}
          trend={{ value: 25, positive: true }}
          index={1}
        />
        <StatCard
          label="Active Projects"
          value={stats.activeProjects}
          icon={Layers}
          index={2}
        />
        <StatCard
          label="Company Interests"
          value={stats.companyInterests}
          icon={Building2}
          trend={{ value: 1, positive: true }}
          index={3}
        />
      </StatCardGroup>

      {/* Modules Grid */}
      <ModuleCardGrid columns={3} className="mb-8">
        {departmentModules.map((module, index) => (
          <ModuleCard
            key={module.title}
            {...module}
            index={index}
          />
        ))}
      </ModuleCardGrid>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Pitches */}
        <Card hover={false}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">My Pitches</h3>
              <p className="text-sm text-gray-500 mt-1">
                Your submitted development needs
              </p>
            </div>
            <Link href="/department/pitches">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              data={pitches}
              columns={pitchColumns}
              keyExtractor={(row) => row.id}
            />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card hover={false}>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            <p className="text-sm text-gray-500 mt-1">
              Common department tasks
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button 
                variant="secondary" 
                fullWidth 
                className="justify-start gap-2"
                onClick={() => router.push("/department/pitches/create")}
              >
                <Sparkles size={18} />
                Create New Pitch
              </Button>
              <Button 
                variant="secondary" 
                fullWidth 
                className="justify-start gap-2"
                onClick={() => router.push("/organization/onboarding")}
              >
                <Landmark size={18} />
                Organization Onboarding
              </Button>
              <Button 
                variant="secondary" 
                fullWidth 
                className="justify-start gap-2"
                onClick={() => router.push("/department/handover")}
              >
                <Layers size={18} />
                Asset Handover
              </Button>
              <Button 
                variant="secondary" 
                fullWidth 
                className="justify-start gap-2"
                onClick={() => router.push("/department/reports")}
              >
                <BarChart2 size={18} />
                Generate Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

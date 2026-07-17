// NGO Dashboard - Redesigned with New Components
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Layers,
  Landmark,
  Clock,
  BookOpen,
  Mail,
  Compass,
  Coins,
  ShieldCheck,
  Award,
  BarChart2,
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

// Sidebar items for NGO
const sidebarItems = [
  { label: "Dashboard", href: "/ngo/dashboard", icon: Layers },
  { label: "Organization Onboarding", href: "/organization/onboarding", icon: Landmark },
  { label: "Onboarding Status", href: "/organization/onboarding/status", icon: Clock },
  { label: "Documents", href: "/organization/onboarding/documents", icon: FileText },
  { label: "Queries", href: "/queries", icon: Mail },
  { label: "Proposal Requests", href: "/ngo/proposal-requests", icon: Compass },
  { label: "Assigned Projects", href: "/ngo/assigned-projects", icon: ShieldCheck },
  { label: "Milestones", href: "/ngo/milestones", icon: Award },
  { label: "Fund Releases", href: "/ngo/funds", icon: Coins },
  { label: "Reports", href: "/ngo/reports", icon: BarChart2 },
];

// Mock data
const ngoModules = [
  {
    title: "Onboarding",
    description: "Complete your organization verification",
    href: "/organization/onboarding",
    icon: Landmark,
    status: "In Progress",
    statusVariant: "warning" as const,
  },
  {
    title: "Documents",
    description: "Upload and manage verification documents",
    href: "/organization/onboarding/documents",
    icon: FileText,
    status: "3 Pending",
    statusVariant: "warning" as const,
  },
  {
    title: "Proposal Requests",
    description: "View CSR project proposals from companies",
    href: "/ngo/proposal-requests",
    icon: Compass,
    status: "2 New",
    statusVariant: "success" as const,
  },
  {
    title: "Assigned Projects",
    description: "Projects assigned to your organization",
    href: "/ngo/assigned-projects",
    icon: ShieldCheck,
    status: "3 Active",
    statusVariant: "success" as const,
  },
  {
    title: "Milestones",
    description: "Track project milestones and updates",
    href: "/ngo/milestones",
    icon: Award,
    status: "2 Due",
    statusVariant: "warning" as const,
  },
  {
    title: "Fund Releases",
    description: "Monitor fund disbursement status",
    href: "/ngo/funds",
    icon: Coins,
    status: "₹15L",
    statusVariant: "success" as const,
  },
];

interface Project {
  id: string;
  projectName: string;
  company: string;
  sector: string;
  budget: number;
  status: string;
  progress: number;
  nextMilestone: string;
}

export default function NGODashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("NGO Representative");
  const [ngoName, setNgoName] = useState<string>("Green Earth Foundation");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("user");
      if (user) {
        try {
          const userData = JSON.parse(user);
          setUserName(userData.name || "NGO Representative");
          setNgoName(userData.organization?.name || "Green Earth Foundation");
        } catch {
          console.error("Error parsing user data");
        }
      }
    }
  }, []);

  const stats = {
    totalProjects: 3,
    activeProjects: 3,
    completedMilestones: 12,
    totalFundsReceived: 1500000, // 15 L
    pendingDocuments: 3,
  };

  const projects: Project[] = [
    {
      id: "1",
      projectName: "School Infrastructure Development",
      company: "Tech Solutions Ltd",
      sector: "Education",
      budget: 5000000,
      status: "IN_PROGRESS",
      progress: 65,
      nextMilestone: "2026-08-15",
    },
    {
      id: "2",
      projectName: "Tree Plantation Drive",
      company: "Green Energy Corp",
      sector: "Environment",
      budget: 2500000,
      status: "IN_PROGRESS",
      progress: 40,
      nextMilestone: "2026-08-30",
    },
    {
      id: "3",
      projectName: "Women Skill Training",
      company: "Finance First Ltd",
      sector: "Livelihood",
      budget: 3000000,
      status: "IN_PROGRESS",
      progress: 80,
      nextMilestone: "2026-07-25",
    },
  ];

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)} L`;
    }
    return `₹${amount.toLocaleString()}`;
  };

  const projectColumns: Column<Project>[] = [
    {
      key: "projectName",
      header: "Project",
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.projectName}</div>
          <div className="text-sm text-gray-500">{row.company}</div>
        </div>
      ),
    },
    {
      key: "sector",
      header: "Sector",
      render: (row) => (
        <Badge variant="info" size="sm">
          {row.sector}
        </Badge>
      ),
    },
    {
      key: "progress",
      header: "Progress",
      render: (row) => (
        <div className="w-full max-w-[120px]">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">{row.progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary-500 rounded-full"
              style={{ width: `${row.progress}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: "nextMilestone",
      header: "Next Milestone",
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.nextMilestone).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          })}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant="info" size="sm">
          {row.status.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: () => (
        <Button variant="outline" size="sm">
          Update
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout
      userRole="Implementing Agency"
      userName={userName}
      userEmail={`${userName.toLowerCase().replace(/\s/g, ".")}@ngo.org`}
      sidebarItems={sidebarItems}
    >
      <PageHeader
        title={`${ngoName}`}
        description="NGO Dashboard - Manage projects, track milestones, and monitor fund utilization"
        breadcrumbs={[{ label: "Dashboard" }]}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline">
              Download Certificate
            </Button>
            <Button onClick={() => router.push("/ngo/milestones")}>
              Update Milestones
            </Button>
          </div>
        }
      />

      {/* Onboarding Alert (if pending) */}
      {stats.pendingDocuments > 0 && (
        <Card className="mb-8 border-warning-200 bg-warning-50" hover={false}>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center text-warning-600">
                <AlertCircle size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-warning-900">Onboarding in Progress</h3>
                <p className="text-sm text-warning-700">
                  You have {stats.pendingDocuments} pending documents to upload. Complete your onboarding to access all features.
                </p>
              </div>
              <Button variant="warning">
                Complete Onboarding
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <StatCardGroup columns={4} className="mb-8">
        <StatCard
          label="Total Projects"
          value={stats.totalProjects}
          icon={Layers}
          index={0}
        />
        <StatCard
          label="Active Projects"
          value={stats.activeProjects}
          icon={Compass}
          trend={{ value: 1, positive: true }}
          index={1}
        />
        <StatCard
          label="Milestones Done"
          value={stats.completedMilestones}
          icon={CheckCircle2}
          trend={{ value: 3, positive: true }}
          index={2}
        />
        <StatCard
          label="Funds Received"
          value={formatCurrency(stats.totalFundsReceived)}
          icon={Coins}
          trend={{ value: 8, positive: true }}
          index={3}
        />
      </StatCardGroup>

      {/* Modules Grid */}
      <ModuleCardGrid columns={3} className="mb-8">
        {ngoModules.map((module, index) => (
          <ModuleCard
            key={module.title}
            {...module}
            index={index}
          />
        ))}
      </ModuleCardGrid>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Projects */}
        <Card hover={false}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Assigned Projects</h3>
              <p className="text-sm text-gray-500 mt-1">
                Projects assigned to your organization
              </p>
            </div>
            <Link href="/ngo/assigned-projects">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              data={projects}
              columns={projectColumns}
              keyExtractor={(row) => row.id}
            />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card hover={false}>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            <p className="text-sm text-gray-500 mt-1">
              Common tasks for your organization
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button 
                variant="secondary" 
                fullWidth 
                className="justify-start gap-2"
                onClick={() => router.push("/ngo/milestones")}
              >
                <Award size={18} />
                Update Milestones
              </Button>
              <Button 
                variant="secondary" 
                fullWidth 
                className="justify-start gap-2"
                onClick={() => router.push("/ngo/funds")}
              >
                <Coins size={18} />
                View Fund Status
              </Button>
              <Button 
                variant="secondary" 
                fullWidth 
                className="justify-start gap-2"
                onClick={() => router.push("/organization/onboarding/documents")}
              >
                <FileText size={18} />
                Upload Documents
              </Button>
              <Button 
                variant="secondary" 
                fullWidth 
                className="justify-start gap-2"
                onClick={() => router.push("/ngo/reports")}
              >
                <BarChart2 size={18} />
                Submit Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

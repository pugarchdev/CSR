// Company Dashboard - Redesigned with New Components
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Layers,
  Mail,
  Clock,
  Compass,
  Sparkles,
  ShieldCheck,
  Landmark,
  Coins,
  BarChart2,
  Users,
  Building2,
  ChevronRight,
  TrendingUp,
  Award,
  ArrowUpRight
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

// Sidebar items for Company
const sidebarItems = [
  { label: "Dashboard", href: "/company/dashboard", icon: Layers },
  { label: "My Enquiries", href: "/partner/enquiries", icon: Mail },
  { label: "Track Status", href: "/track", icon: Clock },
  { label: "Organization Onboarding", href: "/organization/onboarding", icon: Landmark },
  { label: "Project Marketplace", href: "/company/marketplace", icon: Compass },
  { label: "My Interests", href: "/company/interests", icon: Sparkles },
  { label: "Funded Projects", href: "/convergence-projects", icon: ShieldCheck },
  { label: "Fund Releases", href: "/company/funds", icon: Coins },
  { label: "Reports", href: "/company/reports", icon: BarChart2 },
  { label: "Implementing Agencies", href: "/partner/agencies", icon: Building2 },
  { label: "Users", href: "/organization/users", icon: Users },
];

// Mock data
const companyModules = [
  {
    title: "Project Marketplace",
    description: "Browse and explore CSR project opportunities",
    href: "/company/marketplace",
    icon: Compass,
    status: "18 Available",
    statusVariant: "primary" as const,
  },
  {
    title: "My Enquiries",
    description: "Track your partnership enquiries",
    href: "/partner/enquiries",
    icon: Mail,
    status: "3 Active",
    statusVariant: "info" as const,
  },
  {
    title: "My Interests",
    description: "Projects you've expressed interest in",
    href: "/company/interests",
    icon: Sparkles,
    status: "2 Pending",
    statusVariant: "warning" as const,
  },
  {
    title: "Funded Projects",
    description: "Your active CSR projects",
    href: "/convergence-projects",
    icon: ShieldCheck,
    status: "5 Active",
    statusVariant: "success" as const,
  },
  {
    title: "Fund Releases",
    description: "Track fund disbursement status",
    href: "/company/funds",
    icon: Coins,
    status: "₹2.5 Cr",
    statusVariant: "success" as const,
  },
  {
    title: "Partner NGOs",
    description: "Your implementing agency partners",
    href: "/partner/agencies",
    icon: Building2,
    status: "3 Partners",
    statusVariant: "info" as const,
  },
];

interface Project {
  id: string;
  projectName: string;
  location: string;
  sector: string;
  budget: number;
  spent: number;
  status: string;
  progress: number;
}

export default function CompanyDashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("Company Representative");
  const [companyName, setCompanyName] = useState<string>("Tech Solutions Ltd");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("user");
      if (user) {
        try {
          const userData = JSON.parse(user);
          setUserName(userData.name || "Company Representative");
          setCompanyName(userData.organization?.name || "Tech Solutions Ltd");
        } catch {
          console.error("Error parsing user data");
        }
      }
    }
  }, []);

  const stats = {
    totalProjects: 5,
    activeProjects: 3,
    completedProjects: 2,
    totalInvestment: 125000000, // 12.5 Cr
    budgetUtilized: 78,
  };

  const projects: Project[] = [
    {
      id: "1",
      projectName: "School Infrastructure Development",
      location: "Thane District",
      sector: "Education",
      budget: 5000000,
      spent: 3200000,
      status: "IN_PROGRESS",
      progress: 64,
    },
    {
      id: "2",
      projectName: "Digital Health Centers",
      location: "Pune District",
      sector: "Health",
      budget: 8000000,
      spent: 2400000,
      status: "IN_PROGRESS",
      progress: 30,
    },
    {
      id: "3",
      projectName: "Women Empowerment Program",
      location: "Nashik District",
      sector: "Livelihood",
      budget: 3500000,
      spent: 3500000,
      status: "COMPLETED",
      progress: 100,
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
          <div className="text-sm text-gray-500">{row.location}</div>
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
              className={`h-full rounded-full ${
                row.progress === 100 ? "bg-success-500" : "bg-primary-500"
              }`}
              style={{ width: `${row.progress}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: "budget",
      header: "Budget",
      align: "right",
      render: (row) => (
        <div className="text-right">
          <div className="font-medium text-gray-900">
            {formatCurrency(row.budget)}
          </div>
          <div className="text-xs text-gray-500">
            {formatCurrency(row.spent)} spent
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge 
          variant={row.status === "COMPLETED" ? "success" : "info"}
          size="sm"
        >
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
          <ArrowUpRight size={14} />
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout
      userRole="Corporate Partner"
      userName={userName}
      userEmail={`${userName.toLowerCase().replace(/\s/g, ".")}@company.com`}
      sidebarItems={sidebarItems}
    >
      <PageHeader
        title={`${companyName}`}
        description="Company Dashboard - Manage your CSR initiatives, track projects, and monitor fund utilization"
        breadcrumbs={[{ label: "Dashboard" }]}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline">
              Download Report
            </Button>
            <Button onClick={() => router.push("/company/marketplace")}>
              Browse Marketplace
            </Button>
          </div>
        }
      />

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
          trend={{ value: 2, positive: true }}
          index={1}
        />
        <StatCard
          label="Completed"
          value={stats.completedProjects}
          icon={ShieldCheck}
          trend={{ value: 1, positive: true }}
          index={2}
        />
        <StatCard
          label="Total CSR Investment"
          value={formatCurrency(stats.totalInvestment)}
          icon={Coins}
          trend={{ value: 15, positive: true }}
          index={3}
        />
      </StatCardGroup>

      {/* Budget Utilization Card */}
      <Card className="mb-8" hover={false}>
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Budget Utilization</h3>
              <p className="text-sm text-gray-500 mt-1">
                {stats.budgetUtilized}% of total CSR budget utilized this year
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.totalInvestment * stats.budgetUtilized / 100)}
                </p>
                <p className="text-sm text-gray-500">Utilized</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-400">
                  {formatCurrency(stats.totalInvestment * (100 - stats.budgetUtilized) / 100)}
                </p>
                <p className="text-sm text-gray-500">Remaining</p>
              </div>
            </div>
          </div>
          <div className="mt-4 h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary-500 to-success-500 rounded-full" 
              style={{ width: `${stats.budgetUtilized}%` }} 
            />
          </div>
        </CardContent>
      </Card>

      {/* Modules Grid */}
      <ModuleCardGrid columns={3} className="mb-8">
        {companyModules.map((module, index) => (
          <ModuleCard
            key={module.title}
            {...module}
            index={index}
          />
        ))}
      </ModuleCardGrid>

      {/* Active Projects */}
      <Card hover={false}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Active Projects</h3>
            <p className="text-sm text-gray-500 mt-1">
              Your ongoing CSR projects
            </p>
          </div>
          <Link href="/convergence-projects">
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
    </DashboardLayout>
  );
}

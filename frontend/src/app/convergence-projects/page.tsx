// Convergence Projects List Page
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Layers,
  Search,
  Filter,
  Eye,
  Plus,
  Download,
  MapPin,
  Building2,
  Calendar,
  ChevronRight,
  ArrowUpRight
} from "lucide-react";

// New UI Components
import { DashboardLayout } from "@/components/layout";
import { PageHeader } from "@/components/layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable, Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar, ResultsSummary, QuickFilterChips } from "@/components/ui/FilterBar";

// Sidebar items (shared)
const sidebarItems = [
  { label: "Projects", href: "/convergence-projects", icon: Layers },
];

interface Project {
  id: string;
  projectId: string;
  title: string;
  company: string;
  implementingAgency: string;
  department: string;
  district: string;
  sector: string;
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
  status: string;
  progress: number;
}

const statusOptions = [
  { label: "All", value: "", count: 156 },
  { label: "Not Started", value: "NOT_STARTED", count: 12 },
  { label: "In Progress", value: "IN_PROGRESS", count: 89 },
  { label: "Completed", value: "COMPLETED", count: 45 },
  { label: "On Hold", value: "ON_HOLD", count: 10 },
];

const sectorOptions = [
  { value: "", label: "All Sectors" },
  { value: "Education", label: "Education" },
  { value: "Health", label: "Health" },
  { value: "Environment", label: "Environment" },
  { value: "Livelihood", label: "Livelihood" },
  { value: "Rural Development", label: "Rural Development" },
  { value: "Infrastructure", label: "Infrastructure" },
];

const districtOptions = [
  { value: "", label: "All Districts" },
  { value: "Mumbai", label: "Mumbai" },
  { value: "Pune", label: "Pune" },
  { value: "Thane", label: "Thane" },
  { value: "Nashik", label: "Nashik" },
  { value: "Nagpur", label: "Nagpur" },
];

const getStatusVariant = (status: string) => {
  const map: Record<string, "primary" | "success" | "warning" | "danger" | "info" | "muted"> = {
    NOT_STARTED: "muted",
    IN_PROGRESS: "info",
    COMPLETED: "success",
    ON_HOLD: "warning",
    DELAYED: "danger",
  };
  return map[status] || "muted";
};

export default function ProjectsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [page, setPage] = useState(1);

  const projects: Project[] = [
    {
      id: "1",
      projectId: "PRJ-2026-0045",
      title: "Digital Classroom Infrastructure",
      company: "Tech Solutions Ltd",
      implementingAgency: "Education First Trust",
      department: "Education Department",
      district: "Thane",
      sector: "Education",
      budget: 5000000,
      spent: 3200000,
      startDate: "2026-01-15",
      endDate: "2026-12-31",
      status: "IN_PROGRESS",
      progress: 65,
    },
    {
      id: "2",
      projectId: "PRJ-2026-0044",
      title: "Primary Health Center Renovation",
      company: "Healthcare Plus",
      implementingAgency: "Health Serve Foundation",
      department: "Health Department",
      district: "Pune",
      sector: "Health",
      budget: 8000000,
      spent: 6800000,
      startDate: "2025-06-01",
      endDate: "2026-06-30",
      status: "IN_PROGRESS",
      progress: 85,
    },
    {
      id: "3",
      projectId: "PRJ-2026-0043",
      title: "Tree Plantation Drive Phase 2",
      company: "Green Energy Corp",
      implementingAgency: "Green Earth Foundation",
      department: "Environment Department",
      district: "Nashik",
      sector: "Environment",
      budget: 2500000,
      spent: 2500000,
      startDate: "2025-07-01",
      endDate: "2026-06-30",
      status: "COMPLETED",
      progress: 100,
    },
    {
      id: "4",
      projectId: "PRJ-2026-0042",
      title: "Women Skill Training Center",
      company: "Finance First Ltd",
      implementingAgency: "Rural Development Trust",
      department: "Rural Development",
      district: "Aurangabad",
      sector: "Livelihood",
      budget: 3500000,
      spent: 800000,
      startDate: "2026-04-01",
      endDate: "2026-12-31",
      status: "IN_PROGRESS",
      progress: 25,
    },
    {
      id: "5",
      projectId: "PRJ-2026-0041",
      title: "Road Infrastructure Improvement",
      company: "Infrastructure Developers Ltd",
      implementingAgency: "Build Right NGO",
      department: "PWD",
      district: "Nagpur",
      sector: "Infrastructure",
      budget: 15000000,
      spent: 0,
      startDate: "2026-08-01",
      endDate: "2027-03-31",
      status: "NOT_STARTED",
      progress: 0,
    },
  ];

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = 
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.projectId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.implementingAgency.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter ? project.status === statusFilter : true;
    const matchesSector = sectorFilter ? project.sector === sectorFilter : true;
    const matchesDistrict = districtFilter ? project.district === districtFilter : true;
    
    return matchesSearch && matchesStatus && matchesSector && matchesDistrict;
  });

  const handleReset = () => {
    setSearchQuery("");
    setStatusFilter("");
    setSectorFilter("");
    setDistrictFilter("");
  };

  const columns: Column<Project>[] = [
    {
      key: "projectId",
      header: "Project ID",
      render: (row) => (
        <Link 
          href={`/convergence-projects/${row.id}`}
          className="font-medium text-primary-600 hover:text-primary-700"
        >
          {row.projectId}
        </Link>
      ),
    },
    {
      key: "title",
      header: "Project",
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.title}</div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
            <Building2 size={12} />
            {row.company}
          </div>
        </div>
      ),
    },
    {
      key: "implementingAgency",
      header: "Implementing Agency",
      render: (row) => (
        <span className="text-sm text-gray-600">{row.implementingAgency}</span>
      ),
    },
    {
      key: "district",
      header: "Location",
      render: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <MapPin size={12} />
          {row.district}
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
        <div className="w-full max-w-[100px]">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">{row.progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${
                row.progress === 100 ? "bg-success-500" : 
                row.progress > 50 ? "bg-primary-500" : "bg-warning-500"
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
            ₹{(row.budget / 100000).toFixed(1)}L
          </div>
          <div className="text-xs text-gray-500">
            {((row.spent / row.budget) * 100).toFixed(0)}% spent
          </div>
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
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/convergence-projects/${row.id}`)}
        >
          <Eye size={14} className="mr-1" />
          View
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout
      userRole="User"
      userName="User"
      userEmail="user@example.com"
      sidebarItems={sidebarItems}
    >
      <PageHeader
        title="Convergence Projects"
        description="Track and manage CSR convergence projects across Maharashtra"
        breadcrumbs={[{ label: "Projects" }]}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Download size={16} className="mr-2" />
              Export
            </Button>
            <Button>
              <Plus size={16} className="mr-2" />
              New Project
            </Button>
          </div>
        }
      />

      {/* Quick Filter Chips */}
      <QuickFilterChips
        options={statusOptions}
        selected={statusFilter}
        onChange={setStatusFilter}
        className="mb-4"
      />

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by project name, ID, company or agency..."
        filters={[
          {
            key: "sector",
            label: "Sector",
            value: sectorFilter,
            options: sectorOptions,
            onChange: setSectorFilter,
          },
          {
            key: "district",
            label: "District",
            value: districtFilter,
            options: districtOptions,
            onChange: setDistrictFilter,
          },
        ]}
        onReset={handleReset}
        className="mb-4"
      />

      {/* Results Summary */}
      <ResultsSummary
        total={projects.length}
        filtered={filteredProjects.length}
        label="projects"
        badges={[
          { label: "Active", count: projects.filter(p => p.status === "IN_PROGRESS").length, variant: "info" },
          { label: "Completed", count: projects.filter(p => p.status === "COMPLETED").length, variant: "success" },
          { label: "Not Started", count: projects.filter(p => p.status === "NOT_STARTED").length, variant: "muted" },
        ]}
        className="mb-4"
      />

      {/* Data Table */}
      <DataTable
        data={filteredProjects}
        columns={columns}
        keyExtractor={(row) => row.id}
        emptyState={
          <EmptyState
            icon={Layers}
            title="No projects found"
            description="No projects match your search criteria. Try adjusting your filters."
            action={{
              label: "Clear Filters",
              onClick: handleReset
            }}
          />
        }
        pagination={{
          page,
          pageSize: 10,
          total: filteredProjects.length,
          onPageChange: setPage,
        }}
      />
    </DashboardLayout>
  );
}

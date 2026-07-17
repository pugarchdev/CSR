// Companies Directory Page
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Building2,
  Search,
  Filter,
  Eye,
  Plus,
  Download,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  ChevronRight,
  Verified,
  Clock
} from "lucide-react";

// New UI Components
import { DashboardLayout } from "@/components/layout";
import { PageHeader } from "@/components/layout";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable, Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar, ResultsSummary } from "@/components/ui/FilterBar";

// Sidebar items
const sidebarItems = [
  { label: "Dashboard", href: "/rm/dashboard", icon: Building2 },
  { label: "Corporate Enquiries", href: "/rm/enquiries", icon: Mail },
  { label: "Company Directory", href: "/rm/companies", icon: Building2 },
];

interface Company {
  id: string;
  cin: string;
  name: string;
  sector: string;
  csrBudget: number;
  spentToDate: number;
  registeredAddress: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  verificationStatus: string;
  projectsCount: number;
  registrationDate: string;
}

const sectorOptions = [
  { value: "", label: "All Sectors" },
  { value: "IT", label: "Information Technology" },
  { value: "Manufacturing", label: "Manufacturing" },
  { value: "Banking", label: "Banking & Finance" },
  { value: "Pharma", label: "Pharmaceuticals" },
  { value: "Energy", label: "Energy & Utilities" },
  { value: "Infrastructure", label: "Infrastructure" },
];

const statusOptions = [
  { value: "", label: "All Status" },
  { value: "VERIFIED", label: "Verified" },
  { value: "PENDING_VERIFICATION", label: "Pending Verification" },
  { value: "UNDER_REVIEW", label: "Under Review" },
];

const getStatusVariant = (status: string) => {
  const map: Record<string, "primary" | "success" | "warning" | "danger" | "info" | "muted"> = {
    VERIFIED: "success",
    PENDING_VERIFICATION: "warning",
    UNDER_REVIEW: "info",
    REJECTED: "danger",
  };
  return map[status] || "muted";
};

export default function CompaniesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const companies: Company[] = [
    {
      id: "1",
      cin: "L01110MH1995PLC087408",
      name: "Tech Solutions Ltd",
      sector: "IT",
      csrBudget: 50000000,
      spentToDate: 32500000,
      registeredAddress: "Mumbai, Maharashtra",
      contactPerson: "Rajesh Kumar",
      contactEmail: "csr@techsolutions.com",
      contactPhone: "+91 22 1234 5678",
      verificationStatus: "VERIFIED",
      projectsCount: 5,
      registrationDate: "2025-01-15",
    },
    {
      id: "2",
      cin: "U40100MH2010PLC123456",
      name: "Green Energy Corp",
      sector: "Energy",
      csrBudget: 80000000,
      spentToDate: 42000000,
      registeredAddress: "Pune, Maharashtra",
      contactPerson: "Priya Sharma",
      contactEmail: "csr@greenenergy.com",
      contactPhone: "+91 20 2345 6789",
      verificationStatus: "VERIFIED",
      projectsCount: 3,
      registrationDate: "2025-02-20",
    },
    {
      id: "3",
      cin: "L65110MH2005PLC098765",
      name: "Finance First Ltd",
      sector: "Banking",
      csrBudget: 125000000,
      spentToDate: 78000000,
      registeredAddress: "Mumbai, Maharashtra",
      contactPerson: "Amit Patel",
      contactEmail: "csr@financefirst.com",
      contactPhone: "+91 22 3456 7890",
      verificationStatus: "VERIFIED",
      projectsCount: 8,
      registrationDate: "2024-12-10",
    },
    {
      id: "4",
      cin: "U85100MH2012PLC112233",
      name: "Healthcare Plus",
      sector: "Pharma",
      csrBudget: 45000000,
      spentToDate: 12000000,
      registeredAddress: "Nashik, Maharashtra",
      contactPerson: "Dr. Sunita Gupta",
      contactEmail: "csr@healthcareplus.com",
      contactPhone: "+91 253 4567 8901",
      verificationStatus: "PENDING_VERIFICATION",
      projectsCount: 1,
      registrationDate: "2026-01-05",
    },
    {
      id: "5",
      cin: "L01200MH2008PLC076543",
      name: "Manufacturing Industries Ltd",
      sector: "Manufacturing",
      csrBudget: 95000000,
      spentToDate: 56000000,
      registeredAddress: "Thane, Maharashtra",
      contactPerson: "Vivek Sharma",
      contactEmail: "csr@manufacturing.com",
      contactPhone: "+91 22 5678 9012",
      verificationStatus: "VERIFIED",
      projectsCount: 6,
      registrationDate: "2024-11-20",
    },
  ];

  const filteredCompanies = companies.filter((company) => {
    const matchesSearch = 
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.cin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.contactPerson.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSector = sectorFilter ? company.sector === sectorFilter : true;
    const matchesStatus = statusFilter ? company.verificationStatus === statusFilter : true;
    
    return matchesSearch && matchesSector && matchesStatus;
  });

  const handleReset = () => {
    setSearchQuery("");
    setSectorFilter("");
    setStatusFilter("");
  };

  const columns: Column<Company>[] = [
    {
      key: "name",
      header: "Company",
      render: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <div className="font-medium text-gray-900">{row.name}</div>
            {row.verificationStatus === "VERIFIED" && (
              <Verified size={14} className="text-success-500" />
            )}
          </div>
          <div className="text-sm text-gray-500">{row.cin}</div>
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
      key: "registeredAddress",
      header: "Location",
      render: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <MapPin size={12} />
          {row.registeredAddress}
        </div>
      ),
    },
    {
      key: "csrBudget",
      header: "CSR Budget",
      align: "right",
      render: (row) => (
        <div className="text-right">
          <div className="font-medium text-gray-900">
            ₹{(row.csrBudget / 10000000).toFixed(1)}Cr
          </div>
          <div className="text-xs text-gray-500">
            {((row.spentToDate / row.csrBudget) * 100).toFixed(0)}% utilized
          </div>
        </div>
      ),
    },
    {
      key: "projectsCount",
      header: "Projects",
      align: "center",
      render: (row) => (
        <Badge variant="primary" size="sm">
          {row.projectsCount} Active
        </Badge>
      ),
    },
    {
      key: "verificationStatus",
      header: "Status",
      render: (row) => (
        <Badge variant={getStatusVariant(row.verificationStatus)}>
          {row.verificationStatus.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (row) => (
        <div>
          <div className="text-sm text-gray-900">{row.contactPerson}</div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Mail size={10} />
            {row.contactEmail}
          </div>
        </div>
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
          onClick={() => router.push(`/rm/companies/${row.id}`)}
        >
          <Eye size={14} className="mr-1" />
          View
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout
      userRole="CSR Relationship Manager"
      userName="Relationship Manager"
      userEmail="rm@mahacsr.gov.in"
      sidebarItems={sidebarItems}
    >
      <PageHeader
        title="Company Directory"
        description="View and manage registered CSR companies"
        breadcrumbs={[
          { label: "Dashboard", href: "/rm/dashboard" },
          { label: "Company Directory" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Download size={16} className="mr-2" />
              Export
            </Button>
            <Button>
              <Plus size={16} className="mr-2" />
              Add Company
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4" hover={false}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">
              <Building2 size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
              <p className="text-sm text-gray-500">Total Companies</p>
            </div>
          </div>
        </Card>
        <Card className="p-4" hover={false}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center text-success-600">
              <Verified size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {companies.filter(c => c.verificationStatus === "VERIFIED").length}
              </p>
              <p className="text-sm text-gray-500">Verified</p>
            </div>
          </div>
        </Card>
        <Card className="p-4" hover={false}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center text-warning-600">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {companies.filter(c => c.verificationStatus === "PENDING_VERIFICATION").length}
              </p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-4" hover={false}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-info-100 rounded-lg flex items-center justify-center text-info-600">
              <Briefcase size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {companies.reduce((acc, c) => acc + c.projectsCount, 0)}
              </p>
              <p className="text-sm text-gray-500">Active Projects</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by company name, CIN, or contact person..."
        filters={[
          {
            key: "sector",
            label: "Sector",
            value: sectorFilter,
            options: sectorOptions,
            onChange: setSectorFilter,
          },
          {
            key: "status",
            label: "Status",
            value: statusFilter,
            options: statusOptions,
            onChange: setStatusFilter,
          },
        ]}
        onReset={handleReset}
        className="mb-4"
      />

      {/* Results Summary */}
      <ResultsSummary
        total={companies.length}
        filtered={filteredCompanies.length}
        label="companies"
        className="mb-4"
      />

      {/* Data Table */}
      <DataTable
        data={filteredCompanies}
        columns={columns}
        keyExtractor={(row) => row.id}
        emptyState={
          <EmptyState
            icon={Building2}
            title="No companies found"
            description="No companies match your search criteria. Try adjusting your filters."
            action={{
              label: "Clear Filters",
              onClick: handleReset
            }}
          />
        }
        pagination={{
          page,
          pageSize: 10,
          total: filteredCompanies.length,
          onPageChange: setPage,
        }}
      />
    </DashboardLayout>
  );
}

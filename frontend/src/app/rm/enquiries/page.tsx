// RM Enquiries List Page - Redesigned with New Components
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Filter, 
  Eye, 
  Mail,
  ChevronLeft, 
  ChevronRight,
  Building2,
  Plus,
  Download,
  RefreshCw
} from "lucide-react";

// New UI Components
import { DashboardLayout } from "@/components/layout";
import { PageHeader } from "@/components/layout";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { DataTable, Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";

// API
import { apiFetch } from "@/lib/api";
import { useApiQuery } from "@/lib/apiHooks";

// Sidebar items for RM
const sidebarItems = [
  { label: "Dashboard", href: "/rm/dashboard", icon: Building2 },
  { label: "Corporate Enquiries", href: "/rm/enquiries", icon: Mail },
  { label: "Government Pitches", href: "/rm/government-pitches", icon: Building2 },
  { label: "Corporate Interests", href: "/rm/interests", icon: Building2 },
  { label: "Feasibility Reports", href: "/rm/assessments", icon: Building2 },
  { label: "Company Directory", href: "/rm/companies", icon: Building2 },
  { label: "Communication Log", href: "/rm/communications", icon: Mail },
  { label: "Reports", href: "/rm/reports", icon: Building2 },
];

// Types
interface Enquiry {
  id: string;
  trackingId: string;
  companyName: string;
  companyCin: string;
  sector: string;
  district: string;
  status: string;
  submittedAt: string;
  lastActivity: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  assignedRelationshipManager?: { id: string; email: string } | null;
}

// Status colors mapping
const getStatusVariant = (status: string) => {
  const map: Record<string, "primary" | "success" | "warning" | "danger" | "info" | "muted"> = {
    PENDING: "warning",
    IN_PROGRESS: "info",
    UNDER_VERIFICATION: "info",
    APPROVED: "success",
    REJECTED: "danger",
    ESCALATED: "danger",
    COMPLETED: "success",
    CLOSED: "muted",
  };
  return map[status] || "muted";
};

export default function EnquiriesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Mock data - replace with actual API
  const enquiries: Enquiry[] = [
    {
      id: "1",
      trackingId: "ENR-2026-00128",
      companyName: "Tech Solutions Ltd",
      companyCin: "L01110MH1995PLC087408",
      sector: "Education",
      district: "Mumbai",
      status: "PENDING",
      submittedAt: "2026-07-17T08:30:00Z",
      lastActivity: "2026-07-17T08:30:00Z",
      contactPerson: "Rajesh Kumar",
      contactEmail: "rajesh@techsolutions.com",
      contactPhone: "+91 98765 43210",
    },
    {
      id: "2",
      trackingId: "ENR-2026-00127",
      companyName: "Green Energy Corp",
      companyCin: "U40100MH2010PLC123456",
      sector: "Environment",
      district: "Pune",
      status: "IN_PROGRESS",
      submittedAt: "2026-07-16T14:20:00Z",
      lastActivity: "2026-07-17T10:15:00Z",
      contactPerson: "Priya Sharma",
      contactEmail: "priya@greenenergy.com",
      contactPhone: "+91 98765 43211",
    },
    {
      id: "3",
      trackingId: "ENR-2026-00126",
      companyName: "Finance First Ltd",
      companyCin: "L65110MH2005PLC098765",
      sector: "Livelihood",
      district: "Thane",
      status: "UNDER_VERIFICATION",
      submittedAt: "2026-07-15T11:00:00Z",
      lastActivity: "2026-07-16T09:30:00Z",
      contactPerson: "Amit Patel",
      contactEmail: "amit@financefirst.com",
      contactPhone: "+91 98765 43212",
    },
    {
      id: "4",
      trackingId: "ENR-2026-00125",
      companyName: "Healthcare Plus",
      companyCin: "U85100MH2012PLC112233",
      sector: "Health",
      district: "Nashik",
      status: "APPROVED",
      submittedAt: "2026-07-14T16:45:00Z",
      lastActivity: "2026-07-15T14:00:00Z",
      contactPerson: "Dr. Sunita Gupta",
      contactEmail: "sunita@healthcareplus.com",
      contactPhone: "+91 98765 43213",
    },
    {
      id: "5",
      trackingId: "ENR-2026-00124",
      companyName: "Rural Development Trust",
      companyCin: "U74999MH2015NPL445566",
      sector: "Rural Development",
      district: "Aurangabad",
      status: "REJECTED",
      submittedAt: "2026-07-13T09:15:00Z",
      lastActivity: "2026-07-14T11:30:00Z",
      contactPerson: "Vijay Deshmukh",
      contactEmail: "vijay@ruraldev.org",
      contactPhone: "+91 98765 43214",
    },
  ];

  // Filter enquiries
  const filteredEnquiries = enquiries.filter((enquiry) => {
    const matchesSearch = 
      enquiry.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enquiry.trackingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enquiry.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enquiry.district.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter ? enquiry.status === statusFilter : true;
    const matchesSector = sectorFilter ? enquiry.sector === sectorFilter : true;
    
    return matchesSearch && matchesStatus && matchesSector;
  });

  // Table columns
  const columns: Column<Enquiry>[] = [
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
          <div className="text-sm text-gray-500">{row.companyCin}</div>
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
      key: "district",
      header: "District",
      render: (row) => (
        <span className="text-sm text-gray-600">{row.district}</span>
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
      key: "contactPerson",
      header: "Contact",
      render: (row) => (
        <div>
          <div className="text-sm text-gray-900">{row.contactPerson}</div>
          <div className="text-xs text-gray-500">{row.contactEmail}</div>
        </div>
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
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/rm/enquiries/${row.id}`)}
          >
            <Eye size={14} className="mr-1" />
            View
          </Button>
        </div>
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
        title="Corporate Enquiries"
        description="Manage and track corporate partnership enquiries"
        breadcrumbs={[
          { label: "Dashboard", href: "/rm/dashboard" },
          { label: "Corporate Enquiries" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Download size={16} className="mr-2" />
              Export
            </Button>
            <Button>
              <Plus size={16} className="mr-2" />
              New Enquiry
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card className="mb-6" hover={false}>
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by company, ID, sector or district..."
                className="w-full h-10 pl-10 pr-4 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-4 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-primary-500"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="UNDER_VERIFICATION">Under Verification</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="h-10 px-4 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-primary-500"
              >
                <option value="">All Sectors</option>
                <option value="Education">Education</option>
                <option value="Health">Health</option>
                <option value="Environment">Environment</option>
                <option value="Livelihood">Livelihood</option>
                <option value="Rural Development">Rural Development</option>
              </select>
              <Button variant="outline" size="sm">
                <RefreshCw size={16} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing {filteredEnquiries.length} of {enquiries.length} enquiries
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Status:</span>
          <div className="flex gap-2">
            <Badge variant="warning" size="sm">
              {enquiries.filter(e => e.status === "PENDING").length} Pending
            </Badge>
            <Badge variant="info" size="sm">
              {enquiries.filter(e => e.status === "IN_PROGRESS").length} In Progress
            </Badge>
            <Badge variant="success" size="sm">
              {enquiries.filter(e => e.status === "APPROVED").length} Approved
            </Badge>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={filteredEnquiries}
        columns={columns}
        keyExtractor={(row) => row.id}
        emptyState={
          <EmptyState
            icon={Building2}
            title="No enquiries found"
            description="No enquiries match your search criteria. Try adjusting your filters or create a new enquiry."
            action={{
              label: "Create New Enquiry",
              onClick: () => router.push("/rm/enquiries/create")
            }}
          />
        }
        pagination={{
          page,
          pageSize: limit,
          total: filteredEnquiries.length,
          onPageChange: setPage,
        }}
      />
    </DashboardLayout>
  );
}

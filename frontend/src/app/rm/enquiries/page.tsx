"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import GovSelect from "@/components/gov/GovSelect";
import GovInput from "@/components/gov/GovInput";
import GovAlert from "@/components/gov/GovAlert";
import { apiFetch } from "@/lib/api";
import { useApiQuery } from "@/lib/apiHooks";
import { 
  Search, 
  Filter, 
  Eye, 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  MapPin,
  Building2
} from "lucide-react";

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
  assignedRelationshipManagerId?: string | null;
}

interface EnquiryListResponse {
  enquiries: Enquiry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Filters {
  status: string;
  district: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

// Status badge variant mapper
const getStatusVariant = (status: string): "success" | "warning" | "danger" | "info" | "muted" => {
  const statusMap: Record<string, "success" | "warning" | "danger" | "info" | "muted"> = {
    TRACKING_ID_GENERATED: "warning",
    RM_ASSIGNED: "info",
    RM_CONTACTED: "info",
    ASSESSMENT_PENDING: "info",
    ASSESSMENT_SUBMITTED_TO_JS: "info",
    JS_APPROVED: "success",
    JS_REJECTED: "danger",
    COMPLETED: "success",
    CLOSED: "muted"
  };
  return statusMap[status] || "muted";
};

// Format date helper
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Districts in Maharashtra
const MAHARASHTRA_DISTRICTS = [
  "All Districts",
  "Mumbai City",
  "Mumbai Suburban",
  "Thane",
  "Palghar",
  "Raigad",
  "Ratnagiri",
  "Sindhudurg",
  "Nashik",
  "Dhule",
  "Nandurbar",
  "Jalgaon",
  "Ahmednagar",
  "Pune",
  "Satara",
  "Sangli",
  "Solapur",
  "Kolhapur",
  "Aurangabad",
  "Jalna",
  "Beed",
  "Osmanabad",
  "Nanded",
  "Latur",
  "Parbhani",
  "Hingoli",
  "Amravati",
  "Akola",
  "Washim",
  "Buldhana",
  "Yavatmal",
  "Wardha",
  "Nagpur",
  "Bhandara",
  "Gondia",
  "Chandrapur",
  "Gadchiroli",
];

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "TRACKING_ID_GENERATED", label: "Awaiting Assignment" },
  { value: "RM_ASSIGNED", label: "RM Assigned" },
  { value: "RM_CONTACTED", label: "First Contact Made" },
  { value: "ASSESSMENT_PENDING", label: "Assessment Pending" },
  { value: "ASSESSMENT_SUBMITTED_TO_JS", label: "Submitted to JS" },
  { value: "JS_APPROVED", label: "Approved by JS" },
  { value: "JS_REJECTED", label: "Rejected by JS" }
];

const ITEMS_PER_PAGE = 10;

export default function EnquiriesListPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({
    status: "",
    district: "",
    dateFrom: "",
    dateTo: "",
    search: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  // Build query string
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", ITEMS_PER_PAGE.toString());
    if (filters.status) params.append("status", filters.status);
    if (filters.district && filters.district !== "All Districts") params.append("district", filters.district);
    if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.append("dateTo", filters.dateTo);
    if (filters.search) params.append("search", filters.search);
    return params.toString();
  }, [page, filters]);

  const { data, isLoading, error } = useApiQuery<EnquiryListResponse>(
    ["rm", "enquiries", "list", page.toString(), JSON.stringify(filters)],
    `/rm/enquiries?${buildQueryString()}`,
    { staleTime: 30 * 1000 }
  );

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      status: "",
      district: "",
      dateFrom: "",
      dateTo: "",
      search: "",
    });
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== "");

  return (
    <GovPortalLayout>
      <GovPageHeader
        title="Corporate Enquiries"
        description="View and manage all corporate CSR enquiries assigned to you"
        breadcrumb="Home / Enquiries"
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <GovButton variant="secondary" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={18} />
              {showFilters ? "Hide Filters" : "Filters"}
              {hasActiveFilters && <span style={{ marginLeft: 4, background: "var(--gov-saffron)", color: "white", borderRadius: 10, padding: "2px 6px", fontSize: 10 }}>!</span>}
            </GovButton>
          </div>
        }
      />

      {/* Filters Panel */}
      {showFilters && (
        <GovCard style={{ marginBottom: 24 }}>
          <GovCardBody>
            <div className="gov-form-grid">
              <div className="gov-field">
                <GovSelect
                  label="Status"
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </GovSelect>
              </div>
              <div className="gov-field">
                <GovSelect
                  label="District"
                  value={filters.district}
                  onChange={(e) => handleFilterChange("district", e.target.value)}
                >
                  {MAHARASHTRA_DISTRICTS.map((district) => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </GovSelect>
              </div>
              <div className="gov-field">
                <GovInput
                  label="From Date"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                />
              </div>
              <div className="gov-field">
                <GovInput
                  label="To Date"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                />
              </div>
              <div className="gov-field full">
                <GovInput
                  label="Search"
                  placeholder="Search by company name, tracking ID, or CIN..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                />
              </div>
            </div>
            {hasActiveFilters && (
              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                <GovButton variant="muted" onClick={clearFilters}>Clear All Filters</GovButton>
              </div>
            )}
          </GovCardBody>
        </GovCard>
      )}

      {/* Results Table */}
      <GovCard>
        <GovCardHeader>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <GovCardTitle>
              Enquiry List {data && `(${data.total} total)`}
            </GovCardTitle>
            {!isLoading && data && (
              <div style={{ fontSize: 13, color: "var(--gov-text-muted)" }}>
                Page {page} of {data.totalPages}
              </div>
            )}
          </div>
        </GovCardHeader>
        <GovCardBody style={{ padding: 0 }}>
          {error ? (
            <div style={{ margin: 16 }}>
              <GovAlert variant="danger">
                Failed to load enquiries. Please try again later.
              </GovAlert>
            </div>
          ) : isLoading ? (
            <div style={{ padding: 60, textAlign: "center", color: "var(--gov-text-muted)" }}>
              <div style={{ 
                width: 40, 
                height: 40, 
                border: "4px solid var(--gov-border)", 
                borderTopColor: "var(--gov-primary)",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 16px"
              }} />
              <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
              `}</style>
              Loading enquiries...
            </div>
          ) : data && data.enquiries.length > 0 ? (
            <>
              <div className="gov-table-container">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>Tracking ID</th>
                      <th>Company Details</th>
                      <th>Sector</th>
                      <th>District</th>
                      <th>Assigned RM</th>
                      <th>Status</th>
                      <th>Submitted At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.enquiries.map((enquiry) => (
                      <tr key={enquiry.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: "var(--gov-link)" }}>
                            {enquiry.trackingId}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--gov-text-muted)", marginTop: 2 }}>
                            CIN: {enquiry.companyCin}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Building2 size={16} color="var(--gov-text-muted)" />
                            <div>
                              <div style={{ fontWeight: 600 }}>{enquiry.companyName}</div>
                              <div style={{ fontSize: 11, color: "var(--gov-text-muted)" }}>
                                {enquiry.contactPerson}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{enquiry.sector}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <MapPin size={14} color="var(--gov-text-muted)" />
                            {enquiry.district}
                          </div>
                        </td>
                        <td>
                          {enquiry.assignedRelationshipManager ? (
                            <span style={{ fontSize: 13 }}>{enquiry.assignedRelationshipManager.email}</span>
                          ) : (
                            <span style={{ color: "var(--gov-danger)", fontSize: 12, fontWeight: 600 }}>⚠️ Unassigned</span>
                          )}
                        </td>
                        <td>
                          <GovStatusBadge variant={getStatusVariant(enquiry.status)}>
                            {enquiry.status.replace(/_/g, " ")}
                          </GovStatusBadge>
                        </td>
                        <td>
                          <div>{formatDate(enquiry.submittedAt)}</div>
                          <div style={{ fontSize: 11, color: "var(--gov-text-muted)" }}>
                            Last activity: {formatDate(enquiry.lastActivity)}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <Link href={`/rm/enquiries/${enquiry.id}`}>
                              <GovButton variant="secondary" style={{ padding: "6px 10px", fontSize: 12 }}>
                                <Eye size={14} />
                                View
                              </GovButton>
                            </Link>
                            <Link href={`/rm/enquiries/${enquiry.id}?tab=interactions`}>
                              <GovButton variant="muted" style={{ padding: "6px 10px", fontSize: 12 }}>
                                <MessageSquare size={14} />
                                Log
                              </GovButton>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                padding: 16,
                borderTop: "1px solid var(--gov-border)"
              }}>
                <div style={{ fontSize: 13, color: "var(--gov-text-muted)" }}>
                  Showing {((page - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(page * ITEMS_PER_PAGE, data.total)} of {data.total} enquiries
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <GovButton
                    variant="muted"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </GovButton>
                  <GovButton
                    variant="muted"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                    <ChevronRight size={16} />
                  </GovButton>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: 60, textAlign: "center", color: "var(--gov-text-muted)" }}>
              <FileText size={64} style={{ marginBottom: 16, opacity: 0.3 }} />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No enquiries found</div>
              <div style={{ fontSize: 13 }}>
                {hasActiveFilters 
                  ? "Try adjusting your filters or clear them to see all enquiries" 
                  : "You don't have any enquiries assigned to you yet"}
              </div>
              {hasActiveFilters && (
                <div style={{ marginTop: 16 }}>
                  <GovButton variant="secondary" onClick={clearFilters}>Clear Filters</GovButton>
                </div>
              )}
            </div>
          )}
        </GovCardBody>
      </GovCard>
    </GovPortalLayout>
  );
}

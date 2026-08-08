"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApiQuery } from "@/lib/apiHooks";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovInput from "@/components/gov/GovInput";
import GovSelect from "@/components/gov/GovSelect";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { apiFetch } from "@/lib/api";
import "@/styles/gov-theme.css";

export default function ImplementingAgencyRegistryPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const dbStatus =
    statusFilter === "Active" ? "ACTIVE" :
    statusFilter === "Under Review" ? "PENDING" :
    statusFilter === "Suspended" ? "SUSPENDED" :
    statusFilter === "all" ? "" : statusFilter;

  const dbDistrict = districtFilter === "all" ? "" : districtFilter;

  // Fetch paginated and filtered NGOs
  const { data: orgsResponse, isLoading: loading } = useApiQuery<any>(
    ["admin", "ngos", String(page), debouncedSearch, dbStatus, dbDistrict],
    `/admin/organizations?type=NGO&page=${page}&limit=${limit}&search=${encodeURIComponent(debouncedSearch)}&status=${dbStatus}&district=${encodeURIComponent(dbDistrict)}`,
    { staleTime: 30 * 1000 }
  );

  const rawOrgs = Array.isArray(orgsResponse?.data) ? orgsResponse.data : (Array.isArray(orgsResponse) ? orgsResponse : []);
  const pagination = orgsResponse?.pagination || {
    total: rawOrgs.length,
    active: rawOrgs.filter((o: any) => o.status === "ACTIVE").length,
    pending: rawOrgs.filter((o: any) => o.status !== "ACTIVE" && o.status !== "SUSPENDED").length,
    suspended: rawOrgs.filter((o: any) => o.status === "SUSPENDED").length,
    totalPages: 1
  };

  const items = (Array.isArray(rawOrgs) ? rawOrgs : []).map((org, index) => ({
    id: org.id,
    displayId: `IA-${new Date(org.createdAt || Date.now()).getFullYear()}-${String((page - 1) * limit + index + 1).padStart(3, '0')}`,
    name: org.name,
    registrationNo: org.registrationNumber || "—",
    district: org.district || "—",
    focusArea: org.organizationType?.replace(/_/g, " ") || "Other",
    status: org.status === "ACTIVE" ? "Active" : org.status === "PENDING" ? "Under Review" : org.status.replace(/_/g, " "),
    statusVariant: org.status === "ACTIVE" ? "success" as const : "warning" as const,
    projectsCompleted: org._count?.projects || 0,
    totalFunding: org.csrCompanyProfile?.spentAmount ? `₹${Number(org.csrCompanyProfile.spentAmount).toLocaleString("en-IN")}` : "—",
    lastAudit: org.updatedAt ? new Date(org.updatedAt).toLocaleDateString("en-IN") : "—",
    isDb: true
  }));

  const filteredNGOs = items;

  return (
    <GovPortalLayout>
      <GovPageHeader
        title="Implementing Agencies"
        breadcrumb="Admin / Implementing Agencies"
      />

      <div className="gov-container">
        {/* Stats Cards */}
        <div className="gov-grid gov-grid-cols-4 gov-gap-6 gov-mb-6">
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Total Agencies</div>
              <div className="gov-text-3xl gov-font-bold gov-text-primary">{loading ? "…" : pagination.total}</div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">Registered implementing agencies</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Active Agencies</div>
              <div className="gov-text-3xl gov-font-bold" style={{ color: "#166534" }}>
                {loading ? "…" : (pagination.active || 0)}
              </div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">Currently operational</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Under Review</div>
              <div className="gov-text-3xl gov-font-bold" style={{ color: "#d97706" }}>
                {loading ? "…" : (pagination.pending || 0)}
              </div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">Pending verification</div>
            </GovCardBody>
          </GovCard>
          <GovCard>
            <GovCardBody>
              <div className="gov-text-sm gov-text-muted gov-mb-1">Suspended</div>
              <div className="gov-text-3xl gov-font-bold" style={{ color: "#b91c1c" }}>
                {loading ? "…" : (pagination.suspended || 0)}
              </div>
              <div className="gov-text-xs gov-text-muted gov-mt-1">Compliance issues</div>
            </GovCardBody>
          </GovCard>
        </div>

        {/* Filters */}
        <GovCard className="gov-mb-6">
          <GovCardBody>
            <div className="gov-grid gov-grid-cols-3 gov-gap-4">
              <GovInput
                label="Search Agency"
                placeholder="Search by name or registration number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <GovSelect
                label="Status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Under Review">Under Review</option>
                <option value="Suspended">Suspended</option>
              </GovSelect>
              <GovSelect
                label="District"
                value={districtFilter}
                onChange={(e) => {
                  setDistrictFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Districts</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Pune">Pune</option>
                <option value="Nagpur">Nagpur</option>
                <option value="Ratnagiri">Ratnagiri</option>
                <option value="Aurangabad">Aurangabad</option>
              </GovSelect>
            </div>
          </GovCardBody>
        </GovCard>

        {/* Agency List */}
        <GovCard>
          <GovCardHeader>
            <GovCardTitle>Registered Implementing Agencies ({pagination.total})</GovCardTitle>
          </GovCardHeader>
          <GovCardBody>
            <div className="gov-table-container">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Agency ID</th>
                    <th>Organization Name</th>
                    <th>Registration No.</th>
                    <th>District</th>
                    <th>Focus Area</th>
                    <th>Projects</th>
                    <th>Total Funding</th>
                    <th>Last Audit</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNGOs.map((ngo) => (
                    <tr key={ngo.id}>
                      <td className="gov-font-mono">{ngo.displayId || ngo.id}</td>
                      <td className="gov-font-semibold">{ngo.name}</td>
                      <td className="gov-font-mono gov-text-sm">{ngo.registrationNo}</td>
                      <td>{ngo.district}</td>
                      <td>
                        <span className="gov-badge gov-badge-info">{ngo.focusArea}</span>
                      </td>
                      <td className="gov-text-center">{ngo.projectsCompleted}</td>
                      <td className="gov-font-semibold">{ngo.totalFunding}</td>
                      <td className="gov-text-sm">{ngo.lastAudit}</td>
                      <td>
                        <GovStatusBadge variant={ngo.statusVariant}>{ngo.status}</GovStatusBadge>
                      </td>
                      <td>
                        <div className="gov-flex gov-gap-2">
                          <GovButton variant="secondary" onClick={() => {
                            if (ngo.isDb) {
                              router.push(`/admin/organizations/${ngo.id}`);
                            } else {
                              router.push("/admin/organizations");
                            }
                          }}>
                            View
                          </GovButton>
                          <GovButton variant="muted" onClick={() => {
                            router.push(`/admin/audit-trail?search=${encodeURIComponent(ngo.name)}`);
                          }}>
                            Audit
                          </GovButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pagination.totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
                  <span className="gov-text-xs gov-text-muted">
                    Showing page {page} of {pagination.totalPages} ({pagination.total} agencies total)
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <GovButton
                      variant="secondary"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </GovButton>
                    <GovButton
                      variant="secondary"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    >
                      Next
                    </GovButton>
                  </div>
                </div>
              )}
            </div>
          </GovCardBody>
        </GovCard>
      </div>
    </GovPortalLayout>
  );
}

// Made with Bob

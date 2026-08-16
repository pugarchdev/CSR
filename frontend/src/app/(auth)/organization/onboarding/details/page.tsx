"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Loader2, Building2, User, Target, ShieldCheck, Coins } from "lucide-react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { apiFetch } from "@/lib/api";
import "@/styles/gov-theme.css";

type OrganizationDocument = {
  id: string;
  documentType: string;
  fileUrl: string;
  fileName?: string | null;
  verificationStatus: string;
  remarks?: string | null;
  createdAt?: string;
};

type OnboardingReview = {
  id: string;
  reviewAction: string;
  remarks?: string | null;
  createdAt: string;
};

type SubDepartment = {
  id: string;
  name: string;
  code?: string | null;
  officeAddress?: string | null;
  officialEmail?: string | null;
  officialPhone?: string | null;
  departmentHead?: string | null;
  dnoName?: string | null;
  status?: string;
  createdAt?: string;
};

type Organization = {
  id: string;
  organizationType?: string;
  kind?: string;
  name?: string;
  legalName?: string | null;
  displayName?: string | null;
  registrationNumber?: string | null;
  cin?: string | null;
  llpin?: string | null;
  pan?: string | null;
  gst?: string | null;
  gstin?: string | null;
  departmentCode?: string | null;
  parentDepartment?: string | null;
  officeDescription?: string | null;
  email?: string | null;
  officialEmail?: string | null;
  phone?: string | null;
  officialPhone?: string | null;
  website?: string | null;
  address?: string | null;
  district?: string | null;
  taluka?: string | null;
  onboardingStatus?: string;
  status?: string;
  documents?: OrganizationDocument[];
  subDepartments?: SubDepartment[];
  parentOrganization?: { id: string; name: string } | null;
  csrCompanyProfile?: Record<string, any> | null;
  governmentDepartmentProfile?: Record<string, any> | null;
  govDeptProfile?: Record<string, any> | null;
  ngoProfile?: Record<string, any> | null;
  onboardingReviews?: OnboardingReview[];
  yearOfIncorporation?: number | string | null;
};

const statusVariant = (status?: string) => {
  if (status === "APPROVED" || status === "ACTIVE") return "success" as const;
  if (["REJECTED", "SUSPENDED"].includes(status || "")) return "danger" as const;
  if (["SUBMITTED_FOR_REVIEW", "UNDER_VERIFICATION"].includes(status || "")) return "info" as const;
  return "warning" as const;
};



const formatValue = (value: any): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

function DetailGrid({ rows }: { rows: Array<[string, any]> }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="bg-slate-50/60 p-3 rounded-xl border border-slate-100">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">{label}</div>
          <div className="mt-1 text-xs font-bold text-slate-900 break-words">{formatValue(value)}</div>
        </div>
      ))}
    </div>
  );
}

function TagsGrid({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return <span className="text-xs text-slate-500 font-medium">—</span>;
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {tags.map((tag, idx) => (
        <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200">
          {tag}
        </span>
      ))}
    </div>
  );
}

export default function OnboardingDetailsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Organization>("/onboarding/status")
      .then(setOrganization)
      .catch((err) => setError(err.message || "Failed to load onboarding details"))
      .finally(() => setLoading(false));
  }, []);

  const org: Organization = organization || ({ id: "" } as Organization);

  const isGovDept =
    org.organizationType === "GOVERNMENT" ||
    org.organizationType === "DEPT" ||
    org.organizationType?.includes("GOVT") ||
    org.organizationType?.includes("DEPT") ||
    org.kind === "GOVERNMENT" ||
    org.kind === "DEPT" ||
    org.kind?.includes("GOVT") ||
    org.kind?.includes("DEPT");

  const profile = isGovDept
    ? (org.govDeptProfile || org.governmentDepartmentProfile || {})
    : (org.csrCompanyProfile || org.ngoProfile || {});

  const parseToArray = (val: any): string[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === "string") return val.split(",").map(s => s.trim()).filter(Boolean);
    return [];
  };

  const formatCurrency = (val: any) => {
    if (!val || isNaN(Number(val))) return "—";
    const num = Number(val);
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakh`;
    return `₹${num.toLocaleString("en-IN")}`;
  };

  const organizationRows: Array<[string, any]> = [
    ["Legal Name", org.legalName || org.name],
    ["Display Name", org.displayName],
    ["Organization Type", (org.organizationType || org.kind)?.replace(/_/g, " ")],
    ["CIN / LLPIN", org.cin || org.llpin],
    ["PAN", org.pan],
    ["GSTIN", org.gst || org.gstin],
    ["Year of Incorporation", org.yearOfIncorporation],
    ["Department Code / Identifier", org.departmentCode || profile.departmentCode],
    ["Parent Administrative Department", org.parentDepartment || org.parentOrganization?.name || profile.parentDepartment],
    ["Official Email", org.officialEmail || org.email],
    ["Official Phone", org.officialPhone || org.phone],
    ["Website", org.website],
    ["District", org.district],
    ["Taluka", org.taluka],
    ["Office Address", org.address],
    ["Office Mandate / Description", org.officeDescription || profile.officeDescription || profile.description],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "") as Array<[string, any]>;

  const headRows: Array<[string, any]> = [
    ["Head of Department Full Name", profile.headOfDepartmentName || profile.headName],
    ["Head Official Designation", profile.headDesignation],
    ["Head Official Email", profile.headEmail],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "") as Array<[string, any]>;

  const nodalRows: Array<[string, any]> = [
    ["Nodal Officer Name", profile.nodalOfficerName],
    ["Nodal Officer Designation", profile.nodalOfficerDesignation],
    ["Nodal Officer Email", profile.nodalOfficerEmail],
    ["Nodal Officer Mobile", profile.nodalOfficerMobile],
    ["Government ID Type", profile.nodalOfficerGovtIdType],
    ["Government ID Number", profile.nodalOfficerGovtIdNumber],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "") as Array<[string, any]>;

  const sectors = parseToArray(profile.departmentSectors || profile.csrSectors || profile.preferredSectors);
  const beneficiaries = parseToArray(profile.preferredBeneficiaryGroups || profile.targetBeneficiaries);
  const sdgs = parseToArray(profile.sdgFocusAreas);

  return (
    <GovPortalLayout>
      <GovPageHeader
        title="Onboarding Details"
        breadcrumb="ORGANIZATION / ONBOARDING / DETAILS"
        description="Read-only record of all details submitted during organization onboarding."
        actions={
          <Link href="/organization/onboarding/status" passHref legacyBehavior>
            <GovButton variant="secondary">Onboarding Status</GovButton>
          </Link>
        }
      />

      <div className="gov-container space-y-6">
        {error && <div className="gov-alert gov-alert-danger">{error}</div>}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 bg-white py-16 rounded-3xl shadow-sm border border-slate-200">
            <Loader2 className="h-8 w-8 animate-spin text-blue-900" />
            <span className="text-xs font-semibold text-slate-500">Loading onboarding details...</span>
          </div>
        ) : !organization?.id ? (
          <div className="gov-empty">
            No onboarding submission found yet.{" "}
            <Link href="/organization/onboarding" className="font-semibold text-blue-700 underline">
              Start onboarding
            </Link>
          </div>
        ) : (
          <>
            {/* Status summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <GovCard className="border border-slate-200 shadow-sm">
                <GovCardBody className="p-5">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Organization</div>
                  <div className="text-lg font-extrabold text-slate-900 mt-1">{org.name || "—"}</div>
                </GovCardBody>
              </GovCard>
              <GovCard className="border border-slate-200 shadow-sm">
                <GovCardBody className="p-5">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Onboarding Status</div>
                  <div className="mt-1.5">
                    <GovStatusBadge variant={statusVariant(org.onboardingStatus)}>
                      {(org.onboardingStatus || "REGISTERED").replace(/_/g, " ")}
                    </GovStatusBadge>
                  </div>
                </GovCardBody>
              </GovCard>
              <GovCard className="border border-slate-200 shadow-sm">
                <GovCardBody className="p-5">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Status</div>
                  <div className="text-lg font-extrabold text-slate-900 mt-1">{org.status || "—"}</div>
                </GovCardBody>
              </GovCard>
            </div>

            {/* Organization profile */}
            <GovCard className="border border-slate-200 shadow-sm">
              <GovCardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                <GovCardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Building2 size={18} className="text-blue-900" />
                  <span>Organization Profile</span>
                </GovCardTitle>
              </GovCardHeader>
              <GovCardBody className="p-6">
                {organizationRows.length ? (
                  <DetailGrid rows={organizationRows} />
                ) : (
                  <div className="gov-empty">No profile details submitted.</div>
                )}
              </GovCardBody>
            </GovCard>

            {/* Head of Department / Organization Details */}
            {headRows.length > 0 && (
              <GovCard className="border border-slate-200 shadow-sm">
                <GovCardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                  <GovCardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <User size={18} className="text-blue-900" />
                    <span>Head of Organization / Department Details</span>
                  </GovCardTitle>
                </GovCardHeader>
                <GovCardBody className="p-6">
                  <DetailGrid rows={headRows} />
                </GovCardBody>
              </GovCard>
            )}

            {/* Designated Nodal Officer Details */}
            {isGovDept && nodalRows.length > 0 && (
              <GovCard className="border border-slate-200 shadow-sm">
                <GovCardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                  <GovCardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <User size={18} className="text-indigo-900" />
                    <span>Designated Nodal Officer Details</span>
                  </GovCardTitle>
                </GovCardHeader>
                <GovCardBody className="p-6">
                  <DetailGrid rows={nodalRows} />
                </GovCardBody>
              </GovCard>
            )}

            {/* CSR Financial Profile & Compliance (For Corporates) */}
            {!isGovDept && (
              <GovCard className="border border-slate-200 shadow-sm">
                <GovCardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                  <GovCardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Coins size={18} className="text-purple-900" />
                    <span>CSR Financial Profile & Compliance</span>
                  </GovCardTitle>
                </GovCardHeader>
                <GovCardBody className="p-6">
                  <DetailGrid
                    rows={[
                      ["Covered under Section 135 provisions", profile.csrApplicable !== undefined ? (profile.csrApplicable ? "Yes" : "No") : "—"],
                      ["Financial Year", profile.financialYear],
                      ["Net Worth (INR)", formatCurrency(profile.netWorth)],
                      ["Annual Turnover (INR)", formatCurrency(profile.turnover)],
                      ["Net Profit (INR)", formatCurrency(profile.netProfit)],
                      ["Average Net Profit Last 3 Years (INR)", formatCurrency(profile.averageNetProfit)],
                      ["CSR Budget Current Financial Year (INR)", formatCurrency(profile.currentYearCsrBudget)],
                    ].filter(([, value]) => value !== null && value !== undefined && value !== "") as Array<[string, any]>}
                  />
                </GovCardBody>
              </GovCard>
            )}

            {/* Jurisdiction & Focus Areas */}
            {(profile.jurisdiction || sectors.length > 0 || beneficiaries.length > 0 || sdgs.length > 0 ||
              parseToArray(profile.preferredDivisions).length > 0 || parseToArray(profile.preferredDistricts).length > 0 ||
              parseToArray(profile.preferredCities).length > 0 || parseToArray(profile.preferredTalukas).length > 0 ||
              profile.fundingPreference || profile.implementationPreference) && (
              <GovCard className="border border-slate-200 shadow-sm">
                <GovCardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                  <GovCardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Target size={18} className="text-blue-900" />
                    <span>{isGovDept ? "Department Jurisdiction & Focus Areas" : "Geographic & Focus Preferences"}</span>
                  </GovCardTitle>
                </GovCardHeader>
                <GovCardBody className="p-6 space-y-4">
                  {profile.jurisdiction && (
                    <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Jurisdiction & Service Area Description</div>
                      <div className="mt-1 text-xs font-semibold text-slate-900 leading-relaxed">{profile.jurisdiction}</div>
                    </div>
                  )}

                  {!isGovDept && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profile.fundingPreference && (
                        <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Funding Preference</div>
                          <div className="mt-1 text-xs font-bold text-slate-900">{profile.fundingPreference}</div>
                        </div>
                      )}
                      {profile.implementationPreference && (
                        <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Implementation Preference</div>
                          <div className="mt-1 text-xs font-bold text-slate-900">{profile.implementationPreference}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {!isGovDept && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {parseToArray(profile.preferredDivisions).length > 0 && (
                        <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Preferred Divisions</div>
                          <TagsGrid tags={parseToArray(profile.preferredDivisions)} />
                        </div>
                      )}
                      {parseToArray(profile.preferredDistricts).length > 0 && (
                        <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Preferred Districts</div>
                          <TagsGrid tags={parseToArray(profile.preferredDistricts)} />
                        </div>
                      )}
                      {parseToArray(profile.preferredCities).length > 0 && (
                        <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Preferred Cities</div>
                          <TagsGrid tags={parseToArray(profile.preferredCities)} />
                        </div>
                      )}
                      {parseToArray(profile.preferredTalukas).length > 0 && (
                        <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Preferred Talukas</div>
                          <TagsGrid tags={parseToArray(profile.preferredTalukas)} />
                        </div>
                      )}
                    </div>
                  )}

                  {sectors.length > 0 && (
                    <div>
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Focus Sectors</div>
                      <TagsGrid tags={sectors} />
                    </div>
                  )}
                  {beneficiaries.length > 0 && (
                    <div>
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Target Beneficiary Groups</div>
                      <TagsGrid tags={beneficiaries} />
                    </div>
                  )}
                  {sdgs.length > 0 && (
                    <div>
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Priority Sustainable Development Goals (SDGs)</div>
                      <TagsGrid tags={sdgs} />
                    </div>
                  )}
                </GovCardBody>
              </GovCard>
            )}

            {/* Child Sub-Departments Directory */}
            {(org.subDepartments?.length || 0) > 0 && (
              <GovCard className="border border-slate-200 shadow-sm">
                <GovCardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                  <GovCardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Building2 size={18} className="text-blue-900" />
                    <span>Child Sub-Departments & Offices Directory ({org.subDepartments!.length})</span>
                  </GovCardTitle>
                </GovCardHeader>
                <GovCardBody className="p-6">
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                          <th className="p-3">Office Name</th>
                          <th className="p-3">Code</th>
                          <th className="p-3">District</th>
                          <th className="p-3">Designated Admin Officer</th>
                          <th className="p-3">Contact Email & Phone</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {org.subDepartments!.map((sub) => (
                          <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3 font-extrabold text-slate-900">{sub.name}</td>
                            <td className="p-3 font-mono text-slate-600">{sub.code || "—"}</td>
                            <td className="p-3 font-semibold text-slate-700">{sub.officeAddress ? `${sub.officeAddress}` : "—"}</td>
                            <td className="p-3 font-semibold text-slate-900">{sub.departmentHead || "—"}</td>
                            <td className="p-3 font-medium text-slate-600">{sub.officialEmail || "—"} {sub.officialPhone ? `(${sub.officialPhone})` : ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GovCardBody>
              </GovCard>
            )}

            {/* Submitted Documents */}
            <GovCard className="border border-slate-200 shadow-sm">
              <GovCardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                <GovCardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-blue-900" />
                  <span>Submitted Documents ({org.documents?.length || 0})</span>
                </GovCardTitle>
              </GovCardHeader>
              <GovCardBody className="p-6">
                {org.documents?.length ? (
                  <div className="gov-table-container">
                    <table className="gov-table">
                      <thead>
                        <tr>
                          <th>Document Type</th>
                          <th>File</th>
                          <th>Uploaded</th>
                          <th>Remarks</th>
                          <th>Verification</th>
                        </tr>
                      </thead>
                      <tbody>
                        {org.documents.map((doc) => (
                          <tr key={doc.id}>
                            <td className="gov-font-semibold">{doc.documentType.replace(/_/g, " ")}</td>
                            <td>
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                              >
                                <FileText size={14} /> {doc.fileName || "View"}
                              </a>
                            </td>
                            <td className="gov-text-sm">
                              {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("en-IN") : "—"}
                            </td>
                            <td className="gov-text-sm gov-text-muted">{doc.remarks || "—"}</td>
                            <td>
                              <GovStatusBadge
                                variant={
                                  doc.verificationStatus === "VERIFIED"
                                    ? "success"
                                    : doc.verificationStatus === "REJECTED"
                                    ? "danger"
                                    : "warning"
                                }
                              >
                                {doc.verificationStatus.replace(/_/g, " ")}
                              </GovStatusBadge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="gov-empty">No documents uploaded.</div>
                )}
              </GovCardBody>
            </GovCard>

            {/* Review timeline */}
            {(org.onboardingReviews?.length || 0) > 0 && (
              <GovCard className="border border-slate-200 shadow-sm">
                <GovCardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                  <GovCardTitle className="text-sm font-extrabold text-slate-900">Review Timeline</GovCardTitle>
                </GovCardHeader>
                <GovCardBody className="p-6">
                  <div className="flex flex-col gap-3">
                    {org.onboardingReviews!.map((review) => (
                      <div key={review.id} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                        <div>
                          <div className="text-sm font-bold text-slate-900">{review.reviewAction.replace(/_/g, " ")}</div>
                          {review.remarks && <div className="text-sm text-slate-600">{review.remarks}</div>}
                        </div>
                        <div className="whitespace-nowrap text-xs text-slate-500">
                          {new Date(review.createdAt).toLocaleString("en-IN")}
                        </div>
                      </div>
                    ))}
                  </div>
                </GovCardBody>
              </GovCard>
            )}
          </>
        )}
      </div>
    </GovPortalLayout>
  );
}

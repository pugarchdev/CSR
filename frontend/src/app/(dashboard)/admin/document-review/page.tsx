"use client";

import { useApiQuery } from "@/lib/apiHooks";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import GovButton from "@/components/gov/GovButton";

import { Loader } from "@/components/ui/Loader";

export default function AdminDocumentReviewPage() {
  const { data: envelope, isLoading } = useApiQuery<any>(
    ["document-review"],
    "/documents"
  );

  const docs = envelope?.data?.documents || envelope?.data || envelope?.documents || [];

  return (
    <GovPortalLayout userRole="ADMIN">
      <GovPageHeader
        breadcrumb="Admin / Document Review"
        title="Document Review Desk"
        description="Verify CSR-1, Darpan, PAN, 12A/80G, audited statements, CIN, GST, and authorization documents."
      />

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader label="Loading Documents from Database..." />
        </div>
      ) : (
        <GovCard>
          <GovCardHeader>
            <GovCardTitle>Documents Pending Review ({docs.length})</GovCardTitle>
          </GovCardHeader>
          <GovCardBody>
            <div className="overflow-x-auto">
              <table className="gov-table w-full">
                <thead>
                  <tr>
                    <th>Document ID</th>
                    <th>Document Name</th>
                    <th>Category / Type</th>
                    <th>Status</th>
                    <th>Uploaded Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.length > 0 ? (
                    docs.map((doc: any) => (
                      <tr key={doc.id}>
                        <td className="font-mono text-xs">{doc.id.slice(0, 8)}</td>
                        <td className="font-semibold">{doc.name || doc.originalName || "Document"}</td>
                        <td>{doc.documentType || "Statutory"}</td>
                        <td>
                          <GovStatusBadge variant={doc.status === "APPROVED" ? "success" : "warning"}>
                            {doc.status || "PENDING"}
                          </GovStatusBadge>
                        </td>
                        <td>
                          {doc.createdAt
                            ? new Date(doc.createdAt).toLocaleDateString("en-IN")
                            : "N/A"}
                        </td>
                        <td>
                          {doc.url ? (
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                              <GovButton variant="secondary">View Document</GovButton>
                            </a>
                          ) : (
                            <GovButton variant="secondary">Inspect</GovButton>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500 font-medium">
                        No documents pending review in database
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GovCardBody>
        </GovCard>
      )}
    </GovPortalLayout>
  );
}

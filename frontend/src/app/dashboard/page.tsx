"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import "../../styles/gov-theme.css";

export default function DashboardPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string>("NGO_ADMIN");

  useEffect(() => {
    // Get user role from localStorage or API
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        setUserRole(userData.role || "NGO_ADMIN");
      } catch (e) {
        console.error("Error parsing user data", e);
      }
    }
  }, []);

  const ngoModules = [
    {
      title: "NGO Onboarding",
      description: "Complete your organization registration and verification process",
      link: "/onboarding",
      status: "In Progress",
      statusVariant: "warning" as const,
      icon: "📝",
    },
    {
      title: "Application Status",
      description: "Track your onboarding application status and queries",
      link: "/onboarding/status",
      status: "Available",
      statusVariant: "info" as const,
      icon: "📊",
    },
    {
      title: "Documents",
      description: "Upload and manage verification documents",
      link: "/onboarding/documents",
      status: "Available",
      statusVariant: "info" as const,
      icon: "📄",
    },
    {
      title: "Queries",
      description: "View and respond to reviewer queries",
      link: "/queries",
      status: "Available",
      statusVariant: "info" as const,
      icon: "💬",
    },
    {
      title: "CSR Projects",
      description: "Create and manage CSR project proposals",
      link: "/csr-projects",
      status: "Available",
      statusVariant: "info" as const,
      icon: "🎯",
    },
    {
      title: "Marketplace",
      description: "Browse and apply for CSR funding opportunities",
      link: "/marketplace",
      status: "Available",
      statusVariant: "info" as const,
      icon: "🏪",
    },
  ];

  const adminModules = [
    {
      title: "Admin Dashboard",
      description: "View KPIs, pending actions and system statistics",
      link: "/admin/dashboard",
      status: "Active",
      statusVariant: "success" as const,
      icon: "📈",
    },
    {
      title: "Applications",
      description: "Review and verify NGO onboarding applications",
      link: "/admin/applications",
      status: "86 Pending",
      statusVariant: "warning" as const,
      icon: "📋",
    },
    {
      title: "Document Review",
      description: "Verify uploaded documents and certificates",
      link: "/admin/document-review",
      status: "42 Pending",
      statusVariant: "warning" as const,
      icon: "🔍",
    },
    {
      title: "Risk Review",
      description: "Review risk flags and compliance issues",
      link: "/admin/risk-review",
      status: "12 High Risk",
      statusVariant: "danger" as const,
      icon: "⚠️",
    },
    {
      title: "Approval Queue",
      description: "Final approval for verified applications",
      link: "/admin/approval-queue",
      status: "18 Pending",
      statusVariant: "warning" as const,
      icon: "✅",
    },
    {
      title: "Users & Roles",
      description: "Manage user accounts and permissions",
      link: "/admin/users-roles",
      status: "Available",
      statusVariant: "info" as const,
      icon: "👥",
    },
  ];

  const quickStats = [
    { label: "Your Applications", value: "1", color: "#12325a" },
    { label: "Pending Documents", value: "3", color: "#d97706" },
    { label: "Active Queries", value: "0", color: "#166534" },
    { label: "Projects", value: "0", color: "#005ea8" },
  ];

  const adminStats = [
    { label: "Total Applications", value: "1,248", color: "#12325a" },
    { label: "Pending Review", value: "86", color: "#d97706" },
    { label: "Approved NGOs", value: "742", color: "#166534" },
    { label: "High Risk", value: "12", color: "#b91c1c" },
  ];

  const isAdmin = userRole === "SUPER_ADMIN" || userRole === "PORTAL_ADMIN" || userRole === "CSR_ADMIN";
  const modules = isAdmin ? adminModules : ngoModules;
  const stats = isAdmin ? adminStats : quickStats;

  return (
    <GovPortalLayout userRole={userRole}>
      <GovPageHeader
        breadcrumb="Home / Dashboard"
        title={isAdmin ? "Administrative Dashboard" : "NGO Dashboard"}
        description={
          isAdmin
            ? "Monitor NGO onboarding, verification status, compliance risk and project proposals"
            : "Manage your organization profile, applications and CSR projects"
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <GovCard key={stat.label}>
            <GovCardBody>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gov-text-muted)", marginBottom: 8 }}>
                {stat.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>
                {stat.value}
              </div>
            </GovCardBody>
          </GovCard>
        ))}
      </div>

      {/* Modules Grid */}
      <GovCard>
        <GovCardHeader>
          <GovCardTitle>{isAdmin ? "Admin Modules" : "Available Modules"}</GovCardTitle>
        </GovCardHeader>
        <GovCardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module) => (
              <div
                key={module.title}
                style={{
                  border: "1px solid var(--gov-border)",
                  borderRadius: "var(--gov-radius)",
                  padding: 16,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "var(--gov-primary)";
                  e.currentTarget.style.boxShadow = "var(--gov-shadow)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "var(--gov-border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                onClick={() => router.push(module.link)}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 32 }}>{module.icon}</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--gov-primary-dark)" }}>
                      {module.title}
                    </h3>
                    <GovStatusBadge variant={module.statusVariant} style={{ marginTop: 6 }}>
                      {module.status}
                    </GovStatusBadge>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "var(--gov-text-secondary)", lineHeight: 1.5 }}>
                  {module.description}
                </p>
                <div style={{ marginTop: 12 }}>
                  <GovButton variant="secondary" style={{ width: "100%", fontSize: 12 }}>
                    Open Module →
                  </GovButton>
                </div>
              </div>
            ))}
          </div>
        </GovCardBody>
      </GovCard>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <GovCard>
          <GovCardHeader>
            <GovCardTitle>Quick Actions</GovCardTitle>
          </GovCardHeader>
          <GovCardBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {isAdmin ? (
                <>
                  <GovButton variant="primary" onClick={() => router.push("/admin/applications")}>
                    Review Applications
                  </GovButton>
                  <GovButton variant="secondary" onClick={() => router.push("/admin/document-review")}>
                    Verify Documents
                  </GovButton>
                  <GovButton variant="secondary" onClick={() => router.push("/admin/approval-queue")}>
                    Approval Queue
                  </GovButton>
                </>
              ) : (
                <>
                  <GovButton variant="primary" onClick={() => router.push("/onboarding")}>
                    Continue Onboarding
                  </GovButton>
                  <GovButton variant="secondary" onClick={() => router.push("/onboarding/documents")}>
                    Upload Documents
                  </GovButton>
                  <GovButton variant="secondary" onClick={() => router.push("/csr-projects/new")}>
                    Create Project
                  </GovButton>
                </>
              )}
            </div>
          </GovCardBody>
        </GovCard>

        <GovCard>
          <GovCardHeader>
            <GovCardTitle>Recent Activity</GovCardTitle>
          </GovCardHeader>
          <GovCardBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {isAdmin ? (
                <>
                  <div style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 700 }}>Application CSR-NGO-2026-00128 submitted</div>
                    <div style={{ color: "var(--gov-text-muted)", marginTop: 2 }}>2 hours ago</div>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 700 }}>Document verified for CSR-NGO-2026-00127</div>
                    <div style={{ color: "var(--gov-text-muted)", marginTop: 2 }}>5 hours ago</div>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 700 }}>Application CSR-NGO-2026-00126 approved</div>
                    <div style={{ color: "var(--gov-text-muted)", marginTop: 2 }}>1 day ago</div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 700 }}>Onboarding application saved as draft</div>
                    <div style={{ color: "var(--gov-text-muted)", marginTop: 2 }}>Just now</div>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 700 }}>Account created successfully</div>
                    <div style={{ color: "var(--gov-text-muted)", marginTop: 2 }}>Today</div>
                  </div>
                </>
              )}
            </div>
          </GovCardBody>
        </GovCard>
      </div>
    </GovPortalLayout>
  );
}

// Made with Bob

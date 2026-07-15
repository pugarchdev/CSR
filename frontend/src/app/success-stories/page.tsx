"use client";

import { useEffect, useState } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { GovCard, GovCardBody } from "@/components/gov/GovCard";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { apiFetch } from "@/lib/api";
import { Loader2, MapPin, Building2, Users } from "lucide-react";

interface Story {
  id: string;
  projectId: string;
  title: string;
  district: string;
  sector: string;
  corporate: string;
  amount: number | string;
  completedAt: string | null;
  beneficiaries: string | null;
  impact: string | null;
  photo: string | null;
}

const fmtCurrency = (value: number | string) => {
  const n = Number(value || 0);
  if (n >= 10000000) return `Rs. ${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `Rs. ${(n / 100000).toFixed(2)} Lakh`;
  return `Rs. ${n.toLocaleString("en-IN")}`;
};

export default function SuccessStoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await apiFetch<any>("/public/success-stories?limit=12");
        const data = response.data ?? response;
        if (active) setStories(data.stories ?? []);
      } catch {
        if (active) setStories([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <GovPortalLayout showSidebar={false}>
      <div className="gov-public-main">
        <div className="gov-page-header">
          <div className="gov-breadcrumb">Home / Success Stories &amp; Case Studies</div>
          <div style={{ color: "var(--gov-saffron)", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            Evidence-led public confidence
          </div>
          <h1 className="gov-page-title">Success Stories &amp; Case Studies</h1>
          <p className="gov-page-description">
            Completed CSR convergence projects verified by District Nodal Officers — with corporate partner, district, sector, investment and beneficiaries. Published only after milestone verification and utilization certificate acceptance.
          </p>
        </div>

        {loading ? (
          <div className="gov-flex-center" style={{ padding: "48px 0", color: "var(--gov-text-muted)", gap: 10 }}>
            <Loader2 className="animate-spin" size={20} /> Loading success stories...
          </div>
        ) : stories.length === 0 ? (
          <GovCard>
            <GovCardBody>
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--gov-text-muted)" }}>
                Verified success stories will appear here as projects are certified complete on the portal. Each story is published only after District Nodal Officer verification and utilization certificate acceptance.
              </div>
            </GovCardBody>
          </GovCard>
        ) : (
          <div className="gov-grid-auto-lg">
            {stories.map((story) => (
              <GovCard key={story.id}>
                {story.photo && (
                  <div
                    style={{
                      height: 160,
                      background: `url(${story.photo}) center/cover no-repeat`,
                      borderTopLeftRadius: "var(--gov-radius)",
                      borderTopRightRadius: "var(--gov-radius)",
                    }}
                  />
                )}
                <GovCardBody>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gov-link)" }}>{story.projectId}</div>
                    <GovStatusBadge variant="success">Verified</GovStatusBadge>
                  </div>
                  <h2 style={{ margin: "6px 0 8px", fontSize: 16, fontWeight: 800, color: "var(--gov-primary-dark)", lineHeight: 1.4 }}>{story.title}</h2>
                  {story.impact && (
                    <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.65, color: "var(--gov-text-secondary)" }}>{story.impact}</p>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--gov-text-secondary)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <MapPin size={14} className="shrink-0" /> {story.district} · {story.sector}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Building2 size={14} className="shrink-0" /> {story.corporate}
                    </div>
                    {story.beneficiaries && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Users size={14} className="shrink-0" /> {story.beneficiaries}
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--gov-border)", fontSize: 15, fontWeight: 800, color: "var(--gov-primary-dark)" }}>
                    {fmtCurrency(story.amount)}
                  </div>
                </GovCardBody>
              </GovCard>
            ))}
          </div>
        )}
      </div>
    </GovPortalLayout>
  );
}

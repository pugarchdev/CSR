"use client";

import React, { useState } from "react";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import GovButton from "@/components/gov/GovButton";
import GovInput from "@/components/gov/GovInput";
import GovTextarea from "@/components/gov/GovTextarea";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { GovCard, GovCardBody, GovCardHeader, GovCardTitle } from "@/components/gov/GovCard";
import GovAlert from "@/components/gov/GovAlert";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
      setForm({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setSent(false), 4000);
    }, 600);
  };

  return (
    <GovPortalLayout showSidebar={false}>
      <div className="gov-public-main">
        <div className="gov-page-header">
          <div className="gov-breadcrumb">Home / Contact Us</div>
          <h1 className="gov-page-title">Contact Us</h1>
          <p className="gov-page-description">Reach the MahaCSR public helpdesk, CSR Relationship Manager desk, State CSR Cell or district coordination channel.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {[
            ["State CSR Cell", "State-level CSR coordination, escalated grievances and inter-departmental support.", "statecell.user@mahacsr.gov.in", "022-2202 1234"],
            ["CSR Relationship Manager Desk", "Corporate enquiry, government pitch verification and coordination support.", "rm.user@mahacsr.gov.in", "022-2202 1240"],
            ["Public Helpdesk", "Static page query, document guidance, registration and tracking support.", "helpdesk@mahacsr.gov.in", "1800-123-4567"],
          ].map(([title, detail, email, phone]) => (
            <GovCard key={title}>
              <GovCardBody>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--gov-primary-dark)" }}>{title}</h2>
                <p style={{ minHeight: 48, margin: "8px 0 14px", color: "var(--gov-text-secondary)", fontSize: 13, lineHeight: 1.6 }}>{detail}</p>
                <div style={{ display: "grid", gap: 8, fontSize: 13, color: "var(--gov-text)" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Mail size={15} /> {email}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Phone size={15} /> {phone}</span>
                </div>
              </GovCardBody>
            </GovCard>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)", gap: 16, marginTop: 16 }}>
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Send Support Query</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              {sent && <GovAlert variant="success">Message registered. The helpdesk will respond as per the applicable SLA.</GovAlert>}
              <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                  <GovInput label="Full Name" required format="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <GovInput label="Email" type="email" required format="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <GovInput label="Subject" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                <GovTextarea label="Description / Query" required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                <div>
                  <GovButton type="submit" loading={loading} loadingText="Submitting Message..." icon={Send}>
                    Submit Message
                  </GovButton>
                </div>
              </form>
            </GovCardBody>
          </GovCard>

          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Office Reference</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              <div style={{ display: "grid", gap: 14, fontSize: 13, lineHeight: 1.65, color: "var(--gov-text-secondary)" }}>
                <span style={{ display: "inline-flex", gap: 8 }}><MapPin className="mt-1" size={15} /> Maharashtra CSR Authority, Mantralaya Annexe, Mumbai - 400032.</span>
                <div><strong>Corporate enquiry SLA:</strong> Relationship Manager response within 5 days.</div>
                <div><strong>Static helpdesk SLA:</strong> Public query response within 2 days.</div>
                <div><strong>Grievance route:</strong> District Nodal Officer - State CSR Cell - JS / Planning Secretary.</div>
              </div>
            </GovCardBody>
          </GovCard>
        </div>
      </div>
    </GovPortalLayout>
  );
}

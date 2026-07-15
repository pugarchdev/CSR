"use client";

import { useState } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovInput from "@/components/gov/GovInput";
import GovSelect from "@/components/gov/GovSelect";
import GovTextarea from "@/components/gov/GovTextarea";
import GovAlert from "@/components/gov/GovAlert";
import "../../styles/gov-theme.css";

export default function KnowledgeCenter() {
  const [ticketForm, setTicketForm] = useState({ name: "", email: "", type: "NGO", query: "" });
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: "agent", text: "Hello! Welcome to MahaCSR Helpdesk. How can we assist with your compliance filing today?" }
  ]);
  const [chatInput, setChatInput] = useState("");

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTicketSubmitted(true);
    setTimeout(() => {
      setTicketForm({ name: "", email: "", type: "NGO", query: "" });
      setTicketSubmitted(false);
    }, 4000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { sender: "user", text: chatInput }]);
    setChatInput("");

    setTimeout(() => {
      setChatMessages(prev => [...prev, { 
        sender: "agent", 
        text: "Thank you for the message. A support executive from Department of Industries is reviewing your profile." 
      }]);
    }, 1500);
  };

  const guides = [
    { title: "NGO Darpan Registration", desc: "Step-by-step instructions on mapping your NITI Aayog NGO Darpan unique ID, ensuring compliance data matches state registries." },
    { title: "MCA CSR-1 Filing Guide", desc: "Understand how to register Form CSR-1 with the Ministry of Corporate Affairs, creating your mandatory state-level eligibility key." },
    { title: "Company Spending Audits", desc: "Guides for company controllers on managing tax exemptions, verifying tranches, and generating board-room ready spend summaries." },
    { title: "Milestone Audit Process", desc: "How to structure milestone completion evidence reports and photos to satisfy statutory audit trails under MCA rules." }
  ];

  const downloads = [
    { 
      title: "Aspirational Districts Framework (PDF)", 
      desc: "Framework guidelines for focusing CSR activities in underdeveloped and aspirational districts.", 
      type: "PDF",
      href: "/docs/aspirational_district.pdf"
    },
    { 
      title: "Development Sectors in CSR (PDF)", 
      desc: "Official schedule and guidelines of developmental sectors covered under CSR convergence.", 
      type: "PDF",
      href: "/docs/DEVELOPMENT_SECTORS_IN_CSR.pdf"
    },
    { 
      title: "Section 135 Companies Act Compliance (PDF)", 
      desc: "Statutory provisions and compliance mandates of Section 135 of the Companies Act, 2013.", 
      type: "PDF",
      href: "/docs/Section_135_CSR.pdf"
    },
    { 
      title: "Standard Project Proposal Template (PDF)", 
      desc: "Mandatory structural format for submitting capital proposals to the marketplace.", 
      type: "PDF",
      href: ""
    },
    { 
      title: "Annual Corporate CSR Compliance Report (Excel)", 
      desc: "Pre-formatted ledger sheets mapped to MCA Section 135 reporting needs.", 
      type: "XLSX",
      href: ""
    },
    { 
      title: "Escrow Account Setup Agreement Framework", 
      desc: "Sample state escrow agreement for releasing milestone-based tranches.", 
      type: "DOCX",
      href: ""
    }
  ];

  const recommendations = [
    "Keep NGO Darpan, CSR-1, PAN, 12A, 80G, and audited financial statements in one verified credential packet.",
    "Require geo-tagged milestone photos, beneficiary registers, invoices, and officer notes before tranche release.",
    "Use district priority tags on every proposal so corporates can route funds toward underserved talukas.",
    "Publish plain-language help articles for CSR applicability, report exports, and rejection appeal steps."
  ];

  return (
    <div className="px-6 md:px-12 py-10 max-w-7xl mx-auto flex flex-col gap-8 min-h-screen">
      <GovPageHeader
        breadcrumb="Home / Knowledge Center"
        title="Compliance Hub & Help Center"
        description="Learn Section 135 compliance mandates, download official reporting templates, submit support requests, or chat with our helpdesk"
      />

      <div className="gov-official-band gov-mb-2">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--gov-saffron)", textTransform: "uppercase" }}>
              Public compliance desk
            </div>
            <p style={{ margin: "6px 0 0", color: "var(--gov-text-secondary)", maxWidth: 760 }}>
              This desk centralizes guidance for NGO onboarding, corporate CSR reporting, project evidence, officer review,
              and downloadable templates.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {["CSR-1", "Darpan", "12A/80G"].map((item) => (
              <div key={item} className="gov-mini-stat">
                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--gov-primary-dark)" }}>{item}</div>
                <div style={{ fontSize: 11, color: "var(--gov-text-muted)" }}>Checklist ready</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="gov-public-grid">
        {/* Left Column: Guides & Downloads */}
        <div className="gov-span-8" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Compliance Guides */}
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Compliance Guide Modules</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {guides.map((guide, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 16,
                      border: "1px solid var(--gov-border)",
                      borderRadius: "var(--gov-radius)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--gov-primary-dark)" }}>
                      {guide.title}
                    </h3>
                    <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--gov-text-secondary)" }}>
                      {guide.desc}
                    </p>
                  </div>
                ))}
              </div>
            </GovCardBody>
          </GovCard>

          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Portal Recommendations</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {recommendations.map((item) => (
                  <div key={item} className="gov-recommendation">
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--gov-text-secondary)" }}>
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </GovCardBody>
          </GovCard>

          {/* Download Catalog */}
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Download Catalog</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {downloads.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: 14,
                      border: "1px solid var(--gov-border)",
                      borderRadius: "var(--gov-radius)",
                      gap: 16,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: "var(--gov-primary-dark)" }}>
                        {d.title}
                      </h4>
                      <p style={{ fontSize: 11, color: "var(--gov-text-muted)" }}>
                        {d.desc}
                      </p>
                    </div>
                    {d.href ? (
                      <a href={d.href} download={d.href.split("/").pop()} style={{ textDecoration: "none" }}>
                        <GovButton variant="secondary" style={{ fontSize: 12, padding: "6px 12px", whiteSpace: "nowrap" }}>
                          Download {d.type}
                        </GovButton>
                      </a>
                    ) : (
                      <GovButton 
                        variant="secondary" 
                        style={{ fontSize: 12, padding: "6px 12px", whiteSpace: "nowrap" }}
                        onClick={() => alert("This document template is currently being finalized by the Coordinating Unit.")}
                      >
                        Download {d.type}
                      </GovButton>
                    )}
                  </div>
                ))}
              </div>
            </GovCardBody>
          </GovCard>
        </div>

        {/* Right Column: Support Ticket & Chat */}
        <div className="gov-span-4" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Support Ticket Form */}
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Support Ticket Desk</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              {ticketSubmitted ? (
                <GovAlert variant="success">
                  Ticket registered! Support team will contact you.
                </GovAlert>
              ) : (
                <form onSubmit={handleTicketSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 700 }}>
                      Your Name
                    </label>
                    <GovInput
                      required
                      value={ticketForm.name}
                      onChange={(e) => setTicketForm({...ticketForm, name: e.target.value})}
                      placeholder="e.g. Anand Kumar"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 700 }}>
                      Email Address
                    </label>
                    <GovInput
                      required
                      type="email"
                      value={ticketForm.email}
                      onChange={(e) => setTicketForm({...ticketForm, email: e.target.value})}
                      placeholder="e.g. anand@domain.org"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 700 }}>
                      Organization Type
                    </label>
                    <GovSelect
                      value={ticketForm.type}
                      onChange={(e) => setTicketForm({...ticketForm, type: e.target.value})}
                    >
                      <option value="NGO">NGO Admin</option>
                      <option value="COMPANY">Corporate Partner</option>
                      <option value="OTHER">Other / Public</option>
                    </GovSelect>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 700 }}>
                      Query Description
                    </label>
                    <GovTextarea
                      required
                      rows={3}
                      value={ticketForm.query}
                      onChange={(e) => setTicketForm({...ticketForm, query: e.target.value})}
                      placeholder="Briefly explain your compliance concern..."
                    />
                  </div>
                  <GovButton variant="primary" type="submit" style={{ width: "100%" }}>
                    Register Support Ticket
                  </GovButton>
                </form>
              )}
            </GovCardBody>
          </GovCard>

          {/* Live Chat */}
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Live Helpdesk Chat</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, height: 280 }}>
                {/* Messages */}
                <div style={{ 
                  flex: 1, 
                  overflowY: "auto", 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: 8,
                  padding: 8,
                  background: "var(--gov-bg-secondary)",
                  borderRadius: "var(--gov-radius)",
                }}>
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        fontSize: 11,
                        maxWidth: "85%",
                        lineHeight: 1.5,
                        alignSelf: msg.sender === "agent" ? "flex-start" : "flex-end",
                        background: msg.sender === "agent" ? "#fff" : "var(--gov-saffron)",
                        color: msg.sender === "agent" ? "var(--gov-text)" : "#fff",
                        border: msg.sender === "agent" ? "1px solid var(--gov-border)" : "none",
                        fontWeight: msg.sender === "user" ? 600 : 400,
                      }}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>

                {/* Input */}
                <form onSubmit={handleSendMessage} style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about compliance..."
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      border: "1px solid var(--gov-border)",
                      borderRadius: "var(--gov-radius)",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />
                  <GovButton variant="primary" type="submit" style={{ padding: "8px 16px" }}>
                    Send
                  </GovButton>
                </form>
              </div>
            </GovCardBody>
          </GovCard>
        </div>
      </div>
    </div>
  );
}

// Made with Bob

"use client";

import { useState, useMemo } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardBody } from "@/components/gov/GovCard";
import GovInput from "@/components/gov/GovInput";
import faqsData from "./faqs_data.json";
import "../../styles/gov-theme.css";

type FAQCategory = "General FAQs" | "Corporate" | "Implementing Agency" | "FAQs on CSR Provisions";

export default function FaqNewsRecognitionPage() {
  const [activeTab, setActiveTab] = useState<FAQCategory>("General FAQs");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const tabs: { id: FAQCategory; label: string }[] = [
    { id: "General FAQs", label: "General FAQs" },
    { id: "Corporate", label: "Corporate FAQs" },
    { id: "Implementing Agency", label: "Implementing Agency FAQs" },
    { id: "FAQs on CSR Provisions", label: "CSR Provisions FAQs" },
  ];

  // Helper to toggle expansion of a specific FAQ item
  const toggleExpand = (cat: FAQCategory, index: number) => {
    const key = `${cat}-${index}`;
    setExpandedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Filter FAQs based on search query
  const filteredFaqs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    
    // If there is no search query, return all FAQs in the active tab
    if (!query) {
      return (faqsData[activeTab] || []).map((faq, index) => ({
        ...faq,
        originalIndex: index,
        category: activeTab,
      }));
    }

    // If there is a search query, search across ALL categories or prioritize the active one
    const results: { q: string; a: string; originalIndex: number; category: FAQCategory }[] = [];
    
    // We search across all categories
    (Object.keys(faqsData) as FAQCategory[]).forEach((cat) => {
      const list = faqsData[cat] || [];
      list.forEach((faq, index) => {
        if (
          faq.q.toLowerCase().includes(query) ||
          faq.a.toLowerCase().includes(query)
        ) {
          results.push({
            ...faq,
            originalIndex: index,
            category: cat,
          });
        }
      });
    });

    return results;
  }, [activeTab, searchQuery]);

  // Group search results by category if searching across all, or just display active tab's matches
  const displayResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return { [activeTab]: filteredFaqs };
    }
    
    // Group by category
    const groups: Record<string, typeof filteredFaqs> = {};
    filteredFaqs.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredFaqs, searchQuery, activeTab]);

  return (
    <GovPortalLayout showSidebar={false}>
      <div className="gov-public-main">
        {/* Page Header */}
        <GovPageHeader
          breadcrumb="Home / FAQs"
          title="National CSR eXchange FAQs"
          description="Frequently Asked Questions on portal operations, corporate registration, implementing agency (IA) onboarding, and statutory CSR provisions under the Companies Act, 2013."
        />

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: 4, borderBottom: "2px solid var(--gov-border)", marginBottom: 20, overflowX: "auto" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery(""); // Clear search when switching tabs
                setExpandedItems({}); // Reset expanded items
              }}
              style={{
                padding: "12px 20px",
                fontSize: 12,
                fontWeight: 700,
                border: "none",
                borderBottom: activeTab === tab.id && !searchQuery.trim() ? "3px solid var(--gov-saffron)" : "3px solid transparent",
                background: activeTab === tab.id && !searchQuery.trim() ? "var(--gov-bg-secondary)" : "transparent",
                color: activeTab === tab.id && !searchQuery.trim() ? "var(--gov-saffron)" : "var(--gov-text-secondary)",
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: 24 }}>
          <GovCard>
            <GovCardBody style={{ padding: "16px 20px" }}>
              <label className="gov-label" htmlFor="faq-search">
                Search FAQs
              </label>
              <div style={{ position: "relative" }}>
                <GovInput
                  id="faq-search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setExpandedItems({}); // Reset expanded items when searching
                  }}
                  placeholder="Type keywords to search across questions and answers (e.g. RFP, registration, 2% average net profit)..."
                />
              </div>
              <div className="gov-help">
                {searchQuery.trim() ? (
                  <span>
                    Found {filteredFaqs.length} match{filteredFaqs.length === 1 ? "" : "es"} across all categories.
                  </span>
                ) : (
                  <span>
                    Showing {filteredFaqs.length} question{filteredFaqs.length === 1 ? "" : "s"} under <strong>{activeTab}</strong>.
                  </span>
                )}
              </div>
            </GovCardBody>
          </GovCard>
        </div>

        {/* FAQs List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {Object.keys(displayResults).map((catName) => {
            const catFaqs = displayResults[catName];
            if (catFaqs.length === 0) return null;

            return (
              <div key={catName} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {searchQuery.trim() && (
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: "var(--gov-saffron)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 10 }}>
                    {catName}
                  </h3>
                )}

                {catFaqs.map((faq) => {
                  const key = `${faq.category}-${faq.originalIndex}`;
                  const isExpanded = !!expandedItems[key];

                  return (
                    <div
                      key={key}
                      style={{
                        background: "#ffffff",
                        border: "1px solid var(--gov-border)",
                        borderRadius: "var(--gov-radius-sm)",
                        overflow: "hidden",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <button
                        onClick={() => toggleExpand(faq.category, faq.originalIndex)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "16px 20px",
                          border: "none",
                          background: "#ffffff",
                          fontSize: "14px",
                          fontWeight: 700,
                          color: "var(--gov-primary-dark)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          transition: "background-color 0.15s ease",
                          gap: 16,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--gov-primary-light)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
                      >
                        <span style={{ lineHeight: 1.4 }}>{faq.q}</span>
                        <span
                          style={{
                            color: "var(--gov-saffron)",
                            fontSize: "18px",
                            fontWeight: "800",
                            transition: "transform 0.15s ease",
                            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                          }}
                        >
                          {isExpanded ? "−" : "+"}
                        </span>
                      </button>
                      {isExpanded && (
                        <div
                          style={{
                            padding: "16px 20px",
                            background: "var(--gov-bg)",
                            borderTop: "1px solid var(--gov-border)",
                            fontSize: "13px",
                            lineHeight: "1.65",
                            color: "var(--gov-text-secondary)",
                          }}
                        >
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {filteredFaqs.length === 0 && (
            <GovCard>
              <GovCardBody style={{ padding: 24, textAlign: "center", color: "var(--gov-text-muted)" }}>
                No FAQs match your search query. Try searching for different keywords.
              </GovCardBody>
            </GovCard>
          )}
        </div>
      </div>
    </GovPortalLayout>
  );
}

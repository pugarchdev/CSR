"use client";

import { ReactNode, useEffect } from "react";
import "@/styles/gov-theme.css";

interface GovModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}

/**
 * Clean, flat modal overlay for government-styled forms.
 */
export default function GovModal({ open, onClose, title, children, width = 600 }: GovModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(15, 23, 42, 0.65)",
          zIndex: 1,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "12px",
          backgroundColor: "#ffffff",
          border: "1px solid #cbd5e1",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.15)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 20px",
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
            flexShrink: 0,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            type="button"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              cursor: "pointer",
              color: "#64748b",
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          className="gov-modal-scroll"
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            padding: "18px 20px",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

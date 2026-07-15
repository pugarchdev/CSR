"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NgoDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the unified dashboard
    router.replace("/dashboard");
  }, [router]);

  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      minHeight: "100vh",
      fontFamily: "system-ui, sans-serif"
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ 
          width: 48, 
          height: 48, 
          border: "4px solid #e5e7eb", 
          borderTopColor: "#14274e",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto 16px"
        }} />
        <p style={{ color: "#6b7280", fontSize: 14 }}>Redirecting to Dashboard...</p>
      </div>
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Made with Bob

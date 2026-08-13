import type { Metadata } from "next";
import "./globals.css";
import "@/styles/gov-theme.css";
import { QueryProvider } from "@/lib/queryProvider";
import { ToastProvider } from "@/components/ui/Toast";
import SaaSLayout from "@/components/SaaSLayout";
import SessionExpiredModal from "@/components/auth/SessionExpiredModal";
import { PermissionInitializer } from "@/components/auth/PermissionInitializer";

export const metadata: Metadata = {
  title: "MahaCSR | CSR Facilitation & Monitoring Portal",
  description: "Government of Maharashtra CSR facilitation and monitoring portal for NGO verification, project management and compliance.",
};

import { Suspense } from "react";
import TopProgressBar from "@/components/ui/TopProgressBar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#f8fafc" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&family=Noto+Sans:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;500;600;700;800&display=swap"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&family=Noto+Sans:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
        <QueryProvider>
          <ToastProvider>
              {/* Fetches /auth/permissions once authenticated and hydrates the
                  auth store (isAdmin, permissions). Without this mounted, the
                  store's isAdmin stays false and permissions stays empty for the
                  whole session, which starves the sidebar and triggers the
                  "Access restricted" screen even for SUPER_ADMIN. */}
              <PermissionInitializer>
                <SaaSLayout>{children}</SaaSLayout>
              </PermissionInitializer>
              <SessionExpiredModal />
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}


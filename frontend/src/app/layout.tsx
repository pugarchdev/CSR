import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/styles/gov-theme.css";
import { QueryProvider } from "@/lib/queryProvider";
import { ToastProvider } from "@/components/ui/Toast";
import SessionExpiredModal from "@/components/auth/SessionExpiredModal";
import { PermissionInitializer } from "@/components/auth/PermissionInitializer";
import { Suspense } from "react";
import TopProgressBar from "@/components/ui/TopProgressBar";
import dynamic from "next/dynamic";
const SaaSLayout = dynamic(() => import("@/components/SaaSLayout"), {
  ssr: false,
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "MahaCSR | CSR Facilitation & Monitoring Portal",
  description: "Government of Maharashtra CSR facilitation and monitoring portal for NGO verification, project management and compliance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="theme-color" content="#f8fafc" />
      </head>
      <body className={`${inter.className} antialiased min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900`}>
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


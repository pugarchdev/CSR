import type { Metadata } from "next";
import "./globals.css";
import "../styles/gov-theme.css";
import { QueryProvider } from "@/lib/queryProvider";
import SaaSLayout from "@/components/SaaSLayout";
import SessionExpiredModal from "@/components/auth/SessionExpiredModal";

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
    <html lang="en">
      <head>
        <meta name="theme-color" content="#f8fafc" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&family=Noto+Sans:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
        <QueryProvider>
          <SaaSLayout>{children}</SaaSLayout>
          <SessionExpiredModal />
        </QueryProvider>
      </body>
    </html>
  );
}


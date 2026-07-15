import type { Metadata } from "next";
import "./globals.css";
import "../styles/gov-theme.css";
import { QueryProvider } from "@/lib/queryProvider";
import SaaSLayout from "@/components/SaaSLayout";

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Noto+Sans:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-white text-[#333333] selection:bg-[#e3f0fa] selection:text-[#14274e]">
        <QueryProvider>
          <SaaSLayout>{children}</SaaSLayout>
        </QueryProvider>
      </body>
    </html>
  );
}

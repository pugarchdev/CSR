import type { Metadata } from "next";
import "./globals.css";
import SaaSLayout from "@/components/SaaSLayout";

export const metadata: Metadata = {
  title: "MahaCSR | Enterprise CSR Marketplace & Collaboration Platform",
  description: "Enterprise-grade CSR collaboration platform connecting corporate funding with verified grassroots NGOs in Maharashtra.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-blue-100 selection:text-blue-900">
        <SaaSLayout>{children}</SaaSLayout>
      </body>
    </html>
  );
}

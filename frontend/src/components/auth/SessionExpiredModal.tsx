"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert } from "lucide-react";

/**
 * Global popup shown when the API reports an invalid/expired access token.
 * Listens for the "auth:session-expired" event dispatched by apiFetch.
 */
export default function SessionExpiredModal() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleExpired = () => {
      // Normalize pathname
      const cleanPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;

      // Define all public route prefixes
      const publicPrefixes = [
        "/about",
        "/partner-with-maharashtra",
        "/pitch-development-need",
        "/track",
        "/standard-mou-template",
        "/csr-impact-dashboard",
        "/district-csr-ranking",
        "/statistics",
        "/downloads",
        "/faqs",
        "/feedback",
        "/gallery",
        "/stories",
        "/events",
        "/framework-policy",
        "/document-library",
        "/workflow",
        "/success-stories",
        "/csr-events",
        "/directory",
        "/completed-projects",
        "/public-development-needs",
        "/faq-news-recognition",
        "/knowledge",
        "/marketplace",
        "/circulars",
        "/news",
        "/contact",
        "/csr-policy",
        "/convergence",
        "/resources",
        "/reports",
        "/help"
      ];

      const isPublicRoute =
        cleanPath === "/" ||
        cleanPath === "/login" ||
        cleanPath === "/register" ||
        publicPrefixes.some(prefix => cleanPath === prefix || cleanPath.startsWith(prefix + "/"));

      if (!isPublicRoute) {
        setIsOpen(true);
      }
    };

    window.addEventListener("auth:session-expired", handleExpired);
    return () => window.removeEventListener("auth:session-expired", handleExpired);
  }, [pathname]);

  const handleLoginAgain = () => {
    setIsOpen(false);
    const next = pathname && pathname !== "/login" ? `?next=${encodeURIComponent(pathname)}` : "";
    router.push(`/login${next}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="w-full max-w-sm bg-white p-6 rounded-lg border border-gov-line shadow-xl z-10 flex flex-col items-center gap-4 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-[#fdeaea] flex items-center justify-center">
              <ShieldAlert size={24} className="text-[#c0392b]" />
            </div>
            <h3 className="font-heading font-bold text-lg text-gov-ink tracking-tight">
              Session Expired
            </h3>
            <p className="text-sm text-gov-ink/80">
              Your session has expired. Please login again to continue.
            </p>
            <button
              onClick={handleLoginAgain}
              className="mt-1 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-[#14274e] px-4 text-sm font-semibold text-white hover:bg-[#1d3a6e] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f7941d]/50"
            >
              Login Again
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Modal Component — Premium Glassmorphic
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("modal-open");
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "unset";
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>

          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/25 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
            className={cn(
              "w-full max-w-lg z-10 flex flex-col gap-5 relative",
              "bg-white/95 backdrop-blur-2xl p-6 rounded-2xl",
              "border border-slate-200/80 shadow-2xl",
              className
            )}
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100/80">
              <h3 className="font-semibold text-lg text-slate-900 tracking-tight">{title}</h3>
              <button
                onClick={onClose}
                aria-label="Close modal"
                className="text-slate-400 hover:text-slate-600 transition-colors duration-150 p-1.5 rounded-xl hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="text-slate-700 text-sm overflow-y-auto max-h-[70vh] pr-1" data-lenis-prevent>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted || typeof window === "undefined") return null;

  return createPortal(modalContent, document.body);
}

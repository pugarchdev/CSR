import React, { useEffect } from "react";
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
  // Listen to Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.3 }}
            className={cn(
              "w-full max-w-lg bg-white p-6 rounded-lg border border-gov-line shadow-xl z-10 flex flex-col gap-5 relative",
              className
            )}
          >

            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-gov-line">
              <h3 className="font-heading font-bold text-lg text-gov-ink tracking-tight">{title}</h3>
              <button
                onClick={onClose}
                aria-label="Close modal"
                className="text-gov-muted hover:text-gov-ink transition-colors duration-150 p-1.5 rounded-lg hover:bg-[#f4f5f7]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content body */}
            <div className="text-gov-ink/80 text-sm overflow-y-auto max-h-[70vh] pr-1">
              {children}
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

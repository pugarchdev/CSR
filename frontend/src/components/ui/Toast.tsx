// Toast Notification Components — Premium SaaS Glass Design
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";
import { ReactNode, createContext, useContext, useState, useCallback, useEffect } from "react";

// Toast Types
type ToastType = "success" | "error" | "warning" | "info";

interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

// Toast Context
interface ToastContextType {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

// Toast Provider
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastData, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);

    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || 5000);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

// Toast Container
interface ToastContainerProps {
  toasts: ToastData[];
  onClose: (id: string) => void;
}

function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[90] flex flex-col gap-3 w-full max-w-sm pointer-events-none px-4 sm:px-0">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Icons and Colors
const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const colors = {
  success: "bg-white/80 backdrop-blur-xl border-emerald-100/50 text-slate-800 shadow-glass",
  error: "bg-white/80 backdrop-blur-xl border-red-100/50 text-slate-800 shadow-glass",
  warning: "bg-white/80 backdrop-blur-xl border-amber-100/50 text-slate-800 shadow-glass",
  info: "bg-white/80 backdrop-blur-xl border-blue-100/50 text-slate-800 shadow-glass",
};

const iconColors = {
  success: "text-emerald-500",
  error: "text-red-500",
  warning: "text-amber-500",
  info: "text-blue-500",
};

const progressColors = {
  success: "bg-emerald-500",
  error: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-blue-500",
};

// Toast Item
interface ToastItemProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const Icon = icons[toast.type];
  const duration = toast.duration || 5000;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.9, y: 20, filter: "blur(4px)" }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={`pointer-events-auto w-full rounded-2xl border shadow-lg overflow-hidden ${colors[toast.type]}`}
    >
      <div className="p-4 flex items-start gap-3">
        <Icon size={20} className={`mt-0.5 shrink-0 ${iconColors[toast.type]}`} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-900 leading-tight">{toast.title}</p>
          {toast.message && <p className="mt-1 text-xs text-slate-500 leading-relaxed">{toast.message}</p>}
        </div>
        <button 
          onClick={() => onClose(toast.id)} 
          className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100/50"
        >
          <X size={14} />
        </button>
      </div>

      {/* Auto-Dismiss Progress Bar */}
      {duration > 0 && (
        <div className="h-1 w-full bg-slate-100/50">
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: duration / 1000, ease: "linear" }}
            className={`h-full ${progressColors[toast.type]}`}
          />
        </div>
      )}
    </motion.div>
  );
}

// Toast Hook Helpers
export function useToastActions() {
  const { addToast } = useToast();

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: "success", title, message });
  }, [addToast]);

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: "error", title, message });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: "warning", title, message });
  }, [addToast]);

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: "info", title, message });
  }, [addToast]);

  return { success, error, warning, info };
}

"use client";

import React from "react";
import { ShieldAlert, ArrowLeft, Home, Key } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

interface AccessRestrictedProps {
  requiredPermission?: string | string[];
  reason?: string;
}

export const AccessRestricted: React.FC<AccessRestrictedProps> = ({
  requiredPermission,
  reason = "You do not have the required permissions to access this page."
}) => {
  const { roles } = useAuthStore();

  const formattedPerms = Array.isArray(requiredPermission)
    ? requiredPermission.join(", ")
    : requiredPermission;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center" role="alert" aria-live="assertive">
      <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mb-6 shadow-sm">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        403 — Access Restricted
      </h1>

      <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6 leading-relaxed">
        {reason}
      </p>

      {formattedPerms && (
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 mb-6 max-w-md w-full text-left text-xs font-mono text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-2 mb-1 text-gray-500 font-semibold uppercase tracking-wider">
            <Key className="w-3.5 h-3.5" /> Required Permission:
          </div>
          <div className="text-red-600 dark:text-red-400 font-bold">{formattedPerms}</div>
          {roles && roles.length > 0 && (
            <div className="mt-2 text-gray-500">
              Assigned Roles: <span className="text-gray-900 dark:text-gray-200 font-semibold">{roles.join(", ")}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-md transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
        >
          <Home className="w-4 h-4" /> Return to Dashboard
        </a>
      </div>
    </div>
  );
};

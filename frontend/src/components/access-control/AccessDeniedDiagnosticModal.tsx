"use client";

import { AlertCircle, Lock, ShieldAlert, Mail, UserCheck, ChevronRight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface AccessDeniedDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredPermissionKey?: string;
  userRoleName?: string;
  userPermissions?: string[];
  adminEmail?: string;
}

export function AccessDeniedDiagnosticModal({
  isOpen,
  onClose,
  requiredPermissionKey = "project:approve",
  userRoleName = "Government Officer",
  userPermissions = ["project:view", "project:update"],
  adminEmail = "admin@mahacsr.gov.in"
}: AccessDeniedDiagnosticModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Access Restricted">
      <div className="space-y-5 text-xs">
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 p-4 rounded-2xl text-red-900">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
            <Lock size={20} />
          </div>
          <div>
            <div className="font-bold text-sm">You don't have access to this action</div>
            <div className="text-[11px] text-red-700 mt-0.5 font-medium">
              Your assigned role and scope do not contain the required permission grant.
            </div>
          </div>
        </div>

        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="font-bold text-slate-500">Required Permission Grant</span>
            <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {requiredPermissionKey}
            </span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="font-bold text-slate-500">Your Current Assigned Role</span>
            <span className="font-bold text-slate-800">{userRoleName}</span>
          </div>

          <div>
            <span className="font-bold text-slate-500 block mb-1.5">Your Active Permissions</span>
            <div className="flex flex-wrap gap-1">
              {userPermissions.map((p) => (
                <span key={p} className="font-mono text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-blue-50/80 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
          <Mail size={16} className="text-blue-900 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-slate-900">Need Additional Capabilities?</div>
            <div className="text-slate-600 text-[11px] mt-0.5">
              Contact your organization administrator ({adminEmail}) to request custom role assignment or permission updates.
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="primary" onClick={onClose} className="font-bold">
            Understand & Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

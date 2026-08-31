"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Mail,
  ExternalLink,
  Copy,
  Check,
  Building2,
  User,
  Sparkles,
  Laptop,
  CheckCircle2
} from "lucide-react";
import {
  EmailDraft,
  openEmailInProvider,
  formatEmailAsText,
  EmailProvider
} from "@/lib/emailUtils";

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientEmail: string;
  recipientName?: string;
  recipientDesignation?: string;
  recipientOrg?: string;
  defaultSubject: string;
  defaultBody: string;
  trackingId?: string;
  onLogged?: (note: string) => Promise<void> | void;
}

export default function SendEmailModal({
  isOpen,
  onClose,
  recipientEmail,
  recipientName,
  recipientDesignation,
  recipientOrg,
  defaultSubject,
  defaultBody,
  trackingId,
  onLogged
}: SendEmailModalProps) {
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [copied, setCopied] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  useEffect(() => {
    setSubject(defaultSubject);
    setBody(defaultBody);
    setLastAction(null);
    setCopied(false);
  }, [defaultSubject, defaultBody, isOpen]);

  if (!isOpen) return null;

  const draft: EmailDraft = {
    to: recipientEmail,
    subject: subject.trim(),
    body: body.trim()
  };

  const handleLaunch = async (provider: EmailProvider) => {
    openEmailInProvider(provider, draft);

    const providerNames: Record<EmailProvider, string> = {
      gmail: "Gmail Web",
      outlook: "Outlook 365 / Web",
      mailto: "Default Mail App"
    };
    const providerLabel = providerNames[provider];
    setLastAction(`Email draft opened in ${providerLabel}`);

    if (onLogged) {
      try {
        const note = `Initiated official email communication via ${providerLabel} to ${
          recipientName ? `${recipientName} ` : ""
        }(${recipientEmail}) regarding proposal ${trackingId || "Reference"}. Subject: "${subject.trim()}".`;
        await onLogged(note);
      } catch (err) {
        console.warn("Failed to auto-log email interaction:", err);
      }
    }
  };

  const handleCopy = async () => {
    const text = formatEmailAsText(draft);
    if (navigator?.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setLastAction("Email content copied to clipboard");
      setTimeout(() => setCopied(false), 2500);

      if (onLogged) {
        try {
          const note = `Copied official email draft to clipboard for ${
            recipientName ? `${recipientName} ` : ""
          }(${recipientEmail}) regarding proposal ${trackingId || "Reference"}.`;
          await onLogged(note);
        } catch (err) {
          console.warn("Failed to log copy action:", err);
        }
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Mail size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">Send Official Email</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  Direct Compose
                </span>
              </div>
              <p className="text-xs text-blue-200/90 font-medium">
                Open pre-filled draft directly in Gmail Web, Outlook, or your preferred email client
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Recipient summary card */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold shrink-0">
              <User size={15} />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-slate-900 truncate">
                {recipientName || "Corporate / Department Contact"}
                {recipientDesignation && (
                  <span className="font-normal text-slate-500 ml-1">({recipientDesignation})</span>
                )}
              </p>
              <p className="text-blue-900 font-mono text-[11px] font-semibold truncate">{recipientEmail}</p>
            </div>
          </div>

          {recipientOrg && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold">
              <Building2 size={13} className="text-slate-400" />
              <span className="truncate max-w-[200px]">{recipientOrg}</span>
            </div>
          )}
        </div>

        {/* Body content */}
        <div className="p-6 space-y-4 max-h-[calc(85vh-260px)] overflow-y-auto">
          {/* Subject field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Subject Line</span>
              <span className="text-[10px] text-slate-400 font-normal">Editable</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900"
              placeholder="Email subject..."
            />
          </div>

          {/* Email message template */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Message Draft</span>
              <span className="text-[10px] text-slate-400 font-normal">Pre-filled with official template</span>
            </label>
            <textarea
              rows={7}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-xl p-3.5 leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 resize-y"
              placeholder="Write your email body here..."
            />
          </div>

          {/* Status notice */}
          {lastAction && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold animate-fadeIn">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{lastAction}</span>
            </div>
          )}
        </div>

        {/* Action buttons footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Choose Email Platform to Dispatch
            </p>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-900 transition-colors"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copied Full Text!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy Text</span>
                </>
              )}
            </button>
          </div>

          {/* Multi-provider launch buttons grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Gmail Web (Primary) */}
            <button
              onClick={() => handleLaunch("gmail")}
              className="group flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-extrabold shadow-sm hover:from-red-700 hover:to-rose-700 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center font-bold text-[10px]">
                G
              </div>
              <span>Open in Gmail</span>
              <ExternalLink size={13} className="text-white/80 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Outlook 365 / Web */}
            <button
              onClick={() => handleLaunch("outlook")}
              className="group flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 text-white text-xs font-extrabold shadow-sm hover:from-blue-800 hover:to-indigo-800 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center font-bold text-[10px]">
                O
              </div>
              <span>Open in Outlook</span>
              <ExternalLink size={13} className="text-white/80 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Default Mail Client (mailto:) */}
            <button
              onClick={() => handleLaunch("mailto")}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Laptop size={14} className="text-slate-600" />
              <span>Default Mail App</span>
            </button>
          </div>

          <p className="text-[10px] text-slate-600 text-center font-medium">
            💡 Recommended: Click <strong>Open in Gmail</strong> to launch a pre-populated tab directly in your browser without requiring local desktop mail setup.
          </p>
        </div>
      </div>
    </div>
  );
}

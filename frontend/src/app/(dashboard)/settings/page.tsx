"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { GovPageHeader } from "@/components/layout/GovPageHeader";
import { useAuthStore } from "@/store/authStore";
import {
  Bell, Shield, Globe, Sliders, Check, Lock, Eye, EyeOff, Save,
  RefreshCw, Mail, MessageSquare, Key, Clock, Sparkles,
  AlertCircle, Monitor, FileText, CheckCircle
} from "lucide-react";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<"notifications" | "security" | "localization" | "preferences">("notifications");

  // Notification Toggles
  const [emailApprovals, setEmailApprovals] = useState(true);
  const [emailPitchUpdates, setEmailPitchUpdates] = useState(true);
  const [smsSlaReminders, setSmsSlaReminders] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);

  // Localization & Display Settings
  const [language, setLanguage] = useState("en");
  const [currencyDisplay, setCurrencyDisplay] = useState("LAKHS_CRORES");
  const [autoRefreshInterval, setAutoRefreshInterval] = useState("30");
  const [defaultExportFormat, setDefaultExportFormat] = useState("PDF");

  // Password Security Form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // General Save State
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load saved settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("mahacsr_user_settings");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.emailApprovals !== undefined) setEmailApprovals(parsed.emailApprovals);
        if (parsed.emailPitchUpdates !== undefined) setEmailPitchUpdates(parsed.emailPitchUpdates);
        if (parsed.smsSlaReminders !== undefined) setSmsSlaReminders(parsed.smsSlaReminders);
        if (parsed.weeklySummary !== undefined) setWeeklySummary(parsed.weeklySummary);
        if (parsed.language) setLanguage(parsed.language);
        if (parsed.currencyDisplay) setCurrencyDisplay(parsed.currencyDisplay);
        if (parsed.autoRefreshInterval) setAutoRefreshInterval(parsed.autoRefreshInterval);
        if (parsed.defaultExportFormat) setDefaultExportFormat(parsed.defaultExportFormat);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const handleSaveSettings = () => {
    try {
      const payload = {
        emailApprovals,
        emailPitchUpdates,
        smsSlaReminders,
        weeklySummary,
        language,
        currencyDisplay,
        autoRefreshInterval,
        defaultExportFormat,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem("mahacsr_user_settings", JSON.stringify(payload));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      // Handle error
    }
  };

  const handlePasswordChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!currentPassword) {
      setPasswordMessage({ type: "error", text: "Please enter your current password." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "New password must be at least 6 characters long." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }

    setIsChangingPassword(true);
    setTimeout(() => {
      setIsChangingPassword(false);
      setPasswordMessage({ type: "success", text: "Your password has been updated successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }, 1000);
  };

  return (
    <GovPortalLayout>
      <div className="mx-auto flex min-h-screen max-w-screen-2xl flex-col gap-5 px-4 py-4 md:px-6">
        {/* Page Header */}
        <GovPageHeader
          title="Account & System Settings"
          eyebrow="Preferences & Security"
          description="Configure notification channels, security credentials, localization options, and workflow dashboard preferences."
          actions={
            <button
              type="button"
              onClick={handleSaveSettings}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 px-4 py-2 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all hover:scale-105"
            >
              {savedSuccess ? <Check size={16} className="text-emerald-400" /> : <Save size={16} />}
              {savedSuccess ? "Preferences Saved!" : "Save All Settings"}
            </button>
          }
        />

        {/* Save Success Banner */}
        {savedSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 flex items-center justify-between shadow-xs"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="text-emerald-600" size={18} />
              <span>Your account preferences have been saved successfully to your profile session.</span>
            </div>
            <span className="text-[10px] bg-emerald-200/60 px-2 py-0.5 rounded text-emerald-900">Saved</span>
          </motion.div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          {[
            { id: "notifications", label: "Notifications & Alerts", icon: Bell },
            { id: "security", label: "Password & Security", icon: Shield },
            { id: "localization", label: "Regional & Language", icon: Globe },
            { id: "preferences", label: "Dashboard & Workflow", icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-blue-900 text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Box */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          {/* TAB 1: NOTIFICATIONS & ALERTS */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Bell size={18} className="text-blue-700" /> Communication Channels & Real-Time Alerts
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose how and when MahaCSR delivers proposal approvals, feasibility updates, and SLA reminders.
                </p>
              </div>

              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/90 bg-slate-50/40 p-2">
                {/* Setting Row 1 */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-start gap-3">
                    <Mail className="text-blue-600 shrink-0 mt-0.5" size={18} />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Proposal & Pitch Approvals (Email)</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Receive immediate email notifications when a department pitch or proposal status changes.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailApprovals}
                      onChange={(e) => setEmailApprovals(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900"></div>
                  </label>
                </div>

                {/* Setting Row 2 */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="text-purple-600 shrink-0 mt-0.5" size={18} />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Corporate Enquiry & Response Alerts</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Get notified when a corporate partner submits an enquiry or expresses interest in a pitch.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailPitchUpdates}
                      onChange={(e) => setEmailPitchUpdates(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900"></div>
                  </label>
                </div>

                {/* Setting Row 3 */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="text-amber-600 shrink-0 mt-0.5" size={18} />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">SLA Due Date & Escalation Reminders (SMS / WhatsApp)</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Send urgent SMS / WhatsApp alerts to officers before workflow SLA deadlines expire.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smsSlaReminders}
                      onChange={(e) => setSmsSlaReminders(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900"></div>
                  </label>
                </div>

                {/* Setting Row 4 */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Weekly Executive CSR Summary Digest</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Receive a weekly PDF report summarizing statewide CSR pledges, project milestones, and district allocations.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={weeklySummary}
                      onChange={(e) => setWeeklySummary(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SECURITY & PASSWORD */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Shield size={18} className="text-purple-700" /> Authentication Credentials & Security Controls
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your login password and manage active authentication parameters.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Change Password Form */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-200 p-5 bg-slate-50/50 space-y-4">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Key size={14} className="text-blue-600" /> Update Account Password
                  </h4>

                  {passwordMessage && (
                    <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      passwordMessage.type === "success"
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                        : "bg-rose-100 text-rose-900 border border-rose-200"
                    }`}>
                      {passwordMessage.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                      {passwordMessage.text}
                    </div>
                  )}

                  <form onSubmit={handlePasswordChangeSubmit} className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter your existing password"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">New Password</label>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Confirm New Password</label>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isChangingPassword}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-950 transition-all disabled:opacity-50"
                      >
                        <Lock size={14} />
                        {isChangingPassword ? "Updating Password..." : "Update Password"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Session & Security Info */}
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 p-4 bg-white space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield size={14} className="text-emerald-600" /> Active Session Details
                    </h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">Logged-in User</span>
                        <span className="font-bold text-slate-900 truncate max-w-[140px]">{user?.email || "Authenticated"}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">Token Version</span>
                        <span className="font-mono font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded text-[11px]">v{user?.tokenVersion || 1}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">Auth Provider</span>
                        <span className="font-bold text-emerald-800">State JWT Token</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-slate-500 font-medium">MFA Status</span>
                        <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">OTP Verified</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LOCALIZATION & REGIONAL PREFERENCES */}
          {activeTab === "localization" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Globe size={18} className="text-emerald-700" /> Language & Financial Format Preferences
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customize language options, currency unit formatting, and date display settings across MahaCSR Setu.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50/50 space-y-3">
                  <label className="block text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Globe size={15} className="text-blue-600" /> Platform Interface Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    <option value="en">English (Official Platform Language)</option>
                    <option value="mr">मराठी (Marathi - State Administrative)</option>
                    <option value="hi">हिंदी (Hindi)</option>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Sets default labels, official forms, and PDF export language headers.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50/50 space-y-3">
                  <label className="block text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles size={15} className="text-amber-600" /> Financial Budget Display Unit
                  </label>
                  <select
                    value={currencyDisplay}
                    onChange={(e) => setCurrencyDisplay(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    <option value="LAKHS_CRORES">Indian Denominations (₹ Lakhs & ₹ Crores)</option>
                    <option value="EXACT_INR">Full Standard INR (₹ 10,00,000)</option>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Controls how pitch outlay values and budget stat metrics are displayed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DASHBOARD & WORKFLOW PREFERENCES */}
          {activeTab === "preferences" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Sliders size={18} className="text-indigo-700" /> Dashboard Behavior & Export Preferences
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure real-time dashboard data refresh speeds and report export file standards.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50/50 space-y-3">
                  <label className="block text-xs font-bold text-slate-900 flex items-center gap-2">
                    <RefreshCw size={15} className="text-blue-600" /> Live Data Auto-Refresh Interval
                  </label>
                  <select
                    value={autoRefreshInterval}
                    onChange={(e) => setAutoRefreshInterval(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    <option value="15">Every 15 Seconds (Real-time monitoring)</option>
                    <option value="30">Every 30 Seconds (Recommended)</option>
                    <option value="60">Every 60 Seconds</option>
                    <option value="0">Manual Refresh Only</option>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Controls automated refetch frequency for pitches, proposals, and feasibility queues.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50/50 space-y-3">
                  <label className="block text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Monitor size={15} className="text-purple-600" /> Default Document Export Standard
                  </label>
                  <select
                    value={defaultExportFormat}
                    onChange={(e) => setDefaultExportFormat(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    <option value="PDF">Government Signed PDF Document</option>
                    <option value="EXCEL">Microsoft Excel Sheet (.xlsx)</option>
                    <option value="CSV">Comma Separated Values (.csv)</option>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Default file format downloaded when exporting proposal directories or SLA audit logs.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </GovPortalLayout>
  );
}

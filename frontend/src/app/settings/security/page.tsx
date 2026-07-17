"use client";

import { useEffect, useState } from "react";
import { Shield, Monitor, Smartphone, Globe, Trash2, ShieldAlert, Key, Check, Layers, Settings as SettingsIcon } from "lucide-react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const sidebarItems = [
  { label: "Dashboard", href: "/dashboard", icon: Layers },
  { label: "Settings", href: "/settings", icon: SettingsIcon },
  { label: "Security", href: "/settings/security", icon: Shield },
];

interface SessionItem {
  id: string;
  ipAddress: string;
  userAgent: string;
  deviceType: string;
  browser: string;
  os: string;
  isActive: boolean;
  isCurrent: boolean;
  createdAt: string;
  lastActiveAt: string;
}

export default function SecuritySettingsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [policy, setPolicy] = useState<"REPLACE" | "REJECT">("REPLACE");
  const [maxSessions, setMaxSessions] = useState<number>(1);
  const [userRole, setUserRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSecurityData = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const userStr = localStorage.getItem("user");
      if (!token) return;

      if (userStr) {
        const user = JSON.parse(userStr);
        setUserRole(user.role || "");
      }

      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      // 1. Fetch Sessions
      const resSessions = await fetch(`${apiBase}/api/security/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resSessions.ok) {
        const data = await resSessions.json();
        setSessions(data.sessions || data.data || []);
      }

      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const revokeSession = async (sessionId: string) => {
    try {
      const token = localStorage.getItem("accessToken");
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiBase}/api/security/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        setMessage({ type: "success", text: "Session terminated successfully." });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const revokeAllSessions = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiBase}/api/security/sessions/revoke-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.isCurrent));
        setMessage({ type: "success", text: "All other sessions revoked successfully." });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout
      userRole={userRole || "User"}
      userName="User Settings"
      sidebarItems={sidebarItems}
    >
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Shield className="text-orange-500" size={32} />
            Security Settings
          </h1>
          <p className="text-gray-500 mt-2">
            Manage your active sessions, devices, and enterprise security policies.
          </p>
        </div>

        {message && (
          <div
            className={`p-4 mb-6 rounded-lg text-sm font-medium ${
              message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left / Middle: Active Sessions */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 border border-gray-200 bg-white shadow-sm rounded-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Active Devices & Sessions</h2>
                  <p className="text-xs text-gray-500">You are currently logged in on these devices</p>
                </div>
                {sessions.length > 1 && (
                  <Button
                    onClick={revokeAllSessions}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50 focus:ring-red-500"
                  >
                    Revoke All Others
                  </Button>
                )}
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {sessions.map((session) => (
                    <div key={session.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-gray-500">
                          {session.deviceType === "mobile" ? <Smartphone size={20} /> : <Monitor size={20} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 text-sm">
                              {session.browser || "Unknown Browser"} on {session.os || "Unknown OS"}
                            </span>
                            {session.isCurrent && (
                              <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                This Device
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                            <Globe size={12} /> {session.ipAddress} • Active {new Date(session.lastActiveAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {!session.isCurrent && (
                        <button
                          onClick={() => revokeSession(session.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Revoke session"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Policies */}
          <div className="space-y-6">
            <Card className="p-6 border border-gray-200 bg-white shadow-sm rounded-xl">
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <ShieldAlert size={20} className="text-orange-500" />
                Session Policy
              </h2>
              <p className="text-xs text-gray-500 mb-6">
                Define the behavior when your maximum session limit is exceeded.
              </p>

              <div className="space-y-4">
                <label className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-100/50 transition-colors">
                  <input
                    type="radio"
                    name="policy"
                    value="REPLACE"
                    checked={policy === "REPLACE"}
                    onChange={() => setPolicy("REPLACE")}
                    className="mt-1 text-orange-500 focus:ring-orange-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-800 block">Option A: Replace</span>
                    <span className="text-xs text-gray-500">Automatically logout the oldest session when logging in on a new device.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-100/50 transition-colors">
                  <input
                    type="radio"
                    name="policy"
                    value="REJECT"
                    checked={policy === "REJECT"}
                    onChange={() => setPolicy("REJECT")}
                    className="mt-1 text-orange-500 focus:ring-orange-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-800 block">Option B: Reject</span>
                    <span className="text-xs text-gray-500">Block new login attempts on other devices if an active session is running.</span>
                  </div>
                </label>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 rounded-lg transition-colors focus:ring-orange-500">
                  Save Policy Settings
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

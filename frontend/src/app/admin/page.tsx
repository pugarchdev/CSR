"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, Landmark, Building2, FileText, Activity, Settings as SettingsIcon,
  Check, X, AlertTriangle, Eye, ShieldAlert, ArrowUpRight, Search, 
  Users, Sliders, Edit, Plus, CheckCircle2, Ticket, Coins, Clock, Lock, Key, Server, Trash
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatsCard } from "@/components/ui/StatsCard";

type AdminTab = 
  | "dashboard" | "users" | "roles" | "permissions" | "ngos" | "companies" 
  | "projects" | "funding" | "queue" | "reports" | "analytics" | "notifications" 
  | "cms" | "knowledge" | "circulars" | "districts" | "config" | "audit" 
  | "security" | "settings";

export default function AdminPanel({ params }: { params?: { tab?: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

  useEffect(() => {
    if (params?.tab) {
      setActiveTab(params.tab as AdminTab);
    }
  }, [params?.tab]);

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    router.push(`/admin/${tab}`);
  };

  // User list
  const [users, setUsers] = useState([
    { id: "1", name: "Anand Kumar", email: "anand@domain.org", role: "NGO Admin", status: "Active" },
    { id: "2", name: "Priya Sharma", email: "priya@tata.com", role: "Company Auditor", status: "Active" },
    { id: "3", name: "Rajesh Shinde", email: "shinde.r@mahacsr.gov.in", role: "Gov Auditor", status: "Active" }
  ]);
  const [newUName, setNewUName] = useState("");
  const [newUEmail, setNewUEmail] = useState("");
  const [newURole, setNewURole] = useState("NGO Admin");

  // Audit Logs
  const [systemLogs, setSystemLogs] = useState([
    { time: "15:47:50", user: "system-agent", action: "Redis matching engine connected", ip: "127.0.0.1" },
    { time: "15:32:00", user: "shinde.r", action: "Approve NGO: Sahyadri Eco Foundation", ip: "10.0.2.14" },
    { time: "14:15:00", user: "priya@tata", action: "Modify allocation sliders", ip: "192.168.1.58" }
  ]);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUName || !newUEmail) return;
    const newU = {
      id: String(users.length + 1),
      name: newUName,
      email: newUEmail,
      role: newURole,
      status: "Active"
    };
    setUsers([...users, newU]);
    setNewUName("");
    setNewUEmail("");
  };

  const handleRemoveUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
  };

  return (
    <div className="px-6 md:px-12 py-10 max-w-7xl mx-auto flex flex-col gap-8 bg-slate-950 text-slate-100 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-slate-800 pb-6">
        <span className="text-[#f97316] font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
          <ShieldAlert size={14} /> SUPER ADMIN CONTROL CABINET (महाराष्ट्र शासन)
        </span>
        <h1 className="font-heading font-extrabold text-4xl text-slate-100 tracking-tight">Super Admin Portal</h1>
      </div>

      {/* Admin Tab Swapper */}
      <div className="flex gap-2 border-b border-slate-800 pb-px overflow-x-auto">
        {[
          { id: "dashboard", label: "System Status", icon: Server },
          { id: "users", label: "User Accounts", icon: Users },
          { id: "roles", label: "Role Definitions", icon: ShieldCheck },
          { id: "permissions", label: "Access Permissions", icon: Sliders },
          { id: "audit", label: "System Audit Trail", icon: FileText }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as AdminTab)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all shrink-0 ${
                isActive 
                  ? "border-[#f97316] text-[#f97316] bg-slate-900/50" 
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 1. System Status Dashboard */}
      {activeTab === "dashboard" && (
        <div className="flex flex-col gap-8 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard label="System Accounts" value={users.length + 195} icon={Users} />
            <StatsCard label="Server CPU Load" value="8.4%" icon={Activity} />
            <StatsCard label="Active DB Connections" value="48 Connections" icon={Server} />
            <StatsCard label="Redis Caching State" value="Connected" icon={ShieldCheck} />
          </div>

          <Card>
            <CardHeader>
              <h3 className="font-heading font-bold text-lg text-slate-200">State Sourcing Aggregates</h3>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col gap-1">
                <span className="text-slate-500 text-[10px] font-bold uppercase">Aggregate Funds Sourced</span>
                <span className="text-slate-200 font-extrabold text-2xl">₹18.40 Crore</span>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col gap-1">
                <span className="text-slate-500 text-[10px] font-bold uppercase">Average Match Score</span>
                <span className="text-[#f97316] font-extrabold text-2xl">86.5% Rating</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. User Accounts */}
      {activeTab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-fadeIn">
          
          <Card className="lg:col-span-2">
            <CardHeader>
              <h3 className="font-heading font-bold text-xl text-slate-100">User Account Directories</h3>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-350">
                <thead className="text-xs uppercase text-slate-500 border-b border-slate-800 bg-slate-950/65 font-bold">
                  <tr>
                    <th className="py-3 px-5">User Name</th>
                    <th className="py-3 px-5">Registered Email</th>
                    <th className="py-3 px-5">Designated Role</th>
                    <th className="py-3 px-5 text-right">Access Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-900/40">
                      <td className="py-4 px-5 text-slate-200 font-bold">{u.name}</td>
                      <td className="py-4 px-5">{u.email}</td>
                      <td className="py-4 px-5 text-[#f97316]">{u.role}</td>
                      <td className="py-4 px-5 text-right">
                        <Button variant="danger" size="sm" onClick={() => handleRemoveUser(u.id)} className="flex items-center gap-1.5 ml-auto">
                          <Trash size={12} /> Revoke
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-heading font-bold text-lg text-slate-200">Provision User Account</h3>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddUser} className="flex flex-col gap-4 text-xs font-semibold text-slate-400">
                <div className="flex flex-col gap-1.5">
                  <span>Full Name:</span>
                  <input 
                    type="text" 
                    value={newUName} 
                    onChange={(e) => setNewUName(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none" 
                    required 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span>Registered Email:</span>
                  <input 
                    type="email" 
                    value={newUEmail} 
                    onChange={(e) => setNewUEmail(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none" 
                    required 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span>Select Role:</span>
                  <select 
                    value={newURole} 
                    onChange={(e) => setNewURole(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none"
                  >
                    <option>NGO Admin</option>
                    <option>Company Auditor</option>
                    <option>Gov Auditor</option>
                  </select>
                </div>
                <Button type="submit" className="py-2.5">Provision Account</Button>
              </form>
            </CardContent>
          </Card>

        </div>
      )}

      {/* 3. Role Definitions */}
      {activeTab === "roles" && (
        <Card className="animate-fadeIn">
          <CardHeader>
            <h3 className="font-heading font-bold text-xl text-slate-100">Access Roles Matrix</h3>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-350">
              <thead className="text-xs uppercase text-slate-500 border-b border-slate-800 bg-slate-950/65 font-bold">
                <tr>
                  <th className="py-3 px-5">Role Identifier</th>
                  <th className="py-3 px-5">Description Scope</th>
                  <th className="py-3 px-5 text-right">System Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {[
                  { id: "Superadmin", desc: "Full root access to system variables, database configurations, and roles management.", tier: "Tier 1" },
                  { id: "Gov Auditor", desc: "Audit and verify NGO credentials, approve marketplace proposals, and publish GR circulars.", tier: "Tier 2" },
                  { id: "Company Auditor", desc: "Manage corporate sliders, inspect milestone escrow uploads, and release tranches.", tier: "Tier 3" },
                  { id: "NGO Admin", desc: "Register NGO records, submit project proposals, and log served beneficiaries.", tier: "Tier 4" }
                ].map((r, index) => (
                  <tr key={index} className="hover:bg-slate-900/40">
                    <td className="py-4 px-5 text-slate-250 font-bold flex items-center gap-2">
                      <Lock size={14} className="text-[#f97316]" /> {r.id}
                    </td>
                    <td className="py-4 px-5 text-slate-400 max-w-md leading-relaxed">{r.desc}</td>
                    <td className="py-4 px-5 text-right font-bold text-indigo-650">{r.tier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* 4. Access Permissions Toggles */}
      {activeTab === "permissions" && (
        <Card className="animate-fadeIn">
          <CardHeader>
            <h3 className="font-heading font-bold text-xl text-slate-100">Roles Permission Toggles</h3>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 text-xs font-semibold text-slate-400">
            <div className="flex flex-col gap-4">
              {[
                { perm: "Verify NGO Credentials", roles: ["Superadmin", "Gov Auditor"] },
                { perm: "Release Escrow Payments", roles: ["Superadmin", "Company Auditor"] },
                { perm: "Publish Government Circulars", roles: ["Superadmin", "Gov Auditor"] },
                { perm: "Modify Database Configurations", roles: ["Superadmin"] }
              ].map((p, index) => (
                <div key={index} className="flex justify-between items-center p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                  <span className="text-slate-200 font-bold">{p.perm}</span>
                  <div className="flex gap-2">
                    {p.roles.map((r, ri) => (
                      <span key={ri} className="bg-indigo-50 border border-indigo-100 text-indigo-750 px-2.5 py-1 rounded-xl text-[10px] font-bold">{r}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. System Audit Trail */}
      {activeTab === "audit" && (
        <Card className="animate-fadeIn">
          <CardHeader>
            <h3 className="font-heading font-bold text-xl text-slate-100">System Logs & Event Audits</h3>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-350">
              <thead className="text-xs uppercase text-slate-500 border-b border-slate-800 bg-slate-950/65 font-bold">
                <tr>
                  <th className="py-3 px-5">Time</th>
                  <th className="py-3 px-5">User</th>
                  <th className="py-3 px-5">Action Logged</th>
                  <th className="py-3 px-5 text-right">Client IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {systemLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40">
                    <td className="py-4 px-5 text-slate-500">{log.time}</td>
                    <td className="py-4 px-5 text-slate-200 font-bold">{log.user}</td>
                    <td className="py-4 px-5 text-slate-400">{log.action}</td>
                    <td className="py-4 px-5 text-right text-indigo-650 font-bold">{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

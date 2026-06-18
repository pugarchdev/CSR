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
    <div className="px-6 md:px-10 py-8 max-w-7xl mx-auto flex flex-col gap-7 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col gap-1">
        <span className="text-[#f97316] font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
          <ShieldAlert size={14} /> SUPER ADMIN CONTROL CABINET (Super Admin)
        </span>
        <h1 className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight">Super Admin Portal</h1>
      </div>

      {/* Admin Tab Swapper */}
      <div className="flex gap-1 border-b border-slate-200 pb-px overflow-x-auto bg-white rounded-t-lg px-2 pt-1">
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
              className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-semibold border-b-2 transition-all shrink-0 ${
                isActive 
                  ? "border-[#f97316] text-[#f97316] bg-orange-50/30" 
                  : "border-transparent text-slate-500 hover:text-[#f97316] hover:bg-slate-50"
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 1. System Status Dashboard */}
      {activeTab === "dashboard" && (
        <div className="flex flex-col gap-7 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatsCard label="System Accounts" value={users.length + 195} icon={Users} />
            <StatsCard label="Server CPU Load" value="8.4%" icon={Activity} />
            <StatsCard label="Active DB Connections" value="48 Connections" icon={Server} />
            <StatsCard label="Redis Caching State" value="Connected" icon={ShieldCheck} />
          </div>

          <Card>
            <CardHeader>
              <h3 className="govt-section-header">
                <Activity size={20} />
                State Sourcing Aggregates
              </h3>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-1">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Aggregate Funds Sourced</span>
                <span className="text-[#1e3a8a] font-extrabold text-2xl">₹18.40 Crore</span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-1">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Average Match Score</span>
                <span className="text-[#f97316] font-extrabold text-2xl">86.5% Rating</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. User Accounts */}
      {activeTab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fadeIn">
          
          <Card className="lg:col-span-2">
            <CardHeader>
              <h3 className="govt-section-header">
                <Users size={20} />
                User Account Directories
              </h3>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="govt-table">
                <thead>
                  <tr>
                    <th>User Name</th>
                    <th>Registered Email</th>
                    <th>Designated Role</th>
                    <th className="text-right">Access Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="font-bold text-slate-800">{u.name}</td>
                      <td>{u.email}</td>
                      <td><span className="govt-badge govt-badge-funded">{u.role}</span></td>
                      <td className="text-right">
                        <Button variant="danger" size="sm" onClick={() => handleRemoveUser(u.id)} className="flex items-center gap-1.5 py-1.5 px-3 text-xs ml-auto">
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
              <h3 className="govt-section-header text-base">
                <Plus size={18} />
                Provision User Account
              </h3>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddUser} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-600 font-sans">Full Name:</span>
                  <input 
                    type="text" 
                    value={newUName} 
                    onChange={(e) => setNewUName(e.target.value)}
                    className="govt-input" 
                    required 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-600 font-sans">Registered Email:</span>
                  <input 
                    type="email" 
                    value={newUEmail} 
                    onChange={(e) => setNewUEmail(e.target.value)}
                    className="govt-input" 
                    required 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-600 font-sans">Select Role:</span>
                  <select 
                    value={newURole} 
                    onChange={(e) => setNewURole(e.target.value)}
                    className="govt-input"
                  >
                    <option>NGO Admin</option>
                    <option>Company Auditor</option>
                    <option>Gov Auditor</option>
                  </select>
                </div>
                <Button type="submit" variant="accent" className="py-2.5 text-sm">Provision Account</Button>
              </form>
            </CardContent>
          </Card>

        </div>
      )}

      {/* 3. Role Definitions */}
      {activeTab === "roles" && (
        <Card className="animate-fadeIn">
          <CardHeader>
            <h3 className="govt-section-header">
              <ShieldCheck size={20} />
              Access Roles Matrix
            </h3>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="govt-table">
              <thead>
                <tr>
                  <th>Role Identifier</th>
                  <th>Description Scope</th>
                  <th className="text-right">System Tier</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: "Superadmin", desc: "Full root access to system variables, database configurations, and roles management.", tier: "Tier 1" },
                  { id: "Gov Auditor", desc: "Audit and verify NGO credentials, approve marketplace proposals, and publish GR circulars.", tier: "Tier 2" },
                  { id: "Company Auditor", desc: "Manage corporate sliders, inspect milestone escrow uploads, and release tranches.", tier: "Tier 3" },
                  { id: "NGO Admin", desc: "Register NGO records, submit project proposals, and log served beneficiaries.", tier: "Tier 4" }
                ].map((r, index) => (
                  <tr key={index}>
                    <td className="font-bold text-slate-800 flex items-center gap-2">
                      <Lock size={14} className="text-[#f97316]" /> {r.id}
                    </td>
                    <td className="text-slate-600 text-xs max-w-md leading-relaxed">{r.desc}</td>
                    <td className="text-right font-bold text-[#1e3a8a]">{r.tier}</td>
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
            <h3 className="govt-section-header">
              <Sliders size={20} />
              Roles Permission Toggles
            </h3>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {[
              { perm: "Verify NGO Credentials", roles: ["Superadmin", "Gov Auditor"] },
              { perm: "Release Escrow Payments", roles: ["Superadmin", "Company Auditor"] },
              { perm: "Publish Government Circulars", roles: ["Superadmin", "Gov Auditor"] },
              { perm: "Modify Database Configurations", roles: ["Superadmin"] }
            ].map((p, index) => (
              <div key={index} className="flex justify-between items-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-800 font-bold text-sm">{p.perm}</span>
                <div className="flex gap-2">
                  {p.roles.map((r, ri) => (
                    <span key={ri} className="govt-badge govt-badge-verified">{r}</span>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 5. System Audit Trail */}
      {activeTab === "audit" && (
        <Card className="animate-fadeIn">
          <CardHeader>
            <h3 className="govt-section-header">
              <FileText size={20} />
              System Logs & Event Audits
            </h3>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="govt-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action Logged</th>
                  <th className="text-right">Client IP</th>
                </tr>
              </thead>
              <tbody>
                {systemLogs.map((log, idx) => (
                  <tr key={idx}>
                    <td className="text-slate-500">{log.time}</td>
                    <td className="font-bold text-slate-800">{log.user}</td>
                    <td className="text-slate-600 text-xs">{log.action}</td>
                    <td className="text-right font-bold text-[#1e3a8a]">{log.ip}</td>
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

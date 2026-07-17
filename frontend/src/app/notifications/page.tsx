"use client";

import { Bell, Calendar, ArrowRight, ShieldAlert, Award, Landmark } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

const systemNotifications = [
  { id: "1", title: "NGO Darpan Annual Filing Deadline Extended", content: "The state planning commission has extended the NGO Darpan annual profile verification deadline to July 31, 2026.", type: "deadline", date: "June 18, 2026", color: "text-amber-500 bg-amber-50 border-amber-100" },
  { id: "2", title: "New Saffron-accented light UI Rolled Out", content: "MahaCSR has transformed to a light government branding theme complying with Indian Accessibility Guidelines.", type: "update", date: "June 17, 2026", color: "text-[#f7941d] bg-[#fef3e0] border-[#fdeacd]" },
  { id: "3", title: "₹5.0 Crore Water Escrow Fund Released", content: "Second milestone payouts for the Gadchiroli check dam projects have been audited and cleared to recipient NGO accounts.", type: "escrow", date: "June 15, 2026", color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  { id: "4", title: "Mandatory CSR-1 Validation Audit Cycle", content: "All corporations holding budget caps exceeding 1 Crore INR must execute the audit log validation process.", type: "audit", date: "June 10, 2026", color: "text-indigo-600 bg-indigo-50 border-indigo-100" }
];

export default function NotificationsPage() {
  return (
    <div className="px-6 md:px-12 py-12 max-w-4xl mx-auto flex flex-col gap-8 bg-slate-950 text-slate-100 min-h-screen">
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-6">
        <span className="text-[#f7941d] font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
          <Bell size={14} /> LIVE ANNOUNCEMENTS SYSTEM
        </span>
        <h1 className="font-heading font-extrabold text-4xl text-slate-100 tracking-tight">Platform Notifications</h1>
        <p className="text-slate-400 text-sm">Real-time alerts, compliance reminders, and transaction approvals for the Maharashtra CSR network.</p>
      </div>

      <div className="flex flex-col gap-4">
        {systemNotifications.map((notif) => (
          <div key={notif.id} className="glass-card p-6 rounded-2xl border border-slate-800 flex gap-4 items-start">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${notif.color}`}>
              {notif.type === "deadline" && <Calendar size={18} />}
              {notif.type === "update" && <Bell size={18} />}
              {notif.type === "escrow" && <Award size={18} />}
              {notif.type === "audit" && <ShieldAlert size={18} />}
            </div>
            <div className="flex flex-col gap-1.5 flex-grow">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h3 className="font-heading font-bold text-base text-slate-100 leading-tight">{notif.title}</h3>
                <span className="text-[10px] text-slate-500 font-bold">{notif.date}</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">{notif.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

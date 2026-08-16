"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, CheckCircle2 } from "lucide-react";

export default function InviteNgoPage() {
  const router = useRouter();
  const [searchDarpan, setSearchDarpan] = useState("");
  const [email, setEmail] = useState("");
  const [invited, setInvited] = useState(false);

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setInvited(true);
    setTimeout(() => {
      router.push("/implementing-agencies");
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/implementing-agencies"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 hover:no-underline"
        >
          <ArrowLeft size={14} />
          <span>Back to Implementing Agencies</span>
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
        <div>
          <h1 className="font-heading text-lg font-extrabold text-slate-950">Invite Implementing Agency (NGO)</h1>
          <p className="text-xs text-slate-500 font-medium">
            Search existing reusable NGO Master profile or invite an agency to establish a Corporate–NGO Membership
          </p>
        </div>

        {invited ? (
          <div className="rounded-2xl bg-emerald-50 p-6 border border-emerald-200 text-center space-y-2">
            <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
            <h3 className="text-sm font-bold text-emerald-900">Invitation Dispatched Successfully</h3>
            <p className="text-xs text-emerald-700">
              An invitation token and onboarding link have been transmitted to {email}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendInvite} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700">NGO Darpan Registration ID (Optional)</label>
              <input
                type="text"
                placeholder="e.g. MH/2022/0312456"
                value={searchDarpan}
                onChange={(e) => setSearchDarpan(e.target.value)}
                className="w-full mt-1 rounded-xl border border-slate-200 p-2.5 text-xs font-mono focus:border-blue-600 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-400 font-medium">
                If the NGO is already registered on MahaCSR, their verified master records will automatically link.
              </p>
            </div>

            <div>
              <label className="font-bold text-slate-700">NGO Official Contact Email</label>
              <input
                type="email"
                required
                placeholder="e.g. contact@foundation.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <Link
                href="/implementing-agencies"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:no-underline"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-800"
              >
                <Send size={13} />
                <span>Send Formal Invitation</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

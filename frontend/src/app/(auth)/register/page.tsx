"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, CheckCircle2, Landmark, Sparkles } from "lucide-react";

type RegistrationProfile = "CORPORATE" | "GOVERNMENT";

const profiles = [
  {
    id: "CORPORATE" as const,
    title: "Corporate Partner",
    description: "Register with MCA21 CIN to submit CSR enquiries, commit funds, sign MoUs, and review project progress.",
    icon: Building2,
  },
  {
    id: "GOVERNMENT" as const,
    title: "Government Department",
    description: "Register state departments or district local bodies to post CSR requirements and receive corporate proposals.",
    icon: Landmark,
  },
];

export default function RegistrationProfilePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<RegistrationProfile>("CORPORATE");

  const continueRegistration = () => {
    sessionStorage.removeItem("register_step");
    sessionStorage.removeItem("corporate_register_step");
    router.push(selected === "GOVERNMENT" ? "/register/government" : "/register/corporate");
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#050c18] via-[#09162e] to-[#0d1d3a] px-4 py-24 font-sans text-slate-900">
      <div className="pointer-events-none absolute right-0 top-0 h-[38rem] w-[38rem] rounded-full bg-gradient-to-br from-amber-500/15 via-orange-600/10 to-transparent blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[40rem] w-[40rem] rounded-full bg-gradient-to-tr from-blue-600/20 via-indigo-600/15 to-transparent blur-[140px]" />
      <section className="relative z-10 flex w-full max-w-3xl flex-col gap-6 rounded-[2.25rem] border border-white/60 bg-white/95 p-7 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.6)] backdrop-blur-3xl sm:p-9">
        <header className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-md">
              <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#09152b]"><Sparkles size={20} className="text-amber-400" /></div>
            </div>
            <div className="min-w-0">
              <h1 className="font-heading text-lg font-extrabold tracking-tight sm:text-xl">MahaCSR Setu Entity Registration</h1>
              <p className="text-[10px] font-semibold text-slate-500 sm:text-xs">Government &amp; Corporate Onboarding Portal</p>
            </div>
          </div>
          <Link href="/login" className="shrink-0 text-[10px] font-extrabold text-blue-900 hover:text-amber-600 hover:no-underline sm:text-xs">Back to Sign In</Link>
        </header>

        <div className="grid grid-cols-3 gap-2.5 text-center text-xs font-extrabold">
          <Step number={1} label="Entity Category" active />
          <Step number={2} label="Details & Location" />
          <Step number={3} label="OTP Verification" />
        </div>

        <div className="text-center">
          <h2 className="font-heading text-xl font-extrabold">Select Registration Profile</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">Choose your organization category to continue to the correct registration workflow</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {profiles.map((profile) => {
            const active = selected === profile.id;
            const Icon = profile.icon;
            return (
              <button key={profile.id} type="button" onClick={() => setSelected(profile.id)} aria-pressed={active} className={`relative flex min-h-44 flex-col gap-3 rounded-3xl border-2 p-6 text-left transition-all ${active ? "scale-[1.02] border-blue-900 bg-blue-50/50 shadow-xl" : "border-slate-200/80 bg-slate-50/50 hover:border-slate-300"}`}>
                {active && <CheckCircle2 size={22} className="absolute right-5 top-5 text-blue-900" />}
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${active ? "bg-blue-950 text-amber-400 shadow-md" : "bg-slate-200 text-slate-600"}`}><Icon size={24} /></div>
                <div>
                  <h3 className="font-heading text-base font-extrabold">{profile.title}</h3>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">{profile.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        <button type="button" onClick={continueRegistration} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 px-4 py-3.5 text-xs font-extrabold text-white shadow-lg transition hover:scale-[1.01] hover:shadow-xl">
          Continue to Registration Details <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </button>
      </section>
    </main>
  );
}

function Step({ number, label, active = false }: { number: number; label: string; active?: boolean }) {
  return <div className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 ${active ? "border-blue-950 bg-blue-950 text-white shadow-md" : "border-slate-200 bg-slate-50 text-slate-400"}`}><span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-extrabold ${active ? "bg-white/20" : "bg-slate-100"}`}>{number}</span><span className="hidden sm:inline">{label}</span></div>;
}

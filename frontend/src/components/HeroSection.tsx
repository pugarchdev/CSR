"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Landmark, Network, ShieldCheck } from "lucide-react";
import dynamic from "next/dynamic";

const ImpactSphere = dynamic(() => import("@/components/ImpactSphere"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#ff7a1a] border-t-transparent animate-spin" />
        <span className="text-xs text-blue-200/60 font-semibold">Loading interactive sphere...</span>
      </div>
    </div>
  )
});



export default function HeroSection() {
  return (
    <section className="mahacsr-hero relative overflow-hidden bg-[#062a5d]">
      <div className="absolute inset-0 bg-[url('/mahacsr_hero_hd.png')] bg-cover bg-[72%_center] bg-no-repeat" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#061b43_0%,rgba(6,27,67,0.98)_36%,rgba(6,27,67,0.62)_66%,rgba(6,27,67,0.18)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(39,128,255,0.24),transparent_38%)]" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#f5f7fb] via-transparent to-transparent" />

      <div className="relative mx-auto max-w-[1180px] px-4 pb-20 pt-10 sm:px-6 md:px-8 md:pb-24 md:pt-14 lg:pb-36">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
          
          {/* Left Column: Text & Actions */}
          <div className="w-full max-w-[680px]">
            <div className="mb-7 inline-flex max-w-full items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm backdrop-blur sm:text-[11px]">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-white/25 text-[9px]">MH</span>
              <span className="truncate">Maharashtra CSR Authority (MahaCSR)</span>
            </div>

            <h1 className="w-full max-w-[calc(100vw-2rem)] break-words text-[31px] font-extrabold leading-[1.08] tracking-normal text-white min-[420px]:text-[34px] sm:max-w-[650px] sm:text-[42px] md:text-[54px] lg:text-[60px]">
              State-wide platform
              <span className="block">for</span>
              <span className="block text-[#ff982f]">Corporate Social</span>
              <span className="block text-[#54c948]">Responsibility</span>
            </h1>

            <p className="mt-6 w-full max-w-[calc(100vw-2rem)] break-words text-[15px] font-medium leading-7 text-blue-50/90 sm:max-w-[560px] md:text-base">
              Empowering development through institutional synergy. Connect corporate capital with verified grassroots NGOs across 36 districts of Maharashtra on a fully audited, compliance-backed platform.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/marketplace"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ff7a1a] px-6 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(249,115,22,0.28)] transition hover:bg-[#ea6508] hover:no-underline"
              >
                Explore Project Directory
                <ArrowRight size={17} />
              </Link>
              <Link
                href="/register"
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/45 bg-white/5 px-6 text-sm font-extrabold text-white transition hover:bg-white/12 hover:no-underline"
              >
                Register Organization
              </Link>
            </div>
          </div>

          {/* Right Column: Dynamic ThreeJS Network Globe */}
          {/* <div className="w-full flex justify-center lg:justify-end">
            <div className="w-full max-w-[400px] relative">
              <ImpactSphere />
            </div>
          </div> */}

        </div>

        {/* Floating Trust Items Bar */}
       
      </div>
    </section>
  );
}

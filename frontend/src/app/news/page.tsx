"use client";

import React from "react";
import { Newspaper, Calendar, ArrowUpRight, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import Link from "next/link";

const newsList = [
  { id: "1", title: "Maharashtra tops India in cumulative CSR capital sourcing for FY25-26", excerpt: "The state has successfully captured over 18% of India's aggregate corporate social expenditures, with heavy focuses in Gadchiroli, Washim, and Nandurbar.", date: "June 15, 2026", readTime: "4 min read" },
  { id: "2", title: "CSR Commissioner Pravin Darade advocates milestone-based escrow integration", excerpt: "In a recent summit, Commissioner Darade detailed how smart escrow structures have eliminated project delays and raised compliance verification to 98%.", date: "June 11, 2026", readTime: "5 min read" },
  { id: "3", title: "Pune Zilla Parishad partners with corporate trust for 100 Smart Classrooms", excerpt: "The partnership will deliver digital screens, internet links, and science modules to tribal rural schools in Haveli and Mulshi talukas.", date: "May 29, 2026", readTime: "3 min read" }
];

export default function NewsPage() {
  return (
    <div className="px-6 md:px-12 py-12 max-w-5xl mx-auto flex flex-col gap-8 bg-slate-950 text-slate-100 min-h-screen">
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-6">
        <span className="text-[#f97316] font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
          <Newspaper size={14} /> MAHARASHTRA SOCIAL REGISTRY PRESS
        </span>
        <h1 className="font-heading font-extrabold text-4xl text-slate-100 tracking-tight">News & updates</h1>
        <p className="text-slate-400 text-sm">Read the latest publications, state industrial reviews, and corporate partnership news across Maharashtra.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {newsList.map((item) => (
          <div key={item.id} className="glass-card p-6 rounded-3xl border border-slate-800 flex flex-col justify-between h-full hover:translate-y-[-2px] transition-all">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                <span className="flex items-center gap-1"><Calendar size={12} /> {item.date}</span>
                <span>{item.readTime}</span>
              </div>
              <h3 className="font-heading font-bold text-lg text-slate-100 leading-snug">{item.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{item.excerpt}</p>
            </div>
            <Link href={`/news`} className="text-[#f97316] font-bold text-xs flex items-center gap-1 mt-6 group">
              Read article <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

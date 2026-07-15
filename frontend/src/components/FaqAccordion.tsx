"use client";

import { useState } from "react";

interface FaqItem {
  q: string;
  a: string;
}

interface FaqAccordionProps {
  faqs: FaqItem[];
}

export default function FaqAccordion({ faqs }: FaqAccordionProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <section className="flex flex-col gap-12 max-w-3xl mx-auto w-full relative z-10">
      <div className="text-center flex flex-col gap-3">
        <h2 className="font-heading font-bold text-3xl text-slate-50">Common Questions</h2>
        <p className="text-slate-300 text-sm">Answers to regulatory, audit, and operational concerns.</p>
      </div>

      <div className="flex flex-col gap-4">
        {faqs.map((faq, idx) => (
          <div key={idx} className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
            <button 
              onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
              className="w-full text-left p-5 font-bold text-slate-100 flex justify-between items-center hover:bg-slate-955 transition-colors"
            >
              <span>{faq.q}</span>
              <span className="text-[#f7941d] text-xl leading-none">{activeFaq === idx ? "−" : "+"}</span>
            </button>
            {activeFaq === idx && (
              <div className="p-5 bg-slate-955/40 text-slate-300 text-sm leading-relaxed border-t border-slate-800">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

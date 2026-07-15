"use client";

import React, { useState } from "react";
import { MessageSquare, Landmark, Send, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function FeedbackPortalPage() {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [type, setType] = useState("Suggestion");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setText("");
      alert("Feedback Submitted! Thank you for helping us optimize Maharashtra's CSR operations.");
    }, 1200);
  };

  return (
    <div className="px-6 md:px-12 py-12 max-w-4xl mx-auto flex flex-col gap-10 bg-slate-950 text-slate-100 min-h-screen">
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-6">
        <span className="text-[#f7941d] font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
          <MessageSquare size={14} /> PUBLIC GRIEVANCE & OPINION UNIT
        </span>
        <h1 className="font-heading font-extrabold text-4xl text-slate-100 tracking-tight">Citizen Feedback Portal</h1>
        <p className="text-slate-400 text-sm">Submit suggestions, file complaints, or rate the ease-of-use of the MahaCSR digital platform.</p>
      </div>

      <div className="glass-panel p-8 rounded-3xl border border-slate-800 max-w-2xl w-full flex flex-col gap-6 mx-auto">
        <h3 className="font-heading font-bold text-xl text-slate-100 flex items-center gap-2">
          <Landmark size={18} className="text-[#f7941d]" />
          Submit Feedback Form
        </h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-xs font-medium text-slate-400">
          <div className="flex flex-col gap-2">
            <span>Feedback Type:</span>
            <div className="flex gap-4">
              {["Suggestion", "Grievance", "Appreciation"].map((t) => (
                <label key={t} className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-200">
                  <input 
                    type="radio" 
                    name="feedback-type" 
                    value={t} 
                    checked={type === t}
                    onChange={() => setType(t)}
                    className="accent-[#f7941d]"
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span>Overall Portal Rating:</span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star}
                  type="button" 
                  onClick={() => setRating(star)}
                  className={`p-1 hover:scale-110 transition-transform ${star <= rating ? "text-[#f7941d]" : "text-slate-650"}`}
                >
                  <Star size={20} fill={star <= rating ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span>Details / Message:</span>
            <textarea 
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write your suggestions or report platform issues here..."
              className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 h-32 focus:outline-none focus:border-violet-500" 
              required 
            />
          </div>

          <Button type="submit" disabled={submitted} className="flex items-center justify-center gap-2 py-3 shadow-md">
            <Send size={14} /> {submitted ? "Submitting..." : "Submit Feedback"}
          </Button>
        </form>
      </div>
    </div>
  );
}

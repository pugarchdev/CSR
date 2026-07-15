"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, API_BASE_URL, getAccessToken } from "@/lib/api";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import { Button } from "@/components/ui/Button";
import { PlusCircle, FileText, ArrowLeft, Loader2, UploadCloud, Trash2, CheckCircle2 } from "lucide-react";

const CATEGORIES = [
  "EDUCATION", "HEALTH", "WATER", "SANITATION", "SKILL_DEVELOPMENT",
  "ENVIRONMENT", "WOMEN_EMPOWERMENT", "AGRICULTURE", "ANIMAL_HUSBANDRY",
  "RURAL_DEVELOPMENT", "SPORTS", "OTHER"
];

const SDG_GOALS = [
  "SDG 1: No Poverty", "SDG 2: Zero Hunger", "SDG 3: Good Health & Well-being",
  "SDG 4: Quality Education", "SDG 5: Gender Equality", "SDG 6: Clean Water & Sanitation",
  "SDG 7: Affordable & Clean Energy", "SDG 8: Decent Work & Economic Growth",
  "SDG 9: Industry, Innovation & Infrastructure", "SDG 10: Reduced Inequality",
  "SDG 11: Sustainable Cities & Communities", "SDG 12: Responsible Consumption & Production",
  "SDG 13: Climate Action", "SDG 14: Life Below Water", "SDG 15: Life on Land",
  "SDG 16: Peace, Justice & Strong Institutions", "SDG 17: Partnerships for the Goals"
];

export default function NewCSRRequirement() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  // Form states
  const [form, setForm] = useState({
    title: "",
    category: "EDUCATION",
    description: "",
    district: "Pune",
    taluka: "",
    village: "",
    city: "",
    address: "",
    estimatedCost: "",
    beneficiaryCount: "",
    expectedImpact: "",
    priorityLevel: "MEDIUM",
    completionTimeline: "6 months",
    contactPersonName: "",
    contactPersonPhone: "",
    contactPersonEmail: "",
    agencyType: "Gram Panchayat",
    sdgGoals: [] as string[],
    declarationAccepted: false
  });

  // Supporting docs state
  const [uploadedDocs, setUploadedDocs] = useState<Array<{
    title: string;
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    documentCategory: string;
  }>>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  useEffect(() => {
    // Check if profile exists first
    apiFetch<any>("/csr-dashboard/stats")
      .then(stats => {
        if (!stats.hasProfile) {
          router.replace("/beneficiary/dashboard");
        } else {
          setHasProfile(true);
          // Autofill profile info
          const p = stats.profile;
          setForm(prev => ({
            ...prev,
            district: p.district || prev.district,
            taluka: p.taluka || "",
            village: p.village || "",
            city: p.city || "",
            address: p.address || "",
            contactPersonName: p.contactPerson || "",
            contactPersonPhone: p.contactPhone || "",
            contactPersonEmail: p.contactEmail || "",
            agencyType: p.agencyType || "Gram Panchayat"
          }));
        }
      })
      .catch(() => router.replace("/beneficiary/dashboard"))
      .finally(() => setProfileLoading(false));
  }, [router]);

  const handleSdgChange = (goal: string) => {
    setForm(prev => {
      const selected = prev.sdgGoals.includes(goal)
        ? prev.sdgGoals.filter(g => g !== goal)
        : [...prev.sdgGoals, goal];
      return { ...prev, sdgGoals: selected };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    setUploadingDoc(true);
    try {
      const token = getAccessToken();
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();

      setUploadedDocs(prev => [
        ...prev,
        {
          title: file.name.split(".")[0],
          fileUrl: data.url,
          fileName: file.name,
          fileType: file.type || "application/pdf",
          fileSize: data.bytes || file.size,
          documentCategory: "supporting_document"
        }
      ]);
    } catch (err: any) {
      alert("Failed to upload document. Please try again.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleRemoveDoc = (index: number) => {
    setUploadedDocs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (submitForVerification: boolean) => {
    if (!form.declarationAccepted) {
      alert("Please accept the terms and declaration first.");
      return;
    }

    setLoading(true);
    try {
      // 1. Create requirement
      const requirement = await apiFetch<any>("/csr-requirements", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          submitForVerification
        })
      });

      // 2. Upload supporting documents
      if (uploadedDocs.length > 0) {
        for (const doc of uploadedDocs) {
          await apiFetch(`/csr-requirements/${requirement.id}/documents`, {
            method: "POST",
            body: JSON.stringify(doc)
          });
        }
      }

      alert(submitForVerification 
        ? "CSR Requirement submitted successfully for District verification!" 
        : "CSR Requirement draft saved successfully!"
      );
      router.push("/beneficiary/dashboard");
    } catch (err: any) {
      alert(err.message || "Failed to create requirement");
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-blue-900" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4 border-slate-200">
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => router.back()} 
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full"
          >
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-xl font-bold font-heading text-blue-950">Post New CSR Requirement</h1>
            <p className="text-xs text-slate-500">Provide detail of social / rural requirements to invite corporate sponsors</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Fields */}
        <div className="lg:col-span-2 space-y-6">
          <GovCard>
            <GovCardHeader className="bg-slate-50 border-b">
              <GovCardTitle>Project Details</GovCardTitle>
            </GovCardHeader>
            <GovCardBody className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Requirement Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Installation of Solar Water Purifier in GP School"
                  className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-900 focus:outline-none"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Category / Sector *</label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-900 focus:outline-none bg-white"
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Priority Level *</label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-900 focus:outline-none bg-white"
                    value={form.priorityLevel}
                    onChange={e => setForm({ ...form, priorityLevel: e.target.value })}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Estimated Cost (INR) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 450000"
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-900 focus:outline-none"
                    value={form.estimatedCost}
                    onChange={e => setForm({ ...form, estimatedCost: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Beneficiary Count *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 350"
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-900 focus:outline-none"
                    value={form.beneficiaryCount}
                    onChange={e => setForm({ ...form, beneficiaryCount: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Requirement / Need Description *</label>
                <textarea
                  required
                  placeholder="Elaborate the requirement, existing problems, and why this project is critical."
                  className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-900 focus:outline-none"
                  rows={4}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Expected Social Impact *</label>
                <textarea
                  required
                  placeholder="Expected results: e.g. clean drinking water access to 350 school children, reducing absenteeism by 40%."
                  className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-900 focus:outline-none"
                  rows={2}
                  value={form.expectedImpact}
                  onChange={e => setForm({ ...form, expectedImpact: e.target.value })}
                />
              </div>
            </GovCardBody>
          </GovCard>

          {/* Location details */}
          <GovCard>
            <GovCardHeader className="bg-slate-50 border-b">
              <GovCardTitle>Location details</GovCardTitle>
            </GovCardHeader>
            <GovCardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">District *</label>
                  <input
                    type="text"
                    disabled
                    className="w-full border rounded px-3 py-2 text-sm bg-slate-100 text-slate-600"
                    value={form.district}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Taluka *</label>
                  <input
                    type="text"
                    required
                    placeholder="Haveli"
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-900 focus:outline-none"
                    value={form.taluka}
                    onChange={e => setForm({ ...form, taluka: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Village</label>
                  <input
                    type="text"
                    placeholder="Shikrapur"
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-900 focus:outline-none"
                    value={form.village}
                    onChange={e => setForm({ ...form, village: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Specific Site Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ZP Primary School, Shikrapur, Haveli"
                  className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-900 focus:outline-none"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </GovCardBody>
          </GovCard>

          {/* SDG Goals */}
          <GovCard>
            <GovCardHeader className="bg-slate-50 border-b">
              <GovCardTitle>UN SDG Goals Alignment</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SDG_GOALS.map(goal => {
                  const checked = form.sdgGoals.includes(goal);
                  return (
                    <label key={goal} className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-slate-50 transition-colors border border-slate-100">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={() => handleSdgChange(goal)}
                      />
                      <span className="text-xs text-slate-700 font-medium">{goal}</span>
                    </label>
                  );
                })}
              </div>
            </GovCardBody>
          </GovCard>
        </div>

        {/* Sidebar panels (Documents, Actions) */}
        <div className="space-y-6">
          {/* Documents upload */}
          <GovCard>
            <GovCardHeader className="bg-slate-50 border-b">
              <GovCardTitle>Supporting Documents</GovCardTitle>
            </GovCardHeader>
            <GovCardBody className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:border-blue-900 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  onChange={handleFileUpload}
                  disabled={uploadingDoc}
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                />
                <div className="flex flex-col items-center gap-2">
                  <UploadCloud className="text-slate-400" size={32} />
                  <span className="text-xs font-bold text-slate-700">
                    {uploadingDoc ? "Uploading to Cloudinary..." : "Drag files or click to upload"}
                  </span>
                  <span className="text-[10px] text-slate-500">PDF, JPG, PNG up to 10MB</span>
                </div>
              </div>

              {uploadedDocs.length > 0 && (
                <div className="space-y-2 mt-4">
                  {uploadedDocs.map((doc, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileText size={16} className="text-slate-500 shrink-0" />
                        <span className="truncate font-semibold text-slate-800">{doc.fileName}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveDoc(idx)} 
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </GovCardBody>
          </GovCard>

          {/* Guidelines */}
          <GovCard>
            <GovCardHeader className="bg-slate-50 border-b">
              <GovCardTitle>Declaration & Terms</GovCardTitle>
            </GovCardHeader>
            <GovCardBody className="space-y-4">
              <div className="text-[11px] leading-relaxed text-slate-600 space-y-2">
                <p>
                  1. The requirement submitted belongs to a genuine government facility or village necessity.
                </p>
                <p>
                  2. All specifications, estimated costs, and supporting evidence are correct.
                </p>
                <p>
                  3. We agree to monitor the project milestones and facilitate execution with select NGO.
                </p>
              </div>

              <label className="flex items-start gap-2 cursor-pointer pt-2 border-t border-slate-100">
                <input
                  type="checkbox"
                  required
                  className="mt-1"
                  checked={form.declarationAccepted}
                  onChange={e => setForm({ ...form, declarationAccepted: e.target.checked })}
                />
                <span className="text-xs font-bold text-slate-700 leading-tight">
                  I accept and declare that the information is true *
                </span>
              </label>
            </GovCardBody>
          </GovCard>

          {/* Submission Buttons */}
          <div className="space-y-3">
            <Button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit(true)}
              className="w-full bg-[#f7941d] hover:bg-[#e07f00] text-white font-bold text-sm py-3 shadow"
            >
              {loading ? "Submitting..." : "Submit for Verification"}
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit(false)}
              className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold text-sm py-3 shadow"
            >
              Save as Draft
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

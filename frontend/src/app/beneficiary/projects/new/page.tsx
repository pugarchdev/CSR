"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, API_BASE_URL, getAccessToken } from "@/lib/api";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, TextArea, Select } from "@/components/ui/Input";
import { PlusCircle, FileText, ArrowLeft, Loader2, UploadCloud, Trash2 } from "lucide-react";

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
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  const categoryOptions = CATEGORIES.map(cat => ({
    value: cat,
    label: cat.replace(/_/g, " ")
  }));

  const priorityOptions = [
    { value: "LOW", label: "LOW" },
    { value: "MEDIUM", label: "MEDIUM" },
    { value: "HIGH", label: "HIGH" },
    { value: "CRITICAL", label: "CRITICAL" }
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4 border-gray-200">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => router.back()} 
            className="rounded-full p-2"
          >
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Post New CSR Requirement</h1>
            <p className="text-sm text-gray-500">Provide detail of social / rural requirements to invite corporate sponsors</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Fields */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Project Details</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Requirement Title"
                type="text"
                required
                placeholder="e.g. Installation of Solar Water Purifier in GP School"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Category / Sector"
                  required
                  options={categoryOptions}
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                />
                <Select
                  label="Priority Level"
                  required
                  options={priorityOptions}
                  value={form.priorityLevel}
                  onChange={e => setForm({ ...form, priorityLevel: e.target.value })}
                />
                <Input
                  label="Estimated Cost (INR)"
                  type="number"
                  required
                  placeholder="e.g. 450000"
                  value={form.estimatedCost}
                  onChange={e => setForm({ ...form, estimatedCost: e.target.value })}
                />
                <Input
                  label="Beneficiary Count"
                  type="number"
                  required
                  placeholder="e.g. 350"
                  value={form.beneficiaryCount}
                  onChange={e => setForm({ ...form, beneficiaryCount: e.target.value })}
                />
              </div>

              <TextArea
                label="Requirement / Need Description"
                required
                placeholder="Elaborate the requirement, existing problems, and why this project is critical."
                rows={4}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />

              <TextArea
                label="Expected Social Impact"
                required
                placeholder="Expected results: e.g. clean drinking water access to 350 school children, reducing absenteeism by 40%."
                rows={2}
                value={form.expectedImpact}
                onChange={e => setForm({ ...form, expectedImpact: e.target.value })}
              />
            </CardContent>
          </Card>

          {/* Location details */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Location Details</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="District"
                  type="text"
                  disabled
                  value={form.district}
                />
                <Input
                  label="Taluka"
                  type="text"
                  required
                  placeholder="Haveli"
                  value={form.taluka}
                  onChange={e => setForm({ ...form, taluka: e.target.value })}
                />
                <Input
                  label="Village"
                  type="text"
                  placeholder="Shikrapur"
                  value={form.village}
                  onChange={e => setForm({ ...form, village: e.target.value })}
                />
              </div>

              <Input
                label="Specific Site Address"
                type="text"
                required
                placeholder="e.g. ZP Primary School, Shikrapur, Haveli"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
              />
            </CardContent>
          </Card>

          {/* SDG Goals */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">UN SDG Goals Alignment</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SDG_GOALS.map(goal => {
                  const checked = form.sdgGoals.includes(goal);
                  return (
                    <label key={goal} className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
                      <input
                        type="checkbox"
                        className="mt-1 rounded text-primary-600 focus:ring-primary-500"
                        checked={checked}
                        onChange={() => handleSdgChange(goal)}
                      />
                      <span className="text-xs text-gray-700 font-medium">{goal}</span>
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar panels (Documents, Actions) */}
        <div className="space-y-6">
          {/* Documents upload */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Supporting Documents</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-200 hover:border-primary-500 rounded-xl p-6 text-center transition-colors cursor-pointer relative">
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  onChange={handleFileUpload}
                  disabled={uploadingDoc}
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                />
                <div className="flex flex-col items-center gap-2">
                  <UploadCloud className="text-gray-400" size={32} />
                  <span className="text-sm font-semibold text-gray-700">
                    {uploadingDoc ? "Uploading to Cloudinary..." : "Drag files or click to upload"}
                  </span>
                  <span className="text-xs text-gray-500">PDF, JPG, PNG up to 10MB</span>
                </div>
              </div>

              {uploadedDocs.length > 0 && (
                <div className="space-y-2 mt-4">
                  {uploadedDocs.map((doc, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileText size={16} className="text-gray-400 shrink-0" />
                        <span className="truncate font-medium text-gray-800">{doc.fileName}</span>
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
            </CardContent>
          </Card>

          {/* Guidelines */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Declaration & Terms</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-xs leading-relaxed text-gray-600 space-y-2">
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

              <label className="flex items-start gap-2.5 cursor-pointer pt-3 border-t border-gray-100">
                <input
                  type="checkbox"
                  required
                  className="mt-0.5 rounded text-primary-600 focus:ring-primary-500"
                  checked={form.declarationAccepted}
                  onChange={e => setForm({ ...form, declarationAccepted: e.target.checked })}
                />
                <span className="text-xs font-semibold text-gray-700 leading-tight">
                  I accept and declare that the information is true *
                </span>
              </label>
            </CardContent>
          </Card>

          {/* Submission Buttons */}
          <div className="space-y-3">
            <Button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit(true)}
              className="w-full text-white font-semibold text-sm py-3 justify-center shadow-md bg-saffron hover:bg-orange-600 transition-colors"
            >
              {loading ? "Submitting..." : "Submit for Verification"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => handleSubmit(false)}
              className="w-full font-semibold text-sm py-3 justify-center shadow-sm"
            >
              Save as Draft
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import { Button } from "@/components/ui/Button";
import { PlusCircle, FileText, Landmark, Clock, Users, ArrowRight, UserPlus, CheckCircle } from "lucide-react";

interface DashboardStats {
  hasProfile: boolean;
  profile?: any;
  totalRequirements: number;
  pendingVerification: number;
  verified: number;
  active: number;
  completed: number;
  ngoApplicationsReceived: number;
  companyInterestsReceived: number;
  totalEstimatedCost: number;
  totalReceivedFunds: number;
}

export default function BeneficiaryDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentRequirements, setRecentRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile Form States (for profile creation modal/section)
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileForm, setProfileForm] = useState({
    agencyName: "",
    agencyType: "Gram Panchayat", // default
    district: "Pune",
    taluka: "",
    village: "",
    city: "",
    address: "",
    pincode: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    designation: "",
    website: ""
  });
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [onboarding, setOnboarding] = useState<{ onboardingStatus?: string } | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) return;
    fetchDashboardData();
    apiFetch<{ onboardingStatus?: string }>("/onboarding/status")
      .then(setOnboarding)
      .catch(() => setOnboarding(null));
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const statsData = await apiFetch<DashboardStats>("/csr-dashboard/stats");
      setStats(statsData);

      if (statsData.hasProfile) {
        const reqs = await apiFetch<any[]>("/csr-requirements/my");
        setRecentRequirements(reqs.slice(0, 5)); // show recent 5
      }
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProfile(true);
    try {
      await apiFetch("/csr-requirements/profile", {
        method: "POST",
        body: JSON.stringify(profileForm)
      });
      setShowProfileForm(false);
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || "Failed to save profile");
    } finally {
      setSubmittingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
          <p className="text-red-700 font-medium">Error loading dashboard: {error}</p>
          <Button onClick={fetchDashboardData} className="mt-2 bg-red-800 text-white hover:bg-red-950">Retry</Button>
        </div>
      </div>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "VERIFIED":
      case "MARKETPLACE_LISTED":
      case "AGREEMENT_SIGNED":
      case "COMPLETED":
        return "success";
      case "PENDING_VERIFICATION":
      case "FIELD_VERIFICATION_REQUIRED":
      case "AGREEMENT_PENDING":
        return "warning";
      case "REJECTED":
      case "CANCELLED":
        return "danger";
      case "DRAFT":
      default:
        return "muted";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">
            Government Department Console
          </h1>
          <p className="text-blue-100 text-sm mt-1">
            {stats?.hasProfile 
              ? `${stats.profile.agencyName} (${stats.profile.agencyType}) — District: ${stats.profile.district}`
              : "Welcome to MahaCSR Portal. Please set up your government department profile to get started."}
          </p>
        </div>
        {stats?.hasProfile && (
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Button 
              onClick={() => router.push("/department/pitches/create")}
              className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white font-bold flex items-center gap-2 border-none shadow"
            >
              <PlusCircle size={18} />
              Pitch a Development Need
            </Button>
            <Button 
              onClick={() => router.push("/beneficiary/projects/new")}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold flex items-center gap-2 border-none shadow"
            >
              <PlusCircle size={18} />
              Create Department CSR Requirement
            </Button>
          </div>
        )}
      </div>

      {/* Onboarding status banner */}
      {onboarding && !["APPROVED"].includes(onboarding.onboardingStatus || "") &&
        (() => {
          const s = onboarding.onboardingStatus || "";
          const inReview = ["SUBMITTED_FOR_REVIEW", "UNDER_VERIFICATION"].includes(s);
          const needsAction = ["REJECTED", "CLARIFICATION_REQUIRED"].includes(s);
          return (
            <div className={`rounded-lg border p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
              inReview ? "bg-amber-50 border-amber-300" : needsAction ? "bg-rose-50 border-rose-300" : "bg-blue-50 border-blue-300"
            }`}>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {inReview ? "Onboarding under review" : needsAction ? "Onboarding needs attention" : "Complete your organization onboarding"}
                </h2>
                <p className="text-sm text-slate-700 mt-0.5">
                  {inReview
                    ? "Your documents have been submitted. An administrator is verifying them. You will be notified once approved."
                    : needsAction
                    ? "Your submission was returned. Please review the remarks and resubmit your details."
                    : "Complete your department profile and upload verification documents so an administrator can approve your account."}
                </p>
              </div>
              <Button
                onClick={() => router.push(inReview ? "/organization/onboarding/status" : "/organization/onboarding")}
                className="bg-blue-900 text-white hover:bg-blue-950 font-bold px-6 shrink-0"
              >
                {inReview ? "View Status" : needsAction ? "Update & Resubmit" : "Start Onboarding"}
              </Button>
            </div>
          );
        })()}

      {/* Profile check banner */}
      {!stats?.hasProfile && !showProfileForm && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-4">
            <div className="bg-orange-100 text-orange-600 p-3 rounded-full h-12 w-12 flex items-center justify-center">
              <Landmark size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-orange-950">Government Department Profile Required</h2>
              <p className="text-orange-800 text-sm">
                Government departments and beneficiary departments must register their official profile before creating CSR requirements.
              </p>
            </div>
          </div>
          <Button 
            onClick={() => {
              setProfileForm({
                ...profileForm,
                contactEmail: stats?.profile?.contactEmail || ""
              });
              setShowProfileForm(true);
            }}
            className="bg-blue-900 text-white hover:bg-blue-950 font-bold px-6 shrink-0 flex items-center gap-2"
          >
            <UserPlus size={18} />
            Complete Profile Now
          </Button>
        </div>
      )}

      {/* Profile Form Section */}
      {showProfileForm && (
        <GovCard>
          <GovCardHeader className="bg-slate-50 border-b border-slate-200">
            <GovCardTitle>Register Government Department Profile</GovCardTitle>
          </GovCardHeader>
          <GovCardBody>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Government Department Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zilla Parishad Pune, Municipal Hospital"
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-900 focus:outline-none"
                    value={profileForm.agencyName}
                    onChange={e => setProfileForm({ ...profileForm, agencyName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Department Type *</label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-900 focus:outline-none bg-white"
                    value={profileForm.agencyType}
                    onChange={e => setProfileForm({ ...profileForm, agencyType: e.target.value })}
                  >
                    <option value="Gram Panchayat">Gram Panchayat</option>
                    <option value="Zilla Parishad">Zilla Parishad</option>
                    <option value="Municipal Corporation">Municipal Corporation</option>
                    <option value="Government Hospital">Government Hospital</option>
                    <option value="Government School">Government School</option>
                    <option value="Police Department">Police Department</option>
                    <option value="District Administration">District Administration</option>
                    <option value="Other Government Entity">Other Government Entity</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">District *</label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-900 focus:outline-none bg-white"
                    value={profileForm.district}
                    onChange={e => setProfileForm({ ...profileForm, district: e.target.value })}
                  >
                    <option value="Pune">Pune</option>
                    <option value="Mumbai City">Mumbai City</option>
                    <option value="Mumbai Suburban">Mumbai Suburban</option>
                    <option value="Nagpur">Nagpur</option>
                    <option value="Thane">Thane</option>
                    <option value="Nashik">Nashik</option>
                    <option value="Aurangabad">Aurangabad</option>
                    <option value="Solapur">Solapur</option>
                    <option value="Amravati">Amravati</option>
                    <option value="Kolhapur">Kolhapur</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Taluka *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Haveli"
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-900 focus:outline-none"
                    value={profileForm.taluka}
                    onChange={e => setProfileForm({ ...profileForm, taluka: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Village (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Shikrapur"
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-900 focus:outline-none"
                    value={profileForm.village}
                    onChange={e => setProfileForm({ ...profileForm, village: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">City/Town</label>
                  <input
                    type="text"
                    placeholder="e.g. Pune"
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-900 focus:outline-none"
                    value={profileForm.city}
                    onChange={e => setProfileForm({ ...profileForm, city: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Office Address *</label>
                  <textarea
                    required
                    placeholder="Complete postal address of the office"
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-900 focus:outline-none"
                    rows={2}
                    value={profileForm.address}
                    onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Pincode *</label>
                  <input
                    type="text"
                    required
                    placeholder="6 digits pincode"
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-900 focus:outline-none"
                    value={profileForm.pincode}
                    onChange={e => setProfileForm({ ...profileForm, pincode: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full name of authority"
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-900 focus:outline-none"
                    value={profileForm.contactPerson}
                    onChange={e => setProfileForm({ ...profileForm, contactPerson: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Contact Person Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="official.email@maharashtra.gov.in"
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-900 focus:outline-none"
                    value={profileForm.contactEmail}
                    onChange={e => setProfileForm({ ...profileForm, contactEmail: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Contact Mobile/Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="10 digit mobile number"
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-900 focus:outline-none"
                    value={profileForm.contactPhone}
                    onChange={e => setProfileForm({ ...profileForm, contactPhone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Block Development Officer, Headmaster"
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-900 focus:outline-none"
                    value={profileForm.designation}
                    onChange={e => setProfileForm({ ...profileForm, designation: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Website (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-900 focus:outline-none"
                    value={profileForm.website}
                    onChange={e => setProfileForm({ ...profileForm, website: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button 
                  type="button" 
                  onClick={() => setShowProfileForm(false)} 
                  className="bg-slate-200 text-slate-800 hover:bg-slate-300"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submittingProfile} 
                  className="bg-blue-900 text-white hover:bg-blue-950 font-bold"
                >
                  {submittingProfile ? "Registering..." : "Save Profile Details"}
                </Button>
              </div>
            </form>
          </GovCardBody>
        </GovCard>
      )}

      {/* Metrics Cards */}
      {stats?.hasProfile && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <GovCard>
            <GovCardBody className="flex items-center gap-4">
              <div className="bg-blue-100 text-blue-900 p-3 rounded-lg">
                <FileText size={24} />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Listed</p>
                <h3 className="text-2xl font-extrabold text-blue-900 mt-1">{stats.totalRequirements}</h3>
              </div>
            </GovCardBody>
          </GovCard>

          <GovCard>
            <GovCardBody className="flex items-center gap-4">
              <div className="bg-orange-100 text-orange-600 p-3 rounded-lg">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Verification Queue</p>
                <h3 className="text-2xl font-extrabold text-orange-600 mt-1">{stats.pendingVerification}</h3>
              </div>
            </GovCardBody>
          </GovCard>

          <GovCard>
            <GovCardBody className="flex items-center gap-4">
              <div className="bg-green-100 text-green-700 p-3 rounded-lg">
                <CheckCircle size={24} />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Empanelled NGOs Applied</p>
                <h3 className="text-2xl font-extrabold text-green-700 mt-1">{stats.ngoApplicationsReceived}</h3>
              </div>
            </GovCardBody>
          </GovCard>

          <GovCard>
            <GovCardBody className="flex items-center gap-4">
              <div className="bg-indigo-100 text-indigo-700 p-3 rounded-lg">
                <Users size={24} />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider font-sans">Pledged CSR Funds</p>
                <h3 className="text-2xl font-extrabold text-indigo-900 mt-1">
                  ₹{Number(stats.totalReceivedFunds).toLocaleString()}
                </h3>
              </div>
            </GovCardBody>
          </GovCard>
        </div>
      )}

      {/* Main Grid for recent requirements & activities */}
      {stats?.hasProfile && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Requirements list */}
          <div className="lg:col-span-2 space-y-4">
            <GovCard>
              <GovCardHeader className="bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <GovCardTitle>Your Posted CSR Requirements</GovCardTitle>
                <Button 
                  onClick={() => router.push("/beneficiary/projects")} 
                  className="bg-transparent hover:bg-slate-100 text-blue-900 font-bold text-xs flex items-center gap-1 border border-slate-200"
                >
                  View All
                  <ArrowRight size={14} />
                </Button>
              </GovCardHeader>
              <GovCardBody className="p-0">
                {recentRequirements.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <p className="font-medium text-slate-700">No CSR Requirements listed yet.</p>
                    <p className="text-xs mt-1">Submit your requirements to attract empanelled NGOs and corporate funding.</p>
                    <Button 
                      onClick={() => router.push("/beneficiary/projects/new")} 
                      className="mt-4 bg-blue-900 text-white font-bold"
                    >
                      Post Your First Requirement
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 font-bold text-slate-700">
                        <tr>
                          <th className="px-6 py-3 text-left">Requirement Title</th>
                          <th className="px-6 py-3 text-left">Category</th>
                          <th className="px-6 py-3 text-left">Estimated Cost</th>
                          <th className="px-6 py-3 text-left">Status</th>
                          <th className="px-6 py-3 text-left">Responses</th>
                          <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {recentRequirements.map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-900 max-w-[200px] truncate">
                              {req.title}
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              {req.category}
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-800">
                              ₹{Number(req.estimatedCost).toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                              <GovStatusBadge variant={getStatusVariant(req.status)}>
                                {req.status.replace(/_/g, " ")}
                              </GovStatusBadge>
                            </td>
                            <td className="px-6 py-4 text-slate-600 text-xs space-y-0.5">
                              <div>NGO Apps: <span className="font-bold text-blue-900">{req._count.ngoApplications}</span></div>
                              <div>Company: <span className="font-bold text-indigo-700">{req._count.companyInterests}</span></div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button 
                                onClick={() => {
                                  const dest = pathname.startsWith("/department") || pathname.startsWith("/beneficiary")
                                    ? `/department/requirements/${req.id}`
                                    : `/csr-marketplace/${req.id}`;
                                  router.push(dest);
                                }}
                                className="bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs py-1 px-3"
                              >
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GovCardBody>
            </GovCard>
          </div>

          {/* Quick Info & Guidelines */}
          <div className="space-y-4">
            <GovCard>
              <GovCardHeader className="bg-slate-50 border-b border-slate-200">
                <GovCardTitle>MahaCSR Guidelines</GovCardTitle>
              </GovCardHeader>
              <GovCardBody className="space-y-4 text-xs leading-relaxed text-slate-600">
                <div className="bg-blue-50 border-l-2 border-blue-900 p-3 rounded">
                  <h4 className="font-bold text-blue-950 mb-1">Tripartite Marketplace Model</h4>
                  <p>
                    1. <strong>Post Requirement:</strong> Fill details, upload support documents, and submit.<br />
                    2. <strong>Verification:</strong> District Admin verifies requirements.<br />
                    3. <strong>Bidding / Applications:</strong> Empanelled NGOs apply with plans.<br />
                    4. <strong>Funding:</strong> Companies show interest and pledge funds.<br />
                    5. <strong>Execution:</strong> NGO executes, company monitors, beneficiary tracks progress.
                  </p>
                </div>
                <div className="bg-orange-50 border-l-2 border-orange-500 p-3 rounded">
                  <h4 className="font-bold text-orange-950 mb-1">Required Supporting Documents</h4>
                  <p>
                    Ensure you attach a signed requisition letter, site pictures, and cost estimation sheets to expedite verification.
                  </p>
                </div>
              </GovCardBody>
            </GovCard>
          </div>
        </div>
      )}
    </div>
  );
}

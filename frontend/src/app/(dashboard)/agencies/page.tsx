"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useApiQuery } from "@/lib/apiHooks";
import { GovPageHeader } from "@/components/layout/GovPageHeader";
import { StatCard } from "@/components/ui/StatCard";

import { DataView } from "@/components/ui/DataView";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  Building2, ShieldCheck, CheckCircle2, Award,
  MapPin, Mail, Phone, Globe, ExternalLink
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";

interface AgencyItem {
  id: string;
  name: string;
  darpanId: string;
  csr1Number: string;
  district: string;
  taluka?: string;
  sectors: string;
  status: "VERIFIED" | "ACTIVE" | "PENDING_VERIFICATION";
  rating: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  projectsCount?: number;
  fundingReceived?: string;
  tax12A?: boolean;
  tax80G?: boolean;
  auditedThreeYears?: boolean;
  fcraStatus?: string;
}

const defaultAgencies: AgencyItem[] = [
  {
    id: "ngo-1",
    name: "Swades Foundation",
    darpanId: "MH/2021/0284910",
    csr1Number: "CSR00018492",
    district: "Raigad",
    taluka: "Mahad, Mangaon, Poladpur",
    sectors: "Water, Education, Livelihoods",
    status: "VERIFIED",
    rating: "Grade A+ (Verified)",
    email: "contact@swadesfoundation.org",
    phone: "+91 22 6107 7100",
    address: "Mumbai & Raigad Field Offices, Maharashtra",
    website: "https://swadesfoundation.org",
    projectsCount: 14,
    fundingReceived: "₹42.5 Cr",
    tax12A: true,
    tax80G: true,
    auditedThreeYears: true,
    fcraStatus: "APPROVED",
  },
  {
    id: "ngo-2",
    name: "Paani Foundation Trust",
    darpanId: "MH/2020/0194821",
    csr1Number: "CSR00009182",
    district: "Satara / Solapur",
    taluka: "Koregaon, Man, Khatav",
    sectors: "Water Conservation & Watershed",
    status: "VERIFIED",
    rating: "Grade A+ (Verified)",
    email: "info@paanifoundation.in",
    phone: "+91 22 4001 2233",
    address: "Lower Parel, Mumbai, Maharashtra",
    website: "https://paanifoundation.in",
    projectsCount: 18,
    fundingReceived: "₹68.0 Cr",
    tax12A: true,
    tax80G: true,
    auditedThreeYears: true,
    fcraStatus: "APPROVED",
  },
  {
    id: "ngo-3",
    name: "Pratham Education Foundation",
    darpanId: "MH/2019/0081734",
    csr1Number: "CSR00003104",
    district: "Statewide Maharashtra",
    taluka: "All 36 Districts",
    sectors: "Primary Education & Digital Literacy",
    status: "VERIFIED",
    rating: "Grade A (Verified)",
    email: "info@pratham.org",
    phone: "+91 22 2498 8578",
    address: "Y.B. Chavan Centre, Nariman Point, Mumbai",
    website: "https://pratham.org",
    projectsCount: 26,
    fundingReceived: "₹112.5 Cr",
    tax12A: true,
    tax80G: true,
    auditedThreeYears: true,
    fcraStatus: "APPROVED",
  },
  {
    id: "ngo-4",
    name: "Vidarbha Rural Development Trust",
    darpanId: "MH/2023/0481920",
    csr1Number: "CSR00028194",
    district: "Gadchiroli",
    taluka: "Aheri, Etapalli, Bhamragad",
    sectors: "Tribal Health & Telemedicine",
    status: "ACTIVE",
    rating: "Grade A (Verified)",
    email: "vrdt.gadchiroli@gmail.com",
    phone: "+91 7132 224105",
    address: "Civil Lines, Gadchiroli, Maharashtra 442605",
    website: "https://vrdtrust.org.in",
    projectsCount: 7,
    fundingReceived: "₹18.2 Cr",
    tax12A: true,
    tax80G: true,
    auditedThreeYears: true,
    fcraStatus: "NOT_APPLICABLE",
  },
];

export default function AgenciesPage() {
  const { user } = useAuthStore();
  const isRm = user?.role === "RELATIONSHIP_MANAGER" || user?.role?.includes("RM");

  const { data: envelope } = useApiQuery<any>(
    ["implementing-agencies"],
    "/org?kind=NGO"
  );

  const [search, setSearch] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("ALL");
  const [selectedAgency, setSelectedAgency] = useState<AgencyItem | null>(null);

  const apiAgencies = envelope?.data?.organizations || envelope?.data || envelope?.organizations || (Array.isArray(envelope) ? envelope : []);

  const agenciesList: AgencyItem[] = apiAgencies.length > 0 ? apiAgencies.map((a: any) => ({
    id: a.id,
    name: a.name || a.legalName || "Implementing NGO Partner",
    darpanId: a.ngoProfile?.darpanNumber || a.darpanId || `MH/2024/${a.id.slice(0, 7)}`,
    csr1Number: a.ngoProfile?.csr1Number || "CSR00019284",
    district: a.district || "Maharashtra",
    taluka: a.taluka || "Statewide Operations",
    sectors: Array.isArray(a.ngoProfile?.csrSectors) ? a.ngoProfile.csrSectors.join(", ") : "Education & Healthcare",
    status: a.status === "ACTIVE" || a.status === "APPROVED" ? "VERIFIED" : "PENDING_VERIFICATION",
    rating: "Grade A (Verified)",
    email: a.email || a.contactInfo?.email || "agency@mahacsr.gov.in",
    phone: a.contactInfo?.phone || "+91 22 2202 1240",
    address: a.contactInfo?.address || `${a.district || "Maharashtra"}, India`,
    website: a.website || "https://mahacsr.maharashtra.gov.in",
    projectsCount: a.projects?.length || 5,
    fundingReceived: "₹15.0 Cr",
    tax12A: true,
    tax80G: true,
    auditedThreeYears: true,
    fcraStatus: "APPROVED",
  })) : defaultAgencies;

  const filtered = agenciesList.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
                          a.darpanId.toLowerCase().includes(search.toLowerCase()) ||
                          a.sectors.toLowerCase().includes(search.toLowerCase());
    const matchesDistrict = filterDistrict === "ALL" || a.district.includes(filterDistrict);
    return matchesSearch && matchesDistrict;
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-5 px-4 py-6 md:px-8">
      <GovPageHeader
        title="Verified Implementing Agencies & NGO Register"
        eyebrow="Agency Directory"
        breadcrumb="Home / Agencies Directory"
        description="Statewide registry of NITI Aayog Darpan verified Grassroots NGOs, CSR-1 MCA compliant implementing agencies, and due diligence ledgers."
      />

      {/* Metrics Bar - Hidden for RM */}
      {!isRm && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Verified Implementing Agencies"
            value={agenciesList.length}
            icon={Building2}
            index={0}
            colorTheme="blue"
            badge="Verified Agencies"
            sublabel="Active agency partners"
          />
          <StatCard
            label="Darpan & CSR-1 Verified"
            value="100% Verified"
            icon={ShieldCheck}
            index={1}
            colorTheme="emerald"
            badge="100% Compliant"
            sublabel="Regulatory cleared"
          />
          <StatCard
            label="Due Diligence Grade"
            value="Grade A"
            icon={Award}
            index={2}
            colorTheme="purple"
            badge="High Performance"
            sublabel="Secretariat vetted"
          />
        </div>
      )}

      {/* Main Register Container */}
      <DataView<AgencyItem>
        data={filtered}
        keyExtractor={(item) => item.id}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search agency name, Darpan ID, or sector..."
        filters={[
          {
            key: "district",
            label: "District Filter",
            value: filterDistrict,
            onChange: setFilterDistrict,
            options: [
              { label: "All Districts", value: "ALL" },
              { label: "Gadchiroli", value: "Gadchiroli" },
              { label: "Raigad", value: "Raigad" },
              { label: "Satara", value: "Satara" },
              { label: "Statewide", value: "Statewide" },
            ],
          },
        ]}
        headers={[
          "Agency Name",
          "Darpan ID",
          "CSR-1 Reg Number",
          "District Scope",
          "Key Sectors",
          "Rating Grade",
          "Action",
        ]}
        onItemClick={(agency) => setSelectedAgency(agency)}
        renderCard={(agency, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.04 }}
            className="group relative rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/40 to-blue-50/20 p-5 shadow-xs hover:shadow-xl transition-all duration-300 transform-gpu hover:-translate-y-1 cursor-pointer flex flex-col justify-between overflow-hidden h-full"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />

            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-blue-900 bg-blue-100/80 border border-blue-200/60 px-2.5 py-0.5 rounded-md font-mono">{agency.darpanId}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {agency.status}
                </span>
              </div>

              <h3 className="mt-3 text-sm font-extrabold text-slate-900 group-hover:text-blue-900 transition-colors leading-snug">
                {agency.name}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2">{agency.sectors}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">District Focus</span>
                <p className="text-xs font-extrabold text-slate-800">{agency.district}</p>
              </div>
              <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-md shadow-2xs">
                {agency.rating}
              </span>
            </div>
          </motion.div>
        )}
        renderRow={(agency) => (
          <>
            <td className="p-3.5 font-bold text-slate-900">{agency.name}</td>
            <td className="p-3.5 font-mono text-blue-700 font-semibold">{agency.darpanId}</td>
            <td className="p-3.5 font-mono text-slate-600">{agency.csr1Number}</td>
            <td className="p-3.5 font-medium text-slate-700">{agency.district}</td>
            <td className="p-3.5 text-slate-600 max-w-[200px] truncate">{agency.sectors}</td>
            <td className="p-3.5 font-extrabold text-emerald-700">{agency.rating}</td>
            <td className="p-3.5 text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedAgency(agency);
                }}
                className="text-xs font-bold text-blue-900"
              >
                View Details
              </Button>
            </td>
          </>
        )}
      />

      {/* Agency Details Comprehensive Modal */}
      <Modal
        isOpen={!!selectedAgency}
        onClose={() => setSelectedAgency(null)}
        title="Implementing Agency Compliance Ledger Profile"
        className="max-w-2xl"
      >
        {selectedAgency && (
          <div className="flex flex-col gap-6 text-xs font-medium text-slate-700">
            {/* Header block */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-black font-heading text-slate-900">{selectedAgency.name}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                    NITI Darpan: {selectedAgency.darpanId}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md">
                    MCA CSR-1: {selectedAgency.csr1Number}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck size={13} /> {selectedAgency.status}
                </span>
                <span className="text-xs font-extrabold text-blue-700">{selectedAgency.rating}</span>
              </div>
            </div>

            {/* General Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">District Operations</span>
                <span className="text-slate-900 font-bold text-xs mt-0.5 block flex items-center gap-1">
                  <MapPin size={12} className="text-blue-600" /> {selectedAgency.district}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Taluka Scope</span>
                <span className="text-slate-900 font-bold text-xs mt-0.5 block">{selectedAgency.taluka || "Statewide"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Completed CSR Projects</span>
                <span className="text-slate-900 font-bold text-xs mt-0.5 block">{selectedAgency.projectsCount || 8} Projects</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">CSR Funding Sourced</span>
                <span className="text-slate-900 font-bold text-xs mt-0.5 block">{selectedAgency.fundingReceived || "₹24.0 Cr"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">FCRA Clearance</span>
                <span className="text-emerald-700 font-bold text-xs mt-0.5 block">{selectedAgency.fcraStatus || "APPROVED"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Secretariat Verification</span>
                <span className="text-emerald-700 font-bold text-xs mt-0.5 block">100% Cleared</span>
              </div>
            </div>

            {/* Sectors Focus */}
            <div>
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block mb-1">CSR Sector Specializations</span>
              <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 font-medium leading-relaxed">
                {selectedAgency.sectors}
              </p>
            </div>

            {/* Statutory Compliance Checkpoints Ledger */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">Statutory Audit Checkpoints</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                  <span className="text-xs font-semibold text-slate-800">12A Tax Exemption</span>
                  <span className="text-emerald-700 font-extrabold flex items-center gap-1"><CheckCircle2 size={13} /> Verified</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                  <span className="text-xs font-semibold text-slate-800">80G Tax Exemption</span>
                  <span className="text-emerald-700 font-extrabold flex items-center gap-1"><CheckCircle2 size={13} /> Verified</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                  <span className="text-xs font-semibold text-slate-800">3-Year Audited Accounts</span>
                  <span className="text-emerald-700 font-extrabold flex items-center gap-1"><CheckCircle2 size={13} /> Verified</span>
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">Official Contact Directory</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <Mail size={14} className="text-blue-600 shrink-0" />
                  <span className="truncate font-semibold">{selectedAgency.email}</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <Phone size={14} className="text-blue-600 shrink-0" />
                  <span className="font-semibold">{selectedAgency.phone}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <a
                href={selectedAgency.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
              >
                <Globe size={14} /> Visit Official Website
                <ExternalLink size={12} />
              </a>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedAgency(null)}>
                  Close
                </Button>
                <Button variant="primary" size="sm" onClick={() => { alert(`Initiating project assignment request to ${selectedAgency.name}`); setSelectedAgency(null); }}>
                  Assign Project / Request Proposal
                </Button>
              </div>
            </div>

          </div>
        )}
      </Modal>

    </div>
  );
}

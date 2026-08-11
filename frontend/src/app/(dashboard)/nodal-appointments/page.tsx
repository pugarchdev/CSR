"use client";

import { useState } from "react";
import { Users, UserPlus, MapPin, Search, CheckCircle2, Shield, Calendar } from "lucide-react";
import { GovPageHeader } from "@/components/layout/GovPageHeader";
import { StatCard } from "@/components/ui/StatCard";

interface NodalAssignment {
  id: string;
  projectName: string;
  district: string;
  department: string;
  assignedOfficer: string | null;
  designation: string | null;
  status: "ASSIGNED" | "PENDING_APPOINTMENT";
  targetDate: string;
}

const mockAssignments: NodalAssignment[] = [
  {
    id: "nod-1",
    projectName: "Tribal Student Digital Learning Infrastructure",
    district: "Gadchiroli",
    department: "Tribal Development Department",
    assignedOfficer: null,
    designation: null,
    status: "PENDING_APPOINTMENT",
    targetDate: "2026-08-01",
  },
  {
    id: "nod-2",
    projectName: "District Hospital Neonatal Care Unit",
    district: "Nandurbar",
    department: "Public Health Department",
    assignedOfficer: "Dr. Suresh Patil",
    designation: "District Health Officer (DHO)",
    status: "ASSIGNED",
    targetDate: "2026-07-28",
  },
  {
    id: "nod-3",
    projectName: "Water Harvesting & Check Dam Construction",
    district: "Chhatrapati Sambhajinagar",
    department: "Water Resources Department",
    assignedOfficer: "Shri Rajesh Deshmukh",
    designation: "Superintending Engineer",
    status: "ASSIGNED",
    targetDate: "2026-07-15",
  },
];

export default function NodalAppointmentsPage() {
  const [items, setItems] = useState<NodalAssignment[]>(mockAssignments);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<NodalAssignment | null>(null);
  const [officerName, setOfficerName] = useState("");
  const [designation, setDesignation] = useState("");

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !officerName) return;

    setItems(prev => prev.map(item => item.id === selectedItem.id ? {
      ...item,
      assignedOfficer: officerName,
      designation: designation || "District Nodal Officer",
      status: "ASSIGNED"
    } : item));

    setSelectedItem(null);
    setOfficerName("");
    setDesignation("");
  };

  const filtered = items.filter(item =>
    item.projectName.toLowerCase().includes(search.toLowerCase()) ||
    item.district.toLowerCase().includes(search.toLowerCase()) ||
    item.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
      <GovPageHeader
        title="District Nodal Officer Appointments"
        description="Appoint and manage government District Nodal Officers (DNO) responsible for field monitoring and MoU execution."
        eyebrow="Joint Secretariat Desk"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending Appointments"
          value={items.filter(i => i.status === "PENDING_APPOINTMENT").length}
          icon={UserPlus}
          index={0}
          colorTheme="amber"
          badge="Awaiting DNO"
          sublabel="Awaiting DNO designation"
        />
        <StatCard
          label="Active Nodal Officers"
          value={items.filter(i => i.status === "ASSIGNED").length}
          icon={CheckCircle2}
          index={1}
          colorTheme="emerald"
          badge="Assigned"
          sublabel="Assigned to field monitoring"
        />
        <StatCard
          label="Total Projects Gated"
          value={items.length}
          icon={Users}
          index={2}
          colorTheme="blue"
          badge="State Matrix"
          sublabel="State Convergence Matrix"
        />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="mb-6 max-w-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by project, district, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
              <tr>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">District</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Assigned Nodal Officer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-900 max-w-xs">{item.projectName}</td>
                  <td className="px-4 py-3.5 text-slate-700">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                      <MapPin size={12} className="text-blue-600" /> {item.district}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{item.department}</td>
                  <td className="px-4 py-3.5">
                    {item.assignedOfficer ? (
                      <div>
                        <p className="font-bold text-blue-900">{item.assignedOfficer}</p>
                        <p className="text-[10px] text-slate-400">{item.designation}</p>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      item.status === "ASSIGNED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setOfficerName(item.assignedOfficer || "");
                        setDesignation(item.designation || "");
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 transition-colors"
                    >
                      <UserPlus size={12} /> {item.assignedOfficer ? "Reassign" : "Appoint"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Appointment Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Appoint District Nodal Officer</h3>
            <p className="mt-1 text-xs text-slate-500">{selectedItem.projectName} ({selectedItem.district})</p>

            <form onSubmit={handleAssign} className="mt-4 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Officer Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. John Doe"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Designation & Department</label>
                <input
                  type="text"
                  placeholder="e.g. District Planning Officer / CEO Zilla Parishad"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-900 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800"
                >
                  Confirm Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

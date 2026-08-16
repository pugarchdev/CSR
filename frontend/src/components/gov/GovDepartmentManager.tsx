"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Mail,
  Phone,
  UserCheck,
  ShieldCheck,
  Layers,
  ChevronRight,
  Info
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

export interface SubDepartmentItem {
  id: string;
  name: string;
  code?: string | null;
  type?: string | null;
  description?: string | null;
  officeAddress?: string | null;
  officialEmail?: string | null;
  officialPhone?: string | null;
  departmentHead?: string | null;
  dnoName?: string | null;
  status: "ACTIVE" | "INACTIVE";
}

interface Props {
  organizationName?: string;
  isReadOnly?: boolean;
}

export default function GovDepartmentManager({ organizationName = "Government Organization", isReadOnly = false }: Props) {
  const [departments, setDepartments] = useState<SubDepartmentItem[]>([
    {
      id: "demo-1",
      name: "Health Department",
      code: "NMC-HLTH",
      type: "Public Health & Sanitation",
      description: "Manages public hospitals, immunization drives, sanitation, and urban healthcare centers.",
      officeAddress: "Civic Centre, Mahanagar Palika, Civil Lines, Nagpur",
      officialEmail: "health@nmcnagpur.gov.in",
      officialPhone: "+91-712-2567890",
      departmentHead: "Dr. Deepak Sharma (Medical Officer of Health)",
      dnoName: "Shri Rajesh Verma (Assistant Commissioner)",
      status: "ACTIVE"
    },
    {
      id: "demo-2",
      name: "Electrical Department",
      code: "NMC-ELEC",
      type: "Infrastructure & Energy",
      description: "Oversees street lighting, solar microgrids, municipal building electrification, and EV charging stations.",
      officeAddress: "Electrical Div Office, NMC Complex, Civil Lines, Nagpur",
      officialEmail: "electrical@nmcnagpur.gov.in",
      officialPhone: "+91-712-2567891",
      departmentHead: "Er. Sanjay Kulkarni (Executive Engineer - Electrical)",
      dnoName: "Shri Rajesh Verma (Assistant Commissioner)",
      status: "ACTIVE"
    },
    {
      id: "demo-3",
      name: "Education Department",
      code: "NMC-EDU",
      type: "Social Welfare & Education",
      description: "Administers municipal primary & secondary schools, digital classroom initiatives, and student scholarships.",
      officeAddress: "Education Wing, NMC Admin Building, Civil Lines, Nagpur",
      officialEmail: "education@nmcnagpur.gov.in",
      officialPhone: "+91-712-2567892",
      departmentHead: "Mrs. Sunita Deshmukh (Education Officer)",
      dnoName: "Shri Rajesh Verma (Assistant Commissioner)",
      status: "ACTIVE"
    },
    {
      id: "demo-4",
      name: "Solid Waste Management Department",
      code: "NMC-SWM",
      type: "Environmental Management",
      description: "Door-to-door waste collection, material recovery facilities, composting, and landfill management.",
      officeAddress: "SWM Cell, Mahanagar Palika Bhavan, Civil Lines, Nagpur",
      officialEmail: "swm@nmcnagpur.gov.in",
      officialPhone: "+91-712-2567893",
      departmentHead: "Shri Gajendra Patil (Director - Solid Waste Management)",
      dnoName: "Shri Rajesh Verma (Assistant Commissioner)",
      status: "ACTIVE"
    }
  ]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<SubDepartmentItem | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "General Department",
    description: "",
    officeAddress: "",
    officialEmail: "",
    officialPhone: "",
    departmentHead: "",
    dnoName: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE"
  });

  useEffect(() => {
    fetchSubDepartments();
  }, []);

  const fetchSubDepartments = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/organization/sub-departments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setDepartments(data);
        }
      }
    } catch {
      console.log("Using default department hierarchy preview");
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      code: "",
      type: "General Department",
      description: "",
      officeAddress: "",
      officialEmail: "",
      officialPhone: "",
      departmentHead: "",
      dnoName: "",
      status: "ACTIVE"
    });
    setShowModal(true);
  };

  const handleOpenEdit = (dept: SubDepartmentItem) => {
    setEditingItem(dept);
    setFormData({
      name: dept.name,
      code: dept.code || "",
      type: dept.type || "General Department",
      description: dept.description || "",
      officeAddress: dept.officeAddress || "",
      officialEmail: dept.officialEmail || "",
      officialPhone: dept.officialPhone || "",
      departmentHead: dept.departmentHead || "",
      dnoName: dept.dnoName || "",
      status: dept.status
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);

    try {
      const token = localStorage.getItem("accessToken");
      if (editingItem) {
        // Edit existing
        if (token && !editingItem.id.startsWith("demo-")) {
          await fetch(`${API_BASE_URL}/organization/sub-departments/${editingItem.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(formData)
          });
        }
        setDepartments((prev) =>
          prev.map((d) => (d.id === editingItem.id ? { ...d, ...formData } : d))
        );
      } else {
        // Create new
        const newItem: SubDepartmentItem = {
          id: `dept-${Date.now()}`,
          ...formData
        };

        if (token) {
          const res = await fetch(`${API_BASE_URL}/organization/sub-departments`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(formData)
          });
          if (res.ok) {
            const created = await res.json();
            newItem.id = created.id;
          }
        }
        setDepartments((prev) => [...prev, newItem]);
      }
      setShowModal(false);
    } catch (err) {
      console.error("Failed to save department", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this sub-department?")) return;
    try {
      const token = localStorage.getItem("accessToken");
      if (token && !id.startsWith("demo-")) {
        await fetch(`${API_BASE_URL}/organization/sub-departments/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setDepartments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const filteredDepts = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.code && d.code.toLowerCase().includes(search.toLowerCase())) ||
      (d.type && d.type.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white border border-white/10 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
            <Layers size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-md border border-amber-400/20">
                Department Hierarchy Architecture
              </span>
            </div>
            <h2 className="font-heading font-extrabold text-xl sm:text-2xl mt-1 text-white">
              {organizationName} Sub-Departments
            </h2>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              Manage operational departments, assign Department Heads, and specify District Nodal Officers (DNO)
            </p>
          </div>
        </div>

        {!isReadOnly && (
          <button
            onClick={handleOpenAdd}
            className="py-3 px-5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-extrabold text-xs shadow-lg hover:shadow-xl transition-all flex items-center gap-2 shrink-0 hover:scale-[1.02]"
          >
            <Plus size={18} />
            <span>Create New Department</span>
          </button>
        )}
      </div>

      {/* Visual Hierarchy Tree Map */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Info size={16} className="text-blue-900" />
            <span>Entity Organizational Hierarchy Structure:</span>
          </div>
          <span className="text-[11px] font-bold text-slate-500">Total Departments: {departments.length}</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2 font-extrabold text-blue-950 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
            <Building2 size={16} className="text-blue-900" />
            <span>{organizationName}</span>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
          <div className="flex flex-wrap items-center gap-2">
            {departments.slice(0, 4).map((d) => (
              <span key={d.id} className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold">
                {d.name}
              </span>
            ))}
            {departments.length > 4 && (
              <span className="text-[11px] font-bold text-slate-500">+ {departments.length - 4} more</span>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search departments by name, code, or type..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20"
          />
        </div>
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDepts.map((dept) => (
          <motion.div
            key={dept.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-extrabold text-base text-slate-900">{dept.name}</h3>
                    {dept.code && (
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        {dept.code}
                      </span>
                    )}
                  </div>
                  {dept.type && <p className="text-xs font-semibold text-blue-900 mt-0.5">{dept.type}</p>}
                </div>

                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                    dept.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {dept.status}
                </span>
              </div>

              {dept.description && (
                <p className="text-xs text-slate-600 font-medium leading-relaxed">{dept.description}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                {dept.departmentHead && (
                  <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <UserCheck size={14} className="text-amber-600 shrink-0" />
                    <span className="truncate" title={dept.departmentHead}>Head: {dept.departmentHead}</span>
                  </div>
                )}
                {dept.dnoName && (
                  <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <ShieldCheck size={14} className="text-blue-900 shrink-0" />
                    <span className="truncate" title={dept.dnoName}>DNO: {dept.dnoName}</span>
                  </div>
                )}
                {dept.officialEmail && (
                  <div className="flex items-center gap-2 text-slate-600 font-medium">
                    <Mail size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{dept.officialEmail}</span>
                  </div>
                )}
                {dept.officialPhone && (
                  <div className="flex items-center gap-2 text-slate-600 font-medium">
                    <Phone size={13} className="text-slate-400 shrink-0" />
                    <span>{dept.officialPhone}</span>
                  </div>
                )}
              </div>
            </div>

            {!isReadOnly && (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleOpenEdit(dept)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Edit2 size={13} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(dept.id)}
                  className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-extrabold text-lg text-white">
                    {editingItem ? "Edit Sub-Department" : "Create New Sub-Department"}
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">
                    Configure operational department details & representative assignments
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-xs font-bold text-slate-800">Department Name *</label>
                    <input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Solid Waste Management Department"
                      className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-800">Department Code</label>
                    <input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="e.g. NMC-SWM"
                      className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-800">Department Type</label>
                    <input
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      placeholder="e.g. Environmental Services"
                      className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>

                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-xs font-bold text-slate-800">Description</label>
                    <textarea
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief role and responsibilities of this department"
                      className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-800">Department Head</label>
                    <input
                      value={formData.departmentHead}
                      onChange={(e) => setFormData({ ...formData, departmentHead: e.target.value })}
                      placeholder="e.g. Dr. John Doe (Director)"
                      className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-800">Assigned DNO</label>
                    <input
                      value={formData.dnoName}
                      onChange={(e) => setFormData({ ...formData, dnoName: e.target.value })}
                      placeholder="e.g. Shri John Doe (Assistant Commissioner)"
                      className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-800">Official Email</label>
                    <input
                      type="email"
                      value={formData.officialEmail}
                      onChange={(e) => setFormData({ ...formData, officialEmail: e.target.value })}
                      placeholder="e.g. contact@example.com"
                      className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-800">Official Phone</label>
                    <input
                      value={formData.officialPhone}
                      onChange={(e) => setFormData({ ...formData, officialPhone: e.target.value })}
                      placeholder="e.g. 1234567890"
                      className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>

                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-xs font-bold text-slate-800">Office Address</label>
                    <input
                      value={formData.officeAddress}
                      onChange={(e) => setFormData({ ...formData, officeAddress: e.target.value })}
                      placeholder="Full office location address"
                      className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-800">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as "ACTIVE" | "INACTIVE" })}
                      className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="py-2.5 px-5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="py-2.5 px-6 rounded-xl bg-blue-950 text-white text-xs font-extrabold hover:bg-blue-900 shadow-md transition-all"
                  >
                    {loading ? "Saving..." : editingItem ? "Save Changes" : "Create Department"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

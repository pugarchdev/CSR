"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, AlertTriangle, ArrowRight, Building2, Check, CheckCircle2, Clock, Coins, Compass, ExternalLink, Eye, FileText, HeartHandshake, HelpCircle, LayoutGrid, List, Loader2, Mail, MapPin, Phone, Plus, RefreshCw, Save, Search, ShieldAlert, ShieldCheck, Target, ToggleLeft, ToggleRight, Trash2, Upload, User, UserCheck, XCircle } from "lucide-react";
import { apiFetch, API_BASE_URL, getAccessToken } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import GovModal from "@/components/gov/GovModal";
import { useToastActions } from "@/components/ui/Toast";
import { useResponsiveViewMode } from "@/hooks/useResponsiveViewMode";

type Tenant = {
  id: string;
  name: string;
  code: string;
  state: string;
  status: string;
  domain?: string | null;
  isHidden?: boolean;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  features?: TenantFeature[];
  organizations?: Organization[];
  _count?: { organizations?: number; features?: number };
};

type TenantFeature = {
  id: string;
  tenantId: string;
  featureKey: string;
  isEnabled: boolean;
  configJson?: unknown;
};

type Organization = {
  id: string;
  tenantId?: string;
  organizationType: string;
  kind?: string;
  name: string;
  email?: string | null;
  officialEmail?: string | null;
  phone?: string | null;
  address?: string | null;
  district?: string | null;
  taluka?: string | null;
  registrationNumber?: string | null;
  cin?: string | null;
  pan?: string | null;
  gst?: string | null;
  onboardingStatus: string;
  status: string;
  clarificationRemarks?: string | null;
  rejectionReason?: string | null;
  tenant?: { id: string; name: string; code: string };
  documents?: Array<{ id: string; documentType: string; fileUrl: string; verificationStatus: string }>;
};

type Permission = {
  id: string;
  key: string;
  description?: string | null;
  module: string;
};

type OrgRole = {
  id: string;
  name: string;
  description?: string | null;
  scope: string;
  isSystemRole: boolean;
  rolePermissions?: Array<{ permission: Permission }>;
  _count?: { userRoles?: number };
};

type OrgUser = {
  id: string;
  email: string;
  role: string;
  accountStatus: string;
  isVerified: boolean;
  organizationRoles?: Array<{ role: OrgRole }>;
  createdAt: string;
};

type AuditLog = {
  id: string;
  tenantId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
  user?: { email: string };
};

const statusVariant = (status?: string) => {
  const value = status || "";
  if (["ACTIVE", "APPROVED", "VERIFIED", "ENABLED"].includes(value)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (["REJECTED", "SUSPENDED", "DELETED", "DISABLED"].includes(value)) return "border-rose-200 bg-rose-50 text-rose-800";
  if (["SUBMITTED_FOR_REVIEW", "UNDER_VERIFICATION", "CLARIFICATION_REQUIRED", "PENDING"].includes(value)) return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
};

function Badge({ children }: { children: string }) {
  return <span className={`inline-flex whitespace-nowrap rounded border px-2 py-1 text-[11px] font-bold ${statusVariant(children)}`}>{children.replace(/_/g, " ")}</span>;
}

function WorkspaceShell({
  eyebrow,
  title,
  description,
  children,
  actions
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900 font-heading">{title}</h1>
          {eyebrow && (
            <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
              {eyebrow}
            </span>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

function ErrorBox({ error }: { error: string }) {
  if (!error) return null;
  return (
    <div className="flex items-center gap-2 border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
      <AlertCircle size={16} />
      <span>{error}</span>
    </div>
  );
}

function LoadingRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center text-sm text-gov-muted">
        <span className="inline-flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Loading records...</span>
      </td>
    </tr>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center text-sm text-gov-muted">{text}</td>
    </tr>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="relative block w-full md:max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm rounded-xl outline-none focus:border-blue-500 shadow-sm transition-all focus:ring-2 focus:ring-blue-500/10"
      />
    </label>
  );
}

export function MasterTenantsWorkspace() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setTenants(await apiFetch<Tenant[]>("/master/tenants"));
    } catch (err: any) {
      setError(err.message || "Unable to load tenants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return tenants.filter((tenant) => `${tenant.name} ${tenant.code} ${tenant.state}`.toLowerCase().includes(query));
  }, [tenants, search]);

  const updateStatus = async (tenant: Tenant, status: string) => {
    if (!window.confirm(`Change ${tenant.name} to ${status}?`)) return;
    await apiFetch(`/master/tenants/${tenant.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    await load();
  };

  const deleteTenant = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this tenant instance?")) return;
    try {
      await apiFetch(`/master/tenants/${id}`, { method: "DELETE" });
      setTenants((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete tenant");
    }
  };

  const saveTenant = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingTenant) return;
    try {
      const updated = await apiFetch<Tenant>(`/master/tenants/${editingTenant.id}`, {
        method: "PUT",
        body: JSON.stringify(editingTenant)
      });
      setTenants((prev) => prev.map((t) => t.id === updated.id ? updated : t));
      setEditingTenant(null);
    } catch (err: any) {
      setError(err.message || "Failed to update tenant");
    }
  };

  return (
    <WorkspaceShell
      eyebrow="Master Admin"
      title="Portal Instances"
      description="Create, activate, suspend, hide and configure government CSR portal instances."
      actions={<Link href="/master/tenants/create" className="inline-flex min-h-10 items-center gap-2 bg-gov-blue px-4 text-sm font-bold text-white"><Plus size={16} /> Create Tenant</Link>}
    >
      <ErrorBox error={error} />
      <section className="border border-slate-200/60 bg-white/70 backdrop-blur-xl rounded-2xl shadow-glass overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-gov-line p-4 md:flex-row md:items-center md:justify-between">
          <SearchBox value={search} onChange={setSearch} placeholder="Search tenants..." />
          <div className="text-xs font-bold text-gov-muted">{filtered.length} portal instance(s)</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-gov-mist text-[11px] uppercase tracking-wider text-gov-muted">
              <tr>
                <th className="px-5 py-3">Portal Instance</th>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">State</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Features</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gov-line">
              {loading ? <LoadingRow colSpan={6} /> : filtered.length === 0 ? <EmptyRow colSpan={6} text="No tenants found." /> : filtered.map((tenant) => (
                <tr key={tenant.id}>
                  <td className="px-5 py-4 font-bold text-gov-ink">{tenant.name}</td>
                  <td className="px-5 py-4 text-gov-muted">{tenant.code}</td>
                  <td className="px-5 py-4 text-gov-muted">{tenant.state}</td>
                  <td className="px-5 py-4"><Badge>{tenant.status}</Badge></td>
                  <td className="px-5 py-4 text-gov-muted">{tenant._count?.features ?? tenant.features?.length ?? 0}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Link href={`/master/tenants/${tenant.id}`} className="inline-flex items-center gap-1 border border-gov-line px-3 py-2 text-xs font-bold text-gov-blue"><Eye size={14} /> View</Link>
                      <Link href={`/master/tenants/${tenant.id}/features`} className="inline-flex items-center gap-1 border border-gov-line px-3 py-2 text-xs font-bold text-gov-blue"><ShieldCheck size={14} /> Features</Link>
                      <Button size="sm" variant="secondary" onClick={() => setEditingTenant(tenant)}>Edit</Button>
                      <Button size="sm" variant={tenant.status === "ACTIVE" ? "secondary" : "primary"} onClick={() => updateStatus(tenant, tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}>
                        {tenant.status === "ACTIVE" ? "Suspend" : "Activate"}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => deleteTenant(tenant.id)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={saveTenant} className="w-full max-w-2xl bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden flex flex-col">
            <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-extrabold text-gov-navy">Edit Tenant</h2>
              <button type="button" className="text-slate-400 hover:text-slate-600 font-bold" onClick={() => setEditingTenant(null)}>✕</button>
            </div>
            <div className="p-6 overflow-y-auto flex flex-col gap-4 text-xs font-bold text-gov-ink">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  Portal Instance Name
                  <input
                    value={editingTenant.name || ""}
                    onChange={(e) => setEditingTenant({ ...editingTenant, name: e.target.value })}
                    className="border border-gov-line px-3 py-2.5 text-sm font-medium outline-none focus:border-gov-blue"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  Tenant Code
                  <input
                    value={editingTenant.code || ""}
                    onChange={(e) => setEditingTenant({ ...editingTenant, code: e.target.value })}
                    className="border border-gov-line px-3 py-2.5 text-sm font-medium outline-none focus:border-gov-blue"
                    required
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  State
                  <input
                    value={editingTenant.state || ""}
                    onChange={(e) => setEditingTenant({ ...editingTenant, state: e.target.value })}
                    className="border border-gov-line px-3 py-2.5 text-sm font-medium outline-none focus:border-gov-blue"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  Domain
                  <input
                    value={editingTenant.domain || ""}
                    onChange={(e) => setEditingTenant({ ...editingTenant, domain: e.target.value })}
                    className="border border-gov-line px-3 py-2.5 text-sm font-medium outline-none focus:border-gov-blue"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  Primary Color
                  <input
                    value={editingTenant.primaryColor || ""}
                    onChange={(e) => setEditingTenant({ ...editingTenant, primaryColor: e.target.value })}
                    className="border border-gov-line px-3 py-2.5 text-sm font-medium outline-none focus:border-gov-blue"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  Secondary Color
                  <input
                    value={editingTenant.secondaryColor || ""}
                    onChange={(e) => setEditingTenant({ ...editingTenant, secondaryColor: e.target.value })}
                    className="border border-gov-line px-3 py-2.5 text-sm font-medium outline-none focus:border-gov-blue"
                  />
                </label>
              </div>
            </div>
            <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditingTenant(null)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </div>
      )}
    </WorkspaceShell>
  );
}

export function CreateTenantWorkspace() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", code: "", state: "", domain: "", primaryColor: "#1e3a8a", secondaryColor: "#f97316" });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch("/master/tenants", { method: "POST", body: JSON.stringify(form) });
      router.push("/master/tenants");
    } catch (err: any) {
      setError(err.message || "Unable to create tenant");
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkspaceShell eyebrow="Master Admin" title="Create Portal Instance" description="Create a new state or government CSR portal tenant.">
      <ErrorBox error={error} />
      <form onSubmit={submit} className="grid gap-4 border border-gov-line bg-white p-5 shadow-sm md:grid-cols-2">
        {[
          ["name", "Portal Instance Name"],
          ["code", "Tenant Code"],
          ["state", "State"],
          ["domain", "Domain"],
          ["primaryColor", "Primary Color"],
          ["secondaryColor", "Secondary Color"]
        ].map(([key, label]) => (
          <label key={key} className="flex flex-col gap-1.5 text-sm font-bold text-gov-ink">
            {label}
            <input
              value={(form as any)[key]}
              onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
              className="border border-gov-line px-3 py-2.5 text-sm font-medium outline-none focus:border-gov-blue"
              required={["name", "code", "state"].includes(key)}
            />
          </label>
        ))}
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" loading={saving}><Save size={16} className="mr-2" /> Save Portal Instance</Button>
          <Link href="/master/tenants" className="inline-flex min-h-10 items-center border border-gov-line px-4 text-sm font-bold text-gov-blue">Cancel</Link>
        </div>
      </form>
    </WorkspaceShell>
  );
}

export function TenantDetailsWorkspace({ tenantId }: { tenantId: string }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<Tenant>(`/master/tenants/${tenantId}`).then(setTenant).catch((err) => setError(err.message));
  }, [tenantId]);

  return (
    <WorkspaceShell
      eyebrow="Master Admin"
      title={tenant?.name || "Tenant Details"}
      description="Review portal instance status, feature controls and linked organizations."
      actions={<Link href={`/master/tenants/${tenantId}/features`} className="inline-flex min-h-10 items-center gap-2 bg-gov-blue px-4 text-sm font-bold text-white"><ShieldCheck size={16} /> Feature Flags</Link>}
    >
      <ErrorBox error={error} />
      {!tenant ? <section className="border border-gov-line bg-white p-8 text-sm text-gov-muted">Loading tenant...</section> : (
        <section className="grid gap-4 md:grid-cols-4">
          {[
            ["Code", tenant.code],
            ["State", tenant.state],
            ["Status", tenant.status],
            ["Organizations", String(tenant.organizations?.length || tenant._count?.organizations || 0)]
          ].map(([label, value]) => (
            <div key={label} className="border border-gov-line bg-white p-5 shadow-sm">
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-gov-muted">{label}</div>
              <div className="mt-2 text-xl font-extrabold text-gov-navy">{value}</div>
            </div>
          ))}
        </section>
      )}
    </WorkspaceShell>
  );
}

export function TenantFeaturesWorkspace({ tenantId }: { tenantId: string }) {
  const [features, setFeatures] = useState<TenantFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<TenantFeature[]>(`/master/tenants/${tenantId}/features`)
      .then(setFeatures)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const toggle = (featureKey: string) => {
    setFeatures((items) => items.map((item) => item.featureKey === featureKey ? { ...item, isEnabled: !item.isEnabled } : item));
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const saved = await apiFetch<TenantFeature[]>(`/master/tenants/${tenantId}/features`, {
        method: "PUT",
        body: JSON.stringify({ features: features.map(({ featureKey, isEnabled, configJson }) => ({ featureKey, isEnabled, configJson })) })
      });
      setFeatures(saved);
    } catch (err: any) {
      setError(err.message || "Unable to save features");
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkspaceShell
      eyebrow="Master Admin"
      title="Tenant Feature Flags"
      description="Disabled features are hidden by UI configuration and blocked by backend feature guards on protected operations."
      actions={<Button onClick={save} loading={saving}><Save size={16} className="mr-2" /> Save Features</Button>}
    >
      <ErrorBox error={error} />
      <section className="border border-slate-200/60 bg-white/70 backdrop-blur-xl rounded-2xl shadow-glass overflow-hidden">
        <div className="divide-y divide-gov-line">
          {loading ? <div className="p-8 text-sm text-gov-muted">Loading feature flags...</div> : features.map((feature) => (
            <button
              key={feature.featureKey}
              onClick={() => toggle(feature.featureKey)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-gov-mist"
            >
              <div>
                <div className="font-bold text-gov-ink">{feature.featureKey}</div>
                <div className="mt-1 text-xs text-gov-muted">{feature.isEnabled ? "Enabled for this portal instance" : "Disabled and backend-blocked where guarded"}</div>
              </div>
              {feature.isEnabled ? <ToggleRight className="text-emerald-600" size={28} /> : <ToggleLeft className="text-slate-400" size={28} />}
            </button>
          ))}
        </div>
      </section>
    </WorkspaceShell>
  );
}

export function MasterOrganizationsWorkspace() {
  const [items, setItems] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [viewingOrg, setViewingOrg] = useState<Organization | null>(null);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const emptyOrg = {
    tenantId: "",
    organizationType: "NGO",
    name: "",
    email: "",
    phone: "",
    address: "",
    district: "",
    taluka: "",
    registrationNumber: "",
    pan: "",
    gst: "",
  };
  const [newOrg, setNewOrg] = useState(emptyOrg);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await apiFetch<Organization[]>("/master/organizations"));
    } catch (err: any) {
      setError(err.message || "Unable to load organizations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((item) => `${item.name} ${item.organizationType} ${item.district || ""}`.toLowerCase().includes(search.toLowerCase()));

  const deleteOrg = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this organization?")) return;
    try {
      await apiFetch(`/master/organizations/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete organization");
    }
  };

  const saveOrg = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingOrg) return;
    try {
      const updated = await apiFetch<Organization>(`/master/organizations/${editingOrg.id}`, {
        method: "PUT",
        body: JSON.stringify(editingOrg)
      });
      setItems((prev) => prev.map((item) => item.id === updated.id ? updated : item));
      setEditingOrg(null);
    } catch (err: any) {
      setError(err.message || "Failed to update organization");
    }
  };

  const openCreateOrg = async () => {
    setCreatingOrg(true);
    if (tenants.length === 0) {
      try {
        const list = await apiFetch<Tenant[]>("/master/tenants");
        setTenants(list);
        if (list.length > 0) setNewOrg((prev) => ({ ...prev, tenantId: list[0].id }));
      } catch (err: any) {
        setError(err.message || "Unable to load tenants");
      }
    }
  };

  const createOrg = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await apiFetch<Organization>("/master/organizations", {
        method: "POST",
        body: JSON.stringify(newOrg)
      });
      setCreatingOrg(false);
      setNewOrg({ ...emptyOrg, tenantId: tenants[0]?.id || "" });
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to create organization");
    }
  };

  return (
    <WorkspaceShell
      eyebrow="Master Admin"
      title="Organizations"
      description="All NGO, CSR company, department and portal admin organizations across tenant instances."
      actions={
        <Button onClick={openCreateOrg}>
          <Plus size={16} /> Create Organization
        </Button>
      }
    >
      <ErrorBox error={error} />
      <section className="border border-slate-200/60 bg-white/70 backdrop-blur-xl rounded-2xl shadow-glass overflow-hidden">
        <div className="border-b border-gov-line p-4"><SearchBox value={search} onChange={setSearch} placeholder="Search organizations..." /></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-gov-mist text-[11px] uppercase tracking-wider text-gov-muted">
              <tr>
                <th className="px-5 py-3">Organization</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Tenant</th>
                <th className="px-5 py-3">District</th>
                <th className="px-5 py-3">Onboarding</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gov-line">
              {loading ? <LoadingRow colSpan={7} /> : filtered.length === 0 ? <EmptyRow colSpan={7} text="No organizations found." /> : filtered.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-4 font-bold text-gov-ink">{item.name}<div className="text-xs font-medium text-gov-muted">{item.email}</div></td>
                  <td className="px-5 py-4 text-gov-muted">{item.organizationType.replace(/_/g, " ")}</td>
                  <td className="px-5 py-4 text-gov-muted">{item.tenant?.name || item.tenantId}</td>
                  <td className="px-5 py-4 text-gov-muted">{item.district || "-"}</td>
                  <td className="px-5 py-4"><Badge>{item.onboardingStatus}</Badge></td>
                  <td className="px-5 py-4"><Badge>{item.status}</Badge></td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setViewingOrg(item)}>Details</Button>
                      <Button size="sm" variant="primary" onClick={() => setEditingOrg(item)}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => deleteOrg(item.id)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {viewingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-extrabold text-gov-navy">Organization Details</h2>
              <button className="text-slate-400 hover:text-slate-600 font-bold" onClick={() => setViewingOrg(null)}>✕</button>
            </div>
            <div className="p-6 overflow-y-auto flex flex-col gap-4 text-sm text-gov-ink">
              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Legal Name</div>
                  <div className="font-extrabold text-gov-navy mt-0.5">{viewingOrg.name}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Type</div>
                  <div className="font-bold mt-0.5">{viewingOrg.organizationType.replace(/_/g, " ")}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Email</div>
                  <div>{viewingOrg.email || "-"}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Phone</div>
                  <div>{viewingOrg.phone || "-"}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">District</div>
                  <div>{viewingOrg.district || "-"}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Taluka</div>
                  <div>{viewingOrg.taluka || "-"}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Address</div>
                  <div className="truncate max-w-[200px]" title={viewingOrg.address || ""}>{viewingOrg.address || "-"}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Reg Number</div>
                  <div className="font-mono text-xs">{viewingOrg.registrationNumber || "-"}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">PAN</div>
                  <div className="font-mono text-xs">{viewingOrg.pan || "-"}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">GST</div>
                  <div className="font-mono text-xs">{viewingOrg.gst || "-"}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Onboarding Status</div>
                  <div className="mt-1"><Badge>{viewingOrg.onboardingStatus}</Badge></div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Account Status</div>
                  <div className="mt-1"><Badge>{viewingOrg.status}</Badge></div>
                </div>
              </div>
              {(viewingOrg.clarificationRemarks || viewingOrg.rejectionReason) && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex flex-col gap-2">
                  {viewingOrg.clarificationRemarks && (
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase">Clarification Remarks</div>
                      <p className="mt-0.5 text-xs text-slate-700 leading-relaxed">{viewingOrg.clarificationRemarks}</p>
                    </div>
                  )}
                  {viewingOrg.rejectionReason && (
                    <div>
                      <div className="text-xs font-bold text-rose-700 uppercase">Rejection Reason</div>
                      <p className="mt-0.5 text-xs text-rose-700 leading-relaxed">{viewingOrg.rejectionReason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="border-t border-slate-200 px-6 py-4 flex justify-end">
              <Button onClick={() => setViewingOrg(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {editingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={saveOrg} className="w-full max-w-2xl bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-extrabold text-gov-navy">Edit Organization</h2>
              <button type="button" className="text-slate-400 hover:text-slate-600 font-bold" onClick={() => setEditingOrg(null)}>✕</button>
            </div>
            <div className="p-6 overflow-y-auto flex flex-col gap-4 text-xs font-bold text-gov-ink">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  Legal Name
                  <input
                    value={editingOrg.name || ""}
                    onChange={(e) => setEditingOrg({ ...editingOrg, name: e.target.value })}
                    className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  Organization Type
                  <select
                    value={editingOrg.organizationType || ""}
                    onChange={(e) => setEditingOrg({ ...editingOrg, organizationType: e.target.value })}
                    className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                    required
                  >
                    <option value="NGO">NGO</option>
                    <option value="CSR_COMPANY">CSR Company</option>
                    <option value="GOVERNMENT_DEPARTMENT">Government Department</option>
                    <option value="PORTAL_ADMIN_ORG">Portal Admin Organization</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  Email
                  <input
                    type="email"
                    value={editingOrg.email || ""}
                    onChange={(e) => setEditingOrg({ ...editingOrg, email: e.target.value })}
                    className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  Phone
                  <input
                    value={editingOrg.phone || ""}
                    onChange={(e) => setEditingOrg({ ...editingOrg, phone: e.target.value })}
                    className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  District
                  <input
                    value={editingOrg.district || ""}
                    onChange={(e) => setEditingOrg({ ...editingOrg, district: e.target.value })}
                    className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  Taluka
                  <input
                    value={editingOrg.taluka || ""}
                    onChange={(e) => setEditingOrg({ ...editingOrg, taluka: e.target.value })}
                    className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                Address
                <input
                  value={editingOrg.address || ""}
                  onChange={(e) => setEditingOrg({ ...editingOrg, address: e.target.value })}
                  className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                />
              </label>
              <div className="grid grid-cols-3 gap-4">
                <label className="flex flex-col gap-1.5">
                  Registration Number
                  <input
                    value={editingOrg.registrationNumber || ""}
                    onChange={(e) => setEditingOrg({ ...editingOrg, registrationNumber: e.target.value })}
                    className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  PAN
                  <input
                    value={editingOrg.pan || ""}
                    onChange={(e) => setEditingOrg({ ...editingOrg, pan: e.target.value })}
                    className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  GST
                  <input
                    value={editingOrg.gst || ""}
                    onChange={(e) => setEditingOrg({ ...editingOrg, gst: e.target.value })}
                    className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  Onboarding Status
                  <select
                    value={editingOrg.onboardingStatus || ""}
                    onChange={(e) => setEditingOrg({ ...editingOrg, onboardingStatus: e.target.value })}
                    className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                    required
                  >
                    <option value="REGISTERED">REGISTERED</option>
                    <option value="PROFILE_INCOMPLETE">PROFILE INCOMPLETE</option>
                    <option value="DOCUMENTS_PENDING">DOCUMENTS PENDING</option>
                    <option value="SUBMITTED_FOR_REVIEW">SUBMITTED FOR REVIEW</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  Account Status
                  <select
                    value={editingOrg.status || ""}
                    onChange={(e) => setEditingOrg({ ...editingOrg, status: e.target.value })}
                    className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                    required
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="DELETED">DELETED</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  Clarification Remarks
                  <textarea
                    value={editingOrg.clarificationRemarks || ""}
                    onChange={(e) => setEditingOrg({ ...editingOrg, clarificationRemarks: e.target.value })}
                    className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                    rows={2}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  Rejection Reason
                  <textarea
                    value={editingOrg.rejectionReason || ""}
                    onChange={(e) => setEditingOrg({ ...editingOrg, rejectionReason: e.target.value })}
                    className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue text-rose-700"
                    rows={2}
                  />
                </label>
              </div>
            </div>
            <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditingOrg(null)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </div>
      )}

      {/* Create Organization modal */}
      {creatingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={createOrg} className="w-full max-w-2xl bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-extrabold text-gov-navy">Create Organization</h2>
              <button type="button" className="text-slate-400 hover:text-slate-600 font-bold" onClick={() => setCreatingOrg(false)}>✕</button>
            </div>
            <div className="p-6 overflow-y-auto flex flex-col gap-4 text-xs font-bold text-gov-ink">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  Legal Name
                  <input
                    value={newOrg.name}
                    onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                    className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  Organization Type
                  <select
                    value={newOrg.organizationType}
                    onChange={(e) => setNewOrg({ ...newOrg, organizationType: e.target.value })}
                    className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                    required
                  >
                    <option value="NGO">NGO</option>
                    <option value="CSR_COMPANY">CSR Company</option>
                    <option value="GOVERNMENT_DEPARTMENT">Government Department</option>
                    <option value="PORTAL_ADMIN_ORG">Portal Admin Organization</option>
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                Tenant (State Portal Instance)
                <select
                  value={newOrg.tenantId}
                  onChange={(e) => setNewOrg({ ...newOrg, tenantId: e.target.value })}
                  className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                  required
                >
                  {tenants.length === 0 && <option value="">Loading tenants...</option>}
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.code})</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  Email
                  <input
                    type="email"
                    value={newOrg.email}
                    onChange={(e) => setNewOrg({ ...newOrg, email: e.target.value })}
                    className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  Phone
                  <input
                    value={newOrg.phone}
                    onChange={(e) => setNewOrg({ ...newOrg, phone: e.target.value.replace(/[^\d+\-() ]/g, "").slice(0, 15) })}
                    className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  District
                  <input
                    value={newOrg.district}
                    onChange={(e) => setNewOrg({ ...newOrg, district: e.target.value })}
                    className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  Taluka
                  <input
                    value={newOrg.taluka}
                    onChange={(e) => setNewOrg({ ...newOrg, taluka: e.target.value })}
                    className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                Address
                <input
                  value={newOrg.address}
                  onChange={(e) => setNewOrg({ ...newOrg, address: e.target.value })}
                  className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                />
              </label>
              <div className="grid grid-cols-3 gap-4">
                <label className="flex flex-col gap-1.5">
                  Registration Number
                  <input
                    value={newOrg.registrationNumber}
                    onChange={(e) => setNewOrg({ ...newOrg, registrationNumber: e.target.value })}
                    className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  PAN
                  <input
                    value={newOrg.pan}
                    onChange={(e) => setNewOrg({ ...newOrg, pan: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) })}
                    maxLength={10}
                    placeholder="ABCDE1234F"
                    className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue uppercase"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  GST
                  <input
                    value={newOrg.gst}
                    onChange={(e) => setNewOrg({ ...newOrg, gst: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15) })}
                    maxLength={15}
                    placeholder="27AAAAA1111A1Z1"
                    className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue uppercase"
                  />
                </label>
              </div>
            </div>
            <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setCreatingOrg(false)}>Cancel</Button>
              <Button type="submit" disabled={!newOrg.tenantId}><Plus size={14} /> Create Organization</Button>
            </div>
          </form>
        </div>
      )}
    </WorkspaceShell>
  );
}

// The 9 canonical, assignable system roles (see backend types/role.ts).
// Custom roles beyond these are created at runtime via the dynamic roles
// manager (/master/roles) — never hardcoded here. Dropped/legacy identities
// (portal-admin, csr-admin, district-admin, state-csr-cell, beneficiary-agency,
// *-member, reviewer/finance/approver/auditor) are intentionally absent.
const ASSIGNABLE_SYSTEM_ROLES = [
  "SUPER_ADMIN",
  "PLANNING_SECRETARY",
  "JOINT_SECRETARY",
  "DISTRICT_NODAL_CONSULTANT",
  "DISTRICT_NODAL_OFFICER",
  "CSR_RELATIONSHIP_MANAGER",
  "COMPANY_ADMIN",
  "GOVERNMENT_OFFICER",
  "NGO_ADMIN",
];

export function MasterUsersWorkspace() {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [viewingUser, setViewingUser] = useState<OrgUser | null>(null);
  const [editingUser, setEditingUser] = useState<OrgUser | null>(null);

  // Create-user modal
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", role: "CSR_RELATIONSHIP_MANAGER", accountStatus: "ACTIVE" });

  // Roles & permissions manager
  const [rolesOpen, setRolesOpen] = useState(false);
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [editingRole, setEditingRole] = useState<{ id?: string; name: string; description: string; scope: string; isSystemRole?: boolean; permissionKeys: string[] } | null>(null);
  const [savingRole, setSavingRole] = useState(false);

  const loadRolesAndPermissions = async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        apiFetch<OrgRole[]>("/master/roles"),
        apiFetch<Permission[]>("/master/permissions"),
      ]);
      setRoles(rolesRes);
      setPermissions(permsRes);
    } catch (err: any) {
      setError(err.message || "Unable to load roles");
    }
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setUsers(await apiFetch<OrgUser[]>("/master/users"));
    } catch (err: any) {
      setError(err.message || "Unable to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter((user) => `${user.email} ${user.role}`.toLowerCase().includes(search.toLowerCase()));

  const deleteUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await apiFetch(`/master/users/${id}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((user) => user.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete user");
    }
  };

  const saveUser = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingUser) return;
    try {
      const updated = await apiFetch<OrgUser>(`/master/users/${editingUser.id}`, {
        method: "PUT",
        body: JSON.stringify(editingUser)
      });
      setUsers((prev) => prev.map((user) => user.id === updated.id ? updated : user));
      setEditingUser(null);
    } catch (err: any) {
      setError(err.message || "Failed to update user");
    }
  };

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await apiFetch<OrgUser>("/master/users", {
        method: "POST",
        body: JSON.stringify(newUser)
      });
      setCreatingUser(false);
      setNewUser({ email: "", password: "", role: "CSR_RELATIONSHIP_MANAGER", accountStatus: "ACTIVE" });
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to create user");
    }
  };

  const saveRole = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingRole) return;
    setSavingRole(true);
    setError("");
    try {
      if (editingRole.id) {
        await apiFetch(`/master/roles/${editingRole.id}`, {
          method: "PUT",
          body: JSON.stringify({ name: editingRole.name, description: editingRole.description, permissionKeys: editingRole.permissionKeys })
        });
      } else {
        await apiFetch("/master/roles", {
          method: "POST",
          body: JSON.stringify({ name: editingRole.name, description: editingRole.description, scope: editingRole.scope, permissionKeys: editingRole.permissionKeys })
        });
      }
      setEditingRole(null);
      await loadRolesAndPermissions();
    } catch (err: any) {
      setError(err.message || "Failed to save role");
    } finally {
      setSavingRole(false);
    }
  };

  const deleteRole = async (id: string) => {
    if (!window.confirm("Delete this role? Users holding it lose the assignment.")) return;
    setError("");
    try {
      await apiFetch(`/master/roles/${id}`, { method: "DELETE" });
      await loadRolesAndPermissions();
    } catch (err: any) {
      setError(err.message || "Failed to delete role");
    }
  };

  const assignRole = async (userId: string, roleId: string) => {
    if (!roleId) return;
    setError("");
    try {
      await apiFetch(`/master/users/${userId}/roles`, {
        method: "POST",
        body: JSON.stringify({ roleId })
      });
      await load();
      // Keep the details modal in sync with the refreshed list.
      const refreshed = await apiFetch<OrgUser[]>("/master/users");
      setUsers(refreshed);
      setViewingUser((prev) => prev ? refreshed.find((u) => u.id === prev.id) || prev : prev);
    } catch (err: any) {
      setError(err.message || "Failed to assign role");
    }
  };

  const removeRole = async (userId: string, roleId: string) => {
    setError("");
    try {
      await apiFetch(`/master/users/${userId}/roles/${roleId}`, { method: "DELETE" });
      const refreshed = await apiFetch<OrgUser[]>("/master/users");
      setUsers(refreshed);
      setViewingUser((prev) => prev ? refreshed.find((u) => u.id === prev.id) || prev : prev);
    } catch (err: any) {
      setError(err.message || "Failed to remove role");
    }
  };

  const permissionsByModule = permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
    (acc[perm.module] = acc[perm.module] || []).push(perm);
    return acc;
  }, {});

  return (
    <WorkspaceShell
      eyebrow="Master Admin"
      title="Users"
      description="Global user directory scoped by tenant and organization. Create users, manage custom roles, and assign permissions. Password hashes are never exposed."
      actions={
        <>
          <Button variant="secondary" onClick={() => { setRolesOpen(true); loadRolesAndPermissions(); }}>
            <ShieldCheck size={16} /> Roles &amp; Permissions
          </Button>
          <Button onClick={() => setCreatingUser(true)}>
            <Plus size={16} /> Create User
          </Button>
        </>
      }
    >
      <ErrorBox error={error} />
      <section className="border border-slate-200/60 bg-white/70 backdrop-blur-xl rounded-2xl shadow-glass overflow-hidden">
        <div className="border-b border-gov-line p-4"><SearchBox value={search} onChange={setSearch} placeholder="Search users..." /></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-gov-mist text-[11px] uppercase tracking-wider text-gov-muted">
              <tr>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Verified</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gov-line">
              {loading ? <LoadingRow colSpan={5} /> : filtered.length === 0 ? <EmptyRow colSpan={5} text="No users found." /> : filtered.map((user) => (
                <tr key={user.id}>
                  <td className="px-5 py-4 font-bold text-gov-ink">{user.email}</td>
                  <td className="px-5 py-4 text-gov-muted">{user.role}</td>
                  <td className="px-5 py-4"><Badge>{user.accountStatus}</Badge></td>
                  <td className="px-5 py-4">{user.isVerified ? <Check className="text-emerald-600" size={18} /> : "-"}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setViewingUser(user)}>Details</Button>
                      <Button size="sm" variant="primary" onClick={() => setEditingUser(user)}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => deleteUser(user.id)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden flex flex-col">
            <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-extrabold text-gov-navy">User Details</h2>
              <button className="text-slate-400 hover:text-slate-600 font-bold" onClick={() => setViewingUser(null)}>✕</button>
            </div>
            <div className="p-6 flex flex-col gap-4 text-sm text-gov-ink">
              <div className="border-b border-slate-100 pb-4">
                <div className="text-xs font-bold text-slate-500 uppercase">User Email</div>
                <div className="font-extrabold text-gov-navy text-base mt-0.5">{viewingUser.email}</div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">System Role</div>
                  <div className="font-bold mt-0.5">{viewingUser.role}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Status</div>
                  <div className="mt-1"><Badge>{viewingUser.accountStatus}</Badge></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Verified Account</div>
                  <div className="mt-1">{viewingUser.isVerified ? <span className="text-emerald-700 font-bold">Yes</span> : <span className="text-amber-700 font-bold">No</span>}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Created Date</div>
                  <div className="mt-1 text-slate-600 text-xs">{new Date(viewingUser.createdAt).toLocaleString()}</div>
                </div>
              </div>

              {/* Custom role assignments */}
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase">Custom Roles</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(viewingUser.organizationRoles || []).length === 0 && (
                    <span className="text-xs text-slate-500">No custom roles assigned.</span>
                  )}
                  {(viewingUser.organizationRoles || []).map((assignment) => (
                    <span key={assignment.role.id} className="inline-flex items-center gap-1.5 rounded border border-[#c4ddf2] bg-[#e3f0fa] px-2 py-1 text-[11px] font-bold text-[#14274e]">
                      {assignment.role.name}
                      <button
                        type="button"
                        className="text-[#c62828] hover:text-[#8e1c1c] font-bold"
                        title="Remove role"
                        onClick={() => removeRole(viewingUser.id, assignment.role.id)}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <select
                    className="border border-gov-line px-3 py-2 text-xs font-medium outline-none focus:border-gov-blue"
                    defaultValue=""
                    onChange={(e) => { if (e.target.value) { assignRole(viewingUser.id, e.target.value); e.target.value = ""; } }}
                    onFocus={() => { if (roles.length === 0) loadRolesAndPermissions(); }}
                  >
                    <option value="">Assign a custom role...</option>
                    {roles
                      .filter((r) => !(viewingUser.organizationRoles || []).some((a) => a.role.id === r.id))
                      .map((r) => (
                        <option key={r.id} value={r.id}>{r.name} ({r.scope})</option>
                      ))}
                  </select>
                  <span className="text-[10px] text-slate-500">Create roles under Roles &amp; Permissions.</span>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-200 px-6 py-4 flex justify-end">
              <Button onClick={() => setViewingUser(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={saveUser} className="w-full max-w-lg bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden flex flex-col">
            <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-extrabold text-gov-navy">Edit User</h2>
              <button type="button" className="text-slate-400 hover:text-slate-600 font-bold" onClick={() => setEditingUser(null)}>✕</button>
            </div>
            <div className="p-6 flex flex-col gap-4 text-xs font-bold text-gov-ink">
              <label className="flex flex-col gap-1.5">
                Email Address
                <input
                  type="email"
                  value={editingUser.email || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                System Role
                <select
                  value={editingUser.role || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                  required
                >
                  {ASSIGNABLE_SYSTEM_ROLES.map((r) => (
                    <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                Account Status
                <select
                  value={editingUser.accountStatus || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, accountStatus: e.target.value })}
                  className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                  required
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="DELETED">DELETED</option>
                </select>
              </label>
              <label className="flex items-center gap-2 cursor-pointer mt-2 text-sm">
                <input
                  type="checkbox"
                  checked={editingUser.isVerified}
                  onChange={(e) => setEditingUser({ ...editingUser, isVerified: e.target.checked })}
                  className="rounded border-slate-300"
                />
                <span>Is Verified Account</span>
              </label>
            </div>
            <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </div>
      )}

      {/* Create User modal */}
      {creatingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={createUser} className="w-full max-w-lg bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden flex flex-col">
            <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-extrabold text-gov-navy">Create User</h2>
              <button type="button" className="text-slate-400 hover:text-slate-600 font-bold" onClick={() => setCreatingUser(false)}>✕</button>
            </div>
            <div className="p-6 flex flex-col gap-4 text-xs font-bold text-gov-ink">
              <label className="flex flex-col gap-1.5">
                Email Address
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                Temporary Password
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  minLength={6}
                  className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                  required
                />
                <span className="text-[10px] font-medium text-slate-500">At least 6 characters. Share securely; user should change it on first login.</span>
              </label>
              <label className="flex flex-col gap-1.5">
                System Role
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                  required
                >
                  {ASSIGNABLE_SYSTEM_ROLES.map((r) => (
                    <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                  ))}
                </select>
                <span className="text-[10px] font-medium text-slate-500">Master Admin cannot be created or assigned from the portal.</span>
              </label>
              <label className="flex flex-col gap-1.5">
                Account Status
                <select
                  value={newUser.accountStatus}
                  onChange={(e) => setNewUser({ ...newUser, accountStatus: e.target.value })}
                  className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </label>
            </div>
            <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setCreatingUser(false)}>Cancel</Button>
              <Button type="submit"><Plus size={14} /> Create User</Button>
            </div>
          </form>
        </div>
      )}

      {/* Roles & Permissions manager */}
      {rolesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-extrabold text-gov-navy">Roles &amp; Permissions</h2>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setEditingRole({ name: "", description: "", scope: "TENANT", permissionKeys: [] })}>
                  <Plus size={14} /> New Role
                </Button>
                <button className="text-slate-400 hover:text-slate-600 font-bold ml-2" onClick={() => { setRolesOpen(false); setEditingRole(null); }}>✕</button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-4">
              {editingRole ? (
                <form onSubmit={saveRole} className="flex flex-col gap-4 text-xs font-bold text-gov-ink">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="flex flex-col gap-1.5">
                      Role Name
                      <input
                        value={editingRole.name}
                        onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                        disabled={editingRole.isSystemRole}
                        className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue disabled:bg-slate-50"
                        placeholder="e.g. District Reviewer"
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      Scope
                      <select
                        value={editingRole.scope}
                        onChange={(e) => setEditingRole({ ...editingRole, scope: e.target.value })}
                        disabled={Boolean(editingRole.id)}
                        className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue disabled:bg-slate-50"
                      >
                        <option value="GLOBAL">GLOBAL</option>
                        <option value="TENANT">TENANT</option>
                        <option value="ORGANIZATION">ORGANIZATION</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      Description
                      <input
                        value={editingRole.description}
                        onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                        className="border border-gov-line px-3 py-2 text-sm font-medium outline-none focus:border-gov-blue"
                        placeholder="What this role is for"
                      />
                    </label>
                  </div>

                  <div>
                    <div className="text-xs font-extrabold uppercase text-slate-500 mb-2">Permissions ({editingRole.permissionKeys.length} selected)</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto border border-gov-line p-3">
                      {Object.entries(permissionsByModule).map(([module, perms]) => (
                        <div key={module} className="border border-slate-100 p-3 rounded-lg">
                          <div className="text-[11px] font-extrabold uppercase tracking-wide text-gov-navy mb-2">{module}</div>
                          <div className="flex flex-col gap-1.5">
                            {perms.map((perm) => (
                              <label key={perm.key} className="flex items-start gap-2 cursor-pointer text-[11px] font-medium text-slate-700">
                                <input
                                  type="checkbox"
                                  className="mt-0.5 rounded border-slate-300"
                                  checked={editingRole.permissionKeys.includes(perm.key)}
                                  onChange={(e) =>
                                    setEditingRole({
                                      ...editingRole,
                                      permissionKeys: e.target.checked
                                        ? [...editingRole.permissionKeys, perm.key]
                                        : editingRole.permissionKeys.filter((k) => k !== perm.key),
                                    })
                                  }
                                />
                                <span>
                                  <span className="font-bold">{perm.key}</span>
                                  {perm.description && <span className="text-slate-500"> — {perm.description}</span>}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => setEditingRole(null)}>Cancel</Button>
                    <Button type="submit" disabled={savingRole}>
                      {savingRole ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {editingRole.id ? "Save Role" : "Create Role"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-gov-mist text-[11px] uppercase tracking-wider text-gov-muted">
                      <tr>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Scope</th>
                        <th className="px-4 py-3">Permissions</th>
                        <th className="px-4 py-3">Users</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gov-line">
                      {roles.length === 0 ? (
                        <EmptyRow colSpan={5} text="No custom roles yet. Create one to bundle permissions." />
                      ) : roles.map((role) => (
                        <tr key={role.id}>
                          <td className="px-4 py-3 font-bold text-gov-ink">
                            {role.name}
                            {role.description && <div className="text-[11px] font-medium text-gov-muted">{role.description}</div>}
                          </td>
                          <td className="px-4 py-3 text-gov-muted">{role.scope}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1 max-w-[280px]">
                              {(role.rolePermissions || []).slice(0, 4).map((rp) => (
                                <span key={rp.permission.key} className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">{rp.permission.key}</span>
                              ))}
                              {(role.rolePermissions || []).length > 4 && (
                                <span className="text-[10px] font-bold text-slate-500">+{(role.rolePermissions || []).length - 4} more</span>
                              )}
                              {(role.rolePermissions || []).length === 0 && <span className="text-[10px] text-slate-400">None</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gov-muted">{role._count?.userRoles ?? 0}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setEditingRole({
                                  id: role.id,
                                  name: role.name,
                                  description: role.description || "",
                                  scope: role.scope,
                                  isSystemRole: role.isSystemRole,
                                  permissionKeys: (role.rolePermissions || []).map((rp) => rp.permission.key),
                                })}
                              >
                                Edit
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => deleteRole(role.id)} disabled={role.isSystemRole}>Delete</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}

export function MasterAuditLogsWorkspace() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<AuditLog[]>("/master/audit-logs").then(setLogs).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  return (
    <WorkspaceShell eyebrow="Master Admin" title="Audit Logs" description="Sensitive actions, blocked feature access, tenant updates and approval decisions.">
      <ErrorBox error={error} />
      <section className="border border-slate-200/60 bg-white/70 backdrop-blur-xl rounded-2xl shadow-glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-gov-mist text-[11px] uppercase tracking-wider text-gov-muted">
              <tr><th className="px-5 py-3">Action</th><th className="px-5 py-3">Actor</th><th className="px-5 py-3">Entity</th><th className="px-5 py-3">Time</th></tr>
            </thead>
            <tbody className="divide-y divide-gov-line">
              {loading ? <LoadingRow colSpan={4} /> : logs.length === 0 ? <EmptyRow colSpan={4} text="No audit logs found." /> : logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-5 py-4 font-bold text-gov-ink">{log.action}</td>
                  <td className="px-5 py-4 text-gov-muted">{log.user?.email || log.actorRole || "-"}</td>
                  <td className="px-5 py-4 text-gov-muted">{log.entityType || "-"} {log.entityId ? `#${log.entityId.slice(0, 8)}` : ""}</td>
                  <td className="px-5 py-4 text-gov-muted">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </WorkspaceShell>
  );
}

export function AdminOnboardingApprovalsWorkspace() {
  const [items, setItems] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useResponsiveViewMode();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "NGO" | "CSR_COMPANY" | "GOVERNMENT_DEPARTMENT">("ALL");
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "APPROVED" | "ALL">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const queryParams = new URLSearchParams();
      if (typeFilter !== "ALL") queryParams.append("kind", typeFilter);
      queryParams.append("status", statusFilter);

      const endpoint = `/admin/organizations/pending?${queryParams.toString()}`;
      setItems(await apiFetch<Organization[]>(endpoint));
    } catch (err: any) {
      setError(err.message || "Unable to load approvals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    load();
  }, [typeFilter, statusFilter]);

  const action = async (id: string, type: "approve" | "reject" | "request-clarification" | "suspend") => {
    const remarks = type === "approve" ? undefined : window.prompt("Remarks or reason") || undefined;
    if (type !== "approve" && !remarks) return;
    await apiFetch(`/admin/organizations/${id}/${type}`, {
      method: "POST",
      body: JSON.stringify(type === "reject" ? { rejectionReason: remarks } : { remarks })
    });
    await load();
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.email || i.officialEmail || "").toLowerCase().includes(q) ||
      (i.district || "").toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  return (
    <WorkspaceShell
      eyebrow="Portal Admin"
      title="Onboarding Approvals"
      description="Review and approve NGO, CSR company and government department onboarding applications."
      actions={
        <div className="flex items-center gap-3">
          {/* List / Grid View Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "list"
                  ? "bg-white text-blue-900 shadow-xs border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <List size={15} />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "grid"
                  ? "bg-white text-blue-900 shadow-xs border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <LayoutGrid size={15} />
              <span>Grid</span>
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : ""} />
            Refresh
          </Button>
        </div>
      }
    >
      <ErrorBox error={error} />

      {/* Filter and Search Strip */}
      <div className="mb-5 flex flex-col gap-4 bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Type Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "ALL", label: "All Organization Types", icon: Building2 },
              { id: "NGO", label: "NGOs & Implementing Agencies", icon: Building2 },
              { id: "CSR_COMPANY", label: "CSR Companies", icon: Building2 },
              { id: "GOVERNMENT_DEPARTMENT", label: "Government Departments", icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = typeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTypeFilter(tab.id as any)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    isActive
                      ? "bg-blue-900 text-white border-blue-900 shadow-sm"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  <Icon size={14} className={isActive ? "text-blue-200" : "text-slate-400"} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
          >
            <option value="ALL">All Statuses (All Organizations)</option>
            <option value="PENDING">Pending Approvals Only</option>
            <option value="APPROVED">Approved & Active Organizations</option>
          </select>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email or district..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
            />
          </div>
          <div className="text-xs font-bold text-slate-500">
            Showing <span className="text-blue-900 font-extrabold">{filteredItems.length}</span> applications
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white/70 backdrop-blur-xl rounded-2xl border border-slate-200 flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-blue-600" />
          <p className="text-xs font-bold text-slate-500">Fetching onboarding applications...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-white/70 backdrop-blur-xl rounded-2xl border border-slate-200 flex flex-col items-center gap-3">
          <CheckCircle2 size={40} className="text-emerald-500" />
          <h3 className="font-heading font-extrabold text-base text-slate-900">No Applications Found</h3>
          <p className="text-xs text-slate-500 max-w-sm">No organization onboarding records match the selected filters.</p>
        </div>
      ) : viewMode === "list" ? (
        /* Modern Table View */
        <section className="border border-slate-200/80 bg-white/90 backdrop-blur-xl rounded-2xl shadow-glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider font-extrabold text-slate-500">
                <tr>
                  <th className="px-6 py-4">Organization</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">District</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {paginatedItems.map((item, idx) => {
                    const typeLabel = (item.organizationType || item.kind || "ORGANIZATION").toString().replace(/_/g, " ");
                    const statusLabel = item.onboardingStatus || item.status || "UNDER_VERIFICATION";
                    const isNgo = typeLabel.includes("NGO");
                    const isGov = typeLabel.includes("GOVERNMENT") || typeLabel.includes("GOVT");
                    const isApproved = statusLabel === "APPROVED" || item.status === "ACTIVE";

                    return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.04 }}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="px-6 py-4 font-bold text-slate-900">
                          <Link href={`/admin/onboarding-approvals/${item.id}`} className="text-blue-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                            <span>{item.name}</span>
                          </Link>
                          <div className="text-xs font-medium text-slate-400 mt-0.5">{item.email || item.officialEmail || "No email provided"}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                            isNgo ? "bg-emerald-50 text-emerald-800 border-emerald-200" : isGov ? "bg-purple-50 text-purple-800 border-purple-200" : "bg-blue-50 text-blue-900 border-blue-200"
                          }`}>
                            {isNgo ? <Building2 size={12} /> : isGov ? <ShieldCheck size={12} /> : <Building2 size={12} />}
                            {typeLabel}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700">{item.district || "-"}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            isApproved ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}>
                            {!isApproved && <Clock size={12} className="animate-spin text-amber-600" />}
                            {isApproved && <CheckCircle2 size={12} className="text-emerald-600" />}
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {/* View Eye Icon Button */}
                            <Link
                              href={`/admin/onboarding-approvals/${item.id}`}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-900 transition-all border border-slate-200 hover:border-blue-300"
                              title="View Application Details"
                            >
                              <Eye size={15} />
                            </Link>

                            {!isApproved && (
                              <>
                                <Button size="sm" onClick={() => action(item.id, "approve")} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs">
                                  Approve
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => action(item.id, "request-clarification")} className="font-bold">
                                  Clarify
                                </Button>
                                <Button size="sm" variant="danger" onClick={() => action(item.id, "reject")} className="font-bold">
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-100">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredItems.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </div>
        </section>
      ) : (
        /* Modern Card Grid View */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {paginatedItems.map((item, idx) => {
                const typeLabel = (item.organizationType || item.kind || "ORGANIZATION").toString().replace(/_/g, " ");
                const statusLabel = item.onboardingStatus || item.status || "UNDER_VERIFICATION";
                const isNgo = typeLabel.includes("NGO");
                const isGov = typeLabel.includes("GOVERNMENT") || typeLabel.includes("GOVT");
                const isApproved = statusLabel === "APPROVED" || item.status === "ACTIVE";

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    whileHover={{ y: -4, transition: { duration: 0.15 } }}
                    className="bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-5 shadow-glass flex flex-col justify-between gap-4 relative overflow-hidden group hover:border-blue-300 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                          isNgo ? "bg-emerald-50 text-emerald-800 border-emerald-200" : isGov ? "bg-purple-50 text-purple-800 border-purple-200" : "bg-blue-50 text-blue-900 border-blue-200"
                        }`}>
                          {typeLabel}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isApproved ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}>
                          {statusLabel}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-heading font-extrabold text-base text-slate-900 group-hover:text-blue-900 transition-colors line-clamp-1">
                          {item.name}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                          {item.email || item.officialEmail || "No email registered"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs font-semibold">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 uppercase font-extrabold block">District</span>
                          <span className="text-slate-800">{item.district || "-"}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 uppercase font-extrabold block">Reg No</span>
                          <span className="text-slate-800 truncate block">{item.registrationNumber || "-"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Link
                        href={`/admin/onboarding-approvals/${item.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-blue-900 font-bold text-xs transition-all border border-slate-200"
                        title="View Application Details"
                      >
                        <Eye size={14} />
                        <span>Details</span>
                      </Link>

                      {!isApproved && (
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" onClick={() => action(item.id, "approve")} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1 px-2.5">
                            Approve
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => action(item.id, "reject")} className="font-bold text-xs py-1 px-2.5">
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-slate-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredItems.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}

export function OrganizationOnboardingWorkspace() {
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documentForm, setDocumentForm] = useState({ documentType: "", fileUrl: "", remarks: "" });

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) return;
    apiFetch<Organization>("/onboarding/status").then(setOrganization).catch((err) => setError(err.message));
  }, []);

  // Once submitted, onboarding details are read-only — redirect away from the edit form.
  useEffect(() => {
    const currentStatus = (organization?.onboardingStatus || "").toUpperCase();
    const locked = ["SUBMITTED_FOR_REVIEW", "UNDER_VERIFICATION", "APPROVED", "SUSPENDED"];
    if (organization && currentStatus && locked.includes(currentStatus)) {
      router.replace(currentStatus === "APPROVED" ? "/organization/onboarding/details" : "/organization/onboarding/status");
    }
  }, [organization, router]);

  const updateField = (key: keyof Organization, value: string) => {
    setOrganization((current) => current ? { ...current, [key]: value } : current);
  };

  const saveProfile = async () => {
    if (!organization) return;
    setSaving(true);
    try {
      setOrganization(await apiFetch<Organization>("/onboarding/profile", {
        method: "PATCH",
        body: JSON.stringify(organization)
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers,
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "File upload failed");

      setDocumentForm((current) => ({
        ...current,
        fileUrl: data.url,
        documentType: current.documentType || file.name.split(".")[0].toUpperCase().replace(/[^A-Z0-9_]/g, "_")
      }));
    } catch (err: any) {
      setError(err.message || "Failed to upload file");
      event.target.value = ""; // Clear file input
    } finally {
      setUploading(false);
    }
  };

  const uploadDocument = async (event: FormEvent) => {
    event.preventDefault();
    await apiFetch("/onboarding/documents", { method: "POST", body: JSON.stringify(documentForm) });
    setDocumentForm({ documentType: "", fileUrl: "", remarks: "" });
    setOrganization(await apiFetch<Organization>("/onboarding/status"));
  };

  const submit = async () => {
    setOrganization(await apiFetch<Organization>("/onboarding/submit", { method: "POST" }));
  };

  return (
    <WorkspaceShell eyebrow="Organization" title="Organization Onboarding" description="Complete profile and document details before Portal Admin approval.">
      <ErrorBox error={error} />
      {!organization ? (
        <div className="animate-pulse space-y-4 rounded-md border border-gov-line bg-white p-6">
          <div className="h-6 w-1/3 rounded bg-slate-200" />
          <div className="h-4 w-1/2 rounded bg-slate-100" />
          <div className="h-24 w-full rounded bg-slate-50" />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <section className="border border-gov-line bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-gov-navy">Profile</h2>
              <Badge>{organization.onboardingStatus}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["name", "Name"],
                ["email", "Email"],
                ["phone", "Phone"],
                ["district", "District"],
                ["taluka", "Taluka"],
                ["address", "Address"],
                ["registrationNumber", "Registration Number"],
                ["pan", "PAN"],
                ["gst", "GST"]
              ].map(([key, label]) => (
                <label key={key} className="flex flex-col gap-1.5 text-sm font-bold text-gov-ink">
                  {label}
                  <input value={(organization as any)[key] || ""} onChange={(event) => updateField(key as keyof Organization, event.target.value)} className="border border-gov-line px-3 py-2.5 text-sm font-medium outline-none focus:border-gov-blue" />
                </label>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={saveProfile} loading={saving}><Save size={16} className="mr-2" /> Save Profile</Button>
              <Button variant="accent" onClick={submit}>Submit for Review</Button>
            </div>
          </section>
          <section className="border border-gov-line bg-white p-5 shadow-sm">
            <h2 className="text-base font-extrabold text-gov-navy">Documents</h2>
            <form onSubmit={uploadDocument} className="mt-4 grid gap-3">
              <label className="flex flex-col gap-1 text-xs font-bold text-gov-ink">
                Document Type
                <input placeholder="e.g. GST_CERTIFICATE" value={documentForm.documentType} onChange={(event) => setDocumentForm((current) => ({ ...current, documentType: event.target.value }))} className="border border-gov-line px-3 py-2 text-sm outline-none focus:border-gov-blue" required />
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold text-gov-ink">
                Choose Document File
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="border border-gov-line px-3 py-1.5 text-sm outline-none focus:border-gov-blue"
                  required={!documentForm.fileUrl}
                />
                {uploading && <span className="text-[10px] text-gov-blue animate-pulse mt-0.5">Uploading file to server...</span>}
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold text-gov-ink">
                File URL (Auto-populated)
                <input placeholder="Upload file above..." value={documentForm.fileUrl} disabled className="border border-gov-line bg-slate-50 px-3 py-2 text-sm outline-none text-gov-muted cursor-not-allowed" />
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold text-gov-ink">
                Remarks (Optional)
                <input placeholder="Remarks" value={documentForm.remarks} onChange={(event) => setDocumentForm((current) => ({ ...current, remarks: event.target.value }))} className="border border-gov-line px-3 py-2 text-sm outline-none focus:border-gov-blue" />
              </label>

              <Button type="submit" variant="secondary" loading={uploading} disabled={!documentForm.fileUrl}>Add Document</Button>
            </form>
            <div className="mt-5 divide-y divide-gov-line border border-gov-line">
              {(organization.documents || []).length === 0 ? <div className="p-4 text-sm text-gov-muted">No documents uploaded.</div> : organization.documents?.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <a href={doc.fileUrl} target="_blank" className="font-bold text-gov-blue">{doc.documentType}</a>
                  <Badge>{doc.verificationStatus}</Badge>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </WorkspaceShell>
  );
}

export function OrganizationOnboardingStatusWorkspace() {
  const router = useRouter();
  const toast = useToastActions();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reapplying, setReapplying] = useState(false);
  const [clarificationNotes, setClarificationNotes] = useState("");
  const [submittingClarification, setSubmittingClarification] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState("");

  const fetchStatus = () => {
    setLoading(true);
    setError("");
    const token = getAccessToken();
    if (!token && typeof window !== "undefined" && !localStorage.getItem("accessToken") && !localStorage.getItem("token")) {
      setLoading(false);
      return;
    }
    apiFetch<any>("/onboarding/status")
      .then((res) => {
        const orgData = res?.data || res;
        setOrganization(orgData);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch onboarding status");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDocType(docType);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploaded = await apiFetch<any>("/upload", {
        method: "POST",
        body: formData
      });
      const fileUrl = uploaded?.data?.fileUrl || uploaded?.fileUrl || uploaded?.url;
      await apiFetch("/onboarding/document", {
        method: "POST",
        body: JSON.stringify({
          documentType: docType,
          fileUrl,
          fileName: file.name,
          fileSize: file.size
        })
      });
      toast.success("Document Uploaded", `${file.name} attached successfully.`);
      fetchStatus();
    } catch (err: any) {
      toast.error("Upload Failed", err.message || "Unable to upload document");
    } finally {
      setUploadingDocType("");
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await apiFetch(`/onboarding/document/${docId}`, { method: "DELETE" });
      toast.success("Document Deleted", "Attached file removed.");
      fetchStatus();
    } catch (err: any) {
      toast.error("Delete Failed", err.message || "Unable to remove document");
    }
  };

  const handleSubmitClarification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clarificationNotes.trim()) {
      toast.error("Explanation Required", "Please enter your clarification response notes for the Super Admin.");
      return;
    }
    setSubmittingClarification(true);
    try {
      await apiFetch("/onboarding/submit-application", {
        method: "POST",
        body: JSON.stringify({ responseNotes: clarificationNotes.trim() })
      });
      toast.success("Clarification Resubmitted", "Your response notes and updated profile/documents have been resubmitted. Application status is now Under Review.");
      setClarificationNotes("");
      fetchStatus();
    } catch (err: any) {
      toast.error("Submission Failed", err.message || "Unable to submit clarification response");
    } finally {
      setSubmittingClarification(false);
    }
  };

  const handleReapply = async () => {
    setReapplying(true);
    setError("");
    try {
      await apiFetch("/onboarding/reapply", { method: "POST" });
      const targetRoute = organization?.organizationType === "GOVERNMENT_DEPARTMENT" || organization?.kind === "GOVERNMENT_DEPARTMENT"
        ? "/organization/onboarding/government"
        : "/organization/onboarding/company";
      router.push(targetRoute);
    } catch (err: any) {
      setError(err.message || "Unable to reset application for re-application");
      setReapplying(false);
    }
  };
  const onboardingStatus = (organization?.onboardingStatus || organization?.status || "REGISTERED").toUpperCase();
  const isApproved = onboardingStatus === "APPROVED" || onboardingStatus === "VERIFIED" || onboardingStatus === "ACTIVE";
  const isClarification = onboardingStatus === "CLARIFICATION_REQUIRED";
  const isRejected = onboardingStatus === "REJECTED";
  const isSuspended = onboardingStatus === "SUSPENDED";

  const isGovDept = organization?.organizationType === "GOVERNMENT_DEPARTMENT" || organization?.kind === "GOVERNMENT_DEPARTMENT";
  const editRoute = isGovDept
    ? "/organization/onboarding/government"
    : "/organization/onboarding/company";

  const existingDocs = organization?.documents || [];

  const requiredDocTypes = isGovDept
    ? [
        { type: "OFFICE_ORDER", label: "Nodal Officer Appointment / Office Order" },
        { type: "DEPT_AUTHORIZATION", label: "Department CSR Authorization Letter" },
        { type: "JURISDICTION_MAP", label: "State/District Jurisdiction Order" },
      ]
    : [
        { type: "INCORPORATION_CERTIFICATE", label: "Certificate of Incorporation / MCA CIN" },
        { type: "PAN_CARD", label: "Company / NGO PAN Card" },
        { type: "GST_CERTIFICATE", label: "GSTIN Certificate" },
        { type: "EIGHTY_G", label: "80G Tax Exemption Certificate" },
        { type: "TWELVE_A", label: "12A Registration Certificate" },
      ];

  return (
    <WorkspaceShell
      eyebrow="Organization"
      title="Onboarding Status"
      description="Track status updates, respond to admin clarification, or re-apply after application review."
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-12 shadow-sm text-center">
          <Loader2 className="h-9 w-9 animate-spin text-sky-600 mb-3" />
          <p className="text-sm font-semibold text-slate-600">Retrieving onboarding status...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-extrabold text-rose-900">Failed to fetch onboarding status</h3>
              <p className="mt-1 text-xs font-semibold text-rose-700">{error}</p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={fetchStatus}
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition-all cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry Request
                </button>
                <a
                  href="/organization/onboarding/details"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-800 hover:underline"
                >
                  View Saved Details <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status Alert Banner */}
          <div
            className={`rounded-2xl border p-5 shadow-sm transition-all ${
              isApproved
                ? "border-emerald-200 bg-emerald-50/80 text-emerald-950"
                : isClarification
                ? "border-amber-200 bg-amber-50/90 text-amber-950"
                : isRejected
                ? "border-rose-200 bg-rose-50/80 text-rose-950"
                : isSuspended
                ? "border-slate-300 bg-slate-100 text-slate-900"
                : "border-sky-200 bg-sky-50/80 text-sky-950"
            }`}
          >
            <div className="flex items-start gap-3.5">
              {isApproved ? (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              ) : isClarification ? (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <AlertTriangle className="h-5 w-5 animate-bounce" />
                </div>
              ) : isRejected ? (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                  <XCircle className="h-5 w-5" />
                </div>
              ) : isSuspended ? (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700">
                  <ShieldAlert className="h-5 w-5" />
                </div>
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <Clock className="h-5 w-5 animate-pulse" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-sm font-extrabold uppercase tracking-wide">
                  {isApproved
                    ? "Onboarding Approved — Active"
                    : isClarification
                    ? "Action Required — Clarification Requested"
                    : isRejected
                    ? "Onboarding Rejected — Re-application Available"
                    : isSuspended
                    ? "Account Access Suspended"
                    : "Onboarding Pending Verification"}
                </h3>
                <p className="mt-1 text-xs font-medium opacity-90 leading-relaxed">
                  {isApproved
                    ? "Your organization has been verified and approved by the Portal Admin. Full platform operations are active."
                    : isClarification
                    ? (organization as any)?.clarificationRemarks ? `Remarks from Admin: ${(organization as any).clarificationRemarks}` : "The Portal Admin requested additional clarification or updated document uploads."
                    : isRejected
                    ? (organization as any)?.rejectionReason ? `Reason: ${(organization as any).rejectionReason}` : "Your onboarding application was rejected. You may review your profile details and re-apply."
                    : isSuspended
                    ? "Your organization account is currently suspended. Please contact portal support at support.csr@maharashtra.gov.in for reinstatement."
                    : "Your organization onboarding application is under review by Portal Admin."}
                </p>
              </div>
            </div>
          </div>

          {/* DEDICATED CLARIFICATION & DOCUMENT WORKSPACE */}
          {isClarification && (
            <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-md space-y-6">
              {/* Admin Remarks Callout Box */}
              <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-5 space-y-2">
                <div className="flex items-center gap-2 text-amber-950 font-extrabold text-xs uppercase tracking-wider">
                  <AlertCircle className="text-amber-600 shrink-0" size={18} />
                  <span>Super Admin Clarification Remarks</span>
                </div>
                <p className="text-xs text-amber-900 font-bold leading-relaxed bg-white/90 p-3.5 rounded-xl border border-amber-200 shadow-2xs">
                  {(organization as any)?.clarificationRemarks || "Super Admin requested clarification on statutory documents and profile details."}
                </p>
                <div className="flex items-center justify-between text-[11px] text-amber-800 font-medium pt-1">
                  <span>Please review requested documents below, attach updated files, provide your response explanation, and resubmit.</span>
                  <Link href={editRoute} className="font-bold text-amber-900 underline hover:text-amber-700">
                    Edit Full Profile →
                  </Link>
                </div>
              </div>

              {/* Statutory Documents Management & Re-upload Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="text-blue-700" size={16} />
                  Statutory Document Re-Upload Workspace
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {requiredDocTypes.map((item) => {
                    const attachedDoc = existingDocs.find(
                      (d: any) => d.documentType === item.type || d.title === item.label || d.title === item.type
                    );
                    const isUploadingThis = uploadingDocType === item.type;

                    return (
                      <div
                        key={item.type}
                        className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                          attachedDoc
                            ? "border-emerald-200 bg-emerald-50/30 hover:border-emerald-300"
                            : "border-amber-200 bg-amber-50/30 hover:border-amber-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{item.label}</span>
                              {attachedDoc ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  ATTACHED
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                                  RE-UPLOAD NEEDED
                                </span>
                              )}
                            </div>
                            {attachedDoc ? (
                              <p className="text-[11px] text-slate-500 font-medium truncate mt-1">
                                {(attachedDoc as any)?.fileName || (attachedDoc as any)?.title || "document.pdf"}
                              </p>
                            ) : (
                              <p className="text-[11px] text-amber-700 font-medium mt-1">
                                No document uploaded for this requirement yet.
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                          {attachedDoc ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={attachedDoc.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-bold text-blue-700 hover:underline inline-flex items-center gap-1"
                              >
                                View Attached File
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDeleteDocument(attachedDoc.id)}
                                className="text-[10px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold">Max 10MB (PDF/JPG/PNG)</span>
                          )}

                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer">
                            {isUploadingThis ? (
                              <>
                                <Loader2 className="animate-spin" size={13} />
                                <span>Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Upload size={13} />
                                <span>{attachedDoc ? "Replace File" : "Upload File"}</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                              disabled={isUploadingThis}
                              onChange={(e) => handleUploadDocument(e, item.type)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Clarification Response Form */}
              <form onSubmit={handleSubmitClarification} className="space-y-4 pt-4 border-t border-slate-200">
                <div className="space-y-2">
                  <label className="block text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Response Explanation for Super Admin <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={clarificationNotes}
                    onChange={(e) => setClarificationNotes(e.target.value)}
                    required
                    placeholder="Type your explanation detailing the changes made, updated documents attached, or corrections submitted in response to the Super Admin's clarification request..."
                    className="w-full text-xs p-3.5 rounded-2xl border border-slate-300 outline-none focus:border-blue-700 font-medium leading-relaxed shadow-2xs"
                  />
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3">
                  <p className="text-xs text-slate-500 font-medium">
                    Submitting will update status back to <strong>Under Review</strong> and alert Super Admin.
                  </p>
                  <button
                    type="submit"
                    disabled={submittingClarification}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white px-7 py-3 text-xs font-extrabold shadow-md hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
                  >
                    {submittingClarification ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>Submitting Clarification...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Submit Clarification Response & Re-submit Profile</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

                {isRejected && (
                  <div className="mt-4">
                    <button
                      onClick={handleReapply}
                      disabled={reapplying}
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold shadow-sm transition-all cursor-pointer"
                    >
                      {reapplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Re-apply & Modify Application
                    </button>
                  </div>
                )}

          {/* Metric Cards */}
          <section className="grid gap-4 md:grid-cols-3">
            {/* Card 1: Organization Name */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                  Organization
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <Building2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-lg font-black text-slate-900 truncate">
                {organization?.name || organization?.tenant?.name || "—"}
              </div>
              <div className="mt-1 text-xs font-medium text-slate-500">
                Type: {(organization?.organizationType || organization?.kind || "ORGANIZATION").replace(/_/g, " ")}
              </div>
            </div>

            {/* Card 2: Onboarding Phase */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                  Onboarding Phase
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                    isApproved
                      ? "bg-emerald-100 text-emerald-800"
                      : isClarification
                      ? "bg-amber-100 text-amber-800"
                      : isRejected
                      ? "bg-rose-100 text-rose-800"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {onboardingStatus.replace(/_/g, " ")}
                </span>
              </div>
              <div className="mt-2 text-xs font-medium text-slate-500">
                Current verification status
              </div>
            </div>

            {/* Card 3: Account Status */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                  Account Status
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-lg font-black text-slate-900 uppercase">
                {organization?.status || "REGISTERED"}
              </div>
              <div className="mt-1 text-xs font-medium text-slate-500">
                Portal permissions level
              </div>
            </div>
          </section>

          {/* Key Metadata Table / Card */}
          {organization && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Organization Information Summary
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 pt-1">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">State / District</div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">
                    {[organization.district, "Maharashtra"].filter(Boolean).join(", ") || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Official Email</div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5 truncate">
                    {organization.email || organization.officialEmail || "—"}
                  </div>
                </div>
                {isGovDept ? (
                  <>
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase">Office / Department Code</div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5 font-mono">
                        {(organization as any).departmentCode || (organization as any).organizationCode || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase">Government Scope / Level</div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5">
                        {((organization as any).governmentLevel || (organization as any).governmentType || "Apex Organization").replace(/_/g, " ")}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase">Registration / CIN</div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5">
                        {organization.registrationNumber || organization.cin || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase">PAN / GSTIN</div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5">
                        {[organization.pan, organization.gst].filter(Boolean).join(" / ") || "—"}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {isClarification && (
              <Link
                href={editRoute}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
              >
                <FileText className="h-4 w-4" /> Respond to Clarification & Edit Details
              </Link>
            )}

            {isRejected && (
              <button
                onClick={handleReapply}
                disabled={reapplying}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
              >
                {reapplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Re-apply & Modify Application
              </button>
            )}

            <Link
              href="/organization/onboarding/details"
              className="inline-flex items-center gap-2 rounded-xl bg-[#14274e] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0f1d3a] transition-all cursor-pointer"
            >
              <FileText className="h-4 w-4" /> View Saved Details
            </Link>
            <button
              onClick={fetchStatus}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-all cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-500" /> Refresh Status
            </button>
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}

export function OrganizationRolesWorkspace() {
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", description: "", permissionKeys: [] as string[] });

  const load = async () => {
    try {
      const [roleData, permissionData] = await Promise.all([apiFetch<OrgRole[]>("/org/roles"), apiFetch<Permission[]>("/org/permissions")]);
      setRoles(roleData);
      setPermissions(permissionData);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await apiFetch("/org/roles", { method: "POST", body: JSON.stringify(form) });
    setForm({ name: "", description: "", permissionKeys: [] });
    await load();
  };

  const deleteRole = async (role: OrgRole) => {
    if (!window.confirm(`Delete role ${role.name}?`)) return;
    await apiFetch(`/org/roles/${role.id}`, { method: "DELETE" });
    await load();
  };

  const togglePermission = (key: string) => {
    setForm((current) => ({
      ...current,
      permissionKeys: current.permissionKeys.includes(key) ? current.permissionKeys.filter((item) => item !== key) : [...current.permissionKeys, key]
    }));
  };

  return (
    <WorkspaceShell eyebrow="Organization" title="Roles and Permissions" description="Create organization-level roles and assign granular permissions.">
      <ErrorBox error={error} />
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <form onSubmit={submit} className="border border-gov-line bg-white p-5 shadow-sm">
          <h2 className="text-base font-extrabold text-gov-navy">Create Role</h2>
          <div className="mt-4 grid gap-3">
            <input placeholder="Role name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="border border-gov-line px-3 py-2.5 text-sm outline-none focus:border-gov-blue" required />
            <input placeholder="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="border border-gov-line px-3 py-2.5 text-sm outline-none focus:border-gov-blue" />
            <div className="max-h-72 overflow-y-auto border border-gov-line">
              {permissions.map((permission) => (
                <label key={permission.key} className="flex cursor-pointer items-start gap-2 border-b border-gov-line px-3 py-2 text-xs">
                  <input type="checkbox" checked={form.permissionKeys.includes(permission.key)} onChange={() => togglePermission(permission.key)} />
                  <span><span className="font-bold text-gov-ink">{permission.key}</span><span className="block text-gov-muted">{permission.description}</span></span>
                </label>
              ))}
            </div>
            <Button type="submit">Create Role</Button>
          </div>
        </form>
        <section className="border border-slate-200/60 bg-white/70 backdrop-blur-xl rounded-2xl shadow-glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-gov-mist text-[11px] uppercase tracking-wider text-gov-muted">
                <tr><th className="px-5 py-3">Role</th><th className="px-5 py-3">Permissions</th><th className="px-5 py-3">Users</th><th className="px-5 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-gov-line">
                {roles.length === 0 ? <EmptyRow colSpan={4} text="No roles yet." /> : roles.map((role) => (
                  <tr key={role.id}>
                    <td className="px-5 py-4 font-bold text-gov-ink">{role.name}<div className="text-xs font-medium text-gov-muted">{role.description}</div></td>
                    <td className="px-5 py-4 text-gov-muted">{role.rolePermissions?.length || 0}</td>
                    <td className="px-5 py-4 text-gov-muted">{role._count?.userRoles || 0}</td>
                    <td className="px-5 py-4 text-right">{!role.isSystemRole && <Button size="sm" variant="danger" onClick={() => deleteRole(role)}><Trash2 size={14} /></Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}

export function OrganizationUsersWorkspace() {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "111111", role: "NGO_MEMBER", roleId: "" });

  const load = async () => {
    try {
      const [userData, roleData] = await Promise.all([apiFetch<OrgUser[]>("/org/users"), apiFetch<OrgRole[]>("/org/roles")]);
      setUsers(userData);
      setRoles(roleData);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); }, []);

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    await apiFetch("/org/users/invite", { method: "POST", body: JSON.stringify(form) });
    setForm((current) => ({ ...current, email: "" }));
    await load();
  };

  const updateStatus = async (user: OrgUser, accountStatus: string) => {
    await apiFetch(`/org/users/${user.id}/status`, { method: "PATCH", body: JSON.stringify({ accountStatus }) });
    await load();
  };

  return (
    <WorkspaceShell eyebrow="Organization" title="Users" description="Invite users, assign roles and deactivate accounts inside your organization.">
      <ErrorBox error={error} />
      <form onSubmit={invite} className="grid gap-3 border border-gov-line bg-white p-5 shadow-sm md:grid-cols-[1fr_0.7fr_0.7fr_auto]">
        <input placeholder="Email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="border border-gov-line px-3 py-2.5 text-sm outline-none focus:border-gov-blue" required />
        <input placeholder="Temporary password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className="border border-gov-line px-3 py-2.5 text-sm outline-none focus:border-gov-blue" required />
        <select value={form.roleId} onChange={(event) => setForm((current) => ({ ...current, roleId: event.target.value }))} className="border border-gov-line px-3 py-2.5 text-sm outline-none focus:border-gov-blue">
          <option value="">No role</option>
          {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
        </select>
        <Button type="submit"><Plus size={16} className="mr-2" /> Invite</Button>
      </form>
      <section className="border border-slate-200/60 bg-white/70 backdrop-blur-xl rounded-2xl shadow-glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-gov-mist text-[11px] uppercase tracking-wider text-gov-muted">
              <tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-gov-line">
              {users.length === 0 ? <EmptyRow colSpan={4} text="No organization users." /> : users.map((user) => (
                <tr key={user.id}>
                  <td className="px-5 py-4 font-bold text-gov-ink">{user.email}</td>
                  <td className="px-5 py-4 text-gov-muted">{user.organizationRoles?.map((assignment) => assignment.role.name).join(", ") || user.role}</td>
                  <td className="px-5 py-4"><Badge>{user.accountStatus}</Badge></td>
                  <td className="px-5 py-4 text-right">
                    <Button size="sm" variant={user.accountStatus === "ACTIVE" ? "secondary" : "primary"} onClick={() => updateStatus(user, user.accountStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}>
                      {user.accountStatus === "ACTIVE" ? "Suspend" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </WorkspaceShell>
  );
}

export function AdminOrganizationsWorkspace() {
  const [items, setItems] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: "", email: "", district: "" });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const orgs = await apiFetch<Organization[]>("/admin/organizations");
      const rawOrgs = Array.isArray(orgs) ? orgs : (orgs as any)?.data || [];
      const depts = rawOrgs.filter((org: any) => {
        const type = String(org.organizationType || org.kind || "").toUpperCase();
        return (
          type === "GOVERNMENT_DEPARTMENT" ||
          type === "GOVT_DEPT" ||
          type === "PORTAL_ADMIN_ORG" ||
          Boolean(org.govDeptProfile)
        );
      });
      setItems(depts.length > 0 ? depts : rawOrgs);
    } catch (err: any) {
      setError(err.message || "Unable to load organizations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const action = async (id: string, type: "approve" | "reject" | "request-clarification" | "suspend") => {
    const remarks = type === "approve" ? undefined : window.prompt("Remarks or reason") || undefined;
    if (type !== "approve" && !remarks) return;
    await apiFetch(`/admin/organizations/${id}/${type}`, {
      method: "POST",
      body: JSON.stringify(type === "reject" ? { rejectionReason: remarks } : { remarks })
    });
    await load();
  };

  const handleCreateDept = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      await apiFetch("/admin/organizations", {
        method: "POST",
        body: JSON.stringify({
          name: deptForm.name.trim(),
          email: deptForm.email.trim() || undefined,
          district: deptForm.district || undefined,
          kind: "GOVERNMENT_DEPARTMENT"
        })
      });
      setCreateModalOpen(false);
      setDeptForm({ name: "", email: "", district: "" });
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to create government department");
    } finally {
      setCreating(false);
    }
  };

  const filtered = items.filter((item) => {
    const typeStr = String(item.organizationType || item.kind || "");
    const statusStr = String(item.onboardingStatus || item.status || "");
    return `${item.name} ${typeStr} ${item.district || ""} ${statusStr}`.toLowerCase().includes(search.toLowerCase());
  });

return (
    <WorkspaceShell
      eyebrow="Portal Admin"
      title="Government Departments"
      description="Review government department organizations in this portal instance and manage onboarding status."
      actions={
        <Button onClick={() => setCreateModalOpen(true)} className="w-full sm:w-auto justify-center">
          <Plus size={16} className="mr-1.5 inline" /> Add Department
        </Button>
      }
    >
      <ErrorBox error={error} />
      <section className="border border-slate-200/60 bg-white/70 backdrop-blur-xl rounded-2xl shadow-glass overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-gov-line p-4 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:max-w-sm">
            <SearchBox value={search} onChange={setSearch} placeholder="Search departments..." />
          </div>
          <div className="text-xs font-bold text-gov-muted text-right">{filtered.length} department(s)</div>
        </div>
        
        {/* Wrapper: Handles overflow on desktop, full width on mobile */}
        <div className="w-full md:overflow-x-auto p-4 md:p-0 bg-slate-50/50 md:bg-transparent">
          <table className="w-full block md:table text-left text-sm border-collapse">
            <thead className="hidden md:table-header-group bg-gov-mist text-[11px] uppercase tracking-wider text-gov-muted">
              <tr>
                <th className="px-5 py-3 font-bold">Organization</th>
                <th className="px-5 py-3 font-bold">Type</th>
                <th className="px-5 py-3 font-bold">District</th>
                <th className="px-5 py-3 font-bold">Onboarding</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th className="px-5 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group divide-y-0 md:divide-y md:divide-gov-line">
              {loading ? (
                <LoadingRow colSpan={6} />
              ) : filtered.length === 0 ? (
                <EmptyRow colSpan={6} text="No government departments found." />
              ) : (
                filtered.map((item) => (
                  <tr 
                    key={item.id} 
                    className="block md:table-row mb-4 md:mb-0 bg-white md:bg-transparent border border-slate-200 md:border-none rounded-xl md:rounded-none shadow-sm md:shadow-none hover:bg-slate-50/50 transition-colors overflow-hidden"
                  >
                    <td data-label="Organization" className="flex md:table-cell flex-col md:flex-row items-start md:items-center px-4 md:px-5 py-3.5 md:py-4 border-b border-slate-100 md:border-none before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-bold before:text-slate-400 before:md:hidden before:mb-1">
                      <div className="flex flex-col items-start md:items-start w-full text-left">
                        <Link href={`/admin/organizations/${item.id}`} className="font-bold text-gov-blue hover:underline break-words">
                          {item.name}
                        </Link>
                        <div className="text-xs font-medium text-gov-muted break-all">
                          {item.email || "-"}
                        </div>
                      </div>
                    </td>
                    <td data-label="Type" className="flex md:table-cell justify-between items-center px-4 md:px-5 py-3.5 md:py-4 border-b border-slate-100 md:border-none text-gov-muted font-medium before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-bold before:text-slate-400 before:md:hidden text-right md:text-left">
                      {String(item.organizationType || item.kind || "GOVERNMENT_DEPARTMENT").replace(/_/g, " ")}
                    </td>
                    <td data-label="District" className="flex md:table-cell justify-between items-center px-4 md:px-5 py-3.5 md:py-4 border-b border-slate-100 md:border-none text-gov-muted font-medium before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-bold before:text-slate-400 before:md:hidden text-right md:text-left">
                      {item.district || "-"}
                    </td>
                    <td data-label="Onboarding" className="flex md:table-cell justify-between items-center px-4 md:px-5 py-3.5 md:py-4 border-b border-slate-100 md:border-none before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-bold before:text-slate-400 before:md:hidden text-right md:text-left">
                      <Badge>{item.onboardingStatus || item.status || "ACTIVE"}</Badge>
                    </td>
                    <td data-label="Status" className="flex md:table-cell justify-between items-center px-4 md:px-5 py-3.5 md:py-4 border-b border-slate-100 md:border-none before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-bold before:text-slate-400 before:md:hidden text-right md:text-left">
                      <Badge>{item.status || "ACTIVE"}</Badge>
                    </td>
                    <td className="block md:table-cell px-4 md:px-5 py-3.5 md:py-4 text-right bg-slate-50/50 md:bg-transparent">
                      <div className="flex flex-wrap md:flex-nowrap justify-end gap-2">
                        <Button size="sm" className="flex-1 md:flex-none justify-center text-xs" onClick={() => action(item.id, "approve")}>
                          Approve
                        </Button>
                        <Button size="sm" variant="secondary" className="flex-1 md:flex-none justify-center text-xs" onClick={() => action(item.id, "request-clarification")}>
                          Clarify
                        </Button>
                        <Button size="sm" variant="danger" className="w-full sm:flex-1 md:flex-none justify-center text-xs mt-1 sm:mt-0" onClick={() => action(item.id, "suspend")}>
                          Suspend
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* CREATE DEPARTMENT MODAL */}
      <GovModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Add Government Department" width={560}>
        <form onSubmit={handleCreateDept} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
            Department Name *
            <input
              type="text"
              required
              value={deptForm.name}
              onChange={(e) => setDeptForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Planning Department Maharashtra"
              className="border border-slate-200 rounded-lg p-2.5 text-sm font-medium outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-shadow"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
            Official Email
            <input
              type="email"
              value={deptForm.email}
              onChange={(e) => setDeptForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="e.g. planning@mahacsr.gov.in"
              className="border border-slate-200 rounded-lg p-2.5 text-sm font-medium outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-shadow"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-700">
            District
            <input
              type="text"
              value={deptForm.district}
              onChange={(e) => setDeptForm((prev) => ({ ...prev, district: e.target.value }))}
              placeholder="e.g. Mumbai / All Districts"
              className="border border-slate-200 rounded-lg p-2.5 text-sm font-medium outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-shadow"
            />
          </label>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" className="w-full sm:w-auto justify-center" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating} className="w-full sm:w-auto justify-center">
              {creating ? "Creating..." : "Create Department"}
            </Button>
          </div>
        </form>
      </GovModal>
    </WorkspaceShell>
  );
}

export function AdminOrganizationDetailsWorkspace({ organizationId }: { organizationId: string }) {
  const [organization, setOrganization] = useState<any | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      setOrganization(await apiFetch<any>(`/admin/organizations/${organizationId}`));
    } catch (err: any) {
      setError(err.message || "Unable to load organization");
    }
  };

  useEffect(() => { load(); }, [organizationId]);

  const toast = useToastActions();
  const [actionLoading, setActionLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const [actionModal, setActionModal] = useState<{
    open: boolean;
    type: "request-clarification" | "reject" | "suspend" | null;
    title: string;
    description: string;
    remarks: string;
    submitLabel: string;
    isDanger: boolean;
  }>({
    open: false,
    type: null,
    title: "",
    description: "",
    remarks: "",
    submitLabel: "",
    isDanger: false,
  });

  const openActionModal = (type: "request-clarification" | "reject" | "suspend") => {
    setError("");
    if (type === "request-clarification") {
      setActionModal({
        open: true,
        type,
        title: "Request Clarification",
        description: "Please specify the additional details or missing statutory documents required from the organization before proceeding.",
        remarks: "",
        submitLabel: "Send Clarification Request",
        isDanger: false,
      });
    } else if (type === "reject") {
      setActionModal({
        open: true,
        type,
        title: "Reject Onboarding Application",
        description: "Specify the formal reason for rejecting this organization's onboarding application. This will be recorded in the audit log.",
        remarks: "",
        submitLabel: "Confirm Rejection",
        isDanger: true,
      });
    } else if (type === "suspend") {
      setActionModal({
        open: true,
        type,
        title: "Suspend Organization Access",
        description: "Specify the reason for suspending access for this organization.",
        remarks: "",
        submitLabel: "Confirm Suspension",
        isDanger: true,
      });
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal.type) return;
    if (!actionModal.remarks.trim()) {
      setError("Please enter remarks or reason before submitting.");
      return;
    }
    const targetType = actionModal.type;
    const remarksText = actionModal.remarks.trim();
    setActionModal((prev) => ({ ...prev, open: false }));
    await executeAction(targetType, remarksText);
  };

  const executeAction = async (type: "approve" | "reject" | "request-clarification" | "suspend", remarks?: string) => {
    setError("");
    setActionLoading(true);
    setActiveAction(type);
    try {
      await apiFetch(`/admin/organizations/${organizationId}/${type}`, {
        method: "POST",
        body: JSON.stringify(type === "reject" ? { rejectionReason: remarks } : { remarks })
      });
      await load();
      toast.success(
        "Action Completed",
        `Organization successfully ${type === "approve" ? "approved & activated" : type === "reject" ? "rejected" : type === "request-clarification" ? "clarification requested" : "suspended"}.`
      );
    } catch (err: any) {
      const msg = err.message || `Unable to ${type} organization`;
      setError(msg);
      toast.error("Action Failed", msg);
    } finally {
      setActionLoading(false);
      setActiveAction(null);
    }
  };

  const org = organization || {};
  const csrProfile = org.csrCompanyProfile || {};
  const ngoProf = org.ngoProfile || {};
  const govProf = org.govDeptProfile || {};

  const email = org.officialEmail || org.email || "-";
  const phone = org.officialPhone || org.phone || "-";
  const district = org.district || org.registeredOfficeAddress || org.address || "-";
  const taluka = org.taluka || "-";
  const regNo = org.registrationNumber || org.cin || "-";
  const pan = org.pan || "-";
  const gst = org.gstin || org.gst || "-";
  const typeLabel = (org.organizationType || org.kind || "CSR_COMPANY").toString().replace(/_/g, " ");
  const statusLabel = org.onboardingStatus || org.status || "UNDER_VERIFICATION";
  const year = org.yearOfIncorporation || "-";
  const companyType = org.companyType || "Private Limited Company";
  const mcaStatus = org.mcaVerificationStatus || "VERIFIED";
  const website = org.website || "-";
  const fullAddress = org.address || org.registeredOfficeAddress || org.corporateOfficeAddress || "-";

  const formatCurrency = (val: any) => {
    if (!val || isNaN(Number(val))) return "N/A";
    const num = Number(val);
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakh`;
    return `₹${num.toLocaleString("en-IN")}`;
  };

  const docs = Array.isArray(org.documents) ? org.documents : [];

return (
    <WorkspaceShell
      eyebrow="Portal Admin"
      title={org.name || "Organization Onboarding Details"}
      description="Review complete statutory profile, contact location, CSR financial outlay, and submitted documents."
      actions={
        <Link href="/admin/onboarding-approvals" className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors border border-slate-200">
          ← Back to Approvals List
        </Link>
      }
    >
      <ErrorBox error={error} />
      {!organization ? (
        <div className="py-12 flex justify-center bg-white rounded-2xl border border-slate-200">
          <Loader2 size={32} className="animate-spin text-blue-900" />
        </div>
      ) : (
        /* Added -mx-3 to pull the layout closer to the screen edges on mobile */
        <div className="-mx-3 sm:mx-0 space-y-4 md:space-y-6">
          
          {/* Header Identity Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 md:p-6 shadow-xs flex flex-col md:flex-row md:items-start lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full md:w-auto">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 font-extrabold text-xl shadow-2xs">
                <Building2 size={24} className="sm:w-[28px] sm:h-[28px]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 break-words leading-tight">{org.name || org.legalName}</h1>
                  <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 uppercase whitespace-nowrap">
                    {typeLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1 md:mt-0">
                  CIN / Reg: <span className="font-mono font-bold text-purple-700 break-all">{regNo}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 border-t border-slate-100 pt-3 md:border-0 md:pt-0 w-full md:w-auto">
              <span className="px-2.5 py-1 sm:px-3 rounded-full text-[10px] sm:text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                {statusLabel}
              </span>
              <span className="px-2.5 py-1 sm:px-3 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {org.status || "REGISTERED"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Left 2 Columns: Information Panels */}
            <div className="lg:col-span-2 space-y-4 lg:space-y-6">
              
              {/* Section 1: Statutory & Registration Profile */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 md:p-6 shadow-xs space-y-4">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                  <ShieldCheck size={16} className="text-purple-600 shrink-0" /> Statutory & Registration Profile
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium mb-0.5">Legal Registered Name</span>
                    <span className="font-bold text-slate-900 break-words">{org.legalName || org.name || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium mb-0.5">PAN Number</span>
                    <span className="font-mono font-bold text-slate-900 break-all">{pan}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium mb-0.5">GSTIN Number</span>
                    <span className="font-mono font-bold text-slate-900 break-all">{gst}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium mb-0.5">Registration / CIN</span>
                    <span className="font-mono font-semibold text-slate-800 break-all">{regNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium mb-0.5">Company Structure / Type</span>
                    <span className="font-semibold text-slate-800">{companyType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium mb-0.5">Year of Incorporation</span>
                    <span className="font-semibold text-slate-800">{year}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium mb-0.5">MCA Statutory Check</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 size={13} className="shrink-0" /> {mcaStatus}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium mb-0.5">Company Status</span>
                    <span className="font-bold text-blue-900 uppercase">{org.companyStatus || "ACTIVE"}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Contact & Headquarters Location */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 md:p-6 shadow-xs space-y-4">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                  <MapPin size={16} className="text-blue-600 shrink-0" /> Contact & Headquarters Location
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium mb-0.5">Official Email Address</span>
                    <span className="font-bold text-slate-900 break-all">{email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium mb-0.5">Official Contact Phone</span>
                    <span className="font-bold text-slate-900">{phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium mb-0.5">Official Website</span>
                    <a href={website !== "-" && !website.startsWith('http') ? `https://${website}` : website} target="_blank" rel="noreferrer" className="font-bold text-blue-600 break-all hover:underline">{website}</a>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium mb-0.5">District, State & Pincode</span>
                    <span className="font-semibold text-slate-800">{district}, {org.state || "Maharashtra"} {org.pincode ? `- ${org.pincode}` : ""}</span>
                  </div>
                </div>
                {fullAddress !== "-" && (
                  <div className="pt-3 border-t border-slate-100 text-xs">
                    <span className="text-slate-400 block font-medium mb-0.5">Registered Office Address</span>
                    <span className="font-medium text-slate-800">{fullAddress}</span>
                  </div>
                )}
                {org.corporateOfficeAddress && org.corporateOfficeAddress !== fullAddress && (
                  <div className="pt-2 text-xs">
                    <span className="text-slate-400 block font-medium mb-0.5">Corporate Office Address</span>
                    <span className="font-medium text-slate-800">{org.corporateOfficeAddress}</span>
                  </div>
                )}
              </div>

              {/* Section 3: CSR Company Profile */}
              {(csrProfile.annualCsrBudget || csrProfile.netWorth || typeLabel.includes("COMPANY") || typeLabel.includes("CORPORATE")) && (
                <div className="rounded-2xl border border-purple-200/80 bg-purple-50/40 p-3.5 sm:p-4 md:p-6 shadow-xs space-y-5">
                  <h3 className="text-xs font-extrabold text-purple-950 uppercase tracking-wider flex items-center gap-2 border-b border-purple-200/60 pb-3">
                    <Coins size={16} className="text-amber-600 shrink-0" /> CSR Portfolio, Outlay & Strategy
                  </h3>

                  {/* Financial Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-3 text-xs">
                    <div className="bg-white p-2.5 md:p-3 rounded-xl border border-purple-100 shadow-2xs flex flex-col justify-center">
                      <span className="text-slate-400 block text-[10px] font-extrabold uppercase truncate">CSR Budget</span>
                      <span className="font-extrabold text-purple-900 text-sm md:text-sm truncate" title={formatCurrency(csrProfile.annualCsrBudget || csrProfile.currentYearCsrBudget)}>{formatCurrency(csrProfile.annualCsrBudget || csrProfile.currentYearCsrBudget)}</span>
                    </div>
                    <div className="bg-white p-2.5 md:p-3 rounded-xl border border-purple-100 shadow-2xs flex flex-col justify-center">
                      <span className="text-slate-400 block text-[10px] font-extrabold uppercase truncate">Net Worth</span>
                      <span className="font-extrabold text-slate-900 text-sm md:text-sm truncate" title={formatCurrency(csrProfile.netWorth)}>{formatCurrency(csrProfile.netWorth)}</span>
                    </div>
                    <div className="bg-white p-2.5 md:p-3 rounded-xl border border-purple-100 shadow-2xs flex flex-col justify-center">
                      <span className="text-slate-400 block text-[10px] font-extrabold uppercase truncate">Turnover</span>
                      <span className="font-extrabold text-slate-900 text-sm md:text-sm truncate" title={formatCurrency(csrProfile.turnover)}>{formatCurrency(csrProfile.turnover)}</span>
                    </div>
                    <div className="bg-white p-2.5 md:p-3 rounded-xl border border-purple-100 shadow-2xs flex flex-col justify-center">
                      <span className="text-slate-400 block text-[10px] font-extrabold uppercase truncate">Net Profit</span>
                      <span className="font-extrabold text-slate-900 text-sm md:text-sm truncate" title={formatCurrency(csrProfile.netProfit)}>{formatCurrency(csrProfile.netProfit)}</span>
                    </div>
                    <div className="bg-white p-2.5 md:p-3 rounded-xl border border-purple-100 shadow-2xs flex flex-col justify-center">
                      <span className="text-slate-400 block text-[10px] font-extrabold uppercase truncate">2% Obligation</span>
                      <span className="font-extrabold text-amber-900 text-sm md:text-sm truncate" title={formatCurrency(csrProfile.twoPercentCsrObligation || csrProfile.csrObligationAmount)}>{formatCurrency(csrProfile.twoPercentCsrObligation || csrProfile.csrObligationAmount)}</span>
                    </div>
                    <div className="bg-white p-2.5 md:p-3 rounded-xl border border-purple-100 shadow-2xs flex flex-col justify-center">
                      <span className="text-slate-400 block text-[10px] font-extrabold uppercase truncate">Unspent CSR</span>
                      <span className="font-extrabold text-slate-900 text-sm md:text-sm truncate" title={formatCurrency(csrProfile.unspentCsrAmount)}>{formatCurrency(csrProfile.unspentCsrAmount)}</span>
                    </div>
                    <div className="bg-white p-2.5 md:p-3 rounded-xl border border-purple-100 shadow-2xs flex flex-col justify-center">
                      <span className="text-slate-400 block text-[10px] font-extrabold uppercase truncate">CSR Reg No</span>
                      <span className="font-mono font-bold text-indigo-900 text-xs truncate" title={csrProfile.csrRegistrationNo || "-"}>{csrProfile.csrRegistrationNo || "-"}</span>
                    </div>
                    <div className="bg-white p-2.5 md:p-3 rounded-xl border border-purple-100 shadow-2xs flex flex-col justify-center">
                      <span className="text-slate-400 block text-[10px] font-extrabold uppercase truncate">Financial Year</span>
                      <span className="font-bold text-slate-800 text-xs truncate" title={csrProfile.financialYear || "FY 2025-26"}>{csrProfile.financialYear || "FY 2025-26"}</span>
                    </div>
                  </div>

                  {/* CSR Head Contact Card */}
                  {(csrProfile.csrHeadName || csrProfile.csrHeadEmail || csrProfile.csrHeadMobile) && (
                    <div className="bg-white p-3.5 md:p-4 rounded-xl border border-purple-100 space-y-2 text-xs">
                      <h4 className="font-bold text-purple-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <UserCheck size={14} className="text-purple-700 shrink-0" /> Designated CSR Head
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div>
                          <span className="text-slate-400 block text-[10px] mb-0.5">Name</span>
                          <span className="font-bold text-slate-900 break-words">{csrProfile.csrHeadName || "-"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] mb-0.5">Email</span>
                          <span className="font-bold text-slate-900 break-all">{csrProfile.csrHeadEmail || "-"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] mb-0.5">Mobile</span>
                          <span className="font-bold text-slate-900">{csrProfile.csrHeadMobile || "-"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sector & Geography Preferences */}
                  <div className="bg-white p-3.5 md:p-4 rounded-xl border border-purple-100 space-y-3 text-xs">
                    <h4 className="font-bold text-purple-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Target size={14} className="text-purple-700 shrink-0" /> Target Preferences
                    </h4>

                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase mb-1.5">Preferred Focus Sectors</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(csrProfile.preferredSectors || []).length > 0 ? (
                          csrProfile.preferredSectors.map((s: string, i: number) => (
                            <span key={i} className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 font-bold border border-purple-200 text-[10px] md:text-[11px]">
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 font-medium">All Maharashtra CSR Development Sectors</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase mb-1.5">Target Focus Districts</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(csrProfile.preferredDistricts || []).length > 0 ? (
                          csrProfile.preferredDistricts.map((d: string, i: number) => (
                            <span key={i} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 font-bold border border-blue-200 text-[10px] md:text-[11px]">
                              {d}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 font-medium">Statewide (All 36 Districts)</span>
                        )}
                      </div>
                    </div>

                    {(csrProfile.sdgFocusAreas || csrProfile.preferredBeneficiaryGroups || csrProfile.implementationPreference) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                        {csrProfile.sdgFocusAreas && (
                          <div>
                            <span className="text-slate-400 block text-[10px] mb-0.5">SDG Focus Areas</span>
                            <span className="font-semibold text-slate-800 break-words">{csrProfile.sdgFocusAreas}</span>
                          </div>
                        )}
                        {csrProfile.preferredBeneficiaryGroups && (
                          <div>
                            <span className="text-slate-400 block text-[10px] mb-0.5">Beneficiary Groups</span>
                            <span className="font-semibold text-slate-800 break-words">{csrProfile.preferredBeneficiaryGroups}</span>
                          </div>
                        )}
                        {csrProfile.implementationPreference && (
                          <div className="sm:col-span-2 md:col-span-1">
                            <span className="text-slate-400 block text-[10px] mb-0.5">Implementation Model</span>
                            <span className="font-semibold text-slate-800 break-words">{csrProfile.implementationPreference}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section 4: NGO Profile Details (If NGO) */}
              {(ngoProf.darpanNumber || ngoProf.csr1Number || typeLabel.includes("NGO")) && (
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-3.5 sm:p-4 md:p-6 shadow-xs space-y-4">
                  <h3 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-2 border-b border-emerald-200/60 pb-3">
                    <HeartHandshake size={16} className="text-emerald-700 shrink-0" /> NGO Registration & Statutory Accreditation
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium mb-0.5">NITI Aayog DARPAN ID</span>
                      <span className="font-mono font-bold text-emerald-900 break-all">{ngoProf.darpanNumber || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium mb-0.5">MCA CSR-1 Registration</span>
                      <span className="font-mono font-bold text-emerald-900 break-all">{ngoProf.csr1Number || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium mb-0.5">Year Established</span>
                      <span className="font-semibold text-slate-800">{ngoProf.yearEstablished || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium mb-0.5">FCRA Registration</span>
                      <span className="font-semibold text-slate-800">{ngoProf.fcraDetails || "Not Applicable"}</span>
                    </div>
                    {ngoProf.certificate12AUrl && (
                      <div>
                        <span className="text-slate-400 block font-medium mb-0.5">12A Certificate</span>
                        <a href={ngoProf.certificate12AUrl} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1"><ExternalLink size={12}/> View 12A</a>
                      </div>
                    )}
                    {ngoProf.certificate80GUrl && (
                      <div>
                        <span className="text-slate-400 block font-medium mb-0.5">80G Certificate</span>
                        <a href={ngoProf.certificate80GUrl} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1"><ExternalLink size={12}/> View 80G</a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section 5: Government Profile */}
              {(govProf.nodalOfficerName || typeLabel.includes("GOVERNMENT") || typeLabel.includes("GOVT")) && (
                <div className="rounded-2xl border border-purple-200/80 bg-purple-50/40 p-3.5 sm:p-4 md:p-6 shadow-xs space-y-4">
                  <h3 className="text-xs font-extrabold text-purple-950 uppercase tracking-wider flex items-center gap-2 border-b border-purple-200/60 pb-3">
                    <ShieldCheck size={16} className="text-purple-700 shrink-0" /> Government Department Profile & Nodal Contact
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium mb-0.5">Department Type</span>
                      <span className="font-bold text-purple-900 break-words">{govProf.departmentType || "State Government Department"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium mb-0.5">Nodal Officer Name</span>
                      <span className="font-bold text-slate-900 break-words">{govProf.nodalOfficerName || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium mb-0.5">Designation</span>
                      <span className="font-semibold text-slate-800 break-words">{govProf.nodalOfficerDesignation || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium mb-0.5">Nodal Email</span>
                      <span className="font-bold text-blue-900 break-all">{govProf.nodalOfficerEmail || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium mb-0.5">Nodal Mobile</span>
                      <span className="font-semibold text-slate-800">{govProf.nodalOfficerMobile || "-"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right 1 Column: Documents & Decision Actions */}
            <div className="space-y-4 lg:space-y-6">
              
              {/* Approval Decision Controls */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 md:p-6 shadow-xs space-y-4">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center justify-between">
                  <span>Decision Controls</span>
                  {(org.onboardingStatus === "APPROVED" || org.status === "ACTIVE" || org.onboardingStatus === "ACTIVE") && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-300 ml-2">
                      ✓ APPROVED
                    </span>
                  )}
                </h3>
                <div className="flex flex-col gap-2.5">
                  {(org.onboardingStatus === "APPROVED" || org.status === "ACTIVE" || org.onboardingStatus === "ACTIVE") ? (
                    <div className="w-full rounded-xl bg-emerald-50 border border-emerald-200/90 p-3.5 text-center text-xs font-extrabold text-emerald-800 flex items-center justify-center gap-2 shadow-2xs">
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      Approved & Active
                    </div>
                  ) : (
                    <Button
                      onClick={() => executeAction("approve")}
                      loading={actionLoading && activeAction === "approve"}
                      disabled={actionLoading}
                      className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 shadow-2xs cursor-pointer"
                    >
                      <CheckCircle2 size={16} className="mr-1.5 shrink-0" /> Approve & Activate
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    onClick={() => openActionModal("request-clarification")}
                    loading={actionLoading && activeAction === "request-clarification"}
                    disabled={actionLoading}
                    className="w-full justify-center font-bold cursor-pointer text-center text-xs sm:text-sm py-2.5"
                  >
                    <FileText size={16} className="mr-1.5 text-amber-600 shrink-0" /> Request Clarification
                  </Button>

                  {(org.onboardingStatus === "REJECTED" || org.status === "REJECTED") ? (
                    <div className="w-full rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-center text-xs font-extrabold text-rose-800 flex items-center justify-center gap-2">
                      <XCircle size={16} className="text-rose-600 shrink-0" />
                      Application Rejected
                    </div>
                  ) : (
                    <Button
                      variant="danger"
                      onClick={() => openActionModal("reject")}
                      loading={actionLoading && activeAction === "reject"}
                      disabled={actionLoading}
                      className="w-full justify-center font-bold cursor-pointer py-2.5"
                    >
                      Reject Application
                    </Button>
                  )}

                  {(org.onboardingStatus === "SUSPENDED" || org.status === "SUSPENDED") ? (
                    <div className="w-full rounded-xl bg-slate-100 border border-slate-300 p-3.5 text-center text-xs font-extrabold text-slate-700 flex items-center justify-center gap-2">
                      <AlertCircle size={16} className="text-slate-500 shrink-0" />
                      Access Suspended
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => openActionModal("suspend")}
                      loading={actionLoading && activeAction === "suspend"}
                      disabled={actionLoading}
                      className="w-full justify-center font-bold text-slate-600 cursor-pointer py-2.5"
                    >
                      Suspend Organization
                    </Button>
                  )}
                </div>
              </div>

              {/* Remarks History Banner */}
              {(org.clarificationRemarks || org.rejectionReason) && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 md:p-5 space-y-2 text-xs text-amber-900 break-words">
                  <h4 className="font-extrabold uppercase tracking-wider text-[11px] text-amber-950 flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0" /> Process Remarks
                  </h4>
                  {org.clarificationRemarks && <p><strong>Clarification Requested:</strong> {org.clarificationRemarks}</p>}
                  {org.rejectionReason && <p><strong>Rejection Reason:</strong> {org.rejectionReason}</p>}
                </div>
              )}

              {/* Uploaded Statutory Documents List */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 md:p-6 shadow-xs space-y-4">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                  Submitted Documents ({docs.length})
                </h3>
                {docs.length === 0 ? (
                  <div className="p-4 sm:p-5 text-center text-xs font-medium text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No statutory documents uploaded yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {docs.map((doc: any) => (
                      <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs hover:border-blue-200 transition-colors gap-2 sm:gap-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText size={16} className="text-indigo-600 shrink-0" />
                          <div className="truncate min-w-0">
                            <span className="font-bold text-slate-900 block truncate text-xs">{doc.title || doc.fileName || doc.documentType}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{doc.documentType}</span>
                          </div>
                        </div>
                        {doc.fileUrl ? (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 w-full sm:w-auto inline-flex items-center justify-center sm:justify-start gap-1 px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 transition-colors"
                          >
                            View <ExternalLink size={11} />
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">Uploaded</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Action Remarks Modal */}
      <GovModal open={actionModal.open} onClose={() => setActionModal(prev => ({ ...prev, open: false }))} title={actionModal.title} width={520}>
        <form onSubmit={handleModalSubmit} className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            {actionModal.description}
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-900">
              Remarks / Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={actionModal.remarks}
              onChange={(e) => setActionModal(prev => ({ ...prev, remarks: e.target.value }))}
              placeholder="Enter remarks or reason for this decision..."
              className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" className="w-full sm:w-auto justify-center" onClick={() => setActionModal(prev => ({ ...prev, open: false }))}>
              Cancel
            </Button>
            <Button type="submit" variant={actionModal.isDanger ? "danger" : "primary"} className="w-full sm:w-auto justify-center" loading={actionLoading}>
              {actionModal.submitLabel}
            </Button>
          </div>
        </form>
      </GovModal>
    </WorkspaceShell>
  );
}

export function OrganizationSettingsWorkspace() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<Organization>("/onboarding/status").then(setOrganization).catch((err) => setError(err.message));
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!organization) return;
    setSaving(true);
    setError("");
    try {
      setOrganization(await apiFetch<Organization>("/onboarding/profile", {
        method: "PUT",
        body: JSON.stringify(organization)
      }));
    } catch (err: any) {
      setError(err.message || "Unable to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkspaceShell eyebrow="Organization" title="Organization Settings" description="Maintain operational profile details used for onboarding, approvals and workflow routing.">
      <ErrorBox error={error} />
      {!organization ? (
        <div className="animate-pulse space-y-4 rounded-md border border-gov-line bg-white p-6">
          <div className="h-6 w-1/3 rounded bg-slate-200" />
          <div className="h-4 w-1/2 rounded bg-slate-100" />
          <div className="h-24 w-full rounded bg-slate-50" />
        </div>
      ) : (
        <form onSubmit={save} className="grid gap-4 border border-gov-line bg-white p-5 shadow-sm md:grid-cols-2">
          {[
            ["name", "Organization Name"],
            ["email", "Official Email"],
            ["phone", "Official Phone"],
            ["district", "District"],
            ["taluka", "Taluka"],
            ["registrationNumber", "Registration Number"],
            ["pan", "PAN"],
            ["gst", "GST"]
          ].map(([key, label]) => (
            <label key={key} className="flex flex-col gap-1.5 text-sm font-bold text-gov-ink">
              {label}
              <input
                value={(organization as any)[key] || ""}
                onChange={(event) => setOrganization((current) => current ? { ...current, [key]: event.target.value } : current)}
                className="border border-gov-line px-3 py-2.5 text-sm font-medium outline-none focus:border-gov-blue"
              />
            </label>
          ))}
          <label className="flex flex-col gap-1.5 text-sm font-bold text-gov-ink md:col-span-2">
            Address
            <textarea
              value={organization.address || ""}
              onChange={(event) => setOrganization((current) => current ? { ...current, address: event.target.value } : current)}
              rows={3}
              className="border border-gov-line px-3 py-2.5 text-sm font-medium outline-none focus:border-gov-blue"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 md:col-span-2">
            <Button type="submit" loading={saving}><Save size={16} className="mr-2" /> Save Settings</Button>
            <Link href="/organization/onboarding/status" className="inline-flex min-h-10 items-center border border-gov-line px-4 text-sm font-bold text-gov-blue">Onboarding Status</Link>
          </div>
        </form>
      )}
    </WorkspaceShell>
  );
}

export function MasterSettingsWorkspace() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch<Tenant[]>("/master/tenants"),
      apiFetch<AuditLog[]>("/master/audit-logs")
    ])
      .then(([tenantData, logData]) => {
        setTenants(tenantData);
        setLogs(logData);
      })
      .catch((err) => setError(err.message || "Unable to load settings overview"));
  }, []);

  const activeTenants = tenants.filter((tenant) => tenant.status === "ACTIVE" && !tenant.isHidden).length;

  return (
    <WorkspaceShell eyebrow="Master Admin" title="Global Platform Settings" description="Operational controls for tenant visibility, feature governance and audit posture.">
      <ErrorBox error={error} />
      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Portal Instances", String(tenants.length)],
          ["Active Instances", String(activeTenants)],
          ["Recent Audit Events", String(logs.length)]
        ].map(([label, value]) => (
          <div key={label} className="border border-gov-line bg-white p-5 shadow-sm">
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-gov-muted">{label}</div>
            <div className="mt-2 text-2xl font-extrabold text-gov-navy">{value}</div>
          </div>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="border border-gov-line bg-white p-5 shadow-sm">
          <h2 className="text-base font-extrabold text-gov-navy">Tenant Controls</h2>
          <div className="mt-4 grid gap-3">
            <Link href="/master/tenants" className="inline-flex min-h-10 items-center justify-between border border-gov-line px-4 text-sm font-bold text-gov-blue">Manage Portal Instances <span>View</span></Link>
            <Link href="/master/organizations" className="inline-flex min-h-10 items-center justify-between border border-gov-line px-4 text-sm font-bold text-gov-blue">Manage Organizations <span>View</span></Link>
            <Link href="/master/audit-logs" className="inline-flex min-h-10 items-center justify-between border border-gov-line px-4 text-sm font-bold text-gov-blue">Audit Logs <span>View</span></Link>
          </div>
        </div>
        <div className="border border-gov-line bg-white p-5 shadow-sm">
          <h2 className="text-base font-extrabold text-gov-navy">Feature Governance</h2>
          <div className="mt-4 divide-y divide-gov-line border border-gov-line">
            {tenants.length === 0 ? <div className="p-4 text-sm text-gov-muted">No tenants found.</div> : tenants.slice(0, 5).map((tenant) => (
              <Link key={tenant.id} href={`/master/tenants/${tenant.id}/features`} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span className="font-bold text-gov-ink">{tenant.name}</span>
                <Badge>{tenant.status}</Badge>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </WorkspaceShell>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Eye, Loader2, Plus, Save, Search, ShieldCheck, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/Button";

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
  tenantId: string;
  organizationType: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  district?: string | null;
  taluka?: string | null;
  registrationNumber?: string | null;
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
  description: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 md:px-8">
      <section className="border border-gov-line bg-white shadow-sm">
        <div className="h-1.5 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-gov-saffron">{eyebrow}</div>
            <h1 className="mt-2 text-2xl font-extrabold text-gov-navy">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gov-muted">{description}</p>
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
      </section>
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
        className="w-full border border-gov-line bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-gov-blue"
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
      <section className="border border-gov-line bg-white shadow-sm">
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
            <div className="h-1 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />
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
      <section className="border border-gov-line bg-white shadow-sm">
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
      <section className="border border-gov-line bg-white shadow-sm">
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
            <div className="h-1 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />
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
            <div className="h-1 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />
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
            <div className="h-1 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />
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

// System roles that can be assigned.
const ASSIGNABLE_SYSTEM_ROLES = [
  "SUPER_ADMIN",
  "PORTAL_ADMIN",
  "CSR_ADMIN",
  "DISTRICT_ADMIN",
  "PLANNING_SECRETARY",
  "JOINT_SECRETARY",
  "CSR_RELATIONSHIP_MANAGER",
  "DISTRICT_NODAL_OFFICER",
  "STATE_CSR_CELL",
  "CORPORATE_USER",
  "IMPLEMENTING_AGENCY_USER",
  "BENEFICIARY_AGENCY",
  "COMPANY_ADMIN",
  "COMPANY_MEMBER",
  "NGO_ADMIN",
  "NGO_MEMBER",
  "GOVERNMENT_OFFICER",
  "ANALYST_REVIEWER",
  "COMPLIANCE_REVIEWER",
  "FINANCE_USER",
  "APPROVER",
  "AUDITOR",
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
      <section className="border border-gov-line bg-white shadow-sm">
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
            <div className="h-1 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />
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
            <div className="h-1 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />
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
            <div className="h-1 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />
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
            <div className="h-1 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />
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
      <section className="border border-gov-line bg-white shadow-sm">
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

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await apiFetch<Organization[]>("/admin/organizations/pending"));
    } catch (err: any) {
      setError(err.message || "Unable to load approvals");
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

  return (
    <WorkspaceShell eyebrow="Portal Admin" title="Onboarding Approvals" description="Approve NGO, CSR company and government department onboarding before transactions are allowed.">
      <ErrorBox error={error} />
      <section className="border border-gov-line bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-gov-mist text-[11px] uppercase tracking-wider text-gov-muted">
              <tr><th className="px-5 py-3">Organization</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">District</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-gov-line">
              {loading ? <LoadingRow colSpan={5} /> : items.length === 0 ? <EmptyRow colSpan={5} text="No pending organizations." /> : items.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-4 font-bold text-gov-ink">
                    <Link href={`/admin/onboarding-approvals/${item.id}`} className="text-gov-blue hover:underline">
                      {item.name}
                    </Link>
                    <div className="text-xs font-medium text-gov-muted">{item.email}</div>
                  </td>
                  <td className="px-5 py-4 text-gov-muted">{item.organizationType.replace(/_/g, " ")}</td>
                  <td className="px-5 py-4 text-gov-muted">{item.district || "-"}</td>
                  <td className="px-5 py-4"><Badge>{item.onboardingStatus}</Badge></td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => action(item.id, "approve")}>Approve</Button>
                      <Button size="sm" variant="secondary" onClick={() => action(item.id, "request-clarification")}>Clarify</Button>
                      <Button size="sm" variant="danger" onClick={() => action(item.id, "reject")}>Reject</Button>
                    </div>
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
    const locked = ["SUBMITTED_FOR_REVIEW", "UNDER_VERIFICATION", "APPROVED", "SUSPENDED"];
    if (organization && locked.includes(organization.onboardingStatus)) {
      router.push(organization.onboardingStatus === "APPROVED" ? "/organization/onboarding/details" : "/organization/onboarding/status");
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
        method: "PUT",
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
      {!organization ? <section className="border border-gov-line bg-white p-8 text-sm text-gov-muted">Loading organization profile...</section> : (
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
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) return;
    apiFetch<Organization>("/onboarding/status").then(setOrganization).catch((err) => setError(err.message));
  }, []);

  return (
    <WorkspaceShell eyebrow="Organization" title="Onboarding Status" description="Operational transactions remain blocked until Portal Admin approval.">
      <ErrorBox error={error} />
      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Organization", organization?.name || "-"],
          ["Onboarding", organization?.onboardingStatus || "REGISTERED"],
          ["Status", organization?.status || "-"]
        ].map(([label, value]) => (
          <div key={label} className="border border-gov-line bg-white p-5 shadow-sm">
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-gov-muted">{label}</div>
            <div className="mt-2 text-xl font-extrabold text-gov-navy">{value}</div>
          </div>
        ))}
      </section>
      {organization?.onboardingStatus !== "APPROVED" && (
        <div className="border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          Your organization onboarding is pending approval. You can access portal operations after approval from Portal Admin.
        </div>
      )}
      <div>
        <a href="/organization/onboarding/details" className="inline-block border border-gov-line bg-white px-4 py-2 text-sm font-bold text-gov-blue shadow-sm hover:bg-gov-mist">
          View Submitted Onboarding Details
        </a>
      </div>
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
        <section className="border border-gov-line bg-white shadow-sm">
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
      <section className="border border-gov-line bg-white shadow-sm">
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

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const orgs = await apiFetch<Organization[]>("/admin/organizations");
      // This workspace lists government departments only — companies and
      // implementing agencies have their own dedicated admin pages.
      setItems(orgs.filter((org) => org.organizationType === "GOVERNMENT_DEPARTMENT"));
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

  const filtered = items.filter((item) => `${item.name} ${item.organizationType} ${item.district || ""} ${item.onboardingStatus}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <WorkspaceShell eyebrow="Portal Admin" title="Government Departments" description="Review government department organizations in this portal instance and manage onboarding status.">
      <ErrorBox error={error} />
      <section className="border border-gov-line bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gov-line p-4 md:flex-row md:items-center md:justify-between">
          <SearchBox value={search} onChange={setSearch} placeholder="Search departments..." />
          <div className="text-xs font-bold text-gov-muted">{filtered.length} department(s)</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-gov-mist text-[11px] uppercase tracking-wider text-gov-muted">
              <tr>
                <th className="px-5 py-3">Organization</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">District</th>
                <th className="px-5 py-3">Onboarding</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gov-line">
              {loading ? <LoadingRow colSpan={6} /> : filtered.length === 0 ? <EmptyRow colSpan={6} text="No government departments found." /> : filtered.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-4 font-bold text-gov-ink">
                    <Link href={`/admin/organizations/${item.id}`} className="text-gov-blue hover:underline">{item.name}</Link>
                    <div className="text-xs font-medium text-gov-muted">{item.email || "-"}</div>
                  </td>
                  <td className="px-5 py-4 text-gov-muted">{item.organizationType.replace(/_/g, " ")}</td>
                  <td className="px-5 py-4 text-gov-muted">{item.district || "-"}</td>
                  <td className="px-5 py-4"><Badge>{item.onboardingStatus}</Badge></td>
                  <td className="px-5 py-4"><Badge>{item.status}</Badge></td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => action(item.id, "approve")}>Approve</Button>
                      <Button size="sm" variant="secondary" onClick={() => action(item.id, "request-clarification")}>Clarify</Button>
                      <Button size="sm" variant="danger" onClick={() => action(item.id, "suspend")}>Suspend</Button>
                    </div>
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

export function AdminOrganizationDetailsWorkspace({ organizationId }: { organizationId: string }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      setOrganization(await apiFetch<Organization>(`/admin/organizations/${organizationId}`));
    } catch (err: any) {
      setError(err.message || "Unable to load organization");
    }
  };

  useEffect(() => { load(); }, [organizationId]);

  const [actionLoading, setActionLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const action = async (type: "approve" | "reject" | "request-clarification" | "suspend") => {
    const remarks = type === "approve" ? undefined : window.prompt("Remarks or reason") || undefined;
    if (type !== "approve" && !remarks) return;
    setError("");
    setActionLoading(true);
    setActiveAction(type);
    try {
      await apiFetch(`/admin/organizations/${organizationId}/${type}`, {
        method: "POST",
        body: JSON.stringify(type === "reject" ? { rejectionReason: remarks } : { remarks })
      });
      await load();
      alert(`Organization successfully ${type === "approve" ? "approved" : type === "reject" ? "rejected" : type === "request-clarification" ? "clarification requested" : "suspended"}!`);
    } catch (err: any) {
      setError(err.message || `Unable to ${type} organization`);
    } finally {
      setActionLoading(false);
      setActiveAction(null);
    }
  };

  return (
    <WorkspaceShell
      eyebrow="Portal Admin"
      title={organization?.name || "Organization Details"}
      description="Verify onboarding profile, documents, remarks and approval status."
      actions={<Link href="/admin/organizations" className="inline-flex min-h-10 items-center border border-gov-line px-4 text-sm font-bold text-gov-blue">All Organizations</Link>}
    >
      <ErrorBox error={error} />
      {!organization ? <section className="border border-gov-line bg-white p-8 text-sm text-gov-muted">Loading organization...</section> : (
        <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <section className="border border-gov-line bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 border-b border-gov-line pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-gov-navy">{organization.name}</h2>
                <p className="text-sm text-gov-muted">{organization.organizationType.replace(/_/g, " ")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{organization.onboardingStatus}</Badge>
                <Badge>{organization.status}</Badge>
              </div>
            </div>
            <dl className="mt-4 grid gap-4 md:grid-cols-2">
              {[
                ["Email", organization.email || "-"],
                ["Phone", organization.phone || "-"],
                ["District", organization.district || "-"],
                ["Taluka", organization.taluka || "-"],
                ["Registration", organization.registrationNumber || "-"],
                ["PAN", organization.pan || "-"],
                ["GST", organization.gst || "-"],
                ["Tenant", organization.tenant?.name || organization.tenantId]
              ].map(([label, value]) => (
                <div key={label} className="border border-gov-line bg-gov-mist p-3">
                  <dt className="text-[11px] font-extrabold uppercase tracking-wider text-gov-muted">{label}</dt>
                  <dd className="mt-1 break-words text-sm font-bold text-gov-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button 
                onClick={() => action("approve")} 
                loading={actionLoading && activeAction === "approve"} 
                disabled={actionLoading || organization.onboardingStatus === "APPROVED"}
              >
                Approve
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => action("request-clarification")} 
                loading={actionLoading && activeAction === "request-clarification"} 
                disabled={actionLoading}
              >
                Request Clarification
              </Button>
              <Button 
                variant="danger" 
                onClick={() => action("reject")} 
                loading={actionLoading && activeAction === "reject"} 
                disabled={actionLoading || organization.onboardingStatus === "REJECTED"}
              >
                Reject
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => action("suspend")} 
                loading={actionLoading && activeAction === "suspend"} 
                disabled={actionLoading || organization.onboardingStatus === "SUSPENDED"}
              >
                Suspend
              </Button>
            </div>
          </section>
          <section className="border border-gov-line bg-white p-5 shadow-sm">
            <h2 className="text-base font-extrabold text-gov-navy">Uploaded Documents</h2>
            <div className="mt-4 divide-y divide-gov-line border border-gov-line">
              {(organization.documents || []).length === 0 ? <div className="p-4 text-sm text-gov-muted">No documents uploaded.</div> : organization.documents?.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <a href={doc.fileUrl} target="_blank" className="font-bold text-gov-blue">{doc.documentType}</a>
                  <Badge>{doc.verificationStatus}</Badge>
                </div>
              ))}
            </div>
            {(organization.clarificationRemarks || organization.rejectionReason) && (
              <div className="mt-4 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {organization.clarificationRemarks && <p><strong>Clarification:</strong> {organization.clarificationRemarks}</p>}
                {organization.rejectionReason && <p><strong>Rejection:</strong> {organization.rejectionReason}</p>}
              </div>
            )}
          </section>
        </div>
      )}
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
      {!organization ? <section className="border border-gov-line bg-white p-8 text-sm text-gov-muted">Loading organization settings...</section> : (
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

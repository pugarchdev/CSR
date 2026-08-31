"use client";

import {
  Building2, Landmark, Mail, Layers, Sparkles, Award, Coins, Compass,
  FileText, BarChart3, HelpCircle, ShieldCheck, ShieldAlert,
  Clock, Users, Globe2, LayoutDashboard, User, Settings, Bell,
  ListTodo, Store, AlertTriangle, Briefcase, UserCheck, Flag, Search,
  CheckCircle, Building, FileCheck, UserPlus, UserCog, Sliders, CheckSquare, Send,
  Calendar, IndianRupee
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NAVIGATION_MANIFEST, isNavItemAllowed } from "./navigationManifest";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  section: string;
  featureKey?: string;
  requiredPermission?: string;
  requiredAnyPermissions?: string[];
  requiredAllPermissions?: string[];
}

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  User,
  Settings,
  Bell,
  FileText,
  Send,
  Calendar,
  Heart: Sparkles,
  ClipboardCheck: FileText,
  ListTodo,
  Store,
  HelpCircle,
  AlertTriangle,
  Briefcase,
  UserCheck,
  Flag,
  Search,
  CheckCircle,
  Building2,
  Building,
  Users,
  FileCheck,
  UserPlus,
  IndianRupee,
  DollarSign: IndianRupee,
  BarChart3,
  ShieldAlert,
  UserCog,
  ShieldCheck,
  CheckSquare,
  Sliders,
  Landmark,
  Compass,
  Clock,
  Layers,
  Sparkles,
  Award,
  Coins,
  Mail,
  Globe2
};

export function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] || Compass;
}

export function normalizeRole(role: any): string {
  if (!role) return "";
  const code = typeof role === "object" ? role?.code || role?.name || role?.id : String(role);
  const upper = String(code).toUpperCase().trim();

  if (
    upper === "SUPER ADMIN" || upper === "SUPER-ADMIN" || upper === "SUPER_ADMIN" ||
    upper === "PORTAL ADMIN" || upper === "PORTAL_ADMIN" || upper === "SYSTEM_ROLE_1" || upper === "1"
  ) return "SUPER_ADMIN";

  if (
    upper === "PLANNING SECRETARY" || upper === "PLANNING-SECRETARY" || upper === "PLANNING_SECRETARY" ||
    upper === "SYSTEM_ROLE_2" || upper === "2"
  ) return "PLANNING_SECRETARY";

  if (
    upper === "JOINT SECRETARY" || upper === "JOINT-SECRETARY" || upper === "JOINT_SECRETARY" ||
    upper === "SYSTEM_ROLE_3" || upper === "3"
  ) return "JOINT_SECRETARY";

  if (
    upper === "DISTRICT NODAL OFFICER" || upper === "DISTRICT-NODAL-OFFICER" || upper === "DISTRICT_NODAL_OFFICER" ||
    upper === "NODAL_OFFICER" || upper === "SYSTEM_ROLE_4" || upper === "4"
  ) return "DISTRICT_NODAL_OFFICER";

  if (
    upper === "DISTRICT NODAL CONSULTANT" || upper === "DISTRICT-NODAL-CONSULTANT" || upper === "DISTRICT_NODAL_CONSULTANT" ||
    upper === "SYSTEM_ROLE_5" || upper === "5"
  ) return "DISTRICT_NODAL_CONSULTANT";

  if (
    upper === "CSR RELATIONSHIP MANAGER" || upper === "RELATIONSHIP MANAGER" || upper === "RELATIONSHIP-MANAGER" ||
    upper === "RELATIONSHIP_MANAGER" || upper === "CSR_RELATIONSHIP_MANAGER" || upper === "SYSTEM_ROLE_6" || upper === "6"
  ) return "RELATIONSHIP_MANAGER";

  if (
    upper === "GOVERNMENT OFFICER" || upper === "GOVERNMENT-OFFICER" || upper === "GOVERNMENT_OFFICER" ||
    upper === "BENEFICIARY AGENCY" || upper === "BENEFICIARY-AGENCY" || upper === "BENEFICIARY_AGENCY" ||
    upper === "SYSTEM_ROLE_7" || upper === "7"
  ) return "GOVERNMENT_OFFICER";

  if (
    upper === "CORPORATE ADMIN" || upper === "COMPANY ADMIN" || upper === "COMPANY-ADMIN" || upper === "COMPANY_ADMIN" ||
    upper === "CORPORATE USER" || upper === "CORPORATE_USER" || upper === "CORPORATE_PARTNER" ||
    upper === "CSR_COMPANY" || upper === "SYSTEM_ROLE_8" || upper === "8"
  ) return "COMPANY_ADMIN";

  if (
    upper === "NGO ADMIN" || upper === "NGO-ADMIN" || upper === "NGO_ADMIN" ||
    upper === "IMPLEMENTING AGENCY USER" || upper === "IMPLEMENTING_AGENCY_USER" ||
    upper === "SYSTEM_ROLE_9" || upper === "9"
  ) return "NGO_ADMIN";

  return upper.replace(/[-\s]/g, "_");
}

export function resolveNavItems(params: {
  role?: string | null;
  pathname?: string;
  hasPermission: (perm: string) => boolean;
  isSuperAdmin: boolean;
}): NavItem[] {
  const { hasPermission, isSuperAdmin, role } = params;

  const allowedManifestItems = NAVIGATION_MANIFEST.filter((item) =>
    isNavItemAllowed(item, hasPermission, isSuperAdmin, role)
  );

  return allowedManifestItems.map((item) => ({
    id: item.id,
    label: item.label,
    href: item.route,
    icon: resolveIcon(item.iconName),
    section: item.section,
    featureKey: item.featureFlag,
    requiredAnyPermissions: item.requiredAnyPermissions,
    requiredAllPermissions: item.requiredAllPermissions
  }));
}


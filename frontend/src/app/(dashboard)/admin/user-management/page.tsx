"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Download,
  Upload,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Users,
  FileSpreadsheet,
  UploadCloud,
  FileText,
  Info,
  Trash2,
  HelpCircle,
  Check,
  ArrowRight,
  Search,
  Plus,
  Shield,
  MapPin,
  Mail,
  Phone,
  Edit3,
  ArrowRightLeft,
  Filter,
  RefreshCw,
  X,
  Building2,
} from "lucide-react";
import { useApiQuery } from "@/lib/apiHooks";
import { apiFetch } from "@/lib/api";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { StandardPageHeader } from "@/components/layout/StandardPageHeader";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovInput from "@/components/gov/GovInput";
import GovModal from "@/components/gov/GovModal";
import GovSelect from "@/components/gov/GovSelect";
import TransferPortfolioModal, { PortfolioTransferResult } from "@/components/rm/TransferPortfolioModal";
import { useAuthStore } from "@/store/authStore";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTh } from "@/components/ui/SortableTh";
import "@/styles/gov-theme.css";

// Base platform roles come from the Prisma enum; everything else is a dynamic
// OrganizationRole fetched from the RBAC engine — never hardcoded here.
const SYSTEM_ROLES_LIST = [
  { id: 1, name: "SUPER_ADMIN" },
  { id: 2, name: "PLANNING_SECRETARY" },
  { id: 3, name: "JOINT_SECRETARY" },
  { id: 4, name: "DISTRICT_NODAL_OFFICER" },
  { id: 5, name: "DISTRICT_NODAL_CONSULTANT" },
  { id: 6, name: "RELATIONSHIP_MANAGER" },
  { id: 7, name: "GOVERNMENT_OFFICER" },
  { id: 8, name: "COMPANY_ADMIN" },
  { id: 9, name: "NGO_ADMIN" },
] as const;

const MAHARASHTRA_DISTRICTS = [
  "Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara",
  "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli",
  "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban",
  "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar",
  "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara",
  "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal",
];

type UserRow = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  mobile?: string | null;
  designation?: string | null;
  role: string | null;
  roleId?: string | number | null;
  roleRelation?: { id: string; name: string } | null;
  accountStatus?: string;
  assignedDistrict?: string | null;
  isVerified?: boolean;
  mustResetPassword?: boolean;
  passwordChangedAt?: string | null;
  invitationAcceptedAt?: string | null;
  temporaryPasswordExpiresAt?: string | null;
  ngo?: { name: string; status?: string };
  company?: { name: string; status?: string };
  organization?: { name: string; kind: string; status?: string; district?: string | null; taluka?: string | null };
  officerProfile?: { designation?: string | null; fullName?: string | null; department?: string | null; district?: string | null; taluka?: string | null; mobile?: string | null } | null;
  dynamicRoles?: { roleId: string; roleName: string }[];
};

type DynamicRole = {
  id: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  isSystemRole: boolean;
  permissions: string[];
};

const EMPTY_USER_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  mobile: "",
  designation: "",
  department: "MahaCSR Portal",
  role: "GOVERNMENT_OFFICER",
  assignedDistrict: "",
  password: "",
  sendInvitation: true,
};

const effectiveRole = (u: any): string => {
  if (!u) return "";
  if (typeof u.role === "string") return u.role;
  if (u.role && typeof u.role === "object" && u.role.name) return String(u.role.name);
  if (u.roleRelation && typeof u.roleRelation === "object" && u.roleRelation.name) return String(u.roleRelation.name);
  if (typeof u.roleId === "number") return `Role #${u.roleId}`;
  return "";
};

export default function AdminUserManagementPage() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [togglingId, setTogglingId] = useState("");
  const [sendingInviteId, setSendingInviteId] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Bulk Import Modal State
  const [bulkImportModalOpen, setBulkImportModalOpen] = useState(false);
  const [bulkImportTab, setBulkImportTab] = useState<"upload" | "paste">("upload");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [bulkCsvText, setBulkCsvText] = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ imported: any[]; errors: any[] } | null>(null);
  const [bulkError, setBulkError] = useState("");

  const parseCsvOrText = (rawText: string) => {
    const lines = rawText.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setParsedRows([]);
      return [];
    }

    const firstLine = lines[0].toLowerCase();
    const hasHeader =
      firstLine.includes("email") ||
      firstLine.includes("firstname") ||
      firstLine.includes("first name") ||
      firstLine.includes("role") ||
      firstLine.includes("district");

    const dataLines = hasHeader ? lines.slice(1) : lines;

    const parsed = dataLines.map((line) => {
      const parts = line.split(/[,\t]/).map((p) => p.trim().replace(/^["']|["']$/g, ""));
      return {
        firstName: parts[0] || "",
        lastName: parts[1] || "",
        email: parts[2] || "",
        mobile: parts[3] || "",
        designation: parts[4] || "Relationship Manager",
        role: parts[5] || "RELATIONSHIP_MANAGER",
        district: parts[6] || "",
      };
    }).filter((u) => u.email || u.firstName);

    setParsedRows(parsed);
    return parsed;
  };

  const handleFileSelect = (file: File) => {
    setBulkError("");
    setBulkResults(null);
    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) {
        setBulkError("The selected file is empty.");
        return;
      }
      setBulkCsvText(content);
      const rows = parseCsvOrText(content);
      if (rows.length === 0) {
        setBulkError("Could not parse any user rows from the uploaded file. Please verify format.");
      }
    };
    reader.onerror = () => {
      setBulkError("Error reading the uploaded file.");
    };
    reader.readAsText(file);
  };

  const downloadSampleExcel = () => {
    const excelXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#1E3A8A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1E3A8A" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataCell">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="DataCellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Color="#0F172A"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="RM_Import_Template">
  <Table ss:ExpandedColumnCount="7" x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="20">
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="200"/>
   <Column ss:Width="100"/>
   <Column ss:Width="170"/>
   <Column ss:Width="160"/>
   <Column ss:Width="120"/>
   <Row ss:Height="24">
    <Cell ss:StyleID="Header"><Data ss:Type="String">FirstName</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">LastName</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Email</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Mobile</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Designation</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Role</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">District</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">Rajesh</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">Sharma</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">rajesh.sharma@maharashtra.gov.in</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">9876543210</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">Senior Relationship Manager</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">RELATIONSHIP_MANAGER</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String"></Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">Priya</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">Deshmukh</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">priya.d@maharashtra.gov.in</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">9823012345</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">District Relationship Officer</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">RELATIONSHIP_MANAGER</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">Pune</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">Amit</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">Patil</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">amit.patil@maharashtra.gov.in</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">9970123456</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">Nodal Consultant</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">DISTRICT_NODAL_CONSULTANT</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">Nagpur</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">Sneha</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">Kulkarni</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">sneha.k@maharashtra.gov.in</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">9819054321</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">State CSR Coordinator</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">STATE_CSR_CELL</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">Mumbai City</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([excelXml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "MahaCSR_RM_Import_Template.xls";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadSampleCsv = () => {
    const csvContent =
      "\uFEFF" +
      "FirstName,LastName,Email,Mobile,Designation,Role,District\n" +
      "Rajesh,Sharma,rajesh.sharma@maharashtra.gov.in,9876543210,Senior Relationship Manager,RELATIONSHIP_MANAGER,\n" +
      "Priya,Deshmukh,priya.d@maharashtra.gov.in,9823012345,District Relationship Officer,RELATIONSHIP_MANAGER,Pune\n" +
      "Amit,Patil,amit.patil@maharashtra.gov.in,9970123456,Nodal Consultant,DISTRICT_NODAL_CONSULTANT,Nagpur\n" +
      "Sneha,Kulkarni,sneha.k@maharashtra.gov.in,9819054321,State CSR Coordinator,STATE_CSR_CELL,Mumbai City\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "MahaCSR_RM_Import_Template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBulkImport = async (sendInvitation: boolean = false) => {
    setBulkError("");
    setBulkResults(null);

    const usersToImport = parsedRows.length > 0 ? parsedRows : parseCsvOrText(bulkCsvText);

    if (usersToImport.length === 0) {
      setBulkError("No valid user records found. Please upload an Excel/CSV file or paste CSV rows.");
      return;
    }

    setBulkImporting(true);
    try {
      const response = await apiFetch<any>("/admin/users/import", {
        method: "POST",
        body: JSON.stringify({ users: usersToImport, sendInvitation }),
      });
      const data = response?.data || response;
      setBulkResults(data);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setSuccess(
        response?.message ||
        `Bulk import complete: ${data.imported?.length || 0} user(s) imported successfully${sendInvitation ? ` and invitations sent.` : "."}`
      );
    } catch (err: any) {
      setBulkError(err.message || "Failed to process bulk import.");
    } finally {
      setBulkImporting(false);
    }
  };

  const handleSendInvitation = async (user: UserRow) => {
    setSendingInviteId(user.id);
    setError("");
    setSuccess("");
    try {
      const res = await apiFetch<any>(`/admin/users/${user.id}/send-invitation`, {
        method: "POST",
      });
      setSuccess(res?.message || `Invitation email sent successfully to ${user.email}.`);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err: any) {
      setError(err?.message || `Failed to send invitation to ${user.email}.`);
    } finally {
      setSendingInviteId("");
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch dynamic roles (cache for 5 minutes)
  const { data: rolesResponse } = useApiQuery<any>(
    ["admin", "dynamic-roles"],
    "/roles?limit=200",
    { staleTime: 5 * 60 * 1000 }
  );
  const dynamicRoles: DynamicRole[] = rolesResponse?.roles || rolesResponse?.data?.roles || [];

  // Fetch users list (paginated, filtered, cached)
  const { data: usersResponse, isLoading: loading } = useApiQuery<any>(
    ["admin", "users", String(page), debouncedSearch, statusFilter],
    `/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(debouncedSearch)}&status=${statusFilter}`,
    { staleTime: 30 * 1000 }
  );

  const rawUsers = usersResponse?.data || [];
  const pagination = usersResponse?.pagination || { total: 0, totalPages: 1 };

  const parsedUsers: UserRow[] = (Array.isArray(rawUsers) ? rawUsers : []).map((u: any) => ({
    ...u,
    dynamicRoles: (Array.isArray(u.organizationRoles) ? u.organizationRoles : [])
      .map((or: any) => (or?.role ? { roleId: or.role.id, roleName: or.role.name } : null))
      .filter(Boolean),
  }));

  const users = parsedUsers;

  // Create user modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);

  // Edit user modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<{
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    designation: string;
    department: string;
    role: string;
    assignedDistrict: string;
    accountStatus: string;
    password: string;
    dynamicRoleIds: string[];
  }>({
    userId: "",
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    designation: "",
    department: "MahaCSR Portal",
    role: "",
    assignedDistrict: "",
    accountStatus: "ACTIVE",
    password: "",
    dynamicRoleIds: [],
  });

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [transferSource, setTransferSource] = useState<UserRow | null>(null);

  // Custom role creation state
  const [customRoleModalOpen, setCustomRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [selectedRolePermissions, setSelectedRolePermissions] = useState<string[]>([
    "user:view", "project:view", "fund:view", "report:view"
  ]);
  const [creatingRole, setCreatingRole] = useState(false);
  const [roleError, setRoleError] = useState("");

  const { user, isAdmin, permissions: userPermissions = [] } = useAuthStore();

  const ALL_PERMISSION_GROUPS = [
    {
      title: "Team & User Administration",
      icon: "👥",
      color: "blue",
      permissions: [
        { key: "user:view", label: "View Team Users", desc: "View organization officers, profiles, and directory" },
        { key: "user:create", label: "Create Team Users", desc: "Register new sub-logins and invite officers" },
        { key: "user:update", label: "Update Profiles & Roles", desc: "Modify designations, contact numbers, and status" },
        { key: "user:invite", label: "Send Email Invitations", desc: "Dispatch activation credentials and invitation links" },
        { key: "user:assign-role", label: "Assign Custom Roles", desc: "Attach organization custom roles to team members" },
        { key: "ngo_login:create", label: "Create Agency Logins", desc: "Provision sub-accounts for executing partner agencies" },
      ]
    },
    {
      title: "Projects & Field Milestones",
      icon: "📊",
      color: "emerald",
      permissions: [
        { key: "project:view", label: "View Projects", desc: "Access convergence initiatives, milestones, and timelines" },
        { key: "project:create", label: "Register Projects", desc: "Submit new developmental project proposals" },
        { key: "milestone:update", label: "Update Progress", desc: "Log milestone execution stages and completion percentages" },
        { key: "progress:verify", label: "Verify Deliverables", desc: "Approve milestone deliverables and inspection reports" },
        { key: "photo:upload", label: "Upload Site Photos", desc: "Upload geotagged field inspection images & proofs" },
      ]
    },
    {
      title: "Funding & Financial Tracking",
      icon: "💰",
      color: "amber",
      permissions: [
        { key: "fund:view", label: "View Financials", desc: "Inspect allocations, budgets, and expenditure summaries" },
        { key: "fund:commit", label: "Commit CSR Funds", desc: "Authorize fund commitments and sign bilateral MoUs" },
        { key: "bill:upload", label: "Upload Bills & Invoices", desc: "Attach vendor invoices and expenditure statements" },
        { key: "uc:upload", label: "Upload UCs", desc: "Submit signed Utilization Certificates" },
      ]
    },
    {
      title: "Pitches & Corporate Collaboration",
      icon: "🎯",
      color: "purple",
      permissions: [
        { key: "pitch:view", label: "Browse Pitches", desc: "Explore published district requirements and public needs" },
        { key: "pitch:create", label: "Submit Pitches", desc: "Draft and publish new developmental pitch requests" },
        { key: "enquiry:create", label: "Corporate Enquiries", desc: "Send queries regarding project participation" },
        { key: "interest:express", label: "Express Interest", desc: "Indicate formal intent to fund or adopt a project" },
      ]
    },
    {
      title: "Reports & Analytics",
      icon: "📈",
      color: "cyan",
      permissions: [
        { key: "report:view", label: "View Analytics", desc: "Access executive dashboards, charts, and district KPIs" },
        { key: "report:generate", label: "Export Reports", desc: "Generate and download impact analysis PDFs and spreadsheets" },
      ]
    }
  ];

  const availablePermissionGroups = ALL_PERMISSION_GROUPS.map((group) => ({
    ...group,
    permissions: group.permissions.filter(
      (p) => isAdmin || userPermissions.includes(p.key) || userPermissions.includes("*")
    )
  })).filter((group) => group.permissions.length > 0);

  const openCustomRoleModal = () => {
    setRoleError("");
    const allAvailableKeys = availablePermissionGroups.flatMap((g) => g.permissions.map((p) => p.key));
    const defaultPerms = ["user:view", "project:view", "fund:view", "report:view"].filter((k) =>
      allAvailableKeys.includes(k)
    );
    setSelectedRolePermissions(defaultPerms.length > 0 ? defaultPerms : allAvailableKeys.slice(0, 3));
    setCustomRoleModalOpen(true);
  };

  const userRoleStr = String(user?.role || "").toUpperCase();
  const roleNumericId = Number(user?.roleNumericId || user?.roleId || 0);

  const isPlatformAdmin =
    isAdmin ||
    [1, 2, 3].includes(roleNumericId) ||
    ["SUPER_ADMIN", "PLANNING_SECRETARY", "JOINT_SECRETARY", "CSR_ADMIN", "PORTAL_ADMIN"].includes(userRoleStr);

  const isGov =
    !isPlatformAdmin &&
    (roleNumericId === 7 ||
      user?.orgKind === "GOVERNMENT_DEPARTMENT" ||
      userRoleStr.includes("GOVERNMENT") ||
      userRoleStr.includes("GOV_") ||
      Boolean(user?.organization?.governmentType));

  const isCorporate =
    !isPlatformAdmin &&
    (roleNumericId === 8 ||
      user?.orgKind === "CSR_COMPANY" ||
      userRoleStr.includes("COMPANY") ||
      userRoleStr.includes("CORPORATE"));

  const isNgo =
    !isPlatformAdmin &&
    (roleNumericId === 9 ||
      user?.orgKind === "NGO" ||
      userRoleStr.includes("NGO"));

  const userDistrict = user?.organization?.district || user?.assignedDistrict || "";
  const userOrgName = user?.organization?.name || user?.company?.name || user?.ngo?.name || "";

  const activeDynamicRoles = dynamicRoles.filter((r) => r.status === "ACTIVE");
  const customRoles = activeDynamicRoles.filter((r) => !r.isSystemRole && Number(r.id) > 9);

  let roleOptions;
  if (isGov) {
    roleOptions = (
      <>
        <optgroup label="Government Department Standard Roles">
          <option value="GOVERNMENT_OFFICER">
            Organization Nodal Officer (Same administrative rights as main organization head)
          </option>
          <option value="DISTRICT_NODAL_OFFICER">
            Nodal Officer (Project Monitoring — handles &amp; views assigned projects only)
          </option>
        </optgroup>
        {customRoles.length > 0 && (
          <optgroup label="Custom Created Department Roles">
            {customRoles.map((r) => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
          </optgroup>
        )}
      </>
    );
  } else if (isCorporate) {
    roleOptions = (
      <>
        <optgroup label="Corporate CSR Standard Roles">
          <option value="COMPANY_ADMIN">Company Administrator</option>
          <option value="CORPORATE_USER">Corporate CSR Member</option>
        </optgroup>
        {customRoles.length > 0 && (
          <optgroup label="Custom Created Corporate Roles">
            {customRoles.map((r) => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
          </optgroup>
        )}
      </>
    );
  } else if (isNgo) {
    roleOptions = (
      <>
        <optgroup label="Implementing Agency Standard Roles">
          <option value="NGO_ADMIN">NGO Administrator</option>
          <option value="NGO_MEMBER">Implementing Agency Member</option>
        </optgroup>
        {customRoles.length > 0 && (
          <optgroup label="Custom Created Agency Roles">
            {customRoles.map((r) => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
          </optgroup>
        )}
      </>
    );
  } else {
    // Platform Administrator (Super Admin, Joint Secretary, Planning Secretary)
    roleOptions = (
      <>
        <optgroup label="System Roles (1 to 9)">
          {SYSTEM_ROLES_LIST.map((r) => (
            <option key={r.id} value={r.name}>{r.name}</option>
          ))}
        </optgroup>
        {customRoles.length > 0 && (
          <optgroup label="Platform Custom Roles">
            {customRoles.map((r) => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
          </optgroup>
        )}
      </>
    );
  }

  const openCreateModal = () => {
    setError("");
    setSuccess("");
    let initialRole = "GOVERNMENT_OFFICER";
    if (isCorporate) initialRole = "COMPANY_ADMIN";
    else if (isNgo) initialRole = "NGO_ADMIN";
    else if (isPlatformAdmin) initialRole = "GOVERNMENT_OFFICER";

    setUserForm({
      ...EMPTY_USER_FORM,
      role: initialRole,
      department: "",
      assignedDistrict: isGov ? userDistrict : "",
      sendInvitation: true,
    });
    setCreateModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const isPasswordBlank = !userForm.password.trim();
      const sendInvitation = isPasswordBlank ? true : userForm.sendInvitation;
      const targetDistrict = isGov ? userDistrict : (userForm.assignedDistrict || undefined);
      const targetDept = userForm.department.trim() || userOrgName || "MahaCSR Portal";

      const created = await apiFetch<any>("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          firstName: userForm.firstName.trim(),
          lastName: userForm.lastName.trim(),
          email: userForm.email.trim(),
          mobile: userForm.mobile.trim(),
          designation: userForm.designation.trim(),
          department: targetDept,
          role: userForm.role,
          district: targetDistrict,
          assignedDistrict: targetDistrict,
          password: userForm.password.trim() || undefined,
          sendInvitation,
        }),
      });

      const result = created?.data || created;
      setSuccess(
        result?.invitationSent
          ? `User created successfully! ${result.isPasswordAutoGenerated ? `Temporary password (${result.autogeneratedPassword}) and activation link emailed to ${userForm.email.trim()}.` : `Welcome email with login details sent to ${userForm.email.trim()}.`}`
          : "User created successfully."
      );
      setCreateModalOpen(false);
      setUserForm(EMPTY_USER_FORM);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (targetUser: UserRow) => {
    setError("");
    const fullNameParts = (targetUser.firstName || targetUser.officerProfile?.fullName || "").trim().split(/\s+/);
    const fName = targetUser.firstName || fullNameParts[0] || "";
    const lName = targetUser.lastName || fullNameParts.slice(1).join(" ") || "";

    const assignedDistrictValue =
      targetUser.organization?.district ||
      targetUser.officerProfile?.district ||
      targetUser.assignedDistrict ||
      userDistrict ||
      "";

    setEditForm({
      userId: targetUser.id,
      firstName: fName,
      lastName: lName,
      email: targetUser.email,
      mobile: targetUser.mobile || targetUser.officerProfile?.mobile || "",
      designation: targetUser.designation || targetUser.officerProfile?.designation || "",
      department: targetUser.officerProfile?.department || userOrgName || "MahaCSR Portal",
      role: effectiveRole(targetUser),
      assignedDistrict: assignedDistrictValue,
      accountStatus: targetUser.accountStatus || "ACTIVE",
      password: "",
      dynamicRoleIds: (targetUser.dynamicRoles || []).map((r) => r.roleId),
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const targetDistrict =
        (isGov || Boolean(userDistrict))
          ? (userDistrict || editForm.assignedDistrict || undefined)
          : (editForm.assignedDistrict || undefined);

      await apiFetch(`/admin/users/${editForm.userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          firstName: editForm.firstName.trim(),
          lastName: editForm.lastName.trim(),
          email: editForm.email.trim(),
          mobile: editForm.mobile.trim(),
          designation: editForm.designation.trim(),
          department: editForm.department.trim() || userOrgName || "MahaCSR Portal",
          role: editForm.role || undefined,
          district: targetDistrict,
          assignedDistrict: targetDistrict,
          accountStatus: editForm.accountStatus,
          password: editForm.password.trim() || undefined,
        }),
      });

      // Save additional dynamic role assignments (multi-role mapping)
      await apiFetch(`/roles/users/${editForm.userId}`, {
        method: "POST",
        body: JSON.stringify({ roleIds: editForm.dynamicRoleIds }),
      }).catch(() => undefined);

      const trimmedFirstName = editForm.firstName.trim();
      const trimmedLastName = editForm.lastName.trim();
      const trimmedFullName = [trimmedFirstName, trimmedLastName].filter(Boolean).join(" ");

      // If the edited user is the current user, immediately update authStore and sync profile tray
      const currentStoredUser = useAuthStore.getState().user;
      if (currentStoredUser && (currentStoredUser.id === editForm.userId || currentStoredUser.email?.toLowerCase() === editForm.email.trim().toLowerCase())) {
        useAuthStore.getState().updateUser({
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          name: trimmedFullName,
          mobile: editForm.mobile.trim(),
          designation: editForm.designation.trim(),
          email: editForm.email.trim(),
        });
        useAuthStore.getState().fetchEffectivePermissions(true).catch(() => {});
      }

      setSuccess(`User ${editForm.email} updated successfully.`);
      setEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: UserRow) => {
    const nextStatus = user.accountStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setTogglingId(user.id);
    setError("");
    setSuccess("");
    try {
      await apiFetch(`/admin/users/${user.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ accountStatus: nextStatus }),
      });
      setSuccess(`${user.email} is now ${nextStatus}.`);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setTogglingId("");
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await apiFetch<any>(`/admin/users/${deleteTarget.id}`, { method: "DELETE" });
      const data = result?.data || result;
      setSuccess(
        data?.suspended
          ? `${deleteTarget.email} has linked records and was suspended instead of deleted.`
          : `${deleteTarget.email} deleted permanently.`
      );
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users;

  const { sortedItems: sortedUsers, sortKey, sortDirection, requestSort } = useTableSort(filteredUsers, {
    customGetters: {
      name: (u) => [u.firstName, u.lastName].filter(Boolean).join(" ") || u.officerProfile?.fullName || "",
      email: (u) => u.email || "",
      designation: (u) => u.designation || u.officerProfile?.designation || "",
      role: (u) => effectiveRole(u),
      district: (u) => u.assignedDistrict || (u as any).officerProfile?.district || "",
      status: (u) => u.accountStatus || "ACTIVE"
    }
  });

  const isRelationshipManager = (candidate: UserRow) => {
    const roleName = effectiveRole(candidate).toUpperCase().replace(/\s+/g, "_");
    return Number(candidate.roleId) === 6 || roleName === "RELATIONSHIP_MANAGER" || roleName === "CSR_RELATIONSHIP_MANAGER";
  };

  const handlePortfolioTransferred = (result: PortfolioTransferResult) => {
    setSuccess(
      `Portfolio transferred successfully: ${result.enquiryCount} enquiries and ${result.pitchCount} pitches moved to ${result.targetRmName || "the selected RM"}.`
    );
    setTransferSource(null);
  };

  const activeUsersCount = users.filter((u) => (u.accountStatus || "ACTIVE") === "ACTIVE").length;
  const govNodalCount = users.filter((u) => {
    const r = String(u.role || "").toUpperCase();
    return r.includes("GOVERNMENT") || r.includes("NODAL") || r.includes("OFFICER") || r.includes("SECRETARY");
  }).length;
  const adminRmCount = users.filter((u) => {
    const r = String(u.role || "").toUpperCase();
    return r.includes("ADMIN") || r.includes("RELATIONSHIP") || r.includes("MANAGER");
  }).length;

  return (    <GovPortalLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 text-slate-900">
        {/* Page Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              <span>Administration</span>
              <span>/</span>
              <span>Security &amp; Access</span>
              <span>/</span>
              <span className="text-blue-600 font-extrabold">Users</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              User Management
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-extrabold border border-blue-200">
                {pagination.total} Accounts
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Provision platform users, configure roles, assign districts, manage credentials, and audit officer access.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setBulkImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Upload size={14} className="text-blue-600" />
              Bulk Import RMs / Users
            </button>
            <button
              onClick={openCustomRoleModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Shield size={14} className="text-purple-600" />
              + Create Custom Role
            </button>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs shadow-blue-500/20 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Plus size={15} />
              Create User
            </button>
          </div>
        </div>

        {/* 4-Column KPI Stats Cards */}
        <StatCardGroup columns={4}>
          <StatCard
            label="Total Accounts"
            value={loading ? "…" : pagination.total}
            icon={Users}
            colorTheme="blue"
            sublabel="Registered platform users"
            index={0}
          />
          <StatCard
            label="Active Accounts"
            value={loading ? "…" : activeUsersCount}
            icon={CheckCircle2}
            colorTheme="emerald"
            sublabel="Currently authorized"
            index={1}
          />
          <StatCard
            label="Gov & Nodal Officers"
            value={loading ? "…" : govNodalCount}
            icon={Sparkles}
            colorTheme="purple"
            sublabel="State & district authorities"
            index={2}
          />
          <StatCard
            label="Administrators & RMs"
            value={loading ? "…" : adminRmCount}
            icon={AlertCircle}
            colorTheme="amber"
            sublabel="System governance & RMs"
            index={3}
          />
        </StatCardGroup>

        {!createModalOpen && !editModalOpen && !deleteTarget && !transferSource && error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 flex items-center gap-2.5 shadow-2xs">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2.5 shadow-2xs">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* User Directory Table Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          {/* Card Filter Toolbar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <h2 className="font-heading font-extrabold text-sm sm:text-base text-slate-900">
                Official User Directory
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 text-[11px] font-bold">
                {filteredUsers.length} shown
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Status Filter */}
              <select
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all cursor-pointer shadow-2xs"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Account Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="PENDING_ACTIVATION">PENDING_ACTIVATION</option>
              </select>

              {/* Search Bar */}
              <div className="relative min-w-[240px] sm:min-w-[280px]">
                <input
                  type="text"
                  className="w-full bg-white border border-slate-300 rounded-xl py-2 pl-9 pr-8 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs font-medium"
                  placeholder="Search by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded-md"
                    title="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table Body */}
          <div className="p-0 w-full overflow-visible">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 w-full bg-white">
                <div className="w-9 h-9 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
                <span className="text-xs text-slate-500 font-bold">Loading user directory...</span>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="w-full">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                      <SortableTh sortKey="name" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="py-3 px-3 w-[20%]">User</SortableTh>
                      <SortableTh sortKey="email" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="py-3 px-3 w-[18%] hidden lg:table-cell">Email</SortableTh>
                      <SortableTh sortKey="designation" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="py-3 px-3 w-[12%] hidden xl:table-cell">Designation</SortableTh>
                      <SortableTh sortKey="role" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="py-3 px-3 w-[14%]">Role</SortableTh>
                      <SortableTh sortKey="district" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="py-3 px-3 w-[12%] hidden md:table-cell">District</SortableTh>
                      <SortableTh sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="py-3 px-3 w-[10%]">Status</SortableTh>
                      <th className="py-3 px-3 w-[14%] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedUsers.map((u) => {
                      const isActive = (u.accountStatus || "ACTIVE") === "ACTIVE";
                      const fullName = ([u.firstName, u.lastName].filter(Boolean).join(" ")) || u.officerProfile?.fullName || "Official User";
                      const initials = fullName
                        .split(" ")
                        .map((n) => n[0])
                        .filter(Boolean)
                        .slice(0, 2)
                        .join("")
                        .toUpperCase() || "U";
                      const roleString = effectiveRole(u);

                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          {/* Official Name & Avatar */}
                          <td className="py-3.5 px-3 align-middle">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-heading font-extrabold text-[10px] flex items-center justify-center shrink-0 shadow-2xs shadow-blue-500/20">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 text-xs leading-tight truncate max-w-[160px]" title={fullName}>{fullName}</div>
                                {(u.ngo?.name || u.company?.name || u.organization?.name || u.officerProfile?.department) && (
                                  <div className="text-[10px] text-slate-500 font-medium truncate max-w-[160px] mt-0.5" title={u.ngo?.name || u.company?.name || u.organization?.name || u.officerProfile?.department || ""}>
                                    {u.ngo?.name || u.company?.name || u.organization?.name || u.officerProfile?.department}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Email & Mobile */}
                          <td className="py-3.5 px-3 align-middle hidden lg:table-cell">
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="font-mono text-xs text-slate-800 font-semibold select-all truncate block" title={u.email}>
                                {u.email}
                              </span>
                              {(u.mobile || u.officerProfile?.mobile) && (
                                <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium mt-0.5">
                                  <Phone size={10} className="text-slate-400 shrink-0" />
                                  {u.mobile || u.officerProfile?.mobile}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Designation */}
                          <td className="py-3.5 px-3 align-middle hidden xl:table-cell">
                            <span className="text-xs font-semibold text-slate-800 block truncate" title={u.officerProfile?.designation || u.designation || "N/A"}>
                              {u.officerProfile?.designation || u.designation || "N/A"}
                            </span>
                          </td>

                          {/* Role */}
                          <td className="py-3.5 px-3 align-middle">
                            <div className="flex flex-col gap-1 items-start">
                              {roleString ? (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border leading-tight ${
                                  roleString.includes("ADMIN")
                                    ? "bg-purple-50 text-purple-800 border-purple-200"
                                    : roleString.includes("RELATIONSHIP")
                                    ? "bg-blue-50 text-blue-800 border-blue-200"
                                    : roleString.includes("NODAL")
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : "bg-slate-100 text-slate-700 border-slate-200"
                                }`}>
                                  {roleString}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">No role</span>
                              )}

                              {u.dynamicRoles && u.dynamicRoles.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {u.dynamicRoles.map((dr) => (
                                    <span
                                      key={dr.roleId}
                                      className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[9px] font-bold border border-slate-200"
                                    >
                                      +{dr.roleName}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Assigned District */}
                          <td className="py-3.5 px-3 align-middle hidden md:table-cell">
                            {u.assignedDistrict ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-bold border border-slate-200">
                                <MapPin size={11} className="text-blue-600 shrink-0" />
                                <span className="truncate max-w-[80px]">{u.assignedDistrict}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">State level</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3 align-middle">
                            {(() => {
                              const orgStatus = (u.organization?.status || "").toUpperCase();
                              const isGovUser = String(u.role || "").includes("GOVERNMENT") || String(u.role || "").includes("NODAL") || Number(u.roleId) === 7;
                              const isPendingOnboardingApproval = Boolean(
                                u.organization &&
                                (u.organization.kind === "GOVERNMENT_DEPARTMENT" || isGovUser) &&
                                orgStatus !== "ACTIVE"
                              );
                              const hasActivatedPassword = !u.mustResetPassword && Boolean(u.passwordChangedAt || u.invitationAcceptedAt);
                              const statusLabel = isPendingOnboardingApproval && !hasActivatedPassword ? "PENDING" : u.accountStatus || "ACTIVE";

                              return (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                  isPendingOnboardingApproval && !hasActivatedPassword
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : isActive
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : u.accountStatus === "SUSPENDED"
                                    ? "bg-rose-50 text-rose-800 border-rose-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                }`} title={isPendingOnboardingApproval && !hasActivatedPassword ? "Pending JS Approval" : ""}>
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    isPendingOnboardingApproval && !hasActivatedPassword
                                      ? "bg-amber-500"
                                      : isActive
                                      ? "bg-emerald-500"
                                      : u.accountStatus === "SUSPENDED"
                                      ? "bg-rose-500"
                                      : "bg-slate-400"
                                  }`} />
                                  {statusLabel}
                                </span>
                              );
                            })()}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-3 align-middle text-right">
                            <div className="inline-flex items-center justify-end gap-1 flex-wrap">
                              {/* Send Invitation Button */}
                              {(() => {
                                const orgStatus = (u.organization?.status || "").toUpperCase();
                                const isGovUser = String(u.role || "").includes("GOVERNMENT") || String(u.role || "").includes("NODAL") || Number(u.roleId) === 7;
                                const isPendingOnboardingApproval = Boolean(
                                  u.organization &&
                                  (u.organization.kind === "GOVERNMENT_DEPARTMENT" || isGovUser) &&
                                  orgStatus !== "ACTIVE"
                                );
                                const hasActivatedPassword = !u.mustResetPassword && Boolean(u.passwordChangedAt || u.invitationAcceptedAt);
                                const isSending = sendingInviteId === u.id;
                                const isInviteDisabled = hasActivatedPassword || isPendingOnboardingApproval || isSending;

                                let inviteTooltip = "Send Email Invitation with temporary login credentials";
                                if (hasActivatedPassword) {
                                  inviteTooltip = "User has already logged in and updated their password";
                                } else if (isPendingOnboardingApproval) {
                                  inviteTooltip = "Cannot invite officer until the organization's onboarding application is approved by the Joint Secretary.";
                                }

                                return (
                                  <div className="relative group/invite inline-flex">
                                    <button
                                      type="button"
                                      disabled={isInviteDisabled}
                                      onClick={() => handleSendInvitation(u)}
                                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold transition-all select-none ${
                                        isPendingOnboardingApproval
                                          ? "border-amber-300/80 bg-amber-50/70 text-amber-800/80 opacity-60 cursor-not-allowed"
                                          : hasActivatedPassword
                                          ? "border-slate-200 bg-slate-100/60 text-slate-400 opacity-50 cursor-not-allowed"
                                          : "border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-800 shadow-2xs cursor-pointer"
                                      }`}
                                      title={isPendingOnboardingApproval ? undefined : inviteTooltip}
                                    >
                                      {isSending ? (
                                        <RefreshCw size={11} className="animate-spin text-indigo-700" />
                                      ) : (
                                        <Mail size={11} />
                                      )}
                                      <span className="hidden sm:inline">{isSending ? "Sending..." : "Invite"}</span>
                                    </button>

                                    {/* Floating Hover Tooltip — high contrast solid dark card */}
                                    {isPendingOnboardingApproval && (
                                      <div className="absolute right-0 bottom-full mb-2 hidden group-hover/invite:flex flex-col items-end z-[9999] pointer-events-none select-none drop-shadow-xl">
                                        <div className="bg-[#0f172a] text-[#f8fafc] text-[11px] font-normal p-3 rounded-xl max-w-[280px] w-max text-left leading-relaxed border border-slate-700 shadow-2xl whitespace-normal">
                                          <div className="font-bold text-amber-400 flex items-center gap-1.5 mb-1 text-xs">
                                            <AlertCircle size={13} className="text-amber-400 shrink-0" />
                                            <span>Awaiting JS Approval</span>
                                          </div>
                                          <p className="text-slate-200 text-[11px] leading-snug m-0">
                                            Cannot invite officer until the Joint Secretary approves the organization onboarding application.
                                          </p>
                                        </div>
                                        <div className="w-2.5 h-2.5 bg-[#0f172a] rotate-45 mr-4 -mt-1.5 border-r border-b border-slate-700" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {isAdmin && isRelationshipManager(u) && (
                                <button
                                  type="button"
                                  onClick={() => setTransferSource(u)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-800 text-[11px] font-bold transition-colors cursor-pointer"
                                  title="Transfer enquiries and pitches to another RM"
                                >
                                  <ArrowRightLeft size={11} />
                                  <span className="hidden sm:inline">Transfer</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => openEditModal(u)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                                title="Edit user details and roles"
                              >
                                <Edit3 size={11} />
                                <span className="hidden sm:inline">Edit</span>
                              </button>

                              {/* Toggle Active/Inactive Switch */}
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isActive}
                                title={isActive ? "Click to deactivate user account" : "Click to activate user account"}
                                disabled={togglingId === u.id}
                                onClick={() => handleToggleStatus(u)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                                  isActive ? "bg-emerald-500" : "bg-slate-300"
                                }`}
                              >
                                <span className="sr-only">{isActive ? "Deactivate" : "Activate"}</span>
                                <span
                                  aria-hidden="true"
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                                    isActive ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeleteTarget(u)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete or suspend user"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                    <span className="text-xs text-slate-500 font-medium">
                      Showing page <strong className="text-slate-900">{page}</strong> of <strong className="text-slate-900">{pagination.totalPages}</strong> ({pagination.total} total accounts)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>
                      <button
                        className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                        disabled={page >= pagination.totalPages}
                        onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs font-medium bg-slate-50/30">
                No users found matching the selected search and status filters.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      <GovModal
        open={createModalOpen}
        onClose={() => { setError(""); setCreateModalOpen(false); }}
        title={
          isGov
            ? "Create Department User"
            : isCorporate
            ? "Create Corporate Member"
            : isNgo
            ? "Create Agency Member"
            : "Create Platform User"
        }
        width={680}
      >
        <form onSubmit={handleCreateUser} className="space-y-3.5">
          {error && <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">{error}</div>}

          {/* Context Header */}
          {isGov && (
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2.5 min-w-0">
                <Building2 size={16} className="text-blue-700 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">Parent Organization</span>
                  <span className="font-bold text-slate-900 text-xs truncate block leading-tight">{userOrgName || "Main Government Department"}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded shrink-0">
                <MapPin size={12} className="text-blue-600 shrink-0" />
                <span className="font-bold text-slate-800 text-xs">{userDistrict || "Maharashtra"}</span>
                <span className="text-[9px] font-bold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Auto-Assigned
                </span>
              </div>
            </div>
          )}

          {isCorporate && (
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2.5">
                <Building2 size={16} className="text-purple-700 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">Corporate Entity</span>
                  <span className="font-bold text-slate-900 text-xs block leading-tight">{userOrgName || "CSR Company"}</span>
                </div>
              </div>
            </div>
          )}

          {/* 2-Column Form Grid (Strictly 2 Columns) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "14px", rowGap: "10px" }}>
            {/* Row 1: First Name & Last Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={userForm.firstName}
                onChange={(e) => setUserForm((prev) => ({ ...prev, firstName: e.target.value }))}
                placeholder="e.g. Anand"
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={userForm.lastName}
                onChange={(e) => setUserForm((prev) => ({ ...prev, lastName: e.target.value }))}
                placeholder="e.g. Sharma"
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Row 2: Official Email & Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Email <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="officer@maharashtra.gov.in"
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="tel"
                maxLength={10}
                value={userForm.mobile}
                onChange={(e) => setUserForm((prev) => ({ ...prev, mobile: e.target.value }))}
                placeholder="10-digit mobile number"
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Row 3: Designation & Department (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Designation <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={userForm.designation}
                onChange={(e) => setUserForm((prev) => ({ ...prev, designation: e.target.value }))}
                placeholder={isGov ? "e.g. Deputy Collector / Officer" : "e.g. CSR Lead"}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Department / Unit <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={userForm.department}
                onChange={(e) => setUserForm((prev) => ({ ...prev, department: e.target.value }))}
                placeholder={userOrgName ? `Defaults to ${userOrgName}` : "e.g. Planning Branch"}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Row 4: Role Select */}
            <div style={{ gridColumn: isPlatformAdmin ? "span 1" : "1 / -1" }}>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={userForm.role}
                onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
              >
                {roleOptions}
              </select>
              {isGov && (
                <div className="mt-1 text-xs text-slate-500 leading-none">
                  {userForm.role === "GOVERNMENT_OFFICER" && (
                    <span className="text-blue-800 font-medium">
                      ★ <strong>Organization Nodal Officer:</strong> Full administrative &amp; statutory approval rights.
                    </span>
                  )}
                  {userForm.role === "DISTRICT_NODAL_OFFICER" && (
                    <span className="text-emerald-800 font-medium">
                      ★ <strong>Project Nodal Officer:</strong> On-ground milestone verification &amp; monitoring for assigned projects.
                    </span>
                  )}
                  {userForm.role !== "GOVERNMENT_OFFICER" && userForm.role !== "DISTRICT_NODAL_OFFICER" && (
                    <span className="text-purple-800 font-medium">
                      ★ <strong>Custom Role ({userForm.role}):</strong> Permissions delegated according to organization matrix.
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Assigned District (Platform Admin Only) */}
            {isPlatformAdmin && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned District
                </label>
                <select
                  value={userForm.assignedDistrict}
                  onChange={(e) => setUserForm((prev) => ({ ...prev, assignedDistrict: e.target.value }))}
                  className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="">State level / not applicable</option>
                  {MAHARASHTRA_DISTRICTS.map((district) => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Row 5: Password (Optional) & Send Invitation Checkbox */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Leave blank to autogenerate"
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label
                className={`flex items-center gap-2.5 h-9 px-3 rounded-md border text-xs font-semibold cursor-pointer ${
                  !userForm.password.trim()
                    ? "bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed"
                    : "bg-blue-50/60 border-blue-200 text-slate-800 hover:bg-blue-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={!userForm.password.trim() ? true : userForm.sendInvitation}
                  disabled={!userForm.password.trim()}
                  onChange={(e) => setUserForm((prev) => ({ ...prev, sendInvitation: e.target.checked }))}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 shrink-0"
                />
                <div className="min-w-0">
                  <span className="text-xs font-bold block leading-tight text-slate-800">
                    Send email invitation
                  </span>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    {!userForm.password.trim() ? "Compulsory for auto-generated password" : "Optional for manual password"}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-200 mt-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <Plus size={13} />
                  <span>Create User &amp; Send Invite</span>
                </>
              )}
            </button>
          </div>
        </form>
      </GovModal>

      {/* EDIT USER MODAL */}
      <GovModal open={editModalOpen} onClose={() => { setError(""); setEditModalOpen(false); }} title={`Edit User: ${editForm.email}`} width={680}>
        <form onSubmit={handleSaveEdit} className="space-y-3.5">
          {error && <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "14px", rowGap: "10px" }}>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={editForm.firstName}
                onChange={(e) => setEditForm((prev) => ({ ...prev, firstName: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={editForm.lastName}
                onChange={(e) => setEditForm((prev) => ({ ...prev, lastName: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Email <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="tel"
                value={editForm.mobile}
                onChange={(e) => setEditForm((prev) => ({ ...prev, mobile: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Designation <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={editForm.designation}
                onChange={(e) => setEditForm((prev) => ({ ...prev, designation: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Department / Organization
              </label>
              <input
                type="text"
                value={editForm.department}
                onChange={(e) => setEditForm((prev) => ({ ...prev, department: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Role
                </label>
                {editForm.userId === user?.id && !isPlatformAdmin && (
                  <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    Own Role Locked
                  </span>
                )}
              </div>
              <select
                disabled={editForm.userId === user?.id && !isPlatformAdmin}
                value={editForm.role}
                onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                <option value="">None (dynamic roles only)</option>
                {roleOptions}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Account Status <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={editForm.accountStatus}
                onChange={(e) => setEditForm((prev) => ({ ...prev, accountStatus: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="PENDING_ACTIVATION">PENDING_ACTIVATION</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Assigned District
              </label>
              {(userDistrict || editForm.assignedDistrict || isGov) ? (
                <div className="flex items-center justify-between w-full h-9 px-3 rounded-md border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin size={13} className="text-blue-600 shrink-0" />
                    <span className="truncate">{userDistrict || editForm.assignedDistrict || "Maharashtra"}</span>
                  </div>
                  <span className="text-[9px] font-bold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                    Registration District (Locked)
                  </span>
                </div>
              ) : isPlatformAdmin ? (
                <select
                  value={editForm.assignedDistrict}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, assignedDistrict: e.target.value }))}
                  className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="">State level / not applicable</option>
                  {MAHARASHTRA_DISTRICTS.map((district) => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center justify-between w-full h-9 px-3 rounded-md border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin size={13} className="text-blue-600 shrink-0" />
                    <span className="truncate">{editForm.assignedDistrict || userDistrict || "Maharashtra (State Level)"}</span>
                  </div>
                  <span className="text-[9px] font-bold uppercase text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                    Locked
                  </span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Password <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Leave blank to keep current"
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="pt-2">
            <div className="text-xs font-bold text-slate-900 mb-1.5">
              Additional Dynamic Role Assignments
            </div>
            <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50">
              {activeDynamicRoles.map((role) => {
                const isChecked = editForm.dynamicRoleIds.includes(role.id);
                return (
                  <label
                    key={role.id}
                    className={`flex items-center gap-2 p-1.5 rounded border text-xs cursor-pointer ${
                      isChecked ? "bg-blue-50 border-blue-300 text-blue-900" : "bg-white border-slate-200 text-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() =>
                        setEditForm((prev) => ({
                          ...prev,
                          dynamicRoleIds: isChecked
                            ? prev.dynamicRoleIds.filter((id) => id !== role.id)
                            : [...prev.dynamicRoleIds, role.id],
                        }))
                      }
                      className="w-4 h-4 rounded text-blue-600 border-slate-300"
                    />
                    <span className="font-semibold">{role.name}</span>
                  </label>
                );
              })}
              {activeDynamicRoles.length === 0 && (
                <div className="text-xs text-slate-500 italic p-2">
                  No additional custom roles created for this organization yet.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-200 mt-2">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Check size={13} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </GovModal>

      <TransferPortfolioModal
        open={!!transferSource}
        onClose={() => setTransferSource(null)}
        sourceRmId={transferSource?.id || ""}
        sourceRmLabel={
          transferSource
            ? ([transferSource.firstName, transferSource.lastName].filter(Boolean).join(" ") || transferSource.email)
            : "Relationship Manager"
        }
        endpoint="/admin/rm/transfer-portfolio"
        includeSourceRmId
        onTransferred={handlePortfolioTransferred}
      />

      {/* DELETE CONFIRMATION MODAL */}
      <GovModal open={!!deleteTarget} onClose={() => { setError(""); setDeleteTarget(null); }} title="Delete User" width={460}>
        {error && <div className="gov-alert gov-alert-danger gov-mb-4">{error}</div>}
        <p style={{ fontSize: 14, color: "#475569", marginBottom: 8 }}>
          Are you sure you want to delete <strong>{deleteTarget?.email}</strong>?
        </p>
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20 }}>
          This action cannot be undone. If the user has linked records (assignments, audit
          history), the account will be suspended instead of removed.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }} className="flex-col-reverse sm:flex-row">
          <GovButton type="button" variant="secondary" onClick={() => setDeleteTarget(null)} className="w-full sm:w-auto justify-center">
            Cancel
          </GovButton>
          <GovButton type="button" variant="danger" onClick={handleDeleteUser} disabled={saving} className="w-full sm:w-auto justify-center">
            {saving ? "Deleting..." : "Delete User"}
          </GovButton>
        </div>
      </GovModal>

      {/* CREATE CUSTOM ROLE MODAL */}
      <GovModal
        open={customRoleModalOpen}
        onClose={() => { setRoleError(""); setCustomRoleModalOpen(false); }}
        title="Create Custom Organization Role"
        width={720}
      >
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!newRoleName.trim()) {
            setRoleError("Role name is required.");
            return;
          }
          if (selectedRolePermissions.length === 0) {
            setRoleError("Please select at least one permission for this role.");
            return;
          }
          setCreatingRole(true);
          setRoleError("");
          try {
            await apiFetch("/roles", {
              method: "POST",
              body: JSON.stringify({
                name: newRoleName.trim(),
                description: newRoleDescription.trim() || undefined,
                permissions: selectedRolePermissions,
              }),
            });
            setSuccess(`Custom role "${newRoleName.trim()}" created successfully! You can now assign it to users.`);
            setCustomRoleModalOpen(false);
            setNewRoleName("");
            setNewRoleDescription("");
            queryClient.invalidateQueries({ queryKey: ["admin", "dynamic-roles"] });
          } catch (err: any) {
            setRoleError(err.message || "Failed to create custom role");
          } finally {
            setCreatingRole(false);
          }
        }} className="space-y-4">
          {roleError && <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">{roleError}</div>}

          {/* Org Ownership Context Banner */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2.5 min-w-0">
              <Shield size={16} className="text-blue-700 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">Role Owner</span>
                <span className="font-bold text-slate-900 text-xs truncate block leading-tight">{userOrgName || "Main Organization"}</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-300 px-2 py-0.5 rounded">
              Delegation Ceiling Enforced
            </span>
          </div>

          {/* Role Inputs (Strictly 2 Columns) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "14px", rowGap: "10px" }}>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Role Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. Field Inspection Lead"
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Description <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                placeholder="e.g. Reviews milestones and site verification"
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Permissions Matrix with Clean Flat Categories */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-900">
                  Select Delegatable Permissions
                </label>
                <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {selectedRolePermissions.length} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allKeys = availablePermissionGroups.flatMap((g) => g.permissions.map((p) => p.key));
                    setSelectedRolePermissions(allKeys);
                  }}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-slate-300 text-xs">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedRolePermissions([])}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="gov-modal-scroll flex flex-col gap-3 max-h-72 overflow-y-auto p-2.5 rounded-lg border border-slate-200 bg-slate-50">
              {availablePermissionGroups.map((group) => {
                const groupKeys = group.permissions.map((p) => p.key);
                const allGroupSelected = groupKeys.every((k) => selectedRolePermissions.includes(k));
                return (
                  <div key={group.title} className="bg-white p-3 rounded-md border border-slate-200">
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{group.icon}</span>
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          {group.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (allGroupSelected) {
                            setSelectedRolePermissions((prev) => prev.filter((k) => !groupKeys.includes(k)));
                          } else {
                            setSelectedRolePermissions((prev) => Array.from(new Set([...prev, ...groupKeys])));
                          }
                        }}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        {allGroupSelected ? "Deselect All" : "Select All"}
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      {group.permissions.map((p) => {
                        const isChecked = selectedRolePermissions.includes(p.key);
                        return (
                          <div
                            key={p.key}
                            onClick={() => {
                              setSelectedRolePermissions((prev) =>
                                isChecked ? prev.filter((k) => k !== p.key) : [...prev, p.key]
                              );
                            }}
                            className={`flex items-start gap-2 p-2 rounded-md border text-left cursor-pointer transition-colors ${
                              isChecked
                                ? "bg-blue-50 border-blue-400 text-blue-950"
                                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 mt-0.5 rounded text-blue-600 border-slate-300 shrink-0 pointer-events-none"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold leading-tight">
                                {p.label}
                              </div>
                              {p.desc && (
                                <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                                  {p.desc}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {availablePermissionGroups.length === 0 && (
                <div className="p-4 text-center text-slate-500 text-xs">
                  No delegatable permissions available for your current account permissions.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-200 mt-2">
            <button
              type="button"
              onClick={() => setCustomRoleModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingRole}
              className="w-full sm:w-auto px-5 py-2 rounded-md bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {creatingRole ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Creating Role...</span>
                </>
              ) : (
                <>
                  <Plus size={13} />
                  <span>Create Custom Role</span>
                </>
              )}
            </button>
          </div>
        </form>
      </GovModal>

      {/* BULK IMPORT MODAL */}
      <GovModal
        open={bulkImportModalOpen}
        onClose={() => {
          setBulkImportModalOpen(false);
          setBulkResults(null);
          setBulkError("");
          setBulkCsvText("");
          setUploadedFile(null);
          setParsedRows([]);
        }}
        title="Bulk Import Relationship Managers & Officials"
      >
        <div className="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-1">
          {/* Header Banner */}
          {/* <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-blue-900 flex items-start gap-3">
            <Sparkles size={20} className="text-blue-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 text-sm">Relationship Manager Batch Provisioning</p>
              <p className="mt-0.5 text-[11px] text-slate-600 leading-normal">
                Batch onboard Relationship Managers, State CSR Cell coordinators, or District Nodal Consultants. Upload your spreadsheet or paste CSV rows. Each imported user receives an active account with an auto-generated temporary password.
              </p>
            </div>
          </div> */}

          {/* Download Templates Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-100/80 border border-slate-200">
            <div>
              <span className="font-bold text-slate-900 block text-xs">Official Import Templates</span>
              <span className="text-[11px] text-slate-500">Download formatted template with sample data</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={downloadSampleExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition-colors cursor-pointer"
                title="Download formatted Microsoft Excel spreadsheet"
              >
                <FileSpreadsheet size={14} />
                Download Excel (.xls)
              </button>
              <button
                type="button"
                onClick={downloadSampleCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-xs transition-colors cursor-pointer"
                title="Download CSV spreadsheet"
              >
                <Download size={14} />
                Download CSV (.csv)
              </button>
            </div>
          </div>

          {/* District Column Explanation Alert */}
          {/* <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-[11px] text-amber-900 flex items-start gap-2.5">
            <Info size={16} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">Why is there a &quot;District&quot; column in the template?</p>
              <p className="mt-1 text-slate-700 leading-relaxed">
                • <strong>State-Level Relationship Managers:</strong> Oversee corporate matching across the entire state of Maharashtra. If importing Statewide RMs, <strong>leave the District column blank</strong>.
                <br />
                • <strong>District Relationship Officers &amp; Nodal Consultants:</strong> Assigned to a specific district (e.g. <em>Pune, Mumbai City, Nagpur, Nashik</em>) for localized case handling and MoU facilitation — <strong>enter the assigned district name</strong>.
              </p>
            </div>
          </div> */}

          {/* Input Method Switcher */}
          <div className="flex border-b border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setBulkImportTab("upload")}
              className={`pb-2 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                bulkImportTab === "upload"
                  ? "border-blue-600 text-blue-600 font-extrabold"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <UploadCloud size={15} />
              Upload Excel / CSV File
            </button>
            <button
              type="button"
              onClick={() => setBulkImportTab("paste")}
              className={`pb-2 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                bulkImportTab === "paste"
                  ? "border-blue-600 text-blue-600 font-extrabold"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <FileText size={15} />
              Paste CSV Content
            </button>
          </div>

          {/* TAB 1: FILE UPLOAD (DRAG & DROP) */}
          {bulkImportTab === "upload" && (
            <div className="space-y-3">
              {!uploadedFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileSelect(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                    isDragging
                      ? "border-blue-500 bg-blue-50/50 scale-[1.01]"
                      : "border-slate-300 hover:border-blue-400 bg-slate-50/50"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-700">
                      <UploadCloud size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-xs sm:text-sm">
                        Drag and drop your Excel (.xls) or CSV (.csv) file here
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Supports Microsoft Excel (.xls), comma-separated (.csv), and tab-separated (.tsv, .txt)
                      </p>
                    </div>
                    <label className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm cursor-pointer transition-colors">
                      <Upload size={14} />
                      Browse File
                      <input
                        type="file"
                        accept=".csv,.xls,.xlsx,.tsv,.txt"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileSelect(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                      <FileSpreadsheet size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-xs truncate">{uploadedFile.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {(uploadedFile.size / 1024).toFixed(1)} KB • {parsedRows.length} user record(s) detected
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFile(null);
                      setParsedRows([]);
                      setBulkCsvText("");
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Remove file and select another"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PASTE CSV CONTENT */}
          {bulkImportTab === "paste" && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Paste CSV Rows (Headers: FirstName, LastName, Email, Mobile, Designation, Role, District)
              </label>
              <textarea
                className="w-full h-36 rounded-xl border border-slate-300 p-3 font-mono text-[11px] text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                placeholder={`FirstName,LastName,Email,Mobile,Designation,Role,District\nRajesh,Sharma,rajesh.sharma@maharashtra.gov.in,9876543210,Senior Relationship Manager,RELATIONSHIP_MANAGER,\nPriya,Deshmukh,priya.d@maharashtra.gov.in,9823012345,District Relationship Officer,RELATIONSHIP_MANAGER,Pune\nAmit,Patil,amit.patil@maharashtra.gov.in,9970123456,Nodal Consultant,DISTRICT_NODAL_CONSULTANT,Nagpur`}
                value={bulkCsvText}
                onChange={(e) => {
                  setBulkCsvText(e.target.value);
                  parseCsvOrText(e.target.value);
                }}
              />
            </div>
          )}

          {/* LIVE PARSED DATA PREVIEW */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  Parsed User Records ({parsedRows.length})
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Review verified rows before importing
                </span>
              </div>
              <div className="max-h-44 overflow-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Email</th>
                      <th className="py-2 px-3">Mobile</th>
                      <th className="py-2 px-3">Designation</th>
                      <th className="py-2 px-3">Role</th>
                      <th className="py-2 px-3">District</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row, idx) => {
                      const isValid = Boolean(row.email && row.firstName);
                      return (
                        <tr key={idx} className={isValid ? "hover:bg-slate-50/60" : "bg-rose-50/60"}>
                          <td className="py-1.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-1.5 px-3 font-bold text-slate-900">
                            {row.firstName} {row.lastName}
                          </td>
                          <td className="py-1.5 px-3 text-slate-700 font-mono">{row.email || "-"}</td>
                          <td className="py-1.5 px-3 text-slate-600">{row.mobile || "-"}</td>
                          <td className="py-1.5 px-3 text-slate-600">{row.designation || "Relationship Manager"}</td>
                          <td className="py-1.5 px-3">
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-bold border border-blue-200">
                              {row.role || "RELATIONSHIP_MANAGER"}
                            </span>
                          </td>
                          <td className="py-1.5 px-3">
                            {row.district ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                                {row.district}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Statewide</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {bulkError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800 flex items-center gap-2">
              <AlertCircle size={15} />
              {bulkError}
            </div>
          )}

          {/* RESULTS SUMMARY */}
          {bulkResults && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">
                  Import Summary: {bulkResults.imported.length} Succeeded | {bulkResults.errors.length} Failed
                </span>
              </div>

              {bulkResults.imported.length > 0 && (
                <div className="max-h-48 overflow-auto rounded-lg border border-emerald-200 bg-white p-2.5 text-[11px]">
                  <p className="font-bold text-emerald-800 mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    Imported Accounts & Auto-Generated Temporary Passwords:
                  </p>
                  <ul className="divide-y divide-slate-100">
                    {bulkResults.imported.map((item: any, idx: number) => (
                      <li key={idx} className="py-1.5 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900">{item.name}</span> ({item.email})
                        </div>
                        <span className="font-mono text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">
                          Pass: {item.tempPassword}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {bulkResults.errors.length > 0 && (
                <div className="max-h-36 overflow-auto rounded-lg border border-rose-200 bg-white p-2.5 text-[11px]">
                  <p className="font-bold text-rose-800 mb-1.5 flex items-center gap-1.5">
                    <AlertCircle size={14} />
                    Errors Encountered:
                  </p>
                  <ul className="divide-y divide-rose-50 text-rose-700">
                    {bulkResults.errors.map((err: any, idx: number) => (
                      <li key={idx} className="py-1">
                        Row {err.row} ({err.email}): {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ACTIONS */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <GovButton
              type="button"
              variant="secondary"
              onClick={() => {
                setBulkImportModalOpen(false);
                setBulkResults(null);
                setBulkError("");
                setBulkCsvText("");
                setUploadedFile(null);
                setParsedRows([]);
              }}
              className="w-full sm:w-auto"
            >
              Close
            </GovButton>

            <GovButton
              type="button"
              variant="secondary"
              disabled={bulkImporting || (parsedRows.length === 0 && !bulkCsvText.trim())}
              onClick={() => handleBulkImport(false)}
              className="w-full sm:w-auto font-bold"
            >
              <Users size={14} className="mr-1 inline-block" />
              {bulkImporting ? "Processing..." : `Create ${parsedRows.length > 0 ? `${parsedRows.length} ` : ""}User${parsedRows.length === 1 ? "" : "s"}`}
            </GovButton>

            <GovButton
              type="button"
              variant="primary"
              disabled={bulkImporting || (parsedRows.length === 0 && !bulkCsvText.trim())}
              onClick={() => handleBulkImport(true)}
              className="w-full sm:w-auto font-bold"
            >
              <Mail size={14} className="mr-1 inline-block" />
              {bulkImporting ? "Creating & Sending..." : `Create User${parsedRows.length === 1 ? "" : "s"} & Send Invite`}
            </GovButton>
          </div>
        </div>
      </GovModal>
    </GovPortalLayout>
  );
}

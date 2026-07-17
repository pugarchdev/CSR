// View Enquiry Detail Page
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Building2,
  Mail,
  ChevronLeft,
  Clock,
  MapPin,
  Phone,
  User,
  Briefcase,
  FileText,
  MessageSquare,
  History,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Download,
  Edit,
  MoreHorizontal,
  Upload
} from "lucide-react";

import { DashboardLayout } from "@/components/layout";
import { PageHeader } from "@/components/layout";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Timeline as TimelineComponent, TimelineItem } from "@/components/ui/Timeline";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { label: "Dashboard", href: "/rm/dashboard", icon: Building2 },
  { label: "Corporate Enquiries", href: "/rm/enquiries", icon: Mail },
];

interface EnquiryData {
  id: string;
  trackingId: string;
  status: string;
  company: {
    name: string;
    cin: string;
    address: string;
    sector: string;
  };
  contact: {
    name: string;
    email: string;
    phone: string;
    designation: string;
  };
  enquiry: {
    preferredDistricts: string[];
    sectors: string[];
    budgetRange: string;
    description: string;
    submittedAt: string;
  };
  assignedRM?: {
    name: string;
    email: string;
  };
}

const enquiryData: EnquiryData = {
  id: "1",
  trackingId: "ENR-2026-00128",
  status: "IN_PROGRESS",
  company: {
    name: "Tech Solutions Ltd",
    cin: "L01110MH1995PLC087408",
    address: "123 Tech Park, Mumbai - 400001",
    sector: "Information Technology",
  },
  contact: {
    name: "Rajesh Kumar",
    email: "rajesh.kumar@techsolutions.com",
    phone: "+91 98765 43210",
    designation: "CSR Head",
  },
  enquiry: {
    preferredDistricts: ["Mumbai", "Thane", "Pune"],
    sectors: ["Education", "Digital Literacy"],
    budgetRange: "₹1 Crore - ₹5 Crore",
    description: "We are interested in partnering with the Maharashtra government to implement digital education initiatives in government schools. Our company has expertise in EdTech solutions and can provide smart classrooms, digital content, and teacher training programs. We are looking for districts where we can make a meaningful impact on education quality.",
    submittedAt: "2026-07-17T08:30:00Z",
  },
  assignedRM: {
    name: "Anand Sharma",
    email: "anand.sharma@mahacsr.gov.in",
  },
};

const timelineData = [
  {
    id: "1",
    date: "2026-07-17T08:30:00Z",
    title: "Enquiry Submitted",
    description: "Corporate enquiry submitted by Tech Solutions Ltd",
    status: "completed" as const,
    icon: FileText,
  },
  {
    id: "2",
    date: "2026-07-17T10:15:00Z",
    title: "Enquiry Acknowledged",
    description: "Auto-acknowledgment sent to company",
    status: "completed" as const,
    icon: CheckCircle2,
  },
  {
    id: "3",
    date: "2026-07-17T14:30:00Z",
    title: "RM Assigned",
    description: "Relationship Manager Anand Sharma assigned",
    status: "completed" as const,
    icon: User,
  },
  {
    id: "4",
    date: "2026-07-18T09:00:00Z",
    title: "Initial Contact",
    description: "First response due (SLA: 2 days)",
    status: "active" as const,
    icon: MessageSquare,
  },
  {
    id: "5",
    date: "2026-07-20T09:00:00Z",
    title: "Feasibility Assessment",
    description: "Schedule assessment meeting",
    status: "pending" as const,
    icon: Clock,
  },
];

const getStatusConfig = (status: string) => {
  const configs: Record<string, { variant: "success" | "warning" | "danger" | "info" | "primary" | "muted"; label: string }> = {
    PENDING: { variant: "warning", label: "Pending" },
    IN_PROGRESS: { variant: "info", label: "In Progress" },
    UNDER_VERIFICATION: { variant: "primary", label: "Under Verification" },
    APPROVED: { variant: "success", label: "Approved" },
    REJECTED: { variant: "danger", label: "Rejected" },
    ESCALATED: { variant: "danger", label: "Escalated" },
  };
  return configs[status] || { variant: "muted", label: status };
};

export default function ViewEnquiryPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const statusConfig = getStatusConfig(enquiryData.status);

  return (
    <DashboardLayout
      userRole="CSR Relationship Manager"
      userName="Relationship Manager"
      userEmail="rm@mahacsr.gov.in"
      sidebarItems={sidebarItems}
    >
      <PageHeader
        title={`Enquiry ${enquiryData.trackingId}`}
        description="View and manage corporate partnership enquiry"
        breadcrumbs={[
          { label: "Dashboard", href: "/rm/dashboard" },
          { label: "Corporate Enquiries", href: "/rm/enquiries" },
          { label: enquiryData.trackingId },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <MessageSquare size={16} className="mr-2" />
              Send Message
            </Button>
            <Button>
              <Edit size={16} className="mr-2" />
              Update Status
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <Card hover={false}>
            <CardContent className="py-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge variant={statusConfig.variant} className="mt-1 text-sm">
                    {statusConfig.label}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Submitted</p>
                  <p className="font-medium text-gray-900">
                    {new Date(enquiryData.enquiry.submittedAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              
              {enquiryData.assignedRM && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">Assigned RM</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold">
                      {enquiryData.assignedRM.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{enquiryData.assignedRM.name}</p>
                      <p className="text-sm text-gray-500">{enquiryData.assignedRM.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Company Information */}
          <Card hover={false}>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Company Name</p>
                  <p className="font-medium text-gray-900">{enquiryData.company.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">CIN</p>
                  <p className="font-medium text-gray-900">{enquiryData.company.cin}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Sector</p>
                  <Badge variant="info" size="sm">
                    {enquiryData.company.sector}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium text-gray-900">{enquiryData.company.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card hover={false}>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{enquiryData.contact.name}</p>
                    <p className="text-sm text-gray-500">{enquiryData.contact.designation}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-gray-400" />
                    <span className="text-gray-900">{enquiryData.contact.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone size={16} className="text-gray-400" />
                    <span className="text-gray-900">{enquiryData.contact.phone}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enquiry Details */}
          <Card hover={false}>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Enquiry Details</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Description</p>
                  <p className="text-gray-900 leading-relaxed">{enquiryData.enquiry.description}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Preferred Districts</p>
                    <div className="flex flex-wrap gap-2">
                      {enquiryData.enquiry.preferredDistricts.map((district) => (
                        <Badge key={district} variant="muted" size="sm">
                          {district}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Sectors of Interest</p>
                    <div className="flex flex-wrap gap-2">
                      {enquiryData.enquiry.sectors.map((sector) => (
                        <Badge key={sector} variant="info" size="sm">
                          {sector}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Budget Range</p>
                  <p className="font-medium text-gray-900">{enquiryData.enquiry.budgetRange}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card hover={false}>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
            </CardHeader>
            <CardContent>
              <TimelineComponent items={timelineData} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card hover={false}>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="secondary" fullWidth className="justify-start">
                  <MessageSquare size={18} className="mr-2" />
                  Send Message
                </Button>
                <Button variant="secondary" fullWidth className="justify-start">
                  <FileText size={18} className="mr-2" />
                  Add Note
                </Button>
                <Button variant="secondary" fullWidth className="justify-start">
                  <Download size={18} className="mr-2" />
                  Download Details
                </Button>
                <Button variant="secondary" fullWidth className="justify-start">
                  <History size={18} className="mr-2" />
                  View History
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* SLA Information */}
          <Card hover={false} className="bg-primary-50 border-primary-100">
            <CardContent className="py-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-primary-900">SLA Status</h3>
                  <p className="text-sm text-primary-700">Response due in 1 day</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-primary-700">Time Remaining</span>
                    <span className="font-medium text-primary-900">18 hours</span>
                  </div>
                  <div className="h-2 bg-primary-200 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full w-3/4" />
                  </div>
                </div>
                <p className="text-xs text-primary-600">
                  First response required by 19 July 2026, 09:00 AM
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card hover={false}>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <FileText size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No documents attached</p>
                <Button variant="outline" size="sm" className="mt-3">
                  <Upload size={14} className="mr-1" />
                  Upload Document
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Timeline Component
import { LucideIcon } from "lucide-react";

interface TimelineItemData {
  id: string;
  date: string;
  title: string;
  description: string;
  status: "completed" | "active" | "pending";
  icon: LucideIcon;
}

function Timeline({ items }: { items: TimelineItemData[] }) {
  return (
    <div className="space-y-6">
      {items.map((item, index) => (
        <div key={item.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                item.status === "completed" && "bg-success-100 text-success-600",
                item.status === "active" && "bg-primary-100 text-primary-600 ring-4 ring-primary-50",
                item.status === "pending" && "bg-gray-100 text-gray-400"
              )}
            >
              <item.icon size={20} />
            </div>
            {index < items.length - 1 && (
              <div
                className={cn(
                  "w-0.5 flex-1 mt-2",
                  item.status === "completed" ? "bg-success-200" : "bg-gray-200"
                )}
              />
            )}
          </div>
          <div className="flex-1 pb-6">
            <p className="text-sm text-gray-500">
              {new Date(item.date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <h4
              className={cn(
                "font-medium mt-1",
                item.status === "pending" ? "text-gray-400" : "text-gray-900"
              )}
            >
              {item.title}
            </h4>
            <p
              className={cn(
                "text-sm mt-1",
                item.status === "pending" ? "text-gray-300" : "text-gray-500"
              )}
            >
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

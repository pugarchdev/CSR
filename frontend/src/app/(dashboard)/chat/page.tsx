"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Paperclip, CheckCheck, Landmark, Building2,
  Search, Pin, Smile, Mic, Play, Pause,
  FileText, ShieldCheck, Sparkles, Phone, Plus, X, Download, Trash2,
  MapPin, CheckCircle2, MessageSquare, Tag
} from "lucide-react";
import { getStoredUser, API_BASE_URL, apiFetch } from "@/lib/api";
import { GovPageHeader } from "@/components/layout/GovPageHeader";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface Attachment {
  name: string;
  size: string;
  url?: string;
}

interface Message {
  id: string;
  senderName: string;
  senderRole: string;
  text: string;
  time: string;
  createdTimestamp?: number;
  isDeleted?: boolean;
  isVoice?: boolean;
  voiceDuration?: string;
  audioUrl?: string;
  attachment?: Attachment;
  reactions?: string[];
  pinned?: boolean;
}

interface ChatRoom {
  id: string;
  partnerName: string;
  partnerType: "NGO" | "COMPANY" | "GOVT";
  phone?: string;
  lastMessage: string;
  updatedAt: string;
  unread: boolean;
  pinned: boolean;
  projectTitle?: string;
  onlineStatus?: "ONLINE" | "OFFLINE" | "IN_SESSION";
  avatarColor: string;
}

export interface PartnerDirectoryItem {
  id: string;
  name: string;
  type: "NGO" | "COMPANY" | "GOVT";
  roleTitle?: string;
  project: string;
  district: string;
  sector: string;
  badge: string;
  phone: string;
  avatarColor: string;
}

const verifiedStakeholdersDirectory: PartnerDirectoryItem[] = [
  // NGOs & Implementing Agencies
  {
    id: "partner-ngo-1",
    name: "Swades Foundation",
    type: "NGO",
    roleTitle: "Implementing Agency (Lead)",
    project: "Raigad 360° Water Security & Community Livelihoods",
    district: "Raigad, MH",
    sector: "Water & Livelihoods",
    badge: "80G / 12A Verified",
    phone: "+91 22 6107 7100",
    avatarColor: "from-emerald-500 to-teal-600"
  },
  {
    id: "partner-ngo-2",
    name: "Paani Foundation Trust",
    type: "NGO",
    roleTitle: "Water Conservation NGO",
    project: "Water Cup & Watershed Replenishment Mission",
    district: "Satara & Solapur, MH",
    sector: "Water Conservation",
    badge: "Grade A+ Verified",
    phone: "+91 22 4001 2233",
    avatarColor: "from-teal-600 to-cyan-600"
  },
  {
    id: "partner-ngo-3",
    name: "Pratham Education Foundation",
    type: "NGO",
    roleTitle: "Education NGO Partner",
    project: "Digital Literacy & STEM Rural Classrooms",
    district: "Statewide Maharashtra",
    sector: "Primary Education",
    badge: "CSR-1 Registered",
    phone: "+91 22 2498 8578",
    avatarColor: "from-emerald-600 to-green-600"
  },
  {
    id: "partner-ngo-4",
    name: "Vidarbha Rural Development Trust",
    type: "NGO",
    roleTitle: "Healthcare Implementing Agency",
    project: "Gadchiroli Tribal Telemedicine Network & Primary Clinics",
    district: "Gadchiroli, MH",
    sector: "Tribal Healthcare",
    badge: "Aspirational Dist NGO",
    phone: "+91 7132 224105",
    avatarColor: "from-amber-500 to-orange-600"
  },
  {
    id: "partner-ngo-5",
    name: "Watershed Organisation Trust (WOTR)",
    type: "NGO",
    roleTitle: "Climate & Watershed Agency",
    project: "Climate-Resilient Watershed Agriculture & Check Dams",
    district: "Ahmednagar, MH",
    sector: "Climate Agriculture",
    badge: "Verified NGO",
    phone: "+91 20 2422 6211",
    avatarColor: "from-emerald-600 to-teal-700"
  },
  {
    id: "partner-ngo-6",
    name: "BAIF Development Research Foundation",
    type: "NGO",
    roleTitle: "Livelihood & Agri Foundation",
    project: "Livestock & Rural Agri-Livelihoods Center",
    district: "Pune, MH",
    sector: "Sustainable Livelihoods",
    badge: "Verified NGO",
    phone: "+91 20 2523 1661",
    avatarColor: "from-teal-500 to-emerald-700"
  },
  {
    id: "partner-ngo-7",
    name: "Yuva Parivartan Trust",
    type: "NGO",
    roleTitle: "Youth Skilling Partner",
    project: "Youth Vocational Training & Micro-Enterprise Hubs",
    district: "Thane & Palghar, MH",
    sector: "Vocational Skilling",
    badge: "Verified NGO",
    phone: "+91 22 2686 0001",
    avatarColor: "from-emerald-500 to-cyan-600"
  },
  {
    id: "partner-ngo-8",
    name: "Sahyadri Eco Foundation",
    type: "NGO",
    roleTitle: "Forest & Ecology Partner",
    project: "Gadchiroli Watershed & Afforestation Initiative",
    district: "Gadchiroli & Chandrapur, MH",
    sector: "Ecology & Forestry",
    badge: "Verified NGO",
    phone: "+91 98230 41102",
    avatarColor: "from-emerald-500 to-teal-600"
  },

  // Corporates & CSR Contributors
  {
    id: "partner-corp-1",
    name: "Tata CSR Foundation Desk",
    type: "COMPANY",
    roleTitle: "Corporate CSR Contributor",
    project: "Maharashtra Skill Labs & Industrial Training Centers",
    district: "Mumbai & Statewide",
    sector: "Skill Development",
    badge: "Corporate Contributor",
    phone: "+91 22 6665 8282",
    avatarColor: "from-blue-600 to-indigo-600"
  },
  {
    id: "partner-corp-2",
    name: "Sahyadri Technology Ventures Ltd",
    type: "COMPANY",
    roleTitle: "Corporate CSR Partner",
    project: "Pune Rural Digital Classrooms & IT Hardware Labs",
    district: "Pune, MH",
    sector: "Digital Education",
    badge: "Corporate Contributor",
    phone: "+91 98221 04958",
    avatarColor: "from-blue-600 to-indigo-600"
  },
  {
    id: "partner-corp-3",
    name: "Mahindra & Mahindra CSR Desk",
    type: "COMPANY",
    roleTitle: "Corporate CSR Cell",
    project: "Nashik Jalyukt Shivar & Women SHG Livelihoods",
    district: "Nashik, MH",
    sector: "Water & Women SHGs",
    badge: "Corporate Contributor",
    phone: "+91 22 2490 1441",
    avatarColor: "from-indigo-600 to-blue-700"
  },
  {
    id: "partner-corp-4",
    name: "Bajaj Auto CSR Trust",
    type: "COMPANY",
    roleTitle: "Corporate Foundation",
    project: "Marathwada Community Healthcare & Dialysis Units",
    district: "Chhatrapati Sambhajinagar, MH",
    sector: "Healthcare & Education",
    badge: "Corporate Contributor",
    phone: "+91 20 6610 6501",
    avatarColor: "from-blue-700 to-indigo-800"
  },
  {
    id: "partner-corp-5",
    name: "Bharat Petroleum CSR Cell",
    type: "COMPANY",
    roleTitle: "PSU CSR Department",
    project: "Solar Water Purifiers & Community RO Plants",
    district: "Solapur, MH",
    sector: "Clean Water Supply",
    badge: "PSU CSR Partner",
    phone: "+91 22 2271 3000",
    avatarColor: "from-blue-600 to-cyan-600"
  },
  {
    id: "partner-corp-6",
    name: "Larsen & Toubro CSR",
    type: "COMPANY",
    roleTitle: "Corporate CSR Desk",
    project: "Polytechnic Modernization & Solar Rooftop Classrooms",
    district: "Thane, MH",
    sector: "STEM & Solar",
    badge: "Corporate Contributor",
    phone: "+91 22 6752 5656",
    avatarColor: "from-indigo-500 to-blue-600"
  },
  {
    id: "partner-corp-7",
    name: "JSW Foundation CSR Desk",
    type: "COMPANY",
    roleTitle: "Corporate CSR Partner",
    project: "Palghar Child Nutrition & Model Anganwadi Infrastructure",
    district: "Palghar & Raigad, MH",
    sector: "Child Nutrition",
    badge: "Corporate Contributor",
    phone: "+91 22 4286 1000",
    avatarColor: "from-blue-600 to-indigo-700"
  },

  // Government Desks & District Nodal Officers
  {
    id: "partner-govt-1",
    name: "State CSR Facilitation Desk",
    type: "GOVT",
    roleTitle: "State Secretariat Nodal Desk",
    project: "Official CSR Support, Escalations & Tripartite MoUs",
    district: "Mantralaya, Mumbai",
    sector: "State Governance",
    badge: "State Secretariat Desk",
    phone: "+91 22 2202 5500",
    avatarColor: "from-purple-600 to-indigo-600"
  },
  {
    id: "partner-govt-2",
    name: "District Collectorate Gadchiroli",
    type: "GOVT",
    roleTitle: "District Nodal Officer (DNO)",
    project: "Tribal Area Development & Aspirational District CSR",
    district: "Gadchiroli, MH",
    sector: "Aspirational District",
    badge: "DNO Nodal Desk",
    phone: "+91 7132 222001",
    avatarColor: "from-purple-600 to-violet-700"
  },
  {
    id: "partner-govt-3",
    name: "Pune District CSR Nodal Cell",
    type: "GOVT",
    roleTitle: "District Nodal Officer (DNO)",
    project: "Zilla Parishad Smart Schools & Solar Lighting Projects",
    district: "Pune, MH",
    sector: "District CSR Desk",
    badge: "DNO Nodal Desk",
    phone: "+91 20 2612 3344",
    avatarColor: "from-purple-700 to-indigo-600"
  },
  {
    id: "partner-govt-4",
    name: "State CSR Cell (Nodal Officer Desk)",
    type: "GOVT",
    roleTitle: "State Nodal Officer",
    project: "Solapur Solar Drinking Water Tripartite MoU",
    district: "Mumbai / Solapur, MH",
    sector: "State CSR Cell",
    badge: "State Nodal Desk",
    phone: "+91 94220 18392",
    avatarColor: "from-purple-600 to-indigo-600"
  },
  {
    id: "partner-govt-5",
    name: "State Public Health Department CSR",
    type: "GOVT",
    roleTitle: "Departmental Nodal Desk",
    project: "Sub-District Hospitals Telemedicine Tele-ICU Network",
    district: "Mumbai / Statewide",
    sector: "Public Health Infra",
    badge: "State Dept Desk",
    phone: "+91 22 2261 1441",
    avatarColor: "from-purple-600 to-pink-600"
  },
  {
    id: "partner-govt-6",
    name: "Satara District Water Conservation Desk",
    type: "GOVT",
    roleTitle: "District Nodal Officer (DNO)",
    project: "Taluka Check Dam Rejuvenation & Geo-tagging Monitoring",
    district: "Satara, MH",
    sector: "Water Conservation",
    badge: "DNO Nodal Desk",
    phone: "+91 2162 234120",
    avatarColor: "from-purple-600 to-indigo-700"
  },
  {
    id: "partner-govt-7",
    name: "Chhatrapati Sambhajinagar Collectorate",
    type: "GOVT",
    roleTitle: "District Nodal Officer (DNO)",
    project: "Marathwada Drought Mitigation & Industrial Water Recycling",
    district: "Chhatrapati Sambhajinagar, MH",
    sector: "District CSR Desk",
    badge: "DNO Nodal Desk",
    phone: "+91 240 233 4501",
    avatarColor: "from-violet-600 to-purple-800"
  }
];

const SUGGESTION_TAGS = [
  { id: "all", label: "All Suggestions", icon: "✨" },
  { id: "water", label: "Water & Watershed", query: "Water", icon: "💧" },
  { id: "education", label: "Digital Classrooms", query: "Education", icon: "🏫" },
  { id: "health", label: "Tribal Healthcare", query: "Health", icon: "🏥" },
  { id: "dno", label: "District Nodal Desks", query: "Nodal", icon: "🏛️" },
  { id: "gadchiroli", label: "Gadchiroli Aspirational", query: "Gadchiroli", icon: "📍" },
  { id: "corporate", label: "Corporate Donors", query: "Corporate", icon: "💼" },
  { id: "skilling", label: "Skilling & Livelihoods", query: "Skill", icon: "⚡" },
];

const initialChats: ChatRoom[] = [
  {
    id: "chat-1",
    partnerName: "Sahyadri Eco Foundation",
    partnerType: "NGO",
    phone: "+91 98230 41102",
    lastMessage: "Please verify the S3 PDF links for Phase 1 check dam reports.",
    updatedAt: "14:22 PM",
    unread: true,
    pinned: true,
    projectTitle: "Gadchiroli Watershed Initiative",
    onlineStatus: "IN_SESSION",
    avatarColor: "from-emerald-500 to-teal-600",
  },
  {
    id: "chat-2",
    partnerName: "Sahyadri Technology Ventures Ltd",
    partnerType: "COMPANY",
    phone: "+91 98221 04958",
    lastMessage: "Board approved the Pune Smart-Classroom budget tranche.",
    updatedAt: "Yesterday",
    unread: false,
    pinned: true,
    projectTitle: "Pune Rural Digital Classrooms",
    onlineStatus: "ONLINE",
    avatarColor: "from-blue-600 to-indigo-600",
  },
  {
    id: "chat-3",
    partnerName: "State CSR Cell (Nodal Officer Desk)",
    partnerType: "GOVT",
    phone: "+91 94220 18392",
    lastMessage: "Tripartite MoU agreement signed for Solapur solar water project.",
    updatedAt: "Jul 25",
    unread: false,
    pinned: false,
    projectTitle: "Solapur Solar Drinking Water",
    onlineStatus: "ONLINE",
    avatarColor: "from-purple-600 to-indigo-600",
  },
  {
    id: "chat-4",
    partnerName: "Vidarbha Rural Development Trust",
    partnerType: "NGO",
    phone: "+91 97641 50284",
    lastMessage: "Telemedicine equipment delivered to Aheri primary health center.",
    updatedAt: "Jul 23",
    unread: false,
    pinned: false,
    projectTitle: "Gadchiroli Tribal Health Network",
    onlineStatus: "OFFLINE",
    avatarColor: "from-amber-500 to-orange-600",
  },
];

const initialMessagesStore: Record<string, Message[]> = {
  "chat-1": [
    {
      id: "m-1",
      senderName: "Sahyadri Eco Foundation",
      senderRole: "NGO_ADMIN",
      text: "Hello team, we have completed geological surveying for check dam sites in Aheri.",
      time: "14:15 PM",
      reactions: ["👍"]
    },
    {
      id: "m-2",
      senderName: "You",
      senderRole: "COMPANY_ADMIN",
      text: "Great! Can you share the certificate reports or soil analysis results?",
      time: "14:18 PM",
      pinned: true
    },
    {
      id: "m-3",
      senderName: "Sahyadri Eco Foundation",
      senderRole: "NGO_ADMIN",
      text: "Please verify the S3 PDF links for Phase 1 check dam reports.",
      time: "14:22 PM",
      attachment: { name: "Phase_1_Site_Survey_Gadchiroli.pdf", size: "3.4 MB" }
    }
  ],
  "chat-2": [
    { id: "m-4", senderName: "You", senderRole: "NGO_ADMIN", text: "We have finalized the hardware specs for Loni Kalbhor schools.", time: "10:30 AM" },
    { id: "m-5", senderName: "Sahyadri Technology Ventures Ltd", senderRole: "COMPANY_ADMIN", text: "Board approved the Pune Smart-Classroom budget tranche.", time: "10:35 AM", reactions: ["🎉", "❤️"] },
    { id: "m-6", senderName: "Sahyadri Technology Ventures Ltd", senderRole: "COMPANY_ADMIN", text: "Voice briefing attached regarding procurement timeline.", time: "10:36 AM", isVoice: true, voiceDuration: "0:42" }
  ],
  "chat-3": [
    { id: "m-7", senderName: "State CSR Cell", senderRole: "GOVT_ADMIN", text: "MoU draft has been reviewed by the Law Secretariat.", time: "11:00 AM" },
    { id: "m-8", senderName: "You", senderRole: "COMPANY_ADMIN", text: "Thank you Officer, we will transfer Tranche 1 to Escrow.", time: "11:15 AM", reactions: ["👍"] },
    { id: "m-9", senderName: "State CSR Cell", senderRole: "GOVT_ADMIN", text: "Tripartite MoU agreement signed for Solapur solar water project.", time: "11:30 AM", attachment: { name: "Tripartite_MoU_Solapur_Signed.pdf", size: "1.8 MB" } }
  ],
  "chat-4": [
    { id: "m-10", senderName: "Vidarbha Rural Trust", senderRole: "NGO_ADMIN", text: "Telemedicine equipment delivered to Aheri primary health center.", time: "16:00 PM" }
  ]
};

function getPersonaChatsAndStore(storedUser: any) {
  const userId = storedUser?.id || storedUser?.email || "anonymous";
  const userKeyChats = `mahacsr_chats_${userId}`;
  const userKeyStore = `mahacsr_store_${userId}`;

  if (typeof window !== "undefined") {
    try {
      const savedChats = localStorage.getItem(userKeyChats);
      const savedStore = localStorage.getItem(userKeyStore);
      if (savedChats && savedStore) {
        const parsedChats = JSON.parse(savedChats);
        const parsedStore = JSON.parse(savedStore);
        if (Array.isArray(parsedChats) && parsedChats.length > 0) {
          return { chats: parsedChats, store: parsedStore };
        }
      }
    } catch {}
  }

  const role = String(storedUser?.role || storedUser?.roleSlug || storedUser?.roleNumericId || "").toUpperCase();
  const userName = storedUser?.firstName
    ? `${storedUser.firstName} ${storedUser.lastName || ""}`.trim()
    : storedUser?.name || storedUser?.organization?.name || "Partner";

  const isRM = role.includes("RM") || role.includes("RELATIONSHIP") || role === "6";
  const isGov = role.includes("GOVT") || role.includes("SECRETARY") || role.includes("NODAL") || role === "3" || role === "4";

  const defaultChatId = `chat-user-${userId.slice(0, 8)}`;

  let partnerName = "State CSR Facilitation Desk";
  let partnerType: "NGO" | "COMPANY" | "GOVT" = "GOVT";
  let initialMsg = `Welcome ${userName}! Your communication desk is active. Messages sent here are private between you and the State CSR Secretariat.`;

  if (isRM) {
    partnerName = "State Joint Secretary Desk";
    partnerType = "GOVT";
    initialMsg = `Welcome RM ${userName}. Use this official channel for escalation and Joint Secretary desk communication.`;
  } else if (isGov) {
    partnerName = "CSR Secretariat Helpdesk";
    partnerType = "GOVT";
    initialMsg = `Welcome Officer ${userName}. Your district coordination channel is active.`;
  }

  const userChats: ChatRoom[] = [
    {
      id: defaultChatId,
      partnerName,
      partnerType,
      phone: "+91 22 2202 5500",
      lastMessage: initialMsg,
      updatedAt: "Just now",
      unread: true,
      pinned: true,
      projectTitle: "Official CSR Support & Facilitation Channel",
      onlineStatus: "ONLINE",
      avatarColor: "from-blue-600 to-indigo-600",
    }
  ];

  const userStore: Record<string, Message[]> = {
    [defaultChatId]: [
      {
        id: `msg-${Date.now()}`,
        senderName: partnerName,
        senderRole: "GOVT_ADMIN",
        text: initialMsg,
        time: "Just now"
      }
    ]
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(userKeyChats, JSON.stringify(userChats));
      localStorage.setItem(userKeyStore, JSON.stringify(userStore));
    } catch {}
  }

  return { chats: userChats, store: userStore };
}

export default function ChatSystem() {
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<ChatRoom[]>(initialChats);
  const [activeChat, setActiveChat] = useState<ChatRoom>(initialChats[0]);
  const [messagesStore, setMessagesStore] = useState<Record<string, Message[]>>(initialMessagesStore);
  const [inputVal, setInputVal] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "unread" | "pinned">("all");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mobileTab, setMobileTab] = useState<"list" | "chat">("chat");

  // New Conversation Search & Filter State
  const [partnerSearchQuery, setPartnerSearchQuery] = useState("");
  const [partnerCategoryFilter, setPartnerCategoryFilter] = useState<"ALL" | "NGO" | "COMPANY" | "GOVT">("ALL");
  const [selectedSuggestionTag, setSelectedSuggestionTag] = useState("all");
  const [apiPartners, setApiPartners] = useState<PartnerDirectoryItem[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
      const { chats: userChats, store: userStore } = getPersonaChatsAndStore(stored);
      setChats(userChats);
      setActiveChat(userChats[0]);
      setMessagesStore(userStore);
    }
  }, []);

  // Fetch verified organizations from API if available to merge with curated directory
  useEffect(() => {
    let isMounted = true;
    const fetchOrgDirectory = async () => {
      try {
        const res = await apiFetch<any>("/admin/organizations?limit=25");
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.organizations) ? res.organizations : Array.isArray(res) ? res : [];
        if (isMounted && list.length > 0) {
          const mapped: PartnerDirectoryItem[] = list.map((org: any) => {
            const orgType: "NGO" | "COMPANY" | "GOVT" =
              org.type === "CSR_COMPANY" || org.type === "COMPANY" ? "COMPANY" :
              org.type === "GOVERNMENT" || org.type === "GOVT" ? "GOVT" : "NGO";
            return {
              id: `api-org-${org.id}`,
              name: org.name || org.legalName || "Registered Partner",
              type: orgType,
              roleTitle: orgType === "GOVT" ? "Government Department" : orgType === "COMPANY" ? "Corporate CSR Contributor" : "Registered Implementing Agency",
              project: org.description || org.mission || `${org.name} District CSR Program`,
              district: org.district || "Maharashtra",
              sector: org.sector || "Social Development",
              badge: "Verified Registry",
              phone: org.phone || "+91 22 2202 5500",
              avatarColor: orgType === "NGO" ? "from-emerald-500 to-teal-600" : orgType === "GOVT" ? "from-purple-600 to-indigo-600" : "from-blue-600 to-indigo-600"
            };
          });
          setApiPartners(mapped);
        }
      } catch {
        // Fallback gracefully to verified stakeholders directory
      }
    };
    fetchOrgDirectory();
    return () => { isMounted = false; };
  }, []);

  // Combined directory with deduplication
  const combinedDirectory = useMemo(() => {
    const seenNames = new Set<string>();
    const result: PartnerDirectoryItem[] = [];

    for (const item of verifiedStakeholdersDirectory) {
      if (!seenNames.has(item.name.toLowerCase())) {
        seenNames.add(item.name.toLowerCase());
        result.push(item);
      }
    }

    for (const item of apiPartners) {
      if (!seenNames.has(item.name.toLowerCase())) {
        seenNames.add(item.name.toLowerCase());
        result.push(item);
      }
    }

    return result;
  }, [apiPartners]);

  // Filtered directory for modal search & suggestions
  const filteredDirectory = useMemo(() => {
    return combinedDirectory.filter(partner => {
      // Category filter
      if (partnerCategoryFilter !== "ALL" && partner.type !== partnerCategoryFilter) {
        return false;
      }

      // Suggestion tag filter
      if (selectedSuggestionTag !== "all") {
        const tagObj = SUGGESTION_TAGS.find(t => t.id === selectedSuggestionTag);
        if (tagObj && tagObj.query) {
          const q = tagObj.query.toLowerCase();
          const matchTag =
            partner.sector.toLowerCase().includes(q) ||
            partner.project.toLowerCase().includes(q) ||
            partner.district.toLowerCase().includes(q) ||
            partner.name.toLowerCase().includes(q) ||
            (partner.roleTitle && partner.roleTitle.toLowerCase().includes(q)) ||
            (partner.badge && partner.badge.toLowerCase().includes(q));
          if (!matchTag) return false;
        }
      }

      // Search Query
      if (partnerSearchQuery.trim()) {
        const q = partnerSearchQuery.toLowerCase().trim();
        const matchSearch =
          partner.name.toLowerCase().includes(q) ||
          partner.project.toLowerCase().includes(q) ||
          partner.district.toLowerCase().includes(q) ||
          partner.sector.toLowerCase().includes(q) ||
          (partner.roleTitle && partner.roleTitle.toLowerCase().includes(q)) ||
          (partner.badge && partner.badge.toLowerCase().includes(q)) ||
          partner.type.toLowerCase().includes(q);
        if (!matchSearch) return false;
      }

      return true;
    });
  }, [combinedDirectory, partnerCategoryFilter, selectedSuggestionTag, partnerSearchQuery]);

  const handleSelectPartner = (partner: PartnerDirectoryItem | { name: string; type: "NGO" | "COMPANY" | "GOVT"; project?: string; phone?: string; district?: string }) => {
    // Check if room with this partner name already exists
    const existingRoom = chats.find(c =>
      c.partnerName.toLowerCase().trim() === partner.name.toLowerCase().trim()
    );

    if (existingRoom) {
      setActiveChat(existingRoom);
      setChats(prev => prev.map(c => c.id === existingRoom.id ? { ...c, unread: false } : c));
      setMobileTab("chat");
      setNewChatModalOpen(false);
      setPartnerSearchQuery("");
      setSelectedSuggestionTag("all");
      return;
    }

    const partnerType = partner.type || "NGO";
    const partnerDistrict = (partner as any).district ? ` in ${(partner as any).district}` : "";
    const initialWelcomeMessage = partnerType === "GOVT"
      ? `Welcome to the official communication desk for ${partner.name}${partnerDistrict}. This is a direct government coordination channel.`
      : partnerType === "COMPANY"
      ? `Hello! Official collaboration channel opened with ${partner.name}. Use this desk to coordinate CSR proposals, approvals, and fund disbursements.`
      : `Namaste! Collaboration channel opened with ${partner.name}. Ready to coordinate on ${partner.project || "CSR field initiatives"}.`;

    const newChatId = `chat-room-${Date.now()}`;
    const newRoom: ChatRoom = {
      id: newChatId,
      partnerName: partner.name,
      partnerType: partnerType,
      phone: partner.phone || "+91 22 2202 5500",
      lastMessage: initialWelcomeMessage,
      updatedAt: "Just now",
      unread: false,
      pinned: false,
      projectTitle: partner.project || (partner as any).sector || "CSR Collaboration Channel",
      onlineStatus: "ONLINE",
      avatarColor: (partner as any).avatarColor || (partnerType === "NGO" ? "from-emerald-500 to-teal-600" : partnerType === "GOVT" ? "from-purple-600 to-indigo-600" : "from-blue-600 to-indigo-600")
    };

    const initialMsgObj: Message = {
      id: `m-init-${Date.now()}`,
      senderName: partner.name,
      senderRole: partnerType === "GOVT" ? "GOVT_ADMIN" : partnerType === "COMPANY" ? "COMPANY_ADMIN" : "NGO_ADMIN",
      text: initialWelcomeMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdTimestamp: Date.now(),
      reactions: []
    };

    const updatedChats = [newRoom, ...chats];
    const updatedStore = {
      ...messagesStore,
      [newChatId]: [initialMsgObj]
    };

    setChats(updatedChats);
    setActiveChat(newRoom);
    setMessagesStore(updatedStore);
    setMobileTab("chat");
    setNewChatModalOpen(false);
    setPartnerSearchQuery("");
    setSelectedSuggestionTag("all");

    if (typeof window !== "undefined" && user) {
      const userId = user?.id || user?.email || "anonymous";
      try {
        localStorage.setItem(`mahacsr_chats_${userId}`, JSON.stringify(updatedChats));
        localStorage.setItem(`mahacsr_store_${userId}`, JSON.stringify(updatedStore));
      } catch {}
    }
  };

  const messages = messagesStore[activeChat.id] || [];

  const prevChatIdRef = useRef(activeChat.id);
  const prevMessageCountRef = useRef(messages.length);

  // Smooth Auto Scroll ONLY when new message added or room changed (so user can scroll up freely)
  useEffect(() => {
    if (scrollRef.current) {
      const isNewRoom = prevChatIdRef.current !== activeChat.id;
      const isNewMessageAdded = messages.length > prevMessageCountRef.current;

      if (isNewRoom || isNewMessageAdded) {
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 30);
      }

      prevChatIdRef.current = activeChat.id;
      prevMessageCountRef.current = messages.length;
    }
  }, [messages.length, activeChat.id, isTyping]);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const emojiList = [
    "👍", "❤️", "🎉", "🙏", "🚀", "💡", "🤝", "🔥", "⚡", "👏",
    "💯", "📌", "📄", "🔒", "📊", "🎯", "✨", "😊", "😀", "✅"
  ];

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() && !selectedFile) return;

    const myName = user?.name || user?.organization?.name || "You";
    const myRole = user?.role || "CORPORATE_ADMIN";

    let attachmentObj: Attachment | undefined = undefined;

    if (selectedFile) {
      const blobUrl = URL.createObjectURL(selectedFile);
      attachmentObj = {
        name: selectedFile.name,
        size: `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`,
        url: blobUrl
      };

      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const res = await fetch(`${API_BASE_URL}/uploads`, {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            attachmentObj.url = data.url;
          }
        }
      } catch (err) {
        console.warn("Backend upload fallback to blob URL:", err);
      }
    }

    const newMessage: Message = {
      id: `m-new-${Date.now()}`,
      senderName: "You",
      senderRole: myRole,
      text: inputVal.trim() || (selectedFile ? `Attached: ${selectedFile.name}` : ""),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdTimestamp: Date.now(),
      reactions: [],
      attachment: attachmentObj
    };

    const updatedCurrentMessages = [...messages, newMessage];
    const updatedStore = { ...messagesStore, [activeChat.id]: updatedCurrentMessages };
    const updatedChats = chats.map(c => c.id === activeChat.id ? { ...c, lastMessage: newMessage.text, updatedAt: newMessage.time } : c);

    setMessagesStore(updatedStore);
    setChats(updatedChats);

    if (typeof window !== "undefined" && user) {
      const userId = user?.id || user?.email || "anonymous";
      try {
        localStorage.setItem(`mahacsr_chats_${userId}`, JSON.stringify(updatedChats));
        localStorage.setItem(`mahacsr_store_${userId}`, JSON.stringify(updatedStore));
      } catch {}
    }

    setInputVal("");
    setSelectedFile(null);
    setShowEmojiPicker(false);
  };

  const handleDownloadAttachment = (attachment: Attachment) => {
    if (attachment.url) {
      const a = document.createElement("a");
      a.href = attachment.url;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const content = `MahaCSR Setu Verification Document\nFilename: ${attachment.name}\nSize: ${attachment.size}\nStatus: Verified on Blockchain Escrow Ledger`;
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.name.endsWith(".pdf") ? attachment.name.replace(".pdf", ".txt") : attachment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleDeleteMessage = (m: Message) => {
    const created = m.createdTimestamp || Date.now();
    const ageMinutes = (Date.now() - created) / (1000 * 60);

    if (ageMinutes > 10) {
      alert("Messages can only be deleted for everyone within 10 minutes of sending.");
      return;
    }

    setMessagesStore(prev => ({
      ...prev,
      [activeChat.id]: (prev[activeChat.id] || []).map(item => {
        if (item.id === m.id) {
          return {
            ...item,
            text: "You deleted this message",
            isDeleted: true,
            attachment: undefined,
            isVoice: false
          };
        }
        return item;
      })
    }));
  };

  // Real HTML5 Microphone Voice Recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        const durationSec = recordingSeconds || 4;
        const voiceMessage: Message = {
          id: `m-voice-${Date.now()}`,
          senderName: "You",
          senderRole: user?.role || "CORPORATE_ADMIN",
          text: "Voice note briefing",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isVoice: true,
          voiceDuration: `0:${durationSec < 10 ? '0' : ''}${durationSec}`,
          audioUrl,
          reactions: []
        };
        setMessagesStore(prev => ({
          ...prev,
          [activeChat.id]: [...(prev[activeChat.id] || []), voiceMessage]
        }));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn("Microphone access simulated:", err);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    }
  };

  const stopVoiceRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    } else {
      // Simulation fallback if mic not plugged in
      const durationSec = recordingSeconds || 5;
      const voiceMessage: Message = {
        id: `m-voice-${Date.now()}`,
        senderName: "You",
        senderRole: user?.role || "CORPORATE_ADMIN",
        text: "Voice note briefing",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isVoice: true,
        voiceDuration: `0:${durationSec < 10 ? '0' : ''}${durationSec}`,
        reactions: []
      };
      setMessagesStore(prev => ({
        ...prev,
        [activeChat.id]: [...(prev[activeChat.id] || []), voiceMessage]
      }));
    }
    setIsRecording(false);
  };

  const handlePlayVoice = (m: Message) => {
    if (playingVoiceId === m.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingVoiceId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      if (m.audioUrl) {
        const audio = new Audio(m.audioUrl);
        audioPlayerRef.current = audio;
        audio.play();
        setPlayingVoiceId(m.id);
        audio.onended = () => setPlayingVoiceId(null);
      } else {
        setPlayingVoiceId(m.id);
        const durationSec = parseInt(m.voiceDuration?.split(":")[1] || "15");
        setTimeout(() => setPlayingVoiceId(null), durationSec * 1000);
      }
    }
  };

  const handleTogglePinMessage = (id: string) => {
    setMessagesStore(prev => ({
      ...prev,
      [activeChat.id]: (prev[activeChat.id] || []).map(m => m.id === id ? { ...m, pinned: !m.pinned } : m)
    }));
  };

  const handleReact = (messageId: string, emoji: string) => {
    setMessagesStore(prev => ({
      ...prev,
      [activeChat.id]: (prev[activeChat.id] || []).map(m => {
        if (m.id === messageId) {
          const reactions = m.reactions || [];
          return {
            ...m,
            reactions: reactions.includes(emoji)
              ? reactions.filter(r => r !== emoji)
              : [...reactions, emoji]
          };
        }
        return m;
      })
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const filteredChats = chats.filter(chat => {
    const matchesFilter =
      filterMode === "pinned" ? chat.pinned :
      filterMode === "unread" ? chat.unread : true;

    const matchesSearch =
      !sidebarSearch.trim() ||
      chat.partnerName.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      (chat.projectTitle && chat.projectTitle.toLowerCase().includes(sidebarSearch.toLowerCase())) ||
      chat.lastMessage.toLowerCase().includes(sidebarSearch.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const displayMessages = messages.filter(m =>
    !searchQuery || m.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mx-auto flex flex-col gap-6 max-w-7xl px-4 py-6 md:px-8 min-h-[calc(100vh-100px)]">

      <GovPageHeader
        title="Collaboration Hub & Partner Messaging"
        eyebrow="Real-Time Workspace"
        description="Encrypted multi-stakeholder messaging channel for Corporate CSR teams, Government Nodal Officers, and Implementing Agencies."
        actions={
          <Button
            onClick={() => {
              setNewChatModalOpen(true);
              setPartnerSearchQuery("");
              setSelectedSuggestionTag("all");
              setPartnerCategoryFilter("ALL");
            }}
            variant="primary"
            className="flex items-center gap-1.5 shadow-md px-3 sm:px-4"
          >
            <Plus size={15} /> <span className="hidden sm:inline">New Conversation</span><span className="sm:hidden">New</span>
          </Button>
        }
      />

      {/* Main 3D Glassmorphism Chat Card Container */}
      <div className="flex flex-col md:flex-row rounded-3xl border border-white/80 bg-white/90 backdrop-blur-2xl shadow-glass overflow-hidden h-[calc(100vh-180px)] md:h-[700px] w-full border-slate-200/80">

        {/* Left Panel: Conversations Index */}
        <div className={`w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-200/80 flex flex-col h-full bg-slate-50/50 shrink-0 ${
          mobileTab === "chat" ? "hidden md:flex" : "flex"
        }`}>

          {/* Filter & Search Header */}
          <div className="p-3.5 sm:p-4 border-b border-slate-200/80 flex flex-col gap-2.5 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Sparkles size={14} className="text-blue-600" /> Active Channels
              </span>
              <span className="text-[10px] font-extrabold text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full font-mono">
                {chats.length} Rooms
              </span>
            </div>

            {/* Sidebar Channel Search Input */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                placeholder="Search active channels..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-2xs"
              />
              {sidebarSearch && (
                <button
                  type="button"
                  onClick={() => setSidebarSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              {[
                { id: "all", label: "All Chats" },
                { id: "unread", label: "Unread" },
                { id: "pinned", label: "Pinned" }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterMode(f.id as any)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterMode === f.id
                      ? "bg-white text-blue-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rooms List */}
          <div className="flex-grow overflow-y-auto flex flex-col divide-y divide-slate-100/80">
            {filteredChats.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <MessageSquare size={24} className="text-slate-300" />
                <span>No channels match "{sidebarSearch}"</span>
                <button
                  onClick={() => setSidebarSearch("")}
                  className="text-blue-600 font-bold hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <motion.div
                  key={chat.id}
                  whileHover={{ x: 3, transition: { duration: 0.15 } }}
                  onClick={() => {
                    setActiveChat(chat);
                    setMobileTab("chat");
                    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unread: false } : c));
                  }}
                  className={`p-4 flex gap-3.5 items-start cursor-pointer transition-all relative ${
                    activeChat.id === chat.id
                      ? "bg-gradient-to-r from-blue-50/80 via-blue-50/30 to-transparent border-l-4 border-blue-900"
                      : "hover:bg-slate-50/80"
                  }`}
                >
                  {/* Avatar Icon */}
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${chat.avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0`}>
                    {chat.partnerType === "NGO" ? <Landmark size={18} /> : chat.partnerType === "GOVT" ? <ShieldCheck size={18} /> : <Building2 size={18} />}
                  </div>

                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-xs text-slate-900 truncate pr-1">{chat.partnerName}</h4>
                      <span className="text-[10px] text-slate-400 font-semibold shrink-0">{chat.updatedAt}</span>
                    </div>

                    {chat.projectTitle && (
                      <p className="text-[10px] font-bold text-blue-700 truncate mt-0.5">{chat.projectTitle}</p>
                    )}

                    <p className="text-xs text-slate-500 truncate mt-1 font-medium">{chat.lastMessage}</p>
                  </div>

                  {chat.unread && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 mt-1 shadow-sm animate-pulse" />
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Active Chat Stream */}
        <div className={`flex-1 flex flex-col h-full bg-slate-50/30 justify-between min-w-0 ${
          mobileTab === "list" ? "hidden md:flex" : "flex"
        }`}>

          {/* Active Room Header */}
          <div className="p-3 sm:p-4 border-b border-slate-200/80 flex justify-between items-center bg-white shadow-xs z-10 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => setMobileTab("list")}
                className="md:hidden text-slate-500 hover:text-slate-800 p-1 rounded-lg shrink-0 flex items-center gap-1"
              >
                <span className="text-lg leading-none">←</span>
                <span className="hidden sm:inline text-sm font-medium">Channels</span>
              </button>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br ${activeChat.avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-md shrink-0`}>
                {activeChat.partnerType === "NGO" ? <Landmark size={16} /> : activeChat.partnerType === "GOVT" ? <ShieldCheck size={16} /> : <Building2 size={16} />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-extrabold text-xs sm:text-sm text-slate-900 truncate">{activeChat.partnerName}</h3>
                  {activeChat.pinned && <Pin size={12} className="text-blue-600 fill-blue-600/10 shrink-0" />}
                </div>
                {activeChat.projectTitle && (
                  <p className="text-[10px] sm:text-xs font-semibold text-blue-800 truncate">Proposal: {activeChat.projectTitle}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Search in chat */}
              {searchOpen && (
                <motion.input
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 160, opacity: 1 }}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages..."
                  className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                />
              )}
              <button
                onClick={() => {
                  setSearchOpen(!searchOpen);
                  setSearchQuery("");
                }}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-all"
              >
                <Search size={16} />
              </button>

              <a
                href={`tel:${activeChat.phone || '+91 98230 41102'}`}
                className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-mono font-bold text-xs hover:bg-slate-200 transition-colors shadow-2xs shrink-0"
                title="Contact Phone Number"
              >
                <Phone size={13} className="text-blue-600" />
                <span className="hidden sm:inline">{activeChat.phone || "+91 98230 41102"}</span>
              </a>

              <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Session
              </span>
            </div>
          </div>

          {/* Messages Stream Container (Fixed Height & Auto Scroll) */}
          <div
            ref={scrollRef}
            style={{ height: 'calc(100% - 130px)' }}
            className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 bg-gradient-to-b from-slate-50/50 via-white/40 to-blue-50/20 scroll-smooth shadow-inner"
          >
            <AnimatePresence>
              {displayMessages.map((m) => {
                const isMe = m.senderName === "You";
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`flex flex-col gap-1 max-w-[80%] sm:max-w-[70%] relative group ${
                      isMe ? "self-end items-end" : "self-start items-start"
                    }`}
                  >
                    <div className="flex gap-1.5 items-center text-[10px] text-slate-400 font-bold px-1">
                      <span>{m.senderName}</span>
                      {m.pinned && <Pin size={9} className="text-blue-600 fill-blue-600/10" />}
                    </div>

                    {/* Message Card Bubble */}
                    <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed relative shadow-md transition-all ${
                      m.isDeleted
                        ? "bg-slate-100/70 border border-slate-200/80 text-slate-400 italic rounded-2xl flex items-center gap-2 font-medium"
                        : isMe
                          ? "bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white rounded-tr-none"
                          : "bg-white border border-slate-200/90 text-slate-900 rounded-tl-none"
                    }`}>
                      {m.isDeleted ? (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Trash2 size={13} className="text-slate-400" />
                          <span>You deleted this message</span>
                        </div>
                      ) : m.isVoice ? (
                        <div className="flex items-center gap-3 w-56">
                          <button
                            type="button"
                            onClick={() => handlePlayVoice(m)}
                            className={`p-2.5 rounded-xl shadow-xs transition-transform transform hover:scale-105 ${
                              isMe ? "bg-white/20 text-white" : "bg-blue-100 text-blue-900"
                            }`}
                          >
                            {playingVoiceId === m.id ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
                          </button>
                          <div className="flex-grow flex flex-col gap-1">
                            <div className="h-5 flex items-center gap-1">
                              {[3, 6, 2, 8, 4, 7, 5, 9, 3, 6, 4, 8, 2, 5].map((h, i) => (
                                <span
                                  key={i}
                                  className={`flex-grow rounded-full transition-all ${
                                    playingVoiceId === m.id ? "bg-emerald-400 animate-pulse" : isMe ? "bg-white/40" : "bg-slate-300"
                                  }`}
                                  style={{ height: `${h * 10}%` }}
                                />
                              ))}
                            </div>
                            <span className={`text-[10px] font-semibold ${isMe ? "text-blue-100" : "text-slate-400"}`}>
                              {m.voiceDuration || "0:24"} Voice note briefing
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p>{m.text}</p>
                      )}

                      {/* File Attachment Box */}
                      {!m.isDeleted && m.attachment && (
                        <div className={`mt-3 p-3 rounded-xl border flex items-center justify-between gap-3 ${
                          isMe ? "bg-white/10 border-white/20 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                        }`}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText size={18} className={isMe ? "text-blue-200" : "text-blue-700"} />
                            <div className="truncate">
                              <p className="text-xs font-bold truncate">{m.attachment.name}</p>
                              <span className="text-[10px] opacity-75">{m.attachment.size}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(m.attachment!)}
                            className={`p-1.5 rounded-lg transition-colors ${isMe ? "hover:bg-white/20 text-white" : "hover:bg-slate-200 text-blue-900"}`}
                            title={`Download ${m.attachment.name}`}
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      )}

                      {/* Reactions Overlay */}
                      {!m.isDeleted && m.reactions && m.reactions.length > 0 && (
                        <div className="absolute -bottom-3 right-3 flex gap-1 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-md text-[11px]">
                          {m.reactions.map((r, i) => (
                            <span key={i}>{r}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Enhanced Animated Glassmorphism Hover Toolbar */}
                    {!m.isDeleted && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className={`hidden group-hover:flex items-center gap-1.5 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl px-3 py-1.5 rounded-2xl absolute -top-5 z-20 ${
                          isMe ? "right-2" : "left-2"
                        }`}
                      >
                        {["👍", "❤️", "🎉", "🔥", "🚀"].map((emoji, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleReact(m.id, emoji)}
                            className="hover:scale-135 hover:-translate-y-1 active:scale-90 transition-all duration-200 text-sm p-1 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                          >
                            {emoji}
                          </button>
                        ))}

                        <div className="w-px h-3.5 bg-slate-200 mx-0.5" />

                        <button
                          type="button"
                          onClick={() => handleTogglePinMessage(m.id)}
                          className="hover:text-blue-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all text-slate-400 hover:scale-110"
                          title={m.pinned ? "Unpin message" : "Pin message"}
                        >
                          <Pin size={13} className={m.pinned ? "text-blue-600 fill-blue-600/10" : ""} />
                        </button>

                        {/* WhatsApp-Style Delete Button (Only for sender & within 10 min) */}
                        {isMe && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(m)}
                            className="hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all text-slate-400 hover:scale-110"
                            title="Delete for Everyone (Within 10 min)"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </motion.div>
                    )}

                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 px-1 mt-0.5">
                      {m.time} {isMe && !m.isDeleted && <CheckCheck size={12} className="text-blue-600" />}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Live Typing Indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-1 max-w-[70%] self-start items-start"
              >
                <span className="text-[10px] text-slate-400 font-bold">{activeChat.partnerName}</span>
                <div className="bg-white border border-slate-200/90 px-4 py-3 rounded-2xl flex gap-1.5 items-center shadow-md">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </motion.div>
            )}
          </div>

          {/* Selected File Preview Strip */}
          {selectedFile && (
            <div className="px-4 py-2 bg-blue-50 border-t border-blue-200 flex items-center justify-between text-xs font-bold text-blue-900">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-blue-700" />
                <span>Ready to attach: {selectedFile.name}</span>
                <span className="text-[10px] text-blue-600">({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)</span>
              </div>
              <button onClick={() => setSelectedFile(null)} className="text-blue-600 hover:text-red-600">
                <X size={15} />
              </button>
            </div>
          )}

          {/* Message Input Controls */}
          <div className="p-4 border-t border-slate-200/80 bg-white shadow-xs shrink-0">
            {isRecording ? (
              <div className="flex justify-between items-center bg-rose-50 border border-rose-200 px-4 py-3 rounded-2xl text-rose-700 text-xs font-bold animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                  <span>Recording voice note... <span className="font-mono font-extrabold text-rose-900 ml-1">0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setIsRecording(false); if (recordingTimerRef.current) clearInterval(recordingTimerRef.current); }}
                    className="text-slate-500 hover:text-slate-800 text-xs font-bold px-2 py-1"
                  >
                    Cancel
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={stopVoiceRecording}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                  >
                    Stop & Send Voice Note
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 sm:gap-3 relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-slate-400 hover:text-blue-700 transition-colors p-2 hover:bg-blue-50 rounded-xl shrink-0"
                  title="Attach File"
                >
                  <Paperclip size={18} />
                </button>

                {/* Emoji Picker Trigger & Popover */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-2 rounded-xl transition-colors ${showEmojiPicker ? "text-amber-500 bg-amber-50" : "text-slate-400 hover:text-amber-600 hover:bg-amber-50"}`}
                    title="Insert Emoji"
                  >
                    <Smile size={18} />
                  </button>

                  {showEmojiPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-12 left-0 sm:left-auto sm:right-0 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl p-3 shadow-2xl z-50 grid grid-cols-5 gap-2 w-56"
                    >
                      {emojiList.map((emoji, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setInputVal(prev => prev + emoji);
                          }}
                          className="text-lg hover:scale-125 transition-transform p-1.5 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                        >
                          {emoji}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>

                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder={`Write message to ${activeChat.partnerName}...`}
                  className="flex-grow bg-slate-50 border border-slate-200/80 rounded-2xl py-2.5 px-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-xs min-w-0"
                />

                {/* Voice Note Trigger */}
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                  title="Record Voice Note"
                >
                  <Mic size={18} />
                </button>

                <Button
                  type="submit"
                  variant="primary"
                  className="px-5 py-2.5 shadow-md flex items-center gap-1.5 shrink-0"
                >
                  <Send size={14} /> Send
                </Button>
              </form>
            )}
          </div>

        </div>

      </div>

      {/* Modal for Starting New Conversation with Interactive Search & Smart Suggestions */}
      <Modal
        isOpen={newChatModalOpen}
        onClose={() => setNewChatModalOpen(false)}
        title="Start New Partner Conversation"
        className="max-w-2xl"
      >
        <div className="space-y-4 text-xs font-medium text-slate-700">
          <p className="text-slate-500 text-xs leading-relaxed -mt-1">
            Search verified NGOs, Corporate CSR desks, Government District Nodal Officers (DNOs), or active CSR projects to initiate an encrypted messaging channel.
          </p>

          {/* Interactive Search Bar */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={partnerSearchQuery}
              onChange={(e) => setPartnerSearchQuery(e.target.value)}
              placeholder="Search by organization name, sector, district (e.g. Pune, Gadchiroli), project, or nodal desk..."
              className="w-full bg-slate-50 border border-slate-300/80 rounded-2xl py-2.5 pl-10 pr-24 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-xs"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {partnerSearchQuery && (
                <button
                  type="button"
                  onClick={() => setPartnerSearchQuery("")}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
              <span className="text-[10px] font-bold text-slate-500 bg-slate-200/70 border border-slate-300/60 px-2 py-0.5 rounded-full font-mono">
                {filteredDirectory.length} found
              </span>
            </div>
          </div>

          {/* Smart Trending Suggestion Pills */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <span className="flex items-center gap-1 text-slate-700">
                <Sparkles size={13} className="text-amber-500" /> Focus Area Suggestions
              </span>
              {selectedSuggestionTag !== "all" && (
                <button
                  onClick={() => setSelectedSuggestionTag("all")}
                  className="text-[10px] text-blue-600 hover:underline font-semibold"
                >
                  Reset focus
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {SUGGESTION_TAGS.map((tag) => {
                const isActive = selectedSuggestionTag === tag.id;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      setSelectedSuggestionTag(isActive && tag.id !== "all" ? "all" : tag.id);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs whitespace-nowrap flex items-center gap-1.5 transition-all shrink-0 ${
                      isActive
                        ? "bg-blue-900 text-white font-bold shadow-xs scale-102"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200/80 font-medium"
                    }`}
                  >
                    <span>{tag.icon}</span>
                    <span>{tag.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70">
            {[
              { id: "ALL", label: `All (${combinedDirectory.length})`, icon: Landmark },
              { id: "NGO", label: `NGOs (${combinedDirectory.filter(p => p.type === "NGO").length})`, icon: Landmark },
              { id: "COMPANY", label: `Corporates (${combinedDirectory.filter(p => p.type === "COMPANY").length})`, icon: Building2 },
              { id: "GOVT", label: `Govt & DNO (${combinedDirectory.filter(p => p.type === "GOVT").length})`, icon: ShieldCheck }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = partnerCategoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPartnerCategoryFilter(tab.id as any)}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    isActive
                      ? "bg-white text-blue-900 shadow-xs border border-slate-200/80"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Icon size={13} className={isActive ? "text-blue-600" : "text-slate-400"} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Suggestions & Partner Cards Stream */}
          <div className="overflow-y-auto max-h-[380px] space-y-2.5 pr-1 divide-y divide-slate-100">
            {filteredDirectory.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Search size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">No stakeholders found</h4>
                  <p className="text-slate-500 text-xs mt-0.5">
                    No verified partner matched "{partnerSearchQuery || selectedSuggestionTag}".
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPartnerSearchQuery("");
                      setSelectedSuggestionTag("all");
                      setPartnerCategoryFilter("ALL");
                    }}
                  >
                    Reset All Filters
                  </Button>
                  {partnerSearchQuery.trim() && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSelectPartner({
                        name: partnerSearchQuery.trim(),
                        type: partnerCategoryFilter === "ALL" ? "NGO" : partnerCategoryFilter,
                        project: "Direct CSR Coordination",
                        district: "Maharashtra"
                      })}
                      className="flex items-center gap-1.5"
                    >
                      <Plus size={13} /> Start Direct Channel with "{partnerSearchQuery.trim()}"
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              filteredDirectory.map((partner) => {
                const isExisting = chats.some(c =>
                  c.partnerName.toLowerCase().trim() === partner.name.toLowerCase().trim()
                );

                return (
                  <motion.div
                    key={partner.id}
                    whileHover={{ y: -1, transition: { duration: 0.1 } }}
                    onClick={() => handleSelectPartner(partner)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3.5 ${
                      isExisting
                        ? "bg-blue-50/40 border-blue-200/80 hover:bg-blue-50/90 hover:border-blue-300"
                        : "bg-white border-slate-200/80 hover:bg-slate-50/90 hover:border-blue-300 shadow-2xs"
                    }`}
                  >
                    {/* Left: Avatar + Details */}
                    <div className="flex items-center gap-3 min-w-0 flex-grow">
                      <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${partner.avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0`}>
                        {partner.type === "NGO" ? <Landmark size={18} /> : partner.type === "GOVT" ? <ShieldCheck size={18} /> : <Building2 size={18} />}
                      </div>

                      <div className="min-w-0 flex-grow">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{partner.name}</h4>
                          <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1">
                            <CheckCircle2 size={10} className="text-emerald-600" /> {partner.badge}
                          </span>
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border shrink-0 ${
                            partner.type === "NGO" ? "bg-emerald-50 text-emerald-900 border-emerald-200" :
                            partner.type === "GOVT" ? "bg-purple-50 text-purple-900 border-purple-200" :
                            "bg-blue-50 text-blue-900 border-blue-200"
                          }`}>
                            {partner.type}
                          </span>
                        </div>

                        <p className="text-[11px] text-blue-700 font-semibold truncate mt-0.5">
                          {partner.project}
                        </p>

                        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin size={11} className="text-slate-400" /> {partner.district}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1 text-slate-600 font-semibold">
                            <Tag size={10} className="text-slate-400" /> {partner.sector}
                          </span>
                          {partner.phone && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="font-mono text-slate-500">{partner.phone}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Action Indicator */}
                    <div className="shrink-0 flex items-center">
                      {isExisting ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-900 bg-blue-100/80 border border-blue-300 px-3 py-1.5 rounded-xl hover:bg-blue-200 transition-colors shadow-2xs">
                          <MessageSquare size={12} className="text-blue-700" />
                          <span className="hidden sm:inline">Active</span> Channel →
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-blue-900 hover:bg-blue-800 px-3 py-1.5 rounded-xl shadow-xs transition-colors">
                          <Plus size={12} /> Connect
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
            <span className="text-[11px] text-slate-500 font-medium">
              Showing {filteredDirectory.length} of {combinedDirectory.length} verified Maharashtra stakeholders
            </span>
            <Button variant="outline" size="sm" onClick={() => setNewChatModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}


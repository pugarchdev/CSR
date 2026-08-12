"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Paperclip, CheckCheck, Landmark, Building2,
  Search, Pin, Smile, Mic, Play, Pause,
  FileText, ShieldCheck, Sparkles, Phone, Plus, X, Download, Trash2
} from "lucide-react";
import { getStoredUser, API_BASE_URL } from "@/lib/api";
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mobileTab, setMobileTab] = useState<"list" | "chat">("chat");

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
    if (filterMode === "pinned") return chat.pinned;
    if (filterMode === "unread") return chat.unread;
    return true;
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
            onClick={() => setNewChatModalOpen(true)}
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
          <div className="p-4 border-b border-slate-200/80 flex flex-col gap-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Sparkles size={14} className="text-blue-600" /> Active Channels
              </span>
              <span className="text-[10px] font-extrabold text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full font-mono">
                {chats.length} Rooms
              </span>
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
            {filteredChats.map((chat) => (
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
            ))}
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

      {/* Modal for Starting New Conversation */}
      <Modal
        isOpen={newChatModalOpen}
        onClose={() => setNewChatModalOpen(false)}
        title="Start New Partner Conversation"
        className="max-w-md"
      >
        <div className="space-y-4 text-xs font-medium text-slate-700">
          <p>Select a verified organization or Secretariat desk to initiate a direct collaboration channel:</p>
          <div className="space-y-2">
            {[
              { name: "Swades Foundation", type: "NGO", project: "Raigad Water & Livelihoods" },
              { name: "Paani Foundation Trust", type: "NGO", project: "Satara Water Conservation" },
              { name: "Tata CSR Desk", type: "COMPANY", project: "Maharashtra Skill Labs" },
              { name: "District Collectorate Gadchiroli", type: "GOVT", project: "Tribal Development" },
            ].map((partner, idx) => (
              <div
                key={idx}
                onClick={() => {
                  const newRoom: ChatRoom = {
                    id: `chat-${Date.now()}`,
                    partnerName: partner.name,
                    partnerType: partner.type as any,
                    lastMessage: "Conversation initiated",
                    updatedAt: "Just now",
                    unread: false,
                    pinned: false,
                    projectTitle: partner.project,
                    onlineStatus: "ONLINE",
                    avatarColor: "from-blue-600 to-indigo-600"
                  };
                  setChats([newRoom, ...chats]);
                  setActiveChat(newRoom);
                  setNewChatModalOpen(false);
                }}
                className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50 hover:bg-blue-50/60 hover:border-blue-300 cursor-pointer transition-all flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-slate-900">{partner.name}</h4>
                  <span className="text-[10px] text-blue-700 font-semibold">{partner.project}</span>
                </div>
                <span className="text-[10px] font-black uppercase text-blue-900 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md">
                  {partner.type}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-3">
            <Button variant="outline" size="sm" onClick={() => setNewChatModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}


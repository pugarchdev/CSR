"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Send, Paperclip, CheckCheck, Landmark, Building2, UserCheck, 
  Search, Pin, Smile, Mic, Play, MoreVertical, Heart, ThumbsUp, AlertCircle
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Message {
  id: string;
  senderName: string;
  senderRole: string;
  text: string;
  time: string;
  isVoice?: boolean;
  voiceDuration?: string;
  reactions?: string[];
  pinned?: boolean;
}

interface ChatRoom {
  id: string;
  partnerName: string;
  partnerType: "NGO" | "COMPANY";
  lastMessage: string;
  updatedAt: string;
  unread: boolean;
  pinned: boolean;
  projectTitle?: string;
}

const mockChats: ChatRoom[] = [
  {
    id: "chat-1",
    partnerName: "Sahyadri Eco Foundation",
    partnerType: "NGO",
    lastMessage: "Please verify the S3 PDF links for Phase 1 check dam reports.",
    updatedAt: "14:22 PM",
    unread: true,
    pinned: true,
    projectTitle: "Gadchiroli Watershed Initiative"
  },
  {
    id: "chat-2",
    partnerName: "Sahyadri Technology Ventures Ltd",
    partnerType: "COMPANY",
    lastMessage: "Board approved the Pune Smart-Classroom budget tranche.",
    updatedAt: "Yesterday",
    unread: false,
    pinned: false,
    projectTitle: "Pune Rural Digital Classrooms"
  }
];

const mockInitialMessages: Record<string, Message[]> = {
  "chat-1": [
    { id: "m-1", senderName: "Sahyadri Eco Foundation", senderRole: "NGO_ADMIN", text: "Hello team, we have completed geological surveying for check dam sites in Aheri.", time: "14:15 PM", reactions: ["👍"] },
    { id: "m-2", senderName: "You", senderRole: "COMPANY_ADMIN", text: "Great! Can you share the certificate reports or soil analysis results?", time: "14:18 PM", pinned: true },
    { id: "m-3", senderName: "Sahyadri Eco Foundation", senderRole: "NGO_ADMIN", text: "Please verify the S3 PDF links for Phase 1 check dam reports.", time: "14:22 PM" }
  ],
  "chat-2": [
    { id: "m-4", senderName: "You", senderRole: "NGO_ADMIN", text: "We have finalized the hardware specs for Loni Kalbhor schools.", time: "10:30 AM" },
    { id: "m-5", senderName: "Sahyadri Technology Ventures Ltd", senderRole: "COMPANY_ADMIN", text: "Board approved the Pune Smart-Classroom budget tranche.", time: "10:35 AM", reactions: ["🎉", "❤️"] },
    { id: "m-6", senderName: "Sahyadri Technology Ventures Ltd", senderRole: "COMPANY_ADMIN", text: "Voice briefing attached.", time: "10:36 AM", isVoice: true, voiceDuration: "0:42" }
  ]
};

export default function ChatSystem() {
  const [activeChat, setActiveChat] = useState<ChatRoom>(mockChats[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "unread" | "pinned">("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(mockInitialMessages[activeChat.id] || []);
  }, [activeChat]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;

    const newMessage: Message = {
      id: `m-new-${Date.now()}`,
      senderName: "You",
      senderRole: "COMPANY_ADMIN",
      text: inputVal,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reactions: []
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputVal("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const partnerReply: Message = {
        id: `m-rep-${Date.now()}`,
        senderName: activeChat.partnerName,
        senderRole: activeChat.partnerType === "NGO" ? "NGO_ADMIN" : "COMPANY_ADMIN",
        text: `Understood, we are checking the logs. Will update soon.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        reactions: []
      };
      setMessages((prev) => [...prev, partnerReply]);
    }, 2000);
  };

  const handleSendVoiceNote = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      const voiceMessage: Message = {
        id: `m-voice-${Date.now()}`,
        senderName: "You",
        senderRole: "COMPANY_ADMIN",
        text: "Voice note briefing",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isVoice: true,
        voiceDuration: "0:15",
        reactions: []
      };
      setMessages((prev) => [...prev, voiceMessage]);
    }, 2500);
  };

  const handleTogglePinMessage = (id: string) => {
    setMessages(messages.map(m => m.id === id ? { ...m, pinned: !m.pinned } : m));
  };

  const handleReact = (messageId: string, emoji: string) => {
    setMessages(messages.map(m => {
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
    }));
  };

  const filteredChats = mockChats.filter(chat => {
    if (filterMode === "pinned") return chat.pinned;
    if (filterMode === "unread") return chat.unread;
    return true;
  });

  const displayMessages = messages.filter(m => 
    !searchQuery || m.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="px-6 md:px-12 py-10 max-w-7xl mx-auto flex flex-col gap-6 h-[80vh] bg-slate-950 text-slate-100 min-h-screen">
      
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading font-extrabold text-3xl text-slate-100 tracking-tight">Collaboration Hub</h1>
          <p className="text-slate-400 text-sm">Real-time messaging and document review workspace</p>
        </div>
      </div>

      <div className="flex-grow flex border border-slate-800 rounded-3xl overflow-hidden bg-slate-900/40 shadow-glass h-full">
        
        {/* Left Panel: Conversation Index */}
        <div className="w-1/3 border-r border-slate-800 flex flex-col h-full bg-slate-950/15">
          
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-800 flex gap-2 overflow-x-auto shrink-0 bg-slate-900/20">
            {[
              { id: "all", label: "All chats" },
              { id: "unread", label: "Unread" },
              { id: "pinned", label: "Pinned" }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterMode(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterMode === f.id ? "bg-slate-800 text-slate-200" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Rooms List */}
          <div className="flex-grow overflow-y-auto flex flex-col bg-slate-950/10">
            {filteredChats.map((chat) => (
              <div 
                key={chat.id}
                onClick={() => {
                  setActiveChat(chat);
                  chat.unread = false;
                }}
                className={`p-4 flex flex-col gap-2.5 border-b border-slate-850 cursor-pointer transition-all hover:bg-slate-800/20 relative ${
                  activeChat.id === chat.id ? "bg-slate-800/10" : ""
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-slate-400">
                      {chat.partnerType === "NGO" ? <Landmark size={14} /> : <Building2 size={14} />}
                    </div>
                    <span className="font-bold text-sm text-slate-200">{chat.partnerName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {chat.pinned && <Pin size={10} className="text-violet-400" />}
                    <span className="text-[10px] text-slate-550 font-semibold">{chat.updatedAt}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-450 truncate pl-10 pr-4">{chat.lastMessage}</p>

                {chat.unread && (
                  <span className="absolute right-4 bottom-4 w-2 h-2 rounded-full bg-violet-650" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Chat Stream */}
        <div className="w-2/3 flex flex-col h-full bg-slate-950/5 justify-between">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/35 shrink-0">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-base text-slate-100">{activeChat.partnerName}</span>
                {activeChat.pinned && <Pin size={12} className="text-violet-450 fill-violet-550/10" />}
              </div>
              {activeChat.projectTitle && (
                <span className="text-xs text-slate-500 font-medium font-sans">Proposal Ref: {activeChat.projectTitle}</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Search Toggle */}
              {searchOpen ? (
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter messages..." 
                  className="bg-slate-950 border border-slate-800 rounded-lg py-1 px-3 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
                />
              ) : null}
              <button 
                onClick={() => {
                  setSearchOpen(!searchOpen);
                  setSearchQuery("");
                }}
                className="text-slate-500 hover:text-slate-200"
              >
                <Search size={16} />
              </button>

              <span className="text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-900/30 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                <UserCheck size={12} /> Live Escrow Session
              </span>
            </div>
          </div>

          {/* Message Stream */}
          <div ref={scrollRef} className="flex-grow overflow-y-auto p-6 flex flex-col gap-5">
            {displayMessages.map((m) => {
              const isMe = m.senderName === "You";
              return (
                <div key={m.id} className={`flex flex-col gap-1.5 max-w-[70%] relative group ${
                  isMe ? "self-end items-end" : "self-start items-start"
                }`}>
                  <div className="flex gap-2 items-center text-[10px] text-slate-550 font-semibold">
                    <span>{m.senderName}</span>
                    {m.pinned && <Pin size={8} className="text-violet-400 fill-violet-500/10" />}
                  </div>

                  {/* Bubble */}
                  <div className={`p-3.5 rounded-2xl text-sm leading-relaxed relative ${
                    isMe 
                      ? "bg-indigo-650 text-slate-100 rounded-tr-none shadow-sm" 
                      : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm"
                  }`}>
                    {m.isVoice ? (
                      <div className="flex items-center gap-3 w-48">
                        <button className="bg-violet-600/20 p-2 rounded-xl text-violet-400">
                          <Play size={14} className="fill-violet-400" />
                        </button>
                        <div className="flex-grow flex flex-col gap-1">
                          {/* Audio Wave Mockup */}
                          <div className="h-4 flex items-center gap-0.5">
                            {[1,4,2,5,3,6,4,2,3,5,4,2,6,3,1].map((h, i) => (
                              <span key={i} className="flex-grow bg-slate-700/50 h-full rounded-full" style={{ height: `${h * 15}%` }} />
                            ))}
                          </div>
                          <span className="text-[9px] text-slate-500">{m.voiceDuration} Voice note</span>
                        </div>
                      </div>
                    ) : (
                      m.text
                    )}

                    {/* Reactions overlay */}
                    {m.reactions && m.reactions.length > 0 && (
                      <div className="absolute bottom-[-10px] right-2 flex gap-1 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800 text-xs">
                        {m.reactions.map((r, i) => (
                          <span key={i}>{r}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className={`hidden group-hover:flex gap-2 text-slate-550 absolute top-0 ${
                    isMe ? "left-[-80px]" : "right-[-80px]"
                  }`}>
                    <button onClick={() => handleReact(m.id, "👍")} className="hover:text-slate-200">👍</button>
                    <button onClick={() => handleReact(m.id, "❤️")} className="hover:text-slate-200">❤️</button>
                    <button onClick={() => handleTogglePinMessage(m.id)} className="hover:text-slate-200">
                      <Pin size={12} className={m.pinned ? "text-violet-400" : ""} />
                    </button>
                  </div>

                  <span className="text-[9px] text-slate-600 font-semibold flex items-center gap-1">
                    {m.time} {isMe && <CheckCheck size={10} className="text-violet-400" />}
                  </span>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex flex-col gap-1 max-w-[70%] self-start items-start">
                <span className="text-[10px] text-slate-500 font-semibold">{activeChat.partnerName}</span>
                <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl flex gap-1 items-center shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-450 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-455 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-455 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Input Panel */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/20 shrink-0">
            {isRecording ? (
              <div className="flex justify-between items-center bg-rose-950/20 border border-rose-900/30 px-4 py-3 rounded-xl text-rose-350 text-xs font-semibold animate-pulse">
                <span>Recording voice note...</span>
                <button onClick={() => setIsRecording(false)} className="text-slate-400 hover:text-slate-200 font-bold">Cancel</button>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <button type="button" className="text-slate-500 hover:text-slate-200 transition-colors">
                  <Paperclip size={18} />
                </button>
                <input 
                  type="text" 
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder={`Message ${activeChat.partnerName}...`}
                  className="flex-grow bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-100 focus:outline-none focus:border-violet-500 transition-all placeholder-slate-600"
                />
                
                {/* Emoji toggle */}
                <button type="button" onClick={() => setInputVal(prev => prev + " 👍")} className="text-slate-500 hover:text-slate-200">
                  <Smile size={18} />
                </button>
                
                {/* Voice Note Trigger */}
                <button type="button" onClick={handleSendVoiceNote} className="text-slate-500 hover:text-slate-200">
                  <Mic size={18} />
                </button>
                
                <Button type="submit" className="px-4 py-2.5">
                  <Send size={16} />
                </Button>
              </form>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}

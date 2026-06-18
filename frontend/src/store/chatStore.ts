import { create } from "zustand";

interface Message {
  id: string;
  senderName: string;
  senderRole: string;
  text: string;
  time: string;
  fileUrl?: string;
  fileType?: string;
}

interface ChatRoom {
  id: string;
  partnerName: string;
  partnerType: "NGO" | "COMPANY";
  lastMessage: string;
  updatedAt: string;
  unread: boolean;
  projectTitle?: string;
}

interface ChatState {
  rooms: ChatRoom[];
  activeRoomId: string | null;
  messages: Message[];
  typingUsers: string[]; // List of user emails currently typing
  setRooms: (rooms: ChatRoom[]) => void;
  setActiveRoomId: (roomId: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setTyping: (email: string, isTyping: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  rooms: [],
  activeRoomId: null,
  messages: [],
  typingUsers: [],
  setRooms: (rooms) => set({ rooms }),
  setActiveRoomId: (activeRoomId) => set({ activeRoomId, messages: [] }), // reset logs on room switch
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setTyping: (email, isTyping) => set((state) => ({
    typingUsers: isTyping 
      ? [...state.typingUsers.filter(u => u !== email), email]
      : state.typingUsers.filter(u => u !== email)
  })),
}));

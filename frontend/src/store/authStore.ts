import { create } from "zustand";

interface UserProfile {
  id: string;
  email: string;
  role: string;
  ngoId?: string | null;
  companyId?: string | null;
  ngo?: any;
  company?: any;
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (user: UserProfile) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));

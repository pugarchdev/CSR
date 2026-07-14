import { create } from "zustand";

export interface AppNotification {
  id: string;
  userId?: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  setNotifications: (items: AppNotification[]) => void;
  /** Add a notification pushed live over the socket (deduped by id). */
  addNotification: (item: AppNotification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const countUnread = (items: AppNotification[]) => items.filter((n) => !n.isRead).length;

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (items) =>
    set({ notifications: items, unreadCount: countUnread(items) }),
  addNotification: (item) =>
    set((state) => {
      if (state.notifications.some((n) => n.id === item.id)) return state;
      const next = [item, ...state.notifications];
      return { notifications: next, unreadCount: countUnread(next) };
    }),
  markRead: (id) =>
    set((state) => {
      const next = state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      return { notifications: next, unreadCount: countUnread(next) };
    }),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),
}));

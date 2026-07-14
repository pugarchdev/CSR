"use client";

import { useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { API_BASE_URL, apiFetch } from "./api";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore, AppNotification } from "@/store/notificationStore";

// Socket server origin = API base without the trailing /api path.
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");

let socket: Socket | null = null;

/**
 * Subscribe to real-time notifications for the logged-in user.
 *
 * - Loads notification history over REST on mount.
 * - Opens (or reuses) an authenticated socket connection and pushes any
 *   `notification:new` events into the notification store.
 *
 * Mount this once in an authenticated layout.
 */
export function useNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    if (!isAuthenticated || typeof window === "undefined") return;

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    let cancelled = false;

    // 1. Load history.
    apiFetch<AppNotification[]>("/notifications")
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setNotifications(data);
      })
      .catch(() => {
        /* non-fatal: socket will still deliver new ones */
      });

    // 2. Live socket.
    if (!socket) {
      socket = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket"],
        reconnection: true,
      });
    }

    const handler = (payload: AppNotification) => addNotification(payload);
    socket.on("notification:new", handler);

    return () => {
      cancelled = true;
      socket?.off("notification:new", handler);
    };
  }, [isAuthenticated, setNotifications, addNotification]);
}

/** Tear down the shared socket (call on logout). */
export function disconnectNotificationSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

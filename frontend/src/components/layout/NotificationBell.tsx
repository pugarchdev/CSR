"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Bell, Check, Trash2, ShieldAlert } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Fetch initial notifications
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Setup socket connection
    const token = localStorage.getItem("accessToken");
    const userStr = localStorage.getItem("user");
    if (!token || !userStr) return;

    const user = JSON.parse(userStr);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    // Establish live notification feed connection
    const socket = io(`${apiBase}/notification`, {
      query: { userId: user.id },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Notification Socket] Connected to Live Feed");
    });

    socket.on("notification", (newNotification: NotificationItem) => {
      console.log("[Notification Socket] Received Live Alert:", newNotification);
      setNotifications((prev) => [newNotification, ...prev]);

      // Trigger standard browser alert sound or desktop notice if allowed
      if (Notification.permission === "granted") {
        new Notification(newNotification.title, {
          body: newNotification.message,
        });
      }
    });

    // Request browser notification permissions
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    // Handle clicks outside dropdown to close it
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      socket.disconnect();
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem("accessToken");
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiBase}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiBase}/api/notifications/read-all`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                Notifications
                {unreadCount > 0 && (
                  <span className="bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded-full font-medium">
                    {unreadCount} new
                  </span>
                )}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 focus:outline-none"
                >
                  <Check size={14} /> Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  <Bell className="mx-auto mb-2 text-gray-300" size={32} />
                  No notifications yet.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 transition-colors flex gap-3 ${
                      n.isRead ? "bg-white" : "bg-orange-50/40 hover:bg-orange-50/70"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${n.isRead ? "text-gray-800" : "text-gray-900 font-semibold"}`}>
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <button
                            onClick={() => markAsRead(n.id)}
                            className="text-xs text-primary-500 hover:text-primary-600 focus:outline-none"
                            title="Mark as read"
                          >
                            <Check size={14} />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{n.message}</p>
                      <span className="text-[10px] text-gray-400 mt-2 block">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-center">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium inline-block"
              >
                View all notifications
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

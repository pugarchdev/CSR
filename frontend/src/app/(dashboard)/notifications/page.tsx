"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Trash2, Search, AlertCircle, CheckCircle2, RefreshCw, ShieldAlert, ArrowRight } from "lucide-react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { apiFetch, invalidateCache } from "@/lib/api";
import { useToastActions } from "@/components/ui/Toast";
import "@/styles/gov-theme.css";

import { useAuthStore } from "@/store/authStore";
import { resolveNotificationUrl } from "@/lib/notificationUtils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type?: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const toast = useToastActions();
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const fetchNotifications = async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
      invalidateCache("/notifications");
    } else {
      setLoading(true);
    }
    setError("");
    const startTime = Date.now();
    try {
      const data = await apiFetch<any>("/notifications", { skipCache: isManual });
      const list = Array.isArray(data) ? data : data?.notifications || data?.data || [];
      setNotifications(list);
    } catch (err: any) {
      setError(err.message || "Unable to fetch notifications");
    } finally {
      if (isManual) {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 650 - elapsed);
        setTimeout(() => {
          setIsRefreshing(false);
          setLoading(false);
        }, remaining);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markRead = async (id: string) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await apiFetch("/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("Notifications Updated", "All notifications marked as read.");
    } catch (err: any) {
      toast.error("Action Failed", err.message || "Unable to mark all as read");
    }
  };

  const deleteSingle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiFetch(`/notifications/${id}`, { method: "DELETE" });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notification Removed", "Notification deleted from history.");
    } catch (err: any) {
      toast.error("Delete Failed", err.message);
    }
  };

  const clearAll = async () => {
    if (!confirm("Are you sure you want to clear your entire notification history?")) return;
    try {
      await apiFetch("/notifications/clear-all", { method: "DELETE" });
      setNotifications([]);
      toast.success("History Cleared", "All notification history removed.");
    } catch (err: any) {
      toast.error("Clear Failed", err.message);
    }
  };

  const handleCardClick = (n: NotificationItem) => {
    if (!n.isRead) markRead(n.id);
    const targetUrl = resolveNotificationUrl(n, isAdmin, user?.role);
    if (targetUrl) {
      router.push(targetUrl);
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const matchesSearch =
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.message.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;
      if (filter === "unread") return !n.isRead;
      if (filter === "read") return n.isRead;
      return true;
    });
  }, [notifications, search, filter]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <GovPortalLayout>
      <div className="gov-container max-w-5xl py-8 space-y-6">
        {/* Header Banner */}
        <div className="rounded-2xl bg-white border border-slate-200/90 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 font-bold text-xl shadow-2xs">
              <Bell size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900">Notification History Center</h1>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-orange-100 text-orange-800 border border-orange-200">
                    {unreadCount} UNREAD
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Review complete operational alerts, clarification requests, and status change history assigned to your user account.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all border border-slate-200 cursor-pointer"
              >
                <Check size={14} /> Mark All Read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all border border-rose-200 cursor-pointer"
              >
                <Trash2 size={14} /> Clear History
              </button>
            )}
            <button
              onClick={() => fetchNotifications(true)}
              disabled={isRefreshing || loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all border border-slate-200 cursor-pointer group disabled:opacity-60 shadow-2xs"
            >
              <RefreshCw
                size={13}
                className={`transition-transform duration-300 ${
                  isRefreshing || loading
                    ? "animate-spin text-blue-600"
                    : "text-slate-500 group-hover:rotate-45"
                }`}
              />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications..."
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 outline-none focus:border-blue-700 font-medium"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl w-full sm:w-auto justify-center">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === "unread" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter("read")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === "read" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Read ({notifications.length - unreadCount})
            </button>
          </div>
        </div>

        {/* Notification List Container */}
        {loading ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/90 space-y-2">
            <RefreshCw className="animate-spin h-7 w-7 text-blue-800 mx-auto" />
            <p className="text-xs font-bold text-slate-600">Loading notification history...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl border border-rose-200 bg-rose-50 text-rose-900 text-xs font-bold text-center space-y-2">
            <AlertCircle className="mx-auto text-rose-600" size={24} />
            <p>{error}</p>
            <button onClick={() => fetchNotifications(true)} className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-bold cursor-pointer">
              Retry
            </button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/90 space-y-3">
            <Bell className="mx-auto text-slate-300" size={36} />
            <h3 className="text-sm font-bold text-slate-700">No notifications found</h3>
            <p className="text-xs text-slate-400 font-medium">
              {search ? "No alerts match your search filter." : "Your notification history is empty."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((n) => {
              const isClarification = n.title.toLowerCase().includes("clarification");
              const isApproval = n.title.toLowerCase().includes("approved");
              const isRejection = n.title.toLowerCase().includes("rejected");

              return (
                <div
                  key={n.id}
                  onClick={() => handleCardClick(n)}
                  className={`group rounded-2xl border p-5 transition-all cursor-pointer flex flex-col sm:flex-row items-start justify-between gap-4 ${
                    !n.isRead
                      ? "bg-amber-50/40 border-amber-200/90 shadow-2xs hover:border-amber-300"
                      : "bg-white border-slate-200/80 hover:border-blue-200"
                  }`}
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    {/* Icon Badge */}
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${
                        isApproval
                          ? "bg-emerald-100 text-emerald-700"
                          : isRejection
                          ? "bg-rose-100 text-rose-700"
                          : isClarification
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {isApproval ? (
                        <CheckCircle2 size={18} />
                      ) : isRejection ? (
                        <ShieldAlert size={18} />
                      ) : isClarification ? (
                        <AlertCircle size={18} />
                      ) : (
                        <Bell size={18} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-sm ${!n.isRead ? "font-extrabold text-slate-900" : "font-bold text-slate-800"}`}>
                          {n.title}
                        </h3>
                        {!n.isRead && (
                          <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                        )}
                        <span className="text-[10px] text-slate-400 font-bold ml-auto sm:ml-0">
                          {new Date(n.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} at {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed break-words whitespace-pre-wrap mt-1">
                        {n.message}
                      </p>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCardClick(n);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200/80 transition-all"
                    >
                      View Details <ArrowRight size={13} />
                    </button>
                    <button
                      onClick={(e) => deleteSingle(n.id, e)}
                      title="Delete notification"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </GovPortalLayout>
  );
}

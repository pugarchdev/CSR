// Header Component
"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Search,
  Menu,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Mail
} from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

interface HeaderProps {
  userRole?: string;
  userName?: string;
  userEmail?: string;
  notificationCount?: number;
  messageCount?: number;
  onMenuToggle?: () => void;
  className?: string;
}

export function Header({
  userRole = "User",
  userName = "User",
  userEmail = "user@example.com",
  notificationCount = 0,
  messageCount = 0,
  onMenuToggle,
  className
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      // Applied the exact inline styles from your DevTools screenshot
      style={{
        paddingTop: '41px',
        paddingBottom: '36px'
      }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/60 shadow-xs",
        className
      )}
    >
      {/* The thin gradient bar at the very top of the screen */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

      <div className="px-4 flex items-center justify-between w-full">

        {/* Left: Menu & Logo */}
        <div className="flex items-center gap-3 shrink-0">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-1 text-slate-500 hover:text-slate-800 transition-colors shrink-0"
              aria-label="Toggle menu"
            >
              <Menu size={22} strokeWidth={1.5} />
            </button>
          )}

          <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
            {/* Exact Hexagon Logo Replica */}
            <div className="w-9 h-9 shrink-0 relative flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full text-blue-600 absolute inset-0">
                <polygon
                  points="50,5 90,25 90,75 50,95 10,75 10,25"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex flex-col gap-1 w-4">
                <div className="h-0.5 w-full bg-orange-400 rounded-full" />
                <div className="h-0.5 w-full bg-orange-500 rounded-full" />
                <div className="h-0.5 w-3/4 bg-orange-400 rounded-full mx-auto" />
                <div className="h-0.5 w-1/2 bg-blue-600 rounded-full mx-auto mt-0.5" />
              </div>
            </div>

            {/* Text structured to naturally wrap exactly like the image */}
            <div className="flex flex-col justify-center shrink-0">
              <div className="text-[15px] font-extrabold text-slate-900 leading-[1.1]">
                Maha<span className="text-blue-600">CSR</span>
              </div>
              <div className="text-[15px] font-extrabold text-slate-900 leading-[1.1]">
                Setu
              </div>
              <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider leading-[1.1] mt-0.5 w-[70px]">
                Smart CSR Platform
              </div>
            </div>
          </Link>
        </div>

        {/* Center: Search (Hidden on Mobile) */}
        <div className="hidden md:flex flex-1 max-w-md mx-4 lg:mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search proposals, NGOs, or metrics..."
              className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Right: Actions & User */}
        <div className="flex items-center gap-4 shrink-0">

          {/* Messages Icon */}
          <button className="relative text-slate-500 hover:text-slate-700 transition-colors shrink-0">
            <Mail size={22} strokeWidth={1.5} />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white" />
          </button>

          {/* Notifications Icon */}
          <button className="relative text-slate-500 hover:text-slate-700 transition-colors shrink-0">
            <Bell size={22} strokeWidth={1.5} />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          </button>

          {/* User Avatar */}
          <div className="relative group shrink-0">
            <button className="w-9 h-9 bg-blue-600 hover:bg-blue-700 transition-colors rounded-[10px] flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
              U
            </button>

            {/* Desktop Dropdown */}
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
              <div className="p-3 border-b border-slate-100">
                <p className="font-medium text-slate-900">{userName}</p>
                <p className="text-sm text-slate-500">{userEmail}</p>
              </div>
              <div className="p-2">
                <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full">
                  <LogOut size={16} /> Log Out
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </motion.header>
  );
}

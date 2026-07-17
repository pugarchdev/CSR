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

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
    }
    router.push("/login");
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50",
        className
      )}
    >
      <div className="h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Left: Logo & Menu */}
        <div className="flex items-center gap-4">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              <Menu size={20} />
            </button>
          )}
          
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-bold text-gray-900">MahaCSR</span>
              <span className="text-xs text-gray-500 block -mt-0.5">Setu Portal</span>
            </div>
          </Link>
        </div>

        {/* Center: Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search proposals, NGOs, or metrics..."
              className="w-full h-10 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
              <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 border border-gray-200 rounded">
                <span>Ctrl</span>
                <span>K</span>
              </kbd>
            </div>
          </div>
        </div>

        {/* Right: Actions & User */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Messages */}
          <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Mail size={20} />
            {messageCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                {messageCount > 9 ? "9+" : messageCount}
              </span>
            )}
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* User Menu */}
          <div className="relative group">
            <button className="flex items-center gap-3 p-1.5 pl-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500">{userRole}</p>
              </div>
              <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center text-primary-700 font-semibold">
                {userName.charAt(0).toUpperCase()}
              </div>
              <ChevronDown size={16} className="text-gray-400 hidden sm:block" />
            </button>

            {/* Dropdown */}
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
              <div className="p-3 border-b border-gray-100">
                <p className="font-medium text-gray-900">{userName}</p>
                <p className="text-sm text-gray-500">{userEmail}</p>
              </div>
              <div className="p-2">
                <Link 
                  href="/profile" 
                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <User size={16} />
                  Profile
                </Link>
                <Link 
                  href="/settings" 
                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Settings size={16} />
                  Settings
                </Link>
              </div>
              <div className="p-2 border-t border-gray-100">
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 rounded-lg transition-colors w-full"
                >
                  <LogOut size={16} />
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

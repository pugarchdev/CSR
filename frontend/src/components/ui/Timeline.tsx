// Timeline Component
"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelineItemData {
  id: string;
  date: string;
  title: string;
  description: string;
  status: "completed" | "active" | "pending";
  icon: LucideIcon;
}

interface TimelineProps {
  items: TimelineItemData[];
  className?: string;
}

export function Timeline({ items, className }: TimelineProps) {
  return (
    <div className={cn("space-y-0", className)}>
      {items.map((item, index) => (
        <TimelineItem 
          key={item.id} 
          item={item} 
          isLast={index === items.length - 1}
        />
      ))}
    </div>
  );
}

interface TimelineItemProps {
  item: TimelineItemData;
  isLast: boolean;
}

export function TimelineItem({ item, isLast }: TimelineItemProps) {
  const Icon = item.icon;
  
  return (
    <div className="flex gap-4 group">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
            item.status === "completed" && "bg-success-100 text-success-600",
            item.status === "active" && "bg-primary-100 text-primary-600 ring-4 ring-primary-50",
            item.status === "pending" && "bg-gray-100 text-gray-400"
          )}
        >
          <Icon size={20} />
        </div>
        {!isLast && (
          <div
            className={cn(
              "w-0.5 flex-1 mt-2 transition-all duration-300",
              item.status === "completed" ? "bg-success-200" : "bg-gray-200 group-hover:bg-gray-300"
            )}
          />
        )}
      </div>
      <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
          {new Date(item.date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <h4
          className={cn(
            "font-semibold mt-1",
            item.status === "pending" ? "text-gray-400" : "text-gray-900"
          )}
        >
          {item.title}
        </h4>
        <p
          className={cn(
            "text-sm mt-1",
            item.status === "pending" ? "text-gray-300" : "text-gray-500"
          )}
        >
          {item.description}
        </p>
      </div>
    </div>
  );
}

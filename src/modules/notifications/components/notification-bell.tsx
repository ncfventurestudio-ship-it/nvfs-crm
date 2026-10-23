"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  ShieldAlert,
  Calendar,
  CheckSquare,
  Sparkles,
  TrendingUp,
  Award,
  IndianRupee,
  UserCheck,
  Building,
  FileText,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      const data = await res.json();
      if (data.success) {
        setUnreadCount(data.data.unreadCount);
      }
    } catch {}
  };

  const fetchRecentNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications?limit=6");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchUnreadCount();
    }, 60000); // 60s poll
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchRecentNotifications();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "TASK_ASSIGNED":
      case "TASK_DUE":
      case "TASK_OVERDUE":
      case "TASK_COMPLETED":
        return <CheckSquare className="h-3.5 w-3.5 text-amber-400" />;
      case "LEAD_ASSIGNED":
      case "LEAD_CONVERTED":
        return <UserCheck className="h-3.5 w-3.5 text-indigo-400" />;
      case "CLIENT_ASSIGNED":
      case "CLIENT_UPDATED":
        return <Building className="h-3.5 w-3.5 text-blue-400" />;
      case "OPPORTUNITY_WON":
        return <Award className="h-3.5 w-3.5 text-teal-400" />;
      case "OPPORTUNITY_ASSIGNED":
      case "OPPORTUNITY_STAGE_CHANGED":
      case "OPPORTUNITY_LOST":
        return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
      case "PAYMENT_RECEIVED":
        return <IndianRupee className="h-3.5 w-3.5 text-emerald-400" />;
      case "PROPOSAL_CREATED":
      case "PROPOSAL_APPROVED":
      case "PROPOSAL_REJECTED":
      case "PROPOSAL_SENT":
      case "PROPOSAL_ACCEPTED":
      case "PROPOSAL_EXPIRED":
        return <FileText className="h-3.5 w-3.5 text-rose-400" />;
      case "DOCUMENT_UPLOADED":
        return <FileText className="h-3.5 w-3.5 text-cyan-400" />;
      case "LEAVE_REQUEST":
      case "LEAVE_APPROVED":
      case "LEAVE_REJECTED":
        return <Calendar className="h-3.5 w-3.5 text-purple-400" />;
      case "MEETING_CREATED":
      case "MEETING_CANCELLED":
      case "MEETING_UPCOMING":
      case "MEETING_REMINDER":
        return <Clock className="h-3.5 w-3.5 text-blue-400" />;
      case "PASSWORD_RESET_REQUEST":
        return <KeyRound className="h-3.5 w-3.5 text-amber-400" />;
      case "PASSWORD_RESET_COMPLETED":
        return <KeyRound className="h-3.5 w-3.5 text-emerald-400" />;
      default:
        return <Sparkles className="h-3.5 w-3.5 text-blue-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        title="Activity Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-[#090d16]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg border border-slate-800 bg-[#0f172a] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 bg-slate-900/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-400 transition-colors"
              >
                <CheckCheck className="h-3 w-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-500">Loading alerts...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">No recent notifications</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "group flex items-start gap-3 p-3 transition-colors text-left",
                    n.isRead ? "bg-transparent opacity-75 hover:bg-slate-800/40" : "bg-blue-950/20 hover:bg-blue-950/30"
                  )}
                >
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-800 border border-slate-700">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={cn("text-xs font-medium truncate", n.isRead ? "text-slate-300" : "text-white")}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <button
                          onClick={(e) => handleMarkAsRead(n.id, e)}
                          title="Mark as read"
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-blue-400 transition-opacity"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                      <span>{new Date(n.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                      {n.actionUrl && (
                        <Link
                          href={n.actionUrl}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-0.5 text-blue-400 hover:underline"
                        >
                          View <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-slate-800 bg-slate-900/60 text-center">
            <Link
              href="/app/notifications"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              Open Full Notification Center →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

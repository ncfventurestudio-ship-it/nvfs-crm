"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  CheckSquare,
  Calendar,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Inbox,
  TrendingUp,
  Award,
  IndianRupee,
  UserCheck,
  Building,
  FileText,
  KeyRound,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  isRead: boolean;
  readAt?: string | null;
  actionUrl?: string | null;
  metadata?: string | null;
  createdAt: string;
}

export default function NotificationsCenterPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (unreadOnly) params.set("unreadOnly", "true");
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      params.set("limit", "50");

      const res = await fetch(`/api/notifications?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [unreadOnly, typeFilter]);

  const handleMarkAsRead = async (id: string) => {
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

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {}
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "TASK_ASSIGNED":
      case "TASK_DUE":
      case "TASK_OVERDUE":
      case "TASK_COMPLETED":
        return <CheckSquare className="h-4 w-4 text-amber-400" />;
      case "LEAD_ASSIGNED":
      case "LEAD_CONVERTED":
        return <UserCheck className="h-4 w-4 text-indigo-400" />;
      case "CLIENT_ASSIGNED":
      case "CLIENT_UPDATED":
        return <Building className="h-4 w-4 text-blue-400" />;
      case "OPPORTUNITY_WON":
        return <Award className="h-4 w-4 text-teal-400" />;
      case "OPPORTUNITY_ASSIGNED":
      case "OPPORTUNITY_STAGE_CHANGED":
      case "OPPORTUNITY_LOST":
        return <TrendingUp className="h-4 w-4 text-emerald-400" />;
      case "PAYMENT_RECEIVED":
        return <IndianRupee className="h-4 w-4 text-emerald-400" />;
      case "PROPOSAL_CREATED":
      case "PROPOSAL_APPROVED":
      case "PROPOSAL_REJECTED":
      case "PROPOSAL_SENT":
      case "PROPOSAL_ACCEPTED":
      case "PROPOSAL_EXPIRED":
        return <FileText className="h-4 w-4 text-rose-400" />;
      case "DOCUMENT_UPLOADED":
        return <FileText className="h-4 w-4 text-cyan-400" />;
      case "LEAVE_REQUEST":
      case "LEAVE_APPROVED":
      case "LEAVE_REJECTED":
        return <Calendar className="h-4 w-4 text-purple-400" />;
      case "MEETING_CREATED":
      case "MEETING_CANCELLED":
      case "MEETING_UPCOMING":
      case "MEETING_REMINDER":
        return <Clock className="h-4 w-4 text-blue-400" />;
      case "COMPLIANCE_DEADLINE":
        return <ShieldAlert className="h-4 w-4 text-rose-400" />;
      case "PASSWORD_RESET_REQUEST":
        return <KeyRound className="h-4 w-4 text-amber-400" />;
      case "PASSWORD_RESET_COMPLETED":
        return <KeyRound className="h-4 w-4 text-emerald-400" />;
      default:
        return <Sparkles className="h-4 w-4 text-blue-400" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <span className="rounded bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-400">URGENT</span>;
      case "HIGH":
        return <span className="rounded bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-400">HIGH</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Enterprise Notifications Center"
          description="In-app alerts, delegated tasks, workflow approvals, meeting invitations, and corporate milestones."
        />
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <CheckCheck className="h-4 w-4 text-blue-400" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#0f172a] p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Unread Alerts</p>
            <h3 className="text-2xl font-bold text-white mt-1">{unreadCount}</h3>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
            <Bell className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0f172a] p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Received</p>
            <h3 className="text-2xl font-bold text-white mt-1">{notifications.length}</h3>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
            <Inbox className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0f172a] p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Event Bus Transport</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-semibold text-emerald-400">Active (In-App)</span>
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-400">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#0f172a]/90 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: "ALL", label: "All Alerts" },
            { key: "OPPORTUNITY_WON,OPPORTUNITY_ASSIGNED,OPPORTUNITY_STAGE_CHANGED,OPPORTUNITY_LOST", label: "Deals & Pipeline" },
            { key: "LEAD_ASSIGNED,LEAD_CONVERTED,CLIENT_ASSIGNED,CLIENT_UPDATED", label: "Leads & Clients" },
            { key: "PROPOSAL_CREATED,PROPOSAL_APPROVED,PROPOSAL_REJECTED,PROPOSAL_SENT,PROPOSAL_ACCEPTED,PROPOSAL_EXPIRED,PAYMENT_RECEIVED,DOCUMENT_UPLOADED", label: "Proposals & Finance" },
            { key: "TASK_ASSIGNED,TASK_DUE,TASK_OVERDUE,TASK_COMPLETED", label: "Tasks" },
            { key: "MEETING_CREATED,MEETING_CANCELLED,MEETING_UPCOMING,MEETING_REMINDER", label: "Meetings" },
            { key: "SYSTEM,LEAVE_REQUEST,LEAVE_APPROVED,LEAVE_REJECTED,COMPLIANCE_DEADLINE", label: "HR & System" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTypeFilter(tab.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                typeFilter === tab.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
            />
            <span>Unread only</span>
          </label>
        </div>
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-500">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-[#0f172a] p-12 text-center">
          <Inbox className="mx-auto h-8 w-8 text-slate-600 mb-3" />
          <p className="text-sm font-medium text-slate-300">No notifications found</p>
          <p className="text-xs text-slate-500 mt-1">You are all caught up on activities and workflow approvals.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                "group flex items-start justify-between gap-4 rounded-xl border p-4 transition-all",
                n.isRead
                  ? "border-slate-800/80 bg-[#0c1322]/80 opacity-80 hover:opacity-100 hover:border-slate-700"
                  : "border-blue-500/30 bg-[#0f1a30] shadow-sm hover:border-blue-500/50"
              )}
            >
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-800/90 shadow-sm">
                  {getNotificationIcon(n.type)}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={cn("text-xs font-bold", n.isRead ? "text-slate-300" : "text-white")}>
                      {n.title}
                    </h4>
                    {getPriorityBadge(n.priority)}
                    {!n.isRead && (
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{n.message}</p>

                  <div className="flex items-center gap-4 mt-2.5 text-[10px] text-slate-500">
                    <span>{new Date(n.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    {n.actionUrl && (
                      <Link
                        href={n.actionUrl}
                        className="inline-flex items-center gap-1 font-semibold text-blue-400 hover:underline"
                      >
                        Action Link <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!n.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(n.id)}
                    title="Mark as read"
                    className="flex h-7 w-7 items-center justify-center rounded border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(n.id)}
                  title="Dismiss notification"
                  className="flex h-7 w-7 items-center justify-center rounded border border-slate-700 bg-slate-800 text-slate-400 hover:bg-rose-900/50 hover:text-rose-300 hover:border-rose-700 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

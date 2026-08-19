"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  PackageCheck,
  AlertCircle,
  CheckCheck,
  Clock,
  ChevronRight,
} from "lucide-react";
import { NotificationItem } from "@/app/api/notifications/route";

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load read status from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("read_notifications_v1");
      if (stored) {
        setReadIds(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error("Fetch notifications error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for real-time updates
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    const updated = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(updated);
    try {
      localStorage.setItem("read_notifications_v1", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const markItemAsRead = (id: string) => {
    if (!readIds.includes(id)) {
      const updated = [...readIds, id];
      setReadIds(updated);
      try {
        localStorage.setItem("read_notifications_v1", JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
    setIsOpen(false);
  };

  const getNotificationIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "request_approved":
        return (
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case "item_rejected":
        return (
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      case "request_rejected":
        return (
          <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
            <XCircle className="w-4 h-4" />
          </div>
        );
      case "new_request":
        return (
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        );
      case "low_stock":
        return (
          <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
        );
      case "stock_received":
        return (
          <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-200 shrink-0">
            <PackageCheck className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 shrink-0">
            <Bell className="w-4 h-4" />
          </div>
        );
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const diffMinutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
      if (diffMinutes < 1) return "Vừa xong";
      if (diffMinutes < 60) return `${diffMinutes} phút trước`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      return date.toLocaleDateString("vi-VN");
    } catch {
      return "";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        title="Thông báo hệ thống"
        className="relative flex items-center justify-center w-9 h-9 text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-200 hover:border-emerald-300 transition-all duration-200 focus:outline-none cursor-pointer"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white font-black text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Glassmorphic Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 glass-dropdown rounded-3xl border border-slate-200 shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 bg-white/98">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-emerald-50/20 to-white">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-slate-900 text-xs">
                Thông Báo
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Đã đọc tất cả</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                Đang tải thông báo...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Chưa có thông báo nào
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const isRead = readIds.includes(n.id);
                return (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => markItemAsRead(n.id)}
                    className={`flex items-start gap-3 p-3.5 transition-colors cursor-pointer group ${
                      isRead
                        ? "hover:bg-slate-50 opacity-75"
                        : "bg-emerald-50/20 hover:bg-emerald-50/40"
                    }`}
                  >
                    {getNotificationIcon(n.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-xs truncate ${isRead ? "font-semibold text-slate-700" : "font-bold text-slate-900"}`}>
                          {n.title}
                        </span>
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed font-normal">
                        {n.message}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 font-medium">
                        <Clock className="w-3 h-3" />
                        <span>{formatRelativeTime(n.timestamp)}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0 mt-2 transition-colors" />
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-slate-100 bg-slate-50 text-center">
            <Link
              href="/requests"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-bold text-slate-600 hover:text-emerald-700 transition-colors"
            >
              Xem tất cả danh sách yêu cầu →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

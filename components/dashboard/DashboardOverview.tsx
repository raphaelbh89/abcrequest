"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Boxes,
  AlertTriangle,
  FileText,
  ShoppingCart,
  ArrowRight,
  RefreshCw,
  Clock,
  PackageMinus,
  Sparkles,
  PlusCircle,
  TrendingDown,
  Layers,
  CheckCircle2,
  FileSpreadsheet
} from "lucide-react";
import { StatCard } from "./StatCard";

interface DashboardStats {
  totalItems: number;
  lowStockCount: number;
  pendingRequestsCount: number;
  unprocessedProposalsCount: number;
}

interface LowStockItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minStock: number;
  location?: string | null;
}

interface PendingRequest {
  id: string;
  purpose: string;
  neededDate: string;
  createdAt: string;
  requesterName: string;
  itemCount: number;
}

interface UserInfo {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

interface DashboardOverviewProps {
  user: UserInfo;
}

export function DashboardOverview({ user }: DashboardOverviewProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    lowStockCount: 0,
    pendingRequestsCount: 0,
    unprocessedProposalsCount: 0,
  });
  const [recentLowStock, setRecentLowStock] = useState<LowStockItem[]>([]);
  const [recentPendingRequests, setRecentPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/stats");
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats);
        setRecentLowStock(data.recentLowStockItems || []);
        setRecentPendingRequests(data.recentPendingRequests || []);
      }
    } catch (err) {
      console.error("Fetch dashboard stats error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const isAdmin = ["admin", "manager", "stocker"].includes(user.role);
  const canCreateRequest = ["admin", "manager", "teacher"].includes(user.role);

  return (
    <div className="space-y-8">
      {/* Top Welcome Banner */}
      <div className="relative glass-panel rounded-3xl p-6 sm:p-8 overflow-hidden border border-slate-200/80 shadow-md bg-white/90">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 status-pulse" />
              <span>Hệ thống trực tuyến • Dữ liệu thời gian thực</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Xin chào, <span className="text-emerald-700">{user.fullName}</span> 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              Hệ thống quản lý kho đồ dùng mầm non đã sẵn sàng. Bạn có thể theo dõi tồn kho, phân bổ yêu cầu tự động hoặc duyệt đơn đề xuất mua sắm.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
            <button
              onClick={fetchDashboardData}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
              title="Làm mới số liệu"
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${loading ? "animate-spin text-emerald-600" : ""}`} />
              <span className="whitespace-nowrap">Làm mới</span>
            </button>

            {canCreateRequest && (
              <Link
                href="/requests/new"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Tạo yêu cầu mới</span>
              </Link>
            )}

            {user.role === "stocker" && (
              <Link
                href="/purchase-proposals"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white text-xs font-semibold shadow-md shadow-amber-600/20 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <ShoppingCart className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Xử lý đề xuất mua</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 4 Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Tổng Mặt Hàng"
          value={loading ? "..." : stats.totalItems}
          description="Đồ dùng đang quản lý trong kho"
          icon={Boxes}
          href="/inventory"
          colorTheme="blue"
        />

        <StatCard
          title="Hàng Sắp Hết"
          value={loading ? "..." : stats.lowStockCount}
          description="Dưới ngưỡng tối thiểu quy định"
          icon={AlertTriangle}
          href="/inventory"
          colorTheme="red"
        />

        <StatCard
          title="Yêu Cầu Chờ Duyệt"
          value={loading ? "..." : stats.pendingRequestsCount}
          description="Phiếu yêu cầu mới từ giáo viên"
          icon={FileText}
          href="/requests"
          colorTheme="amber"
        />

        <StatCard
          title="Đề Xuất Mua Mới"
          value={loading ? "..." : stats.unprocessedProposalsCount}
          description="Dòng đề xuất cần mua bổ sung"
          icon={ShoppingCart}
          href={isAdmin ? "/purchase-proposals" : "/requests"}
          colorTheme="emerald"
        />
      </div>

      {/* 2 Short Lists (Top 5 Bento Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Top 5 Low Stock Items */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 space-y-4 shadow-sm bg-white/90">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Mặt hàng sắp hết (Cảnh báo)
                </h3>
                <p className="text-xs text-slate-500">Top 5 mặt hàng có tồn kho dưới ngưỡng an toàn</p>
              </div>
            </div>
            <Link
              href="/inventory"
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
            >
              Tất cả <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">Đang tải dữ liệu kho...</div>
          ) : recentLowStock.length === 0 ? (
            <div className="p-6 text-center text-xs text-emerald-700 font-semibold bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Tất cả mặt hàng đều đảm bảo trên ngưỡng tồn kho tối thiểu!</span>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLowStock.map((item) => (
                <Link
                  key={item.id}
                  href="/inventory"
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 hover:bg-rose-50/40 border border-slate-200/70 hover:border-rose-200 transition-all text-xs group"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-slate-800 group-hover:text-rose-700 transition-colors text-sm">
                      {item.name}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-medium">
                        {item.category === "hoc_tap" ? "Học tập" : "Ngoại khóa"}
                      </span>
                      <span>Vị trí: {item.location || "Chưa xếp"}</span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="flex items-center justify-end gap-1.5">
                      {item.quantity === 0 ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                          Hết
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Sắp hết
                        </span>
                      )}
                      <span className={`font-extrabold font-mono text-sm ${item.quantity === 0 ? "text-red-600" : "text-amber-600"}`}>
                        {item.quantity} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Ngưỡng min: {item.minStock} {item.unit}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Card: Top 5 Recent Pending Requests */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 space-y-4 shadow-sm bg-white/90">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Yêu cầu chờ duyệt mới nhất
                </h3>
                <p className="text-xs text-slate-500">Phiếu yêu cầu đồ dùng giáo viên vừa gửi</p>
              </div>
            </div>
            <Link
              href="/requests"
              className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors"
            >
              Tất cả <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">Đang tải dữ liệu phiếu...</div>
          ) : recentPendingRequests.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
              Hiện tại không có yêu cầu nào ở trạng thái Chờ duyệt.
            </div>
          ) : (
            <div className="space-y-2">
              {recentPendingRequests.map((req) => {
                const formattedDate = new Date(req.neededDate).toLocaleDateString("vi-VN");

                return (
                  <Link
                    key={req.id}
                    href={`/requests/${req.id}`}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 hover:bg-amber-50/40 border border-slate-200/70 hover:border-amber-200 transition-all text-xs group"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-slate-800 group-hover:text-amber-700 transition-colors text-sm">
                        {req.purpose}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Giáo viên: <span className="font-semibold text-slate-700">{req.requesterName}</span> • {req.itemCount} món đồ
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Chờ duyệt
                      </span>
                      <div className="text-[11px] text-emerald-700 font-bold font-mono">
                        Cần: {formattedDate}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

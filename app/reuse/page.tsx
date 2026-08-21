"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import {
  Recycle,
  Sparkles,
  PiggyBank,
  Plus,
  Search,
  RefreshCw,
  TrendingUp,
  Package,
  Calendar,
  User as UserIcon,
  Tag,
  CheckCircle2,
  Wrench,
  Layers,
  Award,
} from "lucide-react";
import { ReuseReturnModal } from "@/components/reuse/ReuseReturnModal";

interface UserInfo {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

export default function ReusePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  const [returns, setReturns] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalReturnsCount: 0,
    totalItemsReused: 0,
    totalEstimatedSavings: 0,
    conditionCounts: { tot: 0, kha: 0, trung_binh: 0 },
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [conditionFilter, setConditionFilter] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // 1. Auth check
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        }
      })
      .finally(() => setPageLoading(false));
  }, [router]);

  const fetchReuseData = async () => {
    setLoading(true);
    try {
      let url = `/api/reuse?search=${encodeURIComponent(search)}`;
      if (conditionFilter) {
        url += `&condition=${encodeURIComponent(conditionFilter)}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setReturns(data.returns || []);
        setStats(data.stats || {
          totalReturnsCount: 0,
          totalItemsReused: 0,
          totalEstimatedSavings: 0,
          conditionCounts: { tot: 0, kha: 0, trung_binh: 0 },
        });
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu tái sử dụng:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchReuseData();
    }
  }, [user, search, conditionFilter]);

  const getConditionBadge = (cond: string) => {
    switch (cond) {
      case "tot":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span>🌟 Tốt (90-100%)</span>
          </span>
        );
      case "kha":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span>✨ Khá (70-80%)</span>
          </span>
        );
      case "trung_binh":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-800 border border-orange-200">
            <span>🔧 Trung bình (50-60%)</span>
          </span>
        );
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-xs font-medium">Đang tải trang Tái sử dụng đồ dùng...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen pb-12">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 mb-2">
              <Recycle className="w-3.5 h-3.5" />
              <span>Tiết kiệm ngân sách & Tái chế giáo cụ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Tái sử dụng đồ dùng
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Thu hồi các giáo cụ, đạo cụ, đồ dùng còn tốt sau sự kiện/học tập để nhập lại vào kho và tiết kiệm ngân sách
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchReuseData}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-teal-600" : ""}`} />
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nhập đồ tái sử dụng</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Reused Items Count */}
          <div className="p-5 bg-gradient-to-br from-teal-500/10 via-white to-white rounded-3xl border border-teal-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-teal-800">
              <span className="text-xs font-bold uppercase tracking-wider">Đồ dùng tái sinh</span>
              <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
                <Recycle className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-0.5">
              <h2 className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
                {stats.totalItemsReused.toLocaleString("vi-VN")}
              </h2>
              <p className="text-[11px] text-slate-500">Món đồ dùng đã nhập lại kho</p>
            </div>
          </div>

          {/* Card 2: Savings Amount */}
          <div className="p-5 bg-gradient-to-br from-emerald-500/10 via-white to-white rounded-3xl border border-emerald-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-xs font-bold uppercase tracking-wider">Tiết kiệm ước tính</span>
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <PiggyBank className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-0.5">
              <h2 className="text-2xl sm:text-3xl font-black font-mono text-emerald-700">
                +{stats.totalEstimatedSavings.toLocaleString("vi-VN")} đ
              </h2>
              <p className="text-[11px] text-slate-500">Giá trị tài sản tái sử dụng</p>
            </div>
          </div>

          {/* Card 3: Return Batches */}
          <div className="p-5 bg-gradient-to-br from-cyan-500/10 via-white to-white rounded-3xl border border-cyan-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-cyan-800">
              <span className="text-xs font-bold uppercase tracking-wider">Lượt thu hồi</span>
              <div className="p-2 rounded-xl bg-cyan-100 text-cyan-700">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-0.5">
              <h2 className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
                {stats.totalReturnsCount}
              </h2>
              <p className="text-[11px] text-slate-500">Phiếu nhập kho tái sử dụng</p>
            </div>
          </div>

          {/* Card 4: Quality Status */}
          <div className="p-5 bg-gradient-to-br from-amber-500/10 via-white to-white rounded-3xl border border-amber-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-xs font-bold uppercase tracking-wider">Chất lượng đồ dùng</span>
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Tốt: {stats.conditionCounts?.tot || 0}
              </span>
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                Khá: {stats.conditionCounts?.kha || 0}
              </span>
              <span className="text-xs font-bold text-orange-800 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                TB: {stats.conditionCounts?.trung_binh || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/90 p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <span className="text-xs font-bold text-slate-700">Lọc chất lượng:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setConditionFilter("")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  conditionFilter === ""
                    ? "bg-white text-teal-800 shadow-2xs border border-slate-200"
                    : "text-slate-600 hover:bg-white/50"
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setConditionFilter("tot")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  conditionFilter === "tot"
                    ? "bg-emerald-50 text-emerald-800 shadow-2xs border border-emerald-200"
                    : "text-slate-600 hover:bg-white/50"
                }`}
              >
                🌟 Tốt
              </button>
              <button
                type="button"
                onClick={() => setConditionFilter("kha")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  conditionFilter === "kha"
                    ? "bg-amber-50 text-amber-800 shadow-2xs border border-amber-200"
                    : "text-slate-600 hover:bg-white/50"
                }`}
              >
                ✨ Khá
              </button>
              <button
                type="button"
                onClick={() => setConditionFilter("trung_binh")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  conditionFilter === "trung_binh"
                    ? "bg-orange-50 text-orange-800 shadow-2xs border border-orange-200"
                    : "text-slate-600 hover:bg-white/50"
                }`}
              >
                🔧 Trung bình
              </button>
            </div>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã, tên món, người trả..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs focus:outline-none"
            />
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {returns.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto border border-teal-100">
                <Recycle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-slate-800">
                  Chưa có dữ liệu đồ dùng tái sử dụng
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Bấm vào nút "Nhập đồ tái sử dụng" ở trên để thu hồi đồ dùng còn tốt vào lại kho.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5 min-w-[130px]">Mã phiếu</th>
                    <th className="px-4 py-3.5 min-w-[200px]">Tên đồ dùng & Ảnh</th>
                    <th className="px-4 py-3.5 text-center min-w-[100px]">Số lượng</th>
                    <th className="px-4 py-3.5 text-center min-w-[130px]">Chất lượng</th>
                    <th className="px-4 py-3.5 min-w-[150px]">Người trả / Lớp</th>
                    <th className="px-4 py-3.5 text-right min-w-[130px]">Tiết kiệm</th>
                    <th className="px-4 py-3.5 text-center min-w-[130px]">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {returns.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-teal-700">
                        {r.code}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                            {r.item?.imageUrl ? (
                              <img
                                src={r.item.imageUrl}
                                alt={r.item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <Package className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{r.item?.name}</p>
                            {r.note && (
                              <p className="text-[11px] text-slate-500 italic truncate max-w-[200px]">
                                {r.note}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 font-mono font-black text-xs text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                          +{r.returnedQty} {r.item?.unit}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        {getConditionBadge(r.condition)}
                      </td>

                      <td className="px-4 py-3.5 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{r.returnerName || r.returnerUser?.fullName || "Giáo viên"}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-700">
                        {r.estimatedSavings ? `+${r.estimatedSavings.toLocaleString("vi-VN")} đ` : "—"}
                      </td>

                      <td className="px-4 py-3.5 text-center text-slate-500">
                        {new Date(r.returnedAt).toLocaleDateString("vi-VN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reuse Return Modal */}
        {isModalOpen && (
          <ReuseReturnModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSuccess={() => {
              fetchReuseData();
            }}
          />
        )}
      </main>
    </div>
  );
}

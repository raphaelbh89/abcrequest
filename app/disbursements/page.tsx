"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import {
  PackageCheck,
  Clock,
  CheckCircle2,
  Search,
  RefreshCw,
  Eye,
  FileText,
  Calendar,
  User as UserIcon,
  Package,
  Layers,
  Sparkles,
} from "lucide-react";
import { DisbursementModal } from "@/components/disbursements/DisbursementModal";
import { DisbursementVoucherModal } from "@/components/disbursements/DisbursementVoucherModal";

interface UserInfo {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

export default function DisbursementsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [disbursements, setDisbursements] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");

  // Modals
  const [selectedRequestForDisburse, setSelectedRequestForDisburse] = useState<any | null>(null);
  const [selectedDisbursementForView, setSelectedDisbursementForView] = useState<any | null>(null);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch pending requests waiting for disbursement
      const resPending = await fetch(`/api/disbursements?pendingOnly=true&search=${encodeURIComponent(search)}`);
      const dataPending = await resPending.json();
      if (resPending.ok) {
        setPendingRequests(dataPending.requests || []);
      }

      // 2. Fetch completed disbursements history
      const resHistory = await fetch(`/api/disbursements?search=${encodeURIComponent(search)}`);
      const dataHistory = await resHistory.json();
      if (resHistory.ok) {
        setDisbursements(dataHistory.disbursements || []);
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu cấp phát:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, search]);

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-xs font-medium">Đang tải trang Cấp phát đồ dùng...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isStockerOrManager = ["admin", "manager", "stocker"].includes(user.role);

  return (
    <div className="min-h-screen pb-12">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Nghiệp vụ Bàn giao & Cấp phát</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Cấp phát đồ dùng
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Quản lý việc bàn giao thực tế đồ dùng cho giáo viên theo phiếu yêu cầu đã duyệt & xuất biên bản giao nhận
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchData}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Control Bar: Tabs & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/90 p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "pending"
                  ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Clock className={`w-3.5 h-3.5 ${activeTab === "pending" ? "text-emerald-600" : "text-slate-400"}`} />
              <span>Chờ cấp phát</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                {pendingRequests.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${activeTab === "history" ? "text-emerald-600" : "text-slate-400"}`} />
              <span>Lịch sử cấp phát</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-700">
                {disbursements.length}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mục đích, giáo viên, mã..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 focus:border-emerald-500 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* Tab 1 Content: Pending Requests */}
        {activeTab === "pending" && (
          <div className="space-y-4">
            {pendingRequests.length === 0 ? (
              <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-slate-800">
                    Không có phiếu nào đang chờ cấp phát
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Tất cả các phiếu yêu cầu đã duyệt đều đã được bàn giao đồ dùng hoàn tất.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {pendingRequests.map((req) => {
                  const totalAllocatedItems = (req.requestItems || []).reduce(
                    (sum: number, it: any) => sum + (it.allocatedQty || 0),
                    0
                  );

                  return (
                    <div
                      key={req.id}
                      className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between space-y-4 group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Chờ bàn giao</span>
                          </span>

                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(req.createdAt).toLocaleDateString("vi-VN")}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2">
                            {req.purpose}
                          </h3>
                        </div>

                        {/* Request details */}
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Giáo viên: <strong>{req.requester?.fullName}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Ngày cần: <strong>{new Date(req.neededDate).toLocaleDateString("vi-VN")}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Sẵn sàng cấp: <strong className="text-emerald-700">{totalAllocatedItems} món</strong> ({req.requestItems?.length} loại)</span>
                          </div>
                        </div>

                        {/* Items list preview */}
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Đồ dùng được duyệt:
                          </p>
                          <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                            {req.requestItems?.map((it: any) => (
                              <div key={it.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                                <span className="text-slate-800 font-medium truncate max-w-[180px]">
                                  {it.item?.name || it.proposedName}
                                </span>
                                <span className="font-bold text-emerald-800 font-mono text-[11px]">
                                  {it.allocatedQty} {it.item?.unit || it.proposedUnit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      {isStockerOrManager ? (
                        <button
                          type="button"
                          onClick={() => setSelectedRequestForDisburse(req)}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                        >
                          <PackageCheck className="w-4 h-4" />
                          <span>Tiến hành cấp phát</span>
                        </button>
                      ) : (
                        <div className="p-2.5 bg-slate-50 rounded-xl text-center text-[11px] text-slate-500 font-medium">
                          Đang chờ Thủ kho / Quản lý bàn giao đồ
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2 Content: History Disbursements */}
        {activeTab === "history" && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            {disbursements.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <FileText className="w-7 h-7" />
                </div>
                <p className="text-base font-bold text-slate-700">Chưa có lịch sử cấp phát nào</p>
                <p className="text-xs text-slate-500">Các phiếu cấp phát đồ dùng sau khi bàn giao sẽ hiển thị tại đây.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3.5 min-w-[140px]">Mã phiếu</th>
                      <th className="px-4 py-3.5 min-w-[200px]">Mục đích & Hoạt động</th>
                      <th className="px-4 py-3.5 min-w-[160px]">Người nhận đồ</th>
                      <th className="px-4 py-3.5 min-w-[140px]">Người cấp phát</th>
                      <th className="px-4 py-3.5 text-center min-w-[120px]">Số lượng món</th>
                      <th className="px-4 py-3.5 text-center min-w-[140px]">Thời gian</th>
                      <th className="px-4 py-3.5 text-center w-28">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {disbursements.map((d) => {
                      const totalQty = (d.items || []).reduce(
                        (sum: number, it: any) => sum + (it.disbursedQty || 0),
                        0
                      );

                      return (
                        <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5 font-mono font-bold text-emerald-700">
                            {d.code}
                          </td>

                          <td className="px-4 py-3.5 font-bold text-slate-900">
                            {d.request?.purpose || d.note}
                          </td>

                          <td className="px-4 py-3.5 text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{d.recipient?.fullName}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-slate-600">
                            {d.disbursedUser?.fullName}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold font-mono text-xs">
                              {totalQty} món
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center text-slate-500">
                            {new Date(d.disbursedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}{" "}
                            - {new Date(d.disbursedAt).toLocaleDateString("vi-VN")}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedDisbursementForView(d)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Biên bản</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Disbursement Action Modal */}
        {selectedRequestForDisburse && (
          <DisbursementModal
            isOpen={Boolean(selectedRequestForDisburse)}
            onClose={() => setSelectedRequestForDisburse(null)}
            onSuccess={() => {
              fetchData();
              setActiveTab("history");
            }}
            request={selectedRequestForDisburse}
          />
        )}

        {/* Handover Voucher View / Print Modal */}
        {selectedDisbursementForView && (
          <DisbursementVoucherModal
            isOpen={Boolean(selectedDisbursementForView)}
            onClose={() => setSelectedDisbursementForView(null)}
            disbursement={selectedDisbursementForView}
          />
        )}
      </main>
    </div>
  );
}

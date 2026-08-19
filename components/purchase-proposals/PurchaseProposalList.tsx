"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  ShoppingCart,
  CheckCircle2,
  Clock,
  PackageCheck,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  ArrowUpRight,
  Layers,
  ListFilter,
  Download,
  Calendar,
  Sparkles,
  Package,
} from "lucide-react";
import { ReceiveModal } from "./ReceiveModal";
import { useToast } from "@/components/common/Toast";

interface ProposalItem {
  id: string;
  qty: number;
  status: "can_mua" | "da_dat_mua" | "da_nhap_kho" | string;
  createdAt: string;
  receivedQty: number;
  resolvedAt?: string | null;
  item: {
    id: string;
    name: string;
    unit: string;
    category: string;
    quantity: number;
  };
  sourceRequest: {
    id: string;
    purpose: string;
    neededDate: string;
    requester: {
      fullName: string;
      username: string;
    };
  };
}

interface GroupedProposal {
  itemId: string;
  item: {
    id: string;
    name: string;
    unit: string;
    category: string;
    quantity: number;
  };
  totalQty: number;
  pendingQty: number;
  proposals: ProposalItem[];
}

export function PurchaseProposalList() {
  const [groupedProposals, setGroupedProposals] = useState<GroupedProposal[]>([]);
  const [rawProposals, setRawProposals] = useState<ProposalItem[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Filter states
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Receive modal state
  const [receiveTarget, setReceiveTarget] = useState<ProposalItem | null>(null);
  const [orderingId, setOrderingId] = useState<string | null>(null);

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const res = await fetch(`/api/purchase-proposals?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setGroupedProposals(data.grouped || []);
        setRawProposals(data.proposals || []);
      }
    } catch (err) {
      console.error("Fetch proposals error:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const { success: toastSuccess, error: toastError } = useToast();

  const handleOrderProposal = async (proposal: ProposalItem) => {
    if (
      !confirm(
        `Xác nhận đánh dấu "ĐÃ ĐẶT MUA" cho mặt hàng "${proposal.item.name}" (SL: ${proposal.qty} ${proposal.item.unit})?`
      )
    ) {
      return;
    }

    setOrderingId(proposal.id);

    try {
      const res = await fetch(`/api/purchase-proposals/${proposal.id}/order`, {
        method: "PATCH",
      });

      const data = await res.json();

      if (!res.ok) {
        toastError(data.error || "Không thể chuyển trạng thái đặt mua.");
        return;
      }

      toastSuccess("✅ Đã chuyển trạng thái sang Đã đặt mua thành công!");
      fetchProposals();
    } catch {
      toastError("Lỗi kết nối máy chủ khi chuyển trạng thái.");
    } finally {
      setOrderingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "can_mua":
        return (
          <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 text-center">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 status-pulse" />
            Cần mua
          </span>
        );
      case "da_dat_mua":
        return (
          <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 text-center">
            <ShoppingBag className="w-3.5 h-3.5 text-sky-600" />
            Đã đặt mua
          </span>
        );
      case "da_nhap_kho":
        return (
          <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 text-center">
            <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
            Đã nhập kho
          </span>
        );
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white/90">
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-2xl">
            <button
              onClick={() => setViewMode("grouped")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === "grouped"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>Gộp theo món</span>
            </button>
            <button
              onClick={() => setViewMode("flat")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === "flat"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ListFilter className="w-3.5 h-3.5 text-cyan-600" />
              <span>Danh sách chi tiết</span>
            </button>
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="can_mua">Cần mua</option>
            <option value="da_dat_mua">Đã đặt mua</option>
            <option value="da_nhap_kho">Đã nhập kho</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/api/purchase-proposals/export"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel Yêu Cầu Mua Sắm</span>
          </a>

          <button
            onClick={fetchProposals}
            className="flex items-center justify-center p-2.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer shadow-xs"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 space-y-3 glass-panel rounded-3xl border border-slate-200 bg-white/95">
          <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Đang tải danh sách đề xuất mua...</p>
        </div>
      ) : groupedProposals.length === 0 ? (
        <div className="p-16 text-center text-slate-400 space-y-3 glass-panel rounded-3xl border border-slate-200 bg-white/95">
          <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-base font-bold text-slate-700">
            Chưa có đề xuất mua nào
          </p>
          <p className="text-xs text-slate-500">Đề xuất mua sẽ tự động sinh ra khi duyệt các yêu cầu bị thiếu hàng.</p>
        </div>
      ) : viewMode === "grouped" ? (
        /* Grouped View by Item */
        <div className="space-y-4">
          {groupedProposals.map((group) => {
            const isExpanded = expandedItemId === group.itemId;
            const hasPending = group.pendingQty > 0;

            return (
              <div
                key={group.itemId}
                className="glass-panel rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden transition-all group bg-white/95"
              >
                <div
                  onClick={() => setExpandedItemId(isExpanded ? null : group.itemId)}
                  className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors text-base sm:text-lg">
                        {group.item.name}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                        {group.item.category === "hoc_tap" ? "Học tập" : "Ngoại khóa"}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 flex flex-wrap gap-x-5 gap-y-1 font-medium">
                      <span>Tồn kho hiện tại: <strong className="text-emerald-700 font-mono font-bold">{group.item.quantity} {group.item.unit}</strong></span>
                      <span>Đóng góp từ: <strong className="text-slate-800">{group.proposals.length} phiếu yêu cầu</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-5 justify-between md:justify-end">
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">TỔNG CẦN MUA</div>
                      <div
                        className={`text-2xl font-black font-mono tracking-tight ${
                          hasPending ? "text-amber-600" : "text-emerald-600"
                        }`}
                      >
                        {group.pendingQty} <span className="text-xs font-normal text-slate-400">{group.item.unit}</span>
                      </div>
                    </div>

                    <div className="p-2 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details List */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50/60 space-y-3">
                    <div className="text-xs font-bold text-slate-600">
                      Chi tiết các phiếu yêu cầu đóng góp vào món này:
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3">Chủ đề Yêu cầu / Hoạt động</th>
                            <th className="px-4 py-3">Giáo viên</th>
                            <th className="px-4 py-3">Ngày cần</th>
                            <th className="px-4 py-3">Số lượng thiếu</th>
                            <th className="px-4 py-3">Trạng thái</th>
                            <th className="px-4 py-3 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.proposals.map((p) => {
                            const formattedNeededDate = new Date(p.sourceRequest.neededDate).toLocaleDateString("vi-VN");

                            return (
                              <tr key={p.id} className="hover:bg-slate-50/80">
                                <td className="px-4 py-3 font-bold text-slate-800">
                                  {p.sourceRequest.purpose}
                                </td>
                                <td className="px-4 py-3 text-slate-700 font-medium">
                                  {p.sourceRequest.requester.fullName}
                                </td>
                                <td className="px-4 py-3 text-slate-500 font-mono">
                                  {formattedNeededDate}
                                </td>
                                <td className="px-4 py-3 font-mono font-black text-amber-700">
                                  {p.qty} {group.item.unit}
                                </td>
                                <td className="px-4 py-3">{getStatusBadge(p.status)}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {p.status === "can_mua" && (
                                      <button
                                        onClick={() => handleOrderProposal(p)}
                                        disabled={orderingId === p.id}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-all cursor-pointer"
                                      >
                                        <ShoppingBag className="w-3.5 h-3.5" />
                                        <span>Đã đặt mua</span>
                                      </button>
                                    )}

                                    {p.status !== "da_nhap_kho" && (
                                      <button
                                        onClick={() => setReceiveTarget(p)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer"
                                      >
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                        <span>Đã nhập kho</span>
                                      </button>
                                    )}

                                    {p.status === "da_nhap_kho" && (
                                      <span className="text-[11px] text-slate-500 font-mono font-medium">
                                        Đã nhập +{p.receivedQty} {group.item.unit}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat View */
        <div className="glass-panel rounded-3xl border border-slate-200/80 shadow-md overflow-hidden bg-white/95">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Mặt hàng</th>
                  <th className="px-4 py-3">Chủ đề / Yêu cầu nguồn</th>
                  <th className="px-4 py-3">Giáo viên</th>
                  <th className="px-4 py-3">SL Cần mua</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rawProposals.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {p.item.name}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {p.sourceRequest.purpose}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.sourceRequest.requester.fullName}</td>
                    <td className="px-4 py-3 font-mono font-black text-amber-700">
                      {p.qty} {p.item.unit}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(p.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.status === "can_mua" && (
                          <button
                            onClick={() => handleOrderProposal(p)}
                            disabled={orderingId === p.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-all cursor-pointer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Đã đặt mua</span>
                          </button>
                        )}

                        {p.status !== "da_nhap_kho" && (
                          <button
                            onClick={() => setReceiveTarget(p)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>Đã nhập kho</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      <ReceiveModal
        isOpen={Boolean(receiveTarget)}
        onClose={() => setReceiveTarget(null)}
        onSuccess={fetchProposals}
        proposal={receiveTarget}
      />
    </div>
  );
}

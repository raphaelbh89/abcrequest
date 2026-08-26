"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Ban,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Check,
  PackageCheck,
  PackageMinus,
  UserCheck,
  Download,
  User,
  Calendar,
  AlertTriangle,
  RotateCcw,
  PackagePlus,
  ExternalLink,
  Coins,
  Calculator,
} from "lucide-react";
import { RejectModal } from "./RejectModal";
import { ApproveModal } from "./ApproveModal";
import { ItemModal, ItemData } from "@/components/inventory/ItemModal";
import { useToast } from "@/components/common/Toast";

interface RequestItemData {
  id: string;
  itemId?: string | null;
  requestedQty: number;
  allocatedQty: number;
  shortfallQty: number;
  status?: "approved" | "rejected" | string;
  isNewItemProposal?: boolean;
  proposedName?: string | null;
  proposedUnit?: string | null;
  proposedPrice?: number | null;
  proposedImageUrl?: string | null;
  proposedSourceUrl?: string | null;
  item?: {
    name: string;
    unit: string;
    category: string;
    price?: number | null;
  } | null;
}

interface RequestData {
  id: string;
  purpose: string;
  neededDate: string;
  note?: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled" | string;
  createdAt: string;
  rejectReason?: string | null;
  requester: {
    fullName: string;
    username: string;
  };
  decidedByUser?: {
    fullName: string;
    username: string;
  } | null;
  requestItems: RequestItemData[];
}

interface UserInfo {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

interface RequestListProps {
  user: UserInfo;
}

const TABS = [
  { key: "pending", label: "Chờ duyệt" },
  { key: "approved", label: "Đã duyệt" },
  { key: "rejected", label: "Từ chối" },
  { key: "cancelled", label: "Đã hủy" },
  { key: "all", label: "Tất cả" },
];

export function RequestList({ user }: RequestListProps) {
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Tab filter: default to 'pending' for admin and manager, 'all' for teachers
  const [statusTab, setStatusTab] = useState<string>(["admin", "manager"].includes(user.role) ? "pending" : "all");

  // Track item IDs that Admin chose to reject/exclude for pending requests
  const [rejectedItemIdsMap, setRejectedItemIdsMap] = useState<Record<string, string[]>>({});

  // Reject Modal state for whole request rejection
  const [rejectTarget, setRejectTarget] = useState<RequestData | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const getTabCount = (tabKey: string) => {
    if (tabKey === statusTab) return requests.length;
    return 0;
  };

  const filteredRequests = requests;

  // Modal tạo mặt hàng mới từ dòng đề xuất
  const [createItemModalOpen, setCreateItemModalOpen] = useState(false);
  const [createItemPrefill, setCreateItemPrefill] = useState<ItemData | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (!["admin", "manager", "stocker"].includes(user.role)) {
        params.set("mine", "true");
      }
      if (statusTab && statusTab !== "all") {
        params.set("status", statusTab);
      }

      const res = await fetch(`/api/requests?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error("Fetch requests error:", err);
    } finally {
      setLoading(false);
    }
  }, [user.role, statusTab]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleToggleRejectItem = (requestId: string, itemLineId: string) => {
    setRejectedItemIdsMap((prev) => {
      const currentList = prev[requestId] || [];
      if (currentList.includes(itemLineId)) {
        return {
          ...prev,
          [requestId]: currentList.filter((id) => id !== itemLineId),
        };
      } else {
        return {
          ...prev,
          [requestId]: [...currentList, itemLineId],
        };
      }
    });
  };

  // Approve Modal state
  const [approveTarget, setApproveTarget] = useState<RequestData | null>(null);
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();

  const handleOpenApproveModal = (req: RequestData) => {
    const rejectedItems = rejectedItemIdsMap[req.id] || [];
    const totalItemsCount = req.requestItems.length;

    if (rejectedItems.length === totalItemsCount) {
      toastWarning("Bạn đã từ chối tất cả các món trong phiếu này. Vui lòng bấm 'Từ chối' toàn bộ đơn yêu cầu thay vì Duyệt đơn.");
      return;
    }

    setApproveTarget(req);
  };

  const handleApproveConfirm = async () => {
    if (!approveTarget) return;

    const rejectedItems = rejectedItemIdsMap[approveTarget.id] || [];

    const res = await fetch(`/api/requests/${approveTarget.id}/approve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rejectedItemIds: rejectedItems,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      toastError(data.error || "Không thể duyệt yêu cầu.");
      throw new Error(data.error || "Không thể duyệt yêu cầu.");
    }

    toastSuccess("✅ Đã duyệt yêu cầu và phân bổ kho thành công!");
    fetchRequests();
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return;

    const res = await fetch(`/api/requests/${rejectTarget.id}/reject`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rejectReason: reason }),
    });

    const data = await res.json();

    if (!res.ok) {
      toastError(data.error || "Không thể từ chối yêu cầu.");
      throw new Error(data.error || "Không thể từ chối yêu cầu.");
    }

    toastSuccess("Đã từ chối yêu cầu thành công.");
    fetchRequests();
  };

  const handleCancelRequest = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn hủy yêu cầu đồ dùng này không?")) return;

    try {
      const res = await fetch(`/api/requests/${id}/cancel`, {
        method: "PATCH",
      });

      if (res.ok) {
        toastSuccess("Đã hủy yêu cầu thành công.");
        fetchRequests();
      } else {
        const data = await res.json();
        toastError(data.error || "Không thể hủy yêu cầu.");
      }
    } catch {
      toastError("Lỗi kết nối khi hủy yêu cầu.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 text-center">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 status-pulse" />
            Chờ duyệt
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 text-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Đã duyệt
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 text-center">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Từ chối
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 text-center">
            <Ban className="w-3.5 h-3.5" />
            Đã hủy
          </span>
        );
      default:
        return status;
    }
  };

  // Quyền xét duyệt & quản lý yêu cầu: Admin & Quản lý (Manager)
  const isAdmin = ["admin", "manager"].includes(user.role);

  const formatMoney = (amount: number) => {
    return (amount || 0).toLocaleString("vi-VN") + " đ";
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation and Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60 overflow-x-auto max-w-full">
          {TABS.map((tab) => {
            const count = getTabCount(tab.key);
            const isActive = statusTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusTab(tab.key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                      isActive
                        ? "bg-emerald-700/60 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Buttons: Refresh & New Request */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={fetchRequests}
            title="Làm mới danh sách"
            className="p-2.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href="/requests/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo yêu cầu mới</span>
          </Link>
        </div>
      </div>

      {/* Requests List Cards */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-28 rounded-3xl bg-slate-100/70 animate-pulse border border-slate-200/50"
            />
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 space-y-3">
          <div className="p-3 bg-slate-100 rounded-2xl w-fit mx-auto text-slate-400">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Không có yêu cầu đồ dùng nào
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {statusTab === "all"
              ? "Hiện chưa có phiếu yêu cầu nào được tạo trong hệ thống."
              : `Không có phiếu yêu cầu nào ở trạng thái "${
                  TABS.find((t) => t.key === statusTab)?.label
                }".`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isExpanded = expandedId === req.id;
            const formattedCreatedDate = new Date(req.createdAt).toLocaleDateString("vi-VN");
            const formattedNeededDate = new Date(req.neededDate).toLocaleDateString("vi-VN");

            const rejectedThisReq = rejectedItemIdsMap[req.id] || [];

            // Compute active allocated vs shortfall based on unrejected items
            const activeItems = req.requestItems.filter(
              (ri) => !rejectedThisReq.includes(ri.id) && ri.status !== "rejected"
            );

            const totalAllocated = activeItems.reduce((acc, i) => acc + i.allocatedQty, 0);
            const totalShortfall = activeItems.reduce((acc, i) => acc + i.shortfallQty, 0);
            const totalEstimatedCost = activeItems.reduce(
              (acc, i) => acc + (i.requestedQty || 0) * (i.proposedPrice ?? i.item?.price ?? 0),
              0
            );
            const totalPurchaseCost = activeItems.reduce(
              (acc, i) => acc + (i.shortfallQty || 0) * (i.proposedPrice ?? i.item?.price ?? 0),
              0
            );

            return (
              <div
                key={req.id}
                className="glass-panel rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 bg-white/95"
              >
                {/* Main Card Header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">
                        {req.purpose}
                      </h3>
                      {getStatusBadge(req.status)}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1.5 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Giáo viên: <strong className="text-slate-800">{req.requester.fullName}</strong>
                      </span>
                      <span>Ngày tạo: <strong className="text-slate-700 font-mono">{formattedCreatedDate}</strong></span>
                      <span className="flex items-center gap-1 font-medium text-emerald-700">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        Cần ngày: <strong className="font-mono">{formattedNeededDate}</strong>
                      </span>
                    </div>

                    {/* Stock Allocation & Estimated Cost Summary Chips */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px] font-semibold">
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <PackageCheck className="w-3 h-3 text-emerald-600" />
                        Cấp từ kho: {totalAllocated} món
                      </span>
                      {totalShortfall > 0 && (
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <PackageMinus className="w-3 h-3 text-amber-600" />
                          Thiếu cần mua: {totalShortfall} món
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1 font-mono font-bold">
                        <Calculator className="w-3 h-3 text-teal-600" />
                        Dự toán kinh phí: {formatMoney(totalEstimatedCost)}
                      </span>
                      {rejectedThisReq.length > 0 && (
                        <span className="px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
                          <Ban className="w-3 h-3 text-rose-600" />
                          Đã loại bỏ: {rejectedThisReq.length} món
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 justify-between lg:justify-end" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={`/api/requests/${req.id}/export`}
                      title="Xuất phiếu Excel"
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Xuất Excel</span>
                    </a>

                    {/* Admin Approval Actions for Pending Requests */}
                    {isAdmin && req.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenApproveModal(req)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Duyệt đơn</span>
                        </button>

                        <button
                          onClick={() => setRejectTarget(req)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Từ chối</span>
                        </button>
                      </div>
                    )}

                    {/* Cancel Action for Teacher */}
                    {!isAdmin && req.status === "pending" && req.requester.username === user.username && (
                      <button
                        onClick={() => handleCancelRequest(req.id)}
                        className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer"
                      >
                        Hủy yêu cầu
                      </button>
                    )}

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      className="p-2 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Xem chi tiết"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Table */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50/60 space-y-4">
                    {req.note && (
                      <div className="text-xs text-slate-700 p-3 rounded-xl bg-white border border-slate-200">
                        <span className="font-bold text-slate-500">Ghi chú:</span> {req.note}
                      </div>
                    )}

                    {req.decidedByUser && (
                      <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Xử lý bởi Quản trị: <strong className="text-slate-800">{req.decidedByUser.fullName}</strong></span>
                      </div>
                    )}

                    {/* Notice from Admin to Teacher if items were rejected or request was rejected */}
                    {req.rejectReason && (
                      <div className={`p-3.5 text-xs rounded-xl border flex items-center gap-2 font-medium ${
                        req.status === "approved"
                          ? "text-amber-900 bg-amber-50 border-amber-200"
                          : "text-rose-800 bg-rose-50 border-rose-200"
                      }`}>
                        <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${req.status === "approved" ? "text-amber-600" : "text-rose-600"}`} />
                        <span><strong>Thông báo từ Quản lý:</strong> {req.rejectReason}</span>
                      </div>
                    )}

                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3">Đồ dùng</th>
                            <th className="px-4 py-3">Phân loại</th>
                            <th className="px-3 py-3 text-center">SL Xin</th>
                            <th className="px-3 py-3 text-right">Đơn giá (VNĐ)</th>
                            <th className="px-3 py-3 text-right">Thành tiền</th>
                            <th className="px-3 py-3 text-center">Cấp từ kho</th>
                            <th className="px-3 py-3 text-center">Cần mua thêm</th>
                            <th className="px-4 py-3">Trạng thái phân bổ</th>
                            {isAdmin && req.status === "pending" && (
                              <th className="px-4 py-3 text-right">Thao tác duyệt</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {req.requestItems.map((ri) => {
                            const isMarkedRejected =
                              rejectedThisReq.includes(ri.id) ||
                              ri.status === "rejected";

                            const isNewProposal = Boolean(ri.isNewItemProposal);
                            const itemName = ri.item?.name || ri.proposedName || "Món đề xuất mới";
                            const itemUnit = ri.item?.unit || ri.proposedUnit || "cái";
                            const itemCat = ri.item?.category === "hoc_tap" ? "Học tập" : ri.item?.category === "ngoai_khoa" ? "Ngoại khóa" : "Đề xuất mới";
                            const isFullyAllocated = ri.shortfallQty === 0 && !isNewProposal;
                            const unitPrice = ri.proposedPrice ?? ri.item?.price ?? 0;
                            const lineTotal = (ri.requestedQty || 0) * unitPrice;

                            return (
                              <tr
                                key={ri.id}
                                className={`transition-colors ${
                                  isMarkedRejected
                                    ? "bg-rose-50/40 text-slate-400"
                                    : "hover:bg-slate-50/80"
                                }`}
                              >
                                <td className="px-4 py-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-bold ${isMarkedRejected ? "line-through text-slate-400" : "text-slate-800"}`}>
                                        {itemName}
                                      </span>
                                      {isNewProposal && (
                                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                                          ⭐ Đề xuất mới
                                        </span>
                                      )}
                                    </div>
                                    {isNewProposal && ri.proposedSourceUrl && (
                                      <a
                                        href={ri.proposedSourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        <span>Link nguồn kiểm chứng</span>
                                      </a>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                  {itemCat}
                                </td>
                                <td className="px-3 py-3 font-mono font-bold text-center">
                                  <span className={isMarkedRejected ? "line-through" : "text-slate-800"}>
                                    {ri.requestedQty} {itemUnit}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-right font-mono whitespace-nowrap">
                                  {unitPrice > 0 ? (
                                    <span className={isMarkedRejected ? "line-through text-slate-400" : "text-slate-700"}>
                                      {formatMoney(unitPrice)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">Chưa có giá</span>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-right font-mono font-bold whitespace-nowrap">
                                  {isMarkedRejected ? (
                                    <span className="line-through text-slate-400">0 đ</span>
                                  ) : (
                                    <span className="text-slate-900">{formatMoney(lineTotal)}</span>
                                  )}
                                </td>
                                <td className="px-3 py-3 font-mono font-black text-center whitespace-nowrap">
                                  {isMarkedRejected ? (
                                    <span className="text-slate-400">0 {itemUnit}</span>
                                  ) : (
                                    <span className="text-emerald-700">{ri.allocatedQty} {itemUnit}</span>
                                  )}
                                </td>
                                <td className="px-3 py-3 font-mono font-black text-center whitespace-nowrap">
                                  {isMarkedRejected ? (
                                    <span className="text-slate-400">0 {itemUnit}</span>
                                  ) : (
                                    <span className="text-amber-700">{ri.shortfallQty} {itemUnit}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {isMarkedRejected ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                      <Ban className="w-3 h-3 text-rose-600" />
                                      Đã từ chối cấp
                                    </span>
                                  ) : (
                                    <span
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                        isFullyAllocated
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : isNewProposal
                                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                          : "bg-amber-50 text-amber-700 border-amber-200"
                                      }`}
                                    >
                                      {isFullyAllocated
                                        ? "Đủ hàng từ kho"
                                        : isNewProposal
                                        ? "Đề xuất mua 100%"
                                        : `Thiếu ${ri.shortfallQty} ${itemUnit} (Sinh đề xuất)`}
                                    </span>
                                  )}
                                </td>

                                {/* Admin row actions */}
                                {isAdmin && (
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {/* Nút Tạo mặt hàng mới trong kho khi có dòng đề xuất */}
                                      {isNewProposal && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setCreateItemPrefill({
                                              name: ri.proposedName || "",
                                              unit: ri.proposedUnit || "cái",
                                              price: ri.proposedPrice || null,
                                              quantity: 0,
                                              minStock: 5,
                                              category: "hoc_tap",
                                            });
                                            setCreateItemModalOpen(true);
                                          }}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                                          title="Tạo mặt hàng này vào danh mục kho của trường"
                                        >
                                          <PackagePlus className="w-3.5 h-3.5" />
                                          <span>Tạo vào kho</span>
                                        </button>
                                      )}

                                      {req.status === "pending" && (
                                        isMarkedRejected ? (
                                          <button
                                            type="button"
                                            onClick={() => handleToggleRejectItem(req.id, ri.id)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                                            title="Cấp lại món này"
                                          >
                                            <RotateCcw className="w-3 h-3 text-slate-500" />
                                            <span>Khôi phục</span>
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => handleToggleRejectItem(req.id, ri.id)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                                            title="Không cấp món này cho giáo viên"
                                          >
                                            <XCircle className="w-3 h-3 text-rose-600" />
                                            <span>Từ chối</span>
                                          </button>
                                        )
                                      )}
                                    </div>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-50/90 border-t border-slate-200 font-bold text-xs">
                          <tr>
                            <td colSpan={2} className="px-4 py-3 text-slate-600">
                              TỔNG CỘNG ({activeItems.length} MÓN HỢP LỆ):
                            </td>
                            <td className="px-3 py-3 text-center font-mono font-bold text-slate-800">
                              {activeItems.reduce((acc, i) => acc + (i.requestedQty || 0), 0)}
                            </td>
                            <td className="px-3 py-3 text-right text-slate-500 font-medium">
                              Tổng kinh phí:
                            </td>
                            <td className="px-3 py-3 text-right font-mono font-black text-emerald-700 text-sm whitespace-nowrap">
                              {formatMoney(totalEstimatedCost)}
                            </td>
                            <td className="px-3 py-3 text-center font-mono font-black text-emerald-700">
                              {totalAllocated}
                            </td>
                            <td className="px-3 py-3 text-center font-mono font-black text-amber-700">
                              {totalShortfall}
                            </td>
                            <td colSpan={isAdmin && req.status === "pending" ? 2 : 1} className="px-4 py-3 text-right text-[11px] text-slate-500 font-normal">
                              {totalPurchaseCost > 0 ? (
                                <span>Kinh phí mua sắm: <strong className="font-mono text-amber-800">{formatMoney(totalPurchaseCost)}</strong></span>
                              ) : (
                                <span className="text-emerald-700 font-semibold">100% cấp từ kho sẵn có</span>
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Item Modal to create item from proposal */}
      <ItemModal
        isOpen={createItemModalOpen}
        onClose={() => {
          setCreateItemModalOpen(false);
          setCreateItemPrefill(null);
        }}
        onSuccess={() => {
          toastSuccess("Đã khởi tạo mặt hàng vào kho thành công!");
          fetchRequests();
        }}
        initialData={createItemPrefill}
      />

      {/* Approve Modal */}
      {approveTarget && (
        <ApproveModal
          isOpen={Boolean(approveTarget)}
          onClose={() => setApproveTarget(null)}
          onConfirm={handleApproveConfirm}
          purpose={approveTarget.purpose}
          requesterName={approveTarget.requester.fullName}
          neededDate={new Date(approveTarget.neededDate).toLocaleDateString("vi-VN")}
          items={approveTarget.requestItems}
          rejectedItemIds={rejectedItemIdsMap[approveTarget.id] || []}
        />
      )}

      {/* Reject Modal for full request rejection */}
      <RejectModal
        isOpen={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        purpose={rejectTarget?.purpose}
      />
    </div>
  );
}

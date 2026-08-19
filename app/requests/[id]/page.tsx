"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Download,
  ArrowLeft,
  User,
  Calendar,
  Check,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  PackageCheck,
  PackageMinus,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { RejectModal } from "@/components/requests/RejectModal";
import { ApproveModal } from "@/components/requests/ApproveModal";
import { useToast } from "@/components/common/Toast";

interface RequestItemData {
  id: string;
  requestedQty: number;
  allocatedQty: number;
  shortfallQty: number;
  status?: "approved" | "rejected" | string;
  item: {
    name: string;
    unit: string;
    category: string;
  };
}

interface RequestDetail {
  id: string;
  purpose: string;
  neededDate: string;
  note?: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled" | string;
  createdAt: string;
  decidedAt?: string | null;
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

export default function SingleRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const requestId = resolvedParams.id;
  const router = useRouter();

  const [user, setUser] = useState<UserInfo | null>(null);
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track item IDs to reject when admin is approving
  const [rejectedItemIds, setRejectedItemIds] = useState<string[]>([]);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);

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
      });
  }, [router]);

  const fetchRequestDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${requestId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể tải phiếu yêu cầu");
        return;
      }
      setRequest(data.request);
      setRejectedItemIds([]);
    } catch {
      setError("Lỗi kết nối khi tải phiếu yêu cầu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestDetail();
  }, [requestId]);

  const handleToggleRejectItem = (itemLineId: string) => {
    setRejectedItemIds((prev) =>
      prev.includes(itemLineId) ? prev.filter((id) => id !== itemLineId) : [...prev, itemLineId]
    );
  };

  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();

  const handleOpenApprove = () => {
    if (!request) return;

    if (rejectedItemIds.length === request.requestItems.length) {
      toastWarning("Bạn đã từ chối tất cả các món trong phiếu này. Vui lòng bấm 'Từ chối toàn bộ yêu cầu' thay vì Duyệt đơn.");
      return;
    }

    setIsApproveModalOpen(true);
  };

  const handleApproveConfirm = async () => {
    if (!request) return;

    const res = await fetch(`/api/requests/${request.id}/approve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rejectedItemIds,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toastError(data.error || "Không thể duyệt yêu cầu");
      throw new Error(data.error || "Không thể duyệt yêu cầu");
    }
    toastSuccess("✅ Đã duyệt yêu cầu thành công!");
    fetchRequestDetail();
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!request) return;
    const res = await fetch(`/api/requests/${request.id}/reject`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rejectReason: reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      toastError(data.error || "Không thể từ chối");
      throw new Error(data.error || "Không thể từ chối");
    }
    toastSuccess("Đã từ chối yêu cầu thành công.");
    fetchRequestDetail();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 status-pulse" />
            Chờ duyệt
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Đã duyệt
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-4 h-4 text-rose-600" /> Từ chối
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <Ban className="w-4 h-4" /> Đã hủy
          </span>
        );
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-xs font-medium">Đang tải chi tiết phiếu yêu cầu...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen">
        <Navbar user={user} />
        <main className="max-w-4xl mx-auto p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <p className="text-lg font-bold text-slate-900">{error || "Không tìm thấy phiếu"}</p>
          <Link href="/requests" className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl text-xs font-semibold cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
          </Link>
        </main>
      </div>
    );
  }

  const isAdmin = user?.role === "admin" || user?.role === "manager";
  const formattedCreatedDate = new Date(request.createdAt).toLocaleDateString("vi-VN");
  const formattedNeededDate = new Date(request.neededDate).toLocaleDateString("vi-VN");
  const formattedDecidedDate = request.decidedAt ? new Date(request.decidedAt).toLocaleDateString("vi-VN") : null;

  return (
    <div className="min-h-screen pb-12">
      <Navbar user={user} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/requests"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh sách yêu cầu</span>
          </Link>

          <a
            href={`/api/requests/${request.id}/export`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Phiếu Excel (.xlsx)</span>
          </a>
        </div>

        {/* Detail Header Box */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-6 bg-white/95">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <FileText className="w-5 h-5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {request.purpose}
                </h1>
              </div>
              <p className="text-xs text-slate-400 font-mono pl-1">Mã yêu cầu: {request.id}</p>
            </div>
            <div>{getStatusBadge(request.status)}</div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <div className="text-slate-500 flex items-center gap-1.5 font-bold">
                <User className="w-3.5 h-3.5 text-emerald-600" /> Người gửi:
              </div>
              <div className="font-bold text-slate-900 text-sm">{request.requester.fullName}</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <div className="text-slate-500 flex items-center gap-1.5 font-bold">
                <Calendar className="w-3.5 h-3.5 text-sky-600" /> Ngày cần dùng:
              </div>
              <div className="font-black text-emerald-700 font-mono text-sm">{formattedNeededDate}</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <div className="text-slate-500 flex items-center gap-1.5 font-bold">
                <Clock className="w-3.5 h-3.5 text-indigo-600" /> Ngày tạo phiếu:
              </div>
              <div className="font-bold text-slate-700 font-mono text-sm">{formattedCreatedDate}</div>
            </div>
          </div>

          {request.note && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700">
              <strong className="text-slate-500">Ghi chú:</strong> {request.note}
            </div>
          )}

          {request.decidedByUser && (
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-200 text-xs text-indigo-800">
              <strong>Xử lý bởi Quản trị:</strong> {request.decidedByUser.fullName} ({formattedDecidedDate})
            </div>
          )}

          {/* Teacher Notification / Decision reason */}
          {request.rejectReason && (
            <div className={`p-4 rounded-2xl border text-xs flex items-center gap-2 font-medium ${
              request.status === "approved"
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}>
              <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${request.status === "approved" ? "text-amber-600" : "text-rose-600"}`} />
              <span><strong>Thông báo từ Quản lý:</strong> {request.rejectReason}</span>
            </div>
          )}

          {/* Items Table */}
          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>Chi Tiết Đồ Dùng Yêu Cầu ({request.requestItems.length} món)</span>
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">STT</th>
                    <th className="px-4 py-3">Tên đồ dùng</th>
                    <th className="px-4 py-3">Phân loại</th>
                    <th className="px-4 py-3">Đơn vị</th>
                    <th className="px-4 py-3">SL Xin</th>
                    <th className="px-4 py-3">SL Cấp từ kho</th>
                    <th className="px-4 py-3">SL Cần mua thêm</th>
                    <th className="px-4 py-3">Trạng thái phân bổ</th>
                    {isAdmin && request.status === "pending" && (
                      <th className="px-4 py-3 text-right">Thao tác duyệt</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {request.requestItems.map((ri, index) => {
                    const isItemRejected =
                      rejectedItemIds.includes(ri.id) || ri.status === "rejected";
                    const isFullyAllocated = ri.shortfallQty === 0;

                    return (
                      <tr
                        key={ri.id}
                        className={`transition-colors ${
                          isItemRejected ? "bg-rose-50/40 text-slate-400" : "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-slate-400 font-medium">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className={`font-bold ${isItemRejected ? "line-through text-slate-400" : "text-slate-800"}`}>
                            {ri.item.name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {ri.item.category === "hoc_tap" ? "Học tập" : "Ngoại khóa & Trang trí"}
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium">{ri.item.unit}</td>
                        <td className="px-4 py-3 font-black font-mono">
                          <span className={isItemRejected ? "line-through" : "text-slate-800"}>
                            {ri.requestedQty}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-black font-mono">
                          {isItemRejected ? (
                            <span className="text-slate-400">0</span>
                          ) : (
                            <span className="text-emerald-700">{ri.allocatedQty}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-black font-mono">
                          {isItemRejected ? (
                            <span className="text-slate-400">0</span>
                          ) : (
                            <span className="text-amber-700">{ri.shortfallQty}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isItemRejected ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <Ban className="w-3 h-3 text-rose-600" />
                              Đã từ chối cấp
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                isFullyAllocated
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {isFullyAllocated
                                ? "Đủ hàng từ kho"
                                : `Thiếu ${ri.shortfallQty} ${ri.item.unit} (Sinh đề xuất)`}
                            </span>
                          )}
                        </td>

                        {/* Admin button for pending */}
                        {isAdmin && request.status === "pending" && (
                          <td className="px-4 py-3 text-right">
                            {isItemRejected ? (
                              <button
                                type="button"
                                onClick={() => handleToggleRejectItem(ri.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3 text-slate-500" />
                                <span>Khôi phục</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleRejectItem(ri.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                              >
                                <XCircle className="w-3 h-3 text-rose-600" />
                                <span>Từ chối món này</span>
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Admin Action Buttons if Pending */}
          {isAdmin && request.status === "pending" && (
            <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
              <button
                onClick={() => setIsRejectModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Từ chối toàn bộ yêu cầu</span>
              </button>

              <button
                onClick={handleOpenApprove}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Duyệt Yêu Cầu Này</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Approve Modal */}
      {request && (
        <ApproveModal
          isOpen={isApproveModalOpen}
          onClose={() => setIsApproveModalOpen(false)}
          onConfirm={handleApproveConfirm}
          purpose={request.purpose}
          requesterName={request.requester.fullName}
          neededDate={new Date(request.neededDate).toLocaleDateString("vi-VN")}
          items={request.requestItems}
          rejectedItemIds={rejectedItemIds}
        />
      )}

      {/* Reject Modal */}
      <RejectModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={handleRejectConfirm}
        purpose={request.purpose}
      />
    </div>
  );
}

"use client";

import React, { useState } from "react";
import {
  X,
  PackageCheck,
  Calendar,
  User as UserIcon,
  AlertCircle,
  Loader2,
  FileText,
  Sparkles,
  Layers,
  Recycle,
} from "lucide-react";

interface DisbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  request: any;
}

export function DisbursementModal({
  isOpen,
  onClose,
  onSuccess,
  request,
}: DisbursementModalProps) {
  if (!isOpen || !request) return null;

  const [items, setItems] = useState<any[]>(() => {
    return (request.requestItems || [])
      .filter((ri: any) => ri.status === "approved" && ri.allocatedQty > 0)
      .map((ri: any) => ({
        requestItemId: ri.id,
        itemId: ri.itemId,
        itemName: ri.item?.name || ri.proposedName || "Đồ dùng",
        itemUnit: ri.item?.unit || ri.proposedUnit || "cái",
        requestedQty: ri.requestedQty,
        allocatedQty: ri.allocatedQty,
        disbursedQty: ri.allocatedQty, // Mặc định cấp đủ số lượng đã phân bổ
        isReusable: true,
      }));
  });

  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleQtyChange = (index: number, val: number) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              disbursedQty: Math.max(0, Math.min(item.allocatedQty, isNaN(val) ? 0 : val)),
            }
          : item
      )
    );
  };

  const handleToggleReusable = (index: number) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, isReusable: !item.isReusable } : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((i) => i.disbursedQty > 0);
    if (validItems.length === 0) {
      setError("Vui lòng nhập số lượng cấp phát lớn hơn 0 cho ít nhất 1 món đồ dùng.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/disbursements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request.id,
          items: validItems,
          note,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Không thể thực hiện cấp phát.");
        setSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Lỗi kết nối máy chủ khi thực hiện cấp phát.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalDisbursedItems = items.reduce((sum, i) => sum + (Number(i.disbursedQty) || 0), 0);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
              <PackageCheck className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Cấp phát đồ dùng cho Giáo viên
              </h2>
              <p className="text-xs text-slate-500">
                Xác nhận bàn giao đồ dùng thực tế và ghi nhận trừ kho
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-sm animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Request Meta Banner */}
          <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2.5 text-xs text-slate-700">
            <div className="flex items-center justify-between gap-2 flex-wrap font-bold">
              <div className="flex items-center gap-1.5 text-slate-900 text-sm">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Mục đích: {request.purpose}</span>
              </div>
              <span className="bg-emerald-100/80 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                ✓ Đã duyệt bởi Quản lý
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-slate-600">
              <div className="flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Người nhận: <strong>{request.requester?.fullName}</strong> ({request.requester?.username})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Ngày cần dùng: <strong>{new Date(request.neededDate).toLocaleDateString("vi-VN")}</strong></span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                Danh sách đồ dùng bàn giao ({items.length} món):
              </span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                Tổng số lượng giao: <strong>{totalDisbursedItems}</strong>
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 text-center w-12">STT</th>
                    <th className="px-3 py-2.5 min-w-[200px]">Tên đồ dùng</th>
                    <th className="px-3 py-2.5 text-center w-20">ĐVT</th>
                    <th className="px-3 py-2.5 text-center w-24">Xin / Duyệt</th>
                    <th className="px-3 py-2.5 text-center w-28">Thực cấp</th>
                    <th className="px-3 py-2.5 text-center w-28">Tái sử dụng?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => (
                    <tr key={it.requestItemId || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-2 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>

                      <td className="px-3 py-2 font-bold text-slate-900">
                        {it.itemName}
                      </td>

                      <td className="px-3 py-2 text-center text-slate-600">
                        {it.itemUnit}
                      </td>

                      <td className="px-3 py-2 text-center font-mono text-slate-600">
                        <span>{it.requestedQty}</span> / <strong className="text-emerald-700">{it.allocatedQty}</strong>
                      </td>

                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max={it.allocatedQty}
                          value={it.disbursedQty}
                          onChange={(e) => handleQtyChange(idx, parseInt(e.target.value, 10))}
                          className="w-20 px-2 py-1.5 bg-emerald-50/50 focus:bg-white border border-emerald-300 focus:border-emerald-500 rounded-xl text-center font-mono font-black text-emerald-900 text-xs shadow-2xs"
                        />
                      </td>

                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleReusable(idx)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                            it.isReusable
                              ? "bg-teal-50 text-teal-800 border-teal-300"
                              : "bg-slate-50 text-slate-400 border-slate-200"
                          }`}
                          title="Đánh dấu đồ dùng này có thể thu hồi tái sử dụng sau khi dùng xong"
                        >
                          <Recycle className="w-3 h-3 text-teal-600" />
                          <span>{it.isReusable ? "Có thể tái dùng" : "Tiêu hao"}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Note Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Ghi chú bàn giao (Ví dụ: Giao cho cô Lan tại phòng kho, dùng cho lớp Mầm 1):
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập ghi chú hoặc địa điểm bàn giao..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>

            <button
              type="submit"
              disabled={submitting || totalDisbursedItems === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PackageCheck className="w-4 h-4" />
              )}
              <span>Xác nhận cấp phát ({totalDisbursedItems} món)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  PackageCheck,
  PackageMinus,
  Calendar,
  User,
  Check,
} from "lucide-react";

export interface RequestItemInfo {
  id: string;
  requestedQty: number;
  allocatedQty: number;
  shortfallQty: number;
  item: {
    name: string;
    unit: string;
    category?: string;
  };
}

interface ApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  purpose: string;
  requesterName: string;
  neededDate?: string;
  items: RequestItemInfo[];
  rejectedItemIds: string[];
}

export function ApproveModal({
  isOpen,
  onClose,
  onConfirm,
  purpose,
  requesterName,
  neededDate,
  items,
  rejectedItemIds,
}: ApproveModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const approvedItems = items.filter((i) => !rejectedItemIds.includes(i.id));
  const rejectedItems = items.filter((i) => rejectedItemIds.includes(i.id));

  const totalAllocated = approvedItems.reduce((sum, i) => sum + i.allocatedQty, 0);
  const totalShortfall = approvedItems.reduce((sum, i) => sum + i.shortfallQty, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Lỗi khi thực hiện duyệt yêu cầu.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg glass-dropdown rounded-3xl border border-emerald-200/90 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 bg-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-emerald-100/80 bg-gradient-to-r from-emerald-50/60 via-teal-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-2xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Xác nhận Duyệt Đơn
              </h2>
              <p className="text-xs text-slate-500">
                Xuất kho thực tế & chuyển phần thiếu thành đề xuất mua
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3.5 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200 flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Target Request Info */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              Yêu cầu được duyệt
            </div>
            <div className="font-bold text-slate-900 text-base">
              {purpose}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-200/70 flex-wrap gap-2">
              <span className="flex items-center gap-1.5 font-medium">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                Giáo viên: <strong className="text-slate-800">{requesterName}</strong>
              </span>
              {neededDate && (
                <span className="flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" />
                  Cần ngày: <strong className="text-slate-800 font-mono">{neededDate}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Allocation Breakdown Summary */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-center gap-2.5">
              <PackageCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <div className="text-emerald-800 font-medium text-[11px]">Xuất kho thật</div>
                <div className="text-emerald-950 font-black font-mono text-sm">{totalAllocated} món</div>
              </div>
            </div>
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 flex items-center gap-2.5">
              <PackageMinus className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <div className="text-amber-800 font-medium text-[11px]">Mua mới (Thiếu)</div>
                <div className="text-amber-950 font-black font-mono text-sm">{totalShortfall} món</div>
              </div>
            </div>
          </div>

          {/* Warning for Rejected Items (if any) */}
          {rejectedItems.length > 0 ? (
            <div className="p-4 bg-amber-50/90 rounded-2xl border border-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>ĐÃ LOẠI BỎ {rejectedItems.length} MÓN KHÔNG CẤP:</span>
              </div>
              <ul className="space-y-1 pl-6 list-disc text-amber-800 font-medium">
                {rejectedItems.map((ri) => (
                  <li key={ri.id}>
                    <strong className="text-slate-800">{ri.item.name}</strong> ({ri.requestedQty} {ri.item.unit})
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-amber-700 italic pt-1 border-t border-amber-200/60">
                * Giáo viên sẽ nhận được thông báo về các món bị từ chối này.
              </p>
            </div>
          ) : (
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs text-slate-600 flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Duyệt toàn bộ <strong>{approvedItems.length} món</strong> theo yêu cầu của giáo viên.</span>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Xác nhận Duyệt đơn</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

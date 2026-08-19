"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, AlertCircle, XCircle } from "lucide-react";

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  purpose?: string;
}

export function RejectModal({ isOpen, onClose, onConfirm, purpose }: RejectModalProps) {
  const [mounted, setMounted] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError("Vui lòng nhập lý do từ chối yêu cầu này.");
      return;
    }

    setLoading(true);

    try {
      await onConfirm(reason.trim());
      setReason("");
      onClose();
    } catch (err: any) {
      setError(err?.message || "Lỗi khi thực hiện từ chối.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md glass-dropdown rounded-3xl border border-rose-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 bg-white">
        <div className="flex items-center justify-between p-6 border-b border-rose-100 bg-gradient-to-r from-rose-50/60 via-red-50/30 to-white">
          <div className="flex items-center gap-3 text-rose-700">
            <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Từ chối Yêu cầu Đồ dùng
              </h2>
              <p className="text-xs text-slate-500">Giải phóng số lượng giữ chỗ tạm thời</p>
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
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {purpose && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-500 font-bold">Chủ đề yêu cầu:</span>{" "}
              <strong className="text-slate-900">{purpose}</strong>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Lý do từ chối <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Không đúng quy định hoạt động, Hết kinh phí mua sắm đợt này..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 focus:bg-white transition-all resize-none font-medium"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md shadow-rose-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              <span>Xác nhận từ chối</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

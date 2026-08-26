"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, PackageCheck, Coins } from "lucide-react";

interface ProposalItemInfo {
  id: string;
  qty: number;
  status: string;
  proposedName?: string | null;
  proposedUnit?: string | null;
  proposedPrice?: number | null;
  item?: {
    name: string;
    unit: string;
    price?: number | null;
  } | null;
  sourceRequest: {
    purpose: string;
    requester: {
      fullName: string;
    };
  };
}

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  proposal: ProposalItemInfo | null;
}

export function ReceiveModal({ isOpen, onClose, onSuccess, proposal }: ReceiveModalProps) {
  const [mounted, setMounted] = useState(false);
  const [receivedQty, setReceivedQty] = useState<number>(1);
  const [price, setPrice] = useState<string>("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (proposal && isOpen) {
      setReceivedQty(proposal.qty);
      const initialPrice = proposal.item?.price ?? proposal.proposedPrice ?? "";
      setPrice(initialPrice ? String(initialPrice) : "");
      setNote(`Nhập kho từ đề xuất mua (Chủ đề: "${proposal.sourceRequest?.purpose || "Mua sắm"}")`);
      setError(null);
    }
  }, [proposal, isOpen]);

  if (!isOpen || !proposal || !mounted) return null;

  const itemName = proposal.item?.name || proposal.proposedName || "Món đề xuất mới";
  const itemUnit = proposal.item?.unit || proposal.proposedUnit || "cái";
  const numericPrice = parseFloat(price) || 0;
  const totalAmount = receivedQty * numericPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (receivedQty <= 0) {
      setError("Số lượng thực nhận phải lớn hơn 0.");
      return;
    }

    setLoading(true);

    try {
      const parsedPrice = price.trim() !== "" && !isNaN(parseFloat(price)) ? Math.max(0, parseFloat(price)) : undefined;

      const res = await fetch(`/api/purchase-proposals/${proposal.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receivedQty,
          price: parsedPrice,
          note: note.trim() || undefined,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        // response might not be JSON
      }

      if (!res.ok) {
        setError(data.error || `Lỗi máy chủ (${res.status}): Không thể thực hiện nhập kho.`);
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Lỗi kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md glass-dropdown rounded-3xl border border-emerald-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 bg-white">
        <div className="flex items-center justify-between p-6 border-b border-emerald-100 bg-gradient-to-r from-emerald-50/60 via-teal-50/40 to-white">
          <div className="flex items-center gap-3 text-emerald-700">
            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Xác nhận Nhập kho
              </h2>
              <p className="text-xs text-slate-500">Ghi nhận hàng mua về, cập nhật giá & cộng tồn kho</p>
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
          <div className="mx-6 mt-4 p-3.5 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
            <div className="text-slate-500 font-medium">Mặt hàng nhập:</div>
            <div className="font-bold text-slate-900 text-sm">{itemName}</div>
            <div className="text-slate-500 flex items-center justify-between pt-1">
              <span>Số lượng đề xuất: <strong className="text-slate-700 font-mono">{proposal.qty} {itemUnit}</strong></span>
              <span>Yêu cầu: <strong className="text-slate-700">{proposal.sourceRequest?.purpose}</strong></span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Số lượng thực nhận ({itemUnit}) <span className="text-rose-600">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={receivedQty}
              onChange={(e) => setReceivedQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all font-bold"
              required
            />
          </div>

          {/* Trường Nhập Giá Mua Thực Tế */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Đơn giá mua / Nhập giá (VNĐ)</span>
              <span className="text-[10px] text-slate-400 font-normal lowercase">(cập nhật vào kho)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={1000}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="VD: 25000"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all font-bold pr-10"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                đ
              </span>
            </div>

            {numericPrice > 0 && (
              <div className="flex items-center justify-between pt-1.5 px-1 text-xs">
                <span className="text-slate-500 font-medium">Tổng tiền nhập ({receivedQty} {itemUnit}):</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  {totalAmount.toLocaleString("vi-VN")} đ
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Ghi chú nhập hàng
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Nhận đủ từ nhà cung cấp ABC..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all font-medium"
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
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
              <span>Xác nhận Nhập kho</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, PackageCheck } from "lucide-react";
import { ItemData } from "./ItemModal";

interface StockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: ItemData | null;
}

export function StockInModal({ isOpen, onClose, onSuccess, item }: StockInModalProps) {
  const [mounted, setMounted] = useState(false);
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [price, setPrice] = useState<string>("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (item && isOpen) {
      setAddQuantity(1);
      setPrice(item.price ? String(item.price) : "");
      setNote("");
      setError(null);
    }
  }, [item, isOpen]);

  if (!isOpen || !item || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (addQuantity <= 0) {
      setError("Số lượng nhập kho phải lớn hơn 0.");
      return;
    }

    setLoading(true);

    try {
      const parsedPrice = price.trim() !== "" ? parseFloat(price) : undefined;

      const res = await fetch(`/api/items/${item.id}/stock-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addQuantity,
          price: parsedPrice,
          note: note.trim() || "Nhập kho thủ công",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Không thể thực hiện nhập kho.");
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Lỗi kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md glass-dropdown rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 bg-white">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Nhập kho thủ công
              </h2>
              <p className="text-xs text-slate-500">Cộng dồn số lượng & cập nhật giá vào kho</p>
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
            <div className="font-bold text-slate-900 text-sm">{item.name}</div>
            <div className="text-slate-500 flex items-center gap-2 pt-1 font-mono">
              <span>Tồn hiện tại: <strong className="text-emerald-700">{item.quantity}</strong> {item.unit}</span>
              {item.price ? <span>• Giá hiện tại: <strong className="text-slate-700">{item.price.toLocaleString("vi-VN")} đ</strong></span> : null}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Số lượng nhập thêm ({item.unit}) <span className="text-rose-600">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={addQuantity}
              onChange={(e) => setAddQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all font-bold"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Cập nhật đơn giá (VNĐ)
              </label>
              <span className="text-[10px] text-slate-400 font-normal">Để trống nếu giữ giá cũ</span>
            </div>
            <input
              type="number"
              min={0}
              step={500}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={item.price ? `Giá hiện tại: ${item.price.toLocaleString("vi-VN")} đ` : "Chưa có giá (VD: 25000)"}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Ghi chú nhập kho
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Mua lẻ bổ sung, Nhà trường cấp đợt 2..."
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
              <span>Xác nhận nhập kho</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

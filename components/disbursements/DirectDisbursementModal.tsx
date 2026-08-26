"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  PackageCheck,
  Plus,
  Trash2,
  Loader2,
  User,
  Calendar,
  Layers,
  Sparkles,
  RotateCcw,
  Search,
  Check,
  Calculator,
  Coins,
} from "lucide-react";
import { useToast } from "@/components/common/Toast";

interface UserOption {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  availableQuantity: number;
  price?: number | null;
  imageUrl?: string | null;
}

interface ThemeOption {
  id: string;
  name: string;
  icon?: string | null;
}

interface SelectedDisburseItem {
  itemId: string;
  name: string;
  unit: string;
  stockQty: number;
  price: number;
  disbursedQty: number;
  isReusable: boolean;
}

interface DirectDisbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (disbursement: any) => void;
}

export function DirectDisbursementModal({
  isOpen,
  onClose,
  onSuccess,
}: DirectDisbursementModalProps) {
  const [mounted, setMounted] = useState(false);
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();

  // Form states
  const [users, setUsers] = useState<UserOption[]>([]);
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);

  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [selectedThemeId, setSelectedThemeId] = useState("");
  const [note, setNote] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedDisburseItem[]>([]);

  // Item Picker state
  const [selectedItemToAdd, setSelectedItemToAdd] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Reset form
      setSelectedRecipientId("");
      setPurpose("");
      setSelectedThemeId("");
      setNote("");
      setSelectedItems([]);
      setSelectedItemToAdd("");
      setItemSearchQuery("");

      // Fetch initial dependencies
      setLoadingInitial(true);
      Promise.all([
        fetch("/api/users").then((res) => (res.ok ? res.json() : { users: [] })),
        fetch("/api/themes").then((res) => (res.ok ? res.json() : { themes: [] })),
        fetch("/api/items").then((res) => (res.ok ? res.json() : { items: [] })),
      ])
        .then(([usersData, themesData, itemsData]) => {
          setUsers(usersData.users || []);
          setThemes(themesData.themes || []);
          // Chỉ lấy các mặt hàng có tồn kho > 0
          const inStockItems = (itemsData.items || []).filter(
            (it: InventoryItem) => it.quantity > 0
          );
          setInventoryItems(inStockItems);
        })
        .catch((err) => {
          console.error("Fetch direct disbursement data error:", err);
          toastError("Không thể tải danh sách dữ liệu kho.");
        })
        .finally(() => setLoadingInitial(false));
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  // Lọc danh sách đồ dùng chưa được chọn và còn tồn kho
  const availableToAdd = inventoryItems.filter(
    (inv) =>
      !selectedItems.some((si) => si.itemId === inv.id) &&
      (itemSearchQuery.trim() === "" ||
        inv.name.toLowerCase().includes(itemSearchQuery.toLowerCase()))
  );

  const handleAddItem = (item: InventoryItem) => {
    const defaultQty = 1;
    setSelectedItems((prev) => [
      ...prev,
      {
        itemId: item.id,
        name: item.name,
        unit: item.unit,
        stockQty: item.quantity,
        price: item.price || 0,
        disbursedQty: Math.min(defaultQty, item.quantity),
        isReusable: item.category === "ngoai_khoa" || item.category === "hoc_tap",
      },
    ]);
    setSelectedItemToAdd("");
    setItemSearchQuery("");
  };

  const handleUpdateQty = (itemId: string, qty: number) => {
    setSelectedItems((prev) =>
      prev.map((it) => {
        if (it.itemId !== itemId) return it;
        const validQty = Math.max(1, Math.min(qty, it.stockQty));
        return { ...it, disbursedQty: validQty };
      })
    );
  };

  const handleToggleReusable = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.map((it) => (it.itemId === itemId ? { ...it, isReusable: !it.isReusable } : it))
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems((prev) => prev.filter((it) => it.itemId !== itemId));
  };

  // Tính toán tóm tắt
  const totalItemCount = selectedItems.length;
  const totalDisbursedQty = selectedItems.reduce((acc, it) => acc + (it.disbursedQty || 0), 0);
  const totalEstimatedCost = selectedItems.reduce(
    (acc, it) => acc + (it.disbursedQty || 0) * it.price,
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRecipientId) {
      toastWarning("Vui lòng chọn người nhận đồ dùng (Giáo viên / Nhân viên).");
      return;
    }

    if (!purpose.trim()) {
      toastWarning("Vui lòng nhập mục đích hoặc chủ đề cấp phát.");
      return;
    }

    if (selectedItems.length === 0) {
      toastWarning("Vui lòng chọn ít nhất 1 mặt hàng có trong kho để cấp phát.");
      return;
    }

    // Kiểm tra số lượng hợp lệ
    for (const it of selectedItems) {
      if (it.disbursedQty <= 0) {
        toastWarning(`Số lượng cấp phát cho "${it.name}" phải lớn hơn 0.`);
        return;
      }
      if (it.disbursedQty > it.stockQty) {
        toastWarning(`Mặt hàng "${it.name}" chỉ còn ${it.stockQty} ${it.unit} trong kho.`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/disbursements/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: selectedRecipientId,
          purpose: purpose.trim(),
          themeId: selectedThemeId || null,
          note: note.trim() || undefined,
          items: selectedItems.map((it) => ({
            itemId: it.itemId,
            disbursedQty: it.disbursedQty,
            isReusable: it.isReusable,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toastError(data.error || "Không thể tạo phiếu cấp phát trực tiếp.");
        setSubmitting(false);
        return;
      }

      toastSuccess(data.message || "Tạo phiếu cấp phát trực tiếp thành công!");
      onSuccess(data.disbursement);
      onClose();
    } catch (err: any) {
      console.error("Direct disbursement submit error:", err);
      toastError("Lỗi kết nối máy chủ khi tạo phiếu cấp phát.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-emerald-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-emerald-100 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-xs">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Tạo Phiếu Cấp Phát Trực Tiếp
              </h2>
              <p className="text-xs text-slate-500">
                Bàn giao ngay đồ dùng có sẵn trong kho cho giáo viên & xuất biên bản giao nhận
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

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">
          {loadingInitial ? (
            <div className="py-12 text-center space-y-2">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-600 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Đang nạp danh mục đồ dùng & giáo viên...</p>
            </div>
          ) : (
            <>
              {/* Row 1: Người nhận & Chủ đề */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Người nhận bàn giao <span className="text-rose-600">*</span></span>
                  </label>
                  <select
                    value={selectedRecipientId}
                    onChange={(e) => setSelectedRecipientId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="">-- Chọn Giáo viên / Người nhận --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.role === "teacher" ? "Giáo viên" : u.role === "manager" ? "Quản lý" : u.role === "stocker" ? "Thủ kho" : "Admin"}) - @{u.username}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Gắn với Chủ đề / Sự kiện (Tùy chọn)</span>
                  </label>
                  <select
                    value={selectedThemeId}
                    onChange={(e) => {
                      setSelectedThemeId(e.target.value);
                      const matched = themes.find((t) => t.id === e.target.value);
                      if (matched && !purpose) {
                        setPurpose(matched.name);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="">-- Không gắn chủ đề riêng --</option>
                    {themes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.icon || "🎯"} {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Mục đích / Hoạt động */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mục đích / Hoạt động cấp phát <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="VD: Cấp phát đồ dùng góc trải nghiệm sáng tạo tuần 35, Hoạt động ngoài trời..."
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all font-medium"
                />
              </div>

              {/* Section 3: Chọn Đồ Dùng Có Sẵn Trong Kho */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4 text-emerald-600" />
                    <span>Danh sách đồ dùng cấp phát ({selectedItems.length} món)</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Kho hiện có: <strong className="text-emerald-700">{inventoryItems.length} món sẵn có</strong>
                  </span>
                </div>

                {/* Dropdown / Search picker to add item */}
                <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={itemSearchQuery}
                        onChange={(e) => setItemSearchQuery(e.target.value)}
                        placeholder="Tìm nhanh mặt hàng trong kho để thêm..."
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* List of quick matching items to add */}
                  <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 bg-white rounded-xl border border-slate-200">
                    {availableToAdd.length === 0 ? (
                      <div className="p-3 text-center text-slate-400 text-xs italic">
                        {inventoryItems.length === 0
                          ? "Kho hiện tại chưa có mặt hàng nào có sẵn số lượng > 0"
                          : "Đã chọn hết các mặt hàng phù hợp"}
                      </div>
                    ) : (
                      availableToAdd.slice(0, 10).map((inv) => (
                        <div
                          key={inv.id}
                          onClick={() => handleAddItem(inv)}
                          className="p-2.5 flex items-center justify-between hover:bg-emerald-50/60 cursor-pointer transition-colors text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{inv.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                              {inv.category === "hoc_tap" ? "Học tập" : "Ngoại khóa"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-emerald-700 font-mono font-bold">
                              Tồn: {inv.quantity} {inv.unit}
                            </span>
                            {inv.price ? (
                              <span className="text-slate-500 font-mono text-[11px]">
                                {inv.price.toLocaleString("vi-VN")} đ
                              </span>
                            ) : null}
                            <button
                              type="button"
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-colors"
                            >
                              + Thêm
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Table of selected items */}
                {selectedItems.length > 0 && (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="px-3.5 py-2.5">Đồ dùng</th>
                          <th className="px-3 py-2.5 text-center">Tồn kho</th>
                          <th className="px-3 py-2.5 text-center">SL Cấp phát</th>
                          <th className="px-3 py-2.5 text-right">Đơn giá</th>
                          <th className="px-3 py-2.5 text-right">Thành tiền</th>
                          <th className="px-3 py-2.5 text-center">Thu hồi / Tái SD</th>
                          <th className="px-2 py-2.5 text-center">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedItems.map((it) => (
                          <tr key={it.itemId} className="hover:bg-slate-50/70">
                            <td className="px-3.5 py-2.5 font-bold text-slate-800">
                              {it.name}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-600">
                              {it.stockQty} {it.unit}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <input
                                type="number"
                                min={1}
                                max={it.stockQty}
                                value={it.disbursedQty}
                                onChange={(e) =>
                                  handleUpdateQty(it.itemId, parseInt(e.target.value, 10) || 1)
                                }
                                className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:bg-white"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-slate-600 whitespace-nowrap">
                              {it.price > 0 ? `${it.price.toLocaleString("vi-VN")} đ` : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              {it.price > 0
                                ? `${(it.disbursedQty * it.price).toLocaleString("vi-VN")} đ`
                                : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleReusable(it.itemId)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                                  it.isReusable
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-slate-100 text-slate-500 border-slate-200"
                                }`}
                              >
                                {it.isReusable ? "Thu hồi / Tái SD" : "Tiêu hao"}
                              </button>
                            </td>
                            <td className="px-2 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(it.itemId)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Xóa món này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Summary Box */}
                {selectedItems.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/60 to-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4">
                      <span>📦 <strong>{totalItemCount}</strong> mặt hàng</span>
                      <span>🔢 Tổng SL: <strong className="font-mono text-emerald-800">{totalDisbursedQty}</strong> món</span>
                    </div>
                    {totalEstimatedCost > 0 && (
                      <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                        <Coins className="w-4 h-4 text-emerald-600" />
                        <span>Trị giá tạm tính:</span>
                        <strong className="font-mono text-sm text-emerald-700">
                          {totalEstimatedCost.toLocaleString("vi-VN")} đ
                        </strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 4: Ghi chú */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Ghi chú bàn giao
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: Bàn giao trực tiếp tại kho cho cô giáo, hẹn hoàn trả sau khi kết thúc sự kiện..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all font-medium"
                />
              </div>
            </>
          )}

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || selectedItems.length === 0 || loadingInitial}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý xuất kho...</span>
                </>
              ) : (
                <>
                  <PackageCheck className="w-4 h-4" />
                  <span>Xác nhận & Cấp phát ngay</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

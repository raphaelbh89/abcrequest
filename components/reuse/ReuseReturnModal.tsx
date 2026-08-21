"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Recycle,
  Search,
  Package,
  AlertCircle,
  Loader2,
  PiggyBank,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
} from "lucide-react";

interface ReturnItemState {
  itemId: string;
  itemName: string;
  itemUnit: string;
  itemPrice: number;
  disbursementItemId?: string;
  disbursedQty?: number;
  alreadyReturnedQty?: number;
  maxCanReturn: number;
  returnedQty: number;
  condition: "tot" | "kha" | "trung_binh";
  selected: boolean;
}

interface ReuseReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReuseReturnModal({
  isOpen,
  onClose,
  onSuccess,
}: ReuseReturnModalProps) {
  const [returnType, setReturnType] = useState<"from_disbursement" | "direct">("from_disbursement");
  
  // Data for selection
  const [disbursements, setDisbursements] = useState<any[]>([]);
  const [selectedDisbursementId, setSelectedDisbursementId] = useState<string>("");
  const [allItems, setAllItems] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState<string>("");

  // Items to return (Multi-item list)
  const [returnItems, setReturnItems] = useState<ReturnItemState[]>([]);
  
  // Common fields
  const [globalCondition, setGlobalCondition] = useState<"tot" | "kha" | "trung_binh">("tot");
  const [returnerName, setReturnerName] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial data on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    Promise.all([
      fetch("/api/disbursements").then((r) => r.json()),
      fetch("/api/items").then((r) => r.json()),
    ])
      .then(([dataDisb, dataItems]) => {
        if (!isMounted) return;
        if (dataDisb?.disbursements) {
          setDisbursements(dataDisb.disbursements);
        }
        if (dataItems?.items) {
          setAllItems(dataItems.items);
        }
      })
      .catch((err) => {
        console.error("Lỗi khi tải dữ liệu khởi tạo:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // When selected disbursement changes, populate all items from that voucher
  const handleSelectDisbursement = (id: string) => {
    setSelectedDisbursementId(id);
    const found = disbursements.find((d) => d.id === id);
    if (found) {
      setReturnerName(found.recipient?.fullName || "");
      const itemsList: ReturnItemState[] = (found.items || []).map((it: any) => {
        const alreadyReturned = it.returnedQty || 0;
        const maxCan = Math.max(0, it.disbursedQty - alreadyReturned);
        return {
          itemId: it.itemId || it.item?.id || "",
          itemName: it.itemName || it.item?.name || "Đồ dùng",
          itemUnit: it.itemUnit || it.item?.unit || "cái",
          itemPrice: it.item?.price || 0,
          disbursementItemId: it.id,
          disbursedQty: it.disbursedQty,
          alreadyReturnedQty: alreadyReturned,
          maxCanReturn: maxCan,
          returnedQty: maxCan, // Mặc định điền toàn bộ số lượng còn lại
          condition: globalCondition,
          selected: maxCan > 0,
        };
      });
      setReturnItems(itemsList);
    } else {
      setReturnItems([]);
      setReturnerName("");
    }
  };

  // Change quantity for a specific item
  const handleItemQtyChange = (index: number, val: number) => {
    setReturnItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const clampedQty = Math.max(0, item.maxCanReturn ? Math.min(item.maxCanReturn, val) : val);
        return {
          ...item,
          returnedQty: isNaN(clampedQty) ? 0 : clampedQty,
          selected: clampedQty > 0,
        };
      })
    );
  };

  // Toggle selection for an item
  const handleToggleSelectItem = (index: number) => {
    setReturnItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const newSelected = !item.selected;
        return {
          ...item,
          selected: newSelected,
          returnedQty: newSelected && item.returnedQty === 0 ? (item.maxCanReturn || 1) : item.returnedQty,
        };
      })
    );
  };

  // Change condition for a specific item
  const handleItemConditionChange = (index: number, cond: "tot" | "kha" | "trung_binh") => {
    setReturnItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, condition: cond } : item))
    );
  };

  // Add direct item from inventory search
  const handleAddDirectItem = (invItem: any) => {
    const existingIdx = returnItems.findIndex((it) => it.itemId === invItem.id);
    if (existingIdx >= 0) {
      // Increase quantity of existing
      handleItemQtyChange(existingIdx, returnItems[existingIdx].returnedQty + 1);
    } else {
      setReturnItems((prev) => [
        ...prev,
        {
          itemId: invItem.id,
          itemName: invItem.name,
          itemUnit: invItem.unit,
          itemPrice: invItem.price || 0,
          maxCanReturn: 9999,
          returnedQty: 1,
          condition: globalCondition,
          selected: true,
        },
      ]);
    }
  };

  // Remove direct item from list
  const handleRemoveItem = (index: number) => {
    setReturnItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Quick action: Select All / Deselect All
  const handleToggleSelectAll = (select: boolean) => {
    setReturnItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: select,
        returnedQty: select && item.returnedQty === 0 ? item.maxCanReturn : item.returnedQty,
      }))
    );
  };

  // Submit all selected items in batch
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = returnItems.filter((i) => i.selected && i.returnedQty > 0);

    if (validItems.length === 0) {
      setError("Vui lòng tích chọn và nhập số lượng tái sử dụng lớn hơn 0 cho ít nhất 1 món.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/reuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disbursementId: returnType === "from_disbursement" ? selectedDisbursementId : null,
          returnerName: returnerName || "Giáo viên hoàn trả",
          note,
          items: validItems.map((it) => ({
            itemId: it.itemId,
            disbursementItemId: it.disbursementItemId || null,
            returnedQty: it.returnedQty,
            condition: it.condition || globalCondition,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Không thể nhập đồ dùng tái sử dụng.");
        setSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Lỗi máy chủ khi nhập đồ dùng tái sử dụng.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const activeSelectedItems = returnItems.filter((it) => it.selected && it.returnedQty > 0);
  const totalReturnedQty = activeSelectedItems.reduce((sum, it) => sum + it.returnedQty, 0);
  const totalSavings = activeSelectedItems.reduce(
    (sum, it) => sum + it.itemPrice * it.returnedQty,
    0
  );

  const filteredDirectItems = allItems.filter((it) =>
    it.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[94vh] flex flex-col">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-teal-50/80 via-emerald-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-teal-100 text-teal-800 border border-teal-200 shadow-2xs">
              <Recycle className="w-6 h-6 text-teal-700" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Nhập đồ dùng tái sử dụng vào kho
              </h2>
              <p className="text-xs text-slate-500">
                Thu hồi đồng thời nhiều món giáo cụ, đạo cụ còn tốt sau khi sử dụng để tăng lại tồn kho
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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-sm animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setReturnType("from_disbursement");
                setReturnItems([]);
              }}
              className={`py-2 px-3 rounded-xl transition-all cursor-pointer text-center ${
                returnType === "from_disbursement"
                  ? "bg-white text-teal-800 shadow-xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              1. Thu hồi từ phiếu cấp phát (Nhiều món)
            </button>

            <button
              type="button"
              onClick={() => {
                setReturnType("direct");
                setReturnItems([]);
                setSelectedDisbursementId("");
              }}
              className={`py-2 px-3 rounded-xl transition-all cursor-pointer text-center ${
                returnType === "direct"
                  ? "bg-white text-teal-800 shadow-xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              2. Nhập trực tiếp từ kho (Tùy chọn món)
            </button>
          </div>

          {/* Mode 1: From Disbursement */}
          {returnType === "from_disbursement" && (
            <div className="space-y-2 p-4 bg-teal-50/40 rounded-2xl border border-teal-200/70">
              <label className="block text-xs font-bold text-slate-800">
                Chọn Phiếu cấp phát đã bàn giao cho Giáo viên:
              </label>

              <select
                value={selectedDisbursementId}
                onChange={(e) => handleSelectDisbursement(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
              >
                <option value="">-- Chọn phiếu cấp phát để tải danh sách món --</option>
                {disbursements.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} - {d.recipient?.fullName} ({d.request?.purpose})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mode 2: Direct Search Item Addition */}
          {returnType === "direct" && (
            <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-800">
                Tìm và thêm món đồ dùng vào danh sách thu hồi:
              </label>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Gõ tên đồ dùng để tìm nhanh..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs"
                />
              </div>

              {itemSearch && (
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 bg-white p-2 rounded-xl border border-slate-200">
                  {filteredDirectItems.slice(0, 8).map((it) => (
                    <div
                      key={it.id}
                      onClick={() => {
                        handleAddDirectItem(it);
                        setItemSearch("");
                      }}
                      className="p-2 rounded-lg border border-slate-100 hover:border-teal-300 hover:bg-teal-50/40 flex items-center justify-between cursor-pointer transition-all"
                    >
                      <span className="text-xs font-bold text-slate-800">{it.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 font-mono">Tồn: {it.quantity} {it.unit}</span>
                        <span className="text-xs font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Thêm
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Multi-Item Return Table */}
          {returnItems.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <span>Danh sách đồ dùng thu hồi ({returnItems.length} món):</span>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(true)}
                    className="text-[11px] text-teal-700 hover:underline font-bold"
                  >
                    Chọn tất cả
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(false)}
                    className="text-[11px] text-slate-500 hover:underline"
                  >
                    Bỏ chọn
                  </button>
                </div>

                <span className="font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200">
                  Đã chọn: <strong>{activeSelectedItems.length}</strong> món (Tổng: <strong>{totalReturnedQty}</strong>)
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5 text-center w-10">Chọn</th>
                      <th className="px-3 py-2.5 min-w-[180px]">Tên đồ dùng</th>
                      <th className="px-3 py-2.5 text-center w-24">Đã giao / Còn</th>
                      <th className="px-3 py-2.5 text-center w-28">Số lượng trả</th>
                      <th className="px-3 py-2.5 text-center w-36">Chất lượng</th>
                      {returnType === "direct" && <th className="px-2 py-2.5 text-center w-12">Xóa</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {returnItems.map((it, idx) => (
                      <tr
                        key={it.disbursementItemId || it.itemId || idx}
                        className={`transition-colors ${
                          it.selected ? "bg-teal-50/20 hover:bg-teal-50/40" : "opacity-60 hover:opacity-100 bg-white"
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectItem(idx)}
                            className="text-teal-600 cursor-pointer"
                          >
                            {it.selected ? (
                              <CheckSquare className="w-4 h-4 text-teal-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </td>

                        {/* Name */}
                        <td className="px-3 py-2 font-bold text-slate-900">
                          <div>
                            <p>{it.itemName}</p>
                            {it.itemPrice > 0 && (
                              <p className="text-[10px] text-slate-400 font-mono font-normal">
                                Đơn giá: {it.itemPrice.toLocaleString("vi-VN")} đ/{it.itemUnit}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Disbursed / Max Remaining */}
                        <td className="px-3 py-2 text-center text-slate-600 font-mono text-[11px]">
                          {it.disbursedQty !== undefined ? (
                            <span>{it.disbursedQty} / <strong className="text-teal-700">{it.maxCanReturn}</strong> {it.itemUnit}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Input Qty */}
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max={it.maxCanReturn || 9999}
                              value={it.returnedQty}
                              onChange={(e) => handleItemQtyChange(idx, parseInt(e.target.value, 10))}
                              className="w-18 px-2 py-1.5 bg-teal-50/70 focus:bg-white border border-teal-300 focus:border-teal-500 rounded-xl text-center font-mono font-black text-teal-900 text-xs shadow-2xs"
                            />
                            <span className="text-[11px] text-slate-500">{it.itemUnit}</span>
                          </div>
                        </td>

                        {/* Condition Selector */}
                        <td className="px-3 py-2 text-center">
                          <select
                            value={it.condition}
                            onChange={(e) => handleItemConditionChange(idx, e.target.value as any)}
                            className="px-2 py-1 bg-white border border-slate-200 focus:border-teal-500 rounded-lg text-[11px] font-bold text-slate-700"
                          >
                            <option value="tot">🌟 Tốt (90-100%)</option>
                            <option value="kha">✨ Khá (70-80%)</option>
                            <option value="trung_binh">🔧 TB (50-60%)</option>
                          </select>
                        </td>

                        {/* Remove button for direct mode */}
                        {returnType === "direct" && (
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Teacher Name & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Tên giáo viên / Lớp hoàn trả:
              </label>
              <input
                type="text"
                value={returnerName}
                onChange={(e) => setReturnerName(e.target.value)}
                placeholder="Ví dụ: Cô Lan (Lớp Mầm 1)"
                className="w-full px-3.5 py-2 text-xs text-slate-900 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-teal-500 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Ghi chú đợt thu hồi:
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Đồ dùng sau giờ vẽ Mùa xuân"
                className="w-full px-3.5 py-2 text-xs text-slate-900 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-teal-500 rounded-xl"
              />
            </div>
          </div>

          {/* Estimated Total Savings Badge */}
          {totalSavings > 0 && (
            <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-900 font-bold">
                <PiggyBank className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="font-bold">Tổng giá trị ngân sách tiết kiệm ({activeSelectedItems.length} món):</p>
                  <p className="text-[11px] text-slate-500 font-normal">Tự động tính theo đơn giá tham khảo</p>
                </div>
              </div>
              <span className="font-mono font-black text-emerald-700 text-base">
                +{totalSavings.toLocaleString("vi-VN")} đ
              </span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={submitting || activeSelectedItems.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 rounded-xl shadow-md shadow-teal-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Recycle className="w-4 h-4" />
              )}
              <span>Xác nhận nhập kho ({activeSelectedItems.length} món - {totalReturnedQty} số lượng)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

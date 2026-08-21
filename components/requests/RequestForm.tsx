"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {Boxes,
  Calendar,
  FileText,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PackageCheck,
  PackageMinus,
  Sparkles,
  Layers,
  ExternalLink,
  Info,
} from "lucide-react";
import { ItemSearchSelector } from "@/components/common/ItemSearchSelector";

interface ItemAvailability {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  pendingAllocatedQty: number;
  availableQuantity: number;
}

interface SelectedItem {
  id: string;
  itemId?: string | null;
  name: string;
  unit: string;
  availableQuantity: number;
  requestedQty: number;
  imageUrl?: string | null;
  isNewItemProposal?: boolean;
  proposedPrice?: number | null;
  proposedImageUrl?: string | null;
  proposedSourceUrl?: string | null;
}

interface CreatedRequestResult {
  id: string;
  purpose: string;
  neededDate: string;
  status: string;
  requestItems: Array<{
    id: string;
    requestedQty: number;
    allocatedQty: number;
    shortfallQty: number;
    isNewItemProposal?: boolean;
    proposedName?: string | null;
    proposedUnit?: string | null;
    item?: {
      name: string;
      unit: string;
    } | null;
  }>;
}

export function RequestForm() {
  const router = useRouter();

  // Form states
  const [purpose, setPurpose] = useState("");
  const [neededDate, setNeededDate] = useState("");
  const [note, setNote] = useState("");

  // Items availability
  const [availableItems, setAvailableItems] = useState<ItemAvailability[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  // Selected items list
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultRequest, setResultRequest] = useState<CreatedRequestResult | null>(null);

  // Fetch real-time items availability
  const fetchAvailability = async () => {
    setLoadingItems(true);
    try {
      const res = await fetch("/api/items/availability");
      const data = await res.json();
      if (res.ok) {
        setAvailableItems(data.items || []);
      }
    } catch (err) {
      console.error("Fetch availability error:", err);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
    // Default needed date = 3 days from now
    const d = new Date();
    d.setDate(d.getDate() + 3);
    setNeededDate(d.toISOString().split("T")[0]);
  }, []);

  // Chọn món có sẵn trong kho nội bộ
  const handleSelectInternalItem = (item: {
    id: string;
    name: string;
    unit: string;
    availableQuantity: number;
    imageUrl?: string | null;
  }) => {
    if (selectedItems.some((si) => si.itemId === item.id)) {
      return;
    }
    setSelectedItems((prev) => [
      ...prev,
      {
        id: item.id,
        itemId: item.id,
        name: item.name,
        unit: item.unit,
        availableQuantity: item.availableQuantity,
        requestedQty: 1,
        imageUrl: item.imageUrl,
        isNewItemProposal: false,
      },
    ]);
  };

  // Chọn món đề xuất mới từ tìm kiếm mở rộng (Chưa có trong kho)
  const handleSelectExternalProposal = (proposal: {
    name: string;
    unit: string;
    price?: number | null;
    imageUrl?: string | null;
    sourceUrl?: string | null;
  }) => {
    const proposalId = `proposal-${Date.now()}`;
    setSelectedItems((prev) => [
      ...prev,
      {
        id: proposalId,
        itemId: null,
        name: proposal.name,
        unit: proposal.unit,
        availableQuantity: 0,
        requestedQty: 1,
        imageUrl: proposal.imageUrl,
        isNewItemProposal: true,
        proposedPrice: proposal.price,
        proposedImageUrl: proposal.imageUrl,
        proposedSourceUrl: proposal.sourceUrl,
      },
    ]);

    setNotification(
      `✨ Đã thêm đề xuất mặt hàng mới: "${proposal.name}" (Chưa có trong kho trường — Số lượng coi như 100% cần mua).`
    );
    setTimeout(() => setNotification(null), 6000);
  };

  const handleRemoveItem = (id: string) => {
    setSelectedItems((prev) => prev.filter((si) => si.id !== id));
  };

  const handleQuantityChange = (id: string, qty: number) => {
    setSelectedItems((prev) =>
      prev.map((si) =>
        si.id === id ? { ...si, requestedQty: Math.max(1, qty) } : si
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!purpose.trim()) {
      setError("Vui lòng nhập chủ đề / hoạt động.");
      return;
    }

    if (!neededDate) {
      setError("Vui lòng chọn ngày cần dùng.");
      return;
    }

    if (selectedItems.length === 0) {
      setError("Vui lòng chọn ít nhất 1 mặt hàng đồ dùng.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: purpose.trim(),
          neededDate,
          note: note.trim() || null,
          items: selectedItems.map((si) => ({
            itemId: si.itemId || null,
            requestedQty: si.requestedQty,
            isNewItemProposal: Boolean(si.isNewItemProposal),
            proposedName: si.isNewItemProposal ? si.name : null,
            proposedUnit: si.isNewItemProposal ? si.unit : null,
            proposedPrice: si.proposedPrice || null,
            proposedImageUrl: si.proposedImageUrl || null,
            proposedSourceUrl: si.proposedSourceUrl || null,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Không thể gửi yêu cầu đồ dùng.");
        setSubmitting(false);
        return;
      }

      setResultRequest(data.request);
    } catch {
      setError("Lỗi kết nối máy chủ khi gửi yêu cầu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Request Form Header Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-5 bg-white/90">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Thông tin Yêu cầu Đồ dùng
              </h2>
              <p className="text-xs text-slate-500">Nhập chủ đề hoạt động và thời gian dự kiến cần dùng</p>
            </div>
          </div>

          {error && (
            <div className="p-4 text-xs sm:text-sm text-rose-700 bg-rose-50 rounded-xl border border-rose-200 flex items-center gap-3 font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Chủ đề / Hoạt động <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="VD: Trang trí góc Mùa xuân, Hội thi vẽ tranh 8/3..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Ngày cần sử dụng <span className="text-rose-600">*</span>
              </label>
              <div className="relative group">
                <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors pointer-events-none" />
                <input
                  type="date"
                  value={neededDate}
                  onChange={(e) => setNeededDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all font-medium"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Ghi chú thêm (nếu có)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Nhận trước 9h sáng tại phòng Giáo viên..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all font-medium"
            />
          </div>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-800 font-semibold animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notification}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-emerald-600 hover:text-emerald-900 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Item Picker and Selection Table */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6 bg-white/90">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              <span>Danh sách Đồ dùng yêu cầu</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tìm kiếm thông minh ưu tiên kho nội bộ trước, có hỗ trợ gợi ý mở rộng trên Internet
            </p>
          </div>

          {/* Ô Tìm Kiếm Full Chiều Ngang (Full Width) */}
          <div className="w-full">
            <ItemSearchSelector
              className="w-full"
              placeholder="🔍 Gõ tên đồ dùng cần tìm (VD: Ruy băng, Giấy A4, Kéo, Đất nặn...)"
              onSelectInternalItem={handleSelectInternalItem}
              onSelectExternalProposal={handleSelectExternalProposal}
              excludeItemIds={selectedItems.map((si) => si.itemId).filter(Boolean) as string[]}
            />
          </div>

          {/* Quick Select Suggestion Pills */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Gợi ý chọn nhanh đồ dùng phổ biến trong kho:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableItems.slice(0, 6).map((item) => {
                const isSelected = selectedItems.some((si) => si.itemId === item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isSelected}
                    onClick={() => handleSelectInternalItem(item)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      isSelected
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer shadow-xs"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{item.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      (Còn: {item.availableQuantity})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Items Table */}
          {selectedItems.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-2 text-slate-400 bg-slate-50/50">
              <Plus className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">Chưa có đồ dùng nào được chọn</p>
              <p className="text-xs text-slate-500">
                Sử dụng ô tìm kiếm phía trên để chọn món trong kho hoặc tìm gợi ý mở rộng.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Tên đồ dùng</th>
                    <th className="px-4 py-3">Tồn khả dụng</th>
                    <th className="px-4 py-3">Số lượng xin</th>
                    <th className="px-4 py-3">Dự kiến Phân bổ & Mua sắm</th>
                    <th className="px-4 py-3 text-right">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedItems.map((si) => {
                    const isNewProposal = Boolean(si.isNewItemProposal);
                    const allocatedPreview = isNewProposal
                      ? 0
                      : Math.min(si.requestedQty, Math.max(0, si.availableQuantity));
                    const shortfallPreview = isNewProposal
                      ? si.requestedQty
                      : si.requestedQty - allocatedPreview;

                    return (
                      <tr key={si.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center shadow-2xs">
                              {si.imageUrl || si.proposedImageUrl ? (
                                <img
                                  src={si.imageUrl || si.proposedImageUrl || ""}
                                  alt={si.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <Boxes className="w-4.5 h-4.5 text-slate-400" />
                              )}
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <div className="font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                                <span>{si.name}</span>
                                {isNewProposal && (
                                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                                    ⭐ Đề xuất mới
                                  </span>
                                )}
                              </div>
                              {isNewProposal && si.proposedSourceUrl && (
                                <a
                                  href={si.proposedSourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Link nguồn tham khảo</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isNewProposal ? (
                            <span className="text-xs font-semibold text-slate-400 italic">
                              Chưa có trong kho
                            </span>
                          ) : (
                            <span className="font-black font-mono text-slate-700">
                              {si.availableQuantity} {si.unit}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              value={si.requestedQty}
                              onChange={(e) =>
                                handleQuantityChange(
                                  si.id,
                                  parseInt(e.target.value || "1", 10)
                                )
                              }
                              className="w-20 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-black text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                            />
                            <span className="text-xs text-slate-500 font-medium">{si.unit}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1 text-xs">
                            {isNewProposal ? (
                              <div className="flex items-center gap-1.5 text-indigo-700 font-bold">
                                <PackageMinus className="w-4 h-4 text-indigo-600" />
                                <span>100% Cần mua mới: {shortfallPreview} {si.unit} (Cần Admin duyệt & tạo)</span>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                                  <PackageCheck className="w-4 h-4 text-emerald-600" />
                                  <span>Lấy từ kho: {allocatedPreview} {si.unit}</span>
                                </div>
                                {shortfallPreview > 0 && (
                                  <div className="flex items-center gap-1.5 text-amber-700 font-bold">
                                    <PackageMinus className="w-4 h-4 text-amber-600" />
                                    <span>Cần mua thêm: {shortfallPreview} {si.unit}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(si.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => router.push("/requests")}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || selectedItems.length === 0}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Gửi yêu cầu đồ dùng</span>
            </button>
          </div>
        </div>
      </form>

      {/* Result Modal displaying detailed allocation breakdown */}
      {resultRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl glass-dropdown rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200 bg-white">
            <div className="flex items-center gap-4 text-emerald-700">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Gửi Yêu Cầu Thành Công!
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chủ đề: <span className="font-bold text-slate-800">{resultRequest.purpose}</span>
                </p>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 space-y-1">
              <div className="font-bold">ℹ️ Kết quả phân bổ kho tự động:</div>
              <div>
                Yêu cầu đang ở trạng thái <strong className="text-amber-700">Chờ duyệt (Pending)</strong>. Các món có sẵn đã được giữ chỗ tạm thời trong kho khả dụng. Các món đề xuất mới sẽ được Ban Giám Hiệu / Quản trị viên duyệt và khởi tạo.
              </div>
            </div>

            {/* Allocation Details Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Mặt hàng</th>
                    <th className="px-4 py-3">Số lượng xin</th>
                    <th className="px-4 py-3">Cấp từ kho</th>
                    <th className="px-4 py-3">Cần mua thêm</th>
                    <th className="px-4 py-3">Trạng thái dòng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resultRequest.requestItems.map((ri) => {
                    const itemName = ri.item?.name || ri.proposedName || "Món đề xuất mới";
                    const itemUnit = ri.item?.unit || ri.proposedUnit || "cái";
                    const isFullyAllocated = ri.shortfallQty === 0 && !ri.isNewItemProposal;

                    return (
                      <tr key={ri.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-bold text-slate-800">
                          {itemName}
                          {ri.isNewItemProposal && (
                            <span className="ml-2 text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded font-normal">
                              Đề xuất mới
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">
                          {ri.requestedQty} {itemUnit}
                        </td>
                        <td className="px-4 py-3 font-mono font-black text-emerald-700">
                          {ri.allocatedQty} {itemUnit}
                        </td>
                        <td className="px-4 py-3 font-mono font-black text-amber-700">
                          {ri.shortfallQty} {itemUnit}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isFullyAllocated
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : ri.isNewItemProposal
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {isFullyAllocated
                              ? "Đủ hàng từ kho"
                              : ri.isNewItemProposal
                              ? "Đề xuất mua mới 100%"
                              : `Thiếu ${ri.shortfallQty} ${itemUnit}`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setResultRequest(null);
                  router.push("/requests");
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Xem danh sách yêu cầu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

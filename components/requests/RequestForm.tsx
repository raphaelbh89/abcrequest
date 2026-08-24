"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Boxes,
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
  UploadCloud,
  Image as ImageIcon,
  Edit3,
  X,
} from "lucide-react";
import { ItemSearchSelector } from "@/components/common/ItemSearchSelector";
import { ThemeCombobox } from "@/components/requests/ThemeCombobox";
import { DatePicker } from "@/components/common/DatePicker";
import {
  fileOrBlobToCompressedDataUrl,
  handleClipboardImagePaste,
} from "@/lib/image-utils";

interface ItemAvailability {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  pendingAllocatedQty: number;
  availableQuantity: number;
  imageUrl?: string | null;
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
  const [mounted, setMounted] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [themeId, setThemeId] = useState<string | undefined>(undefined);
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

  // Active item row for URL input modal or popover if needed
  const [editingImageRowId, setEditingImageRowId] = useState<string | null>(null);
  const [customImageUrlInput, setCustomImageUrlInput] = useState<string>("");

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
    setMounted(true);
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
      `✨ Đã thêm đề xuất mặt hàng mới: "${proposal.name}" (Bạn có thể sửa tên, ĐVT hoặc tải/dán ảnh tùy thích).`
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

  // Sửa tên món hàng
  const handleNameChange = (id: string, name: string) => {
    setSelectedItems((prev) =>
      prev.map((si) => (si.id === id ? { ...si, name } : si))
    );
  };

  // Sửa đơn vị tính (ĐVT)
  const handleUnitChange = (id: string, unit: string) => {
    setSelectedItems((prev) =>
      prev.map((si) => (si.id === id ? { ...si, unit } : si))
    );
  };

  // Cập nhật hình ảnh món hàng
  const handleImageChange = (id: string, imageUrl: string) => {
    setSelectedItems((prev) =>
      prev.map((si) =>
        si.id === id
          ? { ...si, imageUrl, proposedImageUrl: imageUrl }
          : si
      )
    );
  };

  // Xử lý file ảnh tải lên từ máy tính cho một dòng
  const handleRowFileUpload = async (id: string, file: File) => {
    try {
      const dataUrl = await fileOrBlobToCompressedDataUrl(file);
      handleImageChange(id, dataUrl);
    } catch (err) {
      console.error("Lỗi khi tải ảnh lên:", err);
    }
  };

  // Xử lý dán ảnh từ Clipboard (Ctrl+V) vào dòng
  const handleRowPaste = async (id: string, e: React.ClipboardEvent) => {
    const pasted = await handleClipboardImagePaste(e);
    if (pasted) {
      handleImageChange(id, pasted);
    }
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
          themeId: themeId || null,
          neededDate,
          note: note.trim() || null,
          items: selectedItems.map((si) => ({
            itemId: si.itemId || null,
            name: si.name.trim(),
            unit: si.unit.trim(),
            imageUrl: si.imageUrl || si.proposedImageUrl || null,
            requestedQty: si.requestedQty,
            isNewItemProposal: Boolean(si.isNewItemProposal),
            proposedName: si.name.trim(),
            proposedUnit: si.unit.trim(),
            proposedPrice: si.proposedPrice || null,
            proposedImageUrl: si.imageUrl || si.proposedImageUrl || null,
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
                Thông tin Phiếu yêu cầu Đồ dùng
              </h2>
              <p className="text-xs text-slate-500">
                Nhập chủ đề học tập, ngày cần dùng và chọn danh sách đồ dùng
              </p>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-sm animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Chủ đề / Kế hoạch sự kiện <span className="text-rose-600">*</span>
              </label>
              <ThemeCombobox
                value={purpose}
                onChange={(val, tId) => {
                  setPurpose(val);
                  setThemeId(tId);
                }}
                placeholder="Chọn sự kiện trường hoặc gõ chủ đề lớp..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Ngày cần sử dụng <span className="text-rose-600">*</span>
              </label>
              <DatePicker
                value={neededDate}
                onChange={(val) => setNeededDate(val)}
                placeholder="Chọn ngày cần dùng..."
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Ghi chú thêm cho Ban Giám Hiệu & Thủ kho (Tùy chọn)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú chi tiết về thời gian nhận, quy cách đặc biệt..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all font-medium"
            />
          </div>
        </div>

        {/* Dynamic Notification Banner */}
        {notification && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 text-xs sm:text-sm animate-in fade-in shadow-xs">
            <div className="flex items-center gap-2.5">
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
              placeholder="Gõ tên đồ dùng cần tìm (VD: Ruy băng, Giấy A4, Kéo, Đất nặn...)"
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
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5 min-w-[280px]">Tên đồ dùng & Hình ảnh</th>
                    <th className="px-3 py-3.5 text-center w-28 whitespace-nowrap">Tồn khả dụng</th>
                    <th className="px-3 py-3.5 text-center w-28 whitespace-nowrap">Số lượng xin</th>
                    <th className="px-3 py-3.5 text-center w-24 whitespace-nowrap">Đơn vị tính</th>
                    <th className="px-4 py-3.5 min-w-[220px]">Dự kiến Phân bổ & Mua sắm</th>
                    <th className="px-3 py-3.5 text-center w-14">Xóa</th>
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
                      <tr
                        key={si.id}
                        onPaste={(e) => handleRowPaste(si.id, e)}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        {/* 1. Cột Tên đồ dùng & Ảnh (Có thể sửa tên & tải/dán ảnh) */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {/* Khung Thumbnail - Click để chọn ảnh từ máy */}
                            <label
                              title="Bấm để tải ảnh từ máy tính hoặc nhấn Ctrl+V để dán ảnh"
                              className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 relative group cursor-pointer shadow-2xs hover:border-emerald-500 transition-all"
                            >
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleRowFileUpload(si.id, file);
                                }}
                              />

                              {si.imageUrl || si.proposedImageUrl ? (
                                <>
                                  <img
                                    src={si.imageUrl || si.proposedImageUrl || ""}
                                    alt={si.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[8px] font-bold transition-opacity">
                                    <UploadCloud className="w-3.5 h-3.5 mb-0.5" />
                                    <span>Đổi ảnh</span>
                                  </div>
                                </>
                              ) : (
                                <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-emerald-600">
                                  <UploadCloud className="w-4 h-4" />
                                  <span className="text-[8px] font-bold mt-0.5">Tải ảnh</span>
                                </div>
                              )}
                            </label>

                            {/* Tên đồ dùng (Có thể sửa trực tiếp) */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <input
                                type="text"
                                value={si.name}
                                onChange={(e) => handleNameChange(si.id, e.target.value)}
                                placeholder="Nhập/sửa tên đồ dùng..."
                                className="w-full px-2.5 py-1 text-sm font-bold text-slate-800 bg-slate-50/70 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg focus:ring-2 focus:ring-emerald-500/20 transition-all"
                              />

                              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                {isNewProposal && (
                                  <span className="font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md text-[10px]">
                                    ⭐ Đề xuất mới
                                  </span>
                                )}

                                {/* Nút nhập URL ảnh nếu muốn */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (editingImageRowId === si.id) {
                                      setEditingImageRowId(null);
                                    } else {
                                      setEditingImageRowId(si.id);
                                      setCustomImageUrlInput(si.imageUrl || si.proposedImageUrl || "");
                                    }
                                  }}
                                  className="text-slate-500 hover:text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                                >
                                  <ImageIcon className="w-3 h-3" />
                                  <span>{editingImageRowId === si.id ? "Đóng" : "Dán link ảnh"}</span>
                                </button>

                                {isNewProposal && si.proposedSourceUrl && (
                                  <a
                                    href={si.proposedSourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Nguồn</span>
                                  </a>
                                )}
                              </div>

                              {/* Input URL mở rộng khi bấm 'Dán link ảnh' */}
                              {editingImageRowId === si.id && (
                                <div className="flex items-center gap-1.5 pt-1 animate-in fade-in">
                                  <input
                                    type="url"
                                    value={customImageUrlInput}
                                    onChange={(e) => setCustomImageUrlInput(e.target.value)}
                                    placeholder="Dán link ảnh (https://...)"
                                    className="flex-1 px-2 py-1 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleImageChange(si.id, customImageUrlInput.trim());
                                      setEditingImageRowId(null);
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold transition-colors cursor-pointer"
                                  >
                                    Lưu
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Cột Tồn khả dụng */}
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          {isNewProposal ? (
                            <span className="text-xs font-semibold text-slate-400 italic">
                              Chưa có trong kho
                            </span>
                          ) : (
                            <span className="font-bold font-mono text-slate-800 text-sm">
                              {si.availableQuantity} <span className="text-xs font-normal text-slate-500">{si.unit}</span>
                            </span>
                          )}
                        </td>

                        {/* 3. Cột Số lượng xin (Tách riêng) */}
                        <td className="px-3 py-3 text-center whitespace-nowrap">
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
                            className="w-20 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-300 focus:border-emerald-500 rounded-xl text-center text-sm font-black font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                          />
                        </td>

                        {/* 4. Cột Đơn vị tính (Tách riêng, có thể sửa) */}
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <input
                            type="text"
                            value={si.unit}
                            onChange={(e) => handleUnitChange(si.id, e.target.value)}
                            title="Nhấp để chỉnh sửa ĐVT nếu cần"
                            placeholder="ĐVT"
                            className="w-20 px-2 py-1.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-300 focus:border-emerald-500 rounded-xl text-center text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                          />
                        </td>

                        {/* 5. Cột Dự kiến Phân bổ & Mua sắm */}
                        <td className="px-4 py-3">
                          <div className="space-y-1 text-xs">
                            {isNewProposal ? (
                              <div className="inline-flex items-center gap-1.5 text-indigo-700 font-bold bg-indigo-50/80 px-2.5 py-1.5 rounded-xl border border-indigo-100">
                                <PackageMinus className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span>100% Cần mua mới: {shortfallPreview} {si.unit}</span>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                                  <PackageCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>Lấy từ kho: {allocatedPreview} {si.unit}</span>
                                </div>
                                {shortfallPreview > 0 && (
                                  <div className="flex items-center gap-1.5 text-amber-700 font-bold">
                                    <PackageMinus className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>Cần mua thêm: {shortfallPreview} {si.unit}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </td>

                        {/* 6. Nút Xóa */}
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(si.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Xóa món này"
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

          {/* Action Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => router.push("/requests")}
              className="px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={submitting || selectedItems.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Gửi Yêu cầu Đồ dùng ({selectedItems.length} món)</span>
            </button>
          </div>
        </div>
      </form>

      {/* Success Popup Modal */}
      {mounted &&
        resultRequest &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
              {/* Header */}
              <div className="p-6 pb-4 flex items-start justify-between border-b border-slate-100 shrink-0 bg-gradient-to-r from-emerald-50/70 to-teal-50/50">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl shrink-0 shadow-2xs">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                      Gửi Phiếu Yêu cầu Thành công!
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                      Chủ đề: <strong className="text-slate-800">"{resultRequest.purpose}"</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setResultRequest(null);
                    setSelectedItems([]);
                    setPurpose("");
                    setNote("");
                  }}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-2xl text-xs sm:text-sm text-emerald-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Phiếu đã được ghi nhận và gửi đến Ban Giám Hiệu để xét duyệt.</span>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Chi tiết phân bổ tạm tính tự động:
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 divide-y divide-slate-100 overflow-hidden">
                    {resultRequest.requestItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 flex items-center justify-between gap-3 text-xs sm:text-sm bg-white"
                      >
                        <div className="font-bold text-slate-800 flex items-center gap-2 min-w-0">
                          <span className="truncate">
                            {item.isNewItemProposal ? item.proposedName : item.item?.name}
                          </span>
                          {item.isNewItemProposal && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-bold shrink-0">
                              ⭐ Đề xuất mới
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-slate-500 font-medium">
                            Xin: <strong>{item.requestedQty}</strong>
                          </span>
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-xs">
                            Kho cấp: {item.allocatedQty}
                          </span>
                          {item.shortfallQty > 0 && (
                            <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-xs">
                              Cần mua: {item.shortfallQty}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setResultRequest(null);
                    setSelectedItems([]);
                    setPurpose("");
                    setNote("");
                  }}
                  className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                >
                  Tạo thêm phiếu khác
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/requests")}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <span>Xem danh sách phiếu yêu cầu</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

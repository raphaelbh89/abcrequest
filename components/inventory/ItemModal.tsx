"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Loader2,
  Save,
  PackagePlus,
  Edit3,
  Sparkles,
  Image as ImageIcon,
  UploadCloud,
  ClipboardPaste,
  Trash2,
} from "lucide-react";
import { useSettings } from "@/components/settings/SettingsProvider";
import { ItemSearchSelector } from "@/components/common/ItemSearchSelector";
import {
  fileOrBlobToCompressedDataUrl,
  handleClipboardImagePaste,
} from "@/lib/image-utils";

export interface ItemData {
  id?: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  pendingAllocatedQty?: number;
  availableQuantity?: number;
  minStock: number;
  price?: number | null;
  location?: string | null;
  imageUrl?: string | null;
}

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdItem?: any) => void;
  initialData?: ItemData | null;
}

export function ItemModal({ isOpen, onClose, onSuccess, initialData }: ItemModalProps) {
  const { categories, settings } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("hoc_tap");
  const [unit, setUnit] = useState("cái");
  const [quantity, setQuantity] = useState(0);
  const [minStock, setMinStock] = useState(5);
  const [price, setPrice] = useState<string>("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(initialData?.id);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setCategory(initialData.category || (categories[0]?.code || "hoc_tap"));
      setUnit(initialData.unit || "cái");
      setQuantity(initialData.quantity ?? 0);
      setMinStock(initialData.minStock ?? (parseInt(settings.default_min_stock, 10) || 5));
      setPrice(initialData.price !== undefined && initialData.price !== null ? String(initialData.price) : "");
      setLocation(initialData.location || "");
      setImageUrl(initialData.imageUrl || "");
    } else {
      setName("");
      setCategory(categories[0]?.code || "hoc_tap");
      setUnit("cái");
      setQuantity(0);
      setMinStock(parseInt(settings.default_min_stock, 10) || 5);
      setPrice("");
      setLocation("");
      setImageUrl("");
    }
    setError(null);
    setShowQuickSearch(false);
    setShowUrlInput(false);
  }, [initialData, isOpen, categories, settings.default_min_stock]);

  // Xử lý khi chọn file từ máy tính
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const dataUrl = await fileOrBlobToCompressedDataUrl(file);
      setImageUrl(dataUrl);
    } catch (err) {
      console.error("Lỗi khi đọc file ảnh:", err);
      setError("Không thể xử lý hình ảnh này. Vui lòng thử ảnh khác.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Xử lý khi Dán ảnh (Ctrl+V) vào form
  const handlePaste = async (e: React.ClipboardEvent) => {
    const pastedImage = await handleClipboardImagePaste(e);
    if (pastedImage) {
      setImageUrl(pastedImage);
    }
  };

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Vui lòng nhập tên mặt hàng đồ dùng.");
      return;
    }

    setLoading(true);

    try {
      const url = isEdit ? `/api/items/${initialData?.id}` : "/api/items";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          unit: unit.trim(),
          quantity,
          minStock,
          price: price !== "" ? parseFloat(price) : null,
          location: location.trim() || null,
          imageUrl: imageUrl.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Không thể lưu mặt hàng.");
        setLoading(false);
        return;
      }

      onSuccess(data.item);
      onClose();
    } catch {
      setError("Lỗi kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      onPaste={handlePaste}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg glass-dropdown rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 bg-white max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              {isEdit ? <Edit3 className="w-5 h-5" /> : <PackagePlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEdit ? "Chỉnh sửa mặt hàng" : "Thêm mới mặt hàng đồ dùng"}
              </h2>
              <p className="text-xs text-slate-500">Thông tin kho tồn, hình ảnh và vị trí bảo quản</p>
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

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          className="hidden"
        />

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              {error}
            </div>
          )}

          {/* Quick Search Assistant (Chỉ hiện khi thêm mới) */}
          {!isEdit && (
            <div className="p-3.5 bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-indigo-50/60 border border-emerald-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Tìm kiếm & Tự điền thông tin nhanh</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickSearch(!showQuickSearch)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                >
                  {showQuickSearch ? "Thu gọn" : "Mở tìm kiếm"}
                </button>
              </div>

              {showQuickSearch && (
                <div className="pt-2">
                  <ItemSearchSelector
                    placeholder="Gõ tên để tìm từ Internet / mẫu..."
                    onSelectInternalItem={(item) => {
                      setName(item.name);
                      setUnit(item.unit);
                      if (item.price) setPrice(String(item.price));
                      if (item.imageUrl) setImageUrl(item.imageUrl);
                      setShowQuickSearch(false);
                    }}
                    onSelectExternalProposal={(ext) => {
                      setName(ext.name);
                      setUnit(ext.unit);
                      if (ext.price) setPrice(String(ext.price));
                      if (ext.imageUrl) setImageUrl(ext.imageUrl);
                      setShowQuickSearch(false);
                    }}
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tên đồ dùng <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Bút màu ruy-băng, Giấy A4 thủ công,..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all font-medium"
              required
            />
          </div>

          {/* Section Hình ảnh với Upload + Paste + URL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Hình ảnh món hàng (Tải lên / Paste / URL)
              </label>
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline cursor-pointer"
              >
                {showUrlInput ? "Ẩn nhập URL" : "Nhập link ảnh URL"}
              </button>
            </div>

            {/* Khung tải ảnh & Preview */}
            <div className="flex items-center gap-3">
              {/* Preview Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                title="Bấm để tải ảnh từ máy tính"
                className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative shrink-0 group"
              >
                {uploadingImage ? (
                  <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                ) : imageUrl ? (
                  <>
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                      Đổi ảnh
                    </div>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                    <span className="text-[9px] text-slate-500 font-bold mt-0.5">Tải ảnh</span>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Tải từ máy tính</span>
                  </button>

                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa ảnh</span>
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <ClipboardPaste className="w-3 h-3 text-indigo-500 shrink-0" />
                  <span>Mẹo: Bạn có thể nhấn <strong>Ctrl + V</strong> ở bất kỳ đâu để dán ảnh đã copy.</span>
                </div>
              </div>
            </div>

            {/* Optional Direct URL Input */}
            {showUrlInput && (
              <div className="relative pt-1 animate-in fade-in">
                <ImageIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Dán link ảnh trực tiếp (https://...)"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all font-medium"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Phân loại <span className="text-rose-600">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all cursor-pointer font-medium"
              >
                {categories.length > 0 ? (
                  categories.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="hoc_tap">Học tập & Giáo cụ</option>
                    <option value="ngoai_khoa">Ngoại khóa & Trang trí</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Đơn vị tính <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="cái, hộp, ram, cuộn..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all font-medium"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tồn kho ban đầu
              </label>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value || "0", 10))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Ngưỡng cảnh báo min
              </label>
              <input
                type="number"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(parseInt(e.target.value || "0", 10))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Đơn giá tham khảo (VNĐ)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="VD: 15000"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Vị trí lưu kho
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="VD: Kệ A1, Tủ đồ dùng 2"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100 shrink-0">
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
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isEdit ? "Lưu thay đổi" : "Tạo mặt hàng"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

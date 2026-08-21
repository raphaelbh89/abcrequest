"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Layers,
  Sparkles,
  PackageCheck,
  PackagePlus,
  RefreshCw,
  TrendingUp,
  Tag,
  CheckSquare,
  Square,
  SlidersHorizontal,
} from "lucide-react";
import { useSettings } from "@/components/settings/SettingsProvider";

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (importedCount: number) => void;
}

export function ImportExcelModal({ isOpen, onClose, onSuccess }: ImportExcelModalProps) {
  const { categories } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parsed data
  const [items, setItems] = useState<any[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [departmentOrPurpose, setDepartmentOrPurpose] = useState<string>("");
  const [globalCategory, setGlobalCategory] = useState<string>("keep_row");

  // Options
  const [duplicateMode, setDuplicateMode] = useState<"accumulate" | "overwrite" | "price_only" | "skip">("accumulate");
  const [priceUpdateMode, setPriceUpdateMode] = useState<"update_from_file" | "keep_old">("update_from_file");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setItems([]);
      setSelectedIndices([]);
      setDepartmentOrPurpose("");
      setError(null);
      setGlobalCategory("keep_row");
      setDuplicateMode("accumulate");
      setPriceUpdateMode("update_from_file");
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  // Xử lý chọn và phân tích file Excel / Word
  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setError(null);
    setParsing(true);
    setSelectedIndices([]);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/items/import/parse", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Không thể đọc file này.");
        setItems([]);
        return;
      }

      setItems(data.items || []);
      setDepartmentOrPurpose(data.departmentOrPurpose || "");
    } catch (err) {
      console.error("Lỗi khi tải file:", err);
      setError("Lỗi kết nối khi tải và phân tích file.");
    } finally {
      setParsing(false);
    }
  };

  // Cập nhật giá trị trực tiếp trên dòng
  const handleItemChange = (index: number, field: string, value: any) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === "price" && updated.existingPrice !== null && updated.existingPrice !== undefined) {
          updated.priceChanged = Math.abs((Number(value) || 0) - Number(updated.existingPrice)) > 0.01;
        }
        return updated;
      })
    );
  };

  // Xóa một dòng
  const handleRemoveRow = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
    setSelectedIndices((prev) => prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)));
  };

  // Xóa các dòng đã chọn (Loại bỏ các trường không cần thiết / dòng thừa)
  const handleRemoveSelected = () => {
    if (selectedIndices.length === 0) return;
    const selectedSet = new Set(selectedIndices);
    setItems((prev) => prev.filter((_, idx) => !selectedSet.has(idx)));
    setSelectedIndices([]);
  };

  // Tự động lọc dòng rác / tên quá ngắn
  const handleAutoCleanNoise = () => {
    setItems((prev) => prev.filter((i) => i.name && i.name.trim().length >= 2 && !i.name.toLowerCase().includes("tổng cộng")));
    setSelectedIndices([]);
  };

  // Toggle chọn một dòng
  const handleToggleSelectRow = (index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  // Toggle chọn tất cả
  const handleToggleSelectAll = () => {
    if (selectedIndices.length === items.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(items.map((_, idx) => idx));
    }
  };

  // Áp dụng danh mục cho toàn bộ dòng
  const handleApplyGlobalCategory = (catCode: string) => {
    setGlobalCategory(catCode);
    if (catCode !== "keep_row") {
      setItems((prev) => prev.map((item) => ({ ...item, category: catCode })));
    }
  };

  // Tiến hành Import vào CSDL
  const handleConfirmImport = async () => {
    const validItems = items.filter((i) => i.name && i.name.trim().length >= 2);
    if (validItems.length === 0) {
      setError("Không có mặt hàng hợp lệ nào để nhập kho.");
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const res = await fetch("/api/items/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: validItems,
          duplicateMode,
          priceUpdateMode,
          fileName: file?.name,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Không thể lưu danh sách hàng vào kho.");
        setImporting(false);
        return;
      }

      onSuccess(data.count || validItems.length);
      onClose();
    } catch {
      setError("Lỗi máy chủ khi lưu hàng vào kho.");
    } finally {
      setImporting(false);
    }
  };

  const existingItems = items.filter((i) => i.isExisting);
  const existingCount = existingItems.length;
  const priceChangedCount = items.filter((i) => i.priceChanged).length;
  const newCount = items.length - existingCount;
  const isWordFile = file?.name.toLowerCase().endsWith(".docx") || file?.name.toLowerCase().endsWith(".doc");

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-6xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[94vh] flex flex-col">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border shadow-2xs ${isWordFile ? "bg-blue-100 text-blue-800 border-blue-200" : "bg-emerald-100 text-emerald-800 border-emerald-200"}`}>
              {isWordFile ? (
                <FileText className="w-6 h-6 text-blue-700" />
              ) : (
                <FileSpreadsheet className="w-6 h-6 text-emerald-700" />
              )}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>Nhập danh sách hàng hóa từ file</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Word • Excel • CSV
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Tự động kiểm tra trùng lặp với kho hiện tại, cho phép loại bỏ trường thừa & cập nhật lại giá theo file mới
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

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".xlsx, .xls, .csv, .docx, .doc, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/msword, text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileChange(f);
          }}
        />

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-sm animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Area */}
          {items.length === 0 ? (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const droppedFile = e.dataTransfer.files?.[0];
                  if (droppedFile) handleFileChange(droppedFile);
                }}
                className="p-12 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-3xl bg-emerald-50/40 hover:bg-emerald-50/70 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 group"
              >
                <div className="p-4 rounded-2xl bg-white shadow-xs group-hover:scale-110 transition-transform">
                  {parsing ? (
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                  ) : (
                    <UploadCloud className="w-8 h-8 text-emerald-600" />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">
                    {parsing ? "Đang phân tích dữ liệu file..." : "Kéo thả file Word (.docx) hoặc Excel (.xlsx, .csv) vào đây hoặc bấm để chọn"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Hệ thống sẽ tự động bóc tách các cột dữ liệu, loại bỏ dòng thừa và đối chiếu hàng tồn kho
                  </p>
                </div>
              </div>

              {/* Template Download Prompt */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-slate-700">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    Chưa có file mẫu? Bạn có thể tải biểu mẫu chuẩn theo đúng quy định để điền trước.
                  </span>
                </div>

                <a
                  href="/api/items/import/template"
                  download
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tải file Excel mẫu (.xlsx)</span>
                </a>
              </div>
            </div>
          ) : (
            /* Preview and Options Bar */
            <div className="space-y-4">
              
              {/* Summary Stats & Bulk Actions Bar */}
              <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 flex-wrap text-xs">
                  <span className="font-bold bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-slate-800">
                    📄 File: <strong>{file?.name}</strong>
                  </span>
                  <span className="font-bold bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
                    Tổng tìm thấy: <strong>{items.length}</strong> món
                  </span>
                  <span className="font-bold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl border border-indigo-200">
                    ✨ Mới: <strong>{newCount}</strong>
                  </span>
                  {existingCount > 0 && (
                    <span className="font-bold bg-amber-50 text-amber-800 px-3 py-1.5 rounded-xl border border-amber-200 flex items-center gap-1">
                      <span>📦 Đã có trong kho:</span>
                      <strong>{existingCount}</strong>
                    </span>
                  )}
                  {priceChangedCount > 0 && (
                    <span className="font-bold bg-rose-50 text-rose-700 px-3 py-1.5 rounded-xl border border-rose-200 flex items-center gap-1 animate-pulse">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Giá khác: <strong>{priceChangedCount}</strong> món</span>
                    </span>
                  )}
                </div>

                {/* Bulk Control Actions */}
                <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-end">
                  {selectedIndices.length > 0 && (
                    <button
                      type="button"
                      onClick={handleRemoveSelected}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      title="Xóa bỏ các dòng đã tích chọn"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa {selectedIndices.length} dòng đã chọn</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleAutoCleanNoise}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    title="Tự động lọc bỏ các dòng tiêu đề thừa, chữ ký, dòng trắng"
                  >
                    <span>🧹 Dọn dòng rác</span>
                  </button>

                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <span>Phân loại:</span>
                    <select
                      value={globalCategory}
                      onChange={(e) => handleApplyGlobalCategory(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                      <option value="keep_row">Tự động theo dòng</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
                  >
                    <RefreshCw className="w-3 h-3 text-emerald-600" />
                    <span>Chọn file khác</span>
                  </button>
                </div>
              </div>

              {/* Advanced Duplicate & Price Handling Panel */}
              {existingCount > 0 && (
                <div className="p-4 bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/70 border border-amber-200 rounded-2xl space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between gap-3 border-b border-amber-200/60 pb-2.5">
                    <div className="font-bold text-amber-900 text-xs flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Xử lý {existingCount} mặt hàng trùng lặp với kho hiện tại:</span>
                    </div>
                    {priceChangedCount > 0 && (
                      <span className="text-[11px] font-bold text-orange-800 bg-orange-100/80 px-2.5 py-0.5 rounded-full border border-orange-300">
                        🏷️ Có {priceChangedCount} món có đơn giá mới khác giá kho
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Price Update Mode */}
                    <div className="p-3 bg-white/90 rounded-xl border border-amber-200/80 space-y-2">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tùy chọn Đơn giá khi trùng hàng:</span>
                      </div>
                      <div className="space-y-1.5 text-slate-700">
                        <label className="flex items-center gap-2 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="priceUpdateMode"
                            checked={priceUpdateMode === "update_from_file"}
                            onChange={() => setPriceUpdateMode("update_from_file")}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>
                            <strong>Cập nhật đơn giá mới theo file</strong>{" "}
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">Khuyên dùng</span>
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="priceUpdateMode"
                            checked={priceUpdateMode === "keep_old"}
                            onChange={() => setPriceUpdateMode("keep_old")}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Giữ nguyên đơn giá cũ đang có trong kho</span>
                        </label>
                      </div>
                    </div>

                    {/* Stock Quantity Mode */}
                    <div className="p-3 bg-white/90 rounded-xl border border-amber-200/80 space-y-2">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <PackageCheck className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Tùy chọn Số lượng tồn khi trùng hàng:</span>
                      </div>
                      <div className="space-y-1.5 text-slate-700">
                        <label className="flex items-center gap-2 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="dupMode"
                            checked={duplicateMode === "accumulate"}
                            onChange={() => setDuplicateMode("accumulate")}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>
                            <strong>Cộng dồn số lượng</strong> (Tồn mới = Tồn kho + SL file)
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="dupMode"
                            checked={duplicateMode === "overwrite"}
                            onChange={() => setDuplicateMode("overwrite")}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span><strong>Ghi đè số lượng</strong> (Tồn mới = SL file)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="dupMode"
                            checked={duplicateMode === "price_only"}
                            onChange={() => setDuplicateMode("price_only")}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span><strong>Chỉ cập nhật giá</strong> (Không tăng giảm tồn kho)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="dupMode"
                            checked={duplicateMode === "skip"}
                            onChange={() => setDuplicateMode("skip")}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Bỏ qua các món đã có trong kho</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white max-h-[400px] shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2.5 text-center w-10">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          className="text-slate-500 hover:text-emerald-600 transition-colors"
                          title="Chọn / Bỏ chọn tất cả"
                        >
                          {selectedIndices.length === items.length && items.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-2 py-2.5 text-center w-10">STT</th>
                      <th className="px-3 py-2.5 min-w-[220px]">Tên đồ dùng & Hình ảnh</th>
                      <th className="px-3 py-2.5 text-center w-20">ĐVT</th>
                      <th className="px-3 py-2.5 text-center w-20">Số lượng</th>
                      <th className="px-3 py-2.5 text-right w-28">Đơn giá</th>
                      <th className="px-3 py-2.5 min-w-[150px]">Phân loại</th>
                      <th className="px-3 py-2.5 text-center min-w-[160px]">Đối chiếu kho & Giá</th>
                      <th className="px-3 py-2.5 text-center w-12">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => {
                      const isSelected = selectedIndices.includes(idx);
                      return (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            isSelected ? "bg-emerald-50/50" : item.priceChanged ? "bg-orange-50/30 hover:bg-orange-50/50" : "hover:bg-slate-50/70"
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectRow(idx)}
                              className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>

                          {/* STT */}
                          <td className="px-2 py-2 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>

                          {/* Tên đồ dùng & Ảnh */}
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <PackagePlus className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                                className="w-full px-2 py-1 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg text-xs font-bold text-slate-800"
                              />
                            </div>
                          </td>

                          {/* ĐVT */}
                          <td className="px-3 py-2 text-center">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                              className="w-16 px-1.5 py-1 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg text-xs font-bold text-center text-slate-800"
                            />
                          </td>

                          {/* Số lượng */}
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemChange(idx, "quantity", parseInt(e.target.value || "0", 10))
                              }
                              className="w-16 px-1.5 py-1 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg text-xs font-black font-mono text-center text-slate-900"
                            />
                          </td>

                          {/* Đơn giá */}
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              min="0"
                              step="500"
                              value={item.price ?? ""}
                              placeholder="0"
                              onChange={(e) =>
                                handleItemChange(
                                  idx,
                                  "price",
                                  e.target.value !== "" ? parseFloat(e.target.value) : null
                                )
                              }
                              className={`w-24 px-1.5 py-1 border rounded-lg text-xs font-mono text-right font-bold ${
                                item.priceChanged
                                  ? "bg-amber-50 border-amber-400 text-amber-900"
                                  : "bg-slate-50/70 focus:bg-white border-slate-200 focus:border-emerald-500 text-slate-900"
                              }`}
                            />
                          </td>

                          {/* Phân loại */}
                          <td className="px-3 py-2">
                            <select
                              value={item.category}
                              onChange={(e) => handleItemChange(idx, "category", e.target.value)}
                              className="w-full px-2 py-1 bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg text-xs font-medium text-slate-800"
                            >
                              {categories.map((c) => (
                                <option key={c.id} value={c.code}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Trạng thái kho & Đối chiếu giá */}
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            {item.isExisting ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center gap-1 font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md text-[10px]">
                                  <span>📦 Tồn: {item.existingQuantity}</span>
                                </span>

                                {item.priceChanged && item.existingPrice !== null && (
                                  <span
                                    className="inline-flex items-center gap-1 font-bold bg-orange-100 text-orange-800 border border-orange-300 px-2 py-0.5 rounded-md text-[9px]"
                                    title={`Giá cũ trong kho: ${Number(item.existingPrice).toLocaleString("vi-VN")} đ ➔ Giá mới: ${Number(item.price || 0).toLocaleString("vi-VN")} đ`}
                                  >
                                    <Tag className="w-2.5 h-2.5" />
                                    <span>Giá cũ: {Number(item.existingPrice).toLocaleString("vi-VN")}đ</span>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px]">
                                <span>✨ Mới</span>
                              </span>
                            )}
                          </td>

                          {/* Nút Xóa dòng */}
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Loại bỏ dòng này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Hủy bỏ
          </button>

          {items.length > 0 && (
            <button
              type="button"
              disabled={importing}
              onClick={handleConfirmImport}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PackageCheck className="w-4 h-4" />
              )}
              <span>Tiến hành nhập {items.length} mặt hàng vào kho</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

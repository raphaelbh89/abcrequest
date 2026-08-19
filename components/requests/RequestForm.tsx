"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
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
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  Bot,
  Lightbulb,
  Check,
  PlusCircle,
  Info,
} from "lucide-react";

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
  itemId: string;
  name: string;
  unit: string;
  availableQuantity: number;
  requestedQty: number;
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
    item: {
      name: string;
      unit: string;
    };
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
  const [searchItem, setSearchItem] = useState("");

  // AI suggestions & similar items states
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [similarInStock, setSimilarInStock] = useState<any[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
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

  // Fetch AI suggestions & similar in-stock items when typing
  useEffect(() => {
    if (!searchItem.trim()) {
      setAiSuggestions([]);
      setSimilarInStock([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingAi(true);
      try {
        const res = await fetch(`/api/items/ai-suggest?query=${encodeURIComponent(searchItem.trim())}`);
        const data = await res.json();
        if (res.ok) {
          setSimilarInStock(data.similarInStock || []);
          setAiSuggestions(data.aiSuggestions || []);
        }
      } catch (err) {
        console.error("Fetch AI suggestions error:", err);
      } finally {
        setLoadingAi(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchItem]);

  const handleAddItem = (item: { id: string; name: string; unit: string; availableQuantity: number }) => {
    if (selectedItems.some((si) => si.itemId === item.id)) {
      return;
    }
    setSelectedItems((prev) => [
      ...prev,
      {
        itemId: item.id,
        name: item.name,
        unit: item.unit,
        availableQuantity: item.availableQuantity,
        requestedQty: 1,
      },
    ]);
  };

  // Quick-create new item (quantity = 0) and add to request
  const handleQuickCreateAndAdd = async (itemToCreate: {
    name: string;
    category?: string;
    unit?: string;
  }) => {
    setCreatingNew(true);
    setError(null);

    try {
      const res = await fetch("/api/items/quick-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: itemToCreate.name,
          category: itemToCreate.category || "hoc_tap",
          unit: itemToCreate.unit || "cái",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Không thể tạo món mới.");
        setCreatingNew(false);
        return;
      }

      const created = data.item;

      // Update availableItems cache
      setAvailableItems((prev) => {
        if (prev.some((i) => i.id === created.id)) return prev;
        return [
          ...prev,
          {
            id: created.id,
            name: created.name,
            category: created.category,
            unit: created.unit,
            quantity: created.quantity || 0,
            pendingAllocatedQty: 0,
            availableQuantity: 0,
          },
        ];
      });

      // Add to selectedItems
      handleAddItem({
        id: created.id,
        name: created.name,
        unit: created.unit,
        availableQuantity: 0,
      });

      setSearchItem("");
      setNotification(`✨ Đã thêm "${created.name}" vào yêu cầu (Tồn kho = 0, sẽ tự động lập đề xuất mua khi Duyệt).`);
      setTimeout(() => setNotification(null), 6000);
    } catch {
      setError("Lỗi kết nối khi tạo món mới.");
    } finally {
      setCreatingNew(false);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems((prev) => prev.filter((si) => si.itemId !== itemId));
  };

  const handleQuantityChange = (itemId: string, qty: number) => {
    setSelectedItems((prev) =>
      prev.map((si) =>
        si.itemId === itemId ? { ...si, requestedQty: Math.max(1, qty) } : si
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
            itemId: si.itemId,
            requestedQty: si.requestedQty,
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

  const directMatches = availableItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchItem.toLowerCase().trim()) &&
      !selectedItems.some((si) => si.itemId === item.id)
  );

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
              className="text-emerald-600 hover:text-emerald-900 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Item Picker and Selection Table */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6 bg-white/90">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                <span>Danh sách Đồ dùng yêu cầu</span>
              </h3>
              <p className="text-xs text-slate-500">
                Hệ thống tự động tính toán số lượng cấp từ kho & số lượng thiếu cần mua thêm
              </p>
            </div>

            {/* Item Dropdown / Search Input */}
            <div className="relative min-w-[280px] sm:min-w-[360px] group">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
              <input
                type="text"
                value={searchItem}
                onChange={(e) => setSearchItem(e.target.value)}
                placeholder="Tìm đồ dùng (VD: Giấy A4 trắng, Hồ dán khô...)"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all font-medium"
              />
              {loadingAi && (
                <Loader2 className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600 animate-spin" />
              )}

              {searchItem.trim() && (
                <div className="absolute left-0 right-0 sm:-right-24 top-full mt-2 max-h-[460px] overflow-y-auto glass-dropdown rounded-2xl border border-slate-200 shadow-2xl z-40 bg-white p-3 space-y-3">
                  
                  {/* 1. Direct In-Stock Matches */}
                  {directMatches.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 px-2">
                        <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Món có sẵn trong kho ({directMatches.length})</span>
                      </div>
                      <div className="space-y-1">
                        {directMatches.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              handleAddItem(item);
                              setSearchItem("");
                            }}
                            className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-50/70 border border-transparent hover:border-emerald-200 flex items-center justify-between text-xs transition-all cursor-pointer group/item"
                          >
                            <div>
                              <div className="font-bold text-slate-800 group-hover/item:text-emerald-800">{item.name}</div>
                              <div className="text-[11px] text-slate-500">Tồn kho thật: {item.quantity} {item.unit}</div>
                            </div>
                            <div className="text-right">
                              <span className={`font-mono font-bold px-2 py-0.5 rounded-full text-[10px] border ${
                                item.availableQuantity > 0 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}>
                                Khả dụng: {item.availableQuantity} {item.unit}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Similar In-Stock Items (Alternative suggestions in stock) */}
                  {similarInStock.length > 0 && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                      <div className="text-[11px] font-bold text-amber-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Gợi ý món tương tự CÓ SẴN TRONG KHO (Dùng thay thế)</span>
                      </div>
                      <div className="space-y-1.5">
                        {similarInStock.map((sim) => (
                          <div
                            key={sim.id}
                            className="p-2.5 bg-white rounded-lg border border-amber-200/80 flex items-center justify-between gap-2 shadow-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-900 text-xs">{sim.name}</div>
                              <div className="text-[11px] text-amber-700 font-medium">{sim.reason}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                Tồn kho khả dụng: <strong className="text-emerald-700">{sim.availableQuantity} {sim.unit}</strong>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                handleAddItem(sim);
                                setSearchItem("");
                                setNotification(`✨ Đã chọn món tương tự có sẵn: "${sim.name}"`);
                                setTimeout(() => setNotification(null), 5000);
                              }}
                              className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors cursor-pointer shrink-0"
                            >
                              Chọn món này
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. AI Smart Suggestions with Visual Images & Normalized Names */}
                  {aiSuggestions.length > 0 && (
                    <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-bold text-indigo-900 flex items-center gap-1.5">
                          <Bot className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Gợi ý từ AI theo hình ảnh & tên chuẩn hóa:</span>
                        </div>
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                          AI Smart Catalog
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {aiSuggestions.map((aiItem, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 bg-white rounded-xl border border-indigo-100 hover:border-indigo-300 transition-all flex items-center gap-3 shadow-xs"
                          >
                            {/* Real Photographic Thumbnail */}
                            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center shadow-xs">
                              <img
                                src={aiItem.sampleImage}
                                alt={aiItem.name}
                                className="w-full h-full object-cover hover:scale-105 transition-transform"
                                onError={(e) => {
                                  // Fallback to placeholder if image link fails
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-slate-900 text-xs truncate">
                                {aiItem.name}
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                                {aiItem.description}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                  ĐVT: {aiItem.unit}
                                </span>
                                <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 font-bold px-2 py-0.5 rounded-full">
                                  {aiItem.badgeTag || "⭐ Chuẩn mầm non"}
                                </span>
                              </div>
                            </div>

                            {/* Add Action */}
                            <button
                              type="button"
                              disabled={creatingNew}
                              onClick={() => {
                                if (aiItem.alreadyInStock && aiItem.existingItemId) {
                                  const existingInStock = availableItems.find(i => i.id === aiItem.existingItemId);
                                  if (existingInStock) {
                                    handleAddItem(existingInStock);
                                    setSearchItem("");
                                    return;
                                  }
                                }
                                handleQuickCreateAndAdd({
                                  name: aiItem.name,
                                  category: aiItem.category,
                                  unit: aiItem.unit,
                                });
                              }}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg shadow-xs transition-all cursor-pointer shrink-0"
                            >
                              + Chọn món này
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. Manual Quick-Create Button with Exact Typed Name */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={creatingNew}
                      onClick={() => handleQuickCreateAndAdd({ name: searchItem.trim() })}
                      className="w-full py-2 px-3 text-xs font-bold text-slate-700 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-200 hover:border-emerald-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4 text-emerald-600" />
                      <span>Thêm món mới "{searchItem.trim()}" (Tồn kho = 0) vào yêu cầu</span>
                    </button>
                  </div>

                </div>
              )}
            </div>
          </div>

          {/* Quick Select Suggestion Pills */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Gợi ý chọn nhanh đồ dùng phổ biến:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableItems.slice(0, 6).map((item) => {
                const isSelected = selectedItems.some((si) => si.itemId === item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isSelected}
                    onClick={() => handleAddItem(item)}
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
              <p className="text-xs text-slate-500">Vui lòng dùng ô tìm kiếm hoặc danh sách gợi ý phía trên để thêm đồ dùng.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Tên đồ dùng</th>
                    <th className="px-4 py-3">Tồn khả dụng</th>
                    <th className="px-4 py-3">Số lượng xin</th>
                    <th className="px-4 py-3">Dự kiến Phân bổ (Logic 4.1)</th>
                    <th className="px-4 py-3 text-right">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedItems.map((si) => {
                    const allocatedPreview = Math.min(si.requestedQty, Math.max(0, si.availableQuantity));
                    const shortfallPreview = si.requestedQty - allocatedPreview;

                    return (
                      <tr key={si.itemId} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-bold text-slate-800">
                          {si.name}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-black font-mono text-slate-700">
                            {si.availableQuantity} {si.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              value={si.requestedQty}
                              onChange={(e) =>
                                handleQuantityChange(
                                  si.itemId,
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
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(si.itemId)}
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
              <div>Yêu cầu đang ở trạng thái <strong className="text-amber-700">Chờ duyệt (Pending)</strong>. Số lượng được cấp đã được <strong className="text-slate-900">giữ chỗ tạm thời</strong> trong kho khả dụng để tránh tranh chấp.</div>
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
                    const isFullyAllocated = ri.shortfallQty === 0;
                    return (
                      <tr key={ri.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-bold text-slate-800">
                          {ri.item.name}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">{ri.requestedQty} {ri.item.unit}</td>
                        <td className="px-4 py-3 font-mono font-black text-emerald-700">
                          {ri.allocatedQty} {ri.item.unit}
                        </td>
                        <td className="px-4 py-3 font-mono font-black text-amber-700">
                          {ri.shortfallQty} {ri.item.unit}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isFullyAllocated
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {isFullyAllocated ? "Đủ hàng từ kho" : `Thiếu ${ri.shortfallQty} ${ri.item.unit}`}
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

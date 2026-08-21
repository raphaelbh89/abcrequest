"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Loader2,
  PackageCheck,
  PackagePlus,
  Sparkles,
  Globe,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertCircle,
  Plus,
} from "lucide-react";
import { SearchResultItem } from "@/lib/search";
import { ExternalSearchResult } from "@/lib/external-search";

export interface ItemSearchSelectorProps {
  onSelectInternalItem: (item: {
    id: string;
    name: string;
    unit: string;
    availableQuantity: number;
    quantity: number;
    price?: number | null;
    imageUrl?: string | null;
  }) => void;
  onSelectExternalProposal?: (proposal: {
    name: string;
    unit: string;
    price?: number | null;
    imageUrl?: string | null;
    sourceUrl?: string | null;
  }) => void;
  placeholder?: string;
  className?: string;
  excludeItemIds?: string[];
  autoClearOnSelect?: boolean;
}

export function ItemSearchSelector({
  onSelectInternalItem,
  onSelectExternalProposal,
  placeholder = "Tìm đồ dùng trong kho (VD: Giấy A4, Bút chì 2B, Băng dính...)",
  className = "",
  excludeItemIds = [],
  autoClearOnSelect = true,
}: ItemSearchSelectorProps) {
  const [query, setQuery] = useState("");
  const [internalResults, setInternalResults] = useState<SearchResultItem[]>([]);
  const [loadingInternal, setLoadingInternal] = useState(false);

  // External search states
  const [showExternalOption, setShowExternalOption] = useState(false);
  const [loadingExternal, setLoadingExternal] = useState(false);
  const [externalResults, setExternalResults] = useState<ExternalSearchResult[]>([]);
  const [externalError, setExternalError] = useState<string | null>(null);
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Debounce 300ms: Gọi GET /api/search/items (DUY NHẤT khi đang gõ)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setInternalResults([]);
      setExternalResults([]);
      setShowExternalOption(false);
      setLoadingInternal(false);
      setIsOpen(false);
      return;
    }

    setLoadingInternal(true);
    setIsOpen(true);
    setExternalResults([]);
    setExternalError(null);
    setShowExternalOption(true); // Luôn cho phép hiển thị nút gợi ý mở rộng

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/items?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (res.ok) {
          const results: SearchResultItem[] = data.results || [];
          setInternalResults(results);
        }
      } catch (err) {
        console.error("Internal search error:", err);
      } finally {
        setLoadingInternal(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // 2. Khi người dùng CHỦ ĐỘNG bấm "Tìm gợi ý mở rộng"
  const handleTriggerExternalSearch = async () => {
    if (!query.trim()) return;
    setLoadingExternal(true);
    setExternalError(null);

    try {
      const res = await fetch(`/api/search/external?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        setExternalError(data.error || "Không thể tìm kiếm mở rộng.");
        return;
      }

      setExternalResults(data.results || []);
      if (typeof data.remainingQuota === "number") {
        setQuotaRemaining(data.remainingQuota);
      }
    } catch {
      setExternalError("Lỗi kết nối khi tìm kiếm trên Internet.");
    } finally {
      setLoadingExternal(false);
    }
  };

  // Match badge styling
  const getMatchBadge = (type: "exact" | "fuzzy" | "semantic") => {
    switch (type) {
      case "exact":
        return (
          <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
            Khớp chính xác
          </span>
        );
      case "fuzzy":
        return (
          <span className="text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full">
            Gần đúng (Fuzzy)
          </span>
        );
      case "semantic":
        return (
          <span className="text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
            Từ đồng nghĩa
          </span>
        );
    }
  };

  const filteredInternalResults = internalResults.filter(
    (item) => !excludeItemIds.includes(item.id)
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input Box */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-11 pr-11 py-3.5 bg-slate-50/90 border border-slate-200 rounded-2xl text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all font-semibold shadow-xs"
        />
        {loadingInternal && (
          <Loader2 className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600 animate-spin" />
        )}
      </div>

      {/* Results Dropdown Panel */}
      {isOpen && query.trim() && (
        <div className="absolute left-0 right-0 top-full mt-2.5 max-h-[540px] overflow-y-auto glass-dropdown rounded-2xl border border-slate-200/90 shadow-2xl z-50 bg-white p-4 sm:p-5 space-y-4 animate-in fade-in slide-in-from-top-2 w-full min-w-full">
          
          {/* ========================================================= */}
          {/* 1. TẦNG NỘI BỘ (Luôn hiển thị đầu tiên) */}
          {/* ========================================================= */}
          {filteredInternalResults.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between px-2">
                <span className="flex items-center gap-1.5">
                  <PackageCheck className="w-4 h-4 text-emerald-600" />
                  <span>Món trong kho nội bộ ({filteredInternalResults.length})</span>
                </span>
                <span className="text-[11px] text-emerald-600 lowercase font-medium">Ưu tiên hàng đầu</span>
              </div>

              <div className="space-y-2">
                {filteredInternalResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectInternalItem(item);
                      if (autoClearOnSelect) setQuery("");
                      setIsOpen(false);
                    }}
                    className="w-full text-left p-3 sm:p-3.5 rounded-2xl hover:bg-emerald-50/80 border border-transparent hover:border-emerald-200 flex items-center gap-3.5 sm:gap-4 transition-all cursor-pointer group/item bg-slate-50/40"
                  >
                    {/* Thumbnail Image Box */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200/90 bg-white flex items-center justify-center shadow-xs">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <PackageCheck className="w-6 h-6 text-emerald-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm sm:text-base text-slate-900 group-hover/item:text-emerald-800">
                          {item.name}
                        </span>
                        {getMatchBadge(item.matchType)}
                      </div>
                      <div className="text-xs sm:text-[13px] text-slate-500 flex items-center gap-2 flex-wrap">
                        <span>ĐVT: <strong className="text-slate-700">{item.unit}</strong></span>
                        <span>•</span>
                        <span>Tồn thật: <strong className="text-slate-700">{item.quantity}</strong></span>
                        {item.location && <span>• Vị trí: <span className="font-medium text-slate-700">{item.location}</span></span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <span
                        className={`font-mono font-bold px-3.5 py-1.5 rounded-full text-xs sm:text-[13px] border ${
                          item.availableQuantity > 0
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        Khả dụng: {item.availableQuantity} {item.unit}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            !loadingInternal && (
              <div className="p-4 text-center text-sm text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
                Không tìm thấy món nào khớp với "<strong>{query}</strong>" trong kho nội bộ của trường.
              </div>
            )
          )}

          {/* ========================================================= */}
          {/* 2. NÚT CHỦ ĐỘNG XÁC NHẬN "TÌM GỢI Ý MỞ RỘNG" (LUÔN HIỆN KHI CẦN) */}
          {/* ========================================================= */}
          {showExternalOption && !loadingExternal && externalResults.length === 0 && (
            <div className={`p-4 rounded-2xl border transition-all ${
              filteredInternalResults.length > 0
                ? "bg-indigo-50/50 border-indigo-200/70"
                : "bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-blue-200/80 space-y-3"
            }`}>
              {filteredInternalResults.length === 0 && (
                <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-700">
                  <Globe className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900 text-sm sm:text-base">
                      Không tìm thấy "{query}" trong kho trường?
                    </div>
                    <p className="text-xs sm:text-[13px] text-slate-600 mt-1">
                      Bạn có thể tìm kiếm mở rộng trên Internet để nhận gợi ý tên chuẩn, đơn vị tính & giá tham khảo.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleTriggerExternalSearch}
                className={`w-full py-3 px-4 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  filteredInternalResults.length > 0
                    ? "text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-100/60 border border-indigo-200 shadow-2xs"
                    : "text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 shadow-sm"
                }`}
              >
                <Sparkles className={`w-4 h-4 ${filteredInternalResults.length > 0 ? "text-indigo-600" : "text-amber-300"}`} />
                <span>
                  {filteredInternalResults.length > 0
                    ? `Không đúng món bạn cần? Tìm gợi ý mở rộng cho "${query}"`
                    : `Tìm gợi ý mở rộng trên Internet cho "${query}"`}
                </span>
              </button>
            </div>
          )}

          {/* Trạng thái Loading khi gọi Internet */}
          {loadingExternal && (
            <div className="p-6 text-center bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2.5 animate-pulse">
              <Loader2 className="w-7 h-7 mx-auto text-blue-600 animate-spin" />
              <div className="text-sm sm:text-base font-bold text-slate-800">
                Đang tìm kiếm dữ liệu mở rộng trên Internet...
              </div>
              <p className="text-xs sm:text-[13px] text-slate-500">
                Đang đối chiếu nhà cung cấp văn phòng phẩm & trích xuất hình ảnh, giá thực tế
              </p>
            </div>
          )}

          {/* Lỗi tìm kiếm ngoài (hoặc hết hạn mức) */}
          {externalError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <span>{externalError}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. KẾT QUẢ TÌM KIẾM MỞ RỘNG DẠNG THẺ */}
          {/* ========================================================= */}
          {externalResults.length > 0 && (
            <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-50/70 via-purple-50/50 to-white border border-indigo-200 rounded-2xl space-y-3.5 animate-in fade-in">
              <div className="flex items-center justify-between pb-1 border-b border-indigo-100">
                <div className="text-xs sm:text-sm font-bold text-indigo-950 flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-indigo-600" />
                  <span>Gợi ý mở rộng từ Internet ({externalResults.length}):</span>
                </div>
                {quotaRemaining !== null && (
                  quotaRemaining >= 1000 ? (
                    <span className="text-xs bg-emerald-100/90 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-200/80 flex items-center gap-1 shadow-2xs">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>Không giới hạn lượt tìm</span>
                    </span>
                  ) : (
                    <span className="text-xs bg-indigo-100/80 text-indigo-800 font-bold px-3 py-1 rounded-full border border-indigo-200/60">
                      Còn {quotaRemaining} lượt/ngày
                    </span>
                  )
                )}
              </div>

              <div className="space-y-3">
                {externalResults.map((item, idx) => {
                  const priceLabel = item.priceRange
                    ? `${item.priceRange[0].toLocaleString("vi-VN")}đ - ${item.priceRange[1].toLocaleString("vi-VN")}đ`
                    : "Chưa có báo giá";

                  const avgPrice = item.priceRange
                    ? Math.round((item.priceRange[0] + item.priceRange[1]) / 2)
                    : null;

                  return (
                    <div
                      key={idx}
                      className="p-3.5 sm:p-4 bg-white rounded-2xl border border-indigo-100/90 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-4 shadow-2xs"
                    >
                      {/* Ảnh Thumbnail */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center shadow-xs">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <PackagePlus className="w-7 h-7 text-slate-400" />
                        )}
                      </div>

                      {/* Thông tin */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                            {item.name}
                          </div>
                          {item.sourceBadge && (
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                                item.sourceProvider === "shopee"
                                  ? "bg-orange-50 text-orange-700 border-orange-200 shadow-2xs"
                                  : item.sourceProvider === "bookstore_local"
                                  ? "bg-blue-50 text-blue-700 border-blue-200 shadow-2xs"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {item.sourceBadge}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200">
                            ĐVT: {item.unit}
                          </span>
                          <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium">
                            ⚠️ Giá tham khảo: <strong>{priceLabel}</strong>
                          </span>
                        </div>

                        {/* Link nguồn kiểm chứng */}
                        {item.sourceUrl && (
                          <div className="pt-0.5">
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Link nguồn kiểm chứng</span>
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Nút Chọn đề xuất */}
                      <div className="shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex justify-end">
                        {onSelectExternalProposal ? (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectExternalProposal({
                                name: item.name,
                                unit: item.unit,
                                price: avgPrice,
                                imageUrl: item.imageUrl,
                                sourceUrl: item.sourceUrl,
                              });
                              if (autoClearOnSelect) setQuery("");
                              setIsOpen(false);
                            }}
                            className="w-full sm:w-auto px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Chọn món này</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectInternalItem({
                                id: "",
                                name: item.name,
                                unit: item.unit,
                                availableQuantity: 0,
                                quantity: 0,
                                price: avgPrice,
                                imageUrl: item.imageUrl,
                              });
                              if (autoClearOnSelect) setQuery("");
                              setIsOpen(false);
                            }}
                            className="w-full sm:w-auto px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm cursor-pointer"
                          >
                            + Điền vào form
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

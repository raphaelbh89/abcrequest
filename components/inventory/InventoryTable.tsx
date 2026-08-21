"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Search,
  Filter,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  ArrowUpRight,
  RefreshCw,
  Boxes,
  MapPin,
  Tag,
  CheckCircle2,
  Sparkles,
  TrendingDown,
  Ban
} from "lucide-react";
import { ItemModal, ItemData } from "./ItemModal";
import { StockInModal } from "./StockInModal";
import { useSettings } from "@/components/settings/SettingsProvider";

interface UserInfo {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

interface InventoryTableProps {
  user: UserInfo;
}

export function InventoryTable({ user }: InventoryTableProps) {
  const { categories, getCategory } = useSettings();
  const [items, setItems] = useState<ItemData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemData | null>(null);

  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [stockInItem, setStockInItem] = useState<ItemData | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ItemData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category && category !== "all") params.set("category", category);
      if (lowStockOnly) params.set("lowStock", "true");

      const res = await fetch(`/api/items?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
      }
    } catch (err) {
      console.error("Fetch items error:", err);
    } finally {
      setLoading(false);
    }
  }, [search, category, lowStockOnly]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleOpenAddModal = () => {
    setSelectedItem(null);
    setIsItemModalOpen(true);
  };

  const handleOpenEditModal = (item: ItemData) => {
    setSelectedItem(item);
    setIsItemModalOpen(true);
  };

  const handleOpenStockInModal = (item: ItemData) => {
    setStockInItem(item);
    setIsStockInModalOpen(true);
  };

  const handleDeleteItem = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/items/${deleteTarget.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || "Không thể xóa mặt hàng này.");
        setDeleting(false);
        return;
      }

      setDeleteTarget(null);
      fetchItems();
    } catch {
      setDeleteError("Lỗi kết nối máy chủ khi xóa mặt hàng.");
    } finally {
      setDeleting(false);
    }
  };

  // Quyền quản lý kho: Admin, Manager, Stocker
  const isAdmin = ["admin", "manager", "stocker"].includes(user.role);

  return (
    <div className="space-y-6">
      {/* Header Controls Bar */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4 bg-white/90">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 group">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm đồ dùng theo tên..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all font-medium"
              />
            </div>

            {/* Category Filter */}
            <div className="relative min-w-[180px]">
              <Filter className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all cursor-pointer"
              >
                <option value="all">Tất cả loại đồ dùng</option>
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

            {/* Low Stock Toggle Switch */}
            <label className={`flex items-center gap-2 px-3.5 py-2.5 border rounded-xl text-xs font-semibold cursor-pointer select-none transition-all ${
              lowStockOnly
                ? "bg-rose-50 text-rose-700 border-rose-300 shadow-xs"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900"
            }`}>
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
                className="sr-only"
              />
              <AlertTriangle className={`w-4 h-4 ${lowStockOnly ? "text-rose-600 animate-bounce" : "text-slate-400"}`} />
              <span>Chỉ hiện hết / sắp hết</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchItems}
              className="flex items-center justify-center p-2.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer shadow-xs"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
            </button>

            {isAdmin && (
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm đồ dùng mới</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Glass Container */}
      <div className="glass-panel rounded-3xl border border-slate-200/80 shadow-md overflow-hidden bg-white/95">
        {loading ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Đang tải danh sách tồn kho...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <Boxes className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-base font-bold text-slate-700">
              Không tìm thấy đồ dùng nào
            </p>
            <p className="text-xs text-slate-500">Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn lọc hàng sắp hết.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Tên đồ dùng</th>
                  <th className="px-4 py-4">Phân loại</th>
                  <th className="px-4 py-4">Đơn vị</th>
                  <th className="px-4 py-4">Tồn khả dụng / Trạng thái</th>
                  <th className="px-4 py-4">Ngưỡng tối thiểu</th>
                  <th className="px-4 py-4">Đơn giá tham khảo</th>
                  <th className="px-4 py-4">Vị trí</th>
                  {isAdmin && <th className="px-6 py-4 text-right">Hành động</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const physicalStock = item.quantity;
                  const pendingHold = item.pendingAllocatedQty || 0;
                  const availableStock =
                    item.availableQuantity !== undefined
                      ? item.availableQuantity
                      : Math.max(0, physicalStock - pendingHold);
                  const isOutStock = availableStock === 0;
                  const isLowStock = availableStock < item.minStock;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center shadow-2xs">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <Boxes className="w-4.5 h-4.5 text-slate-400" />
                            )}
                          </div>
                          <div className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors text-sm sm:text-base">
                            {item.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {(() => {
                          const catInfo = getCategory(item.category);
                          const catName = catInfo?.name || (item.category === "hoc_tap" ? "Học tập" : item.category === "ngoai_khoa" ? "Ngoại khóa" : item.category);
                          const catColor = catInfo?.color || (item.category === "hoc_tap" ? "sky" : "purple");
                          const catColorClass =
                            catColor === "sky"
                              ? "bg-sky-50 text-sky-700 border-sky-200"
                              : catColor === "purple"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : catColor === "emerald"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : catColor === "amber"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : catColor === "rose"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-indigo-50 text-indigo-700 border-indigo-200";

                          return (
                            <span
                              className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold border text-center ${catColorClass}`}
                            >
                              {catName}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-4 text-slate-600 font-medium">{item.unit}</td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`font-black text-base font-mono ${
                                isOutStock
                                  ? "text-red-600"
                                  : isLowStock
                                  ? "text-amber-600"
                                  : "text-emerald-700"
                              }`}
                            >
                              {availableStock}
                            </span>
                            {isOutStock ? (
                              <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 text-center">
                                <Ban className="w-3 h-3 text-red-600" />
                                {physicalStock > 0 ? "Tạm giữ hết" : "Hết"}
                              </span>
                            ) : isLowStock ? (
                              <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 text-center">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                Sắp hết
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 text-center">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Đủ kho
                              </span>
                            )}
                          </div>

                          {pendingHold > 0 && (
                            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center justify-center text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-center">
                                Đang giữ: {pendingHold} {item.unit}
                              </span>
                              <span className="text-slate-400 font-mono text-[10px]">
                                (Kho: {physicalStock})
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-500 font-mono text-xs font-semibold">{item.minStock} {item.unit}</td>
                      <td className="px-4 py-4 text-slate-700 font-mono text-xs font-semibold">
                        {item.price ? `${item.price.toLocaleString("vi-VN")} đ` : "—"}
                      </td>
                      <td className="px-4 py-4 text-slate-500 text-xs">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {item.location || "Chưa xếp"}
                        </span>
                      </td>

                      {isAdmin && (
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            <button
                              onClick={() => handleOpenStockInModal(item)}
                              title="Nhập kho thủ công"
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                              <span className="whitespace-nowrap">Nhập kho</span>
                            </button>

                            <button
                              onClick={() => handleOpenEditModal(item)}
                              title="Chỉnh sửa"
                              className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl border border-transparent hover:border-sky-200 transition-all cursor-pointer shrink-0"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                setDeleteTarget(item);
                                setDeleteError(null);
                              }}
                              title="Xóa mặt hàng"
                              className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition-all cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Item Form Modal (Add / Edit) */}
      <ItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSuccess={fetchItems}
        initialData={selectedItem}
      />

      {/* Stock In Modal */}
      <StockInModal
        isOpen={isStockInModalOpen}
        onClose={() => setIsStockInModalOpen(false)}
        onSuccess={fetchItems}
        item={stockInItem}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md glass-dropdown rounded-3xl p-6 sm:p-8 space-y-4 border border-rose-200 shadow-2xl bg-white">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Xác nhận xóa mặt hàng
                </h3>
                <p className="text-xs text-slate-500">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa mặt hàng đồ dùng{" "}
              <span className="font-bold text-slate-900">"{deleteTarget.name}"</span> không?
            </p>

            {deleteError && (
              <div className="p-3 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteItem}
                disabled={deleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md shadow-rose-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {deleting ? "Đang xóa..." : "Xác nhận Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

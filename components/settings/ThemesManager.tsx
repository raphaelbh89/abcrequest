"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  Calendar,
  Layers,
  HelpCircle,
  Clock,
  Archive,
} from "lucide-react";
import { useToast } from "@/components/common/Toast";
import { ConfirmModal } from "@/components/common/ConfirmModal";

export interface EventThemeItem {
  id: string;
  name: string;
  description?: string | null;
  icon?: string;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  requestCount?: number;
}

const COMMON_EMOJIS = ["🏮", "🌸", "🎨", "🌱", "🏃", "🎃", "🎄", "☀️", "📚", "🎈", "🎭", "🚀", "🎯", "⭐"];

export function ThemesManager() {
  const { success, error } = useToast();
  const [themes, setThemes] = useState<EventThemeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<EventThemeItem | null>(null);
  const [themeName, setThemeName] = useState("");
  const [themeDesc, setThemeDesc] = useState("");
  const [themeIcon, setThemeIcon] = useState("🎯");
  const [themeIsActive, setThemeIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<EventThemeItem | null>(null);

  const fetchThemes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/themes");
      const data = await res.json();
      if (res.ok && data.themes) {
        setThemes(data.themes);
      }
    } catch (err) {
      console.error("Fetch themes error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  const handleOpenAdd = () => {
    setEditingTheme(null);
    setThemeName("");
    setThemeDesc("");
    setThemeIcon("🎯");
    setThemeIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (theme: EventThemeItem) => {
    setEditingTheme(theme);
    setThemeName(theme.name);
    setThemeDesc(theme.description || "");
    setThemeIcon(theme.icon || "🎯");
    setThemeIsActive(theme.isActive);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!themeName.trim()) {
      error("Vui lòng nhập tên Chủ đề / Sự kiện.");
      return;
    }

    setSaving(true);

    try {
      const isEdit = Boolean(editingTheme);
      const url = isEdit ? `/api/themes/${editingTheme?.id}` : "/api/themes";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: themeName.trim(),
          description: themeDesc.trim() || null,
          icon: themeIcon,
          isActive: themeIsActive,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        error(data.error || "Không thể lưu chủ đề sự kiện.");
        return;
      }

      await fetchThemes();
      setIsModalOpen(false);
      success(isEdit ? "Đã cập nhật chủ đề thành công!" : "Đã thêm chủ đề sự kiện mới thành công!");
    } catch {
      error("Lỗi kết nối máy chủ khi lưu chủ đề.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(`/api/themes/${deleteTarget.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        error(data.error || "Không thể xóa chủ đề.");
        return;
      }

      await fetchThemes();
      success(data.message || "Đã xóa chủ đề thành công.");
    } catch {
      error("Lỗi kết nối khi xóa chủ đề.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleToggleActive = async (theme: EventThemeItem) => {
    try {
      const res = await fetch(`/api/themes/${theme.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !theme.isActive }),
      });

      if (res.ok) {
        fetchThemes();
        success(`Đã chuyển trạng thái sang ${!theme.isActive ? "Đang mở" : "Đã đóng"}`);
      }
    } catch {
      error("Không thể đổi trạng thái chủ đề.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600" />
            <span>Kế Hoạch Sự Kiện & Chủ Đề Hoạt Động Của Trường</span>
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl">
            Tạo các kế hoạch, sự kiện trọng tâm theo tháng/học kỳ (VD: Lễ hội Trung Thu, Hội Xuân, Bé sáng tạo...). Các cô giáo ở các lớp sẽ cùng chọn chủ đề này để hệ thống tự động gộp đơn mua sắm theo từng sự kiện.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Chủ Đề / Sự Kiện Mới</span>
        </button>
      </div>

      {/* Themes List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 glass-panel rounded-3xl border border-slate-200 bg-white">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Đang tải danh sách chủ đề...</p>
        </div>
      ) : themes.length === 0 ? (
        <div className="p-12 text-center text-slate-400 glass-panel rounded-3xl border border-slate-200 bg-white space-y-2">
          <Target className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-700">Chưa có chủ đề / sự kiện nào</p>
          <p className="text-xs text-slate-500">Hãy thêm chủ đề để các cô có thể chọn khi tạo yêu cầu đồ dùng.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {themes.map((theme) => (
            <div
              key={theme.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 bg-white shadow-2xs ${
                theme.isActive ? "border-slate-200/90 hover:border-emerald-300" : "border-slate-200 opacity-60 bg-slate-50/60"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 rounded-xl bg-slate-100/80 shrink-0">{theme.icon || "🎯"}</span>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">{theme.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(theme)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                            theme.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${theme.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                          <span>{theme.isActive ? "Đang mở nhận đề xuất" : "Đã đóng (Lưu trữ)"}</span>
                        </button>

                        {theme.requestCount !== undefined && theme.requestCount > 0 && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-bold border border-sky-200">
                            {theme.requestCount} phiếu yêu cầu
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {theme.description && (
                  <p className="text-xs text-slate-600 pl-1">{theme.description}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(theme)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 cursor-pointer transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Sửa</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteTarget(theme)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Theme Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-600" />
                <span>{editingTheme ? "Cập Nhật Chủ Đề / Sự Kiện" : "Thêm Chủ Đề / Sự Kiện Mới"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên Chủ đề / Kế hoạch sự kiện <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={themeName}
                  onChange={(e) => setThemeName(e.target.value)}
                  placeholder="VD: Lễ hội Trung Thu 2026, Hội thi Bé Khỏe Bé Ngoan..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Biểu tượng Icon / Emoji
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {COMMON_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setThemeIcon(emoji)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                        themeIcon === emoji
                          ? "bg-emerald-100 border-2 border-emerald-600 scale-110"
                          : "bg-slate-50 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mô tả chi tiết kế hoạch / Mục đích
                </label>
                <textarea
                  rows={2}
                  value={themeDesc}
                  onChange={(e) => setThemeDesc(e.target.value)}
                  placeholder="VD: Kế hoạch trang trí và tổ chức hoạt động cho các khối lớp..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="themeActiveCheck"
                  checked={themeIsActive}
                  onChange={(e) => setThemeIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="themeActiveCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Mở cho phép các lớp chọn chủ đề này khi tạo yêu cầu
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{saving ? "Đang lưu..." : "Lưu Chủ Đề"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Xác nhận xóa chủ đề sự kiện"
        message={`Bạn có chắc chắn muốn xóa chủ đề "${deleteTarget?.name}"? Nếu chủ đề đã có phiếu yêu cầu sử dụng, hệ thống sẽ tự động chuyển sang trạng thái Đóng Lưu Trữ an toàn.`}
        confirmText="Xóa chủ đề"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

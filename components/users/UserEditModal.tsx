"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Edit, KeyRound } from "lucide-react";

interface UserItem {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: UserItem | null;
}

export function UserEditModal({ isOpen, onClose, onSuccess, user }: UserEditModalProps) {
  const [mounted, setMounted] = useState(false);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "stocker" | "teacher">("teacher");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setRole((user.role as any) || "teacher");
      setNewPassword("");
    }
    setError(null);
  }, [user, isOpen]);

  if (!isOpen || !user || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Vui lòng nhập họ và tên.");
      return;
    }

    if (newPassword && newPassword.trim().length < 4) {
      setError("Mật khẩu mới phải có tối thiểu 4 ký tự.");
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        fullName: fullName.trim(),
        role,
      };

      if (newPassword.trim()) {
        payload.newPassword = newPassword.trim();
      }

      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Không thể cập nhật tài khoản.");
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Lỗi kết nối máy chủ khi cập nhật tài khoản.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md glass-dropdown rounded-3xl border border-sky-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 bg-white">
        <div className="flex items-center justify-between p-6 border-b border-sky-100 bg-gradient-to-r from-sky-50/60 via-indigo-50/30 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-50 text-sky-700 rounded-xl border border-sky-200">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Chỉnh sửa tài khoản
              </h2>
              <p className="text-xs text-slate-500">Cập nhật thông tin và đổi mật khẩu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3.5 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tên đăng nhập
            </label>
            <input
              type="text"
              value={user.username}
              disabled
              className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-mono text-sm cursor-not-allowed font-bold"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Tên đăng nhập không thể thay đổi</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Họ và tên <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="VD: Cô Nguyễn Thị Hoa"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 focus:bg-white transition-all font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Đổi mật khẩu mới
            </label>
            <div className="relative">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Để trống nếu giữ nguyên mật khẩu cũ"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 focus:bg-white transition-all font-medium"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Chỉ nhập nếu bạn muốn đặt lại mật khẩu mới cho người này (tối thiểu 4 ký tự).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Vai trò & Phân quyền
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  role === "admin"
                    ? "bg-purple-50 border-purple-300 text-purple-900 shadow-xs ring-1 ring-purple-400"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="text-xs font-bold">👑 Quản trị (Admin)</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Toàn quyền hệ thống & cài đặt</span>
              </button>

              <button
                type="button"
                onClick={() => setRole("manager")}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  role === "manager"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs ring-1 ring-emerald-400"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="text-xs font-bold">👔 Quản lý (BGH)</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Duyệt đơn & quản lý kho</span>
              </button>

              <button
                type="button"
                onClick={() => setRole("stocker")}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  role === "stocker"
                    ? "bg-amber-50 border-amber-300 text-amber-900 shadow-xs ring-1 ring-amber-400"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="text-xs font-bold">📦 Thủ kho / Mua sắm</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Kho tồn, nhập hàng & mua sắm</span>
              </button>

              <button
                type="button"
                onClick={() => setRole("teacher")}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  role === "teacher"
                    ? "bg-cyan-50 border-cyan-300 text-cyan-900 shadow-xs ring-1 ring-cyan-400"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="text-xs font-bold">👩‍🏫 Giáo viên</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Tạo yêu cầu & nhận đồ dùng</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-blue-500 hover:from-sky-500 hover:to-blue-400 rounded-xl shadow-md shadow-sky-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit className="w-4 h-4" />}
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

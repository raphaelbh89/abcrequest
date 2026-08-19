"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, KeyRound, CheckCircle2, AlertCircle, Lock } from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    username: string;
    fullName: string;
    role: string;
  } | null;
}

export function ChangePasswordModal({ isOpen, onClose, user }: ChangePasswordModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !user || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword) {
      setError("Vui lòng nhập mật khẩu hiện tại của bạn.");
      return;
    }

    if (newPassword.length < 4) {
      setError("Mật khẩu mới phải có tối thiểu 4 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Xác nhận mật khẩu mới không trùng khớp. Vui lòng nhập lại.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Không thể đổi mật khẩu.");
        setLoading(false);
        return;
      }

      setSuccess("Đổi mật khẩu thành công! Mật khẩu mới đã được cập nhật.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1500);
    } catch {
      setError("Lỗi kết nối máy chủ. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md glass-dropdown rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 bg-white">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Đổi Mật Khẩu Cá Nhân
              </h2>
              <p className="text-xs text-slate-500">Cập nhật mật khẩu bảo mật tài khoản</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info Bar */}
        <div className="mx-6 mt-5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 font-medium">Tài khoản:</span>{" "}
            <strong className="text-slate-900 font-mono font-bold">{user.username}</strong>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            {user.fullName}
          </span>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3.5 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mx-6 mt-4 p-3.5 text-xs text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mật khẩu hiện tại <span className="text-rose-600">*</span>
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Nhập mật khẩu bạn đang dùng..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mật khẩu mới <span className="text-rose-600">*</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới (tối thiểu 4 ký tự)..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Xác nhận mật khẩu mới <span className="text-rose-600">*</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới để xác nhận..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition-all font-medium"
              required
            />
          </div>

          <p className="text-[11px] text-slate-400 italic">
            * Mật khẩu mới sẽ được mã hóa an toàn bằng chuẩn <strong>bcrypt</strong> (10 salt rounds).
          </p>

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
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 rounded-xl shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>Lưu Mật Khẩu Mới</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

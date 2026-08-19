import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, UserPlus } from "lucide-react";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UserModal({ isOpen, onClose, onSuccess }: UserModalProps) {
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "stocker" | "teacher">("teacher");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || username.trim().length < 3) {
      setError("Tên đăng nhập phải chứa ít nhất 3 ký tự.");
      return;
    }

    if (!fullName.trim()) {
      setError("Vui lòng nhập họ và tên.");
      return;
    }

    if (!password || password.length < 4) {
      setError("Mật khẩu phải chứa ít nhất 4 ký tự.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          fullName: fullName.trim(),
          password,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Không thể tạo tài khoản người dùng.");
        setLoading(false);
        return;
      }

      setUsername("");
      setFullName("");
      setPassword("");
      setRole("teacher");
      onSuccess();
      onClose();
    } catch {
      setError("Lỗi kết nối máy chủ khi tạo tài khoản.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md glass-dropdown rounded-3xl border border-purple-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 bg-white">
        <div className="flex items-center justify-between p-6 border-b border-purple-100 bg-gradient-to-r from-purple-50/60 via-indigo-50/30 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl border border-purple-200">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Thêm tài khoản mới
              </h2>
              <p className="text-xs text-slate-500">Cấp quyền truy cập cho giáo viên hoặc quản trị</p>
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
              Tên đăng nhập <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
              placeholder="VD: giaovien1, nguyenhoa..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 focus:bg-white transition-all font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Họ và tên đầy đủ <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="VD: Cô Nguyễn Thị Hoa"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 focus:bg-white transition-all font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mật khẩu khởi tạo <span className="text-rose-600">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập ít nhất 4 ký tự..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 focus:bg-white transition-all font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Vai trò & Phân quyền tài khoản
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
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 rounded-xl shadow-md shadow-purple-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              <span>Tạo tài khoản</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

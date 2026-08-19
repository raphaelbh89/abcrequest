"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  LogIn, 
  Lock, 
  User, 
  AlertCircle, 
  Loader2, 
  Boxes, 
  ShieldCheck, 
  GraduationCap,
  Sparkles,
  ArrowRight
} from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (u: string, p: string) => {
    setError(null);

    if (!u.trim() || !p) {
      setError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(username, password);
  };

  const quickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    handleLogin(u, p);
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Background glow behind card */}
      <div className="absolute -top-12 -left-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative glass-panel rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-2xl backdrop-blur-2xl bg-white/95">
        
        {/* Header with Logo */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-indigo-500/15 border border-emerald-500/20 shadow-xs">
            <Boxes className="w-9 h-9 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Kho Mầm Non
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Hệ thống Quản lý Đồ dùng Học tập & Ngoại khóa
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 p-3.5 text-xs sm:text-sm text-rose-700 bg-rose-50 rounded-xl border border-rose-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Tên đăng nhập
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="quanly hoặc giaovien"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Mật khẩu
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Shimmer Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full relative group mt-2 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden cursor-pointer"
          >
            <span className="absolute inset-0 w-full h-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Đang xác thực...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span className="text-sm">Đăng nhập hệ thống</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Quick Login Section */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Đăng nhập nhanh để trải nghiệm
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => quickLogin("quanly", "quanly123")}
              disabled={loading}
              className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 text-left transition-all group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                  Quản lý
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">
                  Admin
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => quickLogin("giaovien", "giaovien123")}
              disabled={loading}
              className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-sky-50/50 border border-slate-200 hover:border-sky-300 text-left transition-all group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center text-sky-700 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-800 group-hover:text-sky-700 transition-colors">
                  Giáo viên
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">
                  Teacher
                </div>
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

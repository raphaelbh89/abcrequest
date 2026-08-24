"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { ThemesManager } from "@/components/settings/ThemesManager";
import { Target, Sparkles, ShieldCheck } from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

export default function ThemesPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          if (!["admin", "manager"].includes(data.user.role)) {
            router.push("/dashboard");
            return;
          }
          setUser(data.user);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30 flex items-center justify-center">
        <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Title */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md bg-white/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>Dành cho Ban Giám Hiệu & Quản Trị • BGH</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Target className="w-7 h-7 text-emerald-600" />
              <span>Quản Lý Kế Hoạch & Sự Kiện Trường</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Thiết lập các kế hoạch trọng tâm, sự kiện lễ hội trường để các khối lớp đề xuất đồ dùng và hệ thống tự động gộp đơn mua sắm
            </p>
          </div>
        </div>

        {/* Themes Management Content */}
        <ThemesManager />
      </main>
    </div>
  );
}

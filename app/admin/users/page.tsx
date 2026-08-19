"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { UserTable } from "@/components/users/UserTable";
import { Users, Shield, Sparkles } from "lucide-react";

interface UserInfo {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
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
          if (data.user.role !== "admin") {
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-xs font-medium">Đang tải trang quản lý người dùng...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen pb-12">
      <Navbar user={user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 mb-2">
            <Shield className="w-3.5 h-3.5 text-purple-600" />
            <span>Quản trị & Phân quyền</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Quản Lý Người Dùng & Phân Quyền
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tạo tài khoản mới cho giáo viên và quản lý, mã hóa mật khẩu bcrypt, phân quyền và kiểm soát an toàn.
          </p>
        </div>

        <UserTable currentUser={user} />
      </main>
    </div>
  );
}

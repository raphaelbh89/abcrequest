"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { PurchaseProposalList } from "@/components/purchase-proposals/PurchaseProposalList";
import { ShoppingCart, Sparkles } from "lucide-react";

interface UserInfo {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

export default function PurchaseProposalsPage() {
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
          if (!["admin", "manager", "stocker"].includes(data.user.role)) {
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
          <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-xs font-medium">Đang tải danh sách đề xuất mua...</p>
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 mb-2">
            <ShoppingCart className="w-3.5 h-3.5 text-amber-600" />
            <span>Thu mua & Nhập kho</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Quản Lý Đề Xuất Mua Đồ Dùng
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tổng hợp phần đồ dùng bị thiếu từ các yêu cầu đã duyệt, quản lý trạng thái đặt mua và nhập kho bổ sung.
          </p>
        </div>

        <PurchaseProposalList />
      </main>
    </div>
  );
}

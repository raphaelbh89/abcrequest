"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { StockTransactionList } from "@/components/inventory/StockTransactionList";
import { History, Sparkles } from "lucide-react";

interface UserInfo {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

export default function StockTransactionsPage() {
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
          <p className="text-slate-500 text-xs font-medium">Đang tải nhật ký lịch sử kho...</p>
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
            <History className="w-3.5 h-3.5" />
            <span>Truy vết & Kiểm toán kho</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Nhật Ký Lịch Sử Kho (Audit Trail)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Theo dõi và truy vết minh bạch 100% mọi giao dịch nhập kho, xuất kho duyệt yêu cầu và điều chỉnh tồn kho.
          </p>
        </div>

        <StockTransactionList />
      </main>
    </div>
  );
}

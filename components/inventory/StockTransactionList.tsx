"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  History,
  ArrowUpRight,
  ArrowDownLeft,
  SlidersHorizontal,
  RefreshCw,
  User,
  Boxes,
  Activity
} from "lucide-react";

interface StockTxItem {
  id: string;
  type: "nhap_kho" | "xuat_kho_duyet_yc" | "dieu_chinh" | string;
  quantityChange: number;
  referenceId?: string | null;
  createdAt: string;
  note?: string | null;
  item: {
    id: string;
    name: string;
    unit: string;
    category: string;
  };
  performedUser: {
    id: string;
    username: string;
    fullName: string;
    role: string;
  };
}

export function StockTransactionList() {
  const [transactions, setTransactions] = useState<StockTxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter && typeFilter !== "all") {
        params.set("type", typeFilter);
      }

      const res = await fetch(`/api/stock-transactions?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error("Fetch transactions error:", err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "nhap_kho":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ArrowUpRight className="w-3.5 h-3.5" /> Nhập kho
          </span>
        );
      case "xuat_kho_duyet_yc":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <ArrowDownLeft className="w-3.5 h-3.5" /> Xuất kho duyệt YC
          </span>
        );
      case "dieu_chinh":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Điều chỉnh
          </span>
        );
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white/90">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500">
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">Tất cả loại giao dịch</option>
            <option value="nhap_kho">Nhập kho (+)</option>
            <option value="xuat_kho_duyet_yc">Xuất kho duyệt YC (-)</option>
            <option value="dieu_chinh">Điều chỉnh kho</option>
          </select>
        </div>

        <button
          onClick={fetchTransactions}
          className="flex items-center justify-center p-2.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors self-end sm:self-auto cursor-pointer shadow-xs"
          title="Làm mới"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel rounded-3xl border border-slate-200/80 shadow-md overflow-hidden bg-white/95">
        {loading ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Đang tải nhật ký lịch sử kho...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <History className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-base font-bold text-slate-700">
              Chưa có lịch sử giao dịch nào
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Thời gian</th>
                  <th className="px-6 py-4">Mặt hàng</th>
                  <th className="px-4 py-4">Loại giao dịch</th>
                  <th className="px-4 py-4">Biến động số lượng</th>
                  <th className="px-4 py-4">Người thực hiện</th>
                  <th className="px-6 py-4">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => {
                  const formattedTime = new Date(tx.createdAt).toLocaleString("vi-VN");
                  const isPositive = tx.quantityChange > 0;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 text-xs font-mono text-slate-500 font-medium">{formattedTime}</td>
                      <td className="px-6 py-4 font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                        {tx.item.name}
                      </td>
                      <td className="px-4 py-4">{getTypeBadge(tx.type)}</td>
                      <td className="px-4 py-4 font-mono font-black text-base">
                        <span
                          className={
                            isPositive
                              ? "text-emerald-700"
                              : "text-rose-600"
                          }
                        >
                          {isPositive ? `+${tx.quantityChange}` : tx.quantityChange} <span className="text-xs font-normal text-slate-500">{tx.item.unit}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-700 font-semibold">
                        {tx.performedUser.fullName}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{tx.note || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

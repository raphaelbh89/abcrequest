"use client";

import React, { useRef } from "react";
import {
  X,
  Printer,
  FileCheck2,
  Calendar,
  User as UserIcon,
  Download,
  Building2,
} from "lucide-react";
import { useSettings } from "@/components/settings/SettingsProvider";

interface DisbursementVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  disbursement: any;
}

export function DisbursementVoucherModal({
  isOpen,
  onClose,
  disbursement,
}: DisbursementVoucherModalProps) {
  const { settings } = useSettings();
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !disbursement) return null;

  const handlePrint = () => {
    window.print();
  };

  const disbursedDate = new Date(disbursement.disbursedAt);
  const formattedDate = `Ngày ${disbursedDate.getDate()} tháng ${disbursedDate.getMonth() + 1} năm ${disbursedDate.getFullYear()}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[94vh] flex flex-col">
        
        {/* Header Actions */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <FileCheck2 className="w-5 h-5 text-emerald-600" />
            <span>Biên bản Cấp phát Đồ dùng: <strong>{disbursement.code}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In phiếu bàn giao</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper */}
        <div className="p-8 sm:p-12 overflow-y-auto flex-1 bg-white text-slate-900" ref={printRef}>
          <div className="max-w-2xl mx-auto space-y-6">
            
            {/* Top School Header */}
            <div className="flex items-start justify-between border-b border-slate-300 pb-4 text-xs">
              <div>
                <p className="font-bold uppercase text-slate-800">{settings.school_name || "TRƯỜNG MẦM NON"}</p>
                <p className="text-slate-500">Bộ phận: Quản lý Kho & Đồ dùng</p>
                <p className="text-slate-500">{settings.address || ""}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-800">Mẫu số: 02-CP/MN</p>
                <p className="font-mono text-emerald-700 font-bold">Số: {disbursement.code}</p>
                <p className="text-slate-500 italic">{formattedDate}</p>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center space-y-1">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900">
                PHIẾU CẤP PHÁT ĐỒ DÙNG
              </h1>
              <p className="text-xs text-slate-500 italic">
                (Kèm theo phiếu yêu cầu: {disbursement.request?.purpose || "Hoạt động giảng dạy"})
              </p>
            </div>

            {/* Recipient & Issuer Info */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
              <div className="space-y-1">
                <p>Họ tên người nhận: <strong>{disbursement.recipient?.fullName}</strong></p>
                <p>Tài khoản / Vai trò: <strong>{disbursement.recipient?.username}</strong> ({disbursement.recipient?.role === "teacher" ? "Giáo viên" : disbursement.recipient?.role})</p>
                <p>Mục đích sử dụng: <strong>{disbursement.request?.purpose}</strong></p>
              </div>
              <div className="space-y-1 text-right sm:text-left">
                <p>Người lập phiếu / Cấp phát: <strong>{disbursement.disbursedUser?.fullName}</strong></p>
                <p>Thời gian cấp phát: <strong>{disbursedDate.toLocaleTimeString("vi-VN")} - {disbursedDate.toLocaleDateString("vi-VN")}</strong></p>
                <p>Ghi chú: <span className="italic">{disbursement.note || "Bàn giao đầy đủ đồ dùng"}</span></p>
              </div>
            </div>

            {/* Table of Items */}
            <div className="overflow-hidden rounded-xl border border-slate-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-center w-12 border-r border-slate-300">STT</th>
                    <th className="px-3 py-2 border-r border-slate-300">Tên đồ dùng / Giáo cụ</th>
                    <th className="px-3 py-2 text-center w-20 border-r border-slate-300">ĐVT</th>
                    <th className="px-3 py-2 text-center w-24 border-r border-slate-300">Số lượng</th>
                    <th className="px-3 py-2 text-center w-28">Tái sử dụng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(disbursement.items || []).map((it: any, idx: number) => (
                    <tr key={it.id || idx}>
                      <td className="px-3 py-2 text-center font-mono border-r border-slate-200 text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2 font-bold text-slate-900 border-r border-slate-200">
                        {it.itemName}
                      </td>
                      <td className="px-3 py-2 text-center border-r border-slate-200 text-slate-700">
                        {it.itemUnit}
                      </td>
                      <td className="px-3 py-2 text-center font-mono font-black text-slate-900 border-r border-slate-200">
                        {it.disbursedQty}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-600">
                        {it.isReusable ? "Thu hồi sau khi dùng" : "Tiêu hao"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary info */}
            <div className="text-xs text-slate-600 italic space-y-1">
              <p>
                * Lưu ý: Đối với các đồ dùng có thể tái sử dụng, giáo viên vui lòng bảo quản và hoàn trả lại kho sau khi kết thúc chủ đề/hoạt động.
              </p>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs">
              <div className="space-y-12">
                <p className="font-bold text-slate-800">NGƯỜI NHẬN ĐỒ</p>
                <p className="font-bold text-slate-900">{disbursement.recipient?.fullName}</p>
              </div>

              <div className="space-y-12">
                <p className="font-bold text-slate-800">THỦ KHO / CẤP PHÁT</p>
                <p className="font-bold text-slate-900">{disbursement.disbursedUser?.fullName}</p>
              </div>

              <div className="space-y-12">
                <p className="font-bold text-slate-800">BAN GIÁM HIỆU</p>
                <p className="italic text-slate-400">(Ký và đóng dấu)</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

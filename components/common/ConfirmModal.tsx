"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "success" | "primary";
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  variant = "primary",
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          icon: <AlertTriangle className="w-5 h-5" />,
          iconBg: "bg-rose-50 text-rose-700 border-rose-200",
          btnBg: "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20",
          border: "border-rose-200",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-5 h-5" />,
          iconBg: "bg-amber-50 text-amber-700 border-amber-200",
          btnBg: "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20",
          border: "border-amber-200",
        };
      case "success":
        return {
          icon: <CheckCircle2 className="w-5 h-5" />,
          iconBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          btnBg: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20",
          border: "border-emerald-200",
        };
      default:
        return {
          icon: <HelpCircle className="w-5 h-5" />,
          iconBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          btnBg: "bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-600/20",
          border: "border-slate-200",
        };
    }
  };

  const styles = getVariantStyles();

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-md glass-dropdown rounded-3xl border ${styles.border} shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 bg-white`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${styles.iconBg}`}>
              {styles.icon}
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            {description}
          </p>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer ${styles.btnBg}`}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{confirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

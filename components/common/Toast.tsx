"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success", duration = 3000) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { id, message, type, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, duration = 3000) => showToast(message, "success", duration),
    [showToast]
  );

  const error = useCallback(
    (message: string, duration = 3500) => showToast(message, "error", duration),
    [showToast]
  );

  const warning = useCallback(
    (message: string, duration = 3500) => showToast(message, "warning", duration),
    [showToast]
  );

  const info = useCallback(
    (message: string, duration = 3000) => showToast(message, "info", duration),
    [showToast]
  );

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case "success":
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
          bg: "bg-white/95 border-emerald-200 text-emerald-950 shadow-emerald-500/10",
          barBg: "bg-emerald-500",
        };
      case "error":
        return {
          icon: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />,
          bg: "bg-white/95 border-rose-200 text-rose-950 shadow-rose-500/10",
          barBg: "bg-rose-500",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
          bg: "bg-white/95 border-amber-200 text-amber-950 shadow-amber-500/10",
          barBg: "bg-amber-500",
        };
      case "info":
      default:
        return {
          icon: <Info className="w-4 h-4 text-sky-600 shrink-0" />,
          bg: "bg-white/95 border-sky-200 text-sky-950 shadow-sky-500/10",
          barBg: "bg-sky-500",
        };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map((toast) => {
          const styles = getToastStyles(toast.type);
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-3 fade-in ${styles.bg}`}
              role="alert"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {styles.icon}
                <p className="text-xs font-semibold leading-snug break-words">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="p-1 -mr-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                aria-label="Đóng thông báo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback safe fallback if called outside provider
    return {
      showToast: (msg: string) => console.log("[Toast]", msg),
      success: (msg: string) => console.log("[Toast Success]", msg),
      error: (msg: string) => console.log("[Toast Error]", msg),
      warning: (msg: string) => console.log("[Toast Warning]", msg),
      info: (msg: string) => console.log("[Toast Info]", msg),
    };
  }
  return context;
}

"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Key,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Zap,
  Info,
  ShieldCheck,
  Save,
} from "lucide-react";
import { useToast } from "@/components/common/Toast";
import { GEMINI_SUPPORTED_MODELS, DEFAULT_AI_MODEL } from "@/lib/ai-search-types";

export function AISettingsSection() {
  const { success, error } = useToast();

  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(DEFAULT_AI_MODEL);
  const [enabled, setEnabled] = useState(true);
  const [showKey, setShowKey] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setApiKey(data.settings.gemini_api_key || "");
          setModel(data.settings.ai_model || DEFAULT_AI_MODEL);
          setEnabled(data.settings.ai_search_enabled !== "false");
        }
      })
      .catch((err) => console.error("Lỗi khi tải cấu hình AI:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      error("Vui lòng nhập Gemini API Key trước khi kiểm tra.");
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/settings/test-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim(), model }),
      });

      const data = await res.json();
      setTestResult(data);

      if (res.ok && data.success) {
        success(data.message || "Kết nối Gemini API thành công!");
      } else {
        error(data.message || "Kết nối thất bại. Vui lòng kiểm tra lại API Key.");
      }
    } catch {
      setTestResult({
        success: false,
        message: "Lỗi kết nối mạng khi kiểm tra API.",
      });
      error("Lỗi kết nối mạng khi kiểm tra API.");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gemini_api_key: apiKey.trim(),
          ai_model: model,
          ai_search_enabled: enabled ? "true" : "false",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        error(data.error || "Không thể lưu cấu hình AI.");
        return;
      }

      success("Đã lưu cấu hình AI Gemini thành công!");
    } catch {
      error("Lỗi kết nối khi lưu cấu hình AI.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center glass-panel rounded-3xl border border-slate-200 bg-white">
        <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500">Đang tải cấu hình AI...</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md bg-white max-w-3xl space-y-6">
      <div className="border-b border-slate-100 pb-4 flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Trí Tuệ Nhân Tạo • Google Gemini</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Cấu Hình Tìm Kiếm Bằng AI (Gemini)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Sử dụng Google Gemini Pro để hỗ trợ giáo viên tìm kiếm chính xác món đồ dùng, tự động chuẩn hóa quy cách mầm non, ước tính giá thị trường và gán hình ảnh mẫu.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Toggle AI Enable */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="space-y-0.5">
            <label className="text-xs font-bold text-slate-800">
              Kích hoạt tính năng Tìm kiếm thông minh bằng AI
            </label>
            <p className="text-[11px] text-slate-500">
              Cho phép giáo viên bấm "Gợi ý bằng AI" khi tìm đồ dùng tạo yêu cầu
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Gemini API Key */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Google Gemini API Key <span className="text-rose-600">*</span>
          </label>

          <div className="relative">
            <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestResult(null);
              }}
              placeholder="Nhập Gemini API Key (VD: AIzaSy... hoặc AQ.Ab8...)"
              className="w-full pl-10 pr-24 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all"
            />

            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? "Ẩn API Key" : "Hiện API Key"}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Khóa API này được bảo mật an toàn trên máy chủ và chỉ dùng để thực hiện truy vấn gợi ý đồ dùng.
          </p>
        </div>

        {/* AI Model Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Mô Hình AI (Model)
          </label>
          <div className="relative">
            <Cpu className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setTestResult(null);
              }}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all appearance-none cursor-pointer"
            >
              {GEMINI_SUPPORTED_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Test Connection Box */}
        <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Kiểm tra kết nối với Google</p>
              <p className="text-[11px] text-slate-500">Gửi lệnh ping thử nghiệm để xác thực khóa API</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !apiKey.trim()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {testing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang kiểm tra...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Kiểm tra kết nối API</span>
              </>
            )}
          </button>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
              testResult.success
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <p className="font-bold">{testResult.message}</p>
              {testResult.latencyMs !== undefined && testResult.latencyMs > 0 && (
                <p className="text-[11px] opacity-80">
                  Thời gian phản hồi mạng: {testResult.latencyMs}ms
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu Cấu Hình AI</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

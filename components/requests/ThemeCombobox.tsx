"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Calendar,
  ChevronDown,
  Plus,
  Check,
  Search,
  X,
  Target,
  Layers,
} from "lucide-react";

export interface ThemeOption {
  id?: string;
  name: string;
  description?: string | null;
  icon?: string;
  isActive?: boolean;
  requestCount?: number;
  isOfficial?: boolean;
}

interface ThemeComboboxProps {
  value: string;
  onChange: (themeName: string, themeId?: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function ThemeCombobox({
  value,
  onChange,
  placeholder = "Chọn hoặc gõ tên Chủ đề / Sự kiện (VD: Lễ hội Trung Thu 2026...)",
  required = true,
}: ThemeComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [officialThemes, setOfficialThemes] = useState<ThemeOption[]>([]);
  const [customThemes, setCustomThemes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch themes from backend
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch("/api/themes")
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.themes) {
          setOfficialThemes(data.themes.map((t: any) => ({ ...t, isOfficial: true })));
        }
        if (data.customSuggestedThemes) {
          setCustomThemes(data.customSuggestedThemes);
        }
      })
      .catch((err) => console.error("Lỗi khi tải danh sách chủ đề:", err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync searchTerm with value
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOfficial = officialThemes.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCustom = customThemes.filter(
    (name) =>
      name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !officialThemes.some((ot) => ot.name.toLowerCase() === name.toLowerCase())
  );

  const isExactMatch =
    officialThemes.some((t) => t.name.toLowerCase() === searchTerm.trim().toLowerCase()) ||
    customThemes.some((t) => t.toLowerCase() === searchTerm.trim().toLowerCase());

  const handleSelectTheme = (theme: ThemeOption) => {
    onChange(theme.name, theme.id);
    setSearchTerm(theme.name);
    setIsOpen(false);
  };

  const handleSelectCustomTheme = (name: string) => {
    onChange(name);
    setSearchTerm(name);
    setIsOpen(false);
  };

  const handleCreateNewTheme = () => {
    if (!searchTerm.trim()) return;
    onChange(searchTerm.trim());
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearchTerm("");
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input container */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          required={required}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-4 pr-16 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all font-medium"
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
              title="Xóa lựa chọn"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180 text-emerald-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Dropdown suggestions list */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 p-2 bg-white rounded-2xl border border-slate-200/90 shadow-2xl z-50 max-h-72 overflow-y-auto space-y-2 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
          {/* 1. Official School Themes */}
          {filteredOfficial.length > 0 && (
            <div className="space-y-1">
              <div className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Kế hoạch & Sự kiện chung của trường ({filteredOfficial.length})</span>
              </div>

              {filteredOfficial.map((t) => {
                const isSelected = value === t.name;
                return (
                  <div
                    key={t.id || t.name}
                    onClick={() => handleSelectTheme(t)}
                    className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? "bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold"
                        : "hover:bg-slate-50 text-slate-800 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base shrink-0">{t.icon || "🎯"}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{t.name}</p>
                        {t.description && (
                          <p className="text-[11px] text-slate-500 truncate font-normal">
                            {t.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {t.requestCount !== undefined && t.requestCount > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold font-mono">
                          {t.requestCount} phiếu
                        </span>
                      )}
                      {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. Custom Recent Classroom Topics */}
          {filteredCustom.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-slate-100">
              <div className="px-2.5 py-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Chủ đề các lớp gần đây</span>
              </div>

              {filteredCustom.slice(0, 5).map((name) => {
                const isSelected = value === name;
                return (
                  <div
                    key={name}
                    onClick={() => handleSelectCustomTheme(name)}
                    className={`p-2 rounded-xl flex items-center justify-between cursor-pointer text-xs transition-all ${
                      isSelected
                        ? "bg-emerald-50 text-emerald-900 font-bold"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="truncate">{name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. Option to create / use new topic if not matched */}
          {searchTerm.trim().length > 0 && !isExactMatch && (
            <div className="pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCreateNewTheme}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 text-slate-700 hover:text-emerald-800 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer text-left"
              >
                <Plus className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="truncate">
                  <span>Sử dụng chủ đề mới: </span>
                  <strong className="text-emerald-700 font-bold">&quot;{searchTerm.trim()}&quot;</strong>
                </div>
              </button>
            </div>
          )}

          {filteredOfficial.length === 0 && filteredCustom.length === 0 && !searchTerm.trim() && (
            <div className="p-4 text-center text-xs text-slate-400">
              Chưa có danh sách chủ đề nào
            </div>
          )}
        </div>
      )}
    </div>
  );
}

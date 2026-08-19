"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  Boxes,
  School,
  Baby,
  Sparkles,
  Palette,
  BookOpen,
  Heart,
  Smile,
  Shapes,
  Sun,
  Package,
} from "lucide-react";

export interface SystemSettingsData {
  school_name: string;
  app_title: string;
  subtitle: string;
  logo_icon: string;
  logo_url: string;
  phone: string;
  address: string;
  default_min_stock: string;
}

export interface CategoryItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  color: string;
  isDefault: boolean;
  sortOrder: number;
}

interface SettingsContextType {
  settings: SystemSettingsData;
  categories: CategoryItem[];
  loading: boolean;
  refreshSettings: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  getCategory: (code: string) => CategoryItem | undefined;
  renderLogoIcon: (className?: string) => React.ReactNode;
}

const defaultSettings: SystemSettingsData = {
  school_name: "Trường Mầm Non Họa Mi",
  app_title: "Kho Mầm Non",
  subtitle: "Quản lý đồ dùng & giáo cụ",
  logo_icon: "Boxes",
  logo_url: "",
  phone: "024 3852 1199",
  address: "Số 128 Đường Hoa Hồng, Quận Cầu Giấy, Hà Nội",
  default_min_stock: "5",
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  categories: [],
  loading: true,
  refreshSettings: async () => {},
  refreshCategories: async () => {},
  getCategory: () => undefined,
  renderLogoIcon: () => null,
});

export const AVAILABLE_LOGO_ICONS = [
  { id: "Boxes", label: "Hộp Đồ Dùng", icon: Boxes },
  { id: "School", label: "Trường Học", icon: School },
  { id: "Baby", label: "Búp Mầm Non", icon: Baby },
  { id: "Palette", label: "Bảng Màu Vẽ", icon: Palette },
  { id: "BookOpen", label: "Sách Giáo Cụ", icon: BookOpen },
  { id: "Sparkles", label: "Ngôi Sao Sáng", icon: Sparkles },
  { id: "Heart", label: "Trái Tim Yêu Thương", icon: Heart },
  { id: "Smile", label: "Nụ Cười Trẻ Thơ", icon: Smile },
  { id: "Shapes", label: "Hình Khối Đồ Chơi", icon: Shapes },
  { id: "Sun", label: "Mặt Trời Tươi Vui", icon: Sun },
];

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettingsData>(defaultSettings);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  }, []);

  const refreshCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        if (data.categories) {
          setCategories(data.categories);
        }
      }
    } catch (e) {
      console.error("Failed to load categories:", e);
    }
  }, []);

  useEffect(() => {
    Promise.all([refreshSettings(), refreshCategories()]).finally(() => {
      setLoading(false);
    });
  }, [refreshSettings, refreshCategories]);

  const getCategory = useCallback(
    (code: string) => {
      return categories.find((c) => c.code === code);
    },
    [categories]
  );

  const renderLogoIcon = useCallback(
    (className = "w-5 h-5 text-emerald-600") => {
      if (settings.logo_url && settings.logo_url.trim()) {
        return (
          <img
            src={settings.logo_url}
            alt="Logo"
            className="w-full h-full object-contain rounded-lg"
          />
        );
      }

      switch (settings.logo_icon) {
        case "School":
          return <School className={className} />;
        case "Baby":
          return <Baby className={className} />;
        case "Palette":
          return <Palette className={className} />;
        case "BookOpen":
          return <BookOpen className={className} />;
        case "Sparkles":
          return <Sparkles className={className} />;
        case "Heart":
          return <Heart className={className} />;
        case "Smile":
          return <Smile className={className} />;
        case "Shapes":
          return <Shapes className={className} />;
        case "Sun":
          return <Sun className={className} />;
        case "Boxes":
        default:
          return <Boxes className={className} />;
      }
    },
    [settings.logo_icon, settings.logo_url]
  );

  return (
    <SettingsContext.Provider
      value={{
        settings,
        categories,
        loading,
        refreshSettings,
        refreshCategories,
        getCategory,
        renderLogoIcon,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

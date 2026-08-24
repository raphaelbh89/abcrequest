"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { useSettings, AVAILABLE_LOGO_ICONS, CategoryItem } from "@/components/settings/SettingsProvider";
import { useToast } from "@/components/common/Toast";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { UserTable } from "@/components/users/UserTable";
import { AISettingsSection } from "@/components/settings/AISettingsSection";
import {
  Settings,
  Building2,
  Users,
  Tags,
  Sliders,
  Save,
  Plus,
  Trash2,
  Edit2,
  Check,
  Sparkles,
  School,
  Boxes,
  HelpCircle,
  Phone,
  MapPin,
  Image,
  AlertTriangle,
  Loader2,
  Bot,
  Upload,
  CheckCircle2,
} from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

const COLOR_OPTIONS = [
  { id: "emerald", label: "Xanh lá (Emerald)", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "sky", label: "Xanh ngọc (Sky)", bg: "bg-sky-50 text-sky-700 border-sky-200" },
  { id: "purple", label: "Tím (Purple)", bg: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "amber", label: "Vàng cam (Amber)", bg: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "rose", label: "Hồng đào (Rose)", bg: "bg-rose-50 text-rose-700 border-rose-200" },
  { id: "indigo", label: "Xanh chàm (Indigo)", bg: "bg-indigo-50 text-indigo-700 border-indigo-200" },
];

export default function AdminSettingsPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const { settings, categories, refreshSettings, refreshCategories } = useSettings();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [activeTab, setActiveTab] = useState<"general" | "users" | "categories" | "warehouse" | "ai">("general");

  // Form state: General Settings
  const [schoolName, setSchoolName] = useState(settings.school_name);
  const [appTitle, setAppTitle] = useState(settings.app_title);
  const [subtitle, setSubtitle] = useState(settings.subtitle);
  const [logoIcon, setLogoIcon] = useState(settings.logo_icon);
  const [logoUrl, setLogoUrl] = useState(settings.logo_url);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [defaultMinStock, setDefaultMinStock] = useState(settings.default_min_stock);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Category state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catColor, setCatColor] = useState("emerald");
  const [savingCategory, setSavingCategory] = useState(false);

  // Delete Category state
  const [deleteTarget, setDeleteTarget] = useState<CategoryItem | null>(null);

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
      .finally(() => setLoadingUser(false));
  }, [router]);

  useEffect(() => {
    setSchoolName(settings.school_name);
    setAppTitle(settings.app_title);
    setSubtitle(settings.subtitle);
    setLogoIcon(settings.logo_icon);
    setLogoUrl(settings.logo_url);
    setPhone(settings.phone);
    setAddress(settings.address);
    setDefaultMinStock(settings.default_min_stock);
  }, [settings]);

  const handleSaveGeneralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_name: schoolName,
          app_title: appTitle,
          subtitle,
          logo_icon: logoIcon,
          logo_url: logoUrl,
          phone,
          address,
          default_min_stock: defaultMinStock,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        error(data.error || "Không thể lưu cài đặt.");
        return;
      }

      await refreshSettings();
      success("Đã lưu cấu hình hệ thống thành công!");
    } catch {
      error("Lỗi kết nối khi lưu cài đặt.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      error("Dung lượng file ảnh vượt quá 5MB. Vui lòng chọn ảnh nhẹ hơn.");
      return;
    }

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload/logo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.logoUrl) {
        setLogoUrl(data.logoUrl);
        await refreshSettings();
        success("Đã tải lên và cập nhật logo trường thành công!");
      } else {
        error(data.error || "Không thể tải lên logo.");
      }
    } catch {
      error("Lỗi kết nối khi tải file ảnh.");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl("");
  };

  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCatName("");
    setCatDesc("");
    setCatColor("emerald");
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatDesc(cat.description || "");
    setCatColor(cat.color || "emerald");
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      error("Vui lòng nhập tên danh mục loại đồ dùng.");
      return;
    }

    setSavingCategory(true);

    try {
      const isEdit = Boolean(editingCategory);
      const url = isEdit ? `/api/categories/${editingCategory?.id}` : "/api/categories";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: catName.trim(),
          description: catDesc.trim() || null,
          color: catColor,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        error(data.error || "Không thể lưu danh mục.");
        return;
      }

      await refreshCategories();
      setIsCategoryModalOpen(false);
      success(isEdit ? "Đã cập nhật danh mục thành công!" : "Đã thêm danh mục mới thành công!");
    } catch {
      error("Lỗi kết nối khi lưu danh mục.");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(`/api/categories/${deleteTarget.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        error(data.error || "Không thể xóa danh mục.");
        return;
      }

      await refreshCategories();
      success("Đã xóa danh mục thành công.");
    } catch {
      error("Lỗi kết nối khi xóa danh mục.");
    } finally {
      setDeleteTarget(null);
    }
  };

  if (loadingUser || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-xs font-medium">Đang tải cài đặt hệ thống...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Title */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md bg-white/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 mb-1">
              <Settings className="w-3.5 h-3.5" />
              <span>Quản Trị Hệ Thống • Settings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Cài Đặt Hệ Thống & Tùy Biến
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Tùy chỉnh nhận diện thương hiệu trường mầm non, biểu tượng logo và quản lý danh mục đồ dùng
            </p>
          </div>
        </div>

        {/* Settings Tab Navigation */}
        <div className="w-full flex items-center gap-2 p-1.5 glass-panel rounded-2xl border border-slate-200/80 bg-white/80 overflow-x-auto shadow-xs">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "general"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Thông tin & Logo</span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "users"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Người dùng & Phân quyền</span>
          </button>

          <button
            onClick={() => setActiveTab("categories")}
            className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "categories"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Tags className="w-4 h-4" />
            <span>Danh mục đồ dùng ({categories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("warehouse")}
            className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "warehouse"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Cấu hình kho</span>
          </button>

          <button
            onClick={() => setActiveTab("ai")}
            className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "ai"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "text-purple-700 hover:text-purple-900 hover:bg-purple-50"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Gemini</span>
          </button>
        </div>

        {/* TAB 1: THÔNG TIN TRƯỜNG & LOGO */}
        {activeTab === "general" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Column */}
            <div className="lg:col-span-2 space-y-6">
              <form onSubmit={handleSaveGeneralSettings} className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md bg-white space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                    Thông Tin Trường Học & Nhận Diện Ứng Dụng
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Thông tin này sẽ xuất hiện trên thanh Navbar, giao diện chính và biểu mẫu xuất file Excel.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Tên Trường Mầm Non <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="VD: Trường Mầm Non Họa Mi"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Tên Ứng Dụng (App Title) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={appTitle}
                      onChange={(e) => setAppTitle(e.target.value)}
                      placeholder="VD: Kho Mầm Non"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Khẩu hiệu / Phụ đề Hệ Thống
                    </label>
                    <input
                      type="text"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="VD: Quản lý đồ dùng & giáo cụ mầm non"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Logo Icon Picker */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Biểu Tượng Logo (Chọn Icon)
                    </label>
                    <span className="text-[11px] text-slate-400">Chọn 1 biểu tượng phù hợp với trường</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {AVAILABLE_LOGO_ICONS.map((item) => {
                      const IconComp = item.icon;
                      const isSelected = logoIcon === item.id && !logoUrl;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setLogoIcon(item.id);
                            setLogoUrl("");
                          }}
                          className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all cursor-pointer text-center ${
                            isSelected
                              ? "bg-emerald-50 border-emerald-400 text-emerald-800 shadow-sm ring-2 ring-emerald-500/20"
                              : "bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                          }`}
                        >
                          <div className={`p-2 rounded-xl ${isSelected ? "bg-white text-emerald-600 shadow-xs" : "text-slate-500"}`}>
                            <IconComp className="w-5 h-5" />
                          </div>
                          <span className="text-[11px] font-bold leading-tight">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Logo Upload & Custom Logo Section */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Ảnh Logo Trường Học (Tải Lên / Upload)
                    </label>
                    <span className="text-[11px] text-slate-400">Hiển thị trên Web App và Biểu mẫu xuất Excel</span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />

                  {logoUrl ? (
                    <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-16 h-16 rounded-2xl border border-slate-200 bg-white p-1.5 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                          <img
                            src={logoUrl}
                            alt="Logo trường"
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Đã tải lên logo thành công</span>
                          </div>
                          <p className="text-[11px] font-mono text-slate-500 truncate max-w-xs sm:max-w-md">
                            {logoUrl}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingLogo}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Thay ảnh khác</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Gỡ logo</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="group border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all bg-slate-50/60 hover:bg-emerald-50/30 flex flex-col items-center justify-center gap-2"
                    >
                      {uploadingLogo ? (
                        <div className="space-y-2">
                          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                          <p className="text-xs font-bold text-slate-700">Đang tải lên logo trường...</p>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-500 group-hover:text-emerald-600 group-hover:scale-105 transition-all">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-emerald-800">
                              Bấm vào đây để chọn ảnh Logo tải lên từ máy tính
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Hỗ trợ định dạng PNG, JPG, JPEG, WEBP, SVG (Dung lượng tối đa 5MB)
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Collapsible Direct URL Link option */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className="text-[11px] font-bold text-slate-500 hover:text-emerald-600 inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>{showUrlInput ? "▾ Thu gọn nhập URL thủ công" : "▸ Hoặc nhập đường dẫn (URL) ảnh logo từ internet"}</span>
                    </button>

                    {showUrlInput && (
                      <div className="relative animate-in fade-in duration-200">
                        <Image className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="url"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          placeholder="https://domain.com/logo.png"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all font-medium"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Hotline / Số Điện Thoại
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="VD: 024 3852 1199"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Địa Chỉ Trường Học
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="VD: Quận Cầu Giấy, Hà Nội"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Lưu Cài Đặt Hệ Thống</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Live Preview Column */}
            <div className="space-y-6">
              <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 shadow-md bg-white space-y-4 sticky top-24">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Xem Trước Giao Diện Thực Tế (Live Preview)
                  </h3>
                  <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Trực tiếp
                  </span>
                </div>

                {/* Navbar Preview Mockup */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Thanh Tiêu Đề Logo:</span>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 p-[1px] shadow-md shadow-emerald-500/20 shrink-0">
                      <div className="w-full h-full bg-white rounded-xl flex items-center justify-center p-2 overflow-hidden">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          (() => {
                            const iconObj = AVAILABLE_LOGO_ICONS.find((i) => i.id === logoIcon) || AVAILABLE_LOGO_ICONS[0];
                            const Comp = iconObj.icon;
                            return <Comp className="w-6 h-6 text-emerald-600" />;
                          })()
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col justify-center whitespace-nowrap leading-tight overflow-hidden">
                      <span className="font-extrabold text-base tracking-tight text-slate-900 whitespace-nowrap">
                        {appTitle || "Kho Mầm Non"}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase whitespace-nowrap">
                        {subtitle || "Quản lý đồ dùng"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* School Card Mockup */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Thẻ Thông Tin Đơn Vị:</span>
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-50 border border-emerald-200/70 space-y-2">
                    <div className="flex items-center gap-2">
                      <School className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="font-bold text-xs text-slate-900">{schoolName || "Tên Trường Mầm Non"}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{phone || "Chưa thiết lập"}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{address || "Chưa thiết lập"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUẢN LÝ NGƯỜI DÙNG & PHÂN QUYỀN */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 shadow-md bg-white">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 mb-2">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>Quản trị & Phân quyền</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Quản Lý Người Dùng & Phân Quyền
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Tạo tài khoản mới cho giáo viên và quản lý, phân quyền và kiểm soát an toàn dữ liệu hệ thống.
              </p>
            </div>

            <UserTable currentUser={user} />
          </div>
        )}

        {/* TAB 3: QUẢN LÝ DANH MỤC LOẠI ĐỒ DÙNG */}
        {activeTab === "categories" && (
          <div className="space-y-6">
            <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 shadow-md bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Tags className="w-5 h-5 text-emerald-600" />
                  Danh Mục Phân Loại Đồ Dùng Mầm Non
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tạo mới, sửa tên và gán màu sắc nhận diện cho các loại đồ dùng (Học tập, Ngoại khóa, Vệ sinh, Sự kiện...)
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddCategory}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Danh Mục Mới</span>
              </button>
            </div>

            {/* Category Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {categories.map((cat) => {
                const colorStyle = COLOR_OPTIONS.find((c) => c.id === cat.color) || COLOR_OPTIONS[0];

                return (
                  <div
                    key={cat.id}
                    className="glass-panel rounded-3xl p-5 border border-slate-200/80 shadow-sm bg-white hover:border-emerald-300 transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${colorStyle.bg}`}>
                          {cat.name}
                        </span>
                        {cat.isDefault && (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            Mặc định
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-mono text-slate-400">
                        Mã code: <strong className="text-slate-700 font-bold">{cat.code}</strong>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed min-h-[36px]">
                        {cat.description || "Chưa có mô tả chi tiết cho loại đồ dùng này."}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditCategory(cat)}
                        title="Chỉnh sửa danh mục"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-all cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Sửa</span>
                      </button>

                      {!cat.isDefault && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(cat)}
                          title="Xóa danh mục"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: CẤU HÌNH KHO & QUY TẮC */}
        {activeTab === "warehouse" && (
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md bg-white max-w-2xl space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-600" />
                Cấu Hình Kho & Ngưỡng Tồn Kho An Toàn
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết lập các tham số vận hành tự động cho kho đồ dùng
              </p>
            </div>

            <form onSubmit={handleSaveGeneralSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Ngưỡng Tồn Kho Tối Thiểu Mặc Định (Cảnh Báo Sắp Hết)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    value={defaultMinStock}
                    onChange={(e) => setDefaultMinStock(e.target.value)}
                    className="w-36 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white"
                  />
                  <span className="text-xs text-slate-500 font-medium">
                    (Khi số lượng tồn kho khả dụng dưới ngưỡng này, hệ thống sẽ bật còi cảnh báo màu vàng "Sắp hết").
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Cấu Hình Kho</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 5: CẤU HÌNH AI GEMINI */}
        {activeTab === "ai" && <AISettingsSection />}
      </main>

      {/* Category Modal (Add / Edit) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md glass-dropdown rounded-3xl border border-emerald-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 bg-white">
            <div className="flex items-center justify-between p-6 border-b border-emerald-100 bg-gradient-to-r from-emerald-50/60 via-teal-50/30 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                  <Tags className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingCategory ? "Chỉnh sửa danh mục" : "Thêm danh mục loại đồ dùng"}
                  </h2>
                  <p className="text-xs text-slate-500">Phân nhóm các loại đồ dùng trong trường</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên Danh Mục Loại Đồ Dùng <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="VD: Vệ sinh & Bán trú, Đồ chơi vận động..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mô Tả Chi Tiết (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="VD: Khăn mặt, xà phòng, cồn y tế..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Màu Sắc Nhãn Nhận Diện (Badge Color)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {COLOR_OPTIONS.map((c) => {
                    const isSelected = catColor === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCatColor(c.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                          isSelected
                            ? `${c.bg} ring-2 ring-emerald-500/30 shadow-xs`
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {c.label.split(" ")[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingCategory}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingCategory && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingCategory ? "Lưu thay đổi" : "Tạo danh mục"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteCategory}
        title="Xác nhận xóa danh mục"
        description={`Bạn có chắc chắn muốn xóa danh mục "${deleteTarget?.name}" không? Thao tác này chỉ thực hiện được khi không có đồ dùng nào thuộc danh mục.`}
        confirmText="Xóa danh mục"
        variant="danger"
      />
    </div>
  );
}

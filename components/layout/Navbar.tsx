"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Boxes, 
  FileText, 
  ShoppingCart, 
  History, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck, 
  GraduationCap,
  KeyRound,
  Settings,
  ChevronDown,
  Package,
} from "lucide-react";
import { NotificationDropdown } from "./NotificationDropdown";
import { ChangePasswordModal } from "@/components/users/ChangePasswordModal";
import { useSettings } from "@/components/settings/SettingsProvider";

interface NavbarProps {
  user?: {
    username: string;
    fullName: string;
    role: string;
  } | null;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isWarehouseDropdownOpen, setIsWarehouseDropdownOpen] = useState(false);
  const warehouseDropdownRef = useRef<HTMLDivElement>(null);
  const { settings, renderLogoIcon } = useSettings();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  // Close warehouse dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        warehouseDropdownRef.current &&
        !warehouseDropdownRef.current.contains(event.target as Node)
      ) {
        setIsWarehouseDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isWarehouseActive = pathname.startsWith("/inventory");

  const canViewRequests = !user || ["admin", "manager", "teacher"].includes(user.role);
  const canViewProposals = user && ["admin", "manager", "stocker"].includes(user.role);
  const canViewSettings = user?.role === "admin";

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "admin":
        return { label: "Quản trị (Admin)", icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> };
      case "manager":
        return { label: "Quản lý (BGH)", icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> };
      case "stocker":
        return { label: "Thủ kho / Mua sắm", icon: <Boxes className="w-3.5 h-3.5 text-amber-600" /> };
      case "teacher":
      default:
        return { label: "Giáo viên", icon: <GraduationCap className="w-3.5 h-3.5 text-cyan-600" /> };
    }
  };

  const roleInfo = getRoleBadge(user?.role);

  return (
    <header className="sticky top-0 z-40 w-full px-3 sm:px-6 lg:px-8 pt-3 pb-2 backdrop-blur-md">
      <div className="max-w-7xl mx-auto glass-panel rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between h-16 px-3 sm:px-6">
          {/* Logo */}
          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-3 group focus:outline-none shrink-0 select-none"
              title={settings.school_name}
            >
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 p-[1px] shadow-md shadow-emerald-500/20 group-hover:shadow-emerald-500/30 transition-all duration-300 shrink-0">
                <div className="w-full h-full bg-white rounded-xl flex items-center justify-center backdrop-blur-sm overflow-hidden p-1.5">
                  {renderLogoIcon("w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform duration-300 shrink-0")}
                </div>
              </div>
              <div className="flex flex-col justify-center whitespace-nowrap leading-tight">
                <span className="font-extrabold text-base tracking-tight text-slate-900 leading-tight whitespace-nowrap">
                  {settings.app_title || "Kho Mầm Non"}
                </span>
                <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase leading-tight whitespace-nowrap">
                  {settings.subtitle || "Quản lý đồ dùng"}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1.5 ml-2 whitespace-nowrap">
              {/* 1. Tổng quan */}
              <Link
                href="/dashboard"
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-200 ${
                  pathname === "/dashboard"
                    ? "text-emerald-700 bg-emerald-50 shadow-xs border border-emerald-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                <LayoutDashboard className={`w-4 h-4 shrink-0 ${pathname === "/dashboard" ? "text-emerald-600" : "text-slate-400"}`} />
                <span className="whitespace-nowrap">Tổng quan</span>
                {pathname === "/dashboard" && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-gradient-to-r from-transparent via-emerald-600 to-transparent" />
                )}
              </Link>

              {/* 2. Kho (Dropdown Submenu: Kho tồn + Lịch sử kho) */}
              <div
                ref={warehouseDropdownRef}
                className="relative"
                onMouseEnter={() => setIsWarehouseDropdownOpen(true)}
                onMouseLeave={() => setIsWarehouseDropdownOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setIsWarehouseDropdownOpen(!isWarehouseDropdownOpen)}
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                    isWarehouseActive
                      ? "text-emerald-700 bg-emerald-50 shadow-xs border border-emerald-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <Boxes className={`w-4 h-4 shrink-0 ${isWarehouseActive ? "text-emerald-600" : "text-slate-400"}`} />
                  <span className="whitespace-nowrap">Kho</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isWarehouseDropdownOpen ? "rotate-180 text-emerald-600" : "text-slate-400"}`} />
                  {isWarehouseActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-gradient-to-r from-transparent via-emerald-600 to-transparent" />
                  )}
                </button>

                {/* Submenu Popover */}
                {isWarehouseDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-52 p-1.5 glass-dropdown rounded-2xl border border-slate-200/90 shadow-xl z-50 bg-white/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 space-y-1">
                    <Link
                      href="/inventory"
                      onClick={() => setIsWarehouseDropdownOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        pathname === "/inventory"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold"
                          : "text-slate-700 hover:bg-slate-50 hover:text-emerald-700"
                      }`}
                    >
                      <Package className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="flex flex-col">
                        <span className="whitespace-nowrap">Danh sách kho tồn</span>
                        <span className="text-[10px] text-slate-400 font-normal">Quản lý số lượng & trạng thái</span>
                      </div>
                    </Link>

                    <Link
                      href="/inventory/transactions"
                      onClick={() => setIsWarehouseDropdownOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        pathname === "/inventory/transactions"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold"
                          : "text-slate-700 hover:bg-slate-50 hover:text-emerald-700"
                      }`}
                    >
                      <History className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="flex flex-col">
                        <span className="whitespace-nowrap">Lịch sử xuất / nhập kho</span>
                        <span className="text-[10px] text-slate-400 font-normal">Biến động kho chi tiết</span>
                      </div>
                    </Link>
                  </div>
                )}
              </div>

              {/* 3. Yêu cầu đồ dùng (Cho Admin, Manager, Teacher) */}
              {canViewRequests && (
                <Link
                  href="/requests"
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-200 ${
                    pathname.startsWith("/requests")
                      ? "text-emerald-700 bg-emerald-50 shadow-xs border border-emerald-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <FileText className={`w-4 h-4 shrink-0 ${pathname.startsWith("/requests") ? "text-emerald-600" : "text-slate-400"}`} />
                  <span className="whitespace-nowrap">Yêu cầu đồ dùng</span>
                  {pathname.startsWith("/requests") && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-gradient-to-r from-transparent via-emerald-600 to-transparent" />
                  )}
                </Link>
              )}

              {/* 4. Đề xuất mua (Cho Admin, Manager, Stocker) */}
              {canViewProposals && (
                <Link
                  href="/purchase-proposals"
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-200 ${
                    pathname.startsWith("/purchase-proposals")
                      ? "text-emerald-700 bg-emerald-50 shadow-xs border border-emerald-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <ShoppingCart className={`w-4 h-4 shrink-0 ${pathname.startsWith("/purchase-proposals") ? "text-emerald-600" : "text-slate-400"}`} />
                  <span className="whitespace-nowrap">Đề xuất mua</span>
                  {pathname.startsWith("/purchase-proposals") && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-gradient-to-r from-transparent via-emerald-600 to-transparent" />
                  )}
                </Link>
              )}

              {/* 5. Cài đặt (Chỉ dành cho Admin cấp cao) */}
              {canViewSettings && (
                <Link
                  href="/admin/settings"
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-200 ${
                    pathname.startsWith("/admin")
                      ? "text-emerald-700 bg-emerald-50 shadow-xs border border-emerald-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <Settings className={`w-4 h-4 shrink-0 ${pathname.startsWith("/admin") ? "text-emerald-600 animate-spin-slow" : "text-slate-400"}`} />
                  <span className="whitespace-nowrap">Cài đặt</span>
                  {pathname.startsWith("/admin") && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-gradient-to-r from-transparent via-emerald-600 to-transparent" />
                  )}
                </Link>
              )}
            </nav>
          </div>

          {/* Right Action & User Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Real-time Notification Bell */}
            <NotificationDropdown />

            {user && (
              <div className="flex items-center gap-2.5 shrink-0">
                {/* Clickable User Card to Change Password */}
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(true)}
                  title="Nhấn vào tên để đổi mật khẩu cá nhân"
                  className="hidden sm:flex items-center gap-2.5 pl-2.5 pr-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/80 hover:border-emerald-300 transition-all duration-200 cursor-pointer group text-left shadow-2xs whitespace-nowrap shrink-0"
                >
                  <div className="relative shrink-0">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-emerald-500 p-[1px] group-hover:scale-105 transition-transform">
                      <div className="w-full h-full bg-white rounded-lg flex items-center justify-center">
                        {roleInfo.icon}
                      </div>
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white" />
                  </div>
                  <div className="text-left whitespace-nowrap">
                    <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 flex items-center gap-1 transition-colors whitespace-nowrap">
                      <span className="whitespace-nowrap">{user.fullName}</span>
                      <KeyRound className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                      {roleInfo.label}
                    </div>
                  </div>
                </button>

                <button
                  onClick={handleLogout}
                  title="Đăng xuất"
                  className="flex items-center justify-center w-8 h-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition-all duration-200 focus:outline-none cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex items-center justify-center w-9 h-9 text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl border border-slate-200"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-2 p-4 glass-panel rounded-2xl border border-slate-200/80 shadow-xl space-y-3 bg-white/95 animate-in slide-in-from-top-2 duration-200">
          {user && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 mb-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold">
                {roleInfo.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">{user.fullName}</div>
                <div className="text-[10px] text-slate-500">{roleInfo.label}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsChangePasswordOpen(true);
                }}
                className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 hover:bg-emerald-200 rounded-lg transition-colors"
              >
                Đổi MK
              </button>
            </div>
          )}

          <nav className="flex flex-col gap-1">
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold ${
                pathname === "/dashboard" ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-600" />
              <span>Tổng quan</span>
            </Link>

            {/* Mobile Kho Section */}
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Quản lý kho
            </div>
            <Link
              href="/inventory"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-semibold pl-6 ${
                pathname === "/inventory" ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Boxes className="w-4 h-4 text-emerald-600" />
              <span>Danh sách kho tồn</span>
            </Link>

            <Link
              href="/inventory/transactions"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-semibold pl-6 ${
                pathname === "/inventory/transactions" ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <History className="w-4 h-4 text-emerald-600" />
              <span>Lịch sử xuất / nhập kho</span>
            </Link>

            {canViewRequests && (
              <>
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Hoạt động
                </div>
                <Link
                  href="/requests"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold ${
                    pathname.startsWith("/requests") ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Yêu cầu đồ dùng</span>
                </Link>
              </>
            )}

            {canViewProposals && (
              <Link
                href="/purchase-proposals"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold ${
                  pathname.startsWith("/purchase-proposals") ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <span>Đề xuất mua</span>
              </Link>
            )}

            {canViewSettings && (
              <Link
                href="/admin/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold ${
                  pathname.startsWith("/admin") ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Settings className="w-4 h-4 text-emerald-600" />
                <span>Cài đặt & Quản trị</span>
              </Link>
            )}
          </nav>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        user={user || null}
      />
    </header>
  );
}

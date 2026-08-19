"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  Edit2,
  AlertTriangle,
  RefreshCw,
  Shield,
  UserCheck,
} from "lucide-react";
import { UserModal } from "./UserModal";
import { UserEditModal } from "./UserEditModal";

interface UserItem {
  id: string;
  username: string;
  fullName: string;
  role: string;
  createdAt: string;
}

interface UserInfo {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

interface UserTableProps {
  currentUser: UserInfo;
}

export function UserTable({ currentUser }: UserTableProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserItem | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Fetch users error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || "Không thể xóa tài khoản này.");
        setDeleting(false);
        return;
      }

      setDeleteTarget(null);
      fetchUsers();
    } catch {
      setDeleteError("Lỗi kết nối máy chủ khi xóa tài khoản.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white/90">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">
              Danh sách Tài khoản Người dùng
            </h2>
            <p className="text-xs text-slate-500">Tổng số: {users.length} tài khoản trong hệ thống</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            className="flex items-center justify-center p-2.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer shadow-xs"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-purple-600" : ""}`} />
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm tài khoản mới</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel rounded-3xl border border-slate-200/80 shadow-md overflow-hidden bg-white/95">
        {loading ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <div className="w-9 h-9 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Đang tải danh sách người dùng...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">STT</th>
                  <th className="px-6 py-4">Tên đăng nhập</th>
                  <th className="px-6 py-4">Họ và tên</th>
                  <th className="px-4 py-4">Vai trò</th>
                  <th className="px-6 py-4">Ngày tạo</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u, index) => {
                  const isSelf = u.id === currentUser.id;
                  const formattedDate = new Date(u.createdAt).toLocaleDateString("vi-VN");

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelf ? "bg-purple-50/40" : ""
                      }`}
                    >
                      <td className="px-6 py-4 font-mono text-slate-400 font-medium">{index + 1}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 font-mono">
                        {u.username}
                        {isSelf && (
                          <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 border border-purple-200 font-sans px-2.5 py-0.5 rounded-full font-bold">
                            Bạn (Đang đăng nhập)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-800 font-semibold">{u.fullName}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                            u.role === "admin"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : u.role === "manager"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : u.role === "stocker"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-cyan-50 text-cyan-700 border-cyan-200"
                          }`}
                        >
                          {u.role === "admin" && <Shield className="w-3.5 h-3.5 text-purple-600" />}
                          {u.role === "manager" && <Shield className="w-3.5 h-3.5 text-emerald-600" />}
                          {u.role === "stocker" && <UserCheck className="w-3.5 h-3.5 text-amber-600" />}
                          {u.role === "teacher" && <UserCheck className="w-3.5 h-3.5 text-cyan-600" />}

                          {u.role === "admin"
                            ? "Quản trị (Admin)"
                            : u.role === "manager"
                            ? "Quản lý (BGH)"
                            : u.role === "stocker"
                            ? "Thủ kho / Mua sắm"
                            : "Giáo viên"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono">{formattedDate}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditTarget(u)}
                            title="Sửa thông tin / Đổi mật khẩu"
                            className="p-2 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded-xl transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setDeleteTarget(u);
                              setDeleteError(null);
                            }}
                            disabled={isSelf}
                            title={isSelf ? "Không thể tự xóa chính mình" : "Xóa tài khoản"}
                            className={`p-2 rounded-xl transition-colors ${
                              isSelf
                                ? "text-slate-300 cursor-not-allowed"
                                : "text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Modal (Create) */}
      <UserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchUsers}
      />

      {/* User Edit / Reset Password Modal */}
      <UserEditModal
        isOpen={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        onSuccess={fetchUsers}
        user={editTarget}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md glass-dropdown rounded-3xl border border-rose-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 bg-white">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="p-2.5 bg-rose-50 rounded-2xl border border-rose-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Xác nhận xóa tài khoản
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Bạn có chắc chắn muốn xóa tài khoản người dùng{" "}
              <span className="font-bold text-slate-900">
                &ldquo;{deleteTarget.username}&rdquo; ({deleteTarget.fullName})
              </span>{" "}
              khỏi hệ thống không?
            </p>

            {deleteError && (
              <div className="p-3.5 text-xs text-rose-700 bg-rose-50 rounded-xl border border-rose-200 font-medium">
                ⚠️ {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md shadow-rose-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {deleting ? "Đang xóa..." : "Xác nhận Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

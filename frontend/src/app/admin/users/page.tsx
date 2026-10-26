"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Ban,
  RotateCcw,
  History,
  Lock,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import ConfirmationModal from "@/components/admin/ConfirmationModal";

interface PlatformUser {
  id: string;
  phone: string;
  email?: string;
  full_name: string;
  role: string;
  is_active: boolean;
  hospital_id?: string;
  abha_number?: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<PlatformUser | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get<PlatformUser[]>("/admin/users");
      if (Array.isArray(res)) {
        setUsers(res);
      }
    } catch (err: any) {
      console.error("Failed to load users:", err);
      setFeedback({ type: "error", message: err?.message || "Failed to load user directory." });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      setFeedback({
        type: "success",
        message: `User permissions updated to role "${newRole}".`,
      });
      fetchUsers();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to update role." });
    }
  };

  const handleOpenSuspendModal = (user: PlatformUser) => {
    setSelectedUser(user);
    setConfirmModalOpen(true);
  };

  const executeSuspension = async () => {
    if (!selectedUser) return;
    try {
      await api.put(`/admin/users/${selectedUser.id}/suspend`, {});
      setFeedback({
        type: "success",
        message: `Account for ${selectedUser.full_name} has been suspended.`,
      });
      setConfirmModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to suspend user." });
    }
  };

  const handleReactivate = async (user: PlatformUser) => {
    try {
      await api.put(`/admin/users/${user.id}/reactivate`, {});
      setFeedback({
        type: "success",
        message: `Account for ${user.full_name} has been reactivated.`,
      });
      fetchUsers();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to reactivate user." });
    }
  };

  const handleOpenDeleteModal = (user: PlatformUser) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/admin/users/${userToDelete.id}`);
      setFeedback({
        type: "success",
        message: `Account for "${userToDelete.full_name}" has been permanently removed.`,
      });
      setDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to delete user." });
    }
  };

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.abha_number?.includes(search);

    if (!matchesSearch) return false;
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (statusFilter === "ACTIVE" && !u.is_active) return false;
    if (statusFilter === "SUSPENDED" && u.is_active) return false;
    return true;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "HOSPITAL_ADMIN":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "DOCTOR":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "LAB_TECH":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      default:
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white p-1">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
            IDENTITY & ACCESS MANAGEMENT
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
          User & Role Governance
        </h1>
        <p className="text-xs text-slate-400">
          Manage system privileges, RBAC roles, account suspensions, and monitor account access states.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
        <div className="flex-1 flex items-center gap-2.5 px-2">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user name, phone, email, or ABHA..."
            className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-3">
          <span className="text-[11px] text-slate-500">Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 px-2.5 py-1"
          >
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            <option value="HOSPITAL_ADMIN">HOSPITAL_ADMIN</option>
            <option value="DOCTOR">DOCTOR</option>
            <option value="LAB_TECH">LAB_TECH</option>
            <option value="PATIENT">PATIENT</option>
          </select>

          <span className="text-[11px] text-slate-500 ml-1">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 px-2.5 py-1"
          >
            <option value="ALL">All States</option>
            <option value="ACTIVE">Active Only</option>
            <option value="SUSPENDED">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role Badge</th>
                <th className="py-3 px-4">Contact / ABHA</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Role Reassignment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    Loading platform user directory...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    No users match current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center font-bold">
                          {user.full_name?.charAt(0) || "U"}
                        </div>
                        <div>
                          <div className="font-bold text-white">{user.full_name}</div>
                          <span className="text-[10px] text-slate-400 font-mono">{user.email || user.id}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getRoleBadge(
                          user.role
                        )}`}
                      >
                        {user.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono text-slate-300">{user.phone}</div>
                      {user.abha_number && (
                        <div className="text-[10px] text-emerald-400 font-mono">
                          ABHA: {user.abha_number}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          <Ban className="w-3 h-3" /> SUSPENDED
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-200 cursor-pointer"
                      >
                        <option value="PATIENT">PATIENT</option>
                        <option value="DOCTOR">DOCTOR</option>
                        <option value="LAB_TECH">LAB_TECH</option>
                        <option value="HOSPITAL_ADMIN">HOSPITAL_ADMIN</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/audit?q=${encodeURIComponent(user.full_name)}`}
                          title="Inspect User Audit Trail"
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                          <History className="w-3.5 h-3.5" />
                        </Link>

                        {user.is_active ? (
                          <button
                            onClick={() => handleOpenSuspendModal(user)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(user)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reactivate</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenDeleteModal(user)}
                          title="Permanently remove / cut user"
                          className="p-1 rounded-lg text-rose-400 hover:text-white hover:bg-rose-600/30 border border-rose-500/30 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for User Suspension */}
      <ConfirmationModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={executeSuspension}
        title={`Suspend Account for ${selectedUser?.full_name}?`}
        description="Suspending this account will immediately revoke all active JWT sessions and reject subsequent authentication attempts."
        requiredPhrase="SUSPEND"
        confirmButtonText="Confirm Account Suspension"
        isDanger={true}
      />

      {/* Confirmation Modal for Permanent User Deletion */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={executeDelete}
        title={`Permanently Delete User ${userToDelete?.full_name}?`}
        description="Permanently removing (cutting) this user account will delete their profile, active sessions, and personal records from the CareFlow database. This action CANNOT be undone."
        requiredPhrase="DELETE"
        confirmButtonText="Permanently Delete User"
        isDanger={true}
      />
    </div>
  );
}

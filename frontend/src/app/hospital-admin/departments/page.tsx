"use client";

import React, { useEffect, useState } from "react";
import { Layers, Plus, Stethoscope, Loader2, CheckCircle2, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAccessibility } from "@/context/AccessibilityContext";
import ConfirmationModal from "@/components/admin/ConfirmationModal";

interface DepartmentItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  doctors_count: number;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<DepartmentItem | null>(null);
  const { simpleView, speakText } = useAccessibility();

  const fetchDepts = async () => {
    try {
      setLoading(true);
      const res = await api.get<DepartmentItem[]>("/hospital-admin/departments");
      setDepartments(res || []);
    } catch (err: any) {
      console.error("Failed to load departments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;
    try {
      setSaving(true);
      setMessage(null);
      await api.post("/hospital-admin/departments", {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
      });
      setMessage(`Department '${name}' added successfully!`);
      speakText(`Department ${name} added`);
      setName("");
      setCode("");
      setDescription("");
      setShowModal(false);
      await fetchDepts();
    } catch (err: any) {
      setMessage(err.message || "Failed to create department.");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteModal = (dept: DepartmentItem) => {
    setDeptToDelete(dept);
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!deptToDelete) return;
    try {
      await api.delete(`/hospital-admin/departments/${deptToDelete.id}`);
      setMessage(`Department '${deptToDelete.name}' has been permanently deleted.`);
      setDeleteModalOpen(false);
      setDeptToDelete(null);
      await fetchDepts();
    } catch (err: any) {
      setMessage(err.message || "Failed to delete department.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-400" />
            Hospital Departments
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage clinical divisions, specialties, and OPD departments for this facility.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className={`rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all shadow-md flex items-center gap-2 justify-center ${
            simpleView ? "px-6 py-3.5 text-base min-h-[48px]" : "px-4 py-2.5 text-xs min-h-[40px]"
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Add Department</span>
        </button>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs text-teal-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
      ) : departments.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Departments Registered</h3>
          <p className="text-xs text-slate-500 mt-1">Click Add Department above to configure your first OPD unit.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-teal-400 font-semibold">
                    {dept.code}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                    <Stethoscope className="w-3.5 h-3.5 text-teal-400" />
                    {dept.doctors_count} Doctors
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-1">{dept.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {dept.description || "General hospital OPD department."}
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between items-center">
                <span>Facility Scoped</span>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-medium">Active</span>
                  <button
                    onClick={() => handleOpenDeleteModal(dept)}
                    title="Cut / Delete Department Permanently"
                    className="p-1 rounded text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/20"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">Add New Department</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cardiology OPD"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Department Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CARD"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500 uppercase font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Clinical focus and specialties covered..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-teal-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-md"
                >
                  {saving ? "Saving..." : "Create Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Permanent Department Deletion */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={executeDelete}
        title={`Permanently Delete Department ${deptToDelete?.name}?`}
        description={`Permanently removing (cutting) this department (${deptToDelete?.code}) will delete it from this hospital. This action CANNOT be undone.`}
        requiredPhrase="DELETE"
        confirmButtonText="Permanently Delete Department"
        isDanger={true}
      />
    </div>
  );
}

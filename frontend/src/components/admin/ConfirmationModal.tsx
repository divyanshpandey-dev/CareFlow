"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Lock, X } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  requiredPhrase?: string;
  confirmButtonText?: string;
  isDanger?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  requiredPhrase,
  confirmButtonText = "Confirm Action",
  isDanger = true,
}: ConfirmationModalProps) {
  const [typedPhrase, setTypedPhrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTypedPhrase("");
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const phraseMatches =
    !requiredPhrase || typedPhrase.trim().toUpperCase() === requiredPhrase.trim().toUpperCase();

  const handleConfirm = async () => {
    if (!phraseMatches) return;
    try {
      setLoading(true);
      setError(null);
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Action failed to execute. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isDanger ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">{title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">High-privilege platform operation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">{description}</p>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {requiredPhrase && (
          <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <label className="block text-xs font-semibold text-slate-400">
              To proceed, please type <span className="font-mono text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">{requiredPhrase}</span> below:
            </label>
            <input
              type="text"
              autoFocus
              value={typedPhrase}
              onChange={(e) => setTypedPhrase(e.target.value)}
              placeholder={`Type "${requiredPhrase}"`}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono text-slate-100 focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
            />
          </div>
        )}

        <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/40">
          <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Audit notice: This action will be cryptographically logged with your Super Admin identity.</span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!phraseMatches || loading}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md ${
              !phraseMatches || loading
                ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                : isDanger
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30"
                : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30"
            }`}
          >
            {loading ? "Processing..." : confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}

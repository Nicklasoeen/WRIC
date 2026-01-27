"use client";

import { useState, useTransition, useEffect } from "react";
import { givePraise, getPraiseStatus } from "@/app/actions/praise";
import Link from "next/link";

export function PraiseWidget() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    totalXp: number;
    praisesToday: number;
    praisesRemaining: number;
  } | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const statusData = await getPraiseStatus();
      setStatus(statusData);
    } catch (error) {
      console.error("Error loading status:", error);
      setStatus({ totalXp: 0, praisesToday: 0, praisesRemaining: 0 });
    }
  }

  const handleGivePraise = async () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await givePraise();

      if (result.success) {
        setSuccess(`+${result.xpEarned} XP!`);
        setTimeout(() => setSuccess(null), 2000);
        await loadStatus();
      } else {
        setError(result.error || "Kunne ikke gi praise");
        setTimeout(() => setError(null), 3000);
      }
    });
  };

  if (!status) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-sm">
        Laster...
      </div>
    );
  }

  const canPraise = status.praisesRemaining > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header med link */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Praise the Founders
        </h3>
        <Link
          href="/praise"
          className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Se side →
        </Link>
      </div>

      {/* Status */}
      <div className="flex-1 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-2">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">Total XP</p>
            <p className="text-lg font-bold text-yellow-500 dark:text-yellow-400">
              {status.totalXp}
            </p>
          </div>
          <div className="text-center rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-2">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">I dag</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {status.praisesToday}/3
            </p>
          </div>
          <div className="text-center rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-2">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">Igjen</p>
            <p className="text-lg font-bold text-emerald-500 dark:text-emerald-400">
              {status.praisesRemaining}
            </p>
          </div>
        </div>

        {/* Feilmelding */}
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Suksessmelding */}
        {success && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-xs text-emerald-400 text-center font-medium">
            {success}
          </div>
        )}

        {/* Give Praise-knapp */}
        <button
          onClick={handleGivePraise}
          disabled={isPending || !canPraise}
          className={`w-full px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            canPraise
              ? "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
          }`}
        >
          {isPending
            ? "Gir praise..."
            : canPraise
            ? "🙏 Give Praise"
            : "Ingen gjenstående"}
        </button>

        {!canPraise && (
          <p className="text-center text-[10px] text-slate-500 dark:text-slate-400">
            Kom tilbake i morgen!
          </p>
        )}
      </div>
    </div>
  );
}

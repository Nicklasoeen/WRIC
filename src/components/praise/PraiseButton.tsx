"use client";

import { useState, useTransition } from "react";
import { givePraise, getPraiseStatus } from "@/app/actions/praise";
import { useEffect } from "react";

export function PraiseButton() {
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
      setError("Kunne ikke laste status. Sjekk at database-tabellene er opprettet.");
      // Sett default status for å unngå at komponenten ikke vises
      setStatus({ totalXp: 0, praisesToday: 0, praisesRemaining: 0 });
    }
  }

  const handleGivePraise = async () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await givePraise();

      if (result.success) {
        setSuccess(
          `Praise gitt! Du fikk ${result.xpEarned} XP. Total XP: ${result.totalXp}`
        );
        await loadStatus(); // Oppdater status

        // Varsle resten av appen om at XP/level er oppdatert
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("level-updated"));
        }
      } else {
        setError(result.error || "Kunne ikke gi praise");
      }
    });
  };

  if (!status) {
    return (
      <div className="space-y-2 text-center">
        <div className="text-slate-400">Laster status...</div>
        {error && (
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 text-sm text-yellow-400">
            <p className="font-medium mb-1">Database-tabeller mangler</p>
            <p className="text-xs">
              Kjør <code className="bg-slate-700 px-1 rounded">praise-schema.sql</code> i Supabase SQL Editor
            </p>
          </div>
        )}
      </div>
    );
  }

  const canPraise = status.praisesRemaining > 0;

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="rounded-xl bg-slate-800/60 border border-slate-700/80 p-4 shadow-lg">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-400 mb-1">Total XP</p>
            <p className="text-2xl font-bold text-yellow-400">{status.totalXp}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Praises i dag</p>
            <p className="text-2xl font-bold text-white">
              {status.praisesToday}/{3}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Gjenstående</p>
            <p className="text-2xl font-bold text-emerald-400">
              {status.praisesRemaining}
            </p>
          </div>
        </div>
      </div>

      {/* Feilmelding */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 text-center">
          {error}
        </div>
      )}

      {/* Suksessmelding */}
      {success && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400 text-center">
          {success}
        </div>
      )}

      {/* Give Praise-knapp */}
      <button
        onClick={handleGivePraise}
        disabled={isPending || !canPraise}
        className={`w-full px-8 py-4 rounded-lg font-bold text-lg transition-all transform ${
          canPraise
            ? "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            : "bg-slate-700 text-slate-400 cursor-not-allowed"
        }`}
      >
        {isPending
          ? "Gir praise..."
          : canPraise
          ? "🙏 Give Praise"
          : "Ingen praises gjenstående i dag"}
      </button>

      {!canPraise && (
        <p className="text-center text-xs text-slate-500">
          Du har gitt alle 3 praises i dag. Kom tilbake i morgen!
        </p>
      )}
    </div>
  );
}

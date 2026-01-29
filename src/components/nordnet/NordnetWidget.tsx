"use client";

import { useEffect, useState } from "react";
import { StatPill } from "@/components/dashboard/widgets";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface NordnetData {
  totalValue: number;
  todayChange: number;
  todayChangePercent: number;
  positions: number;
  lastUpdated: string;
}

export function NordnetWidget() {
  const [data, setData] = useState<NordnetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // Oppdater hvert 5. minutt
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/nordnet");
      const result = await response.json();

      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || "Kunne ikke hente data");
      }
    } catch (err) {
      setError("Kunne ikke hente data fra Nordnet");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        Laster Nordnet-data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <p className="text-xs text-slate-500">
          Koble til Nordnet i innstillinger
        </p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M NOK`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k NOK`;
    }
    return `${value.toFixed(0)} NOK`;
  };

  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <StatPill
        label="Total portefølje"
        value={formatCurrency(data.totalValue)}
        trend={{
          value: `${data.todayChangePercent >= 0 ? "+" : ""}${data.todayChangePercent.toFixed(2)}% i dag`,
          positive: data.todayChangePercent >= 0,
        }}
      />
      <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/60">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Dagens endring
          </p>
          <p
            className={`mt-1 text-sm font-semibold ${
              data.todayChange >= 0 ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {data.todayChange >= 0 ? "+" : ""}
            {formatCurrency(data.todayChange)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/60">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Posisjoner
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
            {data.positions}
          </p>
        </div>
      </div>
      <p className="text-[10px] text-slate-500 dark:text-slate-400">
        Oppdatert: {format(new Date(data.lastUpdated), "HH:mm", { locale: nb })}
      </p>
    </div>
  );
}

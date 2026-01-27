"use client";

import { useEffect, useState } from "react";
import { StatPill } from "@/components/dashboard/widgets";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import Link from "next/link";
import { PortfolioChart } from "./PortfolioChart";

interface PortfolioData {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  todayChange: number;
  todayChangePercent: number;
  positions: number;
  holdings: Array<{
    id: string;
    ticker: string;
    name: string;
    quantity: number;
    purchase_price: number;
    purchase_date: string;
    current_price?: number;
    current_value?: number;
    gain_loss?: number;
    gain_loss_percent?: number;
    today_change?: number;
    today_change_percent?: number;
  }>;
  lastUpdated: string;
}

export function PortfolioWidget() {
  const [data, setData] = useState<PortfolioData | null>(null);
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
      const response = await fetch("/api/portfolio");
      const result = await response.json();

      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || "Kunne ikke hente data");
      }
    } catch (err) {
      setError("Kunne ikke hente porteføljedata");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-slate-400">Laster portefølje...</p>
        <p className="text-xs text-slate-500">
          Legg til kjøp i innstillinger for å se porteføljen
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <Link
          href="/settings"
          className="text-xs text-blue-400 hover:text-blue-300 underline"
        >
          Gå til innstillinger for å legge til kjøp
        </Link>
      </div>
    );
  }

  if (!data || data.positions === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-slate-400">Ingen kjøp registrert</p>
        <Link
          href="/settings"
          className="text-xs text-blue-400 hover:text-blue-300 underline"
        >
          Legg til ditt første kjøp
        </Link>
      </div>
    );
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
    <div className="flex h-full flex-col gap-4">
      {/* Overskrift med statistikker */}
      <div className="grid grid-cols-3 gap-3">
        <StatPill
          label="Total portefølje"
          value={formatCurrency(data.totalValue)}
          trend={{
            value: `${data.totalGainLossPercent >= 0 ? "+" : ""}${data.totalGainLossPercent.toFixed(2)}%`,
            positive: data.totalGainLossPercent >= 0,
          }}
        />
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

      {/* Graf */}
      <div className="flex-1 min-h-[200px]">
        <PortfolioChart holdings={data.holdings} />
      </div>

      {/* Footer med total gevinst/tap */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-700">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Total gevinst/tap
          </p>
          <p
            className={`mt-1 text-sm font-semibold ${
              data.totalGainLoss >= 0 ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {data.totalGainLoss >= 0 ? "+" : ""}
            {formatCurrency(data.totalGainLoss)}
          </p>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          Oppdatert: {format(new Date(data.lastUpdated), "HH:mm", { locale: nb })}
        </p>
      </div>
    </div>
  );
}

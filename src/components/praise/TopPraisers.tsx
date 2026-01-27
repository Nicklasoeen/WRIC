"use client";

import { useEffect, useState } from "react";
import { getTopPraisersOfMonth } from "@/app/actions/praise";

interface TopPraiser {
  userId: string;
  userName: string;
  totalPraises: number;
  totalXp: number;
}

export function TopPraisers() {
  const [topPraisers, setTopPraisers] = useState<TopPraiser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTopPraisers();
  }, []);

  async function loadTopPraisers() {
    try {
      const data = await getTopPraisersOfMonth();
      setTopPraisers(data);
    } catch (error) {
      console.error("Error loading top praisers:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4 text-slate-400">Laster toppliste...</div>
    );
  }

  if (topPraisers.length === 0) {
    return (
      <div className="text-center py-4 text-slate-400">
        <p>Ingen praises denne måneden ennå.</p>
        <p className="text-sm mt-2">Vær den første til å gi praise!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {topPraisers.map((praiser, index) => (
        <div
          key={praiser.userId}
          className="flex items-center justify-between rounded-xl bg-slate-800/60 border border-slate-700/80 p-4 shadow-lg"
        >
          <div className="flex items-center gap-4">
            {/* Plassering */}
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-white ${
                index === 0
                  ? "bg-yellow-500"
                  : index === 1
                  ? "bg-slate-400"
                  : index === 2
                  ? "bg-amber-600"
                  : "bg-slate-600"
              }`}
            >
              {index + 1}
            </div>

            {/* Navn */}
            <div>
              <p className="font-semibold text-white">{praiser.userName}</p>
              <p className="text-xs text-slate-400">
                {praiser.totalPraises} praises denne måneden
              </p>
            </div>
          </div>

          {/* XP */}
          <div className="text-right">
            <p className="font-bold text-yellow-400">{praiser.totalXp} XP</p>
          </div>
        </div>
      ))}
    </div>
  );
}

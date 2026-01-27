"use client";

import { useEffect, useState, useTransition } from "react";
import { getHoldings, deleteHolding, Holding } from "@/app/actions/portfolio";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

export function HoldingsList() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadHoldings();
  }, []);

  async function loadHoldings() {
    setLoading(true);
    const result = await getHoldings();
    if (result.success && result.holdings) {
      setHoldings(result.holdings);
    }
    setLoading(false);
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Er du sikker på at du vil slette dette kjøpet?")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteHolding(id);
      if (result.success) {
        await loadHoldings();
      } else {
        alert(result.error || "Kunne ikke slette kjøp");
      }
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-slate-400">Laster kjøp...</div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p>Ingen kjøp registrert ennå.</p>
        <p className="text-sm mt-2">Legg til ditt første kjøp over.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {holdings.map((holding) => (
        <div
          key={holding.id}
          className="rounded-xl bg-slate-800/60 border border-slate-700/80 p-4 shadow-lg"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white">{holding.ticker}</h3>
                {holding.exchange && (
                  <span className="text-xs text-slate-400">
                    ({holding.exchange})
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-300 mt-1">{holding.name}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
                <div>
                  <span className="font-medium">Antall:</span> {holding.quantity}
                </div>
                <div>
                  <span className="font-medium">Kjøpspris:</span>{" "}
                  {holding.purchase_price.toFixed(2)} {holding.currency}
                </div>
                <div>
                  <span className="font-medium">Kjøpsdato:</span>{" "}
                  {format(new Date(holding.purchase_date), "dd.MM.yyyy", {
                    locale: nb,
                  })}
                </div>
                <div>
                  <span className="font-medium">Total kostnad:</span>{" "}
                  {(holding.quantity * holding.purchase_price).toFixed(2)}{" "}
                  {holding.currency}
                </div>
              </div>
              {holding.notes && (
                <p className="mt-2 text-xs text-slate-400 italic">
                  {holding.notes}
                </p>
              )}
            </div>
            <button
              onClick={() => handleDelete(holding.id)}
              disabled={isPending}
              className="ml-4 px-3 py-1 text-xs bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white rounded transition-colors"
            >
              Slett
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

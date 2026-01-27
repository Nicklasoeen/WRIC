"use client";

import { useState, useTransition } from "react";
import { addHolding } from "@/app/actions/portfolio";
import { format } from "date-fns";

interface SearchResult {
  symbol: string;
  name: string;
  exchange?: string;
  type?: string;
}

export function AddHolding() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<SearchResult | null>(null);
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSearch = async () => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setSelectedTicker(null);
      return;
    }

    // Hvis query ser ut som en ticker, søk automatisk
    const cleanQuery = searchQuery.trim().toUpperCase();
    if (/^[A-Z]{1,10}(\.[A-Z]+)?$/i.test(cleanQuery)) {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(cleanQuery)}`);
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
          // Auto-select første resultat hvis det ser ut som en ticker
          const firstResult = result.data[0];
          if (firstResult.symbol === cleanQuery || firstResult.symbol.includes(cleanQuery)) {
            setSelectedTicker(firstResult);
            setSearchResults([]);
          } else {
            setSearchResults(result.data);
          }
        } else {
          setSearchResults([]);
          setSelectedTicker(null);
        }
      } catch (err) {
        console.error("Error searching:", err);
        setSearchResults([]);
        setSelectedTicker(null);
      }
    } else {
      setSearchResults([]);
      setSelectedTicker(null);
    }
  };

  const handleSelectTicker = (result: SearchResult) => {
    setSelectedTicker(result);
    setSearchQuery(result.name);
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedTicker) {
      setError("Velg en aksje eller fond");
      return;
    }

    if (!quantity || !purchasePrice || !purchaseDate) {
      setError("Fyll ut alle felter");
      return;
    }

    startTransition(async () => {
      const result = await addHolding(
        selectedTicker.symbol,
        selectedTicker.name,
        parseFloat(quantity),
        parseFloat(purchasePrice),
        purchaseDate,
        "NOK",
        selectedTicker.exchange,
        selectedTicker.type || "stock",
        notes || undefined
      );

      if (result.success) {
        setSuccess("Kjøp lagt til!");
        // Reset form
        setSelectedTicker(null);
        setSearchQuery("");
        setQuantity("");
        setPurchasePrice("");
        setPurchaseDate(format(new Date(), "yyyy-MM-dd"));
        setNotes("");
      } else {
        setError(result.error || "Kunne ikke legge til kjøp");
      }
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Søk */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Søk etter aksje eller fond
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch();
              }}
              onFocus={handleSearch}
              placeholder="F.eks. 'EQNR' eller 'EQNR.OL' (ticker symbol)"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectTicker(result)}
                    className="w-full px-4 py-2 text-left hover:bg-slate-700 text-white text-sm"
                  >
                    <div className="font-medium">{result.symbol}</div>
                    <div className="text-xs text-slate-400">{result.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedTicker && (
            <p className="mt-2 text-xs text-slate-400">
              Valgt: <span className="font-medium">{selectedTicker.symbol}</span> - {selectedTicker.name}
            </p>
          )}
          {searchQuery && !selectedTicker && searchQuery.length >= 2 && (
            <p className="mt-2 text-xs text-blue-400">
              💡 Skriv inn ticker symbol (f.eks. EQNR, AAPL, TSLA). Navnet hentes automatisk.
            </p>
          )}
        </div>

        {/* Antall */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Antall aksjer / beløp
          </label>
          <input
            type="number"
            step="0.000001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="F.eks. 10 eller 10000"
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        {/* Kjøpspris */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Kjøpspris per enhet (NOK)
          </label>
          <input
            type="number"
            step="0.01"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            placeholder="F.eks. 250.50"
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        {/* Kjøpsdato */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Kjøpsdato
          </label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        {/* Notater */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Notater (valgfritt)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="F.eks. 'Kjøpt på topp' eller 'DCA-strategi'"
            rows={3}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={isPending || !selectedTicker}
          className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {isPending ? "Legger til..." : "Legg til kjøp"}
        </button>
      </form>
    </div>
  );
}

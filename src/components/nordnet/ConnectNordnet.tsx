"use client";

import { useState, useEffect, useTransition } from "react";
import { disconnectNordnet, isNordnetConnected, startNordnetBankIDLogin } from "@/app/actions/nordnet";

/**
 * ConnectNordnet Component
 * 
 * Håndterer BankID-login flow for Nordnet.
 * 
 * NOTE: Full BankID-integrasjon krever ekstern håndtering.
 * Dette er en placeholder som viser strukturen.
 * I produksjon må du:
 * 1. Implementere BankID-autentisering (via BankID API eller headless browser)
 * 2. Hente session cookies fra Nordnet etter vellykket login
 * 3. Kalle saveNordnetSession() med cookies
 */

export function ConnectNordnet() {
  const [isConnected, setIsConnected] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sjekk tilkoblingsstatus ved mount
  useEffect(() => {
    startTransition(async () => {
      const connected = await isNordnetConnected();
      setIsConnected(connected);
    });
  }, []);

  const handleDisconnect = async () => {
    if (!confirm("Er du sikker på at du vil koble fra Nordnet?")) {
      return;
    }

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await disconnectNordnet();
      if (result.success) {
        setSuccess("Nordnet er koblet fra");
        setIsConnected(false);
      } else {
        setError(result.error || "Kunne ikke koble fra");
      }
    });
  };

  const handleBankIDLogin = async () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await startNordnetBankIDLogin();

      if (result.success) {
        setSuccess("Nordnet er nå koblet til!");
        setIsConnected(true);
      } else {
        setError(
          result.error || "Kunne ikke logge inn med BankID"
        );
      }
    });
  };

  if (isConnected) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
          <p className="text-sm font-medium text-emerald-400">
            ✓ Nordnet er koblet til
          </p>
          <p className="mt-1 text-xs text-emerald-300/80">
            Data oppdateres automatisk hvert 5. minutt
          </p>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={isPending}
          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {isPending ? "Kobler fra..." : "Koble fra Nordnet"}
        </button>
      </div>
    );
  }

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

      <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4">
        <p className="text-sm font-medium text-yellow-400 mb-2">
          Koble til Nordnet (manuell metode)
        </p>
        <p className="text-xs text-yellow-300/80 mb-4">
          Puppeteer er fjernet. For å koble til Nordnet:
        </p>
        <ol className="text-xs text-yellow-300/80 mb-4 list-decimal list-inside space-y-1">
          <li>Logg inn på Nordnet manuelt i nettleseren</li>
          <li>Åpne Developer Tools (F12) → Application → Cookies</li>
          <li>Kopier alle cookies fra nordnet.no</li>
          <li>Lim inn cookies i et tekstfelt (kommer snart)</li>
        </ol>
        <button
          onClick={handleBankIDLogin}
          disabled={true}
          className="w-full px-4 py-2 bg-slate-600 cursor-not-allowed text-white rounded-lg font-medium"
        >
          Automatisk login ikke tilgjengelig
        </button>
      </div>
    </div>
  );
}

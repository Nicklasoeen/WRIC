"use client";

import { useEffect, useState } from "react";

interface TimeoutState {
  isTimedOut: boolean;
  remainingSeconds: number;
}

export function TimeoutOverlay() {
  const [state, setState] = useState<TimeoutState>({
    isTimedOut: false,
    remainingSeconds: 0,
  });

  useEffect(() => {
    let isMounted = true;

    async function checkStatus() {
      try {
        const res = await fetch("/api/user-status");
        if (!res.ok) return;
        const data = await res.json();
        const { isTimedOut, timeoutUntil, isAdmin } = data.data || {};

        if (!isMounted) return;

        // Admin skal aldri låses ute av UI
        if (isAdmin) {
          setState({ isTimedOut: false, remainingSeconds: 0 });
          return;
        }

        if (isTimedOut && timeoutUntil) {
          const until = new Date(timeoutUntil).getTime();
          const now = Date.now();
          const diffSec = Math.max(0, Math.floor((until - now) / 1000));
          setState({
            isTimedOut: diffSec > 0,
            remainingSeconds: diffSec,
          });
        } else {
          setState({ isTimedOut: false, remainingSeconds: 0 });
        }
      } catch (e) {
        // Ignorer feil – vi vil ikke krasje appen
      }
    }

    // Sjekk umiddelbart og deretter hvert 2. sekund
    checkStatus();
    const interval = setInterval(checkStatus, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!state.isTimedOut) return null;

  const minutes = Math.floor(state.remainingSeconds / 60);
  const seconds = state.remainingSeconds % 60;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
      <div className="text-center space-y-6">
        <div className="text-red-600 text-4xl md:text-6xl font-extrabold animate-pulse">
          HACKER!! DU ER FAEN MEG UTESTENGT!
        </div>
        <div className="text-red-500 text-2xl md:text-4xl font-bold">
          {String(minutes).padStart(2, "0")}:
          {String(seconds).padStart(2, "0")}
        </div>
        <div className="text-red-400 text-sm md:text-base">
          Du er midlertidig utestengt av admin. Vent til nedtellingen er ferdig.
        </div>
      </div>
    </div>
  );
}


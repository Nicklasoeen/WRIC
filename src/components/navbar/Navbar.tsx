"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getPraiseStatus } from "@/app/actions/praise";
import { LogoutButton } from "@/components/dashboard/LogoutButton";

export function Navbar() {
  const pathname = usePathname();
  const [xp, setXp] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadXP();
    loadUserStatus();
    // Oppdater XP hvert 30. sekund
    const interval = setInterval(loadXP, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadXP() {
    try {
      const status = await getPraiseStatus();
      setXp(status.totalXp);
    } catch (error) {
      console.error("Error loading XP:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserStatus() {
    try {
      const response = await fetch("/api/user-status");
      const result = await response.json();
      if (result.success && result.data) {
        setIsAdmin(result.data.isAdmin || false);
      }
    } catch (error) {
      console.error("Error loading user status:", error);
    }
  }

  // Ikke vis navbar på login-siden
  if (pathname === "/") {
    return null;
  }

  // Beregn XP-nivå (f.eks. hvert 100 XP = 1 nivå)
  const xpPerLevel = 100;
  const currentLevel = xp ? Math.floor(xp / xpPerLevel) + 1 : 1;
  const xpInCurrentLevel = xp ? xp % xpPerLevel : 0;
  const xpForNextLevel = xpPerLevel;
  const progressPercent = (xpInCurrentLevel / xpForNextLevel) * 100;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-700 bg-slate-900/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Venstre side - Logo og lenker */}
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-lg font-bold text-white hover:text-indigo-400 transition-colors"
          >
            WRIC Dashboard
          </Link>
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/dashboard"
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/dashboard"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/praise"
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/praise"
                  ? "bg-yellow-600 text-white"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              Praise
            </Link>
            <Link
              href="/chat"
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/chat"
                  ? "bg-green-600 text-white"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              Chat
            </Link>
            <Link
              href="/settings"
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/settings"
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              Innstillinger
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  pathname === "/admin"
                    ? "bg-purple-600 text-white"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                Admin
              </Link>
            )}
          </div>
        </div>

        {/* Høyre side - XP bar og logout */}
        <div className="flex items-center gap-4">
          {/* XP Bar */}
          <div className="hidden sm:flex items-center gap-3 min-w-[200px]">
            {loading ? (
              <div className="text-xs text-slate-400">Laster...</div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-yellow-400">
                    Lv {currentLevel}
                  </span>
                  <span className="text-xs text-slate-400">
                    {xp !== null ? `${xp} XP` : "0 XP"}
                  </span>
                </div>
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden min-w-[100px]">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400">
                  {xpForNextLevel - xpInCurrentLevel} til Lv {currentLevel + 1}
                </span>
              </>
            )}
          </div>

          {/* Mobile XP (kun tall) */}
          <div className="sm:hidden flex items-center gap-2">
            {loading ? (
              <span className="text-xs text-slate-400">...</span>
            ) : (
              <>
                <span className="text-xs font-medium text-yellow-400">
                  Lv {currentLevel}
                </span>
                <span className="text-xs text-slate-400">
                  {xp !== null ? `${xp} XP` : "0 XP"}
                </span>
              </>
            )}
          </div>

          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}

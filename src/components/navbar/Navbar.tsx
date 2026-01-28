"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getPraiseStatus } from "@/app/actions/praise";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { BadgeIcon } from "@/components/badges/BadgeIcon";
import { FaCog, FaUserShield, FaChevronDown } from "react-icons/fa";

interface UserBadge {
  icon: string;
  color: string;
  name: string;
}

export function Navbar() {
  const pathname = usePathname();
  const [xp, setXp] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userBadge, setUserBadge] = useState<UserBadge | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Sett loading til false umiddelbart, ikke vent på API-kall
    setLoading(false);
    
    // Last data asynkront i bakgrunnen
    loadXP().catch(() => {});
    loadUserStatus().catch(() => {});
    loadUserBadge().catch(() => {});
    
    // Oppdater XP og badge hvert 30. sekund
    const interval = setInterval(() => {
      loadXP().catch(() => {});
      loadUserBadge().catch(() => {}); // Oppdater badge også når XP oppdateres
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Oppdater badge når XP endres (bruker kan ha fått ny badge)
  useEffect(() => {
    if (xp !== null) {
      loadUserBadge().catch(() => {});
    }
  }, [xp]);

  // Lytte på level-updated event fra Raid
  useEffect(() => {
    const handleLevelUpdate = () => {
      loadXP().catch(() => {});
      loadUserBadge().catch(() => {});
    };
    
    window.addEventListener('level-updated', handleLevelUpdate);
    return () => window.removeEventListener('level-updated', handleLevelUpdate);
  }, []);

  // Lukk dropdown når man klikker utenfor
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  async function loadXP() {
    try {
      const status = await getPraiseStatus();
      if (status && typeof status.totalXp === 'number') {
        setXp(status.totalXp);
      } else {
        setXp(0);
      }
    } catch (error) {
      console.error("Error loading XP:", error);
      setXp(0); // Fallback til 0 XP
    }
  }

  async function loadUserStatus() {
    try {
      const response = await fetch("/api/user-status");
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setIsAdmin(result.data.isAdmin || false);
        }
      }
    } catch (error) {
      console.error("Error loading user status:", error);
      // Fortsett uten admin-status
    }
  }

  async function loadUserBadge() {
    try {
      // Først sikre at brukeren har Member badge (ikke kritisk)
      fetch("/api/ensure-member-badge", { method: "POST" }).catch(() => {
        // Ignorer feil
      });
      
      // Hent brukerens badge
      const response = await fetch("/api/user-badge");
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setUserBadge(result.data);
        }
      }
    } catch (error) {
      console.error("Error loading user badge:", error);
      // Fortsett uten badge
    }
  }

  const getBadgeColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      brown: "text-amber-800",
      orange: "text-orange-500",
      red: "text-red-500",
      pink: "text-pink-500",
      blue: "text-blue-500",
      purple: "text-purple-500",
      gold: "text-yellow-400",
      // Fallback for gamle farger
      gray: "text-slate-400",
      yellow: "text-yellow-400",
      silver: "text-slate-200",
      green: "text-green-400",
    };
    return colorMap[color] || "text-slate-400";
  };

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
              href="/voting"
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/voting"
                  ? "bg-pink-600 text-white"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              Voting
            </Link>
            <Link
              href="/raid"
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/raid"
                  ? "bg-red-600 text-white"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              Raid
            </Link>
            <Link
              href="/dungeon"
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/dungeon"
                  ? "bg-purple-600 text-white"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              Dungeon
            </Link>
            <Link
              href="/badges"
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/badges"
                  ? "bg-amber-600 text-white"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              Badges
            </Link>
          </div>
        </div>

        {/* Høyre side - Badges, XP bar og logout */}
        <div className="flex items-center gap-4">
          {/* User Badge */}
          {userBadge && (
            <div className="flex items-center gap-2" title={userBadge.name}>
              <BadgeIcon
                icon={userBadge.icon}
                className={getBadgeColorClass(userBadge.color)}
                size={20}
              />
            </div>
          )}

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

          {/* Dropdown meny */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <FaCog size={16} />
              <FaChevronDown 
                size={12} 
                className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown meny */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg bg-slate-800 border border-slate-700 shadow-xl z-50 overflow-hidden">
                <Link
                  href="/settings"
                  onClick={() => setShowDropdown(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                    pathname === "/settings"
                      ? "bg-slate-700 text-white"
                      : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <FaCog size={14} />
                  <span>Innstillinger</span>
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setShowDropdown(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                      pathname === "/admin"
                        ? "bg-purple-600 text-white"
                        : "text-slate-300 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    <FaUserShield size={14} />
                    <span>Admin</span>
                  </Link>
                )}
              </div>
            )}
          </div>

          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}

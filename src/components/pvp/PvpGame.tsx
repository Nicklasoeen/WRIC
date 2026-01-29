"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaHammer,
  FaShieldAlt,
  FaTrophy,
  FaSkull,
  FaCoins,
  FaFire,
  FaBuilding,
} from "react-icons/fa";
import { attackUser, getAllUsersForPvp, getPvpStats, getPvpLeaderboard } from "@/app/actions/pvp";
import { getUserLevel } from "@/app/actions/raid";
import { getPraiseStatus } from "@/app/actions/praise";

interface User {
  id: string;
  name: string;
  level: number;
  xp: number;
}

interface PvpStats {
  wins: number;
  losses: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  winRate: number;
  lastAttackAt: string | null;
}

interface LeaderboardEntry {
  userId: string;
  userName: string;
  level: number;
  wins: number;
  losses: number;
  winRate: number;
  totalDamageDealt: number;
}

const BASE_CLICK_DAMAGE = 10;
const DAMAGE_PER_LEVEL = 5;
const BASE_HP = 50;
const HP_PER_LEVEL = 5;
const ATTACK_COOLDOWN_MS = 30000;

export function PvpGame() {
  const [users, setUsers] = useState<User[]>([]);
  const [myStats, setMyStats] = useState<PvpStats | null>(null);
  const [myLevel, setMyLevel] = useState(1);
  const [myGold, setMyGold] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [attackingUserId, setAttackingUserId] = useState<string | null>(null);
  const [attackResult, setAttackResult] = useState<{
    success: boolean;
    attackerWon?: boolean;
    damageDealt?: number;
    xpEarned?: number;
    goldEarned?: number;
    error?: string;
  } | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Last inn data
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Oppdater hvert 5. sekund
    return () => clearInterval(interval);
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setInterval(() => {
        setCooldownRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownRemaining]);

  const loadData = async () => {
    try {
      const [usersData, statsData, levelData, leaderboardData, praiseStatus] = await Promise.all([
        getAllUsersForPvp(),
        getPvpStats(),
        getUserLevel(),
        getPvpLeaderboard(10),
        getPraiseStatus(),
      ]);

      setUsers(usersData);
      if (statsData.success && statsData.stats) {
        setMyStats(statsData.stats);
        // Beregn cooldown
        if (statsData.stats.lastAttackAt) {
          const lastAttack = new Date(statsData.stats.lastAttackAt);
          const now = new Date();
          const timeSinceLastAttack = now.getTime() - lastAttack.getTime();
          const remaining = Math.max(
            0,
            Math.ceil((ATTACK_COOLDOWN_MS - timeSinceLastAttack) / 1000)
          );
          setCooldownRemaining(remaining);
        }
      }
      if (levelData.success && levelData.level) {
        setMyLevel(levelData.level);
      }
      if (praiseStatus && typeof (praiseStatus as any).gold === "number") {
        setMyGold((praiseStatus as any).gold);
      }
      setLeaderboard(leaderboardData);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading PvP data:", error);
      setIsLoading(false);
    }
  };

  const handleAttack = async (defenderId: string, defenderName: string) => {
    if (cooldownRemaining > 0) {
      setAttackResult({
        success: false,
        error: `Vent ${cooldownRemaining} sekunder før du kan angripe igjen`,
      });
      setTimeout(() => setAttackResult(null), 3000);
      return;
    }

    setAttackingUserId(defenderId);
    setAttackResult(null);

    try {
      const result = await attackUser(defenderId);

      if (result.success) {
        setAttackResult(result);
        setCooldownRemaining(30); // 30 sekunder cooldown
        // Oppdater data
        setTimeout(() => {
          loadData();
          if (result.xpEarned && typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("level-updated"));
          }
        }, 1000);
        // Fjern resultat etter 5 sekunder
        setTimeout(() => {
          setAttackResult(null);
          setAttackingUserId(null);
        }, 5000);
      } else {
        setAttackResult(result);
        setAttackingUserId(null);
        setTimeout(() => setAttackResult(null), 3000);
      }
    } catch (error: any) {
      setAttackResult({
        success: false,
        error: error.message || "En uventet feil oppstod",
      });
      setAttackingUserId(null);
      setTimeout(() => setAttackResult(null), 3000);
    }
  };

  const calculateDamage = (level: number) => {
    return BASE_CLICK_DAMAGE + (level - 1) * DAMAGE_PER_LEVEL;
  };

  const calculateHp = (level: number) => {
    return BASE_HP + (level - 1) * HP_PER_LEVEL;
  };

  const myDamage = calculateDamage(myLevel);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400">Laster...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* My Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg bg-slate-900/50 border border-slate-700/50 p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <FaCoins className="text-amber-400" />
            <span className="text-sm">Din Gull</span>
          </div>
          <div className="text-2xl font-bold text-white">{myGold}</div>
          <div className="text-xs text-slate-500 mt-1">Fra PvP-seiere</div>
        </div>
        <div className="rounded-lg bg-slate-900/50 border border-slate-700/50 p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <FaHammer className="text-red-400" />
            <span className="text-sm">Din Skade</span>
          </div>
          <div className="text-2xl font-bold text-white">{myDamage.toFixed(1)}</div>
          <div className="text-xs text-slate-500 mt-1">Level {myLevel}</div>
        </div>

        {myStats && (
          <>
            <div className="rounded-lg bg-slate-900/50 border border-slate-700/50 p-4">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <FaTrophy className="text-yellow-400" />
                <span className="text-sm">Seiere</span>
              </div>
              <div className="text-2xl font-bold text-white">{myStats.wins}</div>
              <div className="text-xs text-slate-500 mt-1">
                {myStats.winRate.toFixed(1)}% win rate
              </div>
            </div>

            <div className="rounded-lg bg-slate-900/50 border border-slate-700/50 p-4">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <FaSkull className="text-red-400" />
                <span className="text-sm">Tap</span>
              </div>
              <div className="text-2xl font-bold text-white">{myStats.losses}</div>
              <div className="text-xs text-slate-500 mt-1">
                {myStats.totalDamageDealt.toFixed(0)} total skade
              </div>
            </div>
          </>
        )}
      </div>

      {/* Attack Result */}
      <AnimatePresence>
        {attackResult && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`rounded-lg border p-4 ${
              attackResult.success && attackResult.attackerWon
                ? "bg-emerald-900/30 border-emerald-500/50"
                : attackResult.success && !attackResult.attackerWon
                  ? "bg-red-900/30 border-red-500/50"
                  : "bg-red-900/30 border-red-500/50"
            }`}
          >
            {attackResult.success ? (
              <div className="flex items-center gap-3">
                {attackResult.attackerWon ? (
                  <>
                    <FaTrophy className="text-yellow-400 text-2xl" />
                    <div className="flex-1">
                      <div className="font-bold text-white">Seier!</div>
                      <div className="text-sm text-slate-300">
                        Du gjorde {attackResult.damageDealt?.toFixed(1)} skade og vant{" "}
                        {attackResult.xpEarned} XP
                        {attackResult.goldEarned ? ` og ${attackResult.goldEarned} gull` : ""}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <FaSkull className="text-red-400 text-2xl" />
                    <div className="flex-1">
                      <div className="font-bold text-white">Nederlag</div>
                      <div className="text-sm text-slate-300">
                        Du gjorde {attackResult.damageDealt?.toFixed(1)} skade, men det var ikke
                        nok. Du fikk {attackResult.xpEarned} XP for å ha prøvd.
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-red-400">{attackResult.error}</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cooldown Warning */}
      {cooldownRemaining > 0 && (
        <div className="rounded-lg bg-amber-900/30 border border-amber-500/50 p-3 text-center">
          <div className="text-amber-400 font-medium">
            Cooldown: {cooldownRemaining} sekunder
          </div>
        </div>
      )}

      {/* Bases to Attack */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <FaBuilding className="text-purple-400" />
          Angrip Baser
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => {
            const userDamage = calculateDamage(user.level);
            const userHp = calculateHp(user.level);
            const isAttacking = attackingUserId === user.id;
            const canAttack = cooldownRemaining === 0;

            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                className="relative rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/80 overflow-hidden shadow-lg"
              >
                {/* Base Visual */}
                <div className="relative h-48 bg-gradient-to-b from-slate-700/50 to-slate-900/50">
                  {/* Animated Base */}
                  <motion.div
                    animate={
                      isAttacking
                        ? {
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0],
                          }
                        : {}
                    }
                    transition={{ duration: 0.5, repeat: isAttacking ? Infinity : 0 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <FaBuilding className="text-6xl text-purple-400/60" />
                  </motion.div>

                  {/* Attack Animation */}
                  <AnimatePresence>
                    {isAttacking && (
                      <motion.div
                        initial={{ opacity: 0, x: -100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <motion.div
                          animate={{
                            scale: [1, 1.5, 1],
                            rotate: [0, 360],
                          }}
                          transition={{ duration: 0.6, repeat: Infinity }}
                        >
                          <FaFire className="text-4xl text-red-500" />
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* HP Bar */}
                  <div className="absolute bottom-0 left-0 right-0 bg-slate-900/80 p-2">
                    <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                      <span>{user.name}</span>
                      <span>Level {user.level}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: "100%" }}
                        animate={{ width: "100%" }}
                        className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                      <span>HP: {userHp.toFixed(0)}</span>
                      <span>Skade: {userDamage.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* Attack Button */}
                <div className="p-4">
                  <button
                    onClick={() => handleAttack(user.id, user.name)}
                    disabled={!canAttack || isAttacking}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                      canAttack && !isAttacking
                        ? "bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/50"
                        : "bg-slate-700 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {isAttacking ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <FaHammer />
                        </motion.div>
                        <span>Angriper...</span>
                      </>
                    ) : cooldownRemaining > 0 ? (
                      <>
                        <FaShieldAlt />
                        <span>Cooldown: {cooldownRemaining}s</span>
                      </>
                    ) : (
                      <>
                        <FaHammer />
                        <span>Angrip Base</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FaTrophy className="text-yellow-400" />
            Toppliste
          </h2>
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                      Rank
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                      Navn
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                      Level
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                      Seiere
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                      Tap
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                      Win Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {leaderboard.map((entry, index) => (
                    <tr key={entry.userId} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-sm font-medium text-white">
                        #{index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-white">{entry.userName}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">Level {entry.level}</td>
                      <td className="px-4 py-3 text-sm text-emerald-400">{entry.wins}</td>
                      <td className="px-4 py-3 text-sm text-red-400">{entry.losses}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {entry.winRate.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

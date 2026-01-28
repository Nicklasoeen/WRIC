"use client";

import { useEffect, useState, useRef } from "react";
import { FaHammer, FaTrophy, FaFire, FaUsers } from "react-icons/fa";
import { getActiveBoss, damageBoss, getBossLeaderboard } from "@/app/actions/dungeon";

interface Boss {
  id: string;
  name: string;
  description: string;
  maxHp: number;
  currentHp: number;
  level: number;
  xpPerDamage: number;
  goldReward: number;
  spawnTime: string;
}

interface LeaderboardEntry {
  userId: string;
  userName: string;
  totalDamage: number;
  xpEarned: number;
}

export function DungeonGame() {
  const [boss, setBoss] = useState<Boss | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [clickDamage, setClickDamage] = useState(1);
  const [userLevel, setUserLevel] = useState(1);
  const [totalDamageDealt, setTotalDamageDealt] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [isAttacking, setIsAttacking] = useState(false);
  const [autoAttack, setAutoAttack] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [participants, setParticipants] = useState(0);
  const updateInterval = useRef<NodeJS.Timeout | null>(null);
  const autoAttackInterval = useRef<NodeJS.Timeout | null>(null);
  const timeInterval = useRef<NodeJS.Timeout | null>(null);

  // Last inn boss og leaderboard
  useEffect(() => {
    loadBoss();
    loadLeaderboard();
    loadUserLevel();

    // Oppdater boss status hvert 2. sekund
    updateInterval.current = setInterval(() => {
      loadBoss();
      loadLeaderboard();
    }, 2000);

    // Oppdater tid hvert sekund
    timeInterval.current = setInterval(() => {
      setTimeElapsed((prev) => {
        if (boss && boss.currentHp > 0) {
          return prev + 1;
        }
        return prev;
      });
    }, 1000);

    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
      if (timeInterval.current) {
        clearInterval(timeInterval.current);
      }
      if (autoAttackInterval.current) {
        clearInterval(autoAttackInterval.current);
      }
    };
  }, []);

  // Auto-attack funksjon
  useEffect(() => {
    if (autoAttack && boss && boss.currentHp > 0 && !isAttacking) {
      const attackFn = async () => {
        if (!boss || boss.currentHp <= 0 || isAttacking) return;
        await handleAttack();
      };
      
      autoAttackInterval.current = setInterval(attackFn, 1000); // Angrip hvert sekund
    } else {
      if (autoAttackInterval.current) {
        clearInterval(autoAttackInterval.current);
        autoAttackInterval.current = null;
      }
    }

    return () => {
      if (autoAttackInterval.current) {
        clearInterval(autoAttackInterval.current);
      }
    };
  }, [autoAttack, boss?.currentHp, isAttacking]);

  async function loadBoss() {
    try {
      const result = await getActiveBoss();
      if (result.success && result.boss) {
        setBoss(result.boss);
        // Hvis boss er beseiret, nullstill timer
        if (result.boss.currentHp <= 0) {
          setTimeElapsed(0);
        }
      }
    } catch (error) {
      console.error("Error loading boss:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadLeaderboard() {
    try {
      const result = await getBossLeaderboard();
      if (result.success && result.leaderboard) {
        setLeaderboard(result.leaderboard);
        setParticipants(result.leaderboard.length);
      }
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    }
  }

  async function loadUserLevel() {
    try {
      const response = await fetch("/api/user-status");
      const result = await response.json();
      if (result.success && result.data) {
        // Hent XP for å beregne level
        const xpResponse = await fetch("/api/praise-status");
        const xpResult = await xpResponse.json();
        if (xpResult.totalXp !== undefined) {
          const level = Math.floor(xpResult.totalXp / 100) + 1;
          setUserLevel(level);
          setClickDamage(1 + (level - 1) * 0.5);
        }
      }
    } catch (error) {
      console.error("Error loading user level:", error);
    }
  }

  const handleAttack = async () => {
    if (!boss || boss.currentHp <= 0 || isAttacking) return;

    setIsAttacking(true);
    try {
      const result = await damageBoss(clickDamage); // clickDamage sendes men ignoreres på server
      if (result.success) {
        // Bruk faktisk skade fra server (ikke client-beregnet)
        const actualDamage = result.actualDamage || clickDamage;
        setTotalDamageDealt((prev) => prev + actualDamage);
        if (result.xpEarned) {
          setXpEarned((prev) => prev + result.xpEarned!);
        }
        
        // Oppdater boss umiddelbart med faktisk skade
        if (boss) {
          const newHp = Math.max(0, boss.currentHp - actualDamage);
          setBoss({
            ...boss,
            currentHp: newHp,
          });
          
          // Oppdater clickDamage hvis server returnerte annen verdi
          if (result.actualDamage && Math.abs(result.actualDamage - clickDamage) > 0.1) {
            setClickDamage(result.actualDamage);
          }
          
          // Hvis boss er beseiret, stopp auto-attack
          if (newHp <= 0) {
            setAutoAttack(false);
            setTimeElapsed(0);
          }
        }

        // Oppdater leaderboard
        loadLeaderboard();
        
        // Hvis boss er beseiret, last inn ny
        if (result.bossDefeated) {
          setTimeElapsed(0);
          setTimeout(() => {
            loadBoss();
            setTotalDamageDealt(0);
            setXpEarned(0);
          }, 5000);
        }

        // Oppdater user level hvis XP er tjent
        if (result.xpEarned) {
          loadUserLevel();
        }
      }
    } catch (error) {
      console.error("Error attacking boss:", error);
    } finally {
      setIsAttacking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 py-12">
        <div className="animate-pulse">Laster dungeon...</div>
      </div>
    );
  }

  if (!boss) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 py-12">
        <div>Ingen boss funnet. Prøv å laste siden på nytt.</div>
      </div>
    );
  }

  const hpPercent = (boss.currentHp / boss.maxHp) * 100;
  const isDefeated = boss.currentHp <= 0;
  const minutes = Math.floor(timeElapsed / 60);
  const seconds = timeElapsed % 60;

  return (
    <div className="space-y-6">
      {/* Boss Info */}
      <div className="rounded-xl bg-gradient-to-br from-red-900/60 to-orange-900/60 border border-red-700/80 p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <FaFire className="text-orange-400" />
              {boss.name}
            </h2>
            <p className="text-slate-300 text-sm mt-1">{boss.description}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400">Level {boss.level}</div>
            <div className="text-xs text-slate-500">
              {isDefeated ? "Beseiret!" : "Aktiv"}
            </div>
          </div>
        </div>

        {/* HP Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">
              HP: {boss.currentHp.toLocaleString()} / {boss.maxHp.toLocaleString()}
            </span>
            <span className="text-sm text-slate-400">
              {hpPercent.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isDefeated
                  ? "bg-green-500"
                  : hpPercent > 50
                  ? "bg-red-500"
                  : hpPercent > 25
                  ? "bg-orange-500"
                  : "bg-yellow-500"
              }`}
              style={{ width: `${Math.max(0, hpPercent)}%` }}
            />
          </div>
        </div>

        {/* Attack Buttons */}
        {!isDefeated && (
          <div className="space-y-2">
            <button
              onClick={handleAttack}
              disabled={isAttacking}
              className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all ${
                isAttacking
                  ? "bg-slate-600 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700 active:scale-95"
              } flex items-center justify-center gap-2`}
            >
              <FaHammer />
              {isAttacking ? "Angriper..." : `Angrip! (${clickDamage.toFixed(1)} skade)`}
            </button>
            <button
              onClick={() => setAutoAttack(!autoAttack)}
              className={`w-full py-2 px-4 rounded-lg font-medium text-white transition-all ${
                autoAttack
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-slate-600 hover:bg-slate-700"
              } flex items-center justify-center gap-2`}
            >
              {autoAttack ? "⏸️ Stopp Auto-Attack" : "▶️ Start Auto-Attack"}
            </button>
          </div>
        )}

        {isDefeated && (
          <div className="text-center py-4">
            <div className="text-2xl font-bold text-green-400 mb-2">
              🎉 Boss beseiret! 🎉
            </div>
            <div className="text-slate-300">
              Ny boss spawner om et øyeblikk...
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-slate-800/60 border border-slate-700/80 p-4">
          <div className="text-sm text-slate-400 mb-1">Din totale skade</div>
          <div className="text-2xl font-bold text-white">
            {totalDamageDealt.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl bg-slate-800/60 border border-slate-700/80 p-4">
          <div className="text-sm text-slate-400 mb-1">XP tjent</div>
          <div className="text-2xl font-bold text-yellow-400">
            {Math.floor(xpEarned).toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl bg-slate-800/60 border border-slate-700/80 p-4">
          <div className="text-sm text-slate-400 mb-1">Tid</div>
          <div className="text-2xl font-bold text-blue-400">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>
        <div className="rounded-xl bg-slate-800/60 border border-slate-700/80 p-4">
          <div className="text-sm text-slate-400 mb-1 flex items-center gap-1">
            <FaUsers /> Deltakere
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {participants}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-xl bg-slate-800/60 border border-slate-700/80 p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <FaTrophy className="text-yellow-400" />
          Leaderboard
        </h3>
        {leaderboard.length === 0 ? (
          <div className="text-slate-400 text-center py-4">
            Ingen skade registrert ennå. Vær den første til å angripe!
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.slice(0, 10).map((entry, index) => (
              <div
                key={entry.userId}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  index === 0
                    ? "bg-yellow-500/20 border border-yellow-500/40"
                    : "bg-slate-700/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0
                        ? "bg-yellow-500 text-slate-900"
                        : index === 1
                        ? "bg-slate-400 text-slate-900"
                        : index === 2
                        ? "bg-orange-600 text-white"
                        : "bg-slate-600 text-white"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-white">{entry.userName}</div>
                    <div className="text-xs text-slate-400">
                      {Math.floor(entry.xpEarned)} XP tjent
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white">
                    {entry.totalDamage.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400">skade</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="rounded-xl bg-blue-900/20 border border-blue-700/40 p-4">
        <div className="text-sm text-blue-300">
          <strong>💡 Tips:</strong> Samarbeid med andre for å beseire bossen raskere!
          Du får {boss.xpPerDamage} XP per skade. Hvis bossen beseires, får alle
          deltakere en belønning!
        </div>
      </div>
    </div>
  );
}

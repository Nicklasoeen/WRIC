"use client";

import { useEffect, useState, useRef } from "react";
import { FaHammer, FaShieldAlt, FaCoins, FaGem, FaUserShield } from "react-icons/fa";
import { getUserLevel, addRaidXp } from "@/app/actions/raid";

interface GameState {
  level: number;
  xp: number;
  gold: number;
  clickDamage: number;
  gnomeHp: number;
  gnomeMaxHp: number;
  gnomeWave: number;
  guards: number;
  guardsDamage: number;
  vaultBonus: number;
  xpBonus: number;
  wallReduction: number;
}

interface Upgrade {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  cost: number;
  costScaling: number;
  effect: (state: GameState) => Partial<GameState>;
}

const XP_PER_LEVEL = 100;
const BASE_GNOME_HP = 50;
const GNOME_HP_SCALING = 1.15;
const BASE_CLICK_DAMAGE = 1;
const DAMAGE_PER_LEVEL = 0.5;

export function RaidGame() {
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    xp: 0,
    gold: 0,
    clickDamage: BASE_CLICK_DAMAGE,
    gnomeHp: BASE_GNOME_HP,
    gnomeMaxHp: BASE_GNOME_HP,
    gnomeWave: 1,
    guards: 0,
    guardsDamage: 0,
    vaultBonus: 0,
    xpBonus: 0,
    wallReduction: 0,
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [userMainLevel, setUserMainLevel] = useState<number>(1);
  const [pendingXp, setPendingXp] = useState<{ xp: number; level: number } | null>(null);
  const autoDamageInterval = useRef<NodeJS.Timeout | null>(null);

  // Last inn brukerens hovedlevel og Raid progress
  useEffect(() => {
    // Sjekk at vi er i browser (localStorage er tilgjengelig)
    if (typeof window === "undefined") {
      setIsInitialized(true);
      return;
    }

    // Sett initialisert umiddelbart - ikke vent på noe
    setIsInitialized(true);

    // Last inn Raid progress fra localStorage
    try {
      const saved = localStorage.getItem("raidGameState");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setGameState(parsed);
        } catch (err) {
          console.error("Error loading game state:", err);
        }
      }
    } catch (err) {
      console.error("Error accessing localStorage:", err);
    }

    // Hent brukerens hovedlevel asynkront i bakgrunnen (ikke blocker rendering)
    getUserLevel()
      .then((levelResult) => {
        if (levelResult.success && levelResult.level) {
          setUserMainLevel(levelResult.level);
          
          // Oppdater Raid level hvis den er lavere enn hovedlevel
          setGameState((prev) => {
            if (!prev.level || prev.level < levelResult.level!) {
              return {
                ...prev,
                level: levelResult.level!,
                clickDamage: BASE_CLICK_DAMAGE + ((levelResult.level || 1) - 1) * DAMAGE_PER_LEVEL,
              };
            }
            return prev;
          });
        }
      })
      .catch((error) => {
        console.error("Error fetching user level:", error);
        // Fortsett uten hovedlevel - ikke kritisk
      });
  }, []);

  // Lagre progress til localStorage
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("raidGameState", JSON.stringify(gameState));
    }
  }, [gameState, isInitialized]);

  // Send pending XP til server (ikke under rendering)
  useEffect(() => {
    if (pendingXp) {
      const { xp, level } = pendingXp;
      // Nullstill pending først for å unngå duplikater
      setPendingXp(null);
      
      // Send XP til server asynkront
      addRaidXp(xp, level)
        .then((result) => {
          if (result.success && result.newLevel) {
            setUserMainLevel(result.newLevel);
          }
        })
        .catch((err) => {
          console.error("Error adding Raid XP:", err);
        });
    }
  }, [pendingXp]);

  // Auto-damage fra guards
  useEffect(() => {
    if (autoDamageInterval.current) {
      clearInterval(autoDamageInterval.current);
    }

    if (gameState.guardsDamage > 0) {
      autoDamageInterval.current = setInterval(() => {
        setGameState((prev) => {
          const damage = prev.guardsDamage;
          const newHp = Math.max(0, prev.gnomeHp - damage);
          
          if (newHp <= 0) {
            return handleGnomeDefeated(prev);
          }
          
          return { ...prev, gnomeHp: newHp };
        });
      }, 1000); // Hvert sekund
    }

    return () => {
      if (autoDamageInterval.current) {
        clearInterval(autoDamageInterval.current);
      }
    };
  }, [gameState.guardsDamage]);

  // Beregn XP for neste level (samme formel som hovedlevel)
  const getXpForNextLevel = (currentLevel: number) => {
    return XP_PER_LEVEL; // 100 XP per level (konsistent med hovedlevel)
  };

  // Beregn progress prosent for XP bar
  const getXpProgress = () => {
    const xpForNext = XP_PER_LEVEL; // 100 XP per level
    const xpInCurrent = gameState.xp % XP_PER_LEVEL; // XP i nåværende level
    return (xpInCurrent / xpForNext) * 100;
  };

  // Håndter når gnome blir beseiret
  const handleGnomeDefeated = (state: GameState): GameState => {
    const goldReward = Math.floor((10 + state.gnomeWave * 2) * (1 + state.vaultBonus));
    const xpReward = Math.floor((5 + state.gnomeWave) * (1 + state.xpBonus));
    
    // Lagre XP for å sende til server senere (ikke kaller server action under rendering)
    setPendingXp({ xp: xpReward, level: state.level });
    
    const newXp = state.xp + xpReward;
    
    // Beregn ny Raid level (samme formel som hovedlevel)
    const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;
    const remainingXp = newXp % XP_PER_LEVEL;
    
    const newClickDamage = BASE_CLICK_DAMAGE + (newLevel - 1) * DAMAGE_PER_LEVEL;
    const newWave = state.gnomeWave + 1;
    // Wall reduction reduserer gnome HP
    const baseGnomeHp = Math.floor(BASE_GNOME_HP * Math.pow(GNOME_HP_SCALING, newWave - 1));
    const newGnomeHp = Math.floor(baseGnomeHp * (1 - state.wallReduction));
    
    return {
      ...state,
      level: newLevel,
      xp: remainingXp,
      gold: state.gold + goldReward,
      clickDamage: newClickDamage,
      gnomeHp: newGnomeHp,
      gnomeMaxHp: newGnomeHp,
      gnomeWave: newWave,
    };
  };

  // Klikk for å angripe
  const handleClick = () => {
    setGameState((prev) => {
      const damage = prev.clickDamage;
      const newHp = Math.max(0, prev.gnomeHp - damage);
      
      if (newHp <= 0) {
        return handleGnomeDefeated(prev);
      }
      
      return { ...prev, gnomeHp: newHp };
    });
  };

  // Upgrades
  const upgrades: Upgrade[] = [
    {
      id: "guard",
      name: "Ansett Byvakt",
      description: "Vakter som automatisk angriper gnomer (1 skade/sek)",
      icon: <FaShieldAlt />,
      cost: 50,
      costScaling: 1.5,
      effect: (state) => ({
        guards: state.guards + 1,
        guardsDamage: state.guardsDamage + 1,
      }),
    },
    {
      id: "vault",
      name: "Forsterket Hvelv",
      description: "Øker gull-belønning med 10%",
      icon: <FaCoins />,
      cost: 100,
      costScaling: 2,
      effect: (state) => ({
        vaultBonus: state.vaultBonus + 0.1,
      }),
    },
    {
      id: "collector",
      name: "Elite Skatteinnkrever",
      description: "Øker XP-belønning med 15%",
      icon: <FaGem />,
      cost: 150,
      costScaling: 2.5,
      effect: (state) => ({
        xpBonus: state.xpBonus + 0.15,
      }),
    },
    {
      id: "wall",
      name: "Murt Fortifikasjon",
      description: "Reduserer gnomenes styrke med 5%",
      icon: <FaUserShield />,
      cost: 200,
      costScaling: 3,
      effect: (state) => ({
        wallReduction: state.wallReduction + 0.05,
      }),
    },
  ];

  // Kjøp upgrade
  const buyUpgrade = (upgrade: Upgrade) => {
    const currentCount = upgrade.id === "guard" ? gameState.guards :
                        upgrade.id === "vault" ? Math.floor(gameState.vaultBonus / 0.1) :
                        upgrade.id === "collector" ? Math.floor(gameState.xpBonus / 0.15) :
                        Math.floor(gameState.wallReduction / 0.05);
    
    const cost = Math.floor(upgrade.cost * Math.pow(upgrade.costScaling, currentCount));
    
    if (gameState.gold >= cost) {
      setGameState((prev) => {
        const newState = { ...prev, gold: prev.gold - cost };
        const effects = upgrade.effect(newState);
        return { ...newState, ...effects };
      });
    }
  };

  // Hent upgrade kostnad
  const getUpgradeCost = (upgrade: Upgrade) => {
    const currentCount = upgrade.id === "guard" ? gameState.guards :
                        upgrade.id === "vault" ? Math.floor(gameState.vaultBonus / 0.1) :
                        upgrade.id === "collector" ? Math.floor(gameState.xpBonus / 0.15) :
                        Math.floor(gameState.wallReduction / 0.05);
    
    return Math.floor(upgrade.cost * Math.pow(upgrade.costScaling, currentCount));
  };

  if (!isInitialized) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 py-12">
        <div className="animate-pulse">Laster spill...</div>
      </div>
    );
  }

  const hpPercentage = (gameState.gnomeHp / gameState.gnomeMaxHp) * 100;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Level & XP */}
        <div className="rounded-lg bg-slate-900/50 border border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <FaHammer className="text-yellow-400" />
            <span className="text-sm font-medium text-slate-400">Raid Level</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{gameState.level}</div>
          <div className="text-xs text-slate-500 mb-2">
            Hovedlevel: {userMainLevel} {gameState.level > userMainLevel && `(+${gameState.level - userMainLevel})`}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Raid XP: {gameState.xp}</span>
              <span>{XP_PER_LEVEL} for neste level</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600 transition-all duration-300"
                style={{ width: `${getXpProgress()}%` }}
              />
            </div>
            {gameState.level > 1 && (
              <div className="text-[10px] text-slate-500 mt-1">
                +{((gameState.level - 1) * 5).toFixed(0)}% XP bonus til hovedlevel
              </div>
            )}
          </div>
        </div>

        {/* Gold */}
        <div className="rounded-lg bg-slate-900/50 border border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <FaCoins className="text-yellow-400" />
            <span className="text-sm font-medium text-slate-400">Gull</span>
          </div>
          <div className="text-2xl font-bold text-yellow-400">
            {Math.floor(gameState.gold).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {gameState.vaultBonus > 0 && `+${(gameState.vaultBonus * 100).toFixed(0)}% bonus`}
          </div>
        </div>

        {/* Click Damage */}
        <div className="rounded-lg bg-slate-900/50 border border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <FaHammer className="text-red-400" />
            <span className="text-sm font-medium text-slate-400">Klikk Skade</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {gameState.clickDamage.toFixed(1)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {gameState.guards > 0 && `${gameState.guardsDamage}/sek auto`}
          </div>
        </div>
      </div>

      {/* Gnome Combat */}
      <div className="rounded-lg bg-slate-900/50 border border-slate-700 p-6">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-white mb-1">
            Bølge {gameState.gnomeWave} - Gnome Inntrenger
          </h2>
          <p className="text-sm text-slate-400">
            Klikk for å angripe og beskytte din velstand!
          </p>
        </div>

        {/* Gnome HP Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>HP: {Math.ceil(gameState.gnomeHp)} / {gameState.gnomeMaxHp}</span>
            <span>{hpPercentage.toFixed(1)}%</span>
          </div>
          <div className="h-6 bg-slate-700 rounded-full overflow-hidden border-2 border-slate-600">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300"
              style={{ width: `${hpPercentage}%` }}
            />
          </div>
        </div>

        {/* Attack Button */}
        <button
          onClick={handleClick}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-lg rounded-lg transition-all hover:scale-105 active:scale-95 shadow-lg"
        >
          <div className="flex items-center justify-center gap-2">
            <FaHammer />
            <span>Angrip Gnome!</span>
          </div>
          <div className="text-sm font-normal mt-1 opacity-90">
            Gjør {gameState.clickDamage.toFixed(1)} skade
          </div>
        </button>
      </div>

      {/* Upgrades */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Oppgraderinger</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upgrades.map((upgrade) => {
            const cost = getUpgradeCost(upgrade);
            const canAfford = gameState.gold >= cost;
            const currentCount = upgrade.id === "guard" ? gameState.guards :
                                upgrade.id === "vault" ? Math.floor(gameState.vaultBonus / 0.1) :
                                upgrade.id === "collector" ? Math.floor(gameState.xpBonus / 0.15) :
                                Math.floor(gameState.wallReduction / 0.05);

            return (
              <div
                key={upgrade.id}
                className={`rounded-lg border p-4 transition-all ${
                  canAfford
                    ? "bg-slate-800/50 border-slate-600 hover:border-indigo-500"
                    : "bg-slate-900/30 border-slate-700 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="text-indigo-400 text-xl">{upgrade.icon}</div>
                    <div>
                      <h4 className="font-semibold text-white">{upgrade.name}</h4>
                      <p className="text-xs text-slate-400 mt-1">{upgrade.description}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-slate-500">
                    Nivå: {currentCount}
                  </span>
                  <button
                    onClick={() => buyUpgrade(upgrade)}
                    disabled={!canAfford}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      canAfford
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                        : "bg-slate-700 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FaCoins />
                      <span>{cost.toLocaleString()}</span>
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="rounded-lg bg-slate-900/30 border border-slate-700 p-4">
        <h4 className="text-sm font-semibold text-slate-400 mb-2">Statistikk</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Vakter:</span>
            <span className="text-white ml-2 font-medium">{gameState.guards}</span>
          </div>
          <div>
            <span className="text-slate-500">Hvelv Bonus:</span>
            <span className="text-white ml-2 font-medium">
              +{(gameState.vaultBonus * 100).toFixed(0)}%
            </span>
          </div>
          <div>
            <span className="text-slate-500">XP Bonus:</span>
            <span className="text-white ml-2 font-medium">
              +{(gameState.xpBonus * 100).toFixed(0)}%
            </span>
          </div>
          <div>
            <span className="text-slate-500">Veggreduksjon:</span>
            <span className="text-white ml-2 font-medium">
              {(gameState.wallReduction * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

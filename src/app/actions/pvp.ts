"use server";

import { getSession } from "./auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { checkAndUnlockBadges } from "./badges";

const XP_PER_LEVEL = 100;
const BASE_CLICK_DAMAGE = 10;
const DAMAGE_PER_LEVEL = 5;
const BASE_HP = 50;
const HP_PER_LEVEL = 5;
const ATTACK_COOLDOWN_MS = 30000; // 30 sekunder
const XP_PER_WIN = 50;
const GOLD_PER_WIN = 100;
const GOLD_LOSS_ON_DEFEAT = 50;

/**
 * Hent alle brukere som kan angripes (ikke deg selv, og aktive)
 */
export async function getAllUsersForPvp(): Promise<
  Array<{
    id: string;
    name: string;
    level: number;
    xp: number;
  }>
> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return [];
  }

  try {
    const { data: users, error } = await supabaseAdmin
      .from("users")
      .select("id, name, level, xp")
      .eq("is_active", true)
      .neq("id", session.userId) // Ikke deg selv
      .order("level", { ascending: false });

    if (error) {
      console.error("Error fetching users for PvP:", error);
      return [];
    }

    return (
      users?.map((u) => ({
        id: u.id,
        name: u.name,
        level: u.level || 1,
        xp: u.xp || 0,
      })) || []
    );
  } catch (error) {
    console.error("Error in getAllUsersForPvp:", error);
    return [];
  }
}

/**
 * Hent PvP stats for en bruker
 */
export async function getPvpStats(userId?: string): Promise<{
  success: boolean;
  stats?: {
    wins: number;
    losses: number;
    totalDamageDealt: number;
    totalDamageTaken: number;
    winRate: number;
    lastAttackAt: string | null;
  };
  error?: string;
}> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  const targetUserId = userId || session.userId;

  try {
    const { data: stats, error } = await supabaseAdmin
      .from("user_pvp_stats")
      .select("*")
      .eq("user_id", targetUserId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned, ikke en feil
      console.error("Error fetching PvP stats:", error);
      return { success: false, error: "Kunne ikke hente stats" };
    }

    const wins = stats?.wins || 0;
    const losses = stats?.losses || 0;
    const total = wins + losses;
    const winRate = total > 0 ? (wins / total) * 100 : 0;

    return {
      success: true,
      stats: {
        wins,
        losses,
        totalDamageDealt: parseFloat(stats?.total_damage_dealt || "0"),
        totalDamageTaken: parseFloat(stats?.total_damage_taken || "0"),
        winRate: Math.round(winRate * 10) / 10,
        lastAttackAt: stats?.last_attack_at || null,
      },
    };
  } catch (error: any) {
    console.error("Error in getPvpStats:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

/**
 * Hent nye PvP notifikasjoner (kamper hvor brukeren er defender)
 */
export async function getPvpNotifications(lastCheckedId?: string): Promise<{
  success: boolean;
  notifications?: Array<{
    id: string;
    attackerName: string;
    attackerLevel: number;
    defenderWon: boolean;
    damageDealt: number;
    createdAt: string;
  }>;
  error?: string;
}> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  try {
    // Bygg query
    let query = supabaseAdmin
      .from("pvp_battles")
      .select("id, attacker_id, attacker_won, damage_dealt, created_at, attacker_level")
      .eq("defender_id", session.userId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Hvis lastCheckedId er gitt, bare hent kamper etter den
    if (lastCheckedId) {
      const { data: lastBattle } = await supabaseAdmin
        .from("pvp_battles")
        .select("created_at")
        .eq("id", lastCheckedId)
        .single();

      if (lastBattle) {
        query = query.gt("created_at", lastBattle.created_at);
      }
    }

    const { data: battles, error } = await query;

    if (error) {
      console.error("Error fetching PvP notifications:", error);
      return { success: false, error: "Kunne ikke hente notifikasjoner" };
    }

    if (!battles || battles.length === 0) {
      return { success: true, notifications: [] };
    }

    // Hent attacker navn
    const attackerIds = [...new Set(battles.map((b: any) => b.attacker_id))];
    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id, name")
      .in("id", attackerIds);

    if (usersError) {
      console.error("Error fetching attacker names:", usersError);
    }

    const userMap = new Map(users?.map((u) => [u.id, u.name]) || []);

    const notifications = battles.map((battle: any) => ({
      id: battle.id,
      attackerName: userMap.get(battle.attacker_id) || "Ukjent",
      attackerLevel: battle.attacker_level || 1,
      defenderWon: !battle.attacker_won, // Defender vinner hvis attacker ikke vant
      damageDealt: parseFloat(battle.damage_dealt || "0"),
      createdAt: battle.created_at,
    }));

    return {
      success: true,
      notifications,
    };
  } catch (error: any) {
    console.error("Error in getPvpNotifications:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

/**
 * Angrip en annen bruker
 * SIKKERHET: All damage-beregning skjer server-side
 */
export async function attackUser(
  defenderId: string
): Promise<{
  success: boolean;
  attackerWon?: boolean;
  damageDealt?: number;
  xpEarned?: number;
  goldEarned?: number;
  goldLost?: number;
  error?: string;
}> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  if (session.userId === defenderId) {
    return { success: false, error: "Du kan ikke angripe deg selv!" };
  }

  try {
    // Hent attacker stats
    const { data: attacker, error: attackerError } = await supabaseAdmin
      .from("users")
      .select("id, level, xp")
      .eq("id", session.userId)
      .single();

    if (attackerError || !attacker) {
      return { success: false, error: "Kunne ikke hente din brukerdata" };
    }

    // Hent defender stats
    const { data: defender, error: defenderError } = await supabaseAdmin
      .from("users")
      .select("id, name, level, xp")
      .eq("id", defenderId)
      .eq("is_active", true)
      .single();

    if (defenderError || !defender) {
      return { success: false, error: "Forsvarer ikke funnet eller inaktiv" };
    }

    // Sjekk cooldown
    const { data: stats, error: statsError } = await supabaseAdmin
      .from("user_pvp_stats")
      .select("last_attack_at")
      .eq("user_id", session.userId)
      .single();

    if (!statsError && stats?.last_attack_at) {
      const lastAttack = new Date(stats.last_attack_at);
      const now = new Date();
      const timeSinceLastAttack = now.getTime() - lastAttack.getTime();

      if (timeSinceLastAttack < ATTACK_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((ATTACK_COOLDOWN_MS - timeSinceLastAttack) / 1000);
        return {
          success: false,
          error: `Vent ${remainingSeconds} sekunder før du kan angripe igjen`,
        };
      }
    }

    // Beregn stats server-side (IKKE stol på client)
    const attackerLevel = attacker.level || 1;
    const defenderLevel = defender.level || 1;

    // Damage = BASE + (level - 1) * DAMAGE_PER_LEVEL
    const attackerDamage = BASE_CLICK_DAMAGE + (attackerLevel - 1) * DAMAGE_PER_LEVEL;
    const defenderHp = BASE_HP + (defenderLevel - 1) * HP_PER_LEVEL;

    // Level difference bonus (10% per level difference, maks 200% damage)
    const levelDiff = attackerLevel - defenderLevel;
    const damageMultiplier = Math.min(1 + levelDiff * 0.1, 3); // Maks 3x damage
    const actualDamage = Math.max(1, Math.floor(attackerDamage * damageMultiplier));

    // Sjekk om attacker vinner
    const attackerWon = actualDamage >= defenderHp;

    // Beregn belønninger
    let xpEarned = 0;
    let goldEarned = 0;
    let goldLost = 0;

    if (attackerWon) {
      xpEarned = XP_PER_WIN;
      goldEarned = GOLD_PER_WIN;
      goldLost = GOLD_LOSS_ON_DEFEAT; // Defender mister gold
    } else {
      // Taper får lite XP for å ha prøvd
      xpEarned = Math.floor(XP_PER_WIN * 0.2);
    }

    // Oppdater attacker XP og level
    const currentXp = attacker.xp || 0;
    const newXp = currentXp + xpEarned;
    const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;

    const { error: updateAttackerError } = await supabaseAdmin
      .from("users")
      .update({
        xp: newXp,
        level: newLevel,
      })
      .eq("id", session.userId);

    if (updateAttackerError) {
      console.error("Error updating attacker XP:", updateAttackerError);
      return { success: false, error: "Kunne ikke oppdatere XP" };
    }

    // Oppdater defender gold (hvis de tapte)
    if (attackerWon && goldLost > 0) {
      // Hent defender gold (fra Raid localStorage, men vi kan ikke endre det server-side)
      // Vi kan bare logge det i battle log
    }

    // Sjekk badges for attacker
    const oldLevel = attackerLevel;
    if (newLevel > oldLevel) {
      await checkAndUnlockBadges(oldLevel).catch((err) => {
        console.error("Error checking badges:", err);
      });
    }

    // Logg kampen
    const { error: battleError } = await supabaseAdmin.from("pvp_battles").insert({
      attacker_id: session.userId,
      defender_id: defenderId,
      attacker_level: attackerLevel,
      defender_level: defenderLevel,
      attacker_damage: attackerDamage,
      defender_hp: defenderHp,
      damage_dealt: actualDamage,
      attacker_won: attackerWon,
      xp_earned: xpEarned,
      gold_earned: goldEarned,
      gold_lost: goldLost,
    });

    if (battleError) {
      console.error("Error logging battle:", battleError);
      // Fortsett likevel, kampen er utført
    }

    // Oppdater PvP stats for attacker
    const { data: attackerStats } = await supabaseAdmin
      .from("user_pvp_stats")
      .select("*")
      .eq("user_id", session.userId)
      .single();

    if (attackerStats) {
      // Oppdater eksisterende stats
      await supabaseAdmin
        .from("user_pvp_stats")
        .update({
          wins: attackerWon ? attackerStats.wins + 1 : attackerStats.wins,
          losses: attackerWon ? attackerStats.losses : attackerStats.losses + 1,
          total_damage_dealt:
            (parseFloat(attackerStats.total_damage_dealt || "0") || 0) + actualDamage,
          total_damage_taken:
            (parseFloat(attackerStats.total_damage_taken || "0") || 0) + 0, // Attacker tok ikke skade
          last_attack_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", session.userId);
    } else {
      // Opprett ny stats record
      await supabaseAdmin.from("user_pvp_stats").insert({
        user_id: session.userId,
        wins: attackerWon ? 1 : 0,
        losses: attackerWon ? 0 : 1,
        total_damage_dealt: actualDamage,
        total_damage_taken: 0,
        last_attack_at: new Date().toISOString(),
      });
    }

    // Oppdater PvP stats for defender
    const { data: defenderStats } = await supabaseAdmin
      .from("user_pvp_stats")
      .select("*")
      .eq("user_id", defenderId)
      .single();

    if (defenderStats) {
      await supabaseAdmin
        .from("user_pvp_stats")
        .update({
          wins: attackerWon ? defenderStats.wins : defenderStats.wins + 1,
          losses: attackerWon ? defenderStats.losses + 1 : defenderStats.losses,
          total_damage_taken:
            (parseFloat(defenderStats.total_damage_taken || "0") || 0) + actualDamage,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", defenderId);
    } else {
      await supabaseAdmin.from("user_pvp_stats").insert({
        user_id: defenderId,
        wins: attackerWon ? 0 : 1,
        losses: attackerWon ? 1 : 0,
        total_damage_dealt: 0,
        total_damage_taken: actualDamage,
      });
    }

    // Dispatch level-updated event (vil bli håndtert client-side)
    if (newLevel > oldLevel) {
      // Event vil bli dispatched fra client-side
    }

    return {
      success: true,
      attackerWon,
      damageDealt: actualDamage,
      xpEarned,
      goldEarned: attackerWon ? goldEarned : 0,
      goldLost: attackerWon ? goldLost : 0,
    };
  } catch (error: any) {
    console.error("Error in attackUser:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

/**
 * Hent PvP leaderboard
 */
export async function getPvpLeaderboard(limit: number = 10): Promise<
  Array<{
    userId: string;
    userName: string;
    level: number;
    wins: number;
    losses: number;
    winRate: number;
    totalDamageDealt: number;
  }>
> {
  try {
    // Hent stats med user info
    const { data: stats, error } = await supabaseAdmin
      .from("user_pvp_stats")
      .select("user_id, wins, losses, total_damage_dealt")
      .order("wins", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching leaderboard:", error);
      return [];
    }

    if (!stats || stats.length === 0) {
      return [];
    }

    // Hent user info for hver stat
    const userIds = stats.map((s) => s.user_id);
    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id, name, level")
      .in("id", userIds);

    if (usersError) {
      console.error("Error fetching users for leaderboard:", usersError);
      return [];
    }

    // Map stats med user info
    const userMap = new Map(users?.map((u) => [u.id, u]) || []);

    return stats.map((s) => {
      const wins = s.wins || 0;
      const losses = s.losses || 0;
      const total = wins + losses;
      const winRate = total > 0 ? (wins / total) * 100 : 0;
      const user = userMap.get(s.user_id);

      return {
        userId: s.user_id,
        userName: user?.name || "Ukjent",
        level: user?.level || 1,
        wins,
        losses,
        winRate: Math.round(winRate * 10) / 10,
        totalDamageDealt: parseFloat(s.total_damage_dealt || "0"),
      };
    });
  } catch (error) {
    console.error("Error in getPvpLeaderboard:", error);
    return [];
  }
}

"use server";

import { getSession } from "./auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { checkAndUnlockBadges } from "./badges";

const XP_PER_LEVEL = 100;

/**
 * Hent aktiv boss
 */
export async function getActiveBoss(): Promise<{
  success: boolean;
  boss?: {
    id: string;
    name: string;
    description: string;
    maxHp: number;
    currentHp: number;
    level: number;
    xpPerDamage: number;
    goldReward: number;
    spawnTime: string;
  };
  error?: string;
}> {
  try {
    const { data: boss, error } = await supabaseAdmin
      .from("dungeon_bosses")
      .select("*")
      .eq("is_active", true)
      .order("spawn_time", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Ingen aktiv boss - opprett en ny
        return await createNewBoss();
      }
      console.error("Error fetching active boss:", error);
      return { success: false, error: "Kunne ikke hente boss" };
    }

    if (!boss) {
      return await createNewBoss();
    }

    return {
      success: true,
      boss: {
        id: boss.id,
        name: boss.name,
        description: boss.description || "",
        maxHp: boss.max_hp,
        currentHp: boss.current_hp,
        level: boss.level || 1,
        xpPerDamage: parseFloat(boss.xp_per_damage || "0.1"),
        goldReward: boss.gold_reward || 1000,
        spawnTime: boss.spawn_time,
      },
    };
  } catch (error: any) {
    console.error("Error in getActiveBoss:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

/**
 * Opprett en ny boss
 */
async function createNewBoss(): Promise<{
  success: boolean;
  boss?: {
    id: string;
    name: string;
    description: string;
    maxHp: number;
    currentHp: number;
    level: number;
    xpPerDamage: number;
    goldReward: number;
    spawnTime: string;
  };
  error?: string;
}> {
  try {
    // Deaktiver alle gamle bosses
    await supabaseAdmin
      .from("dungeon_bosses")
      .update({ is_active: false })
      .eq("is_active", true);

    // Opprett ny boss
    const { data: boss, error } = await supabaseAdmin
      .from("dungeon_bosses")
      .insert({
        name: "Ancient Dragon",
        description: "En mektig drage som har terrorisert byen i århundrer. Samarbeid med andre for å beseire den!",
        max_hp: 1000000,
        current_hp: 1000000,
        level: 1,
        xp_per_damage: 0.1,
        gold_reward: 10000,
        is_active: true,
      })
      .select()
      .single();

    if (error || !boss) {
      console.error("Error creating boss:", error);
      return { success: false, error: "Kunne ikke opprette boss" };
    }

    return {
      success: true,
      boss: {
        id: boss.id,
        name: boss.name,
        description: boss.description || "",
        maxHp: boss.max_hp,
        currentHp: boss.current_hp,
        level: boss.level || 1,
        xpPerDamage: parseFloat(boss.xp_per_damage || "0.1"),
        goldReward: boss.gold_reward || 1000,
        spawnTime: boss.spawn_time,
      },
    };
  } catch (error: any) {
    console.error("Error creating boss:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

interface DungeonUpgrades {
  damageMultiplier?: number;
  xpBonus?: number;
  goldBonus?: number;
}

/**
 * Gjør skade på boss
 * SIKKERHET: Ignorerer damage-parameter fra client og beregner skade basert på brukerens faktiske level og validerte upgrades
 */
export async function damageBoss(
  damage: number, // Ignorert - beregnes på server-siden
  upgrades?: DungeonUpgrades // Valideres på server-siden
): Promise<{
  success: boolean;
  bossDefeated?: boolean;
  xpEarned?: number;
  actualDamage?: number;
  error?: string;
}> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  try {
    // Hent brukerens faktiske level for å beregne skade på server-siden
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("level, xp")
      .eq("id", session.userId)
      .single();

    if (userError || !user) {
      return { success: false, error: "Kunne ikke hente brukerdata" };
    }

    const userLevel = user.level || 1;
    
    // Beregn faktisk skade basert på brukerens level (samme formel som i Raid)
    const BASE_CLICK_DAMAGE = 1;
    const DAMAGE_PER_LEVEL = 0.5;
    let baseDamage = BASE_CLICK_DAMAGE + (userLevel - 1) * DAMAGE_PER_LEVEL;
    
    // Valider og bruk upgrades (maks 10x damage multiplier, maks 5x XP bonus)
    let damageMultiplier = 1;
    let xpBonus = 0;
    
    if (upgrades) {
      // Valider damage multiplier (maks 10x)
      if (upgrades.damageMultiplier && upgrades.damageMultiplier > 0 && upgrades.damageMultiplier <= 10) {
        damageMultiplier = upgrades.damageMultiplier;
      }
      
      // Valider XP bonus (maks 5x = 400% bonus)
      if (upgrades.xpBonus && upgrades.xpBonus >= 0 && upgrades.xpBonus <= 4) {
        xpBonus = upgrades.xpBonus;
      }
    }
    
    const actualDamage = baseDamage * damageMultiplier;

    // Rate limiting: Sjekk siste angrep (maks 2 angrep per sekund)
    const { data: recentDamage, error: rateLimitError } = await supabaseAdmin
      .from("dungeon_damage")
      .select("dealt_at")
      .eq("user_id", session.userId)
      .order("dealt_at", { ascending: false })
      .limit(1);

    if (!rateLimitError && recentDamage && recentDamage.length > 0) {
      const lastAttack = new Date(recentDamage[0].dealt_at);
      const now = new Date();
      const timeSinceLastAttack = now.getTime() - lastAttack.getTime();
      
      // Minimum 500ms mellom angrep (maks 2 per sekund)
      if (timeSinceLastAttack < 500) {
        return { success: false, error: "For raskt! Vent litt mellom angrep." };
      }
    }

    // Hent aktiv boss
    const bossResult = await getActiveBoss();
    if (!bossResult.success || !bossResult.boss) {
      return { success: false, error: "Ingen aktiv boss funnet" };
    }

    const boss = bossResult.boss;
    
    // Sjekk at boss ikke allerede er beseiret
    if (boss.currentHp <= 0) {
      return { success: false, error: "Bossen er allerede beseiret" };
    }
    
    const newHp = Math.max(0, boss.currentHp - actualDamage);
    const bossDefeated = newHp <= 0;

    // Oppdater boss HP
    const { error: updateError } = await supabaseAdmin
      .from("dungeon_bosses")
      .update({
        current_hp: newHp,
        defeated_at: bossDefeated ? new Date().toISOString() : null,
        is_active: !bossDefeated,
        updated_at: new Date().toISOString(),
      })
      .eq("id", boss.id);

    if (updateError) {
      console.error("Error updating boss HP:", updateError);
      return { success: false, error: "Kunne ikke oppdatere boss" };
    }

    // Beregn XP basert på faktisk skade med bonus
    const xpEarned = actualDamage * boss.xpPerDamage * (1 + xpBonus);

    // Registrer skade med faktisk skade-verdi
    const { error: damageError } = await supabaseAdmin
      .from("dungeon_damage")
      .insert({
        boss_id: boss.id,
        user_id: session.userId,
        damage_amount: actualDamage,
        xp_earned: xpEarned,
      });

    if (damageError) {
      console.error("Error recording damage:", damageError);
      // Fortsett selv om vi ikke kan registrere skade
    }

    // Gi XP til brukeren
    if (xpEarned > 0) {
      try {
        const { data: user, error: userError } = await supabaseAdmin
          .from("users")
          .select("xp, level")
          .eq("id", session.userId)
          .single();

        if (!userError && user) {
          const currentLevel = user.level || 1;
          const newXp = (user.xp || 0) + Math.floor(xpEarned);
          const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;

          await supabaseAdmin
            .from("users")
            .update({
              xp: newXp,
              level: newLevel,
            })
            .eq("id", session.userId);

          // Sjekk badges hvis level endret seg
          if (newLevel > currentLevel) {
            await checkAndUnlockBadges(currentLevel).catch((err) => {
              console.error("Error checking badges:", err);
            });
          }
        }
      } catch (err) {
        console.error("Error updating user XP:", err);
        // Fortsett selv om XP-oppdatering feiler
      }
    }

    return {
      success: true,
      bossDefeated,
      xpEarned: Math.floor(xpEarned),
      actualDamage: actualDamage,
    };
  } catch (error: any) {
    console.error("Error damaging boss:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

/**
 * Hent leaderboard for aktiv boss
 */
export async function getBossLeaderboard(): Promise<{
  success: boolean;
  leaderboard?: Array<{
    userId: string;
    userName: string;
    totalDamage: number;
    xpEarned: number;
  }>;
  error?: string;
}> {
  try {
    const bossResult = await getActiveBoss();
    if (!bossResult.success || !bossResult.boss) {
      return { success: false, error: "Ingen aktiv boss funnet" };
    }

    const { data: damageData, error } = await supabaseAdmin
      .from("dungeon_damage")
      .select(
        `
        user_id,
        damage_amount,
        xp_earned,
        users!inner (
          id,
          name
        )
      `
      )
      .eq("boss_id", bossResult.boss.id)
      .order("dealt_at", { ascending: false });

    if (error) {
      console.error("Error fetching leaderboard:", error);
      return { success: false, error: "Kunne ikke hente leaderboard" };
    }

    // Aggreger skade per bruker
    const damageMap = new Map<
      string,
      { userName: string; totalDamage: number; xpEarned: number }
    >();

    (damageData || []).forEach((entry: any) => {
      const userId = entry.user_id;
      const userName = entry.users?.name || "Ukjent";
      const damage = entry.damage_amount || 0;
      const xp = parseFloat(entry.xp_earned || 0);

      if (damageMap.has(userId)) {
        const existing = damageMap.get(userId)!;
        existing.totalDamage += damage;
        existing.xpEarned += xp;
      } else {
        damageMap.set(userId, {
          userName,
          totalDamage: damage,
          xpEarned: xp,
        });
      }
    });

    const leaderboard = Array.from(damageMap.entries())
      .map(([userId, data]) => ({
        userId,
        userName: data.userName,
        totalDamage: data.totalDamage,
        xpEarned: data.xpEarned,
      }))
      .sort((a, b) => b.totalDamage - a.totalDamage);

    return { success: true, leaderboard };
  } catch (error: any) {
    console.error("Error in getBossLeaderboard:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

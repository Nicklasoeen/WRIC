"use server";

import { getSession } from "./auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { checkAndUnlockBadges } from "./badges";

const XP_PER_LEVEL = 100;

/**
 * Hent brukerens hovedlevel og XP
 */
export async function getUserLevel(): Promise<{
  success: boolean;
  level?: number;
  xp?: number;
  error?: string;
}> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  try {
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("level, xp")
      .eq("id", session.userId)
      .single();

    if (error) {
      // Hvis kolonnene ikke finnes, returner default verdier
      if (error.code === "PGRST116" || error.message?.includes("column") || error.message?.includes("does not exist")) {
        console.warn("Level/XP columns may not exist yet. Using defaults.");
        return {
          success: true,
          level: 1,
          xp: 0,
        };
      }
      console.error("Error fetching user level:", error);
      return { success: false, error: "Kunne ikke hente brukerlevel" };
    }

    if (!user) {
      return { success: false, error: "Bruker ikke funnet" };
    }

    return {
      success: true,
      level: user.level || 1,
      xp: user.xp || 0,
    };
  } catch (error: any) {
    console.error("Error fetching user level:", error);
    // Returner default verdier ved feil i stedet for å feile
    return {
      success: true,
      level: 1,
      xp: 0,
    };
  }
}

/**
 * Gi XP fra Raid til brukerens hovedlevel
 * SIKKERHET: Validerer XP-verdier for å forhindre cheating
 */
export async function addRaidXp(
  raidXp: number,
  raidLevel: number
): Promise<{ success: boolean; xpEarned?: number; newLevel?: number; error?: string }> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  try {
    // Valider input - maksimalt rimelig XP per gnome (f.eks. 1000 XP)
    const MAX_XP_PER_GNOME = 1000;
    if (raidXp < 0 || raidXp > MAX_XP_PER_GNOME) {
      console.warn(`Suspicious XP value: ${raidXp}. Capping at ${MAX_XP_PER_GNOME}`);
      raidXp = Math.min(raidXp, MAX_XP_PER_GNOME);
    }

    // Valider Raid level - maksimalt rimelig level (f.eks. 1000)
    const MAX_RAID_LEVEL = 1000;
    if (raidLevel < 1 || raidLevel > MAX_RAID_LEVEL) {
      console.warn(`Suspicious Raid level: ${raidLevel}. Capping at ${MAX_RAID_LEVEL}`);
      raidLevel = Math.min(Math.max(raidLevel, 1), MAX_RAID_LEVEL);
    }

    // Rate limiting: Sjekk siste XP-tillegg (maks 10 per sekund)
    const { data: recentXp, error: rateLimitError } = await supabaseAdmin
      .from("users")
      .select("updated_at")
      .eq("id", session.userId)
      .single();

    if (!rateLimitError && recentXp?.updated_at) {
      const lastUpdate = new Date(recentXp.updated_at);
      const now = new Date();
      const timeSinceLastUpdate = now.getTime() - lastUpdate.getTime();
      
      // Minimum 100ms mellom oppdateringer (maks 10 per sekund)
      if (timeSinceLastUpdate < 100) {
        return { success: false, error: "For raskt! Vent litt." };
      }
    }

    // Hent brukerens nåværende XP og level
    let currentXp = 0;
    let currentLevel = 1;
    
    try {
      const { data: user, error: userError } = await supabaseAdmin
        .from("users")
        .select("xp, level")
        .eq("id", session.userId)
        .single();

      if (userError) {
        // Hvis kolonnene ikke finnes, bruk default verdier
        if (userError.code === "PGRST116" || userError.message?.includes("column") || userError.message?.includes("does not exist")) {
          console.warn("XP/Level columns may not exist yet. Using defaults.");
          currentXp = 0;
          currentLevel = 1;
        } else {
          console.error("Error fetching user:", userError);
          return { success: false, error: "Kunne ikke hente brukerdata" };
        }
      } else if (user) {
        currentXp = user.xp || 0;
        currentLevel = user.level || 1;
      }
    } catch (err: any) {
      console.warn("Could not fetch user data:", err);
      // Fortsett med default verdier
      currentXp = 0;
      currentLevel = 1;
    }

    // Raid level gir bonus XP (5% per Raid level) - maksimalt 50x bonus
    const raidLevelBonus = Math.min(1 + (raidLevel - 1) * 0.05, 50);
    const totalXpEarned = Math.floor(raidXp * raidLevelBonus);

    const newXp = currentXp + totalXpEarned;

    // Beregn ny level (samme formel som i praise.ts)
    const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;

    // Oppdater brukerens XP og level
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        xp: newXp,
        level: newLevel,
      })
      .eq("id", session.userId);

    if (updateError) {
      console.error("Error updating user XP:", updateError);
      return { success: false, error: "Kunne ikke oppdatere XP" };
    }

    // Sjekk om brukeren skal få nye badges (send med gammel level for å sjekke alle mellomliggende)
    if (newLevel > currentLevel) {
      await checkAndUnlockBadges(currentLevel).catch((err) => {
        console.error("Error checking badges:", err);
      });
    }

    return {
      success: true,
      xpEarned: totalXpEarned,
      newLevel: newLevel,
    };
  } catch (error: any) {
    console.error("Error adding Raid XP:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

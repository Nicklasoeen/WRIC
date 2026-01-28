"use server";

import { getSession } from "./auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export interface Badge {
  id: string;
  name: string;
  description: string;
  levelRequired: number;
  icon: string;
  color: string;
}

export interface UserBadge {
  id: string;
  badgeId: string;
  badge: Badge;
  unlockedAt: string;
}

/**
 * Hent alle tilgjengelige badges
 */
export async function getAllBadges(): Promise<{
  success: boolean;
  badges?: Badge[];
  error?: string;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from("badges")
      .select("*")
      .order("level_required", { ascending: true });

    if (error) {
      console.error("Error fetching badges:", error);
      return { success: false, error: "Kunne ikke hente badges" };
    }

    const badges: Badge[] = (data || []).map((badge) => ({
      id: badge.id,
      name: badge.name,
      description: badge.description || "",
      levelRequired: badge.level_required,
      icon: badge.icon || "fa:FaHammer",
      color: badge.color || "yellow",
    }));

    return { success: true, badges };
  } catch (error: any) {
    console.error("Error fetching badges:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

/**
 * Hent brukerens badges
 */
export async function getUserBadges(): Promise<{
  success: boolean;
  badges?: UserBadge[];
  error?: string;
}> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("user_badges")
      .select(
        `
        id,
        badge_id,
        unlocked_at,
        badges (
          id,
          name,
          description,
          level_required,
          icon,
          color
        )
      `
      )
      .eq("user_id", session.userId)
      .order("unlocked_at", { ascending: false });

    if (error) {
      console.error("Error fetching user badges:", error);
      return { success: false, error: "Kunne ikke hente badges" };
    }

    const userBadges: UserBadge[] = (data || []).map((ub: any) => ({
      id: ub.id,
      badgeId: ub.badge_id,
      badge: {
        id: ub.badges.id,
        name: ub.badges.name,
        description: ub.badges.description || "",
        levelRequired: ub.badges.level_required,
        icon: ub.badges.icon || "fa:FaUser",
        color: ub.badges.color || "yellow",
      },
      unlockedAt: ub.unlocked_at,
    }));

    return { success: true, badges: userBadges };
  } catch (error: any) {
    console.error("Error fetching user badges:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

/**
 * Sjekk og unlock badges basert på brukerens level
 * Dette kalles automatisk når brukeren får XP
 * @param oldLevel - Gammel level (valgfritt, for å sjekke alle badges mellom gammel og ny level)
 */
export async function checkAndUnlockBadges(oldLevel?: number): Promise<{
  success: boolean;
  unlocked?: Badge[];
  error?: string;
}> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  try {
    // Hent brukerens level
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("level, xp")
      .eq("id", session.userId)
      .single();

    if (userError || !user) {
      console.error("Error fetching user:", userError);
      return { success: false, error: "Kunne ikke hente brukerdata" };
    }

    const userLevel = user.level || 1;
    const minLevel = oldLevel ? Math.min(oldLevel, userLevel) : 1;
    const maxLevel = userLevel;

    // Hent badges som brukeren kan unlocke (mellom minLevel og maxLevel)
    const { data: availableBadges, error: badgesError } = await supabaseAdmin
      .from("badges")
      .select("*")
      .gte("level_required", minLevel)
      .lte("level_required", maxLevel)
      .order("level_required", { ascending: true });

    if (badgesError) {
      console.error("Error fetching available badges:", badgesError);
      return { success: false, error: "Kunne ikke hente badges" };
    }

    // Hent badges brukeren allerede har
    const { data: existingBadges, error: existingError } = await supabaseAdmin
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", session.userId);

    if (existingError) {
      console.error("Error fetching existing badges:", existingError);
      return { success: false, error: "Kunne ikke hente eksisterende badges" };
    }

    const existingBadgeIds = new Set((existingBadges || []).map((b) => b.badge_id));

    // Finn nye badges som skal unlockes
    const newBadges = (availableBadges || []).filter(
      (badge) => !existingBadgeIds.has(badge.id)
    );

    if (newBadges.length === 0) {
      return { success: true, unlocked: [] };
    }

    // Unlock nye badges
    const unlockData = newBadges.map((badge) => ({
      user_id: session.userId,
      badge_id: badge.id,
    }));

    const { error: unlockError } = await supabaseAdmin
      .from("user_badges")
      .insert(unlockData);

    if (unlockError) {
      console.error("Error unlocking badges:", unlockError);
      return { success: false, error: "Kunne ikke unlocke badges" };
    }

    const unlocked: Badge[] = newBadges.map((badge) => ({
      id: badge.id,
      name: badge.name,
      description: badge.description || "",
      levelRequired: badge.level_required,
      icon: badge.icon || "fa:FaHammer",
      color: badge.color || "yellow",
    }));

    console.log(`Unlocked ${unlocked.length} badges for level ${userLevel}`);
    return { success: true, unlocked };
  } catch (error: any) {
    console.error("Error checking badges:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

/**
 * Sikre at brukeren har Slave worker badge (level 1)
 * Kalles automatisk ved første innlogging
 */
export async function ensureMemberBadge(): Promise<{
  success: boolean;
  error?: string;
}> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  try {
    // Hent Slave worker badge ID (level 1)
    const { data: memberBadge, error: badgeError } = await supabaseAdmin
      .from("badges")
      .select("id")
      .eq("level_required", 1)
      .order("level_required", { ascending: true })
      .limit(1)
      .single();

    if (badgeError || !memberBadge) {
      // Member badge finnes ikke ennå - ikke en feil, bare returner success
      return { success: true };
    }

    // Sjekk om brukeren allerede har Member badge
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("user_badges")
      .select("id")
      .eq("user_id", session.userId)
      .eq("badge_id", memberBadge.id)
      .single();

    if (existingError && existingError.code !== "PGRST116") {
      console.error("Error checking existing badge:", existingError);
      return { success: false, error: "Kunne ikke sjekke badge" };
    }

    // Hvis brukeren allerede har badge, returner success
    if (existing) {
      return { success: true };
    }

    // Unlock Member badge
    const { error: unlockError } = await supabaseAdmin
      .from("user_badges")
      .insert({
        user_id: session.userId,
        badge_id: memberBadge.id,
      });

    if (unlockError) {
      console.error("Error unlocking Member badge:", unlockError);
      return { success: false, error: "Kunne ikke unlocke Member badge" };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error ensuring Member badge:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

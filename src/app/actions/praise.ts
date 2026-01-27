"use server";

import { getSession } from "./auth";
import { supabaseAdmin } from "@/lib/supabase-server";

const XP_PER_PRAISE = 10;
const MAX_PRAISES_PER_DAY = 3;

/**
 * Gi praise og tildel XP
 */
export async function givePraise(): Promise<{
  success: boolean;
  error?: string;
  xpEarned?: number;
  totalXp?: number;
  praisesRemaining?: number;
}> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  try {
    // Sjekk hvor mange praises brukeren har gitt i dag
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: todayPraises, error: praiseError } = await supabaseAdmin
      .from("praises")
      .select("id")
      .eq("user_id", session.userId)
      .gte("praised_at", today.toISOString())
      .lt("praised_at", tomorrow.toISOString());

    if (praiseError) {
      console.error("Error checking praises:", praiseError);
      return { success: false, error: "Kunne ikke sjekke praises" };
    }

    const praisesToday = todayPraises?.length || 0;

    if (praisesToday >= MAX_PRAISES_PER_DAY) {
      return {
        success: false,
        error: `Du har allerede gitt ${MAX_PRAISES_PER_DAY} praises i dag. Kom tilbake i morgen!`,
        praisesRemaining: 0,
      };
    }

    // Legg til ny praise
    const { error: insertError } = await supabaseAdmin.from("praises").insert({
      user_id: session.userId,
      xp_earned: XP_PER_PRAISE,
    });

    if (insertError) {
      console.error("Error inserting praise:", insertError);
      return { success: false, error: "Kunne ikke gi praise" };
    }

    // Oppdater brukerens XP
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("xp")
      .eq("id", session.userId)
      .single();

    if (userError) {
      console.error("Error fetching user:", userError);
      return { success: false, error: "Kunne ikke hente brukerdata" };
    }

    const newXp = (user?.xp || 0) + XP_PER_PRAISE;

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ xp: newXp })
      .eq("id", session.userId);

    if (updateError) {
      console.error("Error updating XP:", updateError);
      return { success: false, error: "Kunne ikke oppdatere XP" };
    }

    return {
      success: true,
      xpEarned: XP_PER_PRAISE,
      totalXp: newXp,
      praisesRemaining: MAX_PRAISES_PER_DAY - praisesToday - 1,
    };
  } catch (error: any) {
    console.error("Error giving praise:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

/**
 * Hent brukerens XP og praise-status
 */
export async function getPraiseStatus(): Promise<{
  totalXp: number;
  praisesToday: number;
  praisesRemaining: number;
}> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { totalXp: 0, praisesToday: 0, praisesRemaining: 0 };
  }

  try {
    // Hent brukerens XP - håndter hvis xp-kolonnen ikke eksisterer
    let totalXp = 0;
    try {
      const { data: user, error: userError } = await supabaseAdmin
        .from("users")
        .select("xp")
        .eq("id", session.userId)
        .single();

      if (userError) {
        // Hvis xp-kolonnen ikke finnes, returner 0
        if (userError.code === "PGRST116" || userError.message?.includes("column") || userError.message?.includes("does not exist")) {
          console.warn("XP column does not exist yet. Run praise-schema.sql");
          totalXp = 0;
        } else {
          console.error("Error fetching user XP:", userError);
        }
      } else {
        totalXp = user?.xp || 0;
      }
    } catch (err: any) {
      console.warn("Could not fetch XP:", err);
      totalXp = 0;
    }

    // Hent praises i dag - håndter hvis tabellen ikke eksisterer
    let praisesToday = 0;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: todayPraises, error: praiseError } = await supabaseAdmin
        .from("praises")
        .select("id")
        .eq("user_id", session.userId)
        .gte("praised_at", today.toISOString())
        .lt("praised_at", tomorrow.toISOString());

      if (praiseError) {
        // Hvis praises-tabellen ikke finnes
        if (praiseError.code === "PGRST116" || praiseError.message?.includes("relation") || praiseError.message?.includes("does not exist")) {
          console.warn("Praises table does not exist yet. Run praise-schema.sql");
          praisesToday = 0;
        } else {
          console.error("Error fetching praises:", praiseError);
        }
      } else {
        praisesToday = todayPraises?.length || 0;
      }
    } catch (err: any) {
      console.warn("Could not fetch praises:", err);
      praisesToday = 0;
    }

    const praisesRemaining = Math.max(0, MAX_PRAISES_PER_DAY - praisesToday);

    return {
      totalXp,
      praisesToday,
      praisesRemaining,
    };
  } catch (error: any) {
    console.error("Error getting praise status:", error);
    return { totalXp: 0, praisesToday: 0, praisesRemaining: 0 };
  }
}

/**
 * Hent top praisers for denne måneden
 */
export async function getTopPraisersOfMonth(): Promise<
  Array<{
    userId: string;
    userName: string;
    totalPraises: number;
    totalXp: number;
  }>
> {
  try {
    const session = await getSession();
    if (!session.isAuthenticated) {
      return [];
    }

    // Hent første dag i måneden
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Hent alle praises denne måneden og grupper per bruker
    const { data: praises, error: praisesError } = await supabaseAdmin
      .from("praises")
      .select("user_id, xp_earned")
      .gte("praised_at", firstDayOfMonth.toISOString())
      .lt("praised_at", firstDayOfNextMonth.toISOString());

    if (praisesError || !praises) {
      console.error("Error fetching praises:", praisesError);
      return [];
    }

    // Grupper per bruker
    const userStats = new Map<
      string,
      { totalPraises: number; totalXp: number }
    >();

    for (const praise of praises) {
      const existing = userStats.get(praise.user_id) || {
        totalPraises: 0,
        totalXp: 0,
      };
      userStats.set(praise.user_id, {
        totalPraises: existing.totalPraises + 1,
        totalXp: existing.totalXp + (praise.xp_earned || 10),
      });
    }

    // Hent brukernavn
    const userIds = Array.from(userStats.keys());
    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id, name, xp")
      .in("id", userIds);

    if (usersError || !users) {
      console.error("Error fetching users:", usersError);
      return [];
    }

    // Kombiner data
    const topPraisers = Array.from(userStats.entries())
      .map(([userId, stats]) => {
        const user = users.find((u) => u.id === userId);
        return {
          userId,
          userName: user?.name || "Ukjent",
          totalPraises: stats.totalPraises,
          totalXp: user?.xp || stats.totalXp,
        };
      })
      .sort((a, b) => b.totalPraises - a.totalPraises) // Sorter etter antall praises
      .slice(0, 10); // Top 10

    return topPraisers;
  } catch (error: any) {
    console.error("Error getting top praisers:", error);
    return [];
  }
}

"use server";

import { supabaseAdmin } from "@/lib/supabase-server";
import { getSession } from "./auth";

/**
 * Sett eller fjern midlertidig timeout på en bruker (admin only)
 */
export async function setUserTimeout(
  userId: string,
  minutes: number | null
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.isAdmin) {
    return { success: false, error: "Kun admin kan sette timeout" };
  }

  try {
    const timeoutUntil =
      minutes && minutes > 0
        ? new Date(Date.now() + minutes * 60_000).toISOString()
        : null;

    const { error } = await supabaseAdmin
      .from("users")
      .update({ timeout_until: timeoutUntil })
      .eq("id", userId);

    if (error) {
      console.error("Error setting user timeout:", error);
      return { success: false, error: "Kunne ikke oppdatere timeout" };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error in setUserTimeout:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}


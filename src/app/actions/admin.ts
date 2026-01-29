"use server";

import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getSession } from "./auth";

// Legg til ny bruker (kun admin)
export async function createUser(
  name: string,
  password: string
): Promise<{ success: boolean; error?: string; userId?: string }> {
  const session = await getSession();

  if (!session.isAuthenticated) {
    return { success: false, error: "Ikke autentisert" };
  }

  // Sjekk om brukeren er admin
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("is_admin")
    .eq("id", session.userId)
    .single();

  if (userError || !user?.is_admin) {
    return { success: false, error: "Kun admin kan legge til brukere" };
  }

  // Hash passordet
  const passwordHash = await bcrypt.hash(password, 10);

  // Opprett bruker
  const { data: newUser, error } = await supabaseAdmin
    .from("users")
    .insert({
      name,
      password_hash: passwordHash,
      is_active: true,
      is_admin: false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating user:", error);
    return { success: false, error: "Kunne ikke opprette bruker" };
  }

  return { success: true, userId: newUser.id };
}

// Fjern bruker (kun admin)
// Sletter all relatert data (praises, votes, PvP stats, battles, badges, chat, etc.) før deaktivering
export async function deleteUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();

  if (!session.isAuthenticated) {
    return { success: false, error: "Ikke autentisert" };
  }

  // Sjekk om brukeren er admin
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("is_admin")
    .eq("id", session.userId)
    .single();

  if (userError || !user?.is_admin) {
    return { success: false, error: "Kun admin kan fjerne brukere" };
  }

  try {
    // Slett all relatert data først
    // 1. Praises
    await supabaseAdmin.from("praises").delete().eq("user_id", userId);

    // 2. User votes
    await supabaseAdmin.from("user_votes").delete().eq("user_id", userId);

    // 3. User badges
    await supabaseAdmin.from("user_badges").delete().eq("user_id", userId);

    // 4. PvP stats
    await supabaseAdmin.from("user_pvp_stats").delete().eq("user_id", userId);

    // 5. PvP battles (hvor brukeren er attacker eller defender)
    // Slett battles hvor brukeren er attacker
    await supabaseAdmin.from("pvp_battles").delete().eq("attacker_id", userId);
    // Slett battles hvor brukeren er defender
    await supabaseAdmin.from("pvp_battles").delete().eq("defender_id", userId);

    // 6. Chat messages
    await supabaseAdmin.from("chat_messages").delete().eq("user_id", userId);

    // 7. Chat reactions
    await supabaseAdmin.from("chat_reactions").delete().eq("user_id", userId);

    // 8. Portfolio holdings
    await supabaseAdmin.from("holdings").delete().eq("user_id", userId);

    // 9. Nullstill XP, level og gull (valgfritt - kan også beholde for historikk)
    await supabaseAdmin
      .from("users")
      .update({
        xp: 0,
        level: 1,
        gold: 0,
        is_active: false,
      })
      .eq("id", userId);

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting user data:", error);
    return { success: false, error: error.message || "Kunne ikke fjerne brukerdata" };
  }
}

// Hent alle brukere (kun admin)
export async function getAllUsers(): Promise<
  Array<{
    id: string;
    name: string;
    is_active: boolean;
    is_admin: boolean;
    timeout_until: string | null;
  }>
> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    console.warn("getAllUsers: Not authenticated");
    return [];
  }

  // Sjekk om brukeren er admin
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("is_admin")
    .eq("id", session.userId)
    .single();

  if (userError) {
    console.error("getAllUsers: Error checking admin status:", userError);
    return [];
  }

  if (!user?.is_admin) {
    console.warn("getAllUsers: User is not admin", { userId: session.userId });
    return [];
  }

  // Hent alle brukere (inkludert deaktiverte)
  // Prøv først med timeout_until, fall tilbake uten hvis kolonnen ikke finnes
  let { data: users, error } = await supabaseAdmin
    .from("users")
    .select("id, name, is_active, is_admin, timeout_until")
    .order("created_at", { ascending: false });

  // Hvis timeout_until kolonnen ikke finnes, prøv uten den
  if (error && (error.message?.includes("timeout_until") || error.code === "PGRST116")) {
    console.warn("getAllUsers: timeout_until column missing, fetching without it");
    const fallback = await supabaseAdmin
      .from("users")
      .select("id, name, is_active, is_admin")
      .order("created_at", { ascending: false });
    
    // Legg til timeout_until: null for alle brukere hvis kolonnen mangler
    if (fallback.data) {
      users = fallback.data.map((u: any) => ({ ...u, timeout_until: null })) as any;
    } else {
      users = null;
    }
    error = fallback.error;
  }

  if (error) {
    console.error("getAllUsers: Error fetching users:", error);
    return [];
  }

  console.log("getAllUsers: Fetched users", { count: users?.length || 0 });
  return (users || []) as Array<{
    id: string;
    name: string;
    is_active: boolean;
    is_admin: boolean;
    timeout_until: string | null;
  }>;
}

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

  // Deaktiver bruker (ikke slett, for å beholde historikk)
  const { error } = await supabaseAdmin
    .from("users")
    .update({ is_active: false })
    .eq("id", userId);

  if (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: "Kunne ikke fjerne bruker" };
  }

  return { success: true };
}

// Hent alle brukere (kun admin)
export async function getAllUsers(): Promise<
  Array<{ id: string; name: string; is_active: boolean; is_admin: boolean }>
> {
  const session = await getSession();

  if (!session.isAuthenticated) {
    return [];
  }

  // Sjekk om brukeren er admin
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("is_admin")
    .eq("id", session.userId)
    .single();

  if (userError || !user?.is_admin) {
    return [];
  }

  const { data: users, error } = await supabaseAdmin
    .from("users")
    .select("id, name, is_active, is_admin")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching users:", error);
    return [];
  }

  return users || [];
}

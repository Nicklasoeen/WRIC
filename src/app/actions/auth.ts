"use server";

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-server";

// Sjekk passord mot alle brukere i databasen
export async function checkPassword(password: string): Promise<{
  success: boolean;
  userId?: string;
  userName?: string;
  attemptsRemaining?: number;
}> {
  const cookieStore = await cookies();
  const attemptsCookie = cookieStore.get("login_attempts");
  const attempts = attemptsCookie ? parseInt(attemptsCookie.value, 10) : 0;

  try {
    // Hent alle aktive brukere
    const { data: users, error } = await supabaseAdmin
      .from("users")
      .select("id, name, password_hash, is_active")
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching users:", error);
      return {
        success: false,
        attemptsRemaining: Math.max(0, 3 - attempts - 1),
      };
    }

    // Sjekk passordet mot alle brukere
    for (const user of users || []) {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (isMatch) {
        // Riktig passord - sett session cookie med bruker-ID
        cookieStore.set("dashboard_user_id", user.id, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7, // 7 dager
        });
        cookieStore.set("dashboard_user_name", user.name, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
        });
        // Nullstill forsøk
        cookieStore.delete("login_attempts");
        
        // Sikre at brukeren har Member badge (kjøres asynkront)
        import("./badges").then(({ ensureMemberBadge }) => {
          ensureMemberBadge().catch((err) => {
            console.error("Error ensuring Member badge:", err);
          });
        });
        
        return {
          success: true,
          userId: user.id,
          userName: user.name,
        };
      }
    }

    // Ingen match - feil passord
    const newAttempts = attempts + 1;
    cookieStore.set("login_attempts", newAttempts.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutter
    });

    return {
      success: false,
      attemptsRemaining: Math.max(0, 3 - newAttempts),
    };
  } catch (error) {
    console.error("Error in checkPassword:", error);
    return {
      success: false,
      attemptsRemaining: Math.max(0, 3 - attempts - 1),
    };
  }
}

export async function getSession(): Promise<{
  isAuthenticated: boolean;
  userId?: string;
  userName?: string;
  isAdmin?: boolean;
}> {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("dashboard_user_id")?.value;
    const userName = cookieStore.get("dashboard_user_name")?.value;

    if (!userId) {
      return { isAuthenticated: false };
    }

    // Verifiser at brukeren fortsatt eksisterer og er aktiv
    try {
      const { data: user, error } = await supabaseAdmin
        .from("users")
        .select("id, name, is_active, is_admin")
        .eq("id", userId)
        .eq("is_active", true)
        .single();

      if (error || !user) {
        // Brukeren finnes ikke lenger eller er deaktivert
        cookieStore.delete("dashboard_user_id");
        cookieStore.delete("dashboard_user_name");
        return { isAuthenticated: false };
      }

      return {
        isAuthenticated: true,
        userId: user.id,
        userName: user.name || userName,
        isAdmin: user.is_admin || false,
      };
    } catch (error) {
      console.error("Error verifying session:", error);
      return { isAuthenticated: false };
    }
  } catch (error) {
    console.error("Error in getSession:", error);
    return { isAuthenticated: false };
  }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("dashboard_user_id");
  cookieStore.delete("dashboard_user_name");
  cookieStore.delete("login_attempts");
}

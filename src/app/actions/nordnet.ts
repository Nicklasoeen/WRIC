"use server";

import { getSession } from "./auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
const ALGORITHM = "aes-256-gcm";

/**
 * Krypterer data med AES-256-GCM
 */
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv
  );

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Lagrer Nordnet session etter BankID-login
 * Session cookies kommer fra en ekstern BankID-autentisering flow
 */
export async function saveNordnetSession(
  cookies: string,
  expiresAt: Date
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  try {
    // Krypter session data
    const sessionData = JSON.stringify({ cookies, expiresAt: expiresAt.toISOString() });
    const encrypted = encrypt(sessionData);

    // Lagre i database
    const { error } = await supabaseAdmin
      .from("external_connections")
      .upsert(
        {
          user_id: session.userId,
          provider: "nordnet",
          encrypted_token: encrypted,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,provider",
        }
      );

    if (error) {
      console.error("Error saving Nordnet session:", error);
      return { success: false, error: "Kunne ikke lagre session" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error saving Nordnet session:", error);
    return { success: false, error: "En uventet feil oppstod" };
  }
}

/**
 * Kobler fra Nordnet
 */
export async function disconnectNordnet(): Promise<{
  success: boolean;
  error?: string;
}> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  const { error } = await supabaseAdmin
    .from("external_connections")
    .update({
      encrypted_token: null,
      disconnected_at: new Date().toISOString(),
    })
    .eq("user_id", session.userId)
    .eq("provider", "nordnet");

  if (error) {
    console.error("Error disconnecting Nordnet:", error);
    return { success: false, error: "Kunne ikke koble fra" };
  }

  // Slett også cached data
  await supabaseAdmin
    .from("cached_widget_data")
    .delete()
    .eq("user_id", session.userId)
    .eq("widget_id", "nordnet");

  return { success: true };
}

/**
 * Sjekker om brukeren har koblet til Nordnet
 */
export async function isNordnetConnected(): Promise<boolean> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return false;
  }

  const { data, error } = await supabaseAdmin
    .from("external_connections")
    .select("encrypted_token, connected_at")
    .eq("user_id", session.userId)
    .eq("provider", "nordnet")
    .single();

  if (error || !data || !data.encrypted_token) {
    return false;
  }

  return true;
}

/**
 * Starter BankID-login flow for Nordnet
 * 
 * NOTE: Puppeteer er fjernet. For å koble til Nordnet må du:
 * 1. Logg inn på Nordnet manuelt i nettleseren
 * 2. Kopier session cookies fra Developer Tools
 * 3. Bruk saveNordnetSession() direkte med cookies
 * 
 * Alternativt: Implementer manuell cookie-inntasting i UI
 */
export async function startNordnetBankIDLogin(): Promise<{
  success: boolean;
  error?: string;
}> {
  return {
    success: false,
    error: "BankID-login med Puppeteer er ikke lenger tilgjengelig. Bruk manuell cookie-inntasting i stedet.",
  };
}

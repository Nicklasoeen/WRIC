"use server";

import { getSession } from "./auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export interface Holding {
  id: string;
  ticker: string;
  name: string;
  quantity: number;
  purchase_price: number;
  purchase_date: string;
  currency: string;
  exchange?: string;
  type?: string;
  notes?: string;
}

export interface HoldingWithValue extends Holding {
  current_price?: number;
  current_value?: number;
  gain_loss?: number;
  gain_loss_percent?: number;
}

/**
 * Legg til et nytt kjøp
 */
export async function addHolding(
  ticker: string,
  name: string,
  quantity: number,
  purchase_price: number,
  purchase_date: string,
  currency: string = "NOK",
  exchange?: string,
  type: string = "stock",
  notes?: string
): Promise<{ success: boolean; error?: string; holding?: Holding }> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("holdings")
      .insert({
        user_id: session.userId,
        ticker: ticker.toUpperCase(),
        name,
        quantity,
        purchase_price,
        purchase_date,
        currency,
        exchange,
        type,
        notes,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding holding:", error);
      return { success: false, error: "Kunne ikke legge til kjøp" };
    }

    return { success: true, holding: data as Holding };
  } catch (error: any) {
    console.error("Error adding holding:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

/**
 * Hent alle kjøp for brukeren
 */
export async function getHoldings(): Promise<{
  success: boolean;
  holdings?: Holding[];
  error?: string;
}> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("holdings")
      .select("*")
      .eq("user_id", session.userId)
      .order("purchase_date", { ascending: false });

    if (error) {
      console.error("Error fetching holdings:", error);
      return { success: false, error: "Kunne ikke hente kjøp" };
    }

    return { success: true, holdings: (data || []) as Holding[] };
  } catch (error: any) {
    console.error("Error fetching holdings:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

/**
 * Slett et kjøp
 */
export async function deleteHolding(
  holdingId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  try {
    const { error } = await supabaseAdmin
      .from("holdings")
      .delete()
      .eq("id", holdingId)
      .eq("user_id", session.userId); // Sikkerhet: sjekk at det tilhører brukeren

    if (error) {
      console.error("Error deleting holding:", error);
      return { success: false, error: "Kunne ikke slette kjøp" };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting holding:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

/**
 * Oppdater et kjøp
 */
export async function updateHolding(
  holdingId: string,
  updates: Partial<Holding>
): Promise<{ success: boolean; error?: string; holding?: Holding }> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("holdings")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", holdingId)
      .eq("user_id", session.userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating holding:", error);
      return { success: false, error: "Kunne ikke oppdatere kjøp" };
    }

    return { success: true, holding: data as Holding };
  } catch (error: any) {
    console.error("Error updating holding:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

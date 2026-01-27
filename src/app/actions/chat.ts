"use server";

import { getSession } from "./auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
}

export interface ChatReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

/**
 * Send en chat-melding
 */
export async function sendChatMessage(
  message: string
): Promise<{ success: boolean; error?: string; message?: ChatMessage }> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  if (!message || message.trim().length === 0) {
    return { success: false, error: "Melding kan ikke være tom" };
  }

  if (message.length > 1000) {
    return { success: false, error: "Melding kan ikke være lengre enn 1000 tegn" };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("chat_messages")
      .insert({
        user_id: session.userId,
        user_name: session.userName || "Ukjent",
        message: message.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending chat message:", error);
      return { success: false, error: "Kunne ikke sende melding" };
    }

    return {
      success: true,
      message: {
        id: data.id,
        userId: data.user_id,
        userName: data.user_name,
        message: data.message,
        createdAt: data.created_at,
      },
    };
  } catch (error: any) {
    console.error("Error sending chat message:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

/**
 * Hent siste chat-meldinger
 */
export async function getChatMessages(
  limit: number = 50
): Promise<{ success: boolean; messages?: ChatMessage[]; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching chat messages:", error);
      return { success: false, error: "Kunne ikke hente meldinger" };
    }

    const messages = (data || [])
      .reverse() // Reverser for å få eldste først
      .map((msg) => ({
        id: msg.id,
        userId: msg.user_id,
        userName: msg.user_name,
        message: msg.message,
        createdAt: msg.created_at,
      }));

    return { success: true, messages };
  } catch (error: any) {
    console.error("Error fetching chat messages:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

/**
 * Oppdater en chat-melding (kun egen melding)
 */
export async function updateChatMessage(
  messageId: string,
  newMessage: string
): Promise<{ success: boolean; error?: string; message?: ChatMessage }> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  if (!newMessage || newMessage.trim().length === 0) {
    return { success: false, error: "Melding kan ikke være tom" };
  }

  if (newMessage.length > 1000) {
    return { success: false, error: "Melding kan ikke være lengre enn 1000 tegn" };
  }

  try {
    // Sjekk om meldingen tilhører brukeren
    const { data: message, error: fetchError } = await supabaseAdmin
      .from("chat_messages")
      .select("user_id")
      .eq("id", messageId)
      .single();

    if (fetchError || !message) {
      return { success: false, error: "Melding ikke funnet" };
    }

    if (message.user_id !== session.userId) {
      return { success: false, error: "Du kan bare redigere dine egne meldinger" };
    }

    const { data, error: updateError } = await supabaseAdmin
      .from("chat_messages")
      .update({ message: newMessage.trim() })
      .eq("id", messageId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating chat message:", updateError);
      return { success: false, error: "Kunne ikke oppdatere melding" };
    }

    return {
      success: true,
      message: {
        id: data.id,
        userId: data.user_id,
        userName: data.user_name,
        message: data.message,
        createdAt: data.created_at,
      },
    };
  } catch (error: any) {
    console.error("Error updating chat message:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

/**
 * Slett en chat-melding (kun egen melding eller admin)
 */
export async function deleteChatMessage(
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  try {
    // Sjekk om meldingen tilhører brukeren eller om brukeren er admin
    const { data: message, error: fetchError } = await supabaseAdmin
      .from("chat_messages")
      .select("user_id")
      .eq("id", messageId)
      .single();

    if (fetchError || !message) {
      return { success: false, error: "Melding ikke funnet" };
    }

    // Sjekk om brukeren er admin
    const isAdmin = session.isAdmin || false;
    const isOwner = message.user_id === session.userId;

    if (!isAdmin && !isOwner) {
      return { success: false, error: "Du kan bare slette dine egne meldinger" };
    }

    const { error: deleteError } = await supabaseAdmin
      .from("chat_messages")
      .delete()
      .eq("id", messageId);

    if (deleteError) {
      console.error("Error deleting chat message:", deleteError);
      return { success: false, error: "Kunne ikke slette melding" };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting chat message:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

/**
 * Legg til eller fjern en emoji-reaksjon på en melding
 */
export async function toggleReaction(
  messageId: string,
  emoji: string
): Promise<{ success: boolean; error?: string; added?: boolean }> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  if (!emoji || emoji.length === 0) {
    return { success: false, error: "Emoji kan ikke være tom" };
  }

  try {
    // Sjekk om reaksjonen allerede eksisterer
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("chat_reactions")
      .select("id")
      .eq("message_id", messageId)
      .eq("user_id", session.userId)
      .eq("emoji", emoji)
      .single();

    if (existing) {
      // Fjern reaksjonen
      const { error: deleteError } = await supabaseAdmin
        .from("chat_reactions")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        console.error("Error removing reaction:", deleteError);
        return { success: false, error: "Kunne ikke fjerne reaksjon" };
      }

      return { success: true, added: false };
    } else {
      // Legg til reaksjonen
      const { error: insertError } = await supabaseAdmin
        .from("chat_reactions")
        .insert({
          message_id: messageId,
          user_id: session.userId,
          emoji: emoji,
        });

      if (insertError) {
        console.error("Error adding reaction:", insertError);
        return { success: false, error: "Kunne ikke legge til reaksjon" };
      }

      return { success: true, added: true };
    }
  } catch (error: any) {
    console.error("Error toggling reaction:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

/**
 * Hent alle reaksjoner for en liste med meldinger
 */
export async function getReactions(
  messageIds: string[]
): Promise<{ success: boolean; reactions?: Record<string, ChatReaction[]>; error?: string }> {
  try {
    if (messageIds.length === 0) {
      return { success: true, reactions: {} };
    }

    const { data, error } = await supabaseAdmin
      .from("chat_reactions")
      .select("*")
      .in("message_id", messageIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching reactions:", error);
      return { success: false, error: "Kunne ikke hente reaksjoner" };
    }

    // Grupper reaksjoner per melding
    const reactionsMap: Record<string, ChatReaction[]> = {};
    messageIds.forEach((id) => {
      reactionsMap[id] = [];
    });

    (data || []).forEach((reaction) => {
      if (!reactionsMap[reaction.message_id]) {
        reactionsMap[reaction.message_id] = [];
      }
      reactionsMap[reaction.message_id].push({
        id: reaction.id,
        messageId: reaction.message_id,
        userId: reaction.user_id,
        emoji: reaction.emoji,
        createdAt: reaction.created_at,
      });
    });

    return { success: true, reactions: reactionsMap };
  } catch (error: any) {
    console.error("Error fetching reactions:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

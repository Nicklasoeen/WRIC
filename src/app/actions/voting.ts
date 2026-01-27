"use server";

import { getSession } from "./auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { checkAndUnlockBadges } from "./badges";

const XP_PER_VOTE = 10;
const XP_PER_LEVEL = 100;

export interface Vote {
  id: string;
  title: string;
  description: string | null;
  weekStartDate: string;
  weekEndDate: string;
  maxVotesPerUser: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface VoteOption {
  id: string;
  voteId: string;
  optionName: string;
  description: string | null;
  createdAt: string;
}

export interface UserVote {
  id: string;
  voteId: string;
  userId: string;
  optionId: string;
  createdAt: string;
}

/**
 * Opprett en ny vote (kun admin)
 */
export async function createVote(
  title: string,
  description: string | null,
  weekStartDate: string,
  weekEndDate: string,
  maxVotesPerUser: number = 3,
  options: string[]
): Promise<{ success: boolean; voteId?: string; error?: string }> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  if (!session.isAdmin) {
    return { success: false, error: "Kun admin kan opprette votes" };
  }

  if (!title || title.trim().length === 0) {
    return { success: false, error: "Tittel er påkrevd" };
  }

  if (options.length < 2) {
    return { success: false, error: "Minst 2 alternativer er påkrevd" };
  }

  try {
    // Opprett vote
    const { data: vote, error: voteError } = await supabaseAdmin
      .from("votes")
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
        max_votes_per_user: maxVotesPerUser,
        is_active: true,
        created_by: session.userId,
      })
      .select()
      .single();

    if (voteError || !vote) {
      console.error("Error creating vote:", voteError);
      return { success: false, error: "Kunne ikke opprette vote" };
    }

    // Opprett vote-options
    const voteOptions = options.map((option) => ({
      vote_id: vote.id,
      option_name: option.trim(),
      description: null,
    }));

    const { error: optionsError } = await supabaseAdmin
      .from("vote_options")
      .insert(voteOptions);

    if (optionsError) {
      // Slett vote hvis options feilet
      await supabaseAdmin.from("votes").delete().eq("id", vote.id);
      console.error("Error creating vote options:", optionsError);
      return { success: false, error: "Kunne ikke opprette vote-alternativer" };
    }

    return { success: true, voteId: vote.id };
  } catch (error: any) {
    console.error("Error creating vote:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

/**
 * Hent aktiv vote for denne uken
 */
export async function getActiveVote(): Promise<{
  success: boolean;
  vote?: Vote & { options: VoteOption[] };
  error?: string;
}> {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { data: votes, error } = await supabaseAdmin
      .from("votes")
      .select("*")
      .eq("is_active", true)
      .lte("week_start_date", today)
      .gte("week_end_date", today)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error fetching active vote:", error);
      return { success: false, error: "Kunne ikke hente aktiv vote" };
    }

    if (!votes || votes.length === 0) {
      return { success: true };
    }

    const vote = votes[0];

    // Hent options
    const { data: options, error: optionsError } = await supabaseAdmin
      .from("vote_options")
      .select("*")
      .eq("vote_id", vote.id)
      .order("created_at", { ascending: true });

    if (optionsError) {
      console.error("Error fetching vote options:", optionsError);
      return { success: false, error: "Kunne ikke hente vote-alternativer" };
    }

    return {
      success: true,
      vote: {
        id: vote.id,
        title: vote.title,
        description: vote.description,
        weekStartDate: vote.week_start_date,
        weekEndDate: vote.week_end_date,
        maxVotesPerUser: vote.max_votes_per_user,
        isActive: vote.is_active,
        createdBy: vote.created_by,
        createdAt: vote.created_at,
        options: (options || []).map((opt) => ({
          id: opt.id,
          voteId: opt.vote_id,
          optionName: opt.option_name,
          description: opt.description,
          createdAt: opt.created_at,
        })),
      },
    };
  } catch (error: any) {
    console.error("Error fetching active vote:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

/**
 * Hent brukerens stemmer for en vote (med antall per option)
 */
export async function getUserVotes(
  voteId: string
): Promise<{
  success: boolean;
  votes?: Record<string, number>;
  totalVotes?: number;
  error?: string;
}> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("user_votes")
      .select("option_id")
      .eq("vote_id", voteId)
      .eq("user_id", session.userId);

    if (error) {
      console.error("Error fetching user votes:", error);
      return { success: false, error: "Kunne ikke hente stemmer" };
    }

    // Grupper stemmer per option
    const voteCounts: Record<string, number> = {};
    (data || []).forEach((v) => {
      voteCounts[v.option_id] = (voteCounts[v.option_id] || 0) + 1;
    });

    return {
      success: true,
      votes: voteCounts,
      totalVotes: (data || []).length,
    };
  } catch (error: any) {
    console.error("Error fetching user votes:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

/**
 * Stem på en option (gir 10 XP per stemme)
 */
export async function castVote(
  voteId: string,
  optionId: string
): Promise<{ success: boolean; error?: string; xpEarned?: number }> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.userId) {
    return { success: false, error: "Ikke autentisert" };
  }

  try {
    // Sjekk om vote er aktiv
    const { data: vote, error: voteError } = await supabaseAdmin
      .from("votes")
      .select("*")
      .eq("id", voteId)
      .eq("is_active", true)
      .single();

    if (voteError || !vote) {
      return { success: false, error: "Vote ikke funnet eller ikke aktiv" };
    }

    // Sjekk hvor mange stemmer brukeren allerede har
    const { data: userVotes, error: countError } = await supabaseAdmin
      .from("user_votes")
      .select("id")
      .eq("vote_id", voteId)
      .eq("user_id", session.userId);

    if (countError) {
      console.error("Error counting user votes:", countError);
      return { success: false, error: "Kunne ikke sjekke antall stemmer" };
    }

    const currentVoteCount = (userVotes || []).length;

    if (currentVoteCount >= vote.max_votes_per_user) {
      return {
        success: false,
        error: `Du har allerede brukt alle dine ${vote.max_votes_per_user} stemmer`,
      };
    }

    // Legg til stemme
    const { error: insertError } = await supabaseAdmin
      .from("user_votes")
      .insert({
        vote_id: voteId,
        user_id: session.userId,
        option_id: optionId,
      });

    if (insertError) {
      console.error("Error casting vote:", insertError);
      return { success: false, error: "Kunne ikke stemme" };
    }

    // Gi brukeren 10 XP
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("xp, level")
      .eq("id", session.userId)
      .single();

    if (userError || !user) {
      console.error("Error fetching user:", userError);
      // Stemmen er allerede lagt til, så vi returnerer success
      return { success: true, xpEarned: XP_PER_VOTE };
    }

    const currentXp = user.xp || 0;
    const newXp = currentXp + XP_PER_VOTE;
    const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;

    // Oppdater XP og level
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        xp: newXp,
        level: newLevel,
      })
      .eq("id", session.userId);

    if (updateError) {
      console.error("Error updating XP:", updateError);
      // Stemmen er allerede lagt til, så vi returnerer success
      return { success: true, xpEarned: XP_PER_VOTE };
    }

    // Sjekk om brukeren skal få nye badges
    await checkAndUnlockBadges().catch((err) => {
      console.error("Error checking badges:", err);
    });

    return { success: true, xpEarned: XP_PER_VOTE };
  } catch (error: any) {
    console.error("Error casting vote:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

/**
 * Hent resultater for en vote
 */
export async function getVoteResults(
  voteId: string
): Promise<{
  success: boolean;
  results?: Array<{ optionId: string; optionName: string; voteCount: number }>;
  error?: string;
}> {
  try {
    // Hent alle options for denne vote
    const { data: options, error: optionsError } = await supabaseAdmin
      .from("vote_options")
      .select("id, option_name")
      .eq("vote_id", voteId);

    if (optionsError) {
      console.error("Error fetching vote options:", optionsError);
      return { success: false, error: "Kunne ikke hente vote-alternativer" };
    }

    // Hent alle stemmer for denne vote
    const { data: votes, error: votesError } = await supabaseAdmin
      .from("user_votes")
      .select("option_id")
      .eq("vote_id", voteId);

    if (votesError) {
      console.error("Error fetching vote results:", votesError);
      return { success: false, error: "Kunne ikke hente resultater" };
    }

    // Grupper og tell stemmer
    const voteCounts: Record<string, number> = {};
    (votes || []).forEach((vote) => {
      voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1;
    });

    // Opprett resultater med alle options (også de uten stemmer)
    const results = (options || []).map((option) => ({
      optionId: option.id,
      optionName: option.option_name,
      voteCount: voteCounts[option.id] || 0,
    }));

    // Sorter etter antall stemmer (høyest først)
    results.sort((a, b) => b.voteCount - a.voteCount);

    return { success: true, results };
  } catch (error: any) {
    console.error("Error fetching vote results:", error);
    return { success: false, error: error.message || "En uventet feil oppstod" };
  }
}

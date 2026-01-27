import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/actions/auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { ensureMemberBadge } from "@/app/actions/badges";

/**
 * API Route for å hente brukerens høyeste badge
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.isAuthenticated || !session.userId) {
      return NextResponse.json({ success: false, error: "Ikke autentisert" }, { status: 401 });
    }

    // Sikre at brukeren har Member badge først
    await ensureMemberBadge().catch(() => {
      // Ignorer feil - fortsett uansett
    });

    // Hent brukerens høyeste badge (høyest level)
    const { data: userBadges, error } = await supabaseAdmin
      .from("user_badges")
      .select(
        `
        badge_id,
        badges (
          id,
          name,
          icon,
          color,
          level_required
        )
      `
      )
      .eq("user_id", session.userId)
      .order("badges(level_required)", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching user badge:", error);
      // Returner default badge ved feil
      return NextResponse.json({
        success: true,
        data: {
          icon: "fa:FaUser",
          color: "gray",
          name: "Member",
        },
      });
    }

    if (!userBadges || !userBadges.badges) {
      // Returner default badge hvis ingen badge er unlocket
      return NextResponse.json({
        success: true,
        data: {
          icon: "fa:FaHammer",
          color: "brown",
          name: "Slave worker",
        },
      });
    }

    // Supabase returnerer badges som array, så vi må håndtere det
    const badge = Array.isArray(userBadges.badges) 
      ? userBadges.badges[0] 
      : userBadges.badges;

    return NextResponse.json({
      success: true,
      data: {
        icon: badge?.icon || "fa:FaHammer",
        color: badge?.color || "brown",
        name: badge?.name || "Slave worker",
      },
    });
  } catch (error) {
    console.error("Error in user-badge API route:", error);
    // Returner default badge ved feil
    return NextResponse.json({
      success: true,
      data: {
        icon: "fa:FaHammer",
        color: "brown",
        name: "Slave worker",
      },
    });
  }
}

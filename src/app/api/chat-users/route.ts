import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

/**
 * API Route for å hente brukeres badges for chat-visning
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userIds = searchParams.get("userIds")?.split(",") || [];

    if (userIds.length === 0) {
      return NextResponse.json({ success: true, data: {} });
    }

    // Hent høyeste badge for hver bruker
    const { data: userBadges, error } = await supabaseAdmin
      .from("user_badges")
      .select(
        `
        user_id,
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
      .in("user_id", userIds);

    if (error) {
      console.error("Error fetching user badges:", error);
      return NextResponse.json(
        { success: false, error: "Kunne ikke hente badges" },
        { status: 500 }
      );
    }

    // Grupper per bruker og finn høyeste badge
    const badgeMap: Record<string, { icon: string; color: string; name: string }> = {};

    // Sett default badge for alle brukere
    userIds.forEach((userId) => {
      badgeMap[userId] = {
        icon: "fa:FaHammer",
        color: "brown",
        name: "Slave worker",
      };
    });

    // Oppdater med faktiske badges (høyeste level først)
    if (userBadges) {
      const userBadgeMap = new Map<string, any>();

      userBadges.forEach((ub: any) => {
        if (!ub.badges) return;

        const existing = userBadgeMap.get(ub.user_id);
        if (
          !existing ||
          (ub.badges.level_required || 0) > (existing.badges?.level_required || 0)
        ) {
          userBadgeMap.set(ub.user_id, ub);
        }
      });

      userBadgeMap.forEach((ub, userId) => {
        if (ub.badges) {
          badgeMap[userId] = {
            icon: ub.badges.icon || "fa:FaHammer",
            color: ub.badges.color || "brown",
            name: ub.badges.name || "Slave worker",
          };
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: badgeMap,
    });
  } catch (error) {
    console.error("Error in chat-users API route:", error);
    return NextResponse.json(
      { success: false, error: "Kunne ikke hente badges" },
      { status: 500 }
    );
  }
}

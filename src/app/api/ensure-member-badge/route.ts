import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/actions/auth";
import { supabaseAdmin } from "@/lib/supabase-server";

/**
 * API Route for å sikre at alle brukere har Member badge
 * Kjør denne en gang for å unlocke Member badge for alle eksisterende brukere
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.isAuthenticated || !session.userId) {
      return NextResponse.json({ success: false, error: "Ikke autentisert" }, { status: 401 });
    }

    // Sjekk om brukeren er admin
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", session.userId)
      .single();

    if (userError || !user?.is_admin) {
      return NextResponse.json({ success: false, error: "Kun admin kan kjøre dette" }, { status: 403 });
    }

    // Hent Slave worker badge ID (level 1)
    const { data: memberBadge, error: badgeError } = await supabaseAdmin
      .from("badges")
      .select("id")
      .eq("level_required", 1)
      .order("level_required", { ascending: true })
      .limit(1)
      .single();

    if (badgeError || !memberBadge) {
      return NextResponse.json(
        { success: false, error: "Slave worker badge ikke funnet. Kjør badges-schema.sql først." },
        { status: 404 }
      );
    }

    // Hent alle brukere som ikke har Member badge
    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id")
      .is("is_active", true);

    if (usersError) {
      return NextResponse.json(
        { success: false, error: "Kunne ikke hente brukere" },
        { status: 500 }
      );
    }

    // Hent alle brukere som allerede har Slave worker badge
    const { data: existingBadges, error: existingError } = await supabaseAdmin
      .from("user_badges")
      .select("user_id")
      .eq("badge_id", memberBadge.id);

    if (existingError) {
      return NextResponse.json(
        { success: false, error: "Kunne ikke sjekke eksisterende badges" },
        { status: 500 }
      );
    }

    const existingUserIds = new Set((existingBadges || []).map((b: any) => b.user_id));

    // Unlock Slave worker badge for alle brukere som ikke har den
    const usersToUnlock = (users || []).filter((u: any) => !existingUserIds.has(u.id));

    if (usersToUnlock.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Alle brukere har allerede Slave worker badge",
      });
    }

    const unlockData = usersToUnlock.map((u: any) => ({
      user_id: u.id,
      badge_id: memberBadge.id,
    }));

    const { error: unlockError } = await supabaseAdmin
      .from("user_badges")
      .insert(unlockData);

    if (unlockError) {
      console.error("Error unlocking badges:", unlockError);
      return NextResponse.json(
        { success: false, error: "Kunne ikke unlocke badges" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Unlocket Slave worker badge for ${usersToUnlock.length} brukere`,
    });
  } catch (error) {
    console.error("Error in ensure-member-badge API route:", error);
    return NextResponse.json(
      { success: false, error: "Kunne ikke sikre Member badge" },
      { status: 500 }
    );
  }
}

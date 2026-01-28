import { NextRequest, NextResponse } from "next/server";
import { getPvpNotifications } from "@/app/actions/pvp";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lastCheckedId = searchParams.get("lastCheckedId") || undefined;

    const result = await getPvpNotifications(lastCheckedId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Kunne ikke hente notifikasjoner" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notifications: result.notifications || [],
    });
  } catch (error) {
    console.error("Error in PvP notifications route:", error);
    return NextResponse.json(
      { error: "Kunne ikke hente notifikasjoner" },
      { status: 500 }
    );
  }
}

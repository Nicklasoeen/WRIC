/**
 * API Route for Chat Messages
 * 
 * Henter chat-meldinger
 */

import { NextRequest, NextResponse } from "next/server";
import { getChatMessages } from "@/app/actions/chat";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const result = await getChatMessages(limit);

    if (result.success && result.messages) {
      return NextResponse.json({
        success: true,
        data: result.messages,
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Kunne ikke hente meldinger" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in Chat API route:", error);
    return NextResponse.json(
      { error: "Kunne ikke hente chat-meldinger" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { toggleReaction, getReactions } from "@/app/actions/chat";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, emoji } = body;

    if (!messageId || !emoji) {
      return NextResponse.json(
        { success: false, error: "messageId og emoji er påkrevd" },
        { status: 400 }
      );
    }

    const result = await toggleReaction(messageId, emoji);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: result.error || "Kunne ikke håndtere reaksjon" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in reactions API route:", error);
    return NextResponse.json(
      { error: "Kunne ikke håndtere reaksjon" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const messageIds = searchParams.get("messageIds")?.split(",") || [];

    const result = await getReactions(messageIds);

    if (result.success && result.reactions) {
      return NextResponse.json({
        success: true,
        data: result.reactions,
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Kunne ikke hente reaksjoner" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in reactions API route:", error);
    return NextResponse.json(
      { error: "Kunne ikke hente reaksjoner" },
      { status: 500 }
    );
  }
}

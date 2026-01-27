/**
 * API Route for Ticker Search
 * 
 * Søker etter aksjer og fond
 */

import { NextRequest, NextResponse } from "next/server";
import { searchTicker } from "@/lib/price-service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Søkeord må være minst 2 tegn" },
        { status: 400 }
      );
    }

    const results = await searchTicker(query);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error in Search API route:", error);
    return NextResponse.json(
      { error: "Kunne ikke søke" },
      { status: 500 }
    );
  }
}

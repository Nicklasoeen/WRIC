/**
 * API Route for Price Data
 * 
 * Henter prisdata for en spesifikk ticker
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentPrice, getHistoricalPrices } from "@/lib/price-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const searchParams = request.nextUrl.searchParams;
    const historical = searchParams.get("historical") === "true";
    const days = parseInt(searchParams.get("days") || "30", 10);

    if (historical) {
      const historicalData = await getHistoricalPrices(ticker, days);
      return NextResponse.json({
        success: true,
        data: historicalData,
      });
    }

    const priceData = await getCurrentPrice(ticker);

    if (!priceData) {
      return NextResponse.json(
        { error: `Kunne ikke hente pris for ${ticker}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: priceData,
    });
  } catch (error) {
    console.error("Error in Price API route:", error);
    return NextResponse.json(
      { error: "Kunne ikke hente prisdata" },
      { status: 500 }
    );
  }
}

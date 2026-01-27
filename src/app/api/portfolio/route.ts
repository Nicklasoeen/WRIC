/**
 * API Route for Portfolio Data
 * 
 * Henter porteføljedata basert på brukerens manuelt registrerte kjøp
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/actions/auth";
import { getHoldings } from "@/app/actions/portfolio";
import { getCurrentPrice } from "@/lib/price-service";
import { supabaseAdmin } from "@/lib/supabase-server";

export interface PortfolioData {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  todayChange: number;
  todayChangePercent: number;
  positions: number;
  holdings: Array<{
    id: string;
    ticker: string;
    name: string;
    quantity: number;
    purchase_price: number;
    purchase_date: string;
    current_price?: number;
    current_value?: number;
    gain_loss?: number;
    gain_loss_percent?: number;
    today_change?: number;
    today_change_percent?: number;
  }>;
  lastUpdated: string;
}

export async function GET(request: NextRequest) {
  try {
    // Verifiser autentisering
    const session = await getSession();
    if (!session.isAuthenticated || !session.userId) {
      return NextResponse.json(
        { error: "Ikke autentisert" },
        { status: 401 }
      );
    }

    // Hent alle kjøp
    const holdingsResult = await getHoldings();
    if (!holdingsResult.success || !holdingsResult.holdings) {
      return NextResponse.json(
        { error: holdingsResult.error || "Kunne ikke hente kjøp" },
        { status: 500 }
      );
    }

    const holdings = holdingsResult.holdings;

    // Hent nåværende priser for alle tickers
    const holdingsWithPrices = await Promise.all(
      holdings.map(async (holding) => {
        const priceData = await getCurrentPrice(holding.ticker);

        if (!priceData) {
          return {
            ...holding,
            current_price: undefined,
            current_value: undefined,
            gain_loss: undefined,
            gain_loss_percent: undefined,
            today_change: undefined,
            today_change_percent: undefined,
          };
        }

        const currentPrice = priceData.price;
        const currentValue = holding.quantity * currentPrice;
        const cost = holding.quantity * holding.purchase_price;
        const gainLoss = currentValue - cost;
        const gainLossPercent = cost > 0 ? (gainLoss / cost) * 100 : 0;

        // Dagens endring
        const todayChange = priceData.changeAmount
          ? holding.quantity * priceData.changeAmount
          : undefined;
        const todayChangePercent = priceData.changePercent;

        return {
          ...holding,
          current_price: currentPrice,
          current_value: currentValue,
          gain_loss: gainLoss,
          gain_loss_percent: gainLossPercent,
          today_change: todayChange,
          today_change_percent: todayChangePercent,
        };
      })
    );

    // Beregn totaler
    const totalCost = holdings.reduce(
      (sum, h) => sum + h.quantity * h.purchase_price,
      0
    );
    const totalValue = holdingsWithPrices.reduce(
      (sum, h) => sum + (h.current_value || 0),
      0
    );
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    // Dagens endring (sum av alle holdings)
    const todayChange = holdingsWithPrices.reduce(
      (sum, h) => sum + (h.today_change || 0),
      0
    );
    const todayChangePercent =
      totalValue > 0 ? (todayChange / (totalValue - todayChange)) * 100 : 0;

    const portfolioData: PortfolioData = {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      todayChange,
      todayChangePercent,
      positions: holdings.length,
      holdings: holdingsWithPrices,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: portfolioData,
    });
  } catch (error) {
    console.error("Error in Portfolio API route:", error);
    return NextResponse.json(
      { error: "Kunne ikke hente porteføljedata" },
      { status: 500 }
    );
  }
}

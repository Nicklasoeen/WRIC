/**
 * Price Service
 * 
 * Henter prisdata fra offentlige APIer (Yahoo Finance via yahoo-finance2)
 */

// Dynamisk import for å unngå bundling-problemer med test-filer
let yahooFinance: any = null;

async function getYahooFinance() {
  if (!yahooFinance) {
    const yfModule = await import("yahoo-finance2");
    yahooFinance = yfModule.default || yfModule;
  }
  return yahooFinance;
}

import { supabaseAdmin } from "./supabase-server";

export interface PriceData {
  price: number;
  currency: string;
  changePercent?: number;
  changeAmount?: number;
  volume?: number;
  lastUpdated: Date;
}

export interface HistoricalPrice {
  date: Date;
  price: number;
  volume?: number;
}

const CACHE_DURATION_MINUTES = 5;

/**
 * Hent nåværende pris for en ticker
 */
export async function getCurrentPrice(ticker: string): Promise<PriceData | null> {
  try {
    // Sjekk cache først
    const { data: cached } = await supabaseAdmin
      .from("price_cache")
      .select("*")
      .eq("ticker", ticker.toUpperCase())
      .single();

    if (
      cached &&
      new Date(cached.last_updated) >
        new Date(Date.now() - CACHE_DURATION_MINUTES * 60 * 1000)
    ) {
      return {
        price: parseFloat(cached.price),
        currency: cached.currency || "NOK",
        changePercent: cached.change_percent ? parseFloat(cached.change_percent) : undefined,
        changeAmount: cached.change_amount ? parseFloat(cached.change_amount) : undefined,
        lastUpdated: new Date(cached.last_updated),
      };
    }

    // Hent fra Yahoo Finance
    // For norske aksjer, legg til .OL suffix hvis ikke allerede der
    const searchTicker = ticker.includes(".") ? ticker : `${ticker}.OL`;
    const yf = await getYahooFinance();

    const quote = await yf.quote(searchTicker);

    if (!quote || !quote.regularMarketPrice) {
      // Prøv uten .OL hvis det feiler
      const quote2 = await yf.quote(ticker);
      if (!quote2 || !quote2.regularMarketPrice) {
        return null;
      }
      return await cachePrice(ticker, quote2);
    }

    return await cachePrice(ticker, quote);
  } catch (error: any) {
    console.error(`Error fetching price for ${ticker}:`, error);
    // Hvis cache finnes, returner den selv om den er gammel
    const { data: cached } = await supabaseAdmin
      .from("price_cache")
      .select("*")
      .eq("ticker", ticker.toUpperCase())
      .single();

    if (cached) {
      return {
        price: parseFloat(cached.price),
        currency: cached.currency || "NOK",
        changePercent: cached.change_percent ? parseFloat(cached.change_percent) : undefined,
        changeAmount: cached.change_amount ? parseFloat(cached.change_amount) : undefined,
        lastUpdated: new Date(cached.last_updated),
      };
    }

    return null;
  }
}

/**
 * Cache prisdata i database
 */
async function cachePrice(ticker: string, quote: any): Promise<PriceData> {
  const price = quote.regularMarketPrice || quote.price || 0;
  const currency = quote.currency || "NOK";
  const changePercent =
    quote.regularMarketChangePercent || quote.changePercent || undefined;
  const changeAmount =
    quote.regularMarketChange || quote.change || undefined;

  // Lagre i cache
  await supabaseAdmin.from("price_cache").upsert(
    {
      ticker: ticker.toUpperCase(),
      price: price.toString(),
      currency,
      change_percent: changePercent?.toString(),
      change_amount: changeAmount?.toString(),
      last_updated: new Date().toISOString(),
    },
    {
      onConflict: "ticker",
    }
  );

  return {
    price,
    currency,
    changePercent,
    changeAmount,
    lastUpdated: new Date(),
  };
}

/**
 * Hent historisk prisdata for en ticker (siste 30 dager)
 */
export async function getHistoricalPrices(
  ticker: string,
  days: number = 30
): Promise<HistoricalPrice[]> {
  try {
    const searchTicker = ticker.includes(".") ? ticker : `${ticker}.OL`;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const yf = await getYahooFinance();

    const result = await yf.historical(searchTicker, {
      period1: Math.floor(startDate.getTime() / 1000),
      period2: Math.floor(endDate.getTime() / 1000),
      interval: "1d",
    });

    if (!result || result.length === 0) {
      // Prøv uten .OL
      const result2 = await yf.historical(ticker, {
        period1: Math.floor(startDate.getTime() / 1000),
        period2: Math.floor(endDate.getTime() / 1000),
        interval: "1d",
      });
      return (result2 || []).map((d: any) => ({
        date: new Date(d.date),
        price: d.close || d.price || 0,
        volume: d.volume,
      }));
    }

    return result.map((d: any) => ({
      date: new Date(d.date),
      price: d.close || d.price || 0,
      volume: d.volume,
    }));
  } catch (error: any) {
    console.error(`Error fetching historical prices for ${ticker}:`, error);
    return [];
  }
}

/**
 * Søk etter ticker eller navn
 */
export async function searchTicker(query: string): Promise<
  Array<{
    symbol: string;
    name: string;
    exchange?: string;
    type?: string;
  }>
> {
  try {
    const yf = await getYahooFinance();
    const cleanQuery = query.trim().toUpperCase();
    
    // Hvis query ser ut som en ticker (f.eks. "EQNR" eller "EQNR.OL"), hent quote direkte
    if (/^[A-Z]{1,10}(\.[A-Z]+)?$/i.test(cleanQuery)) {
      try {
        // Prøv med .OL for norske aksjer hvis ikke allerede spesifisert
        const ticker = cleanQuery.includes('.') ? cleanQuery : `${cleanQuery}.OL`;
        const quote = await yf.quote(ticker);
        if (quote) {
          return [{
            symbol: quote.symbol || cleanQuery,
            name: quote.longName || quote.shortName || cleanQuery,
            exchange: quote.exchange,
            type: quote.quoteType,
          }];
        }
      } catch {
        // Prøv uten .OL
        try {
          const quote = await yf.quote(cleanQuery);
          if (quote) {
            return [{
              symbol: quote.symbol || cleanQuery,
              name: quote.longName || quote.shortName || cleanQuery,
              exchange: quote.exchange,
              type: quote.quoteType,
            }];
          }
        } catch {
          // Hvis quote feiler, returner ticker uten navn
          return [{
            symbol: cleanQuery,
            name: cleanQuery,
            exchange: undefined,
            type: 'EQUITY',
          }];
        }
      }
    }
    
    // Hvis query ikke ser ut som en ticker, returner tom array
    // (Brukeren må skrive inn ticker direkte, ikke søke på navn)
    return [];
  } catch (error: any) {
    console.error("Error searching ticker:", error);
    // Fallback: returner ticker hvis det ser ut som en ticker
    const cleanQuery = query.trim().toUpperCase();
    if (/^[A-Z]{1,10}(\.[A-Z]+)?$/i.test(cleanQuery)) {
      return [{
        symbol: cleanQuery,
        name: cleanQuery,
        exchange: undefined,
        type: 'EQUITY',
      }];
    }
    return [];
  }
}

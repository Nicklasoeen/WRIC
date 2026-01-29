/**
 * Nordnet Service
 * 
 * Håndterer session-basert autentisering (BankID) og henter porteføljedata.
 * All logikk kjøres server-side - ingen sensitive data går til frontend.
 */

const NORDNET_BASE_URL = "https://www.nordnet.no";

interface NordnetSession {
  cookies: string; // Cookie string for å opprettholde session
  expiresAt: Date;
}

interface NordnetPortfolio {
  totalValue: number;
  todayChange: number;
  todayChangePercent: number;
  positions: number;
  lastUpdated: Date;
}

/**
 * Henter porteføljedata fra Nordnet ved å bruke en eksisterende session
 * Dette simulerer requests som Nordnet webapp gjør
 */
export async function getNordnetPortfolio(
  session: NordnetSession
): Promise<NordnetPortfolio> {
  try {
    // Hent portefølje-data fra Nordnet API
    // Dette er en forenklet versjon - i produksjon må vi reverse-engineere
    // Nordnet sin faktiske API-struktur
    
    const response = await fetch(`${NORDNET_BASE_URL}/api/2/accounts`, {
      method: "GET",
      headers: {
        Cookie: session.cookies,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": `${NORDNET_BASE_URL}/`,
      },
    });

    if (!response.ok) {
      // Hvis session er utløpt, må vi re-autentisere
      if (response.status === 401 || response.status === 403) {
        throw new Error("Session utløpt - må logge inn på nytt");
      }
      throw new Error(`Failed to fetch portfolio: ${response.statusText}`);
    }

    const accounts = await response.json();

    // Beregn total verdi og endringer
    let totalValue = 0;
    let totalTodayChange = 0;
    let positions = 0;

    for (const account of accounts || []) {
      // Hent posisjoner for hver konto
      const positionsResponse = await fetch(
        `${NORDNET_BASE_URL}/api/2/accounts/${account.accid}/positions`,
        {
          method: "GET",
          headers: {
            Cookie: session.cookies,
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept": "application/json",
          },
        }
      );

      if (positionsResponse.ok) {
        const accountPositions = await positionsResponse.json();
        positions += accountPositions.length || 0;

        // Beregn verdi og endringer
        for (const pos of accountPositions || []) {
          const marketValue = pos.market_value || pos.value || 0;
          const cost = pos.cost || 0;
          totalValue += marketValue;
          totalTodayChange += marketValue - cost;
        }
      }
    }

    const todayChangePercent =
      totalValue > 0 ? (totalTodayChange / (totalValue - totalTodayChange)) * 100 : 0;

    return {
      totalValue,
      todayChange: totalTodayChange,
      todayChangePercent,
      positions,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error("Error fetching Nordnet portfolio:", error);
    throw error;
  }
}

/**
 * Validerer om en session fortsatt er gyldig
 */
export async function validateSession(session: NordnetSession): Promise<boolean> {
  if (new Date() > session.expiresAt) {
    return false;
  }

  try {
    // Test session ved å hente brukerinfo
    const response = await fetch(`${NORDNET_BASE_URL}/api/2/user`, {
      method: "GET",
      headers: {
        Cookie: session.cookies,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

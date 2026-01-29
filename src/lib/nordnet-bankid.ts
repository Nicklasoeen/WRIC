/**
 * Nordnet BankID Login Helper
 * 
 * Implementerer BankID-login med Puppeteer for å hente Nordnet session cookies.
 */

// Dynamisk import for å unngå bundling-problemer med Next.js
type PuppeteerBrowser = Awaited<ReturnType<typeof import("puppeteer").default.launch>>;
type PuppeteerPage = Awaited<ReturnType<PuppeteerBrowser["newPage"]>>;

const NORDNET_LOGIN_URL = "https://www.nordnet.no/login";
const LOGIN_TIMEOUT = 300000; // 5 minutter for BankID-autentisering

/**
 * BankID-login med Puppeteer
 * 
 * Starter en headless browser, navigerer til Nordnet login,
 * starter BankID-flow og venter på at brukeren fullfører autentisering.
 */
export async function loginWithBankID(): Promise<{
  success: boolean;
  cookies?: string;
  expiresAt?: Date;
  error?: string;
}> {
  let browser: PuppeteerBrowser | null = null;

  try {
    // Dynamisk import av Puppeteer for å unngå bundling-problemer
    const puppeteer = await import("puppeteer");

    // Start browser (headless: false for å se hva som skjer, true for produksjon)
    browser = await puppeteer.default.launch({
      headless: process.env.NODE_ENV === "production",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const page = await browser.newPage();

    // Sett viewport og user agent
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Naviger til Nordnet login
    console.log("Navigerer til Nordnet login...");
    await page.goto(NORDNET_LOGIN_URL, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Vent på at login-siden er lastet
    await page.waitForSelector('button, [data-testid*="bankid"], [data-testid*="login"]', {
      timeout: 10000,
    });

    // Prøv å finne og klikke BankID-login knapp
    // Nordnet kan ha forskjellige selektorer - prøv flere alternativer
    const bankIdSelectors = [
      'button[data-testid*="bankid"]',
      'button:has-text("BankID")',
      'a[href*="bankid"]',
      'button[aria-label*="BankID"]',
      '[data-testid="login-bankid"]',
    ];

    let bankIdButton = null;
    for (const selector of bankIdSelectors) {
      try {
        bankIdButton = await page.$(selector);
        if (bankIdButton) {
          console.log(`Fant BankID-knapp med selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Fortsett til neste selector
      }
    }

    if (!bankIdButton) {
      // Hvis vi ikke finner knappen, prøv å finne alle knapper og logg dem
      const allButtons = await page.$$("button");
      console.log(`Fant ${allButtons.length} knapper på siden`);
      
      // Prøv å finne en knapp med tekst som inneholder "BankID" eller "Logg inn"
      const buttonTexts = await Promise.all(
        allButtons.map(async (btn) => {
          const text = await page.evaluate((el) => el.textContent, btn);
          return text;
        })
      );

      console.log("Knapper funnet:", buttonTexts);

      // Prøv å klikke første knapp som kan være login
      if (allButtons.length > 0) {
        bankIdButton = allButtons[0];
        console.log("Bruker første knapp som fallback");
      }
    }

    if (!bankIdButton) {
      throw new Error(
        "Kunne ikke finne BankID-login knapp. Sjekk at Nordnet login-siden har endret struktur."
      );
    }

    // Klikk BankID-login
    console.log("Klikker BankID-login...");
    await bankIdButton.click();

    // Vent på BankID-autentisering
    // Dette kan være QR-kode eller mobil-app flow
    console.log("Venter på BankID-autentisering...");
    console.log("Vennligst fullfør BankID-autentisering i nettleseren...");

    // Vent på at vi er logget inn (sjekk URL-endring eller spesifikke elementer)
    try {
      // Vent på redirect til dashboard eller at vi ser brukerinfo
      // Vi prøver flere strategier parallelt
      const loginPromise = Promise.race([
        // Strategi 1: Vent på navigasjon
        page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: LOGIN_TIMEOUT }).catch(() => null),
        // Strategi 2: Vent på bruker-elementer
        page.waitForSelector('[data-testid*="user"], [data-testid*="account"], .user-menu, .account-menu, [class*="user"], [class*="account"]', {
          timeout: LOGIN_TIMEOUT,
        }).catch(() => null),
        // Strategi 3: Vent på at URL endres fra /login
        page.waitForFunction(
          '!window.location.href.includes("/login")',
          { timeout: LOGIN_TIMEOUT }
        ).catch(() => null),
      ]);

      await loginPromise;

      // Vent litt ekstra for å sikre at cookies er satt
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Sjekk om vi faktisk er logget inn
      const currentUrl = page.url();
      console.log(`Nåværende URL etter login: ${currentUrl}`);
      
      if (currentUrl.includes("/login") && !currentUrl.includes("/dashboard")) {
        // Hvis vi fortsatt er på login, kan det være at autentisering ikke fullførte
        // Men la oss sjekke om vi har cookies uansett
        const testCookies = await page.cookies();
        if (testCookies.length === 0) {
          throw new Error("Fortsatt på login-siden og ingen cookies funnet. BankID-autentisering kan ha feilet.");
        }
        console.log("Advarsel: Fortsatt på login-siden, men cookies funnet. Fortsetter...");
      }

      console.log("BankID-autentisering fullført!");
    } catch (error: any) {
      if (error.message && error.message.includes("timeout")) {
        throw new Error(
          "Timeout: BankID-autentisering tok for lang tid (5 minutter). Prøv igjen."
        );
      }
      throw error;
    }

    // Hent alle cookies
    const cookies = await page.cookies();
    const cookieString = cookiesToString(cookies);

    // Estimer utløpstid (typisk 24 timer for Nordnet sessions)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    console.log(`Hentet ${cookies.length} cookies. Session utløper: ${expiresAt}`);

    return {
      success: true,
      cookies: cookieString,
      expiresAt,
    };
  } catch (error: any) {
    console.error("Error in BankID login:", error);
    return {
      success: false,
      error: error.message || "Kunne ikke logge inn med BankID",
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Hjelpefunksjon: Konverterer Puppeteer cookies til cookie string
 */
export function cookiesToString(cookies: Array<{ name: string; value: string }>): string {
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

/**
 * Eksempel: Full BankID-login flow
 * 
 * Dette kan kalles fra en API route eller server action
 */
export async function completeNordnetLogin(): Promise<{
  success: boolean;
  error?: string;
}> {
  const loginResult = await loginWithBankID();

  if (!loginResult.success || !loginResult.cookies || !loginResult.expiresAt) {
    return {
      success: false,
      error: loginResult.error || "Kunne ikke logge inn",
    };
  }

  // Lagre session
  const saveResult = await saveNordnetSession(
    loginResult.cookies,
    loginResult.expiresAt
  );

  return saveResult;
}

# Portfolio Track & Follow Setup Guide

## Oversikt

Portefølje-widgeten er bygget om fra en Nordnet-automatisk-henting løsning til en **track-and-follow** løsning hvor brukere manuelt registrerer sine kjøp og følger porteføljen med offentlig tilgjengelige prisdata.

## Arkitektur

```
Frontend (Widget)
    ↓
API Route (/api/portfolio)
    ↓
Portfolio Service (server actions)
    ↓
Price Service (Yahoo Finance API)
    ↓
Database (holdings, price_cache)
```

## Installasjon

1. **Installer avhengigheter:**
   ```bash
   npm install
   ```

2. **Sett opp database:**
   Kjør SQL-scriptet `portfolio-schema.sql` i Supabase SQL Editor:
   ```sql
   -- Se portfolio-schema.sql for fullt schema
   ```

3. **Miljøvariabler:**
   Sjekk at `.env.local` har Supabase-nøkler (ENCRYPTION_KEY trengs ikke lenger for portefølje)

## Hvordan det fungerer

### 1. Legge til kjøp

1. Gå til `/settings` i dashboardet
2. Søk etter aksje eller fond (f.eks. "Equinor" eller "EQNR")
3. Velg ticker fra søkeresultatene
4. Fyll inn:
   - Antall aksjer / beløp
   - Kjøpspris per enhet
   - Kjøpsdato
   - Notater (valgfritt)
5. Klikk "Legg til kjøp"

### 2. Prisdata

- Prisdata hentes fra Yahoo Finance (offentlig API)
- Data caches i 5 minutter
- Oppdateres automatisk hvert 5. minutt i widgeten

### 3. Porteføljeberegning

Widgeten beregner:
- **Total porteføljeverdi**: Sum av alle holdings × nåværende pris
- **Total kostnad**: Sum av alle kjøp
- **Total gevinst/tap**: Forskjell mellom verdi og kostnad
- **Dagens endring**: Endring basert på dagens prisendringer

## API Endpoints

### GET `/api/portfolio`
Henter porteføljedata med alle holdings og beregninger
- Returnerer: `{ success: true, data: {...} }`
- Feil: `{ error: "..." }`

### GET `/api/prices/[ticker]`
Henter prisdata for en spesifikk ticker
- Query params: `?historical=true&days=30` for historisk data
- Returnerer: `{ success: true, data: {...} }`

### GET `/api/search?q=query`
Søker etter aksjer og fond
- Returnerer: `{ success: true, data: [...] }`

## Database Schema

### `holdings` tabell
- `id`: UUID
- `user_id`: UUID (refererer til users)
- `ticker`: VARCHAR(50) - Ticker symbol (f.eks. "EQNR")
- `name`: VARCHAR(255) - Navn på aksje/fond
- `quantity`: DECIMAL(15, 6) - Antall aksjer eller beløp
- `purchase_price`: DECIMAL(15, 4) - Kjøpspris per enhet
- `purchase_date`: DATE - Kjøpsdato
- `currency`: VARCHAR(3) - Valuta (default: NOK)
- `exchange`: VARCHAR(50) - Børs (f.eks. "OSL")
- `type`: VARCHAR(20) - Type (stock, fund, etf)
- `notes`: TEXT - Notater

### `price_cache` tabell
- `ticker`: VARCHAR(50) PRIMARY KEY
- `price`: DECIMAL(15, 4) - Nåværende pris
- `currency`: VARCHAR(3) - Valuta
- `change_percent`: DECIMAL(10, 4) - Dagens endring i prosent
- `change_amount`: DECIMAL(15, 4) - Dagens endring i beløp
- `last_updated`: TIMESTAMP - Sist oppdatert

### `price_history` tabell
- `id`: UUID PRIMARY KEY
- `ticker`: VARCHAR(50) - Ticker symbol
- `date`: DATE - Dato
- `price`: DECIMAL(15, 4) - Pris på dato
- `volume`: BIGINT - Volum (valgfritt)

## Bruk

1. Gå til `/settings` i dashboardet
2. Legg til dine kjøp ved å søke og fylle inn skjema
3. Se porteføljen i dashboardet (`/dashboard`)
4. Widgeten oppdateres automatisk hvert 5. minutt

## Feilsøking

### Prisdata hentes ikke
- Sjekk at ticker er riktig format (f.eks. "EQNR" for norske aksjer blir "EQNR.OL")
- Yahoo Finance kan ha begrensninger - prøv igjen senere
- Sjekk nettverksforbindelse

### Søk fungerer ikke
- Yahoo Finance search kan være treg - vent litt
- Prøv med både ticker og navn
- Sjekk at du har internettforbindelse

### Database feil
- Sjekk at `portfolio-schema.sql` er kjørt i Supabase
- Verifiser at tabellene eksisterer
- Sjekk Supabase-nøkler i `.env.local`

## Forskjeller fra Nordnet-løsningen

**Fjernet:**
- Puppeteer (headless browser)
- Nordnet session-basert autentisering
- Cookie-håndtering
- Kryptert session-lagring

**Lagt til:**
- Manuell kjøpsregistrering
- Yahoo Finance API-integrasjon
- Offentlig tilgjengelige prisdata
- Track-and-follow arkitektur

## Fremtidige forbedringer

- [ ] Graf med historisk pris og kjøpspunkter
- [ ] Eksport til CSV/Excel
- [ ] Støtte for flere valutaer
- [ ] Dividende-registrering
- [ ] Automatisk oppdatering av kjøpspris ved split/reverse split

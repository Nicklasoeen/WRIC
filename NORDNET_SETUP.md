# Nordnet Widget Setup Guide

## Oversikt

Nordnet-widgeten henter investeringsdata fra Nordnet ved å bruke session-basert autentisering (BankID). All logikk kjøres server-side for sikkerhet.

## Arkitektur

```
Frontend (Widget)
    ↓
API Route (/api/nordnet)
    ↓
Nordnet Service (session-basert)
    ↓
Nordnet Web API
```

## Installasjon

1. **Installer Puppeteer:**
   ```bash
   npm install
   ```
   (Puppeteer er allerede lagt til i package.json)

2. **Sett opp miljøvariabler:**
   Sjekk at `ENCRYPTION_KEY` er satt i `.env.local`

3. **Kjør dev server:**
   ```bash
   npm run dev
   ```

## Hvordan det fungerer

### 1. BankID Login Flow

Når brukeren klikker "Logg inn med BankID":
- Puppeteer starter en headless browser
- Navigerer til `https://www.nordnet.no/login`
- Klikker BankID-login knapp
- Vent på at brukeren fullfører BankID-autentisering (QR-kode eller mobil-app)
- Henter session cookies etter vellykket login
- Lagrer cookies kryptert i database

### 2. Data Henting

Widgeten henter data via `/api/nordnet`:
- Sjekker cache først (5 minutter)
- Hvis ikke i cache, henter fra Nordnet med session cookies
- Returnerer renset JSON til frontend
- Cacher data for 5 minutter

### 3. Session Management

- Sessions lagres kryptert (AES-256-GCM)
- Session utløper typisk etter 24 timer
- Automatisk validering før hver request
- Brukeren kan koble fra når som helst

## Bruk

1. Gå til `/settings` i dashboardet
2. Klikk "Logg inn med BankID"
3. Fullfør BankID-autentisering i nettleservinduet som åpnes
4. Etter vellykket login vil widgeten automatisk hente data

## API Endpoints

### GET `/api/nordnet`
Henter porteføljedata (med caching)
- Returnerer: `{ success: true, data: {...} }`
- Feil: `{ error: "..." }`

### POST `/api/nordnet/login`
Starter BankID-login flow
- Åpner Puppeteer browser
- Returnerer: `{ success: true }` etter vellykket login

## Database Schema

Sessions lagres i `external_connections` tabellen:
- `user_id`: Bruker-ID
- `provider`: "nordnet"
- `encrypted_token`: Kryptert session (cookies + expiresAt)
- `connected_at`: Når tilkoblingen ble opprettet

## Sikkerhet

- ✅ All autentisering skjer server-side
- ✅ Sessions lagres kryptert (AES-256-GCM)
- ✅ Ingen sensitive data sendes til frontend
- ✅ Per-bruker isolasjon
- ✅ Session-validering før hver request

## Troubleshooting

### Puppeteer feiler ved installasjon
```bash
# macOS
brew install chromium

# Eller sett PUPPETEER_SKIP_DOWNLOAD=true og installer manuelt
```

### BankID-login timeout
- Sjekk at nettleservinduet er synlig (headless: false i dev)
- Øk `LOGIN_TIMEOUT` i `nordnet-bankid.ts` hvis nødvendig

### Kunne ikke finne BankID-knapp
- Nordnet kan ha endret HTML-struktur
- Sjekk console logs for hvilke knapper som finnes
- Oppdater selektorer i `nordnet-bankid.ts`

### Session utløpt
- Sessions varer typisk 24 timer
- Brukeren må logge inn på nytt

## Neste steg

1. Test med ekte Nordnet-konto
2. Juster API-endepunkter basert på faktisk Nordnet API-struktur
3. Legg til retry-logikk for failed requests
4. Implementer automatisk re-autentisering ved utløpt session

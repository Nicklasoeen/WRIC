-- Legg til gull-kolonne i users-tabellen
-- Brukes for PvP (gull ved seier) og kan vises i navbar

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'gold'
  ) THEN
    ALTER TABLE users ADD COLUMN gold INTEGER DEFAULT 0;
    COMMENT ON COLUMN users.gold IS 'Brukerens gull (fra PvP m.m.)';
  END IF;
END $$;

-- Oppdater eksisterende brukere til å ha 0 gull hvis NULL
UPDATE users SET gold = 0 WHERE gold IS NULL;

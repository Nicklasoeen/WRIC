-- Legg til XP og Level kolonner i users-tabellen
-- Dette er nødvendig for Raid, Voting og Praise systemene

-- Legg til XP-kolonne hvis den ikke finnes
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'xp'
  ) THEN
    ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0;
    COMMENT ON COLUMN users.xp IS 'Total XP for brukeren';
  END IF;
END $$;

-- Legg til Level-kolonne hvis den ikke finnes
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'level'
  ) THEN
    ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1;
    COMMENT ON COLUMN users.level IS 'Brukerens nåværende level';
  END IF;
END $$;

-- Oppdater eksisterende brukere til å ha default verdier hvis de er NULL
UPDATE users SET xp = 0 WHERE xp IS NULL;
UPDATE users SET level = 1 WHERE level IS NULL;

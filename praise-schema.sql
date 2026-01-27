-- Praise the Founding Fathers Schema
-- XP-system og praise-tracking

-- Legg til XP-felt i users-tabellen hvis det ikke finnes
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'xp'
  ) THEN
    ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0;
  END IF;
END $$;

-- Tabell for tracking av praises (3 per dag per bruker)
CREATE TABLE IF NOT EXISTS praises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  praised_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  xp_earned INTEGER DEFAULT 10 -- XP per praise
  -- Ingen UNIQUE constraint - tillater flere praises per dag
);

-- Index for rask oppslag
CREATE INDEX IF NOT EXISTS idx_praises_user_id ON praises(user_id);
CREATE INDEX IF NOT EXISTS idx_praises_praised_at ON praises(praised_at);

-- Kommentarer
COMMENT ON TABLE praises IS 'Tracking av praises - maks 3 per dag per bruker';
COMMENT ON COLUMN users.xp IS 'Total XP for brukeren';

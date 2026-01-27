-- Badge System Schema
-- Brukere unlocker badges for hver level

-- Tabell for badges
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  level_required INTEGER NOT NULL,
  icon VARCHAR(50) DEFAULT '🏆',
  color VARCHAR(20) DEFAULT 'yellow',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabell for bruker-badges (mange-til-mange relasjon)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Index for rask oppslag
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_badges_level ON badges(level_required);

-- Legg til level-kolonne i users hvis den ikke finnes
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'level'
  ) THEN
    ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1;
  END IF;
END $$;

-- Slett gamle badges hvis de eksisterer
DELETE FROM badges WHERE name IN ('Member', 'Rising Star', 'Achiever', 'Expert', 'Master', 'Legend', 'Immortal');

-- Opprett nye badges
-- Ikoner bruker react-icons format: "library:IconName" (f.eks. "fa:FaHammer", "fa:FaSeedling")
INSERT INTO badges (name, description, level_required, icon, color) VALUES
  ('Slave worker', 'Din første badge!', 1, 'fa:FaHammer', 'brown'),
  ('Peasant', 'Du er på vei oppover!', 2, 'fa:FaSeedling', 'orange'),
  ('Tortured sexslave', 'Du når nye høyder!', 3, 'fa:FaLock', 'red'),
  ('Poor pig', 'Du er en ekspert!', 5, 'fa:FaPiggyBank', 'pink'),
  ('Worker', 'Du er en mester!', 10, 'fa:FaHardHat', 'blue'),
  ('Hustler', 'Du er en legende!', 20, 'fa:FaDollarSign', 'purple'),
  ('King Emperor of true wealth', 'Du er udødelig!', 50, 'fa:FaCrown', 'gold')
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE badges IS 'Badges som kan unlockes basert på level';
COMMENT ON TABLE user_badges IS 'Badges som brukere har unlocket';

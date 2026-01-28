-- Dungeon System Schema
-- Flere brukere kan samarbeide om å beseire en boss

-- Tabell for bosses
CREATE TABLE IF NOT EXISTS dungeon_bosses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  max_hp BIGINT NOT NULL DEFAULT 1000000,
  current_hp BIGINT NOT NULL DEFAULT 1000000,
  level INTEGER DEFAULT 1,
  xp_per_damage DECIMAL(10, 2) DEFAULT 0.1, -- XP per skade
  gold_reward BIGINT DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  spawn_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  defeated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabell for damage tracking (hvem har gjort hvor mye skade)
CREATE TABLE IF NOT EXISTS dungeon_damage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boss_id UUID NOT NULL REFERENCES dungeon_bosses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  damage_amount BIGINT NOT NULL,
  xp_earned DECIMAL(10, 2) DEFAULT 0,
  dealt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for rask oppslag
CREATE INDEX IF NOT EXISTS idx_dungeon_damage_boss_id ON dungeon_damage(boss_id);
CREATE INDEX IF NOT EXISTS idx_dungeon_damage_user_id ON dungeon_damage(user_id);
CREATE INDEX IF NOT EXISTS idx_dungeon_damage_dealt_at ON dungeon_damage(dealt_at);
CREATE INDEX IF NOT EXISTS idx_dungeon_bosses_active ON dungeon_bosses(is_active);

-- Opprett en default boss
INSERT INTO dungeon_bosses (name, description, max_hp, current_hp, level, xp_per_damage, gold_reward)
VALUES (
  'Ancient Dragon',
  'En mektig drage som har terrorisert byen i århundrer. Samarbeid med andre for å beseire den!',
  1000000,
  1000000,
  1,
  0.1,
  10000
) ON CONFLICT DO NOTHING;

COMMENT ON TABLE dungeon_bosses IS 'Bosses som brukere kan bekjempe sammen';
COMMENT ON TABLE dungeon_damage IS 'Tracking av skade gjort av hver bruker på bosses';
COMMENT ON COLUMN dungeon_bosses.xp_per_damage IS 'XP brukeren får per skade på bossen';
COMMENT ON COLUMN dungeon_damage.xp_earned IS 'XP brukeren har tjent på denne skaden';

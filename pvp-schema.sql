-- PvP System Schema
-- Brukere kan angripe hverandre basert på Raid stats

-- PvP battles log
CREATE TABLE IF NOT EXISTS pvp_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  defender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attacker_level INTEGER NOT NULL,
  defender_level INTEGER NOT NULL,
  attacker_damage DECIMAL(10, 2) NOT NULL,
  defender_hp DECIMAL(10, 2) NOT NULL,
  damage_dealt DECIMAL(10, 2) NOT NULL,
  attacker_won BOOLEAN NOT NULL,
  xp_earned INTEGER DEFAULT 0,
  gold_earned INTEGER DEFAULT 0,
  gold_lost INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for rask oppslag
CREATE INDEX IF NOT EXISTS idx_pvp_battles_attacker ON pvp_battles(attacker_id);
CREATE INDEX IF NOT EXISTS idx_pvp_battles_defender ON pvp_battles(defender_id);
CREATE INDEX IF NOT EXISTS idx_pvp_battles_created_at ON pvp_battles(created_at DESC);

-- PvP stats per bruker (kan også beregnes fra battles, men dette er raskere)
CREATE TABLE IF NOT EXISTS user_pvp_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  total_damage_dealt DECIMAL(12, 2) DEFAULT 0,
  total_damage_taken DECIMAL(12, 2) DEFAULT 0,
  last_attack_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_pvp_stats_wins ON user_pvp_stats(wins DESC);

-- Kommentarer
COMMENT ON TABLE pvp_battles IS 'Logg over alle PvP kamper';
COMMENT ON TABLE user_pvp_stats IS 'Aggregerte PvP statistikk per bruker';

-- Voting System Schema
-- Admin kan arrangere ukentlige votes

-- Tabell for votes (ukentlige avstemninger)
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  max_votes_per_user INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(week_start_date, title)
);

-- Tabell for vote-options (kandidater/alternativer)
CREATE TABLE IF NOT EXISTS vote_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
  option_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabell for user_votes (brukerens stemmer)
-- Tillater flere stemmer på samme person (fjernet UNIQUE constraint)
CREATE TABLE IF NOT EXISTS user_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES vote_options(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexer for rask oppslag
CREATE INDEX IF NOT EXISTS idx_votes_week ON votes(week_start_date, week_end_date);
CREATE INDEX IF NOT EXISTS idx_votes_active ON votes(is_active);
CREATE INDEX IF NOT EXISTS idx_vote_options_vote_id ON vote_options(vote_id);
CREATE INDEX IF NOT EXISTS idx_user_votes_vote_id ON user_votes(vote_id);
CREATE INDEX IF NOT EXISTS idx_user_votes_user_id ON user_votes(user_id);

COMMENT ON TABLE votes IS 'Ukentlige avstemninger arrangert av admin';
COMMENT ON TABLE vote_options IS 'Alternativer/kandidater for hver vote';
COMMENT ON TABLE user_votes IS 'Brukeres stemmer på vote-options';

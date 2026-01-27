-- Chat Schema
-- Live chat-funksjonalitet for alle brukere

-- Tabell for chat-meldinger
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for rask oppslag (sortert etter tid)
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Kommentarer
COMMENT ON TABLE chat_messages IS 'Live chat-meldinger fra alle brukere';

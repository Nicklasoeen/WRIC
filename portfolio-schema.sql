-- Portfolio Track & Follow Schema
-- Bygger om fra Nordnet-automatisk-henting til manuell track-and-follow

-- Tabell for brukerens kjøp (holdings)
CREATE TABLE IF NOT EXISTS holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticker VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  quantity DECIMAL(15, 6) NOT NULL, -- Antall aksjer eller beløp for fond
  purchase_price DECIMAL(15, 4) NOT NULL, -- Kjøpspris per enhet
  purchase_date DATE NOT NULL,
  currency VARCHAR(3) DEFAULT 'NOK',
  exchange VARCHAR(50), -- f.eks. 'OSL', 'NYSE', etc.
  type VARCHAR(20) DEFAULT 'stock', -- 'stock', 'fund', 'etf', etc.
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for rask oppslag
CREATE INDEX IF NOT EXISTS idx_holdings_user_id ON holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_ticker ON holdings(ticker);

-- Tabell for cached prisdata
CREATE TABLE IF NOT EXISTS price_cache (
  ticker VARCHAR(50) NOT NULL,
  price DECIMAL(15, 4) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NOK',
  change_percent DECIMAL(10, 4), -- Dagens endring i prosent
  change_amount DECIMAL(15, 4), -- Dagens endring i beløp
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (ticker)
);

-- Index for rask oppslag
CREATE INDEX IF NOT EXISTS idx_price_cache_last_updated ON price_cache(last_updated);

-- Tabell for historisk prisdata (for grafer)
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  price DECIMAL(15, 4) NOT NULL,
  volume BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ticker, date)
);

-- Index for rask oppslag
CREATE INDEX IF NOT EXISTS idx_price_history_ticker_date ON price_history(ticker, date);

-- Kommentarer
COMMENT ON TABLE holdings IS 'Brukerens kjøp av aksjer og fond - manuelt registrert';
COMMENT ON TABLE price_cache IS 'Cached prisdata fra offentlige APIer (oppdateres hvert 5. minutt)';
COMMENT ON TABLE price_history IS 'Historisk prisdata for grafer';

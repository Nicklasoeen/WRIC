-- User timeout / temporary ban support

-- Legg til timeout_until-kolonne på users hvis den ikke finnes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'timeout_until'
  ) THEN
    ALTER TABLE users
      ADD COLUMN timeout_until TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

COMMENT ON COLUMN users.timeout_until IS 'Tidspunkt til brukerens midlertidige utestengelse utløper. Null betyr ingen timeout.';


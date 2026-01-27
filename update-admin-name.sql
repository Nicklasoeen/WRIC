-- Oppdater admin-bruker navn til "Nicklas"
-- Kjør denne i Supabase SQL Editor

-- Oppdater første admin-bruker (PostgreSQL støtter ikke LIMIT i UPDATE direkte)
UPDATE users
SET name = 'Nicklas'
WHERE id = (
  SELECT id FROM users WHERE is_admin = true LIMIT 1
);

-- Hvis det ikke finnes en admin-bruker, opprett en
-- (Du må sette passordet manuelt via admin-panelet etterpå)
INSERT INTO users (name, password_hash, is_admin, is_active, xp, level)
SELECT 'Nicklas', '', true, true, 0, 1
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE is_admin = true
);

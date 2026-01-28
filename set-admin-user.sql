-- Sett en bruker som admin
-- Erstatt 'Nicklas' med navnet på brukeren du vil gjøre til admin

-- Metode 1: Sett admin basert på navn
UPDATE users
SET is_admin = true
WHERE name = 'Nicklas';

-- Metode 2: Sett admin basert på ID (hvis du kjenner bruker-ID)
-- UPDATE users
-- SET is_admin = true
-- WHERE id = 'din-bruker-id-her';

-- Verifiser at det fungerte
SELECT id, name, is_admin, is_active
FROM users
WHERE name = 'Nicklas';

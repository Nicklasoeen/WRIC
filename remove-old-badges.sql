-- Fjern gamle badges
-- Kjør denne i Supabase SQL Editor for å fjerne de gamle badge-navnene

-- Slett gamle badges
DELETE FROM badges WHERE name IN ('Member', 'Rising Star', 'Achiever', 'Expert', 'Master', 'Legend', 'Immortal');

-- Sjekk resultatet
SELECT name, icon, color, level_required FROM badges ORDER BY level_required;

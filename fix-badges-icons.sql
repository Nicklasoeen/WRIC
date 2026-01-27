-- Oppdater eksisterende badges med nye ikonnavn
-- Kjør denne i Supabase SQL Editor etter badges-schema.sql

-- Oppdater alle badges med nye react-icons ikoner (håndterer både emojis og gamle verdier)
UPDATE badges SET icon = 'fa:FaUser' WHERE name = 'Member' AND (icon != 'fa:FaUser' OR icon = '👤');
UPDATE badges SET icon = 'fa:FaStar' WHERE name = 'Rising Star' AND (icon != 'fa:FaStar' AND icon != 'hi:HiStar' OR icon = '⭐');
UPDATE badges SET icon = 'fa:FaTrophy' WHERE name = 'Achiever' AND (icon != 'fa:FaTrophy' OR icon = '🌟');
UPDATE badges SET icon = 'fa:FaGem' WHERE name = 'Expert' AND (icon != 'fa:FaGem' OR icon = '💎');
UPDATE badges SET icon = 'fa:FaCrown' WHERE name = 'Master' AND (icon != 'fa:FaCrown' OR icon = '👑');
UPDATE badges SET icon = 'fa:FaFire' WHERE name = 'Legend' AND (icon != 'fa:FaFire' OR icon = '🔥');
UPDATE badges SET icon = 'fa:FaBolt' WHERE name = 'Immortal' AND (icon != 'fa:FaBolt' OR icon = '⚡');

-- Sjekk resultatet
SELECT name, icon, level_required FROM badges ORDER BY level_required;

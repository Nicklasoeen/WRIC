-- Oppdater badge-ikoner til å passe bedre med navnene
-- Kjør denne i Supabase SQL Editor

UPDATE badges SET icon = 'fa:FaHammer' WHERE name = 'Slave worker';
UPDATE badges SET icon = 'fa:FaSeedling' WHERE name = 'Peasant';
UPDATE badges SET icon = 'fa:FaLock' WHERE name = 'Tortured sexslave';
UPDATE badges SET icon = 'fa:FaPiggyBank' WHERE name = 'Poor pig';
UPDATE badges SET icon = 'fa:FaHardHat' WHERE name = 'Worker';
UPDATE badges SET icon = 'fa:FaDollarSign' WHERE name = 'Hustler';
UPDATE badges SET icon = 'fa:FaCrown' WHERE name = 'King Emperor of true wealth';

-- Sjekk resultatet
SELECT name, icon, color, level_required FROM badges ORDER BY level_required;

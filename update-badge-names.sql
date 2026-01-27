-- Oppdater badge-navn og farger
-- Kjør denne i Supabase SQL Editor

-- Oppdater alle badges med nye navn og farger
UPDATE badges SET name = 'Slave worker', color = 'brown' WHERE level_required = 1;
UPDATE badges SET name = 'Peasant', color = 'orange' WHERE level_required = 2;
UPDATE badges SET name = 'Tortured sexslave', color = 'red' WHERE level_required = 3;
UPDATE badges SET name = 'Poor pig', color = 'pink' WHERE level_required = 5;
UPDATE badges SET name = 'Worker', color = 'blue' WHERE level_required = 10;
UPDATE badges SET name = 'Hustler', color = 'purple' WHERE level_required = 20;
UPDATE badges SET name = 'King Emperor of true wealth', color = 'gold' WHERE level_required = 50;

-- Sjekk resultatet
SELECT name, icon, color, level_required FROM badges ORDER BY level_required;

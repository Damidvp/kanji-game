-- Bug trouvé en intégration frontend (2026-07-12) : rejouer une partie dans le même salon
-- ("Rejouer" en fin de partie) réutilise le même room_id et redémarre round_index à 0, ce qui
-- entre en collision avec les manches de la partie précédente sous l'ancienne contrainte
-- UNIQUE(room_id, round_index). On ajoute une dimension "tentative de partie" (play_count,
-- incrémenté à chaque lancement) pour distinguer les manches entre parties successives d'un
-- même salon, sans changer la numérotation des manches (round_index reste relatif à la partie
-- en cours, 0-based) — utile pour de futures stats agrégées par partie.

ALTER TABLE game_room ADD COLUMN play_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE game_round ADD COLUMN play_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE game_round DROP CONSTRAINT game_round_room_id_round_index_key;
ALTER TABLE game_round ADD CONSTRAINT game_round_room_id_play_count_round_index_key UNIQUE (room_id, play_count, round_index);

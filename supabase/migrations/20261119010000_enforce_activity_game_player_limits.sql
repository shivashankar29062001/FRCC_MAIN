-- ---------------------------------------------------------------------------
-- Game-wise player limits for activity bookings.
--
-- The activity_games catalog stores capacity_per_slot (number of courts /
-- tables for exclusive games), which is not the maximum number of players.
-- Add the per-game player cap (source: src/data/activities.js) and enforce it
-- on every booking path, including direct inserts, so the API cannot be
-- bypassed with an out-of-range player count.
-- ---------------------------------------------------------------------------

ALTER TABLE public.activity_games
  ADD COLUMN IF NOT EXISTS max_players INTEGER;

UPDATE public.activity_games AS g
SET max_players = v.max_players
FROM (VALUES
  ('badminton',      4),
  ('tennis',         4),
  ('cricket',       22),
  ('table-tennis',   4),
  ('volleyball',    12),
  ('chess',          2),
  ('card-room',      6),
  ('golf',           4),
  ('swimming-pool', 20),
  ('football',      22),
  ('squash',         4),
  ('basketball',    10),
  ('luxury-gym',    30),
  ('kids-play-area',10),
  ('carom',          4)
) AS v(id, max_players)
WHERE g.id = v.id;

-- Any future catalog row must declare its own cap.
ALTER TABLE public.activity_games
  ALTER COLUMN max_players SET DEFAULT 50;

CREATE OR REPLACE FUNCTION public.enforce_activity_players_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_game_id TEXT;
  v_max INTEGER;
BEGIN
  IF NEW.category IS DISTINCT FROM 'activity' THEN
    RETURN NEW;
  END IF;

  IF NEW.players IS NULL OR NEW.players < 1 THEN
    RAISE EXCEPTION 'Player count must be a positive whole number.'
      USING ERRCODE = 'P0001';
  END IF;

  v_game_id := COALESCE(NEW.game_id, NEW.details->>'gameId', NEW.details->>'game');

  SELECT max_players
  INTO v_max
  FROM public.activity_games
  WHERE id = v_game_id
  LIMIT 1;

  IF v_max IS NOT NULL AND NEW.players > v_max THEN
    RAISE EXCEPTION 'Maximum % players allowed for this game.', v_max
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_activity_players_limit ON public.bookings;

CREATE TRIGGER trg_enforce_activity_players_limit
BEFORE INSERT OR UPDATE OF players ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_activity_players_limit();

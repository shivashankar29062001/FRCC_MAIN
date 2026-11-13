-- ---------------------------------------------------------------------------
-- Enforce the combined Adults + Children limit for activities that collect
-- both fields (currently Swimming Pool).
--
-- The per-field limits (20 each) allow 20 adults + 20 children. This trigger
-- validates the combined party size against the activity's configured slot
-- capacity (activity_games.capacity_per_slot, 20 for Swimming Pool) before the
-- row is written, for every insert path (RPC and direct table insert).
--
-- It also derives players (the Swimmers value) from adults + children so the
-- stored headcount used by slot availability stays consistent.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_activity_party_size()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_adults INTEGER := 0;
  v_children INTEGER := 0;
  v_party INTEGER := 0;
  v_max INTEGER;
BEGIN
  IF NEW.category <> 'activity' OR NEW.details IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT COALESCE(
    NEW.details ? 'adults' OR NEW.details ? 'children'
    OR (NEW.details->'extras') ? 'adults' OR (NEW.details->'extras') ? 'children',
    false
  ) THEN
    RETURN NEW;
  END IF;

  v_adults := GREATEST(0, COALESCE(
    (NEW.details->'extras'->>'adults')::INTEGER,
    (NEW.details->>'adults')::INTEGER,
    0
  ));
  v_children := GREATEST(0, COALESCE(
    (NEW.details->'extras'->>'children')::INTEGER,
    (NEW.details->>'children')::INTEGER,
    0
  ));
  v_party := v_adults + v_children;

  SELECT capacity_per_slot
  INTO v_max
  FROM public.activity_games
  WHERE id = NEW.game_id
  LIMIT 1;

  v_max := COALESCE(v_max, 20);

  IF v_party > v_max THEN
    RAISE EXCEPTION 'Adults and children together cannot exceed %.', v_max
      USING ERRCODE = 'P0001';
  END IF;

  NEW.players := GREATEST(1, v_party);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_activity_party_size ON public.bookings;

CREATE TRIGGER trg_enforce_activity_party_size
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_activity_party_size();

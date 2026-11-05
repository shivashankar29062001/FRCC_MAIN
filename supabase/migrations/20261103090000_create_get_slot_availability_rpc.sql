-- ============================================================================
-- Migration: 20261103090000_create_get_slot_availability_rpc.sql
-- Description:
--   Creates get_slot_availability RPC for public.bookings.
--   Returns slots with actual booked_count (sum of players/swimmers for group activities),
--   remaining capacity, and status.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_slot_availability(
  p_game_id TEXT,
  p_date DATE
)
RETURNS TABLE (
  slot TEXT,
  slot_range TEXT,
  capacity INTEGER,
  booked_count INTEGER,
  remaining INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_open INTEGER := 6;
  v_close INTEGER := 22;
  v_slot_minutes INTEGER := 60;
  v_capacity INTEGER := 4;
  v_cur_minutes INTEGER;
  v_start_hhmm TEXT;
  v_end_hhmm TEXT;
  v_range TEXT;
  v_booked INTEGER;
  v_remaining INTEGER;
  v_status TEXT;
  v_date_str TEXT;
BEGIN
  v_date_str := p_date::TEXT;

  -- Capacity rules per game
  IF p_game_id = 'swimming-pool' THEN
    v_open := 6;
    v_close := 20;
    v_capacity := 20;
  ELSIF p_game_id = 'kids-play-area' THEN
    v_open := 9;
    v_close := 20;
    v_capacity := 15;
  ELSIF p_game_id = 'luxury-gym' THEN
    v_open := 6;
    v_close := 22;
    v_capacity := 30;
  ELSIF p_game_id IN ('badminton', 'tennis', 'table-tennis', 'cricket', 'volleyball', 'chess', 'carom', 'card-room', 'golf') THEN
    v_capacity := 1;
  ELSE
    v_capacity := 4;
  END IF;

  v_cur_minutes := v_open * 60;
  WHILE v_cur_minutes + v_slot_minutes <= v_close * 60 LOOP
    v_start_hhmm := LPAD((v_cur_minutes / 60)::TEXT, 2, '0') || ':' || LPAD((v_cur_minutes % 60)::TEXT, 2, '0');
    v_end_hhmm := LPAD(((v_cur_minutes + v_slot_minutes) / 60)::TEXT, 2, '0') || ':' || LPAD(((v_cur_minutes + v_slot_minutes) % 60)::TEXT, 2, '0');
    v_range := v_start_hhmm || ' – ' || v_end_hhmm;

    -- For group activities (swimming pool, kids play area, gym), sum the swimmers/players; for others count bookings
    IF p_game_id IN ('swimming-pool', 'kids-play-area', 'luxury-gym') THEN
      SELECT COALESCE(SUM(b.players), 0)::INTEGER INTO v_booked
      FROM public.bookings b
      WHERE category = 'activity'
        AND (game_id = p_game_id OR LOWER(REPLACE(title, ' ', '-')) = p_game_id)
        AND (date = v_date_str OR date = TO_CHAR(p_date, 'YYYY-MM-DD'))
        AND (slot = v_start_hhmm OR slot LIKE (v_start_hhmm || '%'))
        AND status IN ('Confirmed', 'Pending', 'confirmed', 'pending');
    ELSE
      SELECT COUNT(*)::INTEGER INTO v_booked
      FROM public.bookings b
      WHERE category = 'activity'
        AND (game_id = p_game_id OR LOWER(REPLACE(title, ' ', '-')) = p_game_id)
        AND (date = v_date_str OR date = TO_CHAR(p_date, 'YYYY-MM-DD'))
        AND (slot = v_start_hhmm OR slot LIKE (v_start_hhmm || '%'))
        AND status IN ('Confirmed', 'Pending', 'confirmed', 'pending');
    END IF;

    v_remaining := GREATEST(0, v_capacity - v_booked);
    IF v_remaining <= 0 THEN
      v_status := 'full';
    ELSIF v_remaining <= 3 THEN
      v_status := 'almost_full';
    ELSE
      v_status := 'available';
    END IF;

    slot := v_start_hhmm;
    slot_range := v_range;
    capacity := v_capacity;
    booked_count := v_booked;
    remaining := v_remaining;
    status := v_status;
    RETURN NEXT;

    v_cur_minutes := v_cur_minutes + v_slot_minutes;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_slot_availability(TEXT, DATE) TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';

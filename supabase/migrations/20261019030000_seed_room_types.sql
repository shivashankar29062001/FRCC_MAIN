-- ===========================================================================
-- supabase/migrations/20261019030000_seed_room_types.sql
-- Seed Vijayawada room_types into public.room_types
-- ===========================================================================

INSERT INTO public.room_types (
  id, area_id, category, name, description, bed_type, view, size_sqft, max_guests, rooms_total, price_per_night, amenities, active
)
VALUES
  (
    'vja-standard-room', 'vijayawada', 'normal', 'Standard Room',
    'Comfortable and well-appointed standard room with modern amenities and courtyard view.',
    'Queen Bed', 'Courtyard View', 280, 2, 10, 2500,
    '["Free WiFi", "AC", "Queen Bed", "Breakfast Included", "Room Service"]'::jsonb, true
  ),
  (
    'vja-deluxe-room', 'vijayawada', 'normal', 'Deluxe Room',
    'Spacious deluxe room with private balcony, scenic views, and club pool access.',
    'King Bed', 'Krishna River View', 380, 2, 10, 3500,
    '["Free WiFi", "River View Balcony", "King Bed", "AC", "Breakfast Included", "Pool Access"]'::jsonb, true
  ),
  (
    'vja-premium-room', 'vijayawada', 'normal', 'Premium Room',
    'Premium room with floor-to-ceiling windows, luxury bath fittings, and full campus privileges.',
    'King Bed', 'Panoramic River & Lawn View', 450, 3, 10, 4500,
    '["Free WiFi", "Floor-to-Ceiling Windows", "King Bed", "AC", "Breakfast Included", "Pool & Gym Access"]'::jsonb, true
  ),
  (
    'vja-junior-suite', 'vijayawada', 'suite', 'Junior Suite',
    'Generously proportioned junior suite featuring a separate sitting lounge and riverfront vistas.',
    'King Bed + Sofa Bed', 'Riverfront View', 600, 3, 4, 6000,
    '["Free WiFi", "Living Area", "King Bed", "AC", "Jacuzzi", "Breakfast Included", "Club Lounge Access"]'::jsonb, true
  ),
  (
    'vja-executive-suite', 'vijayawada', 'suite', 'Executive Suite',
    'Executive suite with private meeting lounge, ergonomic work alcove, and bespoke butler service.',
    'King Bed + Workstation', 'Panoramic City & River View', 750, 3, 4, 8000,
    '["Free WiFi", "Separate Living Room", "Ergonomic Desk", "Jacuzzi", "Breakfast Included", "VIP Concierge"]'::jsonb, true
  ),
  (
    'vja-royal-suite', 'vijayawada', 'suite', 'Royal Suite',
    'Palatial royal suite with expansive private terrace, dining room, jacuzzi, and 24-hour butler concierge.',
    'Four-Poster King Bed', 'Private Terrace & Riverfront', 1100, 4, 4, 10000,
    '["Private Terrace", "Dedicated Butler Service", "Living & Dining Room", "Jacuzzi", "Breakfast Included", "Valet Parking"]'::jsonb, true
  )
ON CONFLICT (id) DO UPDATE SET
  area_id = EXCLUDED.area_id,
  category = EXCLUDED.category,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  bed_type = EXCLUDED.bed_type,
  view = EXCLUDED.view,
  size_sqft = EXCLUDED.size_sqft,
  max_guests = EXCLUDED.max_guests,
  rooms_total = EXCLUDED.rooms_total,
  price_per_night = EXCLUDED.price_per_night,
  amenities = EXCLUDED.amenities,
  active = EXCLUDED.active;

-- Also provide aliases for unprefixed room IDs for backwards compatibility
INSERT INTO public.room_types (id, area_id, category, name, description, bed_type, view, size_sqft, max_guests, rooms_total, price_per_night, amenities, active)
SELECT REPLACE(id, 'vja-', ''), area_id, category, name, description, bed_type, view, size_sqft, max_guests, rooms_total, price_per_night, amenities, active
FROM public.room_types
WHERE id LIKE 'vja-%'
ON CONFLICT (id) DO NOTHING;

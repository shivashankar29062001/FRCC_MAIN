-- Additive Indian mobile number validation constraints.
-- Existing rows are NOT scanned or modified (NOT VALID); only new/updated rows are checked.
-- Empty/null values are allowed for optional columns.

ALTER TABLE profiles
  ADD CONSTRAINT profiles_phone_indian_mobile_chk
  CHECK (phone IS NULL OR phone = '' OR phone ~ '^[6-9][0-9]{9}$') NOT VALID;

ALTER TABLE memberships
  ADD CONSTRAINT memberships_mobile_indian_mobile_chk
  CHECK (mobile IS NULL OR mobile = '' OR mobile ~ '^[6-9][0-9]{9}$') NOT VALID;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_mobile_indian_mobile_chk
  CHECK (mobile IS NULL OR mobile = '' OR mobile ~ '^[6-9][0-9]{9}$') NOT VALID;

ALTER TABLE stay_bookings
  ADD CONSTRAINT stay_bookings_guest_mobile_indian_mobile_chk
  CHECK (guest_mobile IS NULL OR guest_mobile = '' OR guest_mobile ~ '^[6-9][0-9]{9}$') NOT VALID;

ALTER TABLE table_bookings
  ADD CONSTRAINT table_bookings_guest_mobile_indian_mobile_chk
  CHECK (guest_mobile IS NULL OR guest_mobile = '' OR guest_mobile ~ '^[6-9][0-9]{9}$') NOT VALID;

ALTER TABLE convention_bookings
  ADD CONSTRAINT convention_bookings_phone_indian_mobile_chk
  CHECK (phone IS NULL OR phone = '' OR phone ~ '^[6-9][0-9]{9}$') NOT VALID;

ALTER TABLE member_profiles
  ADD CONSTRAINT member_profiles_spouse_mobile_indian_mobile_chk
  CHECK (spouse_mobile IS NULL OR spouse_mobile = '' OR spouse_mobile ~ '^[6-9][0-9]{9}$') NOT VALID;

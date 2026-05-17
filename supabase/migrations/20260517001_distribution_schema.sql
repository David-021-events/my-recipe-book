-- ============================================================
-- 021-89: Distribution schema — users, extractions_log, RLS
-- Run in Supabase SQL Editor in the order shown.
-- ============================================================

-- 1. users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  must_change_password boolean NOT NULL DEFAULT true,
  monthly_limit integer NOT NULL DEFAULT 30,
  lemon_squeezy_order_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. extractions_log (tracks attempt count for rate limiting, not recipe count)
CREATE TABLE extractions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Add user_id to recipes (nullable first, backfill, then NOT NULL)
ALTER TABLE recipes ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- BACKFILL — run after inserting the creator account
-- ============================================================
-- Step 1: Insert the creator account (replace values, note the password_hash
--         format: pbkdf2:<salt_hex>:<hash_hex> — generate with hashPassword())
--
-- INSERT INTO users (email, password_hash, must_change_password)
-- VALUES ('your@email.com', 'pbkdf2:<salt>:<hash>', false)
-- RETURNING id;
--
-- Step 2: Backfill existing recipes with the returned UUID
--
-- UPDATE recipes SET user_id = '<creator-uuid>' WHERE user_id IS NULL;
--
-- Step 3: Make user_id NOT NULL
--
-- ALTER TABLE recipes ALTER COLUMN user_id SET NOT NULL;
-- ============================================================

-- 4. Enable RLS on recipes
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own recipes" ON recipes
  USING (user_id = current_setting('app.user_id', true)::uuid);

-- 5. Enable RLS on extractions_log
ALTER TABLE extractions_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own extractions" ON extractions_log
  USING (user_id = current_setting('app.user_id', true)::uuid);

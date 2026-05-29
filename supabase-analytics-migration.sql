-- Run this in your Supabase SQL Editor
-- Creates the analytics_events table for visit and plan generation tracking

CREATE TABLE IF NOT EXISTS analytics_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT NOT NULL,   -- 'pageview' | 'bncc_plan_gen'
  page        TEXT,            -- page slug e.g. '/' | '/bncc-nacional'
  school      TEXT,            -- school name from form (when available)
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_event_type_time
  ON analytics_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_school
  ON analytics_events (school)
  WHERE school IS NOT NULL;

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anonymous pageview logging)
CREATE POLICY "analytics_insert_anon" ON analytics_events
  FOR INSERT WITH CHECK (true);

-- Only admins can read (service role bypasses RLS automatically)
CREATE POLICY "analytics_select_admin" ON analytics_events
  FOR SELECT USING (
    auth.jwt() ->> 'email' = 'admin@bncc.local'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

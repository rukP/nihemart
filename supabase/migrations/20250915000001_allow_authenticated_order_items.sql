-- Migration: allow authenticated users to read and update order_items
-- Date: 2025-09-15

-- This migration replaces the previous per-owner policies on order_items
-- with policies that allow any authenticated user to SELECT and UPDATE order_items.
-- Apply this migration with the supabase CLI (or run the SQL directly against your DB).

-- Drop the restrictive policies if they exist
DROP POLICY IF EXISTS "Allow users to read own order items" ON order_items;
DROP POLICY IF EXISTS "Allow users to insert own order items" ON order_items;
DROP POLICY IF EXISTS "Allow users to update own order items" ON order_items;
DROP POLICY IF EXISTS "Allow users to delete own order items" ON order_items;

-- Create more permissive policies for authenticated users
CREATE POLICY "Allow authenticated read order_items" ON order_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated update order_items" ON order_items
  FOR UPDATE
  TO authenticated
  USING (true);

-- Note: We intentionally do NOT open INSERT/DELETE here.
-- If you need to allow inserts or deletes by authenticated users, add similar policies with the appropriate WITH CHECK or USING expressions.

-- Advisory: This migration makes order_items updatable by any logged-in user. If that's not desired in production,
-- refine the USING expressions to guard by roles or other checks.

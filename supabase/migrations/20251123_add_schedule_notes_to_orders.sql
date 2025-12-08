-- Migration: add schedule_notes column to orders
-- Run this migration using your DB migration tool or via psql

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS schedule_notes text;

-- Optionally backfill schedule_notes from delivery_notes for recent orders
-- UPDATE public.orders
-- SET schedule_notes = delivery_notes
-- WHERE created_at >= now() - interval '7 days' AND schedule_notes IS NULL;

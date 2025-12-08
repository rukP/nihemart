-- Migration: add RLS policies for riders, order_assignments, and notifications
-- Date: 2025-09-15

-- Enable RLS (idempotent)
ALTER TABLE IF EXISTS public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive policies to avoid duplicates
DROP POLICY IF EXISTS "Allow authenticated read riders" ON public.riders;
DROP POLICY IF EXISTS "Allow owner update riders" ON public.riders;
DROP POLICY IF EXISTS "Allow admin manage riders" ON public.riders;

DROP POLICY IF EXISTS "Order assignments: admin or assigned rider can read" ON public.order_assignments;
DROP POLICY IF EXISTS "Order assignments: admin can insert or update" ON public.order_assignments;

DROP POLICY IF EXISTS "Notifications: recipient can read" ON public.notifications;
DROP POLICY IF EXISTS "Notifications: allow insert by server or recipient" ON public.notifications;

-- Riders: allow riders to read/update their own record and admins to read/manage
CREATE POLICY "Allow riders to read own row" ON public.riders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Allow riders to update own row" ON public.riders
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow admins manage riders" ON public.riders
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Order assignments: only admins or the assigned rider (mapped to rider.user_id) can read
CREATE POLICY "Order assignments: admin or assigned rider can read" ON public.order_assignments
  FOR SELECT
  TO authenticated
  USING (
  public.has_role(auth.uid(), 'admin')
    OR (assigned_rider_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.riders r WHERE r.id = assigned_rider_id AND r.user_id = auth.uid()
    ))
  );

-- Order assignments: only admin can insert or update (assignments are an admin action)
CREATE POLICY "Order assignments: admin can insert" ON public.order_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Order assignments: admin can update" ON public.order_assignments
  FOR UPDATE
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Notifications: recipient user can read their notifications, or role-based recipients (recipient_role) can read
CREATE POLICY "Notifications: recipient can read" ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    (recipient_user_id IS NOT NULL AND recipient_user_id = auth.uid())
    OR (recipient_role IS NOT NULL AND (
  (recipient_role = 'admin' AND public.has_role(auth.uid(), 'admin'))
      OR (recipient_role = 'rider' AND EXISTS (SELECT 1 FROM public.riders r WHERE r.user_id = auth.uid()))
    ))
  );

-- Notifications insert: allow authenticated callers to create notifications for themselves or admins, and service role can insert anything
CREATE POLICY "Notifications: allow insert by recipient or admin" ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (recipient_user_id IS NOT NULL AND recipient_user_id = auth.uid())
    OR (recipient_role IS NOT NULL AND recipient_role = 'admin')
  );

-- You may want to allow the service_role (server-side) to insert arbitrary notifications; that is typically done with the service key, not RLS.

-- Optional: allow users to mark their notification as read (update) only if they are the recipient
CREATE POLICY "Notifications: recipient can update own" ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (recipient_user_id IS NOT NULL AND recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id IS NOT NULL AND recipient_user_id = auth.uid());

-- End of migration

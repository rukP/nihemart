-- Add admin policy for payments table
-- Date: 2025-10-11

-- Add admin policy to allow admins to view/manage all payments
CREATE POLICY "Admins can manage all payments" ON public.payments
    FOR ALL
    TO authenticated 
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Comment
COMMENT ON POLICY "Admins can manage all payments" ON public.payments IS 'Allows admin users to view and manage all payment records';
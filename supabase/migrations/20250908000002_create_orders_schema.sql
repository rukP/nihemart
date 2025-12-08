CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    order_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2),
    total DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'RWF',
    customer_email TEXT NOT NULL,
    customer_first_name TEXT NOT NULL,
    customer_last_name TEXT NOT NULL,
    customer_phone TEXT,
    delivery_address TEXT NOT NULL,
    delivery_city TEXT NOT NULL,
    delivery_notes TEXT,
    source TEXT,
    is_external BOOLEAN DEFAULT false,
    is_paid BOOLEAN DEFAULT false,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_variation_id UUID REFERENCES product_variations(id),
    product_name TEXT NOT NULL,
    product_sku TEXT,
    variation_name TEXT,
    price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    rejected BOOLEAN DEFAULT false,
    rejected_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Function to update updated_at timestamp on orders
CREATE OR REPLACE FUNCTION update_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for orders table
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_order_updated_at();

-- Add RLS policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policies for orders
CREATE POLICY "Allow users to read own orders" ON orders
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Allow users to insert own orders" ON orders
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Allow users to update own orders" ON orders
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Allow users to delete own orders" ON orders
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Policies for order items
CREATE POLICY "Allow users to read own order items" ON order_items
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM orders WHERE orders.id = order_items.order_id 
        AND (orders.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    ));

CREATE POLICY "Allow users to insert own order items" ON order_items
    FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM orders WHERE orders.id = order_items.order_id 
        AND (orders.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    ));

CREATE POLICY "Allow users to update own order items" ON order_items
    FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM orders WHERE orders.id = order_items.order_id 
        AND (orders.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    ));

CREATE POLICY "Allow users to delete own order items" ON order_items
    FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM orders WHERE orders.id = order_items.order_id 
        AND (orders.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    ));

-- Function to get order stats
CREATE OR REPLACE FUNCTION get_order_stats()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'total_orders', COUNT(*),
        'total_sales', SUM(total),
        'pending_orders', COUNT(*) FILTER (WHERE status = 'pending'),
        'processing_orders', COUNT(*) FILTER (WHERE status = 'processing'),
        'shipped_orders', COUNT(*) FILTER (WHERE status = 'shipped'),
        'delivered_orders', COUNT(*) FILTER (WHERE status = 'delivered'),
        'cancelled_orders', COUNT(*) FILTER (WHERE status = 'cancelled'),
        'external_orders', COUNT(*) FILTER (WHERE is_external = true),
        'paid_orders', COUNT(*) FILTER (WHERE is_paid = true)
    )
    INTO result
    FROM orders;

    RETURN result;
END;
$$;

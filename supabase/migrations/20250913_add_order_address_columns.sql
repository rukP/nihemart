-- Add new columns to orders table to support address and flags
ALTER TABLE IF EXISTS orders
ADD COLUMN IF NOT EXISTS source text,
ADD COLUMN IF NOT EXISTS is_external boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_address text,
ADD COLUMN IF NOT EXISTS delivery_city text,
ADD COLUMN IF NOT EXISTS delivery_notes text,
ADD COLUMN IF NOT EXISTS customer_phone text;

-- Create sequence for order numbers if it doesn't exist
DO $$
BEGIN
    CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;
EXCEPTION
    WHEN duplicate_table THEN
        NULL;
END $$;

-- Function that generates the order number (TEXT)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
BEGIN
    new_number := 'ORD-' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDD')
                  || '-' || LPAD(nextval('order_number_seq')::text, 4, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger function that assigns order number before insert
CREATE OR REPLACE FUNCTION assign_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate order number trigger with the new assign_order_number() function
DROP TRIGGER IF EXISTS set_order_number ON orders;
CREATE TRIGGER set_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION assign_order_number();

-- Create or replace function to update timestamps on status changes
CREATE OR REPLACE FUNCTION update_order_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'shipped' AND OLD.status != 'shipped' AND NEW.shipped_at IS NULL THEN
        NEW.shipped_at := CURRENT_TIMESTAMP;
    END IF;
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.delivered_at IS NULL THEN
        NEW.delivered_at := CURRENT_TIMESTAMP;
    END IF;
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_order_timestamps ON orders;
CREATE TRIGGER update_order_timestamps
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_order_timestamps();

-- Create or replace function for order stats
CREATE OR REPLACE FUNCTION get_order_stats()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'total_orders', COUNT(*),
        'total_sales', COALESCE(SUM(total), 0),
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

-- Backfill missing order numbers if any
DO $$
BEGIN
    UPDATE orders
    SET order_number = 'ORD-' || to_char(created_at, 'YYYYMMDD') || '-' || LPAD(nextval('order_number_seq')::text, 4, '0')
    WHERE order_number IS NULL;
END $$;

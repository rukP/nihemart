-- Add new columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS source text,
ADD COLUMN IF NOT EXISTS is_external boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS order_number text,
ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Create a function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := 'ORD' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDDHH24MISS') || LPAD(nextval('order_number_seq')::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for order numbers if it doesn't exist
DO $$ 
BEGIN
    CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;
EXCEPTION
    WHEN duplicate_table THEN
        NULL;
END $$;

-- Create or replace trigger for order numbers
DROP TRIGGER IF EXISTS set_order_number ON orders;
CREATE TRIGGER set_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_order_number();

-- Create a function to update timestamps
CREATE OR REPLACE FUNCTION update_order_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    -- Set shipped_at if status changes to 'shipped'
    IF NEW.status = 'shipped' AND OLD.status != 'shipped' AND NEW.shipped_at IS NULL THEN
        NEW.shipped_at := CURRENT_TIMESTAMP;
    END IF;
    
    -- Set delivered_at if status changes to 'delivered'
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.delivered_at IS NULL THEN
        NEW.delivered_at := CURRENT_TIMESTAMP;
    END IF;
    
    -- Always update updated_at
    NEW.updated_at := CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace trigger for timestamps
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

-- Update existing orders to have order numbers if they don't have one
DO $$
BEGIN
    UPDATE orders
    SET order_number = 'ORD' || to_char(created_at, 'YYYYMMDDHH24MISS') || LPAD(id::text, 4, '0')
    WHERE order_number IS NULL;
END $$;

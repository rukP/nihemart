-- Create function to update stock and log the change
CREATE OR REPLACE FUNCTION update_stock_and_log(
    product_id_in UUID,
    variation_id_in UUID,
    change_in INTEGER,
    reason_in TEXT,
    user_id_in UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_stock INTEGER;
    current_stock INTEGER;
BEGIN
    -- Get current stock
    SELECT stock INTO current_stock
    FROM product_variations
    WHERE id = variation_id_in;

    IF current_stock IS NULL THEN
        RAISE EXCEPTION 'Product variation not found';
    END IF;

    -- Calculate new stock
    new_stock := current_stock + change_in;

    -- Update the stock
    UPDATE product_variations
    SET stock = new_stock, updated_at = NOW()
    WHERE id = variation_id_in;

    -- Also update the main product stock if this is the only variation or primary
    -- For simplicity, we'll update the product stock to match the variation
    UPDATE products
    SET stock = (
        SELECT COALESCE(SUM(stock), 0)
        FROM product_variations
        WHERE product_id = product_id_in
    ), updated_at = NOW()
    WHERE id = product_id_in;

    -- Log the change
    INSERT INTO stock_history (
        product_id,
        product_variation_id,
        user_id,
        change,
        new_quantity,
        reason
    ) VALUES (
        product_id_in,
        variation_id_in,
        user_id_in,
        change_in,
        new_stock,
        reason_in
    );

    -- Return the new stock level
    RETURN new_stock;
END;
$$;
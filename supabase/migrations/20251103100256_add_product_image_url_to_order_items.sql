-- Add product_image_url column to order_items table
-- This is a safe migration that doesn't affect existing data
ALTER TABLE order_items ADD COLUMN product_image_url TEXT NULL;

-- Create index for faster queries when filtering by image
CREATE INDEX idx_order_items_product_image_url ON order_items(product_image_url) WHERE product_image_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN order_items.product_image_url IS 'URL to the product main image at the time of order creation for displaying in order history';
